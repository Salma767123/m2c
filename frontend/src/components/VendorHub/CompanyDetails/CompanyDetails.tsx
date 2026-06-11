"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/UI/Button";
import { Building2, Globe, Mail, Phone, MapPin, Image, Home, Building, User, Users, Scale, HelpCircle, Loader2, Briefcase, ArrowRight } from "lucide-react";
import { ToggleButton, PhoneInput, parsePhone, CountrySelect, validatePhoneE164, PHONE_COUNTRY_CODES, AddressAutocomplete, AccordionSection } from "@/components/VendorHub/FormUI";
import { IconFile, IconFileText } from "@tabler/icons-react";
import { handleUpload, showSuccessToast, showErrorToast } from "@/lib/toast-utils";
import { lookupZipCode } from "@/lib/zipLookup";
import { scrollToFirstError } from "@/lib/formErrorScroll";

interface CompanyDetailsProps {
  onNext: () => void;
  onUpdateData: (data: any) => void;
  data: any;
}

interface FormData {
  businessType: string;
  companyName: string;
  gstNumber: string;
  /** Type-specific regulatory ID — CIN / Deed details / LLPIN. */
  companyIdNumber: string;
  /** IEC (Import Export Code) — shown for every business type, optional. */
  iecCode: string;
  /** PAN Number — required across all four supported business types. */
  panNumber: string;
  /** Aadhaar Number — required ONLY for the "Unregistered Vendor" type. */
  aadhaarNumber: string;
  email: string;
  email2: string;
  phone: string;
  landlineNumber: string;
  phoneNumber2: string;
  website: string;
  /** Address Line 1 — the primary street line. Kept under the `address`
   *  key for backwards compatibility with existing stored vendor data. */
  address: string;
  /** Address Line 2 — apartment / suite / floor (optional). */
  addressLine2: string;
  /** Address Line 3 — extra detail like building name (optional). */
  addressLine3: string;
  /** Landmark — nearby reference for delivery/locating (optional). */
  landmark: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  /** Ownership of the factory facility — "owned" | "rented" | "lease". */
  factoryOwnershipType: string;
  sameAsWarehouse: boolean;
  logo: string | null;
  logoFile: File | null;
  gstDocument: string | null;
  gstFile: File | null;
  /** PAN Card certificate upload — required for all four supported types. */
  panCardDocument: string | null;
  panCardFile: File | null;
  /** Type-specific business certificate (IEC / CIN / Deed / LLPIN). */
  typeCertDocument: string | null;
  typeCertFile: File | null;
  /** IEC Certificate upload — optional, available for every business type. */
  iecCertDocument: string | null;
  iecCertFile: File | null;
  /** Aadhaar card upload — required ONLY for "Unregistered Vendor". */
  aadhaarDocument: string | null;
  aadhaarFile: File | null;
  /** Per-business-type bucket of regulatory-ID values. The active
   *  type's value lives in `companyIdNumber`; this map remembers what
   *  the vendor previously typed for each OTHER type so toggling chips
   *  doesn't erase data. Not persisted to the backend — it's a
   *  form-runtime convenience that rides through VendorPanel state. */
  companyIdByType: Record<string, string>;
  /** Per-business-type bucket of the type-specific certificate (file +
   *  preview URL). Same role as `companyIdByType` but for the upload. */
  typeCertByType: Record<string, { file: File | null; document: string | null }>;
  // Warehouse fields (populated when sameAsWarehouse is true)
  warehouseAddress?: string;
  warehouseCity?: string;
  warehouseState?: string;
  warehouseZip?: string;
  warehouseCountry?: string;
}

const businessTypes = [
  { id: "proprietorship", label: "Proprietorship" },
  { id: "pvt-ltd", label: "Pvt Ltd" },
  { id: "partnership-firm", label: "Partnership Firm" },
  { id: "llp", label: "LLP" },
  { id: "unregistered", label: "Unregistered Vendor" },
];

// "Unregistered Vendor" — a special business type that has no statutory
// company registration. For these vendors GST, PAN and the type-specific
// certificate become OPTIONAL, and instead an Aadhaar number + Aadhaar card
// upload are REQUIRED for identity verification.
const UNREGISTERED_TYPE_ID = 'unregistered';

// Factory facility ownership — same shape and copy as WarehouseDetails so
// admins reading vendor profiles can compare warehouse vs factory ownership
// at a glance.
const factoryOwnershipTypes = [
  { id: "owned", label: "Owned" },
  { id: "rented", label: "Rented" },
  { id: "lease", label: "Lease" },
];
const FACTORY_OWNERSHIP_IDS = new Set(factoryOwnershipTypes.map((t) => t.id));

// Reserved IDs — anything else stored in businessType is treated as a
// user-provided "Others" value, so the chip + input stay populated when
// editing an existing draft.
const BUSINESS_TYPE_IDS = new Set(businessTypes.map((t) => t.id));
const OTHERS_PLACEHOLDER = 'others';

// Per-type regulatory ID field metadata. Drives the dynamic field shown
// next to the GST Number — IEC for proprietorships, CIN for Pvt Ltd, deed
// details for partnerships, LLPIN for LLPs. PAN is required across all
// four types so it lives outside this map.
type CompanyTypeId = 'proprietorship' | 'pvt-ltd' | 'partnership-firm' | 'llp';

interface CompanyTypeFieldMeta {
  idLabel: string;
  idPlaceholder: string;
  /** validator returns an error string, or '' if valid */
  validate: (v: string) => string;
  maxLength?: number;
  /** whether to auto-uppercase the input */
  uppercase?: boolean;
  /** Upload label for the type-specific certificate (Change 6) */
  certLabel: string;
  /** When true the regulatory ID is optional — no `*` marker and the
   *  validator only checks format when a value is supplied. */
  optionalId?: boolean;
}

const COMPANY_TYPE_META: Record<CompanyTypeId, CompanyTypeFieldMeta> = {
  'proprietorship': {
    idLabel: 'IEC Code',
    idPlaceholder: 'AAAAA1234A',
    maxLength: 10,
    uppercase: true,
    certLabel: 'IEC Certificate',
    optionalId: true,
    // IEC Code is optional for proprietorships — only validate the format
    // when the vendor actually enters a value.
    validate: (v) =>
      !v
        ? ''
        : !/^[A-Z0-9]{10}$/i.test(v)
        ? 'IEC Code must be exactly 10 alphanumeric characters'
        : '',
  },
  'pvt-ltd': {
    idLabel: 'CIN Number',
    idPlaceholder: 'U12345MH2020PTC123456',
    maxLength: 21,
    uppercase: true,
    certLabel: 'CIN Certificate',
    validate: (v) =>
      !v
        ? 'CIN Number is required'
        : !/^[LU][0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}$/i.test(v)
        ? 'CIN must be 21 characters in the format LXXXXX0000XX0000XXX000000'
        : '',
  },
  'partnership-firm': {
    idLabel: 'Partnership Deed Details',
    idPlaceholder: 'Deed registration number or details',
    maxLength: 120,
    certLabel: 'Partnership Deed Certificate',
    validate: (v) =>
      !v
        ? 'Partnership Deed details are required'
        : v.trim().length < 4
        ? 'Please enter at least 4 characters'
        : '',
  },
  'llp': {
    idLabel: 'LLPIN Number',
    idPlaceholder: 'AAA-1234',
    maxLength: 8,
    uppercase: true,
    certLabel: 'LLPIN Certificate',
    validate: (v) =>
      !v
        ? 'LLPIN Number is required'
        : !/^[A-Z]{3}-?[0-9]{4}$/i.test(v)
        ? 'LLPIN must be 3 letters + 4 digits (e.g. AAA-1234)'
        : '',
  },
};

// PAN: 5 letters + 4 digits + 1 letter (e.g. AAAAA0000A)
const PAN_PATTERN = /^[A-Z]{5}[0-9]{4}[A-Z]$/i;

// Aadhaar: exactly 12 digits.
const AADHAAR_PATTERN = /^\d{12}$/;

// Document upload constraints — shared by GST, PAN Card, and the
// type-specific business certificate. (Logo uses its own image-only
// constraint kept inline below.)
const ALLOWED_DOC_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const ALLOWED_DOC_LABEL = 'PDF, PNG, JPG, WEBP, or DOC';
const MAX_DOC_BYTES = 5 * 1024 * 1024;
const MAX_DOC_LABEL = '5,120 KB';

