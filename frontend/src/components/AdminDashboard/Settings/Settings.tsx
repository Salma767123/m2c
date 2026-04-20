"use client";

import { useState, useEffect } from "react";
import { User, Mail, Phone, MapPin, Building2, Shield, Save, FileText, CreditCard, Upload, Image as ImageIcon, DollarSign, Key, Eye, EyeOff, Percent, Warehouse, Globe } from "lucide-react";
import GSTSettingsTab from "./GSTSettingsTab";
import HubSettingsTab from "./HubSettingsTab";
import SEOSettingsTab from "./SEOSettingsTab";
import BannerSettingsTab from "./BannerSettingsTab";
import InvoiceSettings from "../Billing/Settings/InvoiceSettings";
import { Card, CardContent } from "../../UI/Card";
import { Breadcrumb } from "../Breadcrumb/Breadcrumb";
import { showSuccessToast, showErrorToast } from "@/lib/toast-utils";
import { paymentSettingsService } from "@/services/paymentSettingsService";
import { adminProfileService } from "@/services/adminProfileService";
import { companyInfoService } from "@/services/companyInfoService";
import { hasPermission } from "@/lib/auth";

type UserRole = "super_admin" | "admin" | "employee";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  avatar: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
}

export default function Settings() {
  const canManageSettings = hasPermission("manage_settings");
  // Simulate getting current user role - replace with actual auth
  const [currentUser] = useState<UserProfile>({
    id: "1",
    name: "John Admin",
    email: "john.admin@company.com",
    phone: "+1 234-567-8900",
    role: "super_admin", // Change to "admin" or "employee" to test different views
    avatar: "",
    address: "123 Admin Street",
    city: "New York",
    state: "NY",
    zipCode: "10001",
  });

  const [activeTab, setActiveTab] = useState<"profile" | "company" | "payment" | "gst" | "hub" | "invoice" | "seo" | "banner">("profile");

  // Profile form state
  const [profileData, setProfileData] = useState({
    name: currentUser.name,
    email: currentUser.email,
    phone: currentUser.phone,
    address: currentUser.address,
    city: currentUser.city,
    state: currentUser.state,
    zipCode: currentUser.zipCode,
  });

  // Company info state (only for super_admin and admin)
  const [companyInfo, setCompanyInfo] = useState({
    companyName: "M2C Marketplace Pvt Ltd",
    companyLogo: "",
    gstNumber: "29ABCDE1234F1Z5",
    panNumber: "ABCDE1234F",
    cinNumber: "U74999KA2020PTC123456",
    businessRegistrationNumber: "BRN123456789",
    taxId: "TAX123456",
    companyEmail: "info@m2c.com",
    companyPhone: "+91 80-1234-5678",
    companyWebsite: "https://www.m2c.com",
    registeredAddress: "123 Business Park, Tech City",
    city: "Bangalore",
    state: "Karnataka",
    country: "India",
    zipCode: "560001",
    bankName: "HDFC Bank",
    bankAccountNumber: "1234567890",
    bankIfscCode: "HDFC0001234",
    bankBranch: "MG Road Branch",
  });

  // Razorpay settings state (only for super_admin)
  const [razorpaySettings, setRazorpaySettings] = useState({
    enabled: false,
    keyId: "",
    keySecret: "",
    webhookSecret: ""
  });

  // PayU settings state (only for super_admin)
  const [payuSettings, setPayuSettings] = useState({
    enabled: false,
    merchantKey: "",
    merchantSalt: ""
  });

  // Loading state for payment settings
  const [loadingPaymentSettings, setLoadingPaymentSettings] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [loadingCompanyInfo, setLoadingCompanyInfo] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  // Password visibility states
  const [showRazorpaySecret, setShowRazorpaySecret] = useState(false);
  const [showRazorpayWebhook, setShowRazorpayWebhook] = useState(false);
  const [showPayuSalt, setShowPayuSalt] = useState(false);

  // Track if secrets are masked (from backend)
  const isRazorpaySecretMasked = razorpaySettings.keySecret === '••••••••';
  const isRazorpayWebhookMasked = razorpaySettings.webhookSecret === '••••••••';
  const isPayuSaltMasked = payuSettings.merchantSalt === '••••••••';

  // Access control
  const canAccessAdminSettings = currentUser.role === "super_admin" || currentUser.role === "admin";
  const isReadOnly = currentUser.role === "employee" || !canManageSettings;

  // Fetch data on component mount
  useEffect(() => {
    const fetchData = async () => {
      // Fetch admin profile
      try {
        setLoadingProfile(true);
        const profileResponse = await adminProfileService.getProfile();
        if (profileResponse.success && profileResponse.data) {
          setProfileData({
            name: profileResponse.data.name || "",
            email: profileResponse.data.email || "",
            phone: profileResponse.data.phoneNumber || "",
            address: profileResponse.data.address || "",
            city: profileResponse.data.city || "",
            state: profileResponse.data.state || "",
            zipCode: profileResponse.data.zipCode || "",
          });
        }
      } catch (error) {
        console.error('Failed to fetch profile:', error);
      } finally {
        setLoadingProfile(false);
      }

      // Fetch company info (for admins)
      if (canAccessAdminSettings) {
        try {
          setLoadingCompanyInfo(true);
          const companyResponse = await companyInfoService.getCompanyInfo();
          if (companyResponse.success && companyResponse.data) {
            setCompanyInfo({
              companyName: companyResponse.data.companyName || "",
              companyLogo: companyResponse.data.companyLogo || "",
              gstNumber: companyResponse.data.gstNumber || "",
              panNumber: companyResponse.data.panNumber || "",
              cinNumber: companyResponse.data.cinNumber || "",
              businessRegistrationNumber: companyResponse.data.businessRegistrationNumber || "",
              taxId: companyResponse.data.taxId || "",
              companyEmail: companyResponse.data.companyEmail || "",
              companyPhone: companyResponse.data.companyPhone || "",
              companyWebsite: companyResponse.data.companyWebsite || "",
              registeredAddress: companyResponse.data.registeredAddress || "",
              city: companyResponse.data.city || "",
              state: companyResponse.data.state || "",
              country: companyResponse.data.country || "",
              zipCode: companyResponse.data.zipCode || "",
              bankName: companyResponse.data.bankName || "",
              bankAccountNumber: companyResponse.data.bankAccountNumber || "",
              bankIfscCode: companyResponse.data.bankIfscCode || "",
              bankBranch: companyResponse.data.bankBranch || "",
            });
          }
        } catch (error) {
          console.error('Failed to fetch company info:', error);
        } finally {
          setLoadingCompanyInfo(false);
        }
      }

      // Fetch payment settings (for super_admin)
      if (currentUser.role === "super_admin") {
        try {
          setLoadingPaymentSettings(true);
          const response = await paymentSettingsService.getPaymentSettings();

          if (response.success && response.data) {
            setRazorpaySettings({
              enabled: response.data.razorpayEnabled,
              keyId: response.data.razorpayKeyId || "",
              keySecret: response.data.razorpayKeySecret || "",
              webhookSecret: response.data.razorpayWebhookSecret || ""
            });

            setPayuSettings({
              enabled: response.data.payuEnabled,
              merchantKey: response.data.payuMerchantKey || "",
              merchantSalt: response.data.payuMerchantSalt || ""
            });
          }
        } catch (error) {
          console.error('Failed to fetch payment settings:', error);
        } finally {
          setLoadingPaymentSettings(false);
        }
      }
    };

    fetchData();
  }, [currentUser.role, canAccessAdminSettings]);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoadingProfile(true);
      const response = await adminProfileService.updateProfile({
        name: profileData.name,
        phoneNumber: profileData.phone,
        address: profileData.address,
        city: profileData.city,
        state: profileData.state,
        zipCode: profileData.zipCode,
        country: "India" // Default country
      });

      if (response.success) {
        showSuccessToast("Profile Updated", response.message || "Your profile has been updated successfully.");
      }
    } catch (error: any) {
      showErrorToast("Update Failed", error.message || "Failed to update profile. Please try again.");
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleCompanyInfoUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoadingCompanyInfo(true);

      // Determine which section is being updated based on the form
      const formId = (e.target as HTMLFormElement).id;

      let response;
      if (formId === 'basic-info-form') {
        response = await companyInfoService.updateBasicInfo({
          companyName: companyInfo.companyName,
          companyEmail: companyInfo.companyEmail,
          companyPhone: companyInfo.companyPhone,
          companyWebsite: companyInfo.companyWebsite
        });
      } else if (formId === 'legal-info-form') {
        response = await companyInfoService.updateLegalInfo({
          gstNumber: companyInfo.gstNumber,
          panNumber: companyInfo.panNumber,
          cinNumber: companyInfo.cinNumber,
          businessRegistrationNumber: companyInfo.businessRegistrationNumber,
          taxId: companyInfo.taxId
        });
      } else if (formId === 'address-form') {
        response = await companyInfoService.updateAddress({
          registeredAddress: companyInfo.registeredAddress,
          city: companyInfo.city,
          state: companyInfo.state,
          country: companyInfo.country,
          zipCode: companyInfo.zipCode
        });
      } else if (formId === 'bank-details-form') {
        response = await companyInfoService.updateBankDetails({
          bankName: companyInfo.bankName,
          bankAccountNumber: companyInfo.bankAccountNumber,
          bankIfscCode: companyInfo.bankIfscCode,
          bankBranch: companyInfo.bankBranch
        });
      }

      if (response?.success) {
        showSuccessToast("Company Info Updated", response.message || "Company information has been updated successfully.");
      }
    } catch (error: any) {
      showErrorToast("Update Failed", error.message || "Failed to update company information. Please try again.");
    } finally {
      setLoadingCompanyInfo(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      showErrorToast("Invalid File", "Please upload an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showErrorToast("File Too Large", "Please upload an image smaller than 5MB");
      return;
    }

    // Convert to base64 for preview
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setLogoPreview(base64String);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveLogo = async () => {
    if (!logoPreview) return;

    try {
      setUploadingLogo(true);
      const response = await companyInfoService.updateLogo(logoPreview);

      if (response.success) {
        setCompanyInfo(prev => ({
          ...prev,
          companyLogo: logoPreview
        }));
        setLogoPreview(null);
        showSuccessToast("Logo Saved", "Company logo has been saved successfully");
      }
    } catch (error: any) {
      showErrorToast("Save Failed", error.message || "Failed to save logo");
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleCancelLogo = () => {
    setLogoPreview(null);
    // Reset file input
    const fileInput = document.getElementById('logo-upload') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  const handleRazorpaySettingsUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoadingPaymentSettings(true);
      const response = await paymentSettingsService.updateRazorpaySettings({
        enabled: razorpaySettings.enabled,
        keyId: razorpaySettings.keyId,
        keySecret: razorpaySettings.keySecret,
        webhookSecret: razorpaySettings.webhookSecret
      });

      if (response.success) {
        showSuccessToast("Razorpay Settings Updated", response.message || "Payment gateway settings have been updated successfully.");

        // Update state with sanitized data from response
        if (response.data) {
          setRazorpaySettings(prev => ({
            ...prev,
            enabled: response.data.razorpayEnabled !== undefined ? response.data.razorpayEnabled : prev.enabled,
            keySecret: response.data.razorpayKeySecret || prev.keySecret,
            webhookSecret: response.data.razorpayWebhookSecret || prev.webhookSecret
          }));

          // If Razorpay was enabled, disable PayU
          if (response.data.payuEnabled !== undefined) {
            setPayuSettings(prev => ({
              ...prev,
              enabled: response.data.payuEnabled || false
            }));
          }
        }
      }
    } catch (error: any) {
      showErrorToast("Update Failed", error.message || "Failed to update Razorpay settings. Please try again.");
    } finally {
      setLoadingPaymentSettings(false);
    }
  };

  const handlePayUSettingsUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoadingPaymentSettings(true);
      const response = await paymentSettingsService.updatePayUSettings({
        enabled: payuSettings.enabled,
        merchantKey: payuSettings.merchantKey,
        merchantSalt: payuSettings.merchantSalt
      });

      if (response.success) {
        showSuccessToast("PayU Settings Updated", response.message || "PayU payment gateway settings have been updated successfully.");

        // Update state with sanitized data from response
        if (response.data) {
          setPayuSettings(prev => ({
            ...prev,
            enabled: response.data.payuEnabled !== undefined ? response.data.payuEnabled : prev.enabled,
            merchantSalt: response.data.payuMerchantSalt || prev.merchantSalt
          }));

          // If PayU was enabled, disable Razorpay
          if (response.data.razorpayEnabled !== undefined) {
            setRazorpaySettings(prev => ({
              ...prev,
              enabled: response.data.razorpayEnabled || false
            }));
          }
        }
      }
    } catch (error: any) {
      showErrorToast("Update Failed", error.message || "Failed to update PayU settings. Please try again.");
    } finally {
      setLoadingPaymentSettings(false);
    }
  };

  return (
    <div className="p-6">
      <Breadcrumb />

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-1">Manage your profile and system settings</p>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab("profile")}
            className={`pb-3 px-1 font-medium text-sm border-b-2 transition-colors ${activeTab === "profile"
              ? "border-gray-900 text-gray-900"
              : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
          >
            <User className="h-4 w-4 inline mr-2" />
            Profile Settings
          </button>
          {canAccessAdminSettings && (
            <>
              <button
                onClick={() => setActiveTab("company")}
                className={`pb-3 px-1 font-medium text-sm border-b-2 transition-colors ${activeTab === "company"
                  ? "border-gray-900 text-gray-900"
                  : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
              >
                <Building2 className="h-4 w-4 inline mr-2" />
                Company Info
              </button>
              <button
                onClick={() => setActiveTab("payment")}
                className={`pb-3 px-1 font-medium text-sm border-b-2 transition-colors ${activeTab === "payment"
                  ? "border-gray-900 text-gray-900"
                  : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
              >
                <DollarSign className="h-4 w-4 inline mr-2" />
                Payment Settings
              </button>
              <button
                onClick={() => setActiveTab("gst")}
                className={`pb-3 px-1 font-medium text-sm border-b-2 transition-colors ${activeTab === "gst"
                  ? "border-gray-900 text-gray-900"
                  : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
              >
                <Percent className="h-4 w-4 inline mr-2" />
                GST Settings
              </button>
              <button
                onClick={() => setActiveTab("hub")}
                className={`pb-3 px-1 font-medium text-sm border-b-2 transition-colors ${activeTab === "hub"
                  ? "border-gray-900 text-gray-900"
                  : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
              >
                <Warehouse className="h-4 w-4 inline mr-2" />
                Hub Management
              </button>
              <button
                onClick={() => setActiveTab("invoice")}
                className={`pb-3 px-1 font-medium text-sm border-b-2 transition-colors ${activeTab === "invoice"
                  ? "border-gray-900 text-gray-900"
                  : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
              >
                <FileText className="h-4 w-4 inline mr-2" />
                Invoice Settings
              </button>
              <button
                onClick={() => setActiveTab("seo")}
                className={`pb-3 px-1 font-medium text-sm border-b-2 transition-colors ${activeTab === "seo"
                  ? "border-gray-900 text-gray-900"
                  : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
              >
                <Globe className="h-4 w-4 inline mr-2" />
                SEO Settings
              </button>
              <button
                onClick={() => setActiveTab("banner")}
                className={`pb-3 px-1 font-medium text-sm border-b-2 transition-colors ${activeTab === "banner"
                  ? "border-gray-900 text-gray-900"
                  : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
              >
                <ImageIcon className="h-4 w-4 inline mr-2" />
                Banner
              </button>
            </>
          )}
        </div>
      </div>

      {/* Profile Tab */}
      {activeTab === "profile" && (
        <div className="space-y-6">
          {/* Role Badge */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center">
                  {currentUser.avatar ? (
                    <img src={currentUser.avatar} alt="Avatar" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <User className="h-10 w-10 text-gray-400" />
                  )}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{profileData.name || currentUser.name}</h2>
                  <p className="text-gray-600">{profileData.email || currentUser.email}</p>
                  <div className="mt-2">
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${currentUser.role === "super_admin"
                        ? "bg-purple-100 text-purple-800"
                        : currentUser.role === "admin"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-green-100 text-green-800"
                        }`}
                    >
                      <Shield className="h-3 w-3 mr-1" />
                      {currentUser.role === "super_admin"
                        ? "Super Admin"
                        : currentUser.role === "admin"
                          ? "Admin"
                          : "Employee"}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Personal Information */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h3>
              <form onSubmit={handleProfileUpdate}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        value={profileData.name}
                        onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                        disabled={isReadOnly}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent disabled:bg-gray-100"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="email"
                        value={profileData.email}
                        onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                        disabled={isReadOnly}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent disabled:bg-gray-100"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="tel"
                        value={profileData.phone}
                        onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                        disabled={isReadOnly}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent disabled:bg-gray-100"
                      />
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        value={profileData.address}
                        onChange={(e) => setProfileData({ ...profileData, address: e.target.value })}
                        disabled={isReadOnly}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent disabled:bg-gray-100"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                    <input
                      type="text"
                      value={profileData.city}
                      onChange={(e) => setProfileData({ ...profileData, city: e.target.value })}
                      disabled={isReadOnly}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent disabled:bg-gray-100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
                    <input
                      type="text"
                      value={profileData.state}
                      onChange={(e) => setProfileData({ ...profileData, state: e.target.value })}
                      disabled={isReadOnly}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent disabled:bg-gray-100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">ZIP Code</label>
                    <input
                      type="text"
                      value={profileData.zipCode}
                      onChange={(e) => setProfileData({ ...profileData, zipCode: e.target.value })}
                      disabled={isReadOnly}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent disabled:bg-gray-100"
                    />
                  </div>
                </div>

                {!isReadOnly && (
                  <div className="mt-6">
                    <button
                      type="submit"
                      disabled={loadingProfile}
                      className="flex items-center gap-2 bg-gray-900 hover:bg-gray-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Save className="h-4 w-4" />
                      {loadingProfile ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                )}
              </form>
            </CardContent>
          </Card>

          {isReadOnly && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> As an employee, you have read-only access to your profile. Contact your administrator to make changes.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Company Info Tab */}
      {activeTab === "company" && canAccessAdminSettings && (
        <div className="space-y-6">
          {/* Company Logo */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <ImageIcon className="w-5 h-5 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Company Logo</h3>
              </div>
              <div className="flex items-center gap-6">
                <div className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
                  {logoPreview || companyInfo.companyLogo ? (
                    <img
                      src={logoPreview || companyInfo.companyLogo}
                      alt="Company Logo"
                      className="w-full h-full object-contain rounded-lg"
                    />
                  ) : (
                    <div className="text-center">
                      <ImageIcon className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-xs text-gray-500">No logo</p>
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-3">Upload your company logo. Recommended size: 512x512px</p>
                  <input
                    type="file"
                    id="logo-upload"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    disabled={currentUser.role !== "super_admin" || uploadingLogo}
                    className="hidden"
                  />
                  <div className="flex items-center gap-2">
                    <label
                      htmlFor="logo-upload"
                      className={`flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer ${currentUser.role !== "super_admin" || uploadingLogo || logoPreview
                        ? "opacity-50 cursor-not-allowed pointer-events-none"
                        : ""
                        }`}
                    >
                      <Upload className="h-4 w-4" />
                      Choose Logo
                    </label>
                    {logoPreview && canManageSettings && (
                      <>
                        <button
                          onClick={handleSaveLogo}
                          disabled={uploadingLogo}
                          className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Save className="h-4 w-4" />
                          {uploadingLogo ? "Saving..." : "Save Logo"}
                        </button>
                        <button
                          onClick={handleCancelLogo}
                          disabled={uploadingLogo}
                          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Cancel
                        </button>
                      </>
                    )}
                  </div>
                  {logoPreview && (
                    <p className="text-xs text-blue-600 mt-2">Preview - Click "Save Logo" to upload</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Basic Company Information */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Building2 className="w-5 h-5 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Basic Information</h3>
              </div>
              <form id="basic-info-form" onSubmit={handleCompanyInfoUpdate}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Company Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={companyInfo.companyName}
                      onChange={(e) => setCompanyInfo({ ...companyInfo, companyName: e.target.value })}
                      disabled={currentUser.role !== "super_admin"}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent disabled:bg-gray-100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Company Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="email"
                        value={companyInfo.companyEmail}
                        onChange={(e) => setCompanyInfo({ ...companyInfo, companyEmail: e.target.value })}
                        disabled={currentUser.role !== "super_admin"}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent disabled:bg-gray-100"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Company Phone</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="tel"
                        value={companyInfo.companyPhone}
                        onChange={(e) => setCompanyInfo({ ...companyInfo, companyPhone: e.target.value })}
                        disabled={currentUser.role !== "super_admin"}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent disabled:bg-gray-100"
                      />
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Company Website</label>
                    <input
                      type="url"
                      value={companyInfo.companyWebsite}
                      onChange={(e) => setCompanyInfo({ ...companyInfo, companyWebsite: e.target.value })}
                      disabled={currentUser.role !== "super_admin"}
                      placeholder="https://www.example.com"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent disabled:bg-gray-100"
                    />
                  </div>
                </div>

                {currentUser.role === "super_admin" && canManageSettings && (
                  <div className="mt-6">
                    <button
                      type="submit"
                      disabled={loadingCompanyInfo}
                      className="flex items-center gap-2 bg-gray-900 hover:bg-gray-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Save className="h-4 w-4" />
                      {loadingCompanyInfo ? 'Saving...' : 'Save Basic Information'}
                    </button>
                  </div>
                )}
              </form>
            </CardContent>
          </Card>

          {/* Legal & Tax Information */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <FileText className="w-5 h-5 text-purple-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Legal & Tax Information</h3>
              </div>
              <form id="legal-info-form" onSubmit={handleCompanyInfoUpdate}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      GST Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={companyInfo.gstNumber}
                      onChange={(e) => setCompanyInfo({ ...companyInfo, gstNumber: e.target.value })}
                      disabled={currentUser.role !== "super_admin"}
                      placeholder="29ABCDE1234F1Z5"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent disabled:bg-gray-100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      PAN Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={companyInfo.panNumber}
                      onChange={(e) => setCompanyInfo({ ...companyInfo, panNumber: e.target.value })}
                      disabled={currentUser.role !== "super_admin"}
                      placeholder="ABCDE1234F"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent disabled:bg-gray-100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">CIN Number</label>
                    <input
                      type="text"
                      value={companyInfo.cinNumber}
                      onChange={(e) => setCompanyInfo({ ...companyInfo, cinNumber: e.target.value })}
                      disabled={currentUser.role !== "super_admin"}
                      placeholder="U74999KA2020PTC123456"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent disabled:bg-gray-100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Business Registration Number</label>
                    <input
                      type="text"
                      value={companyInfo.businessRegistrationNumber}
                      onChange={(e) => setCompanyInfo({ ...companyInfo, businessRegistrationNumber: e.target.value })}
                      disabled={currentUser.role !== "super_admin"}
                      placeholder="BRN123456789"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent disabled:bg-gray-100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tax ID</label>
                    <input
                      type="text"
                      value={companyInfo.taxId}
                      onChange={(e) => setCompanyInfo({ ...companyInfo, taxId: e.target.value })}
                      disabled={currentUser.role !== "super_admin"}
                      placeholder="TAX123456"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent disabled:bg-gray-100"
                    />
                  </div>
                </div>

                {currentUser.role === "super_admin" && canManageSettings && (
                  <div className="mt-6">
                    <button
                      type="submit"
                      disabled={loadingCompanyInfo}
                      className="flex items-center gap-2 bg-gray-900 hover:bg-gray-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Save className="h-4 w-4" />
                      {loadingCompanyInfo ? 'Saving...' : 'Save Legal Information'}
                    </button>
                  </div>
                )}
              </form>
            </CardContent>
          </Card>

          {/* Registered Address */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <MapPin className="w-5 h-5 text-orange-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Registered Address</h3>
              </div>
              <form id="address-form" onSubmit={handleCompanyInfoUpdate}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Street Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={companyInfo.registeredAddress}
                      onChange={(e) => setCompanyInfo({ ...companyInfo, registeredAddress: e.target.value })}
                      disabled={currentUser.role !== "super_admin"}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent disabled:bg-gray-100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                    <input
                      type="text"
                      value={companyInfo.city}
                      onChange={(e) => setCompanyInfo({ ...companyInfo, city: e.target.value })}
                      disabled={currentUser.role !== "super_admin"}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent disabled:bg-gray-100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
                    <input
                      type="text"
                      value={companyInfo.state}
                      onChange={(e) => setCompanyInfo({ ...companyInfo, state: e.target.value })}
                      disabled={currentUser.role !== "super_admin"}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent disabled:bg-gray-100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
                    <input
                      type="text"
                      value={companyInfo.country}
                      onChange={(e) => setCompanyInfo({ ...companyInfo, country: e.target.value })}
                      disabled={currentUser.role !== "super_admin"}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent disabled:bg-gray-100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">ZIP Code</label>
                    <input
                      type="text"
                      value={companyInfo.zipCode}
                      onChange={(e) => setCompanyInfo({ ...companyInfo, zipCode: e.target.value })}
                      disabled={currentUser.role !== "super_admin"}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent disabled:bg-gray-100"
                    />
                  </div>
                </div>

                {currentUser.role === "super_admin" && canManageSettings && (
                  <div className="mt-6">
                    <button
                      type="submit"
                      disabled={loadingCompanyInfo}
                      className="flex items-center gap-2 bg-gray-900 hover:bg-gray-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Save className="h-4 w-4" />
                      {loadingCompanyInfo ? 'Saving...' : 'Save Address'}
                    </button>
                  </div>
                )}
              </form>
            </CardContent>
          </Card>

          {/* Bank Details */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <CreditCard className="w-5 h-5 text-indigo-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Bank Details</h3>
              </div>
              <form id="bank-details-form" onSubmit={handleCompanyInfoUpdate}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Bank Name</label>
                    <input
                      type="text"
                      value={companyInfo.bankName}
                      onChange={(e) => setCompanyInfo({ ...companyInfo, bankName: e.target.value })}
                      disabled={currentUser.role !== "super_admin"}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent disabled:bg-gray-100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Account Number</label>
                    <input
                      type="text"
                      value={companyInfo.bankAccountNumber}
                      onChange={(e) => setCompanyInfo({ ...companyInfo, bankAccountNumber: e.target.value })}
                      disabled={currentUser.role !== "super_admin"}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent disabled:bg-gray-100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">IFSC Code</label>
                    <input
                      type="text"
                      value={companyInfo.bankIfscCode}
                      onChange={(e) => setCompanyInfo({ ...companyInfo, bankIfscCode: e.target.value })}
                      disabled={currentUser.role !== "super_admin"}
                      placeholder="HDFC0001234"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent disabled:bg-gray-100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Branch</label>
                    <input
                      type="text"
                      value={companyInfo.bankBranch}
                      onChange={(e) => setCompanyInfo({ ...companyInfo, bankBranch: e.target.value })}
                      disabled={currentUser.role !== "super_admin"}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent disabled:bg-gray-100"
                    />
                  </div>
                </div>

                {currentUser.role === "super_admin" && canManageSettings && (
                  <div className="mt-6">
                    <button
                      type="submit"
                      disabled={loadingCompanyInfo}
                      className="flex items-center gap-2 bg-gray-900 hover:bg-gray-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Save className="h-4 w-4" />
                      {loadingCompanyInfo ? 'Saving...' : 'Save Bank Details'}
                    </button>
                  </div>
                )}
              </form>
            </CardContent>
          </Card>

          {currentUser.role === "admin" && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> Company information can only be edited by Super Admin. Contact your Super Admin to make changes.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Payment Settings Tab */}
      {activeTab === "payment" && canAccessAdminSettings && (
        <div className="space-y-6">
          {loadingPaymentSettings ? (
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading payment settings...</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Info Box */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Important:</strong> Only one payment gateway can be active at a time. When you enable one gateway, the other will be automatically disabled.
                </p>
              </div>

              {/* Razorpay Payment Gateway */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-gray-100 rounded-lg">
                        <DollarSign className="w-5 h-5 text-gray-900" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-gray-900">Razorpay Payment Gateway</h3>
                        <p className="text-sm text-gray-600 mt-1">Configure payment settings for customer transactions</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">Status:</span>
                      <span
                        className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${razorpaySettings.enabled
                          ? "bg-gray-900 text-white"
                          : "bg-gray-200 text-gray-700"
                          }`}
                      >
                        {razorpaySettings.enabled ? "● Active" : "● Inactive"}
                      </span>
                    </div>
                  </div>

                  <form onSubmit={handleRazorpaySettingsUpdate}>
                    {/* Enable/Disable Toggle */}
                    <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">Enable Razorpay Payments</p>
                          <p className="text-sm text-gray-600">Allow customers to pay using Razorpay gateway</p>
                          {razorpaySettings.enabled && payuSettings.enabled && (
                            <p className="text-xs text-amber-600 mt-1">⚠ Enabling this will disable PayU</p>
                          )}
                        </div>
                        <input
                          type="checkbox"
                          checked={razorpaySettings.enabled}
                          onChange={(e) => setRazorpaySettings({ ...razorpaySettings, enabled: e.target.checked })}
                          disabled={currentUser.role !== "super_admin"}
                          className="h-5 w-5 text-gray-900 border-gray-300 rounded focus:ring-gray-900 disabled:opacity-50"
                        />
                      </div>
                    </div>

                    {/* Warning when enabling */}
                    {razorpaySettings.enabled && payuSettings.enabled && (
                      <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                        <p className="text-sm text-amber-800">
                          <strong>Note:</strong> Only one payment gateway can be active at a time. Saving these settings will automatically disable PayU.
                        </p>
                      </div>
                    )}

                    {/* API Credentials */}
                    <div className="space-y-4 mb-6">
                      <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                        <Key className="h-4 w-4" />
                        API Credentials
                      </h4>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Key ID <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={razorpaySettings.keyId}
                            onChange={(e) => setRazorpaySettings({ ...razorpaySettings, keyId: e.target.value })}
                            disabled={currentUser.role !== "super_admin"}
                            placeholder="rzp_test_1234567890"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent disabled:bg-gray-100 font-mono text-sm"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Key Secret <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <input
                              type={!isRazorpaySecretMasked && showRazorpaySecret ? "text" : "password"}
                              value={razorpaySettings.keySecret}
                              onChange={(e) => {
                                setRazorpaySettings({ ...razorpaySettings, keySecret: e.target.value });
                                // Reset visibility when user starts typing on a masked field
                                if (isRazorpaySecretMasked) {
                                  setShowRazorpaySecret(false);
                                }
                              }}
                              disabled={currentUser.role !== "super_admin"}
                              placeholder="Enter key secret"
                              className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent disabled:bg-gray-100 font-mono text-sm ${!isRazorpaySecretMasked && razorpaySettings.keySecret ? 'pr-10' : ''}`}
                            />
                            {!isRazorpaySecretMasked && razorpaySettings.keySecret && (
                              <button
                                type="button"
                                onClick={() => setShowRazorpaySecret(!showRazorpaySecret)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                title={showRazorpaySecret ? "Hide secret" : "Show secret"}
                              >
                                {showRazorpaySecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                            )}
                          </div>
                          {isRazorpaySecretMasked && (
                            <p className="text-xs text-gray-500 mt-1">Secret is hidden. Enter a new value to update.</p>
                          )}
                        </div>

                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-2">Webhook Secret</label>
                          <div className="relative">
                            <input
                              type={!isRazorpayWebhookMasked && showRazorpayWebhook ? "text" : "password"}
                              value={razorpaySettings.webhookSecret}
                              onChange={(e) => {
                                setRazorpaySettings({ ...razorpaySettings, webhookSecret: e.target.value });
                                // Reset visibility when user starts typing on a masked field
                                if (isRazorpayWebhookMasked) {
                                  setShowRazorpayWebhook(false);
                                }
                              }}
                              disabled={currentUser.role !== "super_admin"}
                              placeholder="Enter webhook secret"
                              className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent disabled:bg-gray-100 font-mono text-sm ${!isRazorpayWebhookMasked && razorpaySettings.webhookSecret ? 'pr-10' : ''}`}
                            />
                            {!isRazorpayWebhookMasked && razorpaySettings.webhookSecret && (
                              <button
                                type="button"
                                onClick={() => setShowRazorpayWebhook(!showRazorpayWebhook)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                title={showRazorpayWebhook ? "Hide secret" : "Show secret"}
                              >
                                {showRazorpayWebhook ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                            )}
                          </div>
                          {isRazorpayWebhookMasked && (
                            <p className="text-xs text-gray-500 mt-1">Secret is hidden. Enter a new value to update.</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {currentUser.role === "super_admin" && canManageSettings && (
                      <div className="mt-6 flex items-center gap-3">
                        <button
                          type="submit"
                          disabled={loadingPaymentSettings}
                          className="flex items-center gap-2 bg-gray-900 hover:bg-gray-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Save className="h-4 w-4" />
                          {loadingPaymentSettings ? 'Saving...' : 'Save Payment Settings'}
                        </button>
                        <a
                          href="https://dashboard.razorpay.com"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:text-blue-800 underline"
                        >
                          Open Razorpay Dashboard →
                        </a>
                      </div>
                    )}
                  </form>
                </CardContent>
              </Card>

              {/* PayU Payment Gateway */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-gray-100 rounded-lg">
                        <DollarSign className="w-5 h-5 text-gray-900" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-gray-900">PayU Payment Gateway</h3>
                        <p className="text-sm text-gray-600 mt-1">Configure PayU for Indian market payments</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">Status:</span>
                      <span
                        className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${payuSettings.enabled
                          ? "bg-gray-900 text-white"
                          : "bg-gray-200 text-gray-700"
                          }`}
                      >
                        {payuSettings.enabled ? "● Active" : "● Inactive"}
                      </span>
                    </div>
                  </div>

                  <form onSubmit={handlePayUSettingsUpdate}>
                    {/* Enable/Disable Toggle */}
                    <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">Enable PayU Payments</p>
                          <p className="text-sm text-gray-600">Allow customers to pay using PayU gateway</p>
                          {payuSettings.enabled && razorpaySettings.enabled && (
                            <p className="text-xs text-amber-600 mt-1">⚠ Enabling this will disable Razorpay</p>
                          )}
                        </div>
                        <input
                          type="checkbox"
                          checked={payuSettings.enabled}
                          onChange={(e) => setPayuSettings({ ...payuSettings, enabled: e.target.checked })}
                          disabled={currentUser.role !== "super_admin"}
                          className="h-5 w-5 text-gray-900 border-gray-300 rounded focus:ring-gray-900 disabled:opacity-50"
                        />
                      </div>
                    </div>

                    {/* Warning when enabling */}
                    {payuSettings.enabled && razorpaySettings.enabled && (
                      <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                        <p className="text-sm text-amber-800">
                          <strong>Note:</strong> Only one payment gateway can be active at a time. Saving these settings will automatically disable Razorpay.
                        </p>
                      </div>
                    )}

                    {/* API Credentials */}
                    <div className="space-y-4 mb-6">
                      <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                        <Key className="h-4 w-4" />
                        API Credentials
                      </h4>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Merchant Key <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={payuSettings.merchantKey}
                            onChange={(e) => setPayuSettings({ ...payuSettings, merchantKey: e.target.value })}
                            disabled={currentUser.role !== "super_admin"}
                            placeholder="gtKFFx"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent disabled:bg-gray-100 font-mono text-sm"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Merchant Salt <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <input
                              type={!isPayuSaltMasked && showPayuSalt ? "text" : "password"}
                              value={payuSettings.merchantSalt}
                              onChange={(e) => {
                                setPayuSettings({ ...payuSettings, merchantSalt: e.target.value });
                                // Reset visibility when user starts typing on a masked field
                                if (isPayuSaltMasked) {
                                  setShowPayuSalt(false);
                                }
                              }}
                              disabled={currentUser.role !== "super_admin"}
                              placeholder="Enter merchant salt"
                              className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent disabled:bg-gray-100 font-mono text-sm ${!isPayuSaltMasked && payuSettings.merchantSalt ? 'pr-10' : ''}`}
                            />
                            {!isPayuSaltMasked && payuSettings.merchantSalt && (
                              <button
                                type="button"
                                onClick={() => setShowPayuSalt(!showPayuSalt)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                title={showPayuSalt ? "Hide salt" : "Show salt"}
                              >
                                {showPayuSalt ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                            )}
                          </div>
                          {isPayuSaltMasked && (
                            <p className="text-xs text-gray-500 mt-1">Salt is hidden. Enter a new value to update.</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {currentUser.role === "super_admin" && canManageSettings && (
                      <div className="mt-6 flex items-center gap-3">
                        <button
                          type="submit"
                          disabled={loadingPaymentSettings}
                          className="flex items-center gap-2 bg-gray-900 hover:bg-gray-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Save className="h-4 w-4" />
                          {loadingPaymentSettings ? 'Saving...' : 'Save PayU Settings'}
                        </button>
                        <a
                          href="https://dashboard.payu.in"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:text-blue-800 underline"
                        >
                          Open PayU Dashboard →
                        </a>
                      </div>
                    )}
                  </form>
                </CardContent>
              </Card>

              {currentUser.role === "admin" && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Note:</strong> Payment gateway settings can only be modified by Super Admin. Contact your Super Admin to make changes.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* GST Settings Tab */}
      {activeTab === "gst" && canAccessAdminSettings && (
        <GSTSettingsTab />
      )}

      {/* Hub Management Tab */}
      {activeTab === "hub" && canAccessAdminSettings && (
        <HubSettingsTab />
      )}

      {/* Invoice Settings Tab */}
      {activeTab === "invoice" && canAccessAdminSettings && (
        <InvoiceSettings />
      )}

      {/* SEO Settings Tab */}
      {activeTab === "seo" && canAccessAdminSettings && (
        <SEOSettingsTab />
      )}

      {/* Banner Settings Tab */}
      {activeTab === "banner" && canAccessAdminSettings && (
        <BannerSettingsTab />
      )}
    </div>
  );
}
