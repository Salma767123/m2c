'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { CheckCircle2, Home, ArrowLeft, Send } from 'lucide-react';
import { Button } from '@/components/UI/Button';
import VendorService, { VendorRegistrationData, VendorFiles } from '@/services/vendorService';
import { categoryService } from '@/services/categoryService';
import VendorDataSummary from './VendorDataSummary';

interface ReviewSubmitProps {
  onPrev: () => void;
  onGoToStep: (step: number) => void;
  data: any;
}

export default function ReviewSubmit({ onPrev, onGoToStep, data }: ReviewSubmitProps) {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmChecked, setConfirmChecked] = useState(false);
  const [termsConditions, setTermsConditions] = useState({
    acceptanceOfTerms: false,
    paymentTerms: false,
    shippingDelivery: false,
    returnsRefunds: false,
    limitationOfLiability: false,
    governingLaw: false,
  });
  const [privacyChecked, setPrivacyChecked] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [categoryNameMap, setCategoryNameMap] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchCategoryNames = async () => {
      try {
        const response = await categoryService.getCategoryTree({ status: 'ACTIVE', includeInactive: false });
        const map: Record<string, string> = {};
        (response.data || []).forEach((cat: any) => {
          map[cat.id] = cat.name;
        });
        setCategoryNameMap(map);
      } catch {
        // Silently fail — will show IDs as fallback
      }
    };
    fetchCategoryNames();
  }, []);

  const allTermsAccepted = Object.values(termsConditions).every(Boolean);

  const handleTermChange = (key: string, checked: boolean) => {
    setTermsConditions(prev => ({ ...prev, [key]: checked }));
  };
  
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    // Require confirmation, terms and privacy agreement
    if (!confirmChecked || !allTermsAccepted || !privacyChecked) {
      setSubmitError('Please accept all terms and conditions');
      return;
    }
    
    setIsSubmitting(true);
    setSubmitError(null);
    
    try {
      // Prepare form data
      const registrationData: VendorRegistrationData = {
        // Company Details
        businessType: data.businessType || '',
        companyName: data.companyName || '',
        gstNumber: data.gstNumber || '',
        companyIdNumber: data.companyIdNumber || '',
        panNumber: data.panNumber || '',
        email: data.email || '',
        email2: data.email2 || '',
        phone: data.phone || '',
        landlineNumber: data.landlineNumber || '',
        phoneNumber2: data.phoneNumber2 || '',
        website: data.website || '',
        address: data.address || '',
        addressLine2: data.addressLine2 || '',
        addressLine3: data.addressLine3 || '',
        landmark: data.landmark || '',
        city: data.city || '',
        state: data.state || '',
        zipCode: data.zipCode || '',
        country: data.country || 'India',
        factoryOwnershipType: data.factoryOwnershipType || '',
        
        // Owner Profile
        ownerName: data.ownerName || '',
        designation: data.designation || '',
        ownerEmail: data.ownerEmail || '',
        ownerEmail2: data.ownerEmail2 || '',
        ownerPhone: data.ownerPhone || '',
        ownerPhone2: data.ownerPhone2 || '',
        ownerLandline: data.ownerLandline || '',
        additionalOwners: data.additionalOwners || undefined,
        businessStartDate: data.businessStartDate || '',
        yearEstablished: data.yearEstablished || '',
        employeeCount: data.employeeCount || '',
        
        // Warehouse Details
        ownershipType: data.ownershipType || 'owned',
        warehouseAddress: data.warehouseAddress || data.address || '',
        warehouseAddressLine2: data.warehouseAddressLine2 || data.addressLine2 || '',
        warehouseAddressLine3: data.warehouseAddressLine3 || data.addressLine3 || '',
        warehouseLandmark: data.warehouseLandmark || data.landmark || '',
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
        categoryProducts: data.categoryProducts || {},
        additionalCategories: data.additionalCategories || [],
        
        // Manufacturing Facilities
        enabledFacilities: data.enabledFacilities || {},
        facilityDetails: data.facilityDetails || {},
        
        // Certifications & Logistics
        selectedCertifications: data.selectedCertifications || [],
        certificationExpiryDates: data.certificationExpiryDates || {},
        otherCertifications: data.otherCertifications || [],
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

        // Login password — collected on Step 1 (CompanyDetails). Backend
        // bcrypts before persisting; admin approval later replaces it with
        // a generated temporary password emailed to the vendor.
        password: data.password || ''
      };
      
      // Prepare files
      const files: VendorFiles = {
        logo: data.logoFile,
        gstDocument: data.gstFile,
        panCardFile: data.panCardFile,
        typeCertFile: data.typeCertFile,
        // Contact photo flows through `mainContact.photo` (base64 data URI)
        // and is uploaded to Cloudinary server-side via `resolveBase64InValue`.
        // The previous `ownerPhoto: data.ownerPhotoFile` line was dead code —
        // `data.ownerPhotoFile` was never set anywhere in the form chain.
        // Factory images come in as a slot-keyed record from WarehouseDetails
        // (Change 11): { nameBoard: {file,url,name}, frontView: {...}, ... }.
        // Extract just the File objects keyed by slot ID — the upload path
        // tags each file with its slot in a side-channel body field so the
        // backend stores descriptive document names per slot.
        factoryImages: data.factoryImages
          ? Object.entries(data.factoryImages).reduce(
              (acc: Record<string, File>, [slotId, slotData]: [string, any]) => {
                if (slotData && slotData.file instanceof File) {
                  acc[slotId] = slotData.file;
                }
                return acc;
              },
              {},
            )
          : {},
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

      // Persist the JWT + vendor data the backend issued so the user can
      // log in (or be auto-redirected to the dashboard) without re-entering
      // credentials. Falls back gracefully when localStorage is unavailable
      // (SSR / private mode).
      if (typeof window !== 'undefined') {
        if (result?.token) {
          localStorage.setItem('vendorToken', result.token);
        }
        if (result?.vendor) {
          localStorage.setItem('vendorData', JSON.stringify(result.vendor));
        }
      }

      setIsSubmitted(true);

    } catch (error: any) {
      console.error('Registration failed:', error);
      // Prefer the most specific server-side message available. The axios
      // interceptor returns `{ message, status, data }`; older callers see
      // raw axios errors with `response.data`. Cover both shapes.
      const message =
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        error?.data?.error ||
        error?.data?.message ||
        error?.message ||
        'Registration failed. Please try again.';
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4 text-center animate-fade-in animate-in fade-in duration-500">
        <div className="w-20 h-20 rounded-full bg-success-50 border border-success-100 flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-10 h-10 text-success-500" />
        </div>
        <h1 className="text-headline-lg text-slate-900 mb-4 font-bold">Registration Submitted Successfully!</h1>
        <p className="text-lg text-slate-600 mb-8">
          Thank you for registering as a vendor. Our team will review your application
          and contact you within <strong className="text-slate-900 font-semibold">48 hours</strong>.
        </p>
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-6 text-left mb-8 shadow-sm">
          <h3 className="font-bold text-slate-900 mb-3">What happens next?</h3>
          <ul className="space-y-3 text-sm text-slate-600">
            <li className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-tertiary-50 border border-tertiary-100 text-tertiary-500 flex items-center justify-center text-xs font-semibold shrink-0 mt-0.5">1</span>
              Our team will verify your submitted documents and information
            </li>
            <li className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-tertiary-50 border border-tertiary-100 text-tertiary-500 flex items-center justify-center text-xs font-semibold shrink-0 mt-0.5">2</span>
              You may receive a call for additional verification if needed
            </li>
            <li className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-tertiary-50 border border-tertiary-100 text-tertiary-500 flex items-center justify-center text-xs font-semibold shrink-0 mt-0.5">3</span>
              Once approved, you&apos;ll receive access to your vendor dashboard
            </li>
          </ul>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/">
            <Button className="bg-slate-900 hover:bg-slate-800 text-white transition-colors h-11 px-8 text-base font-semibold flex items-center gap-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40">
              <Home className="w-5 h-5" />
              Return to Homepage
            </Button>
          </Link>
          <Link href="/vendor">
            <Button variant="outline" className="bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-colors h-11 px-8 text-base font-semibold rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/30">
              Vendor Login
            </Button>
          </Link>
        </div>
      </div>
    );
  }


  return (
    <div className="mx-auto max-w-5xl px-4 py-4 sm:px-6 sm:py-6 space-y-5 font-sans animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex items-center gap-3 pb-2">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-brand-50 text-brand-600 shrink-0">
          <CheckCircle2 className="w-5 h-5" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <h2 className="text-headline-md text-slate-900 leading-tight" style={{ textWrap: "balance" as any }}>
            Review & Submit
          </h2>
          <p className="text-sm text-slate-600 mt-0.5">
            Please review all information before submitting your application
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Shared read-only summary — same component the admin
            AddEditVendor flow uses on its review step, so both flows
            stay field-identical by construction. */}
        <VendorDataSummary
          data={data}
          onGoToStep={onGoToStep}
          categoryNameMap={categoryNameMap}
        />

        <div className='max-w-full space-y-4 pt-4'>
          {submitError && (
            <div className="bg-error-50 border border-error-200/50 rounded-lg p-4 animate-in fade-in duration-300">
              <div className="text-error-700 text-sm font-semibold">{submitError}</div>
            </div>
          )}

          {/* Accuracy Confirmation */}
          <div className="flex items-start gap-3 border border-slate-200 bg-slate-50/30 hover:bg-slate-50/60 transition-all duration-150 p-4 rounded-lg">
            <input
              id="confirmAccuracy"
              type="checkbox"
              checked={confirmChecked}
              onChange={(e) => setConfirmChecked(e.target.checked)}
              className="h-5 w-5 mt-[3px] shrink-0 cursor-pointer accent-brand-500 rounded border-slate-300 text-brand-500 focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:outline-none transition-colors"
            />
            <label htmlFor="confirmAccuracy" className="text-base text-slate-700 font-medium cursor-pointer leading-snug">
              I Confirm that all the information provided above is accurate and complete to the best of my knowledge. I understand that providing false information may result in rejection of my vendor application.
            </label>
          </div>

          {/* Terms & Conditions - Step by Step */}
          <div className="border border-slate-200 rounded-lg overflow-hidden shadow-card-rest hover:shadow-card-hover hover:border-slate-300 transition-all duration-150">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Terms &amp; Conditions</h3>
              <span className="text-xs font-semibold text-slate-500">
                {Object.values(termsConditions).filter(Boolean).length}/{Object.keys(termsConditions).length} accepted
              </span>
            </div>
            <div className="divide-y divide-slate-100">
              <div className="flex items-start gap-3 p-4 hover:bg-slate-50/30 transition-colors">
                <input
                  id="tc_acceptanceOfTerms"
                  type="checkbox"
                  checked={termsConditions.acceptanceOfTerms}
                  onChange={(e) => handleTermChange('acceptanceOfTerms', e.target.checked)}
                  className="h-5 w-5 mt-[3px] shrink-0 cursor-pointer accent-brand-500 rounded border-slate-300 text-brand-500 focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:outline-none transition-colors"
                />
                <label htmlFor="tc_acceptanceOfTerms" className="text-sm text-slate-600 cursor-pointer leading-snug">
                  <strong className="text-slate-900 font-semibold">Acceptance of Terms</strong> — By accessing and using this website, I accept and agree to be bound by the terms and provision of this agreement. If I do not agree to abide by the above, I will not use this service.
                </label>
              </div>
              <div className="flex items-start gap-3 p-4 hover:bg-slate-50/30 transition-colors">
                <input
                  id="tc_paymentTerms"
                  type="checkbox"
                  checked={termsConditions.paymentTerms}
                  onChange={(e) => handleTermChange('paymentTerms', e.target.checked)}
                  className="h-5 w-5 mt-[3px] shrink-0 cursor-pointer accent-brand-500 rounded border-slate-300 text-brand-500 focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:outline-none transition-colors"
                />
                <label htmlFor="tc_paymentTerms" className="text-sm text-slate-600 cursor-pointer leading-snug">
                  <strong className="text-slate-900 font-semibold">Payment Terms</strong> — I acknowledge that all prices are subject to change without notice, payment is due at the time of purchase, and all transactions are processed securely.
                </label>
              </div>
              <div className="flex items-start gap-3 p-4 hover:bg-slate-50/30 transition-colors">
                <input
                  id="tc_shippingDelivery"
                  type="checkbox"
                  checked={termsConditions.shippingDelivery}
                  onChange={(e) => handleTermChange('shippingDelivery', e.target.checked)}
                  className="h-5 w-5 mt-[3px] shrink-0 cursor-pointer accent-brand-500 rounded border-slate-300 text-brand-500 focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:outline-none transition-colors"
                />
                <label htmlFor="tc_shippingDelivery" className="text-sm text-slate-600 cursor-pointer leading-snug">
                  <strong className="text-slate-900 font-semibold">Shipping and Delivery</strong> — I understand that delivery times vary by location and shipping method, risk of loss passes upon delivery to the carrier, and the platform is not responsible for delays caused by shipping carriers.
                </label>
              </div>
              <div className="flex items-start gap-3 p-4 hover:bg-slate-50/30 transition-colors">
                <input
                  id="tc_returnsRefunds"
                  type="checkbox"
                  checked={termsConditions.returnsRefunds}
                  onChange={(e) => handleTermChange('returnsRefunds', e.target.checked)}
                  className="h-5 w-5 mt-[3px] shrink-0 cursor-pointer accent-brand-500 rounded border-slate-300 text-brand-500 focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:outline-none transition-colors"
                />
                <label htmlFor="tc_returnsRefunds" className="text-sm text-slate-600 cursor-pointer leading-snug">
                  <strong className="text-slate-900 font-semibold">Returns and Refunds</strong> — I agree to comply with the platform&apos;s returns policy for detailed information about returns, exchanges, and refunds.
                </label>
              </div>
              <div className="flex items-start gap-3 p-4 hover:bg-slate-50/30 transition-colors">
                <input
                  id="tc_limitationOfLiability"
                  type="checkbox"
                  checked={termsConditions.limitationOfLiability}
                  onChange={(e) => handleTermChange('limitationOfLiability', e.target.checked)}
                  className="h-5 w-5 mt-[3px] shrink-0 cursor-pointer accent-brand-500 rounded border-slate-300 text-brand-500 focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:outline-none transition-colors"
                />
                <label htmlFor="tc_limitationOfLiability" className="text-sm text-slate-600 cursor-pointer leading-snug">
                  <strong className="text-slate-900 font-semibold">Limitation of Liability</strong> — I acknowledge that in no event shall the company be liable for any direct, indirect, punitive, incidental, special, or consequential damages arising out of the use or performance of the website.
                </label>
              </div>
              <div className="flex items-start gap-3 p-4 hover:bg-slate-50/30 transition-colors">
                <input
                  id="tc_governingLaw"
                  type="checkbox"
                  checked={termsConditions.governingLaw}
                  onChange={(e) => handleTermChange('governingLaw', e.target.checked)}
                  className="h-5 w-5 mt-[3px] shrink-0 cursor-pointer accent-brand-500 rounded border-slate-300 text-brand-500 focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:outline-none transition-colors"
                />
                <label htmlFor="tc_governingLaw" className="text-sm text-slate-600 cursor-pointer leading-snug">
                  <strong className="text-slate-900 font-semibold">Governing Law</strong> — I agree that these terms and conditions are governed by and construed in accordance with applicable laws, and I submit to the exclusive jurisdiction of the courts as described in the full <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-brand-700 hover:text-brand-600 underline font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/30 rounded px-0.5">Terms of Service</a>.
                </label>
              </div>
            </div>
          </div>

          {/* Privacy Policy */}
          <div className="flex items-start gap-3 border border-slate-200 bg-slate-50/30 hover:bg-slate-50/60 transition-all duration-150 p-4 rounded-lg">
            <input
              id="agreePrivacy"
              type="checkbox"
              checked={privacyChecked}
              onChange={(e) => setPrivacyChecked(e.target.checked)}
              className="h-5 w-5 mt-[3px] shrink-0 cursor-pointer accent-brand-500 rounded border-slate-300 text-brand-500 focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:outline-none transition-colors"
            />
            <label htmlFor="agreePrivacy" className="text-base text-slate-700 font-medium cursor-pointer leading-snug">
              I Agree to the <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-brand-700 hover:text-brand-600 underline font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/30 rounded px-0.5">Privacy Policy</a>
            </label>
          </div>
        </div>  

        <div className="flex items-center justify-between pt-6 gap-3">
          <Button
            onClick={onPrev}
            className="inline-flex items-center gap-2 h-11 px-5 text-sm font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 hover:border-slate-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/30"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            Back
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!confirmChecked || !allTermsAccepted || !privacyChecked || isSubmitting}
            className="inline-flex items-center gap-2 h-11 px-8 text-sm font-semibold text-white bg-brand-500 hover:bg-brand-600 transition-colors shadow-sm shadow-brand-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Application'}
            {!isSubmitting && <Send className="w-4 h-4" aria-hidden="true" />}
          </Button>
        </div>
      </form>
    </div>
  );
}