'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { CheckCircle2, ArrowLeft, Send, AlertTriangle, X, XCircle, ChevronRight } from 'lucide-react';
import { Button } from '@/components/UI/Button';
import VendorService, { VendorRegistrationData, VendorFiles } from '@/services/vendorService';
import { categoryService } from '@/services/categoryService';
import VendorDataSummary from './VendorDataSummary';

interface ValidationError {
  field: string;
  label: string;
  reason: string;
  step?: number;
  stepLabel?: string;
}

const STEP_LABELS: Record<number, string> = {
  0: 'Company Details',
  1: 'Warehouse',
  2: 'Owner Profile',
  3: 'Vendor Type & Products',
  4: 'Manufacturing Facilities',
  5: 'Certifications & Quality Control',
  6: 'Contact & Trade Info',
};

// Maps a backend field name to a human-readable label and the step it lives on.
const FIELD_MAP: Record<string, { label: string; step: number }> = {
  companyName:   { label: 'Company Name',         step: 0 },
  email:         { label: 'Company Email',         step: 0 },
  phone:         { label: 'Company Phone',         step: 0 },
  businessType:  { label: 'Business Type',         step: 0 },
  gstNumber:     { label: 'GST Number',            step: 0 },
  address:       { label: 'Company Address',       step: 0 },
  city:          { label: 'City',                  step: 0 },
  state:         { label: 'State',                 step: 0 },
  zipCode:       { label: 'PIN Code',              step: 0 },
  password:      { label: 'Password',              step: 0 },
  ownerName:     { label: 'Owner Name',            step: 2 },
  ownerEmail:    { label: 'Owner Email',           step: 2 },
  ownerPhone:    { label: 'Owner Phone',           step: 2 },
  designation:   { label: 'Owner Designation',     step: 2 },
  warehouseAddress: { label: 'Warehouse Address',  step: 1 },
  vendorType:    { label: 'Vendor Type',           step: 3 },
  selectedCategories: { label: 'Product Categories', step: 3 },
};

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
  // All validation errors (agreement or server-side) shown in the modal popup.
  const [errorModal, setErrorModal] = useState<{
    title: string;
    subtitle?: string;
    errors: ValidationError[];
  } | null>(null);
  // Duplicate-registration warning surfaced as a modal popup (not an inline
  // alert). `field` lets the "Edit details" button jump back to the relevant
  // step so the user can correct the GST number / email.
  const [duplicateWarning, setDuplicateWarning] = useState<{ message: string; field?: string } | null>(null);
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

    // Build a list of missing agreement items for the modal
    if (!confirmChecked || !allTermsAccepted || !privacyChecked) {
      const agreementErrors: ValidationError[] = [];
      if (!confirmChecked) {
        agreementErrors.push({ field: 'confirmAccuracy', label: 'Accuracy Confirmation', reason: 'You must confirm the accuracy of your information' });
      }
      const termLabels: Record<string, string> = {
        acceptanceOfTerms: 'Acceptance of Terms',
        paymentTerms: 'Payment Terms',
        shippingDelivery: 'Shipping and Delivery',
        returnsRefunds: 'Returns and Refunds',
        limitationOfLiability: 'Limitation of Liability',
        governingLaw: 'Governing Law',
      };
      Object.entries(termsConditions).forEach(([key, checked]) => {
        if (!checked) agreementErrors.push({ field: key, label: termLabels[key] || key, reason: 'This term must be accepted before submitting' });
      });
      if (!privacyChecked) {
        agreementErrors.push({ field: 'agreePrivacy', label: 'Privacy Policy', reason: 'You must agree to the Privacy Policy' });
      }
      setErrorModal({
        title: 'Please Complete Required Agreements',
        subtitle: 'All terms and conditions must be accepted before submitting your application.',
        errors: agreementErrors,
      });
      return;
    }

    setIsSubmitting(true);
    setErrorModal(null);
    setDuplicateWarning(null);

    try {
      // Prepare form data
      const registrationData: VendorRegistrationData = {
        // Company Details
        businessType: data.businessType || '',
        companyName: data.companyName || '',
        gstNumber: data.gstNumber || '',
        companyIdNumber: data.companyIdNumber || '',
        iecCode: data.iecCode || '',
        panNumber: data.panNumber || '',
        aadhaarNumber: data.aadhaarNumber || '',
        email: data.email || '',
        email2: data.email2 || '',
        phone: data.phone || '',
        landlineNumber: data.landlineNumber || '',
        localLandlineStd: data.localLandlineStd || '',
        localLandlineNumber: data.localLandlineNumber || '',
        intlLandline: data.intlLandline || '',
        intlLandlineCountryCode: data.intlLandlineCountryCode || '',
        intlLandlineStd: data.intlLandlineStd || '',
        intlLandlineNumber: data.intlLandlineNumber || '',
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
        latitude: data.latitude || '',
        longitude: data.longitude || '',
        factoryOwnershipType: data.factoryOwnershipType || '',
        referralSource: data.referralSource || '',
        referralSourceDetail: data.referralSourceDetail || '',

        // Owner Profile
        ownerName: data.ownerName || '',
        designation: data.designation || '',
        ownerEmail: data.ownerEmail || '',
        ownerEmail2: data.ownerEmail2 || '',
        ownerPhone: data.ownerPhone || '',
        ownerPhone2: data.ownerPhone2 || '',
        ownerLandline: data.ownerLandline || '',
        ownerLocalLandlineStd: data.ownerLocalLandlineStd || '',
        ownerLocalLandlineNumber: data.ownerLocalLandlineNumber || '',
        ownerIntlLandline: data.ownerIntlLandline || '',
        ownerIntlLandlineCountryCode: data.ownerIntlLandlineCountryCode || '',
        ownerIntlLandlineStd: data.ownerIntlLandlineStd || '',
        ownerIntlLandlineNumber: data.ownerIntlLandlineNumber || '',
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
        warehouseLatitude: data.warehouseLatitude || data.latitude || '',
        warehouseLongitude: data.warehouseLongitude || data.longitude || '',
        // Which address a QC product inspection is geofenced against. Defaults to
        // FACTORY (also the value when the warehouse is the same as the legal address).
        productInspectionSite: data.productInspectionSite || 'FACTORY',

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
        factorySiteCapacity: (data as any).factorySiteCapacity || '',
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
        aadhaarFile: data.aadhaarFile,
        iecCertFile: data.iecCertFile,
        // Owner profile photo — captured in OwnerProfile (Owner Identity
        // section) as a File and uploaded to Cloudinary via the backend's
        // `ownerPhoto` multer field.
        ownerPhoto: data.ownerPhotoFile,
        // Contact photo flows through `mainContact.photo` (base64 data URI)
        // and is uploaded to Cloudinary server-side via `resolveBase64InValue`.
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
        // Factory site photos (CompanyDetails step) — only when sameAsWarehouse = false.
        factorySiteImages: !(data as any).sameAsWarehouse && (data as any).factorySiteImages
          ? Object.entries((data as any).factorySiteImages).reduce(
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

      // Normalise the response payload — axios interceptor returns `{ data }`;
      // raw axios errors carry `response.data`. Cover both shapes.
      const payload = error?.data || error?.response?.data || {};
      const code = payload.code;

      // Duplicate vendor (GST / email already registered) — dedicated popup.
      if (code === 'DUPLICATE_GST' || code === 'DUPLICATE_EMAIL') {
        const message = payload.error || payload.message || 'A vendor is already registered with these details.';
        const field = payload.field;
        setDuplicateWarning({ message, field });
        return;
      }

      // Structured validation errors returned by the backend.
      if (code === 'VALIDATION_ERROR' && Array.isArray(payload.errors) && payload.errors.length > 0) {
        const validationErrors: ValidationError[] = payload.errors.map((e: any) => {
          const mapped = FIELD_MAP[e.field];
          return {
            field: e.field,
            label: e.label || mapped?.label || e.field,
            reason: e.message || 'This field is required',
            step: e.step ?? mapped?.step,
            stepLabel: e.step != null ? STEP_LABELS[e.step] : mapped ? STEP_LABELS[mapped.step] : undefined,
          };
        });
        setErrorModal({
          title: 'Please Complete Required Fields',
          subtitle: 'The following fields must be filled in before your application can be submitted.',
          errors: validationErrors,
        });
        return;
      }

      // Any other server error — show a single-entry modal.
      const message =
        payload.error ||
        payload.message ||
        error?.message ||
        'Registration failed. Please try again.';
      setErrorModal({
        title: 'Submission Failed',
        subtitle: 'An error occurred while submitting your application.',
        errors: [{ field: 'server', label: 'Server Error', reason: message }],
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="fixed inset-0 z-[200] bg-white flex items-center justify-center animate-in fade-in duration-500 overflow-y-auto">
        <div className="max-w-2xl w-full px-6 py-16 text-center">
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
          <div className="flex justify-center">
            <Link href="/vendor">
              <Button variant="outline" className="bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-colors h-11 px-8 text-base font-semibold rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/30">
                Vendor Login
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }


  return (
    <div className="mx-auto max-w-5xl px-4 pt-4 sm:px-6 sm:pt-6 space-y-5 font-sans animate-in fade-in duration-300">
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

        <div className="flex items-center justify-between py-6 gap-3">
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

      {/* ── Validation / Agreement error modal ─────────────────────────── */}
      {errorModal && (
        <div
          className="fixed inset-0 flex items-start justify-center bg-slate-900/60 backdrop-blur-sm p-4 pt-16 animate-in fade-in duration-200 overflow-y-auto"
          style={{ zIndex: 'var(--z-modal-backdrop, 1000)' }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="error-modal-title"
          onClick={() => setErrorModal(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-lg w-full animate-in zoom-in-95 fade-in duration-200 mb-8"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start gap-4 p-6 border-b border-slate-100">
              <div className="w-12 h-12 rounded-full bg-red-50 border border-red-100 flex items-center justify-center shrink-0">
                <XCircle className="w-6 h-6 text-red-500" aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 id="error-modal-title" className="text-lg font-bold text-slate-900">
                  {errorModal.title}
                </h3>
                {errorModal.subtitle && (
                  <p className="text-sm text-slate-500 mt-1 leading-relaxed">{errorModal.subtitle}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setErrorModal(null)}
                className="text-slate-400 hover:text-slate-600 transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 rounded"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error list */}
            <div className="divide-y divide-slate-50 max-h-80 overflow-y-auto">
              {errorModal.errors.map((err, i) => (
                <div key={i} className="flex items-start gap-3 px-6 py-3.5 hover:bg-slate-50/60 transition-colors">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-400 mt-2 shrink-0" aria-hidden="true" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800">{err.label}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{err.reason}</p>
                  </div>
                  {err.step != null && (
                    <button
                      type="button"
                      onClick={() => { setErrorModal(null); onGoToStep(err.step!); }}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700 transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 rounded px-1"
                      title={`Go to ${err.stepLabel || STEP_LABELS[err.step] || 'step'}`}
                    >
                      {err.stepLabel || STEP_LABELS[err.step] || 'Go to step'}
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between gap-3 p-5 border-t border-slate-100">
              <p className="text-xs text-slate-400">{errorModal.errors.length} issue{errorModal.errors.length !== 1 ? 's' : ''} to resolve</p>
              <div className="flex gap-3">
                <Button
                  onClick={() => setErrorModal(null)}
                  className="inline-flex items-center justify-center h-9 px-5 text-sm font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 hover:border-slate-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/30"
                >
                  Close
                </Button>
                {errorModal.errors.some(e => e.step != null) && (
                  <Button
                    onClick={() => {
                      const firstStep = errorModal.errors.find(e => e.step != null)?.step;
                      setErrorModal(null);
                      if (firstStep != null) onGoToStep(firstStep);
                    }}
                    className="inline-flex items-center gap-1.5 justify-center h-9 px-5 text-sm font-semibold text-white bg-brand-500 hover:bg-brand-600 transition-colors shadow-sm shadow-brand-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
                  >
                    Go to First Issue
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Duplicate-registration warning popup ───────────────────────── */}
      {duplicateWarning && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          style={{ zIndex: 'var(--z-modal-backdrop, 1000)' }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="duplicate-warning-title"
          onClick={() => setDuplicateWarning(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 fade-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6 text-amber-500" aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 id="duplicate-warning-title" className="text-lg font-bold text-slate-900">
                  Vendor Already Registered
                </h3>
                <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">
                  {duplicateWarning.message}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDuplicateWarning(null)}
                className="text-slate-400 hover:text-slate-600 transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 rounded"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-end mt-6">
              <Button
                onClick={() => setDuplicateWarning(null)}
                className="inline-flex items-center justify-center h-10 px-5 text-sm font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 hover:border-slate-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/30"
              >
                Close
              </Button>
              <Button
                onClick={() => { setDuplicateWarning(null); onGoToStep(0); }}
                className="inline-flex items-center justify-center h-10 px-5 text-sm font-semibold text-white bg-brand-500 hover:bg-brand-600 transition-colors shadow-sm shadow-brand-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
              >
                Edit Details
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}