'use client';

import { useState } from 'react';
import Link from 'next/link';
import { SquarePen, CheckCircle2, Calendar, Home } from 'lucide-react';
import { Button } from '@/components/UI/Button';
import VendorService, { VendorRegistrationData, VendorFiles } from '@/services/vendorService';

interface ReviewSubmitProps {
  onPrev: () => void;
  onGoToStep: (step: number) => void;
  data: any;
}

interface Certificate {
  id: string;
  label: string;
}

interface CertificateStatus {
  status: 'expired' | 'expiring' | 'warning' | 'valid';
  message: string;
  color: string;
}

const FormCard: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => (
  <section className="bg-white rounded-lg border border-gray-200 p-4  shadow-sm">
    {children}
  </section>
);

export default function ReviewSubmit({ onPrev, onGoToStep, data }: ReviewSubmitProps) {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmChecked, setConfirmChecked] = useState(false);
  const [termsChecked, setTermsChecked] = useState(false);
  const [privacyChecked, setPrivacyChecked] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    // Require confirmation, terms and privacy agreement
    if (!confirmChecked || !termsChecked || !privacyChecked) {
      setSubmitError('Please accept all terms and conditions');
      return;
    }
    
    setIsSubmitting(true);
    setSubmitError(null);
    
    try {
      // Prepare form data
      const registrationData: VendorRegistrationData = {
        // Company Details
        businessType: data.businessType || 'corporation',
        companyName: data.companyName || '',
        gstNumber: data.gstNumber || '',
        email: data.email || '',
        phone: data.phone || '',
        website: data.website || '',
        address: data.address || '',
        city: data.city || '',
        state: data.state || '',
        zipCode: data.zipCode || '',
        country: data.country || 'India',
        
        // Owner Profile
        ownerName: data.ownerName || '',
        ownerEmail: data.ownerEmail || '',
        ownerPhone: data.ownerPhone || '',
        yearEstablished: data.yearEstablished || '',
        employeeCount: data.employeeCount || '',
        
        // Warehouse Details
        ownershipType: data.ownershipType || 'owned',
        warehouseAddress: data.warehouseAddress || data.address || '',
        warehouseCity: data.warehouseCity || data.city || '',
        warehouseState: data.warehouseState || data.state || '',
        warehouseZip: data.warehouseZip || data.zipCode || '',
        warehouseCountry: data.warehouseCountry || data.country || 'India',
        mapLink: data.mapLink || '',
        
        // Vendor Type & Products
        vendorType: data.vendorType || ['manufacturer'],
        marketType: Array.isArray(data.marketType) ? data.marketType : (data.marketType ? [data.marketType] : ['domestic']),
        selectedCategories: data.selectedCategories || {},
        categoryRemarks: data.categoryRemarks || '',
        
        // Manufacturing Facilities
        enabledFacilities: data.enabledFacilities || {},
        facilityDetails: data.facilityDetails || {},
        
        // Certifications & Logistics
        selectedCertifications: data.selectedCertifications || [],
        certificationExpiryDates: data.certificationExpiryDates || {},
        qualityControlProcess: data.qualityControlProcess || '',
        complianceStandards: data.complianceStandards || '',
        packagingCapabilities: data.packagingCapabilities || '',
        warehousingCapacity: data.warehousingCapacity || '',
        logisticsPartners: data.logisticsPartners || '',
        shippingMethods: data.shippingMethods || [],
        
        // Contact & Trade Info
        mainContact: data.mainContact || {
          name: data.ownerName || '',
          designation: 'Owner',
          email1: data.ownerEmail || '',
          phone1: data.ownerPhone || '',
          department: 'Management'
        },
        alternateContacts: data.alternateContacts || [],
        hasImportExport: data.hasImportExport || 'no',
        importCountries: data.importCountries || [],
        exportCountries: data.exportCountries || [],
        tradeLicenseNumber: data.tradeLicenseNumber || '',
        businessRegistrationNumber: data.businessRegistrationNumber || '',
        taxIdentificationNumber: data.taxIdentificationNumber || '',
        bankingDetails: data.bankingDetails || undefined,
        
        // Password - you should add a password field to your form
        password: 'VendorPass123!' // Default password - should be user-defined
      };
      
      // Prepare files
      const files: VendorFiles = {
        logo: data.logoFile,
        gstDocument: data.gstFile,
        ownerPhoto: data.ownerPhotoFile,
        factoryImages: data.factoryImages?.map((img: any) => img.file).filter(Boolean) || [],
        // Extract File objects from certificationFiles (they're wrapped in metadata objects)
        certificationFiles: data.certificationFiles 
          ? Object.entries(data.certificationFiles).reduce((acc: Record<string, File>, [certId, fileData]: [string, any]) => {
              if (fileData && fileData.file) {
                acc[certId] = fileData.file;
              }
              return acc;
            }, {})
          : {}
      };
      
      // Submit registration
      const result = await VendorService.registerVendor(registrationData, files);
      
      console.log('Registration successful:', result);
      setIsSubmitted(true);
      
    } catch (error: any) {
      console.error('Registration failed:', error);
      setSubmitError(error.message || 'Registration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4 text-center animate-fade-in">
        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-10 h-10 text-green-600" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Registration Submitted Successfully!</h1>
        <p className="text-lg text-gray-600 mb-8">
          Thank you for registering as a vendor. Our team will review your application
          and contact you within <strong>48 hours</strong>.
        </p>
        <div className="bg-gray-50 rounded-lg p-6 text-left mb-8">
          <h3 className="font-semibold text-gray-900 mb-3">What happens next?</h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs shrink-0 mt-0.5">1</span>
              Our team will verify your submitted documents and information
            </li>
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs shrink-0 mt-0.5">2</span>
              You may receive a call for additional verification if needed
            </li>
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs shrink-0 mt-0.5">3</span>
              Once approved, you'll receive access to your vendor dashboard
            </li>
          </ul>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/">
            <Button className="bg-[#313131] hover:bg-[#222222] text-white px-8 py-3 text-base font-semibold flex items-center gap-2">
              <Home className="w-5 h-5" />
              Return to Homepage
            </Button>
          </Link>
          <Link href="/vendor">
            <Button variant="outline" className="border-2 border-gray-300 text-gray-700 hover:bg-gray-50 px-8 py-3 text-base font-semibold">
              Vendor Login
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Check if Manufacturing Facilities step should be included
  const isManufacturer = () => {
    const vendorTypes = data.vendorType || [];
    return Array.isArray(vendorTypes) ? vendorTypes.includes('manufacturer') : vendorTypes === 'manufacturer';
  };

  // Get the correct step numbers for edit buttons
  const getStepNumber = (logicalStep: string) => {
    const stepMap = {
      'company': 0,
      'warehouse': 1, 
      'owner': 2,
      'vendor': 3,
      'manufacturing': 4, // Only shown if manufacturer
      'certifications': isManufacturer() ? 5 : 4,
      'contact': isManufacturer() ? 6 : 5
    };
    return stepMap[logicalStep as keyof typeof stepMap] || 0;
  };

  const SectionHeader = ({ title, step }: { title: string; step: number }) => (
    <div className="flex items-center justify-between mb-4">
      <h3 className="font-bold text-lg">{title}</h3>
      <button type="button" onClick={() => onGoToStep(step)} className="text-white bg-gray-900 p-2 rounded-md flex items-center gap-1 text-base">
        <SquarePen className="w-4 h-4" />
        Edit
      </button>
    </div>
  );

  const InfoRow = ({ label, value }: { label: string; value: string | React.ReactNode }) => (
    <div className="flex flex-col sm:flex-row sm:items-start py-2 border-b border-border last:border-0">
      <span className="text-sm text-muted-foreground sm:w-1/3 shrink-0">{label}</span>
      <span className="text-sm text-foreground sm:w-2/3">{value || '—'}</span>
    </div>
  );

  // Manufacturing Facilities
  const enabledFacilities = Object.entries(data.enabledFacilities || {})
    .filter(([_, enabled]) => enabled)
    .map(([id]) => {
      const facilityLabels: { [key: string]: string } = {
        spinning: 'Spinning',
        weaving: 'Weaving', 
        dyeing: 'Dyeing',
        printing: 'Printing',
        finishing: 'Finishing'
      };
      return facilityLabels[id] || id;
    })
    .filter(Boolean);

  // Certifications
  const selectedCerts: Certificate[] = (data.selectedCertifications || []).map((c: string) => {
    const certLabels: { [key: string]: string } = {
      'oeko-tex': 'OEKO-TEX',
      'gots': 'GOTS',
      'grs': 'GRS', 
      'smeta': 'SMETA'
    };
    return { id: c, label: certLabels[c] || c };
  });

  // Product Categories
  const getSelectedCategories = () => {
    const categories = data.selectedCategories || {};
    const result: string[] = [];
    
    Object.entries(categories).forEach(([categoryId, subCategories]) => {
      if (subCategories && Array.isArray(subCategories) && subCategories.length > 0) {
        const categoryLabels: { [key: string]: string } = {
          'bedding': 'Bedding',
          'bath-linens': 'Bath Linens',
          'kitchen-textiles': 'Kitchen Textiles',
          'decor': 'Décor',
          'window-treatments': 'Window Treatments',
          'floor-coverings': 'Floor Coverings',
          'living-furniture': 'Living/Furniture'
        };
        const categoryName = categoryLabels[categoryId] || categoryId;
        result.push(`${categoryName}: ${subCategories.join(', ')}`);
      }
    });
    
    return result;
  };

  // Vendor Type and Market Type
  const getVendorTypeLabel = (types: string | string[]) => {
    const labels: { [key: string]: string } = {
      'manufacturer': 'Manufacturer',
      'importer': 'Importer', 
      'exporter': 'Exporter'
    };
    
    if (Array.isArray(types)) {
      return types.map(type => labels[type] || type).join(', ');
    }
    return labels[types] || types;
  };

  const getMarketTypeLabel = (type: string | string[]) => {
    const labels: { [key: string]: string } = {
      'domestic': 'Domestic',
      'international': 'International'
    };
    
    if (Array.isArray(type)) {
      return type.map(t => labels[t] || t).join(', ');
    }
    return labels[type] || type;
  };

  // Business Type
  const getBusinessTypeLabel = (type: string) => {
    const labels: { [key: string]: string } = {
      'sole': 'Sole Proprietorship',
      'partnership': 'Partnership',
      'corporation': 'Corporation',
      'llc': 'Limited Liability Company (LLC)'
    };
    return labels[type] || type;
  };

  // Employee Count
  const getEmployeeCountLabel = (count: string) => {
    const labels: { [key: string]: string } = {
      '10-20': '10-20 employees',
      '20-50': '20-50 employees',
      '50-100': '50-100 employees',
      '100+': '100+ employees'
    };
    return labels[count] || count;
  };

  // Ownership Type
  const getOwnershipTypeLabel = (type: string) => {
    const labels: { [key: string]: string } = {
      'owned': 'Owned',
      'rented': 'Rented',
      'lease': 'Lease'
    };
    return labels[type] || type;
  };

  // Certificate Status
  const getCertificateStatus = (expiryDate: string): CertificateStatus | null => {
    if (!expiryDate) return null;
    
    const today = new Date();
    const expiry = new Date(expiryDate);
    const daysUntilExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiry < 0) {
      return { status: 'expired', message: 'Expired', color: 'text-red-600 bg-red-50 border-red-200' };
    } else if (daysUntilExpiry <= 30) {
      return { status: 'expiring', message: `Expires in ${daysUntilExpiry} days`, color: 'text-orange-600 bg-orange-50 border-orange-200' };
    } else if (daysUntilExpiry <= 90) {
      return { status: 'warning', message: `Expires in ${daysUntilExpiry} days`, color: 'text-yellow-600 bg-yellow-50 border-yellow-200' };
    } else {
      return { status: 'valid', message: `Valid until ${expiry.toLocaleDateString()}`, color: 'text-green-600 bg-green-50 border-green-200' };
    }
  };

  return (
    <div className="max-w-420 mx-auto py-8 px-4 animate-slide-up">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Review & Submit</h1>
        <p className="text-muted-foreground mt-1">Please review all information before submitting your application</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <FormCard >
          <SectionHeader title="Company Details" step={getStepNumber('company')} />
          <div className="space-y-1">
            <InfoRow label="Business Type" value={getBusinessTypeLabel(data.businessType)} />
            <InfoRow label="Company Name" value={data.companyName} />
            <InfoRow label="GST Number" value={data.gstNumber || 'Not provided'} />
            <InfoRow label="GST Document" value={data.gstFile ? 'Uploaded' : 'Not uploaded'} />
            <InfoRow label="Email" value={data.email} />
            <InfoRow label="Phone" value={data.phone} />
            <InfoRow label="Website" value={data.website} />
            <InfoRow label="Address" value={`${data.address || ''}, ${data.city || ''}, ${data.state || ''} ${data.zipCode || ''}`.replace(/^,\s*/, '').replace(/,\s*$/, '')} />
            <InfoRow label="Country" value={data.country} />
            <InfoRow label="Same as Warehouse" value={data.sameAsWarehouse ? 'Yes' : 'No'} />
            <InfoRow label="Company Logo" value={data.logo ? 'Uploaded' : 'Not uploaded'} />
          </div>
        </FormCard>

        <FormCard>
          <SectionHeader title="Warehouse / Factory" step={getStepNumber('warehouse')} />
          <div className="space-y-1">
            <InfoRow label="Ownership Type" value={getOwnershipTypeLabel(data.ownershipType)} />
            <InfoRow label="Address" value={`${data.warehouseAddress || ''}, ${data.warehouseCity || ''}, ${data.warehouseState || ''} ${data.warehouseZip || ''}`.replace(/^,\s*/, '').replace(/,\s*$/, '')} />
            <InfoRow label="Country" value={data.warehouseCountry} />
            <InfoRow label="Factory Images" value={`${(data.factoryImages || []).length} file(s) uploaded`} />
            <InfoRow label="Map Link" value={data.mapLink ? 'Provided' : 'Not provided'} />
          </div>
        </FormCard>

        <FormCard>
          <SectionHeader title="Owner Profile" step={getStepNumber('owner')} />
          <div className="space-y-1">
            <InfoRow label="Owner Name" value={data.ownerName} />
            <InfoRow label="Email" value={data.ownerEmail} />
            <InfoRow label="Phone" value={data.ownerPhone} />
            <InfoRow label="Year Established" value={data.yearEstablished} />
            <InfoRow label="Employee Count" value={getEmployeeCountLabel(data.employeeCount)} />
            <InfoRow label="Years in Business" value={data.yearEstablished ? `${new Date().getFullYear() - parseInt(data.yearEstablished)} years` : 'N/A'} />
          </div>
        </FormCard>

        <FormCard>
          <SectionHeader title="Vendor Type & Products" step={getStepNumber('vendor')} />
          <div className="space-y-1">
            <InfoRow label="Vendor Type" value={getVendorTypeLabel(data.vendorType)} />
            <InfoRow label="Market Focus" value={getMarketTypeLabel(data.marketType)} />
            <InfoRow label="Product Categories" value={
              getSelectedCategories().length > 0 ? (
                <div className="space-y-1">
                  {getSelectedCategories().map((category, index) => (
                    <div key={index} className="text-sm">{category}</div>
                  ))}
                </div>
              ) : (
                'None selected'
              )
            } />
            {data.categoryRemarks && (
              <InfoRow label="Category Remarks" value={
                <div className="text-sm bg-gray-50 p-2 rounded border border-gray-200">
                  {data.categoryRemarks}
                </div>
              } />
            )}
          </div>
        </FormCard>

        {/* Only show Manufacturing Facilities if vendor is a manufacturer */}
        {isManufacturer() && (
          <FormCard>
            <SectionHeader title="Manufacturing Facilities" step={getStepNumber('manufacturing')} />
            <div className="space-y-1">
              <InfoRow label="Active Facilities" value={enabledFacilities.length > 0 ? enabledFacilities.join(', ') : 'None selected'} />
              {Object.entries(data.facilityDetails || {}).map(([facilityId, details]: [string, any]) => {
                if (!data.enabledFacilities?.[facilityId]) return null;
                const facilityName = enabledFacilities.find(f => f.toLowerCase().includes(facilityId)) || facilityId;
                return (
                  <div key={facilityId} className="ml-4 space-y-1 border-l-2 border-gray-200 pl-4">
                    <div className="font-medium text-sm text-gray-700">{facilityName} Details:</div>
                    {Object.entries(details || {}).map(([key, value]: [string, any]) => (
                      <InfoRow key={key} label={key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())} value={value} />
                    ))}
                  </div>
                );
              })}
            </div>
          </FormCard>
        )}

        <FormCard>
          <SectionHeader title="Certifications & Logistics" step={getStepNumber('certifications')} />
          <div className="space-y-1">
            <InfoRow label="Certifications" value={
              selectedCerts.length > 0 ? (
                <div className="space-y-3">
                  {selectedCerts.map((cert: Certificate) => {
                    const expiryDate = data.certificationExpiryDates?.[cert.id];
                    const status = expiryDate ? getCertificateStatus(expiryDate) : null;
                    const hasFile = data.certificationFiles?.[cert.id];
                    
                    return (
                      <div key={cert.id} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                        <div className="flex items-center justify-between mb-2">
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded text-xs font-medium">
                            {cert.label}
                          </span>
                          <div className="flex items-center gap-2 text-xs">
                            {hasFile && (
                              <span className="text-green-600 bg-green-50 px-2 py-1 rounded border border-green-200">
                                ✓ File Uploaded
                              </span>
                            )}
                            {!hasFile && (
                              <span className="text-gray-500 bg-gray-100 px-2 py-1 rounded border border-gray-200">
                                No File
                              </span>
                            )}
                          </div>
                        </div>
                        
                        {/* Expiry Date Information */}
                        {expiryDate ? (
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-gray-500" />
                            <span className="text-sm text-gray-600">
                              Expires: {new Date(expiryDate).toLocaleDateString()}
                            </span>
                            {status && (
                              <span className={`text-xs px-2 py-1 rounded border ${status.color} ml-2`}>
                                {status.message}
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-400">No expiry date set</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                'None selected'
              )
            } />
            <InfoRow label="Uploaded Certificate Files" value={
              Object.keys(data.certificationFiles || {}).length > 0 ? (
                <div className="space-y-2">
                  {Object.entries(data.certificationFiles || {}).map(([certId, fileData]: [string, any]) => {
                    const cert = selectedCerts.find((c: Certificate) => c.id === certId);
                    const expiryDate = data.certificationExpiryDates?.[certId];
                    const status = expiryDate ? getCertificateStatus(expiryDate) : null;
                    
                    return (
                      <div key={certId} className="flex items-center justify-between p-2 bg-gray-50 rounded border">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900">
                            {cert?.label || certId}
                          </span>
                          <span className="text-xs text-gray-500">
                            ({fileData.name})
                          </span>
                        </div>
                        {status && (
                          <span className={`text-xs px-2 py-1 rounded border ${status.color}`}>
                            <Calendar className="w-3 h-3 inline mr-1" />
                            {status.message}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                'No files uploaded'
              )
            } />
            <InfoRow label="Quality Control Process" value={data.qualityControlProcess || 'Not provided'} />
            <InfoRow label="Compliance Standards" value={data.complianceStandards || 'Not provided'} />
            <InfoRow label="Packaging Capabilities" value={data.packagingCapabilities || 'Not provided'} />
            <InfoRow label="Warehousing Capacity" value={data.warehousingCapacity ? `${data.warehousingCapacity} sq ft` : 'Not provided'} />
            <InfoRow label="Logistics Partners" value={data.logisticsPartners || 'Not provided'} />
            <InfoRow label="Shipping Methods" value={
              (data.shippingMethods || []).length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {data.shippingMethods.map((method: string) => (
                    <span key={method} className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs">
                      {method}
                    </span>
                  ))}
                </div>
              ) : (
                'None selected'
              )
            } />
          </div>
        </FormCard>

        <FormCard>
          <SectionHeader title="Contact & Trade" step={getStepNumber('contact')} />
          <div className="space-y-1">
            <InfoRow label="Main Contact Name" value={data.mainContact?.name || 'Not provided'} />
            <InfoRow label="Main Contact Designation" value={data.mainContact?.designation || 'Not provided'} />
            <InfoRow label="Main Contact Email" value={data.mainContact?.email || 'Not provided'} />
            <InfoRow label="Main Contact Phone" value={data.mainContact?.phone || 'Not provided'} />
            <InfoRow label="Main Contact Department" value={data.mainContact?.department || 'Not provided'} />
            <InfoRow label="Alternate Contacts" value={`${(data.alternateContacts || []).length} contact(s) added`} />
            {(data.alternateContacts || []).length > 0 && (
              <div className="ml-4 space-y-2 border-l-2 border-gray-200 pl-4">
                {data.alternateContacts.map((contact: any, index: number) => (
                  <div key={contact.id || index} className="space-y-1">
                    <div className="font-medium text-sm text-gray-700">Contact {index + 1}:</div>
                    <InfoRow label="Name" value={contact.name || 'Not provided'} />
                    <InfoRow label="Designation" value={contact.designation || 'Not provided'} />
                    <InfoRow label="Email" value={contact.email || 'Not provided'} />
                    <InfoRow label="Phone" value={contact.phone || 'Not provided'} />
                  </div>
                ))}
              </div>
            )}
            <InfoRow label="Import/Export Activities" value={data.hasImportExport === 'yes' ? 'Yes' : 'No'} />
            {data.hasImportExport === 'yes' && (
              <>
                <InfoRow label="Import Countries" value={(data.importCountries || []).join(', ') || 'None'} />
                <InfoRow label="Export Countries" value={(data.exportCountries || []).join(', ') || 'None'} />
              </>
            )}
            <InfoRow label="Trade License Number" value={data.tradeLicenseNumber || 'Not provided'} />
            <InfoRow label="Business Registration Number" value={data.businessRegistrationNumber || 'Not provided'} />
            <InfoRow label="Tax Identification Number" value={data.taxIdentificationNumber || 'Not provided'} />
            {data.bankingDetails && (
              <>
                <InfoRow label="Bank Name" value={data.bankingDetails.bankName || 'Not provided'} />
                <InfoRow label="Account Number" value={data.bankingDetails.accountNumber ? '****' + data.bankingDetails.accountNumber.slice(-4) : 'Not provided'} />
                <InfoRow label="SWIFT Code" value={data.bankingDetails.swiftCode || 'Not provided'} />
              </>
            )}
          </div>
        </FormCard>

        <div className='max-w-5xl space-y-4'>
          {submitError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="text-red-800 text-sm">{submitError}</div>
            </div>
          )}
          
          <div className="flex items-start gap-3 border border-gray-500 p-4 rounded-lg">
            <input id="confirmAccuracy" type="checkbox" checked={confirmChecked} onChange={(e) => setConfirmChecked(e.target.checked)} className="mt-1" />
            <label htmlFor="confirmAccuracy" className="text-base cursor-pointer">I Confirm that all the information provided above is accurate and complete to the best of my knowledge. I understand that providing false information may result in rejection of my vendor application.</label>
          </div>
          <div className="flex items-start gap-3 border border-gray-500 p-4 rounded-lg">
            <input id="agreeTerms" type="checkbox" checked={termsChecked} onChange={(e) => setTermsChecked(e.target.checked)} className="mt-1" />
            <label htmlFor="agreeTerms" className="text-base cursor-pointer">
              I Agree to the <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Terms &amp; Conditions</a>
            </label>
          </div>
          <div className="flex items-start gap-3 border border-gray-500 p-4 rounded-lg">
            <input id="agreePrivacy" type="checkbox" checked={privacyChecked} onChange={(e) => setPrivacyChecked(e.target.checked)} className="mt-1" />
            <label htmlFor="agreePrivacy" className="text-base cursor-pointer">
              I Agree to the <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Privacy Policy</a>
            </label>
          </div>
        </div>  

        <div className="flex justify-between pt-4">
          <Button className='bg-red-500 text-white p-4 rounded-md' type="button" variant="outline" onClick={onPrev} disabled={isSubmitting}>
            Back
          </Button>
          <Button 
            className="bg-green-400 text-white p-4 rounded-md" 
            type="submit" 
            size="lg" 
            disabled={!confirmChecked || !termsChecked || !privacyChecked || isSubmitting} 
            onClick={handleSubmit}
          >
            {isSubmitting ? 'Submitting...' : 'Submit for Approval'}
          </Button>
        </div>
      </form>
    </div>
  );
}