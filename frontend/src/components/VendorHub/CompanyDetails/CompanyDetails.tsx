"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/UI/Button";
import { Building2, Globe, Mail, Phone, MapPin, Image, Home, Building, User, Users, Scale, HelpCircle, Loader2, Briefcase, ArrowRight } from "lucide-react";
import { ToggleButton, PhoneInput, parsePhone, CountrySelect, validatePhoneE164, PHONE_COUNTRY_CODES, AddressAutocomplete } from "@/components/VendorHub/FormUI";
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
  /** Type-specific regulatory ID — IEC / CIN / Deed details / LLPIN. */
  companyIdNumber: string;
  /** PAN Number — required across all four supported business types. */
  panNumber: string;
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
  /** Login password for the vendor account. Required for registration.
   *  Min 8 chars. Backend hashes with bcrypt before persisting. Admin
   *  approval generates a new temporary password (overrides this) and
   *  emails it to the vendor — until then, this is the working password. */
  password: string;
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
];

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
  idHint: string;
  /** validator returns an error string, or '' if valid */
  validate: (v: string) => string;
  maxLength?: number;
  /** whether to auto-uppercase the input */
  uppercase?: boolean;
  /** Upload label for the type-specific certificate (Change 6) */
  certLabel: string;
}

const COMPANY_TYPE_META: Record<CompanyTypeId, CompanyTypeFieldMeta> = {
  'proprietorship': {
    idLabel: 'IEC Code',
    idPlaceholder: 'AAAAA1234A',
    idHint: '10-character Import Export Code',
    maxLength: 10,
    uppercase: true,
    certLabel: 'IEC Certificate',
    validate: (v) =>
      !v
        ? 'IEC Code is required'
        : !/^[A-Z0-9]{10}$/i.test(v)
        ? 'IEC Code must be exactly 10 alphanumeric characters'
        : '',
  },
  'pvt-ltd': {
    idLabel: 'CIN Number',
    idPlaceholder: 'U12345MH2020PTC123456',
    idHint: '21-character Corporate Identification Number',
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
    idHint: 'Registration number or short description of the partnership deed',
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
    idHint: '7-character LLP Identification Number',
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
    panNumber: data.panNumber || "",
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
    logo: data.logo || null,
    logoFile: null,
    gstDocument: data.gstDocument || null,
    gstFile: null,
    panCardDocument: data.panCardDocument || null,
    panCardFile: null,
    typeCertDocument: data.typeCertDocument || null,
    typeCertFile: null,
    password: data.password || "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

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
      panNumber: data.panNumber || "",
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
      logo: data.logo || null,
      logoFile: null,
      gstDocument: data.gstDocument || null,
      gstFile: null,
      panCardDocument: data.panCardDocument || null,
      panCardFile: null,
      typeCertDocument: data.typeCertDocument || null,
      typeCertFile: null,
      password: data.password || "",
    });
  }

  // Ref-based callback stability pattern (Vercel §8.2)
  const formDataRef = useRef(formData);
  formDataRef.current = formData;

  const handleInputChange = useCallback((field: string, value: any) => {
    setFormData((prev) => {
      // Switching business type changes the *meaning* of the type-specific ID
      // field AND certificate (IEC → CIN → deed → LLPIN). Clear both on change
      // so a previously entered IEC code doesn't get re-validated as a CIN and
      // an IEC certificate isn't re-presented as a CIN certificate. PAN (both
      // the number and the upload) is preserved — it's the same regulatory ID
      // across all four types.
      if (field === 'businessType' && value !== prev.businessType) {
        // Revoke the now-orphaned blob URL so we don't leak memory
        if (prev.typeCertFile && typeof prev.typeCertDocument === 'string') {
          URL.revokeObjectURL(prev.typeCertDocument);
        }
        return {
          ...prev,
          businessType: value,
          companyIdNumber: '',
          typeCertFile: null,
          typeCertDocument: null,
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
    if (field === 'phone' || field === 'phoneNumber2' || field === 'landlineNumber') {
      const labelMap: Record<string, string> = {
        phone: 'Phone Number 1',
        phoneNumber2: 'Phone Number 2',
        landlineNumber: 'Landline Number',
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
      fieldError = validatePhoneE164(currentFormData.landlineNumber, {
        required: false,
        label: 'Landline Number',
      });
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
    
    if (!currentFormData.businessType) newErrors.businessType = 'Business Type is required';
    if (!currentFormData.companyName) newErrors.companyName = 'Company Name is required';
    if (!currentFormData.gstNumber) {
      newErrors.gstNumber = 'GST Number is required';
    } else if (!/^[A-Z0-9]{15}$/i.test(currentFormData.gstNumber)) {
      newErrors.gstNumber = 'GST Number must be exactly 15 alphanumeric characters';
    }

    // Type-specific regulatory ID + PAN — only enforced when the user has
    // picked one of the four supported types. For "Other" / user-typed
    // values we don't know the regulatory shape, so we skip these checks.
    const typeMeta = COMPANY_TYPE_META[currentFormData.businessType as CompanyTypeId];
    if (typeMeta) {
      const idErr = typeMeta.validate(currentFormData.companyIdNumber);
      if (idErr) newErrors.companyIdNumber = idErr;

      if (!currentFormData.panNumber) {
        newErrors.panNumber = 'PAN Number is required';
      } else if (!PAN_PATTERN.test(currentFormData.panNumber)) {
        newErrors.panNumber = 'PAN must be 5 letters + 4 digits + 1 letter (e.g. AAAAA0000A)';
      }
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

    const landlineErr = validatePhoneE164(currentFormData.landlineNumber, {
      required: false,
      label: 'Landline Number',
    });
    if (landlineErr) newErrors.landlineNumber = landlineErr;
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
    if (!currentFormData.logo) {
      newErrors.logo = 'Company Logo is required';
    }
    if (!currentFormData.gstDocument) {
      newErrors.gstDocument = 'GST Certificate upload is required';
    }
    if (!currentFormData.panCardDocument) {
      newErrors.panCardDocument = 'PAN Card upload is required';
    }
    if (typeMeta && !currentFormData.typeCertDocument) {
      newErrors.typeCertDocument = `${typeMeta.certLabel} upload is required`;
    }

    // ── Login password (Step 8 fix C1) ────────────────────────────────
    // Required min-8-char password. Backend bcrypts it before storing.
    // Admin approval generates a new temporary password and emails the
    // vendor — until then, this is the working credential.
    if (!currentFormData.password) {
      newErrors.password = 'Password is required';
    } else if (currentFormData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      // Mark all fields as touched to show errors
      const allTouched: Record<string, boolean> = {};
      Object.keys(newErrors).forEach(key => {
        allTouched[key] = true;
      });
      setTouched(allTouched);

      // ── Validation-failure UX (Change 9) ────────────────────────────
      // 1. Top-level toast tells the user *how many* fields need fixing.
      // 2. Smooth-scroll to the first invalid field in DOM order.
      // 3. Move keyboard focus to a control inside that field so the
      //    user can fix it immediately (no extra click required).
      const errorCount = Object.keys(newErrors).length;
      showErrorToast(
        errorCount === 1
          ? '1 field needs your attention'
          : `${errorCount} fields need your attention`,
        'Scroll down to the highlighted field and fix it to continue.',
      );

      // DOM ordering of CompanyDetails fields. The errors object's own
      // iteration order can drift across edits, so be explicit about
      // which field is "first" visually.
      const FIELD_ORDER = [
        'businessType',
        'companyName',
        'gstNumber',
        'companyIdNumber',
        'panNumber',
        'email',
        'email2',
        'phone',
        'phoneNumber2',
        'landlineNumber',
        'logo',
        'gstDocument',
        'panCardDocument',
        'typeCertDocument',
        'address',
        'city',
        'state',
        'zipCode',
        'country',
        'factoryOwnershipType',
        'password',
      ];

      // Wait one tick for React to commit the new error state so the
      // invalid styling is on-screen before we measure the scroll target.
      requestAnimationFrame(() => {
        scrollToFirstError(newErrors, {
          fieldOrder: FIELD_ORDER,
          selectorMap: {
            // Only override for fields whose visible control isn't a
            // plain `<input name="...">`. Everything else falls through to
            // the helper's default `[name="..."]` lookup, which finds the
            // input directly (inputs inside PhoneInput have `name=` too,
            // so phone fields work via the default).
            businessType: '[data-field="businessType"]',
            factoryOwnershipType: '[data-field="factoryOwnershipType"]',
            country: '[data-field="country"]',
            logo: '[data-field="logo"]',
            gstDocument: '[data-field="gstDocument"]',
            panCardDocument: '[data-field="panCardDocument"]',
            typeCertDocument: '[data-field="typeCertDocument"]',
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
            Tell us about your business entity and legal information
          </p>
        </div>
      </div>

      {/* Business Type Selection */}
      <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-6 pt-6 pb-4 border-b border-slate-100">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-gray-500 shrink-0" aria-hidden="true" />
            Business Structure
          </h3>
        </div>
        <div className="px-6 py-6 space-y-6">
          <div>
            <label className="block text-base font-medium text-gray-700 mb-2">
              Business Type <span className="text-red-500 text-lg">*</span>
            </label>
            <p className="text-sm text-gray-500 -mt-1 mb-4">
              Select the legal structure under which your business is registered
            </p>
            {(() => {
              const bt = formData.businessType;
              // Treat any non-empty value that isn't one of the predefined
              // ids as a vendor-typed "Others" value.
              const isOthersTyped = !!bt && bt !== OTHERS_PLACEHOLDER && !BUSINESS_TYPE_IDS.has(bt);
              const othersSelected = bt === OTHERS_PLACEHOLDER || isOthersTyped;
              const othersValue = isOthersTyped ? bt : '';
              const invalid = !!(errors.businessType && touched.businessType);

              return (
                <>
                  <div className="flex flex-wrap gap-3" data-field="businessType">
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
                          onClick={() => handleInputChange("businessType", type.id)}
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
                        // Toggle into Others mode without wiping a previously
                        // typed value the user might be editing.
                        if (!othersSelected) handleInputChange("businessType", OTHERS_PLACEHOLDER);
                      }}
                    >
                      Others
                    </ToggleButton>
                  </div>

                  {othersSelected && (
                    <div className="mt-4 max-w-md">
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        Please specify your business type
                        <span className="text-red-500 ml-1" aria-hidden="true">*</span>
                      </label>
                      <input
                        type="text"
                        name="businessTypeOther"
                        value={othersValue}
                        onChange={(e) => {
                          // Store the typed value directly so the rest of the
                          // form (and the backend) get the user's wording.
                          // Empty input falls back to the OTHERS_PLACEHOLDER
                          // so the chip stays visually selected.
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

                  {invalid ? (
                    <p className="text-red-600 text-sm mt-3 font-medium">
                      {errors.businessType}
                    </p>
                  ) : null}
                </>
              );
            })()}
          </div>
        </div>
      </section>

        {/* Company Information */}
        <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-6 pt-6 pb-4 border-b border-slate-100">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-gray-500 shrink-0" aria-hidden="true" />
              Company Information
            </h3>
          </div>
          <div className="px-6 py-6 space-y-6">
            <div>
              <label className="block text-base font-medium text-gray-700 mb-2">
                Company Name <span className="text-red-500 text-lg">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  name="companyName"
                  value={formData.companyName}
                  onChange={(e) =>
                    handleInputChange("companyName", e.target.value)
                  }
                  onBlur={() => handleBlur("companyName")}
                  className={`w-full text-base font-medium px-4 py-3 border rounded-lg transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:border-brand-500 ${
                    errors.companyName && touched.companyName
                      ? 'border-red-500 bg-red-50'
                      : 'border-gray-300'
                  }`}
                  placeholder="Enter Company Name…"
                />
              </div>
              {errors.companyName && touched.companyName ? (
                <p className="text-red-500 text-sm mt-1">{errors.companyName}</p>
              ) : null}
            </div>

            <div>
              <label className="block text-base font-medium text-gray-700 mb-2">
                GST Number <span className="text-red-500 text-lg">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  name="gstNumber"
                  value={formData.gstNumber}
                  onChange={(e) => handleInputChange("gstNumber", e.target.value.toUpperCase())}
                  onBlur={() => handleBlur("gstNumber")}
                  maxLength={15}
                  className={`w-full text-base font-medium px-4 py-3 border rounded-lg transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:border-brand-500 ${
                    errors.gstNumber && touched.gstNumber
                      ? 'border-red-500 bg-red-50'
                      : 'border-gray-300'
                  }`}
                  placeholder="22AAAAA0000A1Z5"
                />
              </div>
              {errors.gstNumber && touched.gstNumber ? (
                <p className="text-red-500 text-sm mt-1">{errors.gstNumber}</p>
              ) : null}
            </div>

            {/* ── Dynamic regulatory fields driven by Business Type ───────
               Only render the type-specific ID + PAN when one of the four
               supported types is selected. We render the container (with
               reserved space) only when a type is picked, so switching
               between types doesn't cause the form to jump — fields swap
               in place. */}
            {(() => {
              const meta = COMPANY_TYPE_META[formData.businessType as CompanyTypeId];
              if (!meta) return null;
              const idErr = !!(errors.companyIdNumber && touched.companyIdNumber);
              const panErr = !!(errors.panNumber && touched.panNumber);
              const idDescId = `companyIdNumber-${idErr ? 'error' : 'hint'}`;
              return (
                <>
                  {/* Type-specific regulatory ID (IEC / CIN / Deed / LLPIN) */}
                  <div>
                    <label
                      htmlFor="companyIdNumber"
                      className="block text-base font-medium text-gray-700 mb-2"
                    >
                      {meta.idLabel} <span className="text-red-500 text-lg" aria-hidden="true">*</span>
                    </label>
                    <div className="relative">
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
                        aria-describedby={idDescId}
                        aria-invalid={idErr}
                        className={`w-full text-base font-medium px-4 py-3 border rounded-lg transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:border-brand-500 ${
                          idErr ? 'border-red-500 bg-red-50' : 'border-gray-300'
                        }`}
                        placeholder={meta.idPlaceholder}
                        style={meta.uppercase ? { fontVariantNumeric: 'tabular-nums', letterSpacing: '0.04em' } : undefined}
                      />
                    </div>
                    {idErr ? (
                      <p id={idDescId} className="text-red-500 text-sm mt-1" role="alert">
                        {errors.companyIdNumber}
                      </p>
                    ) : (
                      <p id={idDescId} className="text-gray-500 text-xs mt-1">
                        {meta.idHint}
                      </p>
                    )}
                  </div>

                  {/* PAN Number — same field across all four types */}
                  <div>
                    <label
                      htmlFor="panNumber"
                      className="block text-base font-medium text-gray-700 mb-2"
                    >
                      PAN Number <span className="text-red-500 text-lg" aria-hidden="true">*</span>
                    </label>
                    <div className="relative">
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
                        aria-describedby={`panNumber-${panErr ? 'error' : 'hint'}`}
                        aria-invalid={panErr}
                        className={`w-full text-base font-medium px-4 py-3 border rounded-lg transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:border-brand-500 ${
                          panErr ? 'border-red-500 bg-red-50' : 'border-gray-300'
                        }`}
                        placeholder="AAAAA0000A"
                        style={{ fontVariantNumeric: 'tabular-nums', letterSpacing: '0.04em' }}
                      />
                    </div>
                    {panErr ? (
                      <p id="panNumber-error" className="text-red-500 text-sm mt-1" role="alert">
                        {errors.panNumber}
                      </p>
                    ) : (
                      <p id="panNumber-hint" className="text-gray-500 text-xs mt-1">
                        10-character Permanent Account Number
                      </p>
                    )}
                  </div>
                </>
              );
            })()}

            {/* Divider & Contact Sub-heading */}
            <div className="pt-6 border-t border-gray-100 mt-6">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Mail className="w-4 h-4 text-slate-400" />
                Contact & Communication
              </h3>
            </div>

            {/* Emails Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Email 1 */}
              <div>
                <label className="block text-base font-medium text-gray-700 mb-2 flex items-center gap-1.5">
                  <Mail className="w-4 h-4 text-gray-400 shrink-0" />
                  <span>Email 1</span>
                  <span className="text-red-500 text-lg">*</span>
                </label>
                <div className="relative">
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    onBlur={() => handleBlur("email")}
                    className={`w-full text-base font-medium px-4 py-3 border rounded-lg transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:border-brand-500 ${
                      errors.email && touched.email
                        ? 'border-red-500 bg-red-50'
                        : 'border-gray-300'
                    }`}
                    placeholder="company@example.com…"
                    autoComplete="email"
                  />
                </div>
                {errors.email && touched.email ? (
                  <p className="text-red-500 text-sm mt-1">{errors.email}</p>
                ) : null}
              </div>

              {/* Email 2 */}
              <div>
                <label className="block text-base font-medium text-gray-700 mb-2 flex items-center gap-1.5">
                  <Mail className="w-4 h-4 text-gray-400 shrink-0" />
                  <span>Email 2</span>
                  <span className="text-gray-400 text-xs font-normal">(Optional)</span>
                </label>
                <div className="relative">
                  <input
                    type="email"
                    name="email2"
                    value={formData.email2}
                    onChange={(e) => handleInputChange("email2", e.target.value)}
                    onBlur={() => handleBlur("email2")}
                    className={`w-full text-base font-medium px-4 py-3 border rounded-lg transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:border-brand-500 ${
                      errors.email2 && touched.email2
                        ? 'border-red-500 bg-red-50'
                        : 'border-gray-300'
                    }`}
                    placeholder="optional secondary email…"
                    autoComplete="off"
                  />
                </div>
                {errors.email2 && touched.email2 ? (
                  <p className="text-red-500 text-sm mt-1">{errors.email2}</p>
                ) : null}
              </div>
            </div>

            {/* Phones Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Phone 1 */}
              <div>
                <label className="block text-base font-medium text-gray-700 mb-2 flex items-center gap-1.5">
                  <Phone className="w-4 h-4 text-gray-400 shrink-0" />
                  <span>Phone Number 1</span>
                  <span className="text-red-500 text-lg">*</span>
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
                {errors.phone && touched.phone ? (
                  <p className="text-red-500 text-sm mt-1">{errors.phone}</p>
                ) : null}
              </div>

              {/* Phone 2 */}
              <div>
                <label className="block text-base font-medium text-gray-700 mb-2 flex items-center gap-1.5">
                  <Phone className="w-4 h-4 text-gray-400 shrink-0" />
                  <span>Phone Number 2</span>
                  <span className="text-gray-400 text-xs font-normal">(Optional)</span>
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
                {errors.phoneNumber2 && touched.phoneNumber2 ? (
                  <p className="text-red-500 text-sm mt-1">{errors.phoneNumber2}</p>
                ) : null}
              </div>
            </div>

            {/* Landline & Website Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Landline Number */}
              <div>
                <label className="block text-base font-medium text-gray-700 mb-2 flex items-center gap-1.5">
                  <Phone className="w-4 h-4 text-gray-400 shrink-0" />
                  <span>Landline Number</span>
                  <span className="text-gray-400 text-xs font-normal">(Optional)</span>
                </label>
                <PhoneInput
                  name="landlineNumber"
                  value={formData.landlineNumber}
                  onChange={(v) => handleInputChange("landlineNumber", v)}
                  onBlur={() => handleBlur("landlineNumber")}
                  invalid={!!(errors.landlineNumber && touched.landlineNumber)}
                  placeholder="2228175000"
                  autoComplete="off"
                />
                {errors.landlineNumber && touched.landlineNumber ? (
                  <p className="text-red-500 text-sm mt-1">{errors.landlineNumber}</p>
                ) : null}
              </div>

              {/* Website */}
              <div>
                <label className="block text-base font-medium text-gray-700 mb-2 flex items-center gap-1.5">
                  <Globe className="w-4 h-4 text-gray-400 shrink-0" />
                  <span>Website</span>
                  <span className="text-gray-400 text-xs font-normal">(Optional)</span>
                </label>
                <div className="relative">
                  <input
                    type="url"
                    name="website"
                    value={formData.website}
                    onChange={(e) => handleInputChange("website", e.target.value)}
                    className="w-full text-base font-medium px-4 py-3 border border-gray-300 rounded-lg transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:border-brand-500"
                    placeholder="www.company.com…"
                    autoComplete="url"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Required Document Uploads */}
        <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-6 pt-6 pb-4 border-b border-slate-100">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <IconFileText className="w-5 h-5 text-gray-500 shrink-0" aria-hidden="true" />
              Required Document Uploads
            </h3>
            <p className="text-slate-500 text-sm mt-1">
              Please upload clear copies of the following documents to verify your business identity.
            </p>
          </div>
          <div className="px-6 py-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Card 1: Company Logo */}
              <div className="flex flex-col bg-slate-50/50 rounded-xl p-5 border border-slate-100">
                <div className="mb-3">
                  <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                    <span>Company Logo</span>
                    <span className="text-gray-400 text-xs font-normal">(Optional)</span>
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Upload your company logo (PNG, JPG, WEBP, SVG). Max 2,048 KB.
                  </p>
                </div>
                
                <div
                  className="w-full h-44 flex flex-col items-center justify-center border-2 border-dashed border-gray-200 bg-white rounded-lg p-4 hover:border-brand-500/40 hover:bg-slate-50/20 transition-all duration-200"
                  onDragOver={handleDragOver}
                  onDrop={handleLogoDrop}
                  role="region"
                  aria-label="Logo upload dropzone"
                  data-field="logo"
                  tabIndex={-1}
                >
                  {formData.logo ? (
                    <div className="flex flex-col items-center justify-center w-full h-full">
                      <div className="w-20 h-20 bg-white rounded-lg border border-slate-100 overflow-hidden flex items-center justify-center shadow-sm">
                        <img
                          src={formData.logo as string}
                          alt="Company Logo"
                          width={80}
                          height={80}
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <div className="mt-2 text-xs text-gray-600 truncate max-w-xs text-center">
                        {formData.logoFile?.name || "logo.png"}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center">
                      <Image className="w-8 h-8 text-gray-400 mb-2 shrink-0" />
                      <span className="text-xs font-medium text-slate-500">
                        Drag & drop your logo here or browse
                      </span>
                    </div>
                  )}

                  <input
                    id="logoUpload"
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="hidden"
                  />
                  <div className="mt-3 flex items-center gap-2">
                    <label
                      htmlFor="logoUpload"
                      className="inline-flex items-center justify-center px-4 py-1.5 min-h-[36px] bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow cursor-pointer transition-colors duration-200"
                    >
                      Browse
                    </label>
                    {formData.logo && (
                      <button
                        type="button"
                        onClick={handleRemoveLogo}
                        className="px-3 py-1.5 min-h-[36px] text-xs font-semibold rounded-lg border border-slate-200 text-red-600 hover:bg-red-50 transition-colors duration-200"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  {logoError && (
                    <div className="mt-2 text-xs text-red-600 font-medium">{logoError}</div>
                  )}
                </div>
              </div>

              {/* Card 2: GST Certificate */}
              <div className="flex flex-col bg-slate-50/50 rounded-xl p-5 border border-slate-100">
                <div className="mb-3">
                  <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                    <span>GST Certificate</span>
                    <span className="text-red-500">*</span>
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Upload your GST document (PDF, PNG, JPG, WEBP, DOC). Max 5,120 KB.
                  </p>
                </div>
                
                <div
                  className="w-full h-44 flex flex-col items-center justify-center border-2 border-dashed border-gray-200 bg-white rounded-lg p-4 hover:border-brand-500/40 hover:bg-slate-50/20 transition-all duration-200"
                  onDragOver={handleDragOver}
                  onDrop={handleGstDrop}
                  role="region"
                  aria-label="GST document upload dropzone"
                  data-field="gstDocument"
                  tabIndex={-1}
                >
                  {formData.gstDocument ? (
                    <div className="flex flex-col items-center justify-center w-full h-full">
                      <div className="w-20 h-20 bg-white rounded-lg border border-slate-100 overflow-hidden flex items-center justify-center shadow-sm">
                        {formData.gstFile?.type.startsWith("image/") ? (
                          <img
                            src={formData.gstDocument as string}
                            alt="GST Certificate"
                            width={80}
                            height={80}
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <IconFileText className="w-10 h-10 text-brand-500 shrink-0" />
                        )}
                      </div>
                      <div className="mt-2 text-xs text-gray-600 truncate max-w-xs text-center">
                        {formData.gstFile?.name || "gst_certificate.pdf"}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center">
                      <IconFileText className="w-8 h-8 text-gray-400 mb-2 shrink-0" />
                      <span className="text-xs font-medium text-slate-500">
                        Drag & drop certificate here or browse
                      </span>
                    </div>
                  )}

                  <input
                    id="gstUpload"
                    type="file"
                    accept="application/pdf,image/*,.doc,.docx"
                    onChange={handleGstChange}
                    className="hidden"
                  />
                  <div className="mt-3 flex items-center gap-2">
                    <label
                      htmlFor="gstUpload"
                      className="inline-flex items-center justify-center px-4 py-1.5 min-h-[36px] bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow cursor-pointer transition-colors duration-200"
                    >
                      Browse
                    </label>
                    {formData.gstDocument && (
                      <button
                        type="button"
                        onClick={handleRemoveGst}
                        className="px-3 py-1.5 min-h-[36px] text-xs font-semibold rounded-lg border border-slate-200 text-red-600 hover:bg-red-50 transition-colors duration-200"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  {gstError && (
                    <div className="mt-2 text-xs text-red-600 font-medium">{gstError}</div>
                  )}
                  {errors.gstDocument && (
                    <p className="mt-2 text-xs font-semibold text-red-600" role="alert">
                      {errors.gstDocument}
                    </p>
                  )}
                </div>
              </div>

              {/* Card 3: PAN Card */}
              <div className="flex flex-col bg-slate-50/50 rounded-xl p-5 border border-slate-100">
                <div className="mb-3">
                  <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                    <span>PAN Card</span>
                    <span className="text-red-500">*</span>
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Upload your PAN card ({ALLOWED_DOC_LABEL}). Max {MAX_DOC_LABEL}.
                  </p>
                </div>
                
                <div
                  className="w-full h-44 flex flex-col items-center justify-center border-2 border-dashed border-gray-200 bg-white rounded-lg p-4 hover:border-brand-500/40 hover:bg-slate-50/20 transition-all duration-200"
                  onDragOver={handleDragOver}
                  onDrop={handlePanCardDrop}
                  role="region"
                  aria-label="PAN Card upload dropzone"
                  data-field="panCardDocument"
                  tabIndex={-1}
                >
                  {formData.panCardDocument ? (
                    <div className="flex flex-col items-center justify-center w-full h-full">
                      <div className="w-20 h-20 bg-white rounded-lg border border-slate-100 overflow-hidden flex items-center justify-center shadow-sm">
                        {formData.panCardFile?.type.startsWith("image/") ? (
                          <img
                            src={formData.panCardDocument as string}
                            alt="PAN Card preview"
                            width={80}
                            height={80}
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <IconFileText className="w-10 h-10 text-brand-500 shrink-0" />
                        )}
                      </div>
                      <div className="mt-2 text-xs text-gray-600 truncate max-w-xs text-center">
                        {formData.panCardFile?.name || "pan_card.pdf"}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center">
                      <IconFileText className="w-8 h-8 text-gray-400 mb-2 shrink-0" />
                      <span className="text-xs font-medium text-slate-500">
                        Drag & drop PAN card here or browse
                      </span>
                    </div>
                  )}

                  <input
                    id="panCardUpload"
                    type="file"
                    accept="application/pdf,image/*,.doc,.docx"
                    onChange={handlePanCardChange}
                    className="hidden"
                  />
                  <div className="mt-3 flex items-center gap-2">
                    <label
                      htmlFor="panCardUpload"
                      className="inline-flex items-center justify-center px-4 py-1.5 min-h-[36px] bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow cursor-pointer transition-colors duration-200"
                    >
                      Browse
                    </label>
                    {formData.panCardDocument && (
                      <button
                        type="button"
                        onClick={handleRemovePanCard}
                        className="px-3 py-1.5 min-h-[36px] text-xs font-semibold rounded-lg border border-slate-200 text-red-600 hover:bg-red-50 transition-colors duration-200"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  {panCardError && (
                    <div className="mt-2 text-xs text-red-600 font-medium">{panCardError}</div>
                  )}
                  {errors.panCardDocument && (
                    <p className="mt-2 text-xs font-semibold text-red-600" role="alert">
                      {errors.panCardDocument}
                    </p>
                  )}
                </div>
              </div>

              {/* Card 4: Type-Specific Business Certificate (Conditional) */}
              {(() => {
                const meta = COMPANY_TYPE_META[formData.businessType as CompanyTypeId];
                if (!meta) return null;
                return (
                  <div className="flex flex-col bg-slate-50/50 rounded-xl p-5 border border-slate-100">
                    <div className="mb-3">
                      <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                        <span>{meta.certLabel}</span>
                        <span className="text-red-500">*</span>
                      </h3>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Upload your {meta.certLabel.toLowerCase()} ({ALLOWED_DOC_LABEL}). Max {MAX_DOC_LABEL}.
                      </p>
                    </div>
                    
                    <div
                      className="w-full h-44 flex flex-col items-center justify-center border-2 border-dashed border-gray-200 bg-white rounded-lg p-4 hover:border-brand-500/40 hover:bg-slate-50/20 transition-all duration-200"
                      onDragOver={handleDragOver}
                      onDrop={handleTypeCertDrop}
                      role="region"
                      aria-label={`${meta.certLabel} upload dropzone`}
                      data-field="typeCertDocument"
                      tabIndex={-1}
                    >
                      {formData.typeCertDocument ? (
                        <div className="flex flex-col items-center justify-center w-full h-full">
                          <div className="w-20 h-20 bg-white rounded-lg border border-slate-100 overflow-hidden flex items-center justify-center shadow-sm">
                            {formData.typeCertFile?.type.startsWith("image/") ? (
                              <img
                                src={formData.typeCertDocument as string}
                                alt={`${meta.certLabel} preview`}
                                width={80}
                                height={80}
                                className="w-full h-full object-contain"
                              />
                            ) : (
                              <IconFileText className="w-10 h-10 text-brand-500 shrink-0" />
                            )}
                          </div>
                          <div className="mt-2 text-xs text-gray-600 truncate max-w-xs text-center">
                            {formData.typeCertFile?.name || "document.pdf"}
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center text-center">
                          <IconFileText className="w-8 h-8 text-gray-400 mb-2 shrink-0" />
                          <span className="text-xs font-medium text-slate-500">
                            Drag & drop document here or browse
                          </span>
                        </div>
                      )}

                      <input
                        id="typeCertUpload"
                        type="file"
                        accept="application/pdf,image/*,.doc,.docx"
                        onChange={handleTypeCertChange}
                        className="hidden"
                      />
                      <div className="mt-3 flex items-center gap-2">
                        <label
                          htmlFor="typeCertUpload"
                          className="inline-flex items-center justify-center px-4 py-1.5 min-h-[36px] bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow cursor-pointer transition-colors duration-200"
                        >
                          Browse
                        </label>
                        {formData.typeCertDocument && (
                          <button
                            type="button"
                            onClick={handleRemoveTypeCert}
                            className="px-3 py-1.5 min-h-[36px] text-xs font-semibold rounded-lg border border-slate-200 text-red-600 hover:bg-red-50 transition-colors duration-200"
                          >
                            Remove
                          </button>
                        )}
                      </div>

                      {typeCertError && (
                        <div className="mt-2 text-xs text-red-600 font-medium">{typeCertError}</div>
                      )}
                      {errors.typeCertDocument && (
                        <p className="mt-2 text-xs font-semibold text-red-600" role="alert">
                          {errors.typeCertDocument}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })()}

            </div>
          </div>
        </section>

        {/* Legal Address */}
        <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-6 pt-6 pb-4 border-b border-slate-100">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-gray-500 shrink-0" aria-hidden="true" />
              Legal Address
            </h3>
          </div>
          <div className="px-6 py-6 space-y-6">
            {/* Map-backed address search — picks an entry to auto-fill the
                rest of the form. Optional shortcut; manual entry still works. */}
            <div>
              <label htmlFor="addressSearch" className="block text-base font-medium text-gray-700 mb-2">
                Search Location <span className="text-gray-400 text-sm font-normal">(optional shortcut)</span>
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
                  // Clear any prior errors on the fields we just populated
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
              <p className="text-xs text-gray-500 mt-1">
                Type 3+ characters to see suggestions. Picking one fills Line 1, City, State, ZIP, and Country at once — you can still edit any field afterwards.
              </p>
            </div>

            {/* Address Line 1 — required, the primary street line */}
            <div>
              <label htmlFor="addressLine1" className="block text-base font-medium text-gray-700 mb-2">
                Address Line 1 <span className="text-red-500 text-lg" aria-hidden="true">*</span>
              </label>
              <input
                id="addressLine1"
                type="text"
                name="address"
                value={formData.address}
                onChange={(e) => handleInputChange("address", e.target.value)}
                onBlur={() => handleBlur("address")}
                autoComplete="address-line1"
                className={`w-full text-base font-medium px-4 py-3 border rounded-lg transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:border-brand-500 ${
                  errors.address && touched.address
                    ? 'border-red-500 bg-red-50'
                    : 'border-gray-300'
                }`}
                placeholder="House / building / street"
              />
              {errors.address && touched.address && (
                <p className="text-red-500 text-sm mt-1" role="alert">{errors.address}</p>
              )}
            </div>

            {/* Address Line 2 — optional */}
            <div>
              <label htmlFor="addressLine2" className="block text-base font-medium text-gray-700 mb-2">
                Address Line 2 <span className="text-gray-400 text-sm font-normal">(optional)</span>
              </label>
              <input
                id="addressLine2"
                type="text"
                name="addressLine2"
                value={formData.addressLine2}
                onChange={(e) => handleInputChange("addressLine2", e.target.value)}
                autoComplete="address-line2"
                className="w-full text-base font-medium px-4 py-3 border border-gray-300 rounded-lg transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:border-brand-500"
                placeholder="Apartment, suite, floor"
              />
            </div>

            {/* Address Line 3 — optional */}
            <div>
              <label htmlFor="addressLine3" className="block text-base font-medium text-gray-700 mb-2">
                Address Line 3 <span className="text-gray-400 text-sm font-normal">(optional)</span>
              </label>
              <input
                id="addressLine3"
                type="text"
                name="addressLine3"
                value={formData.addressLine3}
                onChange={(e) => handleInputChange("addressLine3", e.target.value)}
                autoComplete="address-line3"
                className="w-full text-base font-medium px-4 py-3 border border-gray-300 rounded-lg transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:border-brand-500"
                placeholder="Building name, block, complex"
              />
            </div>

            {/* Landmark — optional, helps with locating */}
            <div>
              <label htmlFor="landmark" className="block text-base font-medium text-gray-700 mb-2">
                Landmark <span className="text-gray-400 text-sm font-normal">(optional)</span>
              </label>
              <input
                id="landmark"
                type="text"
                name="landmark"
                value={formData.landmark}
                onChange={(e) => handleInputChange("landmark", e.target.value)}
                autoComplete="off"
                className="w-full text-base font-medium px-4 py-3 border border-gray-300 rounded-lg transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:border-brand-500"
                placeholder="e.g. Near Central Mall, opposite Park View School"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-base font-medium text-gray-700 mb-2">
                  City <span className="text-red-500 text-lg">*</span>
                </label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={(e) => handleInputChange("city", e.target.value)}
                  onBlur={() => handleBlur("city")}
                  className={`w-full text-base font-medium px-4 py-3 border rounded-lg transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:border-brand-500 ${
                    errors.city && touched.city
                      ? 'border-red-500 bg-red-50'
                      : 'border-gray-300'
                  }`}
                  placeholder="City"
                />
                {errors.city && touched.city && (
                  <p className="text-red-500 text-sm mt-1">{errors.city}</p>
                )}
              </div>

              <div>
                <label className="block text-base font-medium text-gray-700 mb-2">
                  State/Province <span className="text-red-500 text-lg">*</span>
                </label>
                <input
                  type="text"
                  name="state"
                  value={formData.state}
                  onChange={(e) => handleInputChange("state", e.target.value)}
                  onBlur={() => handleBlur("state")}
                  className={`w-full text-base font-medium px-4 py-3 border rounded-lg transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:border-brand-500 ${
                    errors.state && touched.state
                      ? 'border-red-500 bg-red-50'
                      : 'border-gray-300'
                  }`}
                  placeholder="State"
                />
                {errors.state && touched.state && (
                  <p className="text-red-500 text-sm mt-1">{errors.state}</p>
                )}
              </div>

              <div>
                <label htmlFor="zipCode" className="block text-base font-medium text-gray-700 mb-2">
                  ZIP / Postal Code <span className="text-red-500 text-lg" aria-hidden="true">*</span>
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
                    className={`w-full text-base font-medium px-4 py-3 ${zipLoading ? 'pr-10' : ''} border rounded-lg transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:border-brand-500 ${
                      errors.zipCode && touched.zipCode
                        ? 'border-red-500 bg-red-50'
                        : 'border-gray-300'
                    }`}
                    placeholder="ZIP code"
                    aria-describedby="zipCode-hint"
                  />
                  {zipLoading && (
                    <span
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-500"
                      aria-live="polite"
                      aria-label="Looking up postal code"
                    >
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    </span>
                  )}
                </div>
                <p id="zipCode-hint" className="text-xs text-gray-500 mt-1">
                  We&rsquo;ll auto-fill City and State once you finish typing.
                </p>
                {errors.zipCode && touched.zipCode && (
                  <p className="text-red-500 text-sm mt-1" role="alert">{errors.zipCode}</p>
                )}
              </div>
            </div>

            <div>
              <label
                htmlFor="company-country-select"
                className="block text-base font-medium text-gray-700 mb-2"
              >
                Country <span className="text-red-500 text-lg">*</span>
              </label>
              <div data-field="country">
                <CountrySelect
                  id="company-country-select"
                  value={formData.country}
                  onChange={(name) => handleInputChange('country', name)}
                  onBlur={() => handleBlur('country')}
                  invalid={!!(errors.country && touched.country)}
                  ariaDescribedBy={
                    errors.country && touched.country ? 'company-country-error' : undefined
                  }
                  placeholder="Select a country…"
                />
              </div>
              {errors.country && touched.country && (
                <p id="company-country-error" className="text-red-500 text-sm mt-1" role="alert">
                  {errors.country}
                </p>
              )}
            </div>

            {/* ── Factory Ownership ───────────────────────────────────
               Mirrors the Warehouse step's "Facility Ownership" pattern
               (chip selector, label-only, required) so admin reviewers
               can compare ownership of the factory vs the warehouse at
               a glance. */}
            <div>
              <label
                id="factoryOwnership-label"
                className="block text-base font-medium text-gray-700 mb-2"
              >
                Factory Ownership{' '}
                <span className="text-red-500 text-lg" aria-hidden="true">*</span>
              </label>
              <p className="text-sm text-gray-500 -mt-1 mb-3">
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
                        handleInputChange('factoryOwnershipType', type.id);
                        handleBlur('factoryOwnershipType');
                      }}
                    >
                      {type.label}
                    </ToggleButton>
                  );
                })}
              </div>
              {errors.factoryOwnershipType && touched.factoryOwnershipType && (
                <p
                  id="factoryOwnership-error"
                  className="text-red-500 text-sm mt-2"
                  role="alert"
                >
                  {errors.factoryOwnershipType}
                </p>
              )}
            </div>

            {/* ── Same as Warehouse — links this address + ownership
                to the Warehouse step. While checked, every change here
                streams up to WarehouseDetails in real time (debounced).
                The Warehouse step shows an "inherited from Company"
                banner and locks its fields. */}
            <div
              className={`rounded-lg border p-4 transition-colors ${
                formData.sameAsWarehouse
                  ? 'border-brand-500/30 bg-brand-50/40'
                  : 'border-gray-200 bg-white'
              }`}
            >
              <label
                htmlFor="sameAsWarehouse"
                className="flex cursor-pointer items-start gap-3 select-none"
              >
                <input
                  type="checkbox"
                  id="sameAsWarehouse"
                  checked={formData.sameAsWarehouse}
                  onChange={(e) => handleInputChange('sameAsWarehouse', e.target.checked)}
                  className="h-5 w-5 mt-[3px] shrink-0 cursor-pointer accent-brand-500 rounded border-gray-300 focus-visible:ring-2 focus-visible:ring-brand-500/40"
                />
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="text-base font-semibold text-gray-900 leading-snug">
                    Same as warehouse address
                  </div>
                  <div className="text-sm text-gray-600 leading-relaxed">
                    {formData.sameAsWarehouse ? (
                      <>
                        <strong className="text-brand-700">Linked.</strong>{' '}
                        Warehouse step will use this address and ownership type. Edits here update Warehouse instantly — uncheck if your warehouse is at a different location.
                      </>
                    ) : (
                      <>
                        Check this if your warehouse uses the same address and ownership type. Warehouse fields will auto-fill and stay in sync with this section.
                      </>
                    )}
                  </div>
                </div>
              </label>
            </div>
          </div>
        </section>

      {/* ── Account Security ───────────────────────────────────────────
          Login password for the vendor's account. Required before
          submission. Admin approval later generates a temporary
          password and emails it (overriding this) — until then this
          is the working credential. */}
      <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-6 pt-6 pb-4 border-b border-slate-100">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            Account Security{' '}
            <span className="text-red-500 text-lg" aria-hidden="true">*</span>
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Set a login password for your vendor account. You&apos;ll receive a new temporary password once your application is approved.
          </p>
        </div>
        <div className="px-6 py-6">
          <label
            htmlFor="password"
            className="block text-sm font-medium text-gray-700 mb-1.5"
          >
            Password <span className="text-red-500" aria-hidden="true">*</span>
          </label>
          <input
            id="password"
            type="password"
            name="password"
            autoComplete="new-password"
            value={formData.password}
            onChange={(e) => handleInputChange('password', e.target.value)}
            onBlur={() => handleBlur('password')}
            placeholder="At least 8 characters"
            className={`w-full h-11 rounded-md border px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 ${
              errors.password && touched.password
                ? 'border-red-400 bg-red-50/40 focus-visible:border-red-500'
                : 'border-slate-300 bg-white focus-visible:border-brand-500'
            }`}
            aria-invalid={!!(errors.password && touched.password)}
            aria-describedby={errors.password && touched.password ? 'password-error' : undefined}
          />
          {errors.password && touched.password && (
            <p
              id="password-error"
              className="text-red-500 text-sm mt-2"
              role="alert"
            >
              {errors.password}
            </p>
          )}
        </div>
      </section>

      {/* Navigation */}
      <div className="flex justify-end pt-4">
        <Button
          onClick={handleNext}
          className="inline-flex items-center gap-2 h-11 px-6 text-sm font-semibold text-white bg-brand-500 hover:bg-brand-600 transition-colors shadow-sm shadow-brand-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
        >
          Save & Continue
          <ArrowRight className="w-4 h-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