export default function CompanyDetails({
  onNext,
  onUpdateData,
  data,
}: CompanyDetailsProps) {
  const [formData, setFormData] = useState<FormData>({
    businessType: data.businessType || "",
    companyName: data.companyName || "",
    gstNumber: data.gstNumber || "",
    companyIdNumber: data.companyIdNumber || "",
    iecCode: data.iecCode || "",
    panNumber: data.panNumber || "",
    aadhaarNumber: data.aadhaarNumber || "",
    email: data.email || "",
    email2: data.email2 || "",
    phone: data.phone || "",
    landlineNumber: data.landlineNumber || "",
    phoneNumber2: data.phoneNumber2 || "",
    website: data.website || "",
    address: data.address || "",
    addressLine2: data.addressLine2 || "",
    addressLine3: data.addressLine3 || "",
    landmark: data.landmark || "",
    city: data.city || "",
    state: data.state || "",
    zipCode: data.zipCode || "",
    country: data.country || "India",
    factoryOwnershipType: data.factoryOwnershipType || "",
    sameAsWarehouse: data.sameAsWarehouse || false,
    // Preserve File refs across re-mounts / render-phase resyncs. The old
    // hardcoded `null` was nuking uploaded Files every time the user
    // navigated back to Step 1 (sidebar or edit-from-review), then the
    // next Save & Continue pushed `null` back to the parent — so the
    // backend received no req.files.* and the document was never saved.
    logo: data.logo || null,
    logoFile: data.logoFile || null,
    gstDocument: data.gstDocument || null,
    gstFile: data.gstFile || null,
    panCardDocument: data.panCardDocument || null,
    panCardFile: data.panCardFile || null,
    typeCertDocument: data.typeCertDocument || null,
    typeCertFile: data.typeCertFile || null,
    iecCertDocument: data.iecCertDocument || null,
    iecCertFile: data.iecCertFile || null,
    aadhaarDocument: data.aadhaarDocument || null,
    aadhaarFile: data.aadhaarFile || null,
    // Per-business-type stash for the type-specific regulatory ID +
    // certificate. The active type's values live in
    // `companyIdNumber` / `typeCertFile` / `typeCertDocument` (which is
    // what the backend persists). When the user switches Business Type,
    // we save the current values into the bucket keyed by the OLD type
    // and restore the bucket for the NEW type — so switching back later
    // brings the previously-entered values back instead of erasing them.
    // Seeded from any existing `*ByType` payload (carried through parent
    // state) and falls back to seeding the currently-active type's value
    // so legacy callers without the bucket still work.
    companyIdByType: data.companyIdByType || (
      data.businessType && data.companyIdNumber
        ? { [data.businessType]: data.companyIdNumber }
        : {}
    ),
    typeCertByType: data.typeCertByType || (
      data.businessType && (data.typeCertFile || data.typeCertDocument)
        ? { [data.businessType]: { file: data.typeCertFile || null, document: data.typeCertDocument || null } }
        : {}
    ),
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // ── Accordion Section State ────────────────────────────────────────
  // Tracks which of the 4 logical subsections is currently expanded.
  type SectionKey = 'profile' | 'contact' | 'address' | 'documents';
  const [activeSection, setActiveSection] = useState<SectionKey>('profile');

  // Maps validation error field names → their parent accordion section.
  // Used in handleNext to auto-expand the first failing section.
  const FIELD_SECTION_MAP: Record<string, SectionKey> = {
    businessType: 'profile',
    companyName: 'profile',
    gstNumber: 'profile',
    companyIdNumber: 'profile',
    iecCode: 'profile',
    panNumber: 'profile',
    aadhaarNumber: 'profile',
    email: 'contact',
    email2: 'contact',
    phone: 'contact',
    phoneNumber2: 'contact',
    landlineNumber: 'contact',
    address: 'address',
    city: 'address',
    state: 'address',
    zipCode: 'address',
    country: 'address',
    factoryOwnershipType: 'address',
    logo: 'documents',
    gstDocument: 'documents',
    panCardDocument: 'documents',
    typeCertDocument: 'documents',
    aadhaarDocument: 'documents',
  };

  // ── ZIP / postal-code auto-fill ─────────────────────────────────
  // When the user finishes typing a ZIP, we look it up via zippopotam.us
  // and pre-fill City + State. The user can still edit any field after.
  // AbortController cancels stale lookups when the ZIP changes again.
  const [zipLoading, setZipLoading] = useState(false);
  const zipAbortRef = useRef<AbortController | null>(null);

  const runZipLookup = useCallback(
    async (zip: string, countryName: string) => {
      const trimmed = zip.trim();
      if (!trimmed || !countryName) return;
      // Resolve country name → ISO-3166-1 alpha-2 (the API is per-country)
      const iso = PHONE_COUNTRY_CODES.find((c) => c.name === countryName)?.iso;
      if (!iso) return;

      zipAbortRef.current?.abort();
      const controller = new AbortController();
      zipAbortRef.current = controller;

      setZipLoading(true);
      try {
        const result = await lookupZipCode(trimmed, iso, controller.signal);
        if (!result) return;
        setFormData((prev) => ({
          ...prev,
          city: result.city || prev.city,
          state: result.state || prev.state,
        }));
        // Clear any prior errors on the fields we just populated
        setErrors((prev) => ({ ...prev, city: '', state: '' }));
        showSuccessToast(
          'Address auto-filled',
          `${result.city}${result.state ? ', ' + result.state : ''}`,
        );
      } finally {
        if (zipAbortRef.current === controller) {
          setZipLoading(false);
        }
      }
    },
    [],
  );

  // Cancel any in-flight ZIP lookup on unmount
  useEffect(() => {
    return () => zipAbortRef.current?.abort();
  }, []);

  // Note (was: real-time "Same as warehouse" sync) ─────────────────────
  // We previously pushed mirrored warehouse fields to VendorPanel on every
  // keystroke while the checkbox was ticked. That created a round-trip:
  //  - effect pushes partial data → VendorPanel merges → new `data` prop
  //    arrives → render-phase sync sees `data !== prevData` and rebuilds
  //    local state → since the pushed data only had warehouse fields,
  //    everything else (companyName, gstNumber, etc.) got reset to "".
  //
  // The fix is to let `handleNext` do the full copy at Continue time.
  // WarehouseDetails picks up the inherited address + ownership the
  // moment the user navigates to it — which is the only moment a vendor
  // sees that step anyway, since the sidebar gates locked-future steps.

  // Render-phase sync pattern to avoid post-render useEffect cycles (Vercel §5.1)
  const [prevData, setPrevData] = useState(data);
  if (data !== prevData) {
    setPrevData(data);
    setFormData({
      businessType: data.businessType || "",
      companyName: data.companyName || "",
      gstNumber: data.gstNumber || "",
      companyIdNumber: data.companyIdNumber || "",
      iecCode: data.iecCode || "",
      panNumber: data.panNumber || "",
      aadhaarNumber: data.aadhaarNumber || "",
      email: data.email || "",
      email2: data.email2 || "",
      phone: data.phone || "",
      landlineNumber: data.landlineNumber || "",
      phoneNumber2: data.phoneNumber2 || "",
      website: data.website || "",
      address: data.address || "",
      addressLine2: data.addressLine2 || "",
      addressLine3: data.addressLine3 || "",
      landmark: data.landmark || "",
      city: data.city || "",
      state: data.state || "",
      zipCode: data.zipCode || "",
      country: data.country || "India",
      factoryOwnershipType: data.factoryOwnershipType || "",
      sameAsWarehouse: data.sameAsWarehouse || false,
      // Same File-preservation as the init block above — render-phase sync
      // must not clobber Files held in parent state. (See comment on the
      // useState init for the exact bug this prevents.)
      logo: data.logo || null,
      logoFile: data.logoFile || null,
      gstDocument: data.gstDocument || null,
      gstFile: data.gstFile || null,
      panCardDocument: data.panCardDocument || null,
      panCardFile: data.panCardFile || null,
      typeCertDocument: data.typeCertDocument || null,
      typeCertFile: data.typeCertFile || null,
      iecCertDocument: data.iecCertDocument || null,
      iecCertFile: data.iecCertFile || null,
      aadhaarDocument: data.aadhaarDocument || null,
      aadhaarFile: data.aadhaarFile || null,
      // See useState init for the rationale on these per-type buckets.
      companyIdByType: data.companyIdByType || (
        data.businessType && data.companyIdNumber
          ? { [data.businessType]: data.companyIdNumber }
          : {}
      ),
      typeCertByType: data.typeCertByType || (
        data.businessType && (data.typeCertFile || data.typeCertDocument)
          ? { [data.businessType]: { file: data.typeCertFile || null, document: data.typeCertDocument || null } }
          : {}
      ),
    });
  }

  // Ref-based callback stability pattern (Vercel §8.2)
  const formDataRef = useRef(formData);
  formDataRef.current = formData;

  const handleInputChange = useCallback((field: string, value: any) => {
    setFormData((prev) => {
      // Switching business type changes the *meaning* of the type-specific ID
      // field AND certificate (IEC → CIN → deed → LLPIN). Instead of wiping
      // the prior values (the old behaviour, which lost data on every toggle),
      // we STASH the outgoing type's values in `companyIdByType` /
      // `typeCertByType` and RESTORE the incoming type's values from the same
      // buckets. PAN (both the number and the upload) is type-agnostic and
      // stays put outside the bucket. "Others" has no dynamic ID field, so we
      // skip both stashing and restoring for it.
      if (field === 'businessType' && value !== prev.businessType) {
        const oldType = prev.businessType;
        const newType = value;

        const nextCompanyIdByType = { ...prev.companyIdByType };
        const nextTypeCertByType = { ...prev.typeCertByType };

        // Stash current values under the OLD type — only when oldType is
        // one of the four canonical chip ids (proprietorship / pvt-ltd /
        // partnership-firm / llp). The 'others' placeholder and any custom
        // string typed under Others have no dynamic ID field, so there's
        // nothing meaningful to stash for them.
        if (oldType && BUSINESS_TYPE_IDS.has(oldType)) {
          nextCompanyIdByType[oldType] = prev.companyIdNumber || '';
          nextTypeCertByType[oldType] = {
            file: prev.typeCertFile,
            document: prev.typeCertDocument,
          };
        }

        // Restore from stash for the NEW type (empty if never visited).
        const restoredId = nextCompanyIdByType[newType] ?? '';
        const restoredCert = nextTypeCertByType[newType];

        return {
          ...prev,
          businessType: newType,
          companyIdNumber: restoredId,
          typeCertFile: restoredCert?.file ?? null,
          typeCertDocument: restoredCert?.document ?? null,
          companyIdByType: nextCompanyIdByType,
          typeCertByType: nextTypeCertByType,
        };
      }
      return { ...prev, [field]: value };
    });

    // ── Live validation for phone fields ────────────────────────────
    // Re-run libphonenumber-js on every keystroke and update errors
    // immediately. The error still only *renders* once the user has
    // blurred the field once (the JSX checks `touched[field]`), so they
    // aren't shouted at while typing the first few digits — but once
    // they've blurred, subsequent edits get live feedback as they
    // correct the number.
    if (field === 'phone' || field === 'phoneNumber2') {
      const labelMap: Record<string, string> = {
        phone: 'Phone Number 1',
        phoneNumber2: 'Phone Number 2',
      };
      const liveErr = value
        ? validatePhoneE164(value, {
            required: field === 'phone',
            label: labelMap[field],
            // Live-typing: don't flag "too short" — user is still typing.
            // Only TOO_LONG or invalid-prefix errors surface mid-keystroke.
            isLive: true,
          })
        : '';
      setErrors((prev) => {
        if (prev[field] === liveErr) return prev; // no-op when unchanged
        return { ...prev, [field]: liveErr };
      });
      return;
    }

    // Non-phone fields: clear error when user starts typing (existing behavior)
    setErrors((prev) => {
      if (prev[field] || field === 'businessType') {
        const updated = { ...prev, [field]: '' };
        if (field === 'businessType') {
          updated.companyIdNumber = '';
          updated.typeCertDocument = '';
          // Clear cross-type stale errors so switching to/from
          // "Unregistered Vendor" / "Others" doesn't leave irrelevant errors
          // showing on fields that are now hidden.
          updated.gstNumber = '';
          updated.gstDocument = '';
          updated.panNumber = '';
          updated.panCardDocument = '';
          updated.iecCode = '';
          updated.aadhaarNumber = '';
          updated.aadhaarDocument = '';
        }
        return updated;
      }
      return prev;
    });
  }, []);

  const handleBlur = useCallback((field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));

    // Per-field blur validation for phone numbers. Runs *only* when the
    // user has typed something — we don't want to surface "is required"
    // before they've had a chance to fill the field, but we do want
    // immediate feedback on format errors (e.g. typing 14 digits for a
    // Malaysian +60 number) without making them click Save first.
    // libphonenumber-js handles the per-country length/prefix rules.
    const currentFormData = formDataRef.current;
    let fieldError = '';
    if (field === 'phone' && currentFormData.phone) {
      fieldError = validatePhoneE164(currentFormData.phone, {
        required: true,
        label: 'Phone Number 1',
      });
    } else if (field === 'phoneNumber2' && currentFormData.phoneNumber2) {
      fieldError = validatePhoneE164(currentFormData.phoneNumber2, {
        required: false,
        label: 'Phone Number 2',
      });
    } else if (field === 'landlineNumber' && currentFormData.landlineNumber) {
      // Simple validation for landline: just digits, 8-15 characters
      const landline = currentFormData.landlineNumber.trim();
      if (landline && !/^\d{8,15}$/.test(landline)) {
        fieldError = 'Landline Number must be 8-15 digits';
      }
    }

    if (fieldError) {
      setErrors((prev) => ({ ...prev, [field]: fieldError }));
    } else if (['phone', 'phoneNumber2', 'landlineNumber'].includes(field)) {
      // Number became valid after editing — clear any stale error
      setErrors((prev) => {
        if (prev[field]) {
          return { ...prev, [field]: '' };
        }
        return prev;
      });
    }
  }, []);

  const [logoError, setLogoError] = useState<string | null>(null);
  const [gstError, setGstError] = useState<string | null>(null);

  const handleLogoFile = useCallback((file: File) => {
    const result = handleUpload(file, {
      label: 'Company logo',
      allowedTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml'],
      allowedLabel: 'PNG, JPG, WEBP, or SVG',
      maxBytes: 2 * 1024 * 1024,
      maxLabel: '2,048 KB',
    });
    if (!result.ok) {
      setLogoError(result.message);
      return;
    }
    const currentFormData = formDataRef.current;
    if (currentFormData.logoFile && typeof currentFormData.logo === 'string') {
      URL.revokeObjectURL(currentFormData.logo);
    }
    const url = URL.createObjectURL(file);
    setFormData((prev) => ({ ...prev, logoFile: file, logo: url }));
    setLogoError(null);
    setErrors((prev) => {
      if (prev.logo) {
        return { ...prev, logo: '' };
      }
      return prev;
    });
  }, []);

  const handleLogoChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleLogoFile(file);
  }, [handleLogoFile]);

  const handleLogoDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleLogoFile(file);
  }, [handleLogoFile]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  const handleRemoveLogo = useCallback(() => {
    const currentFormData = formDataRef.current;
    if (currentFormData.logoFile && typeof currentFormData.logo === "string") {
      URL.revokeObjectURL(currentFormData.logo);
    }
    setFormData((prev) => ({ ...prev, logoFile: null, logo: null }));
    setLogoError(null);
  }, []);

  const handleGstFile = useCallback((file: File) => {
    const result = handleUpload(file, {
      label: 'GST certificate',
      allowedTypes: ALLOWED_DOC_TYPES,
      allowedLabel: ALLOWED_DOC_LABEL,
      maxBytes: MAX_DOC_BYTES,
      maxLabel: MAX_DOC_LABEL,
    });
    if (!result.ok) {
      setGstError(result.message);
      return;
    }
    const currentFormData = formDataRef.current;
    if (currentFormData.gstFile && typeof currentFormData.gstDocument === 'string') {
      URL.revokeObjectURL(currentFormData.gstDocument);
    }
    const url = URL.createObjectURL(file);
    setFormData((prev) => ({ ...prev, gstFile: file, gstDocument: url }));
    setGstError(null);
    setErrors((prev) => {
      if (prev.gstDocument) {
        return { ...prev, gstDocument: '' };
      }
      return prev;
    });
  }, []);

  const handleGstChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleGstFile(file);
  }, [handleGstFile]);

  const handleGstDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleGstFile(file);
  }, [handleGstFile]);

  const handleRemoveGst = useCallback(() => {
    const currentFormData = formDataRef.current;
    if (currentFormData.gstFile && typeof currentFormData.gstDocument === "string") {
      URL.revokeObjectURL(currentFormData.gstDocument);
    }
    setFormData((prev) => ({ ...prev, gstFile: null, gstDocument: null }));
    setGstError(null);
  }, []);

  // ── PAN Card upload (mandatory across all business types) ───────────
  const [panCardError, setPanCardError] = useState<string | null>(null);

  const handlePanCardFile = useCallback((file: File) => {
    const result = handleUpload(file, {
      label: 'PAN card',
      allowedTypes: ALLOWED_DOC_TYPES,
      allowedLabel: ALLOWED_DOC_LABEL,
      maxBytes: MAX_DOC_BYTES,
      maxLabel: MAX_DOC_LABEL,
    });
    if (!result.ok) {
      setPanCardError(result.message);
      return;
    }
    const currentFormData = formDataRef.current;
    if (currentFormData.panCardFile && typeof currentFormData.panCardDocument === 'string') {
      URL.revokeObjectURL(currentFormData.panCardDocument);
    }
    const url = URL.createObjectURL(file);
    setFormData((prev) => ({ ...prev, panCardFile: file, panCardDocument: url }));
    setPanCardError(null);
    setErrors((prev) => {
      if (prev.panCardDocument) {
        return { ...prev, panCardDocument: '' };
      }
      return prev;
    });
  }, []);

  const handlePanCardChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handlePanCardFile(file);
  }, [handlePanCardFile]);

  const handlePanCardDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handlePanCardFile(file);
  }, [handlePanCardFile]);

  const handleRemovePanCard = useCallback(() => {
    const currentFormData = formDataRef.current;
    if (currentFormData.panCardFile && typeof currentFormData.panCardDocument === "string") {
      URL.revokeObjectURL(currentFormData.panCardDocument);
    }
    setFormData((prev) => ({ ...prev, panCardFile: null, panCardDocument: null }));
    setPanCardError(null);
  }, []);

  // ── Type-specific certificate upload (IEC / CIN / Deed / LLPIN) ─────
  // Only shown when a supported business type is selected; cleared on type
  // change (see handleInputChange above).
  const [typeCertError, setTypeCertError] = useState<string | null>(null);

  const handleTypeCertFile = useCallback((file: File) => {
    // Label tracks the currently selected business type so the toast says
    // "IEC certificate uploaded" / "CIN certificate uploaded" etc.
    const currentFormData = formDataRef.current;
    const meta = COMPANY_TYPE_META[currentFormData.businessType as CompanyTypeId];
    const label = meta ? meta.certLabel : 'Business certificate';
    const result = handleUpload(file, {
      label,
      allowedTypes: ALLOWED_DOC_TYPES,
      allowedLabel: ALLOWED_DOC_LABEL,
      maxBytes: MAX_DOC_BYTES,
      maxLabel: MAX_DOC_LABEL,
    });
    if (!result.ok) {
      setTypeCertError(result.message);
      return;
    }
    if (currentFormData.typeCertFile && typeof currentFormData.typeCertDocument === 'string') {
      URL.revokeObjectURL(currentFormData.typeCertDocument);
    }
    const url = URL.createObjectURL(file);
    setFormData((prev) => ({ ...prev, typeCertFile: file, typeCertDocument: url }));
    setTypeCertError(null);
    setErrors((prev) => {
      if (prev.typeCertDocument) {
        return { ...prev, typeCertDocument: '' };
      }
      return prev;
    });
  }, []);

  const handleTypeCertChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleTypeCertFile(file);
  }, [handleTypeCertFile]);

  const handleTypeCertDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleTypeCertFile(file);
  }, [handleTypeCertFile]);

  const handleRemoveTypeCert = useCallback(() => {
    const currentFormData = formDataRef.current;
    if (currentFormData.typeCertFile && typeof currentFormData.typeCertDocument === "string") {
      URL.revokeObjectURL(currentFormData.typeCertDocument);
    }
    setFormData((prev) => ({ ...prev, typeCertFile: null, typeCertDocument: null }));
    setTypeCertError(null);
  }, []);

  // ── IEC Certificate upload (OPTIONAL — available for every type) ───
  const [iecCertError, setIecCertError] = useState<string | null>(null);

  const handleIecCertFile = useCallback((file: File) => {
    const result = handleUpload(file, {
      label: 'IEC certificate',
      allowedTypes: ALLOWED_DOC_TYPES,
      allowedLabel: ALLOWED_DOC_LABEL,
      maxBytes: MAX_DOC_BYTES,
      maxLabel: MAX_DOC_LABEL,
    });
    if (!result.ok) {
      setIecCertError(result.message);
      return;
    }
    const currentFormData = formDataRef.current;
    if (currentFormData.iecCertFile && typeof currentFormData.iecCertDocument === 'string') {
      URL.revokeObjectURL(currentFormData.iecCertDocument);
    }
    const url = URL.createObjectURL(file);
    setFormData((prev) => ({ ...prev, iecCertFile: file, iecCertDocument: url }));
    setIecCertError(null);
  }, []);

  const handleIecCertChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleIecCertFile(file);
  }, [handleIecCertFile]);

  const handleIecCertDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleIecCertFile(file);
  }, [handleIecCertFile]);

  const handleRemoveIecCert = useCallback(() => {
    const currentFormData = formDataRef.current;
    if (currentFormData.iecCertFile && typeof currentFormData.iecCertDocument === "string") {
      URL.revokeObjectURL(currentFormData.iecCertDocument);
    }
    setFormData((prev) => ({ ...prev, iecCertFile: null, iecCertDocument: null }));
    setIecCertError(null);
  }, []);

  // ── Aadhaar card upload (Unregistered Vendor only) ─────────────────
  const [aadhaarError, setAadhaarError] = useState<string | null>(null);

  const handleAadhaarFile = useCallback((file: File) => {
    const result = handleUpload(file, {
      label: 'Aadhaar card',
      allowedTypes: ALLOWED_DOC_TYPES,
      allowedLabel: ALLOWED_DOC_LABEL,
      maxBytes: MAX_DOC_BYTES,
      maxLabel: MAX_DOC_LABEL,
    });
    if (!result.ok) {
      setAadhaarError(result.message);
      return;
    }
    const currentFormData = formDataRef.current;
    if (currentFormData.aadhaarFile && typeof currentFormData.aadhaarDocument === 'string') {
      URL.revokeObjectURL(currentFormData.aadhaarDocument);
    }
    const url = URL.createObjectURL(file);
    setFormData((prev) => ({ ...prev, aadhaarFile: file, aadhaarDocument: url }));
    setAadhaarError(null);
    setErrors((prev) => {
      if (prev.aadhaarDocument) {
        return { ...prev, aadhaarDocument: '' };
      }
      return prev;
    });
  }, []);

  const handleAadhaarChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleAadhaarFile(file);
  }, [handleAadhaarFile]);

  const handleAadhaarDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleAadhaarFile(file);
  }, [handleAadhaarFile]);

  const handleRemoveAadhaar = useCallback(() => {
    const currentFormData = formDataRef.current;
    if (currentFormData.aadhaarFile && typeof currentFormData.aadhaarDocument === "string") {
      URL.revokeObjectURL(currentFormData.aadhaarDocument);
    }
    setFormData((prev) => ({ ...prev, aadhaarFile: null, aadhaarDocument: null }));
    setAadhaarError(null);
  }, []);

  // Helper function to get file icon and color based on file type
  const getFileIcon = useCallback((file: File | null) => {
    if (!file) return { Icon: IconFileText, color: "text-gray-400" };

    const fileType = file.type.toLowerCase();
    const fileName = file.name.toLowerCase();

    if (fileType === "application/pdf" || fileName.endsWith(".pdf")) {
      return { Icon: IconFile, color: "text-red-500" };
    } else if (
      fileType === "application/msword" ||
      fileType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      fileName.endsWith(".doc") ||
      fileName.endsWith(".docx")
    ) {
      return { Icon: IconFile, color: "text-blue-500" };
    } else if (fileType.startsWith("image/")) {
      return { Icon: Image, color: "text-green-500" };
    }

    return { Icon: IconFile, color: "text-gray-400" };
  }, []);

  const handleNext = useCallback(() => {
    const currentFormData = formDataRef.current;
    // Validate required fields
    const newErrors: Record<string, string> = {};
    
    // "Unregistered Vendor" has no statutory registration, so GST, PAN and
    // the type-specific certificate are all OPTIONAL — instead the vendor
    // proves identity with an Aadhaar number + Aadhaar card.
    const isUnregistered = currentFormData.businessType === UNREGISTERED_TYPE_ID;

    if (!currentFormData.businessType) newErrors.businessType = 'Business Type is required';
    if (!currentFormData.companyName) newErrors.companyName = 'Company Name is required';
    if (isUnregistered) {
      // GST is optional for unregistered vendors — only validate format if
      // the vendor chose to enter one.
      if (currentFormData.gstNumber && !/^[A-Z0-9]{15}$/i.test(currentFormData.gstNumber)) {
        newErrors.gstNumber = 'GST Number must be exactly 15 alphanumeric characters';
      }
      // Aadhaar number is mandatory.
      if (!currentFormData.aadhaarNumber) {
        newErrors.aadhaarNumber = 'Aadhaar Number is required';
      } else if (!AADHAAR_PATTERN.test(currentFormData.aadhaarNumber)) {
        newErrors.aadhaarNumber = 'Aadhaar Number must be exactly 12 digits';
      }
    } else {
      if (!currentFormData.gstNumber) {
        newErrors.gstNumber = 'GST Number is required';
      } else if (!/^[A-Z0-9]{15}$/i.test(currentFormData.gstNumber)) {
        newErrors.gstNumber = 'GST Number must be exactly 15 alphanumeric characters';
      }
    }

    // Type-specific regulatory ID + PAN — only enforced when the user has
    // picked one of the four supported types. For "Other" / user-typed
    // values and "Unregistered Vendor" we don't know the regulatory shape,
    // so we skip these checks.
    const typeMeta = COMPANY_TYPE_META[currentFormData.businessType as CompanyTypeId];
    if (typeMeta) {
      // The type-specific regulatory ID (CIN / Deed / LLPIN) is only shown
      // and enforced for Pvt Ltd / Partnership / LLP. Proprietorship has no
      // separate company ID — it just uses the universal IEC Code below.
      if (currentFormData.businessType !== 'proprietorship') {
        const idErr = typeMeta.validate(currentFormData.companyIdNumber);
        if (idErr) newErrors.companyIdNumber = idErr;
      }

      if (!currentFormData.panNumber) {
        newErrors.panNumber = 'PAN Number is required';
      } else if (!PAN_PATTERN.test(currentFormData.panNumber)) {
        newErrors.panNumber = 'PAN must be 5 letters + 4 digits + 1 letter (e.g. AAAAA0000A)';
      }
    }
    // NOTE: PAN is NOT validated for custom "Others" / "Unregistered" types —
    // the PAN field is hidden for those, so validating a stale value left over
    // from a previously-selected type would surface a "Fix required" error on
    // a field the user can't see (and can't fix). Only the supported types
    // (handled inside the `if (typeMeta)` block above) validate PAN.

    // IEC Code (Import Export Code) — only rendered when a supported business
    // type is selected (inside the `typeMeta` block in the JSX). Skip the
    // format check when the field is hidden so a leftover value can't block
    // submission on an invisible field. Never mandatory.
    if (typeMeta && currentFormData.iecCode && !/^[A-Z0-9]{10}$/i.test(currentFormData.iecCode)) {
      newErrors.iecCode = 'IEC Code must be exactly 10 alphanumeric characters';
    }

    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!currentFormData.email) {
      newErrors.email = 'Email 1 is required';
    } else if (!emailRe.test(currentFormData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    // Email 2 is optional but must be valid when supplied, and not a
    // duplicate of Email 1.
    if (currentFormData.email2 && !emailRe.test(currentFormData.email2)) {
      newErrors.email2 = 'Please enter a valid email address';
    } else if (
      currentFormData.email2 &&
      currentFormData.email &&
      currentFormData.email2.trim().toLowerCase() === currentFormData.email.trim().toLowerCase()
    ) {
      newErrors.email2 = 'Email 2 must be different from Email 1';
    }

    // Phone numbers come from PhoneInput as full E.164-ish strings
    // ("+91" + 6–15 digits). The dial code is mandatory, so the national
    // portion alone must be 6–15 digits.
    // Phone validation uses libphonenumber-js for proper per-country rules
    // (each dial code has its own valid length / prefix shape — e.g. US is
    // exactly 10 digits, India is 10 starting 6-9, UK mobile is 10 starting
    // 7, etc.). The values are already in E.164 form because PhoneInput
    // stores "+<dial><national>".
    const phoneErr = validatePhoneE164(currentFormData.phone, {
      required: true,
      label: 'Phone Number 1',
    });
    if (phoneErr) newErrors.phone = phoneErr;

    const phone2Err = validatePhoneE164(currentFormData.phoneNumber2, {
      required: false,
      label: 'Phone Number 2',
    });
    if (phone2Err) newErrors.phoneNumber2 = phone2Err;

    // Simple validation for landline: just digits, 8-15 characters
    if (currentFormData.landlineNumber) {
      const landline = currentFormData.landlineNumber.trim();
      if (landline && !/^\d{8,15}$/.test(landline)) {
        newErrors.landlineNumber = 'Landline Number must be 8-15 digits';
      }
    }
    
    if (!currentFormData.address) newErrors.address = 'Address is required';
    if (!currentFormData.city) newErrors.city = 'City is required';
    if (!currentFormData.state) newErrors.state = 'State is required';
    if (!currentFormData.zipCode) newErrors.zipCode = 'ZIP Code is required';
    if (!currentFormData.country) newErrors.country = 'Country is required';
    if (!currentFormData.factoryOwnershipType) {
      newErrors.factoryOwnershipType = 'Please select your factory ownership type';
    } else if (!FACTORY_OWNERSHIP_IDS.has(currentFormData.factoryOwnershipType)) {
      newErrors.factoryOwnershipType = 'Invalid factory ownership type';
    }

    // ── Required uploads (Change 6) ──────────────────────────────────
    // Logo, GST certificate, and PAN card are mandatory for every vendor
    // regardless of business type. The type-specific certificate (IEC /
    // CIN / Deed / LLPIN) is only required when one of the four supported
    // types is selected — "Other" vendors aren't blocked on this.

    // For "Unregistered Vendor" the GST / PAN / type-cert uploads are all
    // optional; instead the Aadhaar card upload is mandatory.
    if (isUnregistered) {
      if (!currentFormData.aadhaarDocument) {
        newErrors.aadhaarDocument = 'Aadhaar Card upload is required';
      }
    } else {
      if (!currentFormData.gstDocument) {
        newErrors.gstDocument = 'GST Certificate upload is required';
      }
      if (!currentFormData.panCardDocument) {
        newErrors.panCardDocument = 'PAN Card upload is required';
      }
      // The IEC Certificate (Proprietorship) is optional; every other
      // type-specific certificate (CIN / Deed / LLPIN) stays mandatory.
      if (typeMeta && typeMeta.certLabel !== 'IEC Certificate' && !currentFormData.typeCertDocument) {
        newErrors.typeCertDocument = `${typeMeta.certLabel} upload is required`;
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      // Mark all fields as touched to show errors
      const allTouched: Record<string, boolean> = {};
      Object.keys(newErrors).forEach(key => {
        allTouched[key] = true;
      });
      setTouched(allTouched);

      // ── Auto-expand the first failing accordion section ──────────────
      // Priority order mirrors the FIELD_ORDER below. Find which section
      // the first error belongs to and expand it so the user sees it.
      const FIELD_ORDER = [
        'businessType',
        'companyName',
        'gstNumber',
        'companyIdNumber',
        'iecCode',
        'panNumber',
        'aadhaarNumber',
        'email',
        'email2',
        'phone',
        'phoneNumber2',
        'landlineNumber',
        'address',
        'city',
        'state',
        'zipCode',
        'country',
        'factoryOwnershipType',
        'logo',
        'gstDocument',
        'panCardDocument',
        'typeCertDocument',
        'aadhaarDocument',
      ];

      const firstErrorField = FIELD_ORDER.find(f => newErrors[f]);
      if (firstErrorField) {
        const targetSection = FIELD_SECTION_MAP[firstErrorField];
        if (targetSection) setActiveSection(targetSection);
      }

      const errorCount = Object.keys(newErrors).length;
      showErrorToast(
        errorCount === 1
          ? '1 field needs your attention'
          : `${errorCount} fields need your attention`,
        'Scroll down to the highlighted field and fix it to continue.',
      );

      requestAnimationFrame(() => {
        scrollToFirstError(newErrors, {
          fieldOrder: FIELD_ORDER,
          selectorMap: {
            businessType: '[data-field="businessType"]',
            factoryOwnershipType: '[data-field="factoryOwnershipType"]',
            country: '[data-field="country"]',
            logo: '[data-field="logo"]',
            gstDocument: '[data-field="gstDocument"]',
            panCardDocument: '[data-field="panCardDocument"]',
            typeCertDocument: '[data-field="typeCertDocument"]',
            aadhaarDocument: '[data-field="aadhaarDocument"]',
          },
        });
      });
      return;
    }

    // If "Same as warehouse address" is checked, propagate the full
    // address (including the new optional lines + landmark) *and* the
    // factory ownership type into the warehouse fields so WarehouseDetails
    // picks them up via its `data` prop. See also the real-time sync
    // effect below — handleNext is the "final commit"; the effect handles
    // the live updates while the user is still in this step.
    const updatedData: FormData & { [key: string]: any } = { ...currentFormData };

    if (currentFormData.sameAsWarehouse) {
      updatedData.warehouseAddress = currentFormData.address;
      updatedData.warehouseAddressLine2 = currentFormData.addressLine2;
      updatedData.warehouseAddressLine3 = currentFormData.addressLine3;
      updatedData.warehouseLandmark = currentFormData.landmark;
      updatedData.warehouseCity = currentFormData.city;
      updatedData.warehouseState = currentFormData.state;
      updatedData.warehouseZip = currentFormData.zipCode;
      updatedData.warehouseCountry = currentFormData.country;
      // WarehouseDetails reads `data.ownershipType` (the field is shared,
      // not prefixed). Mirror factory ownership to it.
      updatedData.ownershipType = currentFormData.factoryOwnershipType;
    }
    
    onUpdateData(updatedData);
    onNext();
  }, [onNext, onUpdateData]);

  // ── Section Completion Status Helpers ────────────────────────────
  // Returns 'complete' | 'partial' | 'empty' for each section.
  const typeMeta = COMPANY_TYPE_META[formData.businessType as CompanyTypeId];

  const getSectionStatus = (section: SectionKey): 'complete' | 'partial' | 'empty' => {
    if (section === 'profile') {
      const required = [
        formData.businessType,
        formData.companyName,
        formData.gstNumber,
        ...(typeMeta ? [formData.companyIdNumber, formData.panNumber] : []),
      ];
      const optional = [formData.website];
      const filled = required.filter(Boolean).length;
      if (filled === required.length) return 'complete';
      if (filled > 0 || optional.some(Boolean)) return 'partial';
      return 'empty';
    }
    if (section === 'contact') {
      const required = [formData.email, formData.phone];
      const optional = [formData.email2, formData.phoneNumber2, formData.landlineNumber];
      if (required.every(Boolean)) return 'complete';
      if (required.some(Boolean) || optional.some(Boolean)) return 'partial';
      return 'empty';
    }
    if (section === 'address') {
      const required = [formData.address, formData.city, formData.state, formData.zipCode, formData.country, formData.factoryOwnershipType];
      // `country` defaults to "India", so a filled country alone doesn't mean
      // the user has started this section — exclude it from the "in progress"
      // trigger so an untouched address reads as empty, not "In progress".
      const userEntered = [formData.address, formData.city, formData.state, formData.zipCode, formData.factoryOwnershipType];
      if (required.every(Boolean)) return 'complete';
      if (userEntered.some(Boolean)) return 'partial';
      return 'empty';
    }
    if (section === 'documents') {
      const required = [
        formData.gstDocument,
        formData.panCardDocument,
        // IEC Certificate (Proprietorship) is optional — don't gate the
        // section's "complete" status on it.
        ...(typeMeta && typeMeta.certLabel !== 'IEC Certificate' ? [formData.typeCertDocument] : []),
      ];
      const filled = required.filter(Boolean).length;
      if (filled === required.length) return 'complete';
      if (filled > 0 || formData.logo) return 'partial';
      return 'empty';
    }
    return 'empty';
  };

  // ── Accordion section props helper ─────────────────────────────────
  // Mirrors the pattern used by OwnerProfile / ContactTradeInfo: the
  // shared AccordionSection is imported from FormUI (module scope, so
  // its identity is stable across renders — defining it locally inside
  // CompanyDetails would unmount/remount every input on each keystroke
  // and lose focus). This helper just bundles the dynamic props.
  const sectionProps = (id: SectionKey) => ({
    id,
    isOpen: activeSection === id,
    status: getSectionStatus(id),
    hasErrors: Object.keys(errors).some(
      (k) => FIELD_SECTION_MAP[k] === id && Boolean(errors[k]),
    ),
    onActivate: () => setActiveSection(id),
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-4 sm:px-6 sm:py-6 space-y-5 font-sans animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Header */}
      <div className="flex items-center gap-3 pb-2">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-brand-50 text-brand-600 shrink-0">
          <Building className="w-5 h-5" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <h2 className="text-headline-md text-gray-900 leading-tight" style={{ textWrap: "balance" as any }}>
            Company Details
          </h2>
          <p className="text-sm text-gray-600 mt-0.5">
            Complete all sections below to save and continue your registration.
          </p>
        </div>
      </div>

      {/* ── Sections ───────────────────────────────────────────────────── */}
      <div className="space-y-3">

        {/* ═══════════════════════════════════════════════════════════════
            SECTION 1 — Business Profile
            Fields: Business Type, Company Name, GST, ID Number, PAN
            ═══════════════════════════════════════════════════════════════ */}
        <AccordionSection
          {...sectionProps('profile')}
          icon={<Briefcase className="w-4.5 h-4.5" aria-hidden="true" />}
          title="Business Profile"
          subtitle="Business type, company identity, and regulatory IDs"
        >
          {/* Business Type */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              Business Type <span className="text-brand-500 ml-0.5" aria-hidden="true">*</span>
            </label>
            <p className="text-xs text-slate-500 mb-3">
              Select the legal structure under which your business is registered
            </p>
            {(() => {
              const bt = formData.businessType;
              const isOthersTyped = !!bt && bt !== OTHERS_PLACEHOLDER && !BUSINESS_TYPE_IDS.has(bt);
              const othersSelected = bt === OTHERS_PLACEHOLDER || isOthersTyped;
              const othersValue = isOthersTyped ? bt : '';
              const invalid = !!(errors.businessType && touched.businessType);

              return (
                <>
                  <div className="flex flex-wrap gap-2.5" data-field="businessType">
                    {businessTypes.map((type) => {
                      const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
                        'proprietorship': User,
                        'pvt-ltd': Building2,
                        'partnership-firm': Users,
                        'llp': Scale,
                      };
                      return (
                        <ToggleButton
                          key={type.id}
                          selected={bt === type.id}
                          invalid={invalid && !bt}
                          icon={iconMap[type.id]}
                          onClick={() => handleInputChange("businessType", bt === type.id ? '' : type.id)}
                        >
                          {type.label}
                        </ToggleButton>
                      );
                    })}
                    <ToggleButton
                      selected={othersSelected}
                      invalid={invalid && !bt}
                      icon={HelpCircle}
                      onClick={() => {
                        handleInputChange("businessType", othersSelected ? '' : OTHERS_PLACEHOLDER);
                      }}
                    >
                      Others
                    </ToggleButton>
                  </div>

                  {othersSelected && (
                    <div className="mt-3 max-w-md">
                      <label className="block text-xs font-medium text-slate-600 mb-1.5">
                        Please specify your business type
                        <span className="text-brand-500 ml-1" aria-hidden="true">*</span>
                      </label>
                      <input
                        type="text"
                        name="businessTypeOther"
                        value={othersValue}
                        onChange={(e) => {
                          const v = e.target.value;
                          handleInputChange("businessType", v.trim() === '' ? OTHERS_PLACEHOLDER : v);
                        }}
                        onBlur={() => handleBlur("businessType")}
                        placeholder="e.g. Cooperative, Trust, Section 8 company…"
                        className={`w-full text-sm font-medium text-slate-900 placeholder:text-slate-400 px-4 py-2.5 border rounded-lg bg-white transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:border-brand-500 ${
                          invalid ? 'border-red-400 bg-red-50' : 'border-slate-300 hover:border-slate-400'
                        }`}
                      />
                    </div>
                  )}

                  {invalid && (
                    <p className="text-red-600 text-xs mt-2 font-medium">{errors.businessType}</p>
                  )}
                </>
              );
            })()}
          </div>

          {/* Company Name + GST Number — 2-col grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Company Name <span className="text-brand-500" aria-hidden="true">*</span>
              </label>
              <input
                type="text"
                name="companyName"
                value={formData.companyName}
                onChange={(e) => handleInputChange("companyName", e.target.value)}
                onBlur={() => handleBlur("companyName")}
                className={`w-full text-sm font-medium px-4 py-2.5 border rounded-lg transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:border-brand-500 ${
                  errors.companyName && touched.companyName ? 'border-red-500 bg-red-50' : 'border-slate-300 hover:border-slate-400'
                }`}
                placeholder="e.g. Acme Textiles Pvt. Ltd."
              />
              {errors.companyName && touched.companyName && (
                <p className="text-red-500 text-xs mt-1">{errors.companyName}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                GST Number{' '}
                {formData.businessType === UNREGISTERED_TYPE_ID ? (
                  <span className="text-slate-400 text-xs font-normal">(Optional)</span>
                ) : (
                  <span className="text-brand-500" aria-hidden="true">*</span>
                )}
              </label>
              <input
                type="text"
                name="gstNumber"
                value={formData.gstNumber}
                onChange={(e) => handleInputChange("gstNumber", e.target.value.toUpperCase())}
                onBlur={() => handleBlur("gstNumber")}
                maxLength={15}
                className={`w-full text-sm font-medium px-4 py-2.5 border rounded-lg transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:border-brand-500 ${
                  errors.gstNumber && touched.gstNumber ? 'border-red-500 bg-red-50' : 'border-slate-300 hover:border-slate-400'
                }`}
                placeholder="22AAAAA0000A1Z5"
                style={{ fontVariantNumeric: 'tabular-nums', letterSpacing: '0.04em' }}
              />
              {errors.gstNumber && touched.gstNumber && (
                <p className="text-red-500 text-xs mt-1">{errors.gstNumber}</p>
              )}
            </div>
          </div>

          {/* Aadhaar Number — only for "Unregistered Vendor". GST/PAN are not
              required for these vendors, so Aadhaar is the identity proof. */}
          {formData.businessType === UNREGISTERED_TYPE_ID && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-lg bg-brand-50/40 border border-brand-100">
              <div>
                <label htmlFor="aadhaarNumber" className="block text-sm font-semibold text-slate-700 mb-1">
                  Aadhaar Number <span className="text-brand-500" aria-hidden="true">*</span>
                </label>
                <input
                  id="aadhaarNumber"
                  type="text"
                  name="aadhaarNumber"
                  inputMode="numeric"
                  value={formData.aadhaarNumber}
                  onChange={(e) => handleInputChange("aadhaarNumber", e.target.value.replace(/\D/g, '').slice(0, 12))}
                  onBlur={() => handleBlur("aadhaarNumber")}
                  maxLength={12}
                  spellCheck={false}
                  autoComplete="off"
                  aria-describedby={errors.aadhaarNumber && touched.aadhaarNumber ? 'aadhaarNumber-error' : undefined}
                  aria-invalid={!!(errors.aadhaarNumber && touched.aadhaarNumber)}
                  className={`w-full text-sm font-medium px-4 py-2.5 border rounded-lg transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:border-brand-500 ${
                    errors.aadhaarNumber && touched.aadhaarNumber ? 'border-red-500 bg-red-50' : 'border-slate-300 hover:border-slate-400'
                  }`}
                  placeholder="123412341234"
                  style={{ fontVariantNumeric: 'tabular-nums', letterSpacing: '0.04em' }}
                />
                {errors.aadhaarNumber && touched.aadhaarNumber && (
                  <p id="aadhaarNumber-error" className="text-red-500 text-xs mt-1" role="alert">{errors.aadhaarNumber}</p>
                )}
              </div>
            </div>
          )}

          {/* Dynamic Regulatory Fields — only shown when a supported type is selected */}
          {(() => {
            const meta = COMPANY_TYPE_META[formData.businessType as CompanyTypeId];
            if (!meta) return null;
            const idErr = !!(errors.companyIdNumber && touched.companyIdNumber);
            const panErr = !!(errors.panNumber && touched.panNumber);
            const iecErr = !!(errors.iecCode && touched.iecCode);
            // Proprietorships have no separate company registration ID — they
            // only use the universal IEC Code field.
            const showCompanyId = formData.businessType !== 'proprietorship';
            return (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-lg bg-brand-50/40 border border-brand-100">
                {/* IEC Code (Import Export Code) — shown for every business
                    type and never mandatory. */}
                <div>
                  <label htmlFor="iecCode" className="block text-sm font-semibold text-slate-700 mb-1">
                    IEC Code
                  </label>
                  <input
                    id="iecCode"
                    type="text"
                    name="iecCode"
                    value={formData.iecCode}
                    onChange={(e) => handleInputChange('iecCode', e.target.value.toUpperCase())}
                    onBlur={() => handleBlur('iecCode')}
                    maxLength={10}
                    spellCheck={false}
                    autoComplete="off"
                    aria-describedby={iecErr ? 'iecCode-error' : undefined}
                    aria-invalid={iecErr}
                    className={`w-full text-sm font-medium px-4 py-2.5 border rounded-lg transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:border-brand-500 ${
                      iecErr ? 'border-red-500 bg-red-50' : 'border-slate-300 hover:border-slate-400'
                    }`}
                    placeholder="AAAAA1234A"
                    style={{ fontVariantNumeric: 'tabular-nums', letterSpacing: '0.04em' }}
                  />
                  {iecErr && (
                    <p id="iecCode-error" className="text-red-500 text-xs mt-1" role="alert">{errors.iecCode}</p>
                  )}
                </div>

                {/* Type-specific regulatory ID (CIN / Deed / LLPIN) — not
                    shown for proprietorships. */}
                {showCompanyId && (
                <div>
                  <label htmlFor="companyIdNumber" className="block text-sm font-semibold text-slate-700 mb-1">
                    {meta.idLabel} <span className="text-brand-500" aria-hidden="true">*</span>
                  </label>
                  <input
                    id="companyIdNumber"
                    type="text"
                    name="companyIdNumber"
                    value={formData.companyIdNumber}
                    onChange={(e) => {
                      const v = meta.uppercase ? e.target.value.toUpperCase() : e.target.value;
                      handleInputChange('companyIdNumber', v);
                    }}
                    onBlur={() => handleBlur('companyIdNumber')}
                    maxLength={meta.maxLength}
                    spellCheck={false}
                    autoComplete="off"
                    aria-describedby={idErr ? 'companyIdNumber-error' : undefined}
                    aria-invalid={idErr}
                    className={`w-full text-sm font-medium px-4 py-2.5 border rounded-lg transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:border-brand-500 ${
                      idErr ? 'border-red-500 bg-red-50' : 'border-slate-300 hover:border-slate-400'
                    }`}
                    placeholder={meta.idPlaceholder}
                    style={meta.uppercase ? { fontVariantNumeric: 'tabular-nums', letterSpacing: '0.04em' } : undefined}
                  />
                  {idErr && (
                    <p id="companyIdNumber-error" className="text-red-500 text-xs mt-1" role="alert">{errors.companyIdNumber}</p>
                  )}
                </div>
                )}

                {/* PAN Number — constant across all 4 types */}
                <div>
                  <label htmlFor="panNumber" className="block text-sm font-semibold text-slate-700 mb-1">
                    Company PAN Number <span className="text-brand-500" aria-hidden="true">*</span>
                  </label>
                  <input
                    id="panNumber"
                    type="text"
                    name="panNumber"
                    value={formData.panNumber}
                    onChange={(e) => handleInputChange('panNumber', e.target.value.toUpperCase())}
                    onBlur={() => handleBlur('panNumber')}
                    maxLength={10}
                    spellCheck={false}
                    autoComplete="off"
                    aria-describedby={panErr ? 'panNumber-error' : undefined}
                    aria-invalid={panErr}
                    className={`w-full text-sm font-medium px-4 py-2.5 border rounded-lg transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:border-brand-500 ${
                      panErr ? 'border-red-500 bg-red-50' : 'border-slate-300 hover:border-slate-400'
                    }`}
                    placeholder="AAAAA0000A"
                    style={{ fontVariantNumeric: 'tabular-nums', letterSpacing: '0.04em' }}
                  />
                  {panErr && (
                    <p id="panNumber-error" className="text-red-500 text-xs mt-1" role="alert">{errors.panNumber}</p>
                  )}
                </div>
              </div>
            );
          })()}
        </AccordionSection>

        {/* ═══════════════════════════════════════════════════════════════
            SECTION 2 — Contact & Communication
            Fields: Email 1/2, Phone 1/2, Landline, Website
            ═══════════════════════════════════════════════════════════════ */}
        <AccordionSection
          {...sectionProps('contact')}
          icon={<Mail className="w-4.5 h-4.5" aria-hidden="true" />}
          title="Contact & Communication"
          subtitle="Business emails, phone numbers, landline, and website"
        >
          {/* Email Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>Business Email</span>
                <span className="text-brand-500" aria-hidden="true">*</span>
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                onBlur={() => handleBlur("email")}
                className={`w-full text-sm font-medium px-4 py-2.5 border rounded-lg transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:border-brand-500 ${
                  errors.email && touched.email ? 'border-red-500 bg-red-50' : 'border-slate-300 hover:border-slate-400'
                }`}
                placeholder="company@example.com"
                autoComplete="email"
              />
              {errors.email && touched.email && (
                <p className="text-red-500 text-xs mt-1">{errors.email}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>Secondary Email</span>
                <span className="text-slate-400 text-xs font-normal">(Optional)</span>
              </label>
              <input
                type="email"
                name="email2"
                value={formData.email2}
                onChange={(e) => handleInputChange("email2", e.target.value)}
                onBlur={() => handleBlur("email2")}
                className={`w-full text-sm font-medium px-4 py-2.5 border rounded-lg transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:border-brand-500 ${
                  errors.email2 && touched.email2 ? 'border-red-500 bg-red-50' : 'border-slate-300 hover:border-slate-400'
                }`}
                placeholder="alternate@example.com"
                autoComplete="off"
              />
              {errors.email2 && touched.email2 && (
                <p className="text-red-500 text-xs mt-1">{errors.email2}</p>
              )}
            </div>
          </div>

          {/* Phone Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>Primary Phone</span>
                <span className="text-brand-500" aria-hidden="true">*</span>
              </label>
              <PhoneInput
                name="phone"
                value={formData.phone}
                onChange={(v) => handleInputChange("phone", v)}
                onBlur={() => handleBlur("phone")}
                invalid={!!(errors.phone && touched.phone)}
                placeholder="9876543210"
                autoComplete="tel"
              />
              {errors.phone && touched.phone && (
                <p className="text-red-500 text-xs mt-1">{errors.phone}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>Secondary Phone</span>
                <span className="text-slate-400 text-xs font-normal">(Optional)</span>
              </label>
              <PhoneInput
                name="phoneNumber2"
                value={formData.phoneNumber2}
                onChange={(v) => handleInputChange("phoneNumber2", v)}
                onBlur={() => handleBlur("phoneNumber2")}
                invalid={!!(errors.phoneNumber2 && touched.phoneNumber2)}
                placeholder="9876543210"
                autoComplete="off"
              />
              {errors.phoneNumber2 && touched.phoneNumber2 && (
                <p className="text-red-500 text-xs mt-1">{errors.phoneNumber2}</p>
              )}
            </div>
          </div>

          {/* Landline + Website Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>Landline Number</span>
                <span className="text-slate-400 text-xs font-normal">(Optional)</span>
              </label>
              <input
                type="tel"
                name="landlineNumber"
                value={formData.landlineNumber}
                onChange={(e) => handleInputChange("landlineNumber", e.target.value)}
                onBlur={() => handleBlur("landlineNumber")}
                className={[
                  'w-full text-sm font-medium px-4 py-2.5 border rounded-lg transition-colors duration-200 outline-none',
                  errors.landlineNumber && touched.landlineNumber
                    ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-500/25'
                    : 'border-slate-300 hover:border-slate-400 focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500'
                ].join(' ')}
                placeholder="2228175000"
                autoComplete="tel"
              />
              {errors.landlineNumber && touched.landlineNumber && (
                <p className="text-red-500 text-xs mt-1">{errors.landlineNumber}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>Website</span>
                <span className="text-slate-400 text-xs font-normal">(Optional)</span>
              </label>
              <input
                type="url"
                name="website"
                value={formData.website}
                onChange={(e) => handleInputChange("website", e.target.value)}
                className="w-full text-sm font-medium px-4 py-2.5 border border-slate-300 hover:border-slate-400 rounded-lg transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:border-brand-500"
                placeholder="www.yourcompany.com"
                autoComplete="url"
              />
            </div>
          </div>
        </AccordionSection>

        {/* ═══════════════════════════════════════════════════════════════
            SECTION 3 — Legal Address & Site
            Fields: Address 1/2/3, Landmark, City, State, ZIP, Country,
                    Factory Ownership, Same-as-Warehouse checkbox
            ═══════════════════════════════════════════════════════════════ */}
        <AccordionSection
          {...sectionProps('address')}
          icon={<MapPin className="w-4.5 h-4.5" aria-hidden="true" />}
          title="Legal Address & Factory Site"
          subtitle="Registered address, location details, and facility ownership"
        >
          {/* Factory Ownership - MOVED TO FIRST */}
          <div>
            <label id="factoryOwnership-label" className="block text-sm font-semibold text-slate-700 mb-1">
              Factory Ownership{' '}
              <span className="text-brand-500" aria-hidden="true">*</span>
            </label>
            <p className="text-xs text-slate-500 mb-3">
              Select the type of ownership for your factory facility.
            </p>
            <div
              className="flex flex-wrap gap-2"
              role="radiogroup"
              data-field="factoryOwnershipType"
              aria-labelledby="factoryOwnership-label"
              aria-describedby={
                errors.factoryOwnershipType && touched.factoryOwnershipType
                  ? 'factoryOwnership-error'
                  : undefined
              }
            >
              {factoryOwnershipTypes.map((type) => {
                const selected = formData.factoryOwnershipType === type.id;
                const invalid =
                  !!(errors.factoryOwnershipType && touched.factoryOwnershipType) &&
                  !formData.factoryOwnershipType;
                return (
                  <ToggleButton
                    key={type.id}
                    selected={selected}
                    invalid={invalid}
                    onClick={() => {
                      handleInputChange('factoryOwnershipType', selected ? '' : type.id);
                      handleBlur('factoryOwnershipType');
                    }}
                  >
                    {type.label}
                  </ToggleButton>
                );
              })}
            </div>
            {errors.factoryOwnershipType && touched.factoryOwnershipType && (
              <p id="factoryOwnership-error" className="text-red-500 text-xs mt-2" role="alert">
                {errors.factoryOwnershipType}
              </p>
            )}
          </div>

          {/* Location search shortcut */}
          <div>
            <label htmlFor="addressSearch" className="block text-sm font-semibold text-slate-700 mb-1">
              Search Location{' '}
              <span className="text-slate-400 text-xs font-normal">(optional shortcut)</span>
            </label>
            <AddressAutocomplete
              id="addressSearch"
              onSelect={(s) => {
                setFormData((prev) => ({
                  ...prev,
                  address: s.line1 || prev.address,
                  city: s.city || prev.city,
                  state: s.state || prev.state,
                  zipCode: s.postcode || prev.zipCode,
                  country: s.country || prev.country,
                }));
                setErrors((prev) => ({
                  ...prev,
                  address: '',
                  city: '',
                  state: '',
                  zipCode: '',
                  country: '',
                }));
                showSuccessToast('Address auto-filled', s.displayName);
              }}
            />
          </div>

          {/* Address Line 1 + Line 2 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="addressLine1" className="block text-sm font-semibold text-slate-700 mb-1">
                Address Line 1 <span className="text-brand-500" aria-hidden="true">*</span>
              </label>
              <input
                id="addressLine1"
                type="text"
                name="address"
                value={formData.address}
                onChange={(e) => handleInputChange("address", e.target.value)}
                onBlur={() => handleBlur("address")}
                autoComplete="address-line1"
                className={`w-full text-sm font-medium px-4 py-2.5 border rounded-lg transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:border-brand-500 ${
                  errors.address && touched.address ? 'border-red-500 bg-red-50' : 'border-slate-300 hover:border-slate-400'
                }`}
                placeholder="House / building / street"
              />
              {errors.address && touched.address && (
                <p className="text-red-500 text-xs mt-1" role="alert">{errors.address}</p>
              )}
            </div>

            <div>
              <label htmlFor="addressLine2" className="block text-sm font-semibold text-slate-700 mb-1">
                Address Line 2 <span className="text-slate-400 text-xs font-normal">(optional)</span>
              </label>
              <input
                id="addressLine2"
                type="text"
                name="addressLine2"
                value={formData.addressLine2}
                onChange={(e) => handleInputChange("addressLine2", e.target.value)}
                autoComplete="address-line2"
                className="w-full text-sm font-medium px-4 py-2.5 border border-slate-300 hover:border-slate-400 rounded-lg transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:border-brand-500"
                placeholder="Apartment, suite, floor"
              />
            </div>
          </div>

          {/* Address Line 3 + Landmark */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="addressLine3" className="block text-sm font-semibold text-slate-700 mb-1">
                Address Line 3 <span className="text-slate-400 text-xs font-normal">(optional)</span>
              </label>
              <input
                id="addressLine3"
                type="text"
                name="addressLine3"
                value={formData.addressLine3}
                onChange={(e) => handleInputChange("addressLine3", e.target.value)}
                autoComplete="address-line3"
                className="w-full text-sm font-medium px-4 py-2.5 border border-slate-300 hover:border-slate-400 rounded-lg transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:border-brand-500"
                placeholder="Building name, block, complex"
              />
            </div>

            <div>
              <label htmlFor="landmark" className="block text-sm font-semibold text-slate-700 mb-1">
                Landmark <span className="text-slate-400 text-xs font-normal">(optional)</span>
              </label>
              <input
                id="landmark"
                type="text"
                name="landmark"
                value={formData.landmark}
                onChange={(e) => handleInputChange("landmark", e.target.value)}
                autoComplete="off"
                className="w-full text-sm font-medium px-4 py-2.5 border border-slate-300 hover:border-slate-400 rounded-lg transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:border-brand-500"
                placeholder="e.g. Near Central Mall, opposite Park View School"
              />
            </div>
          </div>

          {/* City + State / Province (Row 1) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                City <span className="text-brand-500" aria-hidden="true">*</span>
              </label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={(e) => handleInputChange("city", e.target.value)}
                onBlur={() => handleBlur("city")}
                className={`w-full text-sm font-medium px-4 py-2.5 border rounded-lg transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:border-brand-500 ${
                  errors.city && touched.city ? 'border-red-500 bg-red-50' : 'border-slate-300 hover:border-slate-400'
                }`}
                placeholder="City"
              />
              {errors.city && touched.city && (
                <p className="text-red-500 text-xs mt-1">{errors.city}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                State / Province <span className="text-brand-500" aria-hidden="true">*</span>
              </label>
              <input
                type="text"
                name="state"
                value={formData.state}
                onChange={(e) => handleInputChange("state", e.target.value)}
                onBlur={() => handleBlur("state")}
                className={`w-full text-sm font-medium px-4 py-2.5 border rounded-lg transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:border-brand-500 ${
                  errors.state && touched.state ? 'border-red-500 bg-red-50' : 'border-slate-300 hover:border-slate-400'
                }`}
                placeholder="State"
              />
              {errors.state && touched.state && (
                <p className="text-red-500 text-xs mt-1">{errors.state}</p>
              )}
            </div>
          </div>

          {/* Country + ZIP / Postal Code (Row 2) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="company-country-select" className="block text-sm font-semibold text-slate-700 mb-1">
                Country <span className="text-brand-500" aria-hidden="true">*</span>
              </label>
              <div data-field="country">
                <CountrySelect
                  id="company-country-select"
                  value={formData.country}
                  onChange={(name) => handleInputChange('country', name)}
                  onBlur={() => handleBlur('country')}
                  invalid={!!(errors.country && touched.country)}
                  ariaDescribedBy={errors.country && touched.country ? 'company-country-error' : undefined}
                  placeholder="Select a country…"
                />
              </div>
              {errors.country && touched.country && (
                <p id="company-country-error" className="text-red-500 text-xs mt-1" role="alert">{errors.country}</p>
              )}
            </div>

            <div>
              <label htmlFor="zipCode" className="block text-sm font-semibold text-slate-700 mb-1">
                ZIP / Postal Code <span className="text-brand-500" aria-hidden="true">*</span>
              </label>
              <div className="relative">
                <input
                  id="zipCode"
                  type="text"
                  name="zipCode"
                  value={formData.zipCode}
                  onChange={(e) => handleInputChange("zipCode", e.target.value)}
                  onBlur={(e) => {
                    handleBlur("zipCode");
                    runZipLookup(e.target.value, formData.country);
                  }}
                  autoComplete="postal-code"
                  inputMode="text"
                  className={`w-full text-sm font-medium px-4 py-2.5 ${zipLoading ? 'pr-9' : ''} border rounded-lg transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:border-brand-500 ${
                    errors.zipCode && touched.zipCode ? 'border-red-500 bg-red-50' : 'border-slate-300 hover:border-slate-400'
                  }`}
                  placeholder="ZIP code"
                />
                {zipLoading && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-500" aria-live="polite" aria-label="Looking up postal code">
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  </span>
                )}
              </div>
              {errors.zipCode && touched.zipCode && (
                <p className="text-red-500 text-xs mt-1" role="alert">{errors.zipCode}</p>
              )}
            </div>
          </div>

          {/* Same as Warehouse Checkbox */}
          <div
            className={`rounded-lg border p-4 transition-colors ${
              formData.sameAsWarehouse
                ? 'border-brand-300/50 bg-brand-50/40'
                : 'border-slate-200 bg-white'
            }`}
          >
            <label htmlFor="sameAsWarehouse" className="flex cursor-pointer items-start gap-3 select-none">
              <input
                type="checkbox"
                id="sameAsWarehouse"
                checked={formData.sameAsWarehouse}
                onChange={(e) => handleInputChange('sameAsWarehouse', e.target.checked)}
                className="h-4.5 w-4.5 mt-[2px] shrink-0 cursor-pointer accent-brand-500 rounded border-slate-300 focus-visible:ring-2 focus-visible:ring-brand-500/40"
              />
              <div className="min-w-0 flex-1 space-y-0.5">
                <div className="text-sm font-semibold text-slate-900 leading-snug">
                  Same as warehouse address
                </div>
                <div className="text-xs text-slate-500 leading-relaxed">
                  {formData.sameAsWarehouse ? (
                    <>
                      <strong className="text-brand-600">Linked.</strong>{' '}
                      Warehouse step will use this address and ownership type. Uncheck if your warehouse is at a different location.
                    </>
                  ) : (
                    <>
                      Check this if your warehouse uses the same address and ownership type. Warehouse fields will auto-fill.
                    </>
                  )}
                </div>
              </div>
            </label>
          </div>
        </AccordionSection>

        {/* ═══════════════════════════════════════════════════════════════
            SECTION 4 — Required Document Uploads
            Fields: Logo, GST Certificate, PAN Card, Type-Specific Cert
            ═══════════════════════════════════════════════════════════════ */}
        <AccordionSection
          {...sectionProps('documents')}
          icon={<IconFileText className="w-4.5 h-4.5" aria-hidden="true" />}
          title="Required Document Uploads"
          subtitle="Company logo, GST certificate, PAN card, and business registration certificate"
        >
          <div className="flex flex-col">
            <p className="text-xs text-slate-500 mb-2">
              Upload clear, legible copies of all required documents (PDF, PNG, JPG, WEBP or DOC — max 5 MB each).
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">

            {/* Card: Company Logo */}
            <div className="flex flex-col bg-slate-50/60 rounded-xl p-3 border border-slate-100">
              <div className="mb-3">
                <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <span>Company Logo</span>
                  <span className="text-slate-400 font-normal">(Optional)</span>
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">PNG, JPG, WEBP, SVG — max 2 MB</p>
              </div>
              <div
                className={`flex-1 flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-2.5 transition-all duration-200 min-h-[104px] ${
                  errors.logo ? 'border-red-300 bg-red-50/30' : 'border-slate-200 bg-white hover:border-brand-400/50 hover:bg-brand-50/10'
                }`}
                onDragOver={handleDragOver}
                onDrop={handleLogoDrop}
                role="region"
                aria-label="Logo upload dropzone"
                data-field="logo"
                tabIndex={-1}
              >
                {formData.logo ? (
                  <div className="flex flex-col items-center justify-center w-full">
                    <div className="w-12 h-12 bg-white rounded-lg border border-slate-100 overflow-hidden flex items-center justify-center shadow-sm">
                      <img src={formData.logo as string} alt="Company Logo" className="w-full h-full object-contain" />
                    </div>
                    <div className="mt-2 text-xs text-slate-500 truncate max-w-[180px] text-center">
                      {formData.logoFile?.name || "logo.png"}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-center">
                    <Image className="w-5 h-5 text-slate-300 mb-1" />
                    <span className="text-xs text-slate-400">Drag & drop or browse</span>
                  </div>
                )}
                <input id="logoUpload" type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
                <div className="mt-2.5 flex items-center gap-2">
                  <label htmlFor="logoUpload" className="inline-flex items-center justify-center px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg cursor-pointer transition-colors duration-200">
                    Browse
                  </label>
                  {formData.logo && (
                    <button type="button" onClick={handleRemoveLogo} className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 text-red-500 hover:bg-red-50 transition-colors duration-200">
                      Remove
                    </button>
                  )}
                </div>
                {logoError && <div className="mt-2 text-xs text-red-500 font-medium text-center">{logoError}</div>}
              </div>
            </div>

            {/* Card: GST Certificate */}
            <div className="flex flex-col bg-slate-50/60 rounded-xl p-3 border border-slate-100">
              <div className="mb-3">
                <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <span>GST Certificate</span>
                  {formData.businessType === UNREGISTERED_TYPE_ID ? (
                    <span className="text-slate-400 text-[11px] font-medium">(Optional)</span>
                  ) : (
                    <span className="text-brand-500 font-semibold">*</span>
                  )}
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">PDF, PNG, JPG, WEBP, DOC — max 5 MB</p>
              </div>
              <div
                className={`flex-1 flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-2.5 transition-all duration-200 min-h-[104px] ${
                  errors.gstDocument ? 'border-red-300 bg-red-50/30' : 'border-slate-200 bg-white hover:border-brand-400/50 hover:bg-brand-50/10'
                }`}
                onDragOver={handleDragOver}
                onDrop={handleGstDrop}
                role="region"
                aria-label="GST document upload dropzone"
                data-field="gstDocument"
                tabIndex={-1}
              >
                {formData.gstDocument ? (
                  <div className="flex flex-col items-center justify-center w-full">
                    <div className="w-12 h-12 bg-white rounded-lg border border-slate-100 overflow-hidden flex items-center justify-center shadow-sm">
                      {formData.gstFile?.type.startsWith("image/") ? (
                        <img src={formData.gstDocument as string} alt="GST Certificate" className="w-full h-full object-contain" />
                      ) : (
                        <IconFileText className="w-7 h-7 text-brand-400" />
                      )}
                    </div>
                    <div className="mt-2 text-xs text-slate-500 truncate max-w-[180px] text-center">
                      {formData.gstFile?.name || "gst_certificate.pdf"}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-center">
                    <IconFileText className="w-5 h-5 text-slate-300 mb-1" />
                    <span className="text-xs text-slate-400">Drag & drop or browse</span>
                  </div>
                )}
                <input id="gstUpload" type="file" accept="application/pdf,image/*,.doc,.docx" onChange={handleGstChange} className="hidden" />
                <div className="mt-2.5 flex items-center gap-2">
                  <label htmlFor="gstUpload" className="inline-flex items-center justify-center px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg cursor-pointer transition-colors duration-200">
                    Browse
                  </label>
                  {formData.gstDocument && (
                    <button type="button" onClick={handleRemoveGst} className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 text-red-500 hover:bg-red-50 transition-colors duration-200">
                      Remove
                    </button>
                  )}
                </div>
                {gstError && <div className="mt-2 text-xs text-red-500 font-medium text-center">{gstError}</div>}
                {errors.gstDocument && (
                  <p className="mt-1.5 text-xs font-semibold text-red-500 text-center" role="alert">{errors.gstDocument}</p>
                )}
              </div>
            </div>

            {/* Card: PAN Card */}
            <div className="flex flex-col bg-slate-50/60 rounded-xl p-3 border border-slate-100">
              <div className="mb-3">
                <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <span>PAN Card</span>
                  {formData.businessType === UNREGISTERED_TYPE_ID ? (
                    <span className="text-slate-400 text-[11px] font-medium">(Optional)</span>
                  ) : (
                    <span className="text-brand-500 font-semibold">*</span>
                  )}
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">PDF, PNG, JPG, WEBP, DOC — max 5 MB</p>
              </div>
              <div
                className={`flex-1 flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-2.5 transition-all duration-200 min-h-[104px] ${
                  errors.panCardDocument ? 'border-red-300 bg-red-50/30' : 'border-slate-200 bg-white hover:border-brand-400/50 hover:bg-brand-50/10'
                }`}
                onDragOver={handleDragOver}
                onDrop={handlePanCardDrop}
                role="region"
                aria-label="PAN Card upload dropzone"
                data-field="panCardDocument"
                tabIndex={-1}
              >
                {formData.panCardDocument ? (
                  <div className="flex flex-col items-center justify-center w-full">
                    <div className="w-12 h-12 bg-white rounded-lg border border-slate-100 overflow-hidden flex items-center justify-center shadow-sm">
                      {formData.panCardFile?.type.startsWith("image/") ? (
                        <img src={formData.panCardDocument as string} alt="PAN Card preview" className="w-full h-full object-contain" />
                      ) : (
                        <IconFileText className="w-7 h-7 text-brand-400" />
                      )}
                    </div>
                    <div className="mt-2 text-xs text-slate-500 truncate max-w-[180px] text-center">
                      {formData.panCardFile?.name || "pan_card.pdf"}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-center">
                    <IconFileText className="w-5 h-5 text-slate-300 mb-1" />
                    <span className="text-xs text-slate-400">Drag & drop or browse</span>
                  </div>
                )}
                <input id="panCardUpload" type="file" accept="application/pdf,image/*,.doc,.docx" onChange={handlePanCardChange} className="hidden" />
                <div className="mt-2.5 flex items-center gap-2">
                  <label htmlFor="panCardUpload" className="inline-flex items-center justify-center px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg cursor-pointer transition-colors duration-200">
                    Browse
                  </label>
                  {formData.panCardDocument && (
                    <button type="button" onClick={handleRemovePanCard} className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 text-red-500 hover:bg-red-50 transition-colors duration-200">
                      Remove
                    </button>
                  )}
                </div>
                {panCardError && <div className="mt-2 text-xs text-red-500 font-medium text-center">{panCardError}</div>}
                {errors.panCardDocument && (
                  <p className="mt-1.5 text-xs font-semibold text-red-500 text-center" role="alert">{errors.panCardDocument}</p>
                )}
              </div>
            </div>

            {/* Card: Type-specific Certificate (conditional on businessType) */}
            {(() => {
              const meta = COMPANY_TYPE_META[formData.businessType as CompanyTypeId];
              if (!meta) return null;
              return (
                <div className="flex flex-col bg-slate-50/60 rounded-xl p-3 border border-slate-100">
                  <div className="mb-3">
                    <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <span>{meta.certLabel}</span>
                      {meta.certLabel !== 'IEC Certificate' && (
                        <span className="text-brand-500 font-semibold">*</span>
                      )}
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">PDF, PNG, JPG, WEBP, DOC — max 5 MB</p>
                  </div>
                  <div
                    className={`flex-1 flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-2.5 transition-all duration-200 min-h-[104px] ${
                      errors.typeCertDocument ? 'border-red-300 bg-red-50/30' : 'border-slate-200 bg-white hover:border-brand-400/50 hover:bg-brand-50/10'
                    }`}
                    onDragOver={handleDragOver}
                    onDrop={handleTypeCertDrop}
                    role="region"
                    aria-label={`${meta.certLabel} upload dropzone`}
                    data-field="typeCertDocument"
                    tabIndex={-1}
                  >
                    {formData.typeCertDocument ? (
                      <div className="flex flex-col items-center justify-center w-full">
                        <div className="w-12 h-12 bg-white rounded-lg border border-slate-100 overflow-hidden flex items-center justify-center shadow-sm">
                          {formData.typeCertFile?.type.startsWith("image/") ? (
                            <img src={formData.typeCertDocument as string} alt={`${meta.certLabel} preview`} className="w-full h-full object-contain" />
                          ) : (
                            <IconFileText className="w-7 h-7 text-brand-400" />
                          )}
                        </div>
                        <div className="mt-2 text-xs text-slate-500 truncate max-w-[180px] text-center">
                          {formData.typeCertFile?.name || "document.pdf"}
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center text-center">
                        <IconFileText className="w-5 h-5 text-slate-300 mb-1" />
                        <span className="text-xs text-slate-400">Drag & drop or browse</span>
                      </div>
                    )}
                    <input id="typeCertUpload" type="file" accept="application/pdf,image/*,.doc,.docx" onChange={handleTypeCertChange} className="hidden" />
                    <div className="mt-2.5 flex items-center gap-2">
                      <label htmlFor="typeCertUpload" className="inline-flex items-center justify-center px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg cursor-pointer transition-colors duration-200">
                        Browse
                      </label>
                      {formData.typeCertDocument && (
                        <button type="button" onClick={handleRemoveTypeCert} className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 text-red-500 hover:bg-red-50 transition-colors duration-200">
                          Remove
                        </button>
                      )}
                    </div>
                    {typeCertError && <div className="mt-2 text-xs text-red-500 font-medium text-center">{typeCertError}</div>}
                    {errors.typeCertDocument && (
                      <p className="mt-1.5 text-xs font-semibold text-red-500 text-center" role="alert">{errors.typeCertDocument}</p>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Card: IEC Certificate (OPTIONAL — shown for every business type
                EXCEPT when the type-specific certificate is already the IEC
                Certificate, e.g. Proprietorship, to avoid a duplicate field) */}
            {COMPANY_TYPE_META[formData.businessType as CompanyTypeId]?.certLabel !== 'IEC Certificate' && (
            <div className="flex flex-col bg-slate-50/60 rounded-xl p-3 border border-slate-100">
              <div className="mb-3">
                <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <span>IEC Certificate</span>
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">PDF, PNG, JPG, WEBP, DOC — max 5 MB</p>
              </div>
              <div
                className="flex-1 flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-2.5 transition-all duration-200 min-h-[104px] border-slate-200 bg-white hover:border-brand-400/50 hover:bg-brand-50/10"
                onDragOver={handleDragOver}
                onDrop={handleIecCertDrop}
                role="region"
                aria-label="IEC Certificate upload dropzone"
                data-field="iecCertDocument"
                tabIndex={-1}
              >
                {formData.iecCertDocument ? (
                  <div className="flex flex-col items-center justify-center w-full">
                    <div className="w-12 h-12 bg-white rounded-lg border border-slate-100 overflow-hidden flex items-center justify-center shadow-sm">
                      {formData.iecCertFile?.type.startsWith("image/") ? (
                        <img src={formData.iecCertDocument as string} alt="IEC Certificate preview" className="w-full h-full object-contain" />
                      ) : (
                        <IconFileText className="w-7 h-7 text-brand-400" />
                      )}
                    </div>
                    <div className="mt-2 text-xs text-slate-500 truncate max-w-[180px] text-center">
                      {formData.iecCertFile?.name || "iec_certificate.pdf"}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-center">
                    <IconFileText className="w-5 h-5 text-slate-300 mb-1" />
                    <span className="text-xs text-slate-400">Drag & drop or browse</span>
                  </div>
                )}
                <input id="iecCertUpload" type="file" accept="application/pdf,image/*,.doc,.docx" onChange={handleIecCertChange} className="hidden" />
                <div className="mt-2.5 flex items-center gap-2">
                  <label htmlFor="iecCertUpload" className="inline-flex items-center justify-center px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg cursor-pointer transition-colors duration-200">
                    Browse
                  </label>
                  {formData.iecCertDocument && (
                    <button type="button" onClick={handleRemoveIecCert} className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 text-red-500 hover:bg-red-50 transition-colors duration-200">
                      Remove
                    </button>
                  )}
                </div>
                {iecCertError && <div className="mt-2 text-xs text-red-500 font-medium text-center">{iecCertError}</div>}
              </div>
            </div>
            )}

            {/* Card: Aadhaar Card (Unregistered Vendor only — mandatory) */}
            {formData.businessType === UNREGISTERED_TYPE_ID && (
              <div className="flex flex-col bg-slate-50/60 rounded-xl p-3 border border-slate-100">
                <div className="mb-3">
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <span>Aadhaar Card</span>
                    <span className="text-brand-500 font-semibold">*</span>
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">PDF, PNG, JPG, WEBP, DOC — max 5 MB</p>
                </div>
                <div
                  className={`flex-1 flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-2.5 transition-all duration-200 min-h-[104px] ${
                    errors.aadhaarDocument ? 'border-red-300 bg-red-50/30' : 'border-slate-200 bg-white hover:border-brand-400/50 hover:bg-brand-50/10'
                  }`}
                  onDragOver={handleDragOver}
                  onDrop={handleAadhaarDrop}
                  role="region"
                  aria-label="Aadhaar Card upload dropzone"
                  data-field="aadhaarDocument"
                  tabIndex={-1}
                >
                  {formData.aadhaarDocument ? (
                    <div className="flex flex-col items-center justify-center w-full">
                      <div className="w-12 h-12 bg-white rounded-lg border border-slate-100 overflow-hidden flex items-center justify-center shadow-sm">
                        {formData.aadhaarFile?.type.startsWith("image/") ? (
                          <img src={formData.aadhaarDocument as string} alt="Aadhaar Card preview" className="w-full h-full object-contain" />
                        ) : (
                          <IconFileText className="w-7 h-7 text-brand-400" />
                        )}
                      </div>
                      <div className="mt-2 text-xs text-slate-500 truncate max-w-[180px] text-center">
                        {formData.aadhaarFile?.name || "aadhaar_card.pdf"}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center">
                      <IconFileText className="w-5 h-5 text-slate-300 mb-1" />
                      <span className="text-xs text-slate-400">Drag & drop or browse</span>
                    </div>
                  )}
                  <input id="aadhaarUpload" type="file" accept="application/pdf,image/*,.doc,.docx" onChange={handleAadhaarChange} className="hidden" />
                  <div className="mt-2.5 flex items-center gap-2">
                    <label htmlFor="aadhaarUpload" className="inline-flex items-center justify-center px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg cursor-pointer transition-colors duration-200">
                      Browse
                    </label>
                    {formData.aadhaarDocument && (
                      <button type="button" onClick={handleRemoveAadhaar} className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 text-red-500 hover:bg-red-50 transition-colors duration-200">
                        Remove
                      </button>
                    )}
                  </div>
                  {aadhaarError && <div className="mt-2 text-xs text-red-500 font-medium text-center">{aadhaarError}</div>}
                  {errors.aadhaarDocument && (
                    <p className="mt-1.5 text-xs font-semibold text-red-500 text-center" role="alert">{errors.aadhaarDocument}</p>
                  )}
                </div>
              </div>
            )}
            </div>
          </div>
        </AccordionSection>

      </div>{/* end accordion sections */}

      {/* ── Footer Navigation ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between pt-4 gap-3">
        <p className="text-xs text-slate-400 hidden sm:block">
          All sections must be completed before proceeding.
        </p>
        <Button
          onClick={handleNext}
          className="ml-auto inline-flex items-center gap-2 h-11 px-7 text-sm font-semibold text-white bg-brand-500 hover:bg-brand-600 active:bg-brand-700 transition-colors shadow-sm shadow-brand-500/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 rounded-lg"
        >
          Save &amp; Continue
          <ArrowRight className="w-4 h-4" aria-hidden="true" />
        </Button>
      </div>

    </div>
  );
}
