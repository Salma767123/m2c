'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/UI/Card';
import { Button } from '@/components/UI/Button';
import { Store, Upload, Globe, MapPin, Clock, Phone, Mail, Save, Loader2 } from 'lucide-react';
import VendorService, { VendorBasicInfo, VendorOwnerInfo } from '@/services/vendorService';
import { showSuccessToast, showErrorToast } from '@/lib/toast-utils';

interface VendorInfo extends VendorBasicInfo, VendorOwnerInfo {
  companyLogo?: string;
}

export default function VendorSettings() {
  const [vendorInfo, setVendorInfo] = useState<VendorInfo>({
    companyName: '',
    companyDescription: '',
    businessPhone: '',
    businessEmail: '',
    website: '',
    businessAddress: '',
    businessCity: '',
    businessState: '',
    businessZipCode: '',
    businessCountry: '',
    ownerName: '',
    ownerEmail: '',
    ownerPhone: '',
    ownerAddress: '',
    ownerCity: '',
    ownerState: '',
    ownerZipCode: '',
    ownerCountry: ''
  });
  
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  // Load vendor profile on component mount
  useEffect(() => {
    loadVendorProfile();
  }, []);

  const loadVendorProfile = async () => {
    try {
      setIsLoading(true);
      const response = await VendorService.getVendorProfile();
      const vendor = response.vendor;
      
      setVendorInfo({
        companyName: vendor.companyName || '',
        companyDescription: '', // Not available in VendorProfile
        businessPhone: vendor.businessPhone || '',
        businessEmail: vendor.businessEmail || '',
        website: vendor.website || '',
        businessAddress: vendor.businessAddress || '',
        businessCity: vendor.businessCity || '',
        businessState: vendor.businessState || '',
        businessZipCode: '', // Not available in VendorProfile
        businessCountry: vendor.businessCountry || '',
        ownerName: vendor.ownerName || '',
        ownerEmail: vendor.ownerEmail || '',
        ownerPhone: vendor.ownerPhone || '',
        ownerAddress: '', // Not available in VendorProfile
        ownerCity: '', // Not available in VendorProfile
        ownerState: '', // Not available in VendorProfile
        ownerZipCode: '', // Not available in VendorProfile
        ownerCountry: '' // Not available in VendorProfile
      });
      
      // Note: companyLogo is not available in VendorProfile type
      // You may need to add it to the backend response
    } catch (error) {
      console.error('Failed to load vendor profile:', error);
      showErrorToast('Error', 'Failed to load vendor profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof VendorInfo, value: string) => {
    setVendorInfo(prev => ({ ...prev, [field]: value }));
  };

  const handleLogoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setLogoFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setLogoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);

      // Upload logo if changed
      if (logoFile) {
        await VendorService.uploadVendorLogo(logoFile);
        showSuccessToast('Success', 'Logo uploaded successfully');
      }

      // Update basic info
      const basicInfo: VendorBasicInfo = {
        companyName: vendorInfo.companyName,
        companyDescription: vendorInfo.companyDescription,
        businessPhone: vendorInfo.businessPhone,
        businessEmail: vendorInfo.businessEmail,
        website: vendorInfo.website,
        businessAddress: vendorInfo.businessAddress,
        businessCity: vendorInfo.businessCity,
        businessState: vendorInfo.businessState,
        businessZipCode: vendorInfo.businessZipCode,
        businessCountry: vendorInfo.businessCountry
      };

      await VendorService.updateVendorBasicInfo(basicInfo);

      // Update owner info
      const ownerInfo: VendorOwnerInfo = {
        ownerName: vendorInfo.ownerName,
        ownerEmail: vendorInfo.ownerEmail,
        ownerPhone: vendorInfo.ownerPhone,
        ownerAddress: vendorInfo.ownerAddress,
        ownerCity: vendorInfo.ownerCity,
        ownerState: vendorInfo.ownerState,
        ownerZipCode: vendorInfo.ownerZipCode,
        ownerCountry: vendorInfo.ownerCountry
      };

      await VendorService.updateVendorOwnerInfo(ownerInfo);

      showSuccessToast('Success', 'Vendor information updated successfully');
      setIsEditing(false);
      setLogoFile(null);
      
      // Reload profile to get updated data
      await loadVendorProfile();
    } catch (error) {
      console.error('Failed to save vendor info:', error);
      showErrorToast('Error', error instanceof Error ? error.message : 'Failed to save vendor information');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading vendor settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-[#222222]">Vendor Settings</h1>
          <p className="text-slate-600">Manage your vendor information and preferences</p>
        </div>
        <Button 
          onClick={() => isEditing ? handleSave() : setIsEditing(true)}
          disabled={isSaving}
          className="bg-[#222222] text-[#ffffff] hover:bg-[#313131]"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : isEditing ? (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </>
          ) : (
            'Edit Vendor Info'
          )}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border border-gray-200">
            <CardHeader className="bg-gray-50 border-b border-gray-200">
              <CardTitle className="flex items-center text-[#222222]">
                <Store className="w-5 h-5 mr-2" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Company Name</label>
                <input
                  type="text"
                  value={vendorInfo.companyName}
                  onChange={(e) => handleInputChange('companyName', e.target.value)}
                  disabled={!isEditing}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-700 focus:border-gray-700 disabled:bg-gray-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  value={vendorInfo.companyDescription}
                  onChange={(e) => handleInputChange('companyDescription', e.target.value)}
                  disabled={!isEditing}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-700 focus:border-gray-700 disabled:bg-gray-50"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Business Phone</label>
                  <input
                    type="tel"
                    value={vendorInfo.businessPhone}
                    onChange={(e) => handleInputChange('businessPhone', e.target.value)}
                    disabled={!isEditing}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-700 focus:border-gray-700 disabled:bg-gray-50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Business Email</label>
                  <input
                    type="email"
                    value={vendorInfo.businessEmail}
                    onChange={(e) => handleInputChange('businessEmail', e.target.value)}
                    disabled={!isEditing}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-700 focus:border-gray-700 disabled:bg-gray-50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Website</label>
                <input
                  type="url"
                  value={vendorInfo.website}
                  onChange={(e) => handleInputChange('website', e.target.value)}
                  disabled={!isEditing}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-700 focus:border-gray-700 disabled:bg-gray-50"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-gray-200">
            <CardHeader className="bg-gray-50 border-b border-gray-200">
              <CardTitle className="flex items-center text-[#222222]">
                <MapPin className="w-5 h-5 mr-2" />
                Business Address
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
                <input
                  type="text"
                  value={vendorInfo.businessAddress}
                  onChange={(e) => handleInputChange('businessAddress', e.target.value)}
                  disabled={!isEditing}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-700 focus:border-gray-700 disabled:bg-gray-50"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">City</label>
                  <input
                    type="text"
                    value={vendorInfo.businessCity}
                    onChange={(e) => handleInputChange('businessCity', e.target.value)}
                    disabled={!isEditing}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-700 focus:border-gray-700 disabled:bg-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">State</label>
                  <input
                    type="text"
                    value={vendorInfo.businessState}
                    onChange={(e) => handleInputChange('businessState', e.target.value)}
                    disabled={!isEditing}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-700 focus:border-gray-700 disabled:bg-gray-50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Zip Code</label>
                  <input
                    type="text"
                    value={vendorInfo.businessZipCode}
                    onChange={(e) => handleInputChange('businessZipCode', e.target.value)}
                    disabled={!isEditing}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-700 focus:border-gray-700 disabled:bg-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Country</label>
                  <input
                    type="text"
                    value={vendorInfo.businessCountry}
                    onChange={(e) => handleInputChange('businessCountry', e.target.value)}
                    disabled={!isEditing}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-700 focus:border-gray-700 disabled:bg-gray-50"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border border-gray-200">
            <CardHeader className="bg-gray-50 border-b border-gray-200">
              <CardTitle className="text-[#222222]">Company Logo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {logoPreview && (
                <div className="flex justify-center">
                  <img
                    src={logoPreview}
                    alt="Company Logo"
                    className="w-32 h-32 object-contain border border-gray-200 rounded-lg"
                  />
                </div>
              )}
              
              {isEditing && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Upload New Logo</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-700 focus:border-gray-700"
                  />
                  <p className="text-xs text-gray-500 mt-1">PNG, JPG, WEBP, SVG (max 10MB)</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border border-gray-200">
            <CardHeader className="bg-gray-50 border-b border-gray-200">
              <CardTitle className="text-[#222222]">Owner Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Owner Name</label>
                <input
                  type="text"
                  value={vendorInfo.ownerName}
                  onChange={(e) => handleInputChange('ownerName', e.target.value)}
                  disabled={!isEditing}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-700 focus:border-gray-700 disabled:bg-gray-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Owner Email</label>
                <input
                  type="email"
                  value={vendorInfo.ownerEmail}
                  onChange={(e) => handleInputChange('ownerEmail', e.target.value)}
                  disabled={!isEditing}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-700 focus:border-gray-700 disabled:bg-gray-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Owner Phone</label>
                <input
                  type="tel"
                  value={vendorInfo.ownerPhone}
                  onChange={(e) => handleInputChange('ownerPhone', e.target.value)}
                  disabled={!isEditing}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-700 focus:border-gray-700 disabled:bg-gray-50"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
