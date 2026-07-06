"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/UI/Button";
import { Building2, Globe, Mail, Phone, MapPin, Image, Home, Building, User, Users, Scale, HelpCircle, Loader2, Briefcase, ArrowRight, Upload, Eye, RefreshCw, X, CheckCircle2, ChevronDown, AlertCircle, Camera } from "lucide-react";
import { ToggleButton, PhoneInput, parsePhone, CountrySelect, validatePhoneE164, PHONE_COUNTRY_CODES, AddressAutocomplete, AccordionSection, LocalLandlineInput, type LocalLandlineValue } from "@/components/VendorHub/FormUI";
import { IconFile, IconFileText } from "@tabler/icons-react";
import { handleUpload, validateUpload, notifyUploadError, notifyUploadSuccess } from "@/lib/toast-utils";
import ImageCropModal from "@/components/UI/ImageCropModal";
import { centerNotice } from "@/components/UI/CenterNotice";
import { useZipLookup } from "@/hooks/useZipLookup";
import { zipPlaceLabel } from "@/lib/zipLookup";
import type { ZipPlace } from "@/lib/zipLookup";
import { ZipAreaSelect } from "@/components/VendorHub/ZipAreaSelect";
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
  localLandlineStd: string;
  localLandlineNumber: string;
  intlLandlineCountryCode: string;
  intlLandlineStd: string;
  intlLandlineNumber: string;
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
  /** Warehousing capacity for the factory site (sq ft). Only used when
   *  sameAsWarehouse is false — otherwise we read data.warehousingCapacity. */
  factorySiteCapacity: string;
  /** Factory & facility photo slots — independent from warehouse photos.
   *  Only required when sameAsWarehouse is false. */
  factorySiteImages: Partial<Record<FactoryImageSlotId, FactoryImageValue>>;
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

// ── Factory & Facility Photo Slots ────────────────────────────────────────
// Same slot definitions as WarehouseDetails — reused here so CompanyDetails
// can capture factory photos when the factory site ≠ warehouse.
type FactoryImageSlotId =
  | 'nameBoard' | 'frontView' | 'backView' | 'leftView'
  | 'rightView' | 'roadView' | 'insideFactory' | 'others';

interface FactoryImageSlotConfig {
  id: FactoryImageSlotId;
  label: string;
  description: string;
  required: boolean;
}

interface FactoryImageValue { file: File | null; url: string; name: string; }

const FACTORY_IMAGE_SLOTS: FactoryImageSlotConfig[] = [
  { id: 'nameBoard',      label: 'Factory Name Board', description: 'Signage showing the factory name',  required: true  },
  { id: 'frontView',      label: 'Front View',          description: 'Main entrance / facade',            required: true  },
  { id: 'backView',       label: 'Back View',           description: 'Rear of the building',              required: true  },
  { id: 'leftView',       label: 'Left View',           description: 'Left-side elevation',               required: true  },
  { id: 'rightView',      label: 'Right View',          description: 'Right-side elevation',              required: true  },
  { id: 'roadView',       label: 'Road View',           description: 'Approach road / driveway',          required: true  },
  { id: 'insideFactory',  label: 'Inside Factory',      description: 'Production floor or interior',      required: true  },
  { id: 'others',         label: 'Others',              description: 'Any additional photo',              required: false },
];

const SITE_IMAGE_ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
const SITE_IMAGE_MAX_BYTES = 10 * 1024 * 1024;
const SITE_IMAGE_MAX_LABEL = '10,240 KB';

function normaliseFactorySiteImages(
  raw: unknown,
): Partial<Record<FactoryImageSlotId, FactoryImageValue>> {
  if (!raw) return {};
  if (Array.isArray(raw)) {
    const out: Partial<Record<FactoryImageSlotId, FactoryImageValue>> = {};
    for (const item of raw) {
      const slotId = item?.slotId as FactoryImageSlotId | undefined;
      if (slotId && FACTORY_IMAGE_SLOTS.some((s) => s.id === slotId)) {
        out[slotId] = { file: item.file ?? null, url: item.url ?? '', name: item.name ?? '' };
      }
    }
    return out;
  }
  if (typeof raw === 'object') return raw as Partial<Record<FactoryImageSlotId, FactoryImageValue>>;
  return {};
}

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

// ── DocUpload — compact inline document upload control ──────────────────
//
// Renders a document upload that sits beside its corresponding field.
// Two visual states, same height, so cards stay uniform:
//   • Empty   → a short dashed dropzone with a Browse button.
//   • Uploaded → a file chip ("📄 name.pdf · ✓ Uploaded") with View /
//                Replace / Remove actions (no second upload box).
// Purely presentational — every handler (change/drop/remove) and all
// file state is owned by CompanyDetails and passed in, so upload/storage
// behaviour is unchanged. Module-scoped so its identity is stable across
// re-renders (a locally-defined component would remount on each keystroke).
type RequiredMark = 'required' | 'optional' | 'none';

interface DocUploadProps {
  title: string;
  requiredMark?: RequiredMark;
  hint?: string;
  inputId: string;
  accept: string;
  file: File | null;
  documentUrl: string | null;
  /** Always render an image thumbnail (used by the logo, which is image-only
   *  and may be a stored URL with no File object). */
  forceImagePreview?: boolean;
  fallbackName: string;
  error?: string | null;
  /** Red border on the empty dropzone when a required-upload error is set. */
  invalid?: boolean;
  /** Anchor for scrollToFirstError (matches handleNext's selectorMap). */
  dataField?: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDrop: (e: React.DragEvent<HTMLElement>) => void;
  onDragOver: (e: React.DragEvent<HTMLElement>) => void;
  onRemove: () => void;
}

function DocUpload({
  title,
  requiredMark = 'none',
  hint,
  inputId,
  accept,
  file,
  documentUrl,
  forceImagePreview,
  fallbackName,
  error,
  invalid,
  dataField,
  onChange,
  onDrop,
  onDragOver,
  onRemove,
}: DocUploadProps) {
  const hasFile = !!documentUrl;
  const isImage = forceImagePreview || (file ? file.type.startsWith('image/') : false);
  const name = file?.name || fallbackName;

  return (
    <div>
      <label htmlFor={inputId} className="block text-sm font-semibold text-slate-700 mb-1">
        {title}
        {requiredMark === 'required' && <span className="text-brand-500 ml-0.5" aria-hidden="true">*</span>}
      </label>

      {/* Hidden input is always mounted so the "Replace" label can re-open it. */}
      <input id={inputId} type="file" accept={accept} onChange={onChange} className="hidden" />

      {hasFile ? (
        <div
          className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50/50 px-2.5 py-2 min-h-[46px]"
          data-field={dataField}
        >
          <div className="w-8 h-8 rounded-md border border-emerald-100 bg-white overflow-hidden flex items-center justify-center shrink-0">
            {isImage && documentUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={documentUrl} alt={`${title} preview`} className="w-full h-full object-contain" />
            ) : (
              <IconFileText className="w-4 h-4 text-brand-400" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-slate-700">{name}</p>
            <p className="text-[11px] font-medium text-emerald-600 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Uploaded
            </p>
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            {documentUrl && (
              <a
                href={documentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold text-slate-600 hover:bg-white hover:text-brand-600 transition-colors"
              >
                <Eye className="w-3.5 h-3.5" /> View
              </a>
            )}
            <label
              htmlFor={inputId}
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); document.getElementById(inputId)?.click(); } }}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold text-slate-600 hover:bg-white hover:text-brand-600 cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 rounded-md"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Replace
            </label>
            <button
              type="button"
              onClick={onRemove}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold text-red-500 hover:bg-white transition-colors"
            >
              <X className="w-3.5 h-3.5" /> Remove
            </button>
          </div>
        </div>
      ) : (
        <>
          <label
            htmlFor={inputId}
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); document.getElementById(inputId)?.click(); } }}
            className={`flex items-center gap-2.5 rounded-lg border-2 border-dashed px-3 py-2 min-h-[46px] transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 ${
              invalid ? 'border-red-300 bg-red-50/30' : 'border-slate-200 bg-white hover:border-brand-400/50 hover:bg-brand-50/10'
            }`}
            onDragOver={onDragOver}
            onDrop={onDrop}
            aria-label={`${title} upload dropzone`}
            data-field={dataField}
          >
            <Upload className="w-4 h-4 text-slate-300 shrink-0" />
            <span className="text-xs text-slate-400 flex-1 truncate">Drag &amp; drop or browse</span>
            <span className="inline-flex items-center justify-center px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg transition-colors duration-200 shrink-0">
              Browse
            </span>
          </label>
          {hint && <p className="mt-1 text-[11px] text-slate-400">{hint}</p>}
        </>
      )}

      {error && <p className="mt-1 text-xs font-medium text-red-500" role="alert">{error}</p>}
    </div>
  );
}

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
    localLandlineStd: data.localLandlineStd || "",
    localLandlineNumber: data.localLandlineNumber || (data.landlineNumber ? parsePhone(data.landlineNumber).national : ""),
    intlLandlineCountryCode: data.intlLandlineCountryCode || parsePhone(data.intlLandline || "").dial,
    intlLandlineStd: data.intlLandlineStd || "",
    intlLandlineNumber: data.intlLandlineNumber || parsePhone(data.intlLandline || "").national,
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
    factorySiteCapacity: data.factorySiteCapacity || '',
    factorySiteImages: normaliseFactorySiteImages(data.factorySiteImages),
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // ── Factory site photo crop state ──────────────────────────────────
  const [factoryCropPending, setFactoryCropPending] = useState<{
    slotId: FactoryImageSlotId;
    src: string;
    fileName: string;
  } | null>(null);
  const factoryCropPendingRef = useRef(factoryCropPending);
  factoryCropPendingRef.current = factoryCropPending;

  // ── Accordion Section State ────────────────────────────────────────
  // Tracks which of the 4 logical subsections is currently expanded.
  type SectionKey = 'profile' | 'contact' | 'address' | 'photos';
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
    localLandlineStd: 'contact',
    localLandlineNumber: 'contact',
    intlLandlineCountryCode: 'contact',
    intlLandlineStd: 'contact',
    intlLandlineNumber: 'contact',
    address: 'address',
    city: 'address',
    state: 'address',
    zipCode: 'address',
    country: 'address',
    factoryOwnershipType: 'address',
    // Document uploads now live inline within the Business Profile section
    // (next to their corresponding regulatory field), so their errors map
    // to 'profile' for auto-expand/scroll.
    logo: 'profile',
    gstDocument: 'profile',
    panCardDocument: 'profile',
    typeCertDocument: 'profile',
    aadhaarDocument: 'profile',
    // Factory photo slot errors → photos section
    ...Object.fromEntries(
      FACTORY_IMAGE_SLOTS.map((s) => [`factorySiteImage:${s.id}`, 'photos' as SectionKey]),
    ),
  };

  // ── ZIP / postal-code auto-fill ─────────────────────────────────
  // When the user finishes typing a ZIP, we look it up via zippopotam.us
  // and pre-fill City + State. The user can still edit any field after.
  // ── ZIP / PIN code lookup (company address) ──────────────────────────
  const handleZipResult = useCallback((place: ZipPlace) => {
    setFormData((prev) => ({
      ...prev,
      city: place.area || place.city || prev.city,
      state: place.state || prev.state,
    }));
    setErrors((prev) => ({ ...prev, city: '', state: '' }));
  }, []);

  const {
    loading: zipLoading,
    places: zipPlaces,
    runLookup: runZipLookup,
    clear: clearZip,
  } = useZipLookup(handleZipResult);

  // ── Factory Site Photo Handlers ─────────────────────────────────────
  const handleFactorySlotUpload = useCallback((slotId: FactoryImageSlotId, file: File) => {
    const slot = FACTORY_IMAGE_SLOTS.find((s) => s.id === slotId);
    const label = slot ? slot.label : 'Image';
    const result = validateUpload(file, {
      label,
      allowedTypes: SITE_IMAGE_ALLOWED_TYPES,
      allowedLabel: 'PNG, JPG, WEBP, or GIF',
      maxBytes: SITE_IMAGE_MAX_BYTES,
      maxLabel: SITE_IMAGE_MAX_LABEL,
    });
    if (!result.ok) { notifyUploadError(label, result.message); return; }
    const pending = factoryCropPendingRef.current;
    if (pending) URL.revokeObjectURL(pending.src);
    setFactoryCropPending({ slotId, src: URL.createObjectURL(file), fileName: file.name });
  }, []);

  const handleFactoryCropConfirm = useCallback((croppedFile: File) => {
    const pending = factoryCropPendingRef.current;
    if (!pending) return;
    const { slotId, fileName } = pending;
    setFactoryCropPending(null);
    const url = URL.createObjectURL(croppedFile);
    setFormData((prev) => {
      const existing = prev.factorySiteImages[slotId];
      if (existing?.url && existing.url.startsWith('blob:')) URL.revokeObjectURL(existing.url);
      return {
        ...prev,
        factorySiteImages: { ...prev.factorySiteImages, [slotId]: { file: croppedFile, url, name: fileName } },
      };
    });
    setErrors((prev) => ({ ...prev, [`factorySiteImage:${slotId}`]: '' }));
    notifyUploadSuccess(fileName, '');
  }, []);

  const handleFactoryCropCancel = useCallback(() => {
    const pending = factoryCropPendingRef.current;
    if (pending) URL.revokeObjectURL(pending.src);
    setFactoryCropPending(null);
  }, []);

  const handleFactorySlotRemove = useCallback((slotId: FactoryImageSlotId) => {
    setFormData((prev) => {
      const existing = prev.factorySiteImages[slotId];
      if (existing?.url && existing.url.startsWith('blob:')) URL.revokeObjectURL(existing.url);
      const next = { ...prev.factorySiteImages };
      delete next[slotId];
      return { ...prev, factorySiteImages: next };
    });
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
      localLandlineStd: data.localLandlineStd || "",
      localLandlineNumber: data.localLandlineNumber || (data.landlineNumber ? parsePhone(data.landlineNumber).national : ""),
      intlLandlineCountryCode: data.intlLandlineCountryCode || parsePhone(data.intlLandline || "").dial,
      intlLandlineStd: data.intlLandlineStd || "",
      intlLandlineNumber: data.intlLandlineNumber || parsePhone(data.intlLandline || "").national,
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
      factorySiteCapacity: data.factorySiteCapacity || '',
      factorySiteImages: normaliseFactorySiteImages(data.factorySiteImages),
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

        // Typing within the "Others" custom input — both old and new values
        // are non-canonical (e.g. 'others' placeholder → user-typed string,
        // or updated string on every keystroke). Nothing to reset here.
        if (!BUSINESS_TYPE_IDS.has(oldType) && !BUSINESS_TYPE_IDS.has(newType)) {
          return { ...prev, businessType: newType };
        }

        // Business Type switched between distinct types: revoke any blob URLs
        // that are about to be cleared so the browser can reclaim the memory.
        if (prev.logoFile && typeof prev.logo === 'string') URL.revokeObjectURL(prev.logo);
        if (prev.gstFile && typeof prev.gstDocument === 'string') URL.revokeObjectURL(prev.gstDocument);
        if (prev.panCardFile && typeof prev.panCardDocument === 'string') URL.revokeObjectURL(prev.panCardDocument);
        if (prev.typeCertFile && typeof prev.typeCertDocument === 'string') URL.revokeObjectURL(prev.typeCertDocument);
        if (prev.iecCertFile && typeof prev.iecCertDocument === 'string') URL.revokeObjectURL(prev.iecCertDocument);
        if (prev.aadhaarFile && typeof prev.aadhaarDocument === 'string') URL.revokeObjectURL(prev.aadhaarDocument);

        return {
          ...prev,
          businessType: newType,
          companyName: '',
          // ── Company Logo ─────────────────────────────────────────────
          logo: null,
          logoFile: null,
          // ── Regulatory ID fields ─────────────────────────────────────
          gstNumber: '',
          companyIdNumber: '',
          iecCode: '',
          panNumber: '',
          aadhaarNumber: '',
          // ── Regulatory document uploads ──────────────────────────────
          gstDocument: null,
          gstFile: null,
          typeCertDocument: null,
          typeCertFile: null,
          iecCertDocument: null,
          iecCertFile: null,
          panCardDocument: null,
          panCardFile: null,
          aadhaarDocument: null,
          aadhaarFile: null,
          // Reset per-type stash buckets — fresh start for new type
          companyIdByType: {},
          typeCertByType: {},
        };
      }
      return { ...prev, [field]: value };
    });

    // When business type switches between distinct types, clear upload
    // error banners and touched flags for all regulatory fields so the
    // new-type form starts clean with no stale red states.
    if (field === 'businessType') {
      const prevType = formDataRef.current.businessType;
      if (value !== prevType && (BUSINESS_TYPE_IDS.has(prevType) || BUSINESS_TYPE_IDS.has(value))) {
        setLogoError(null);
        setGstError(null);
        setPanCardError(null);
        setTypeCertError(null);
        setIecCertError(null);
        setAadhaarError(null);
        setTouched((prev) => {
          const next = { ...prev };
          ['companyName', 'logo', 'gstNumber', 'gstDocument', 'companyIdNumber', 'typeCertDocument',
           'iecCode', 'iecCertDocument', 'panNumber', 'panCardDocument',
           'aadhaarNumber', 'aadhaarDocument'].forEach((k) => { delete next[k]; });
          return next;
        });
      }
    }

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
    }

    if (fieldError) {
      setErrors((prev) => ({ ...prev, [field]: fieldError }));
    } else if (['phone', 'phoneNumber2'].includes(field)) {
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
      label: 'Company Logo',
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
    // Reset the input so re-selecting the same file (e.g. after Remove) still fires onChange.
    e.target.value = '';
  }, [handleLogoFile]);

  const handleLogoDrop = useCallback((e: React.DragEvent<HTMLElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleLogoFile(file);
  }, [handleLogoFile]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLElement>) => {
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
      label: 'GST Certificate',
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
    // Reset the input so re-selecting the same file (e.g. after Remove) still fires onChange.
    e.target.value = '';
  }, [handleGstFile]);

  const handleGstDrop = useCallback((e: React.DragEvent<HTMLElement>) => {
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

  // ── Company PAN Card upload (mandatory for the four registered types,
  //    optional for custom "Others" vendors) ──────────────────────────
  const [panCardError, setPanCardError] = useState<string | null>(null);

  const handlePanCardFile = useCallback((file: File) => {
    const result = handleUpload(file, {
      label: formDataRef.current.businessType === 'proprietorship' ? 'Proprietor PAN Card' : 'Company PAN Card',
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
    // Reset the input so re-selecting the same file (e.g. after Remove) still fires onChange.
    e.target.value = '';
  }, [handlePanCardFile]);

  const handlePanCardDrop = useCallback((e: React.DragEvent<HTMLElement>) => {
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
    // Reset the input so re-selecting the same file (e.g. after Remove) still fires onChange.
    e.target.value = '';
  }, [handleTypeCertFile]);

  const handleTypeCertDrop = useCallback((e: React.DragEvent<HTMLElement>) => {
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
      label: 'IEC Certificate',
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
    // Reset the input so re-selecting the same file (e.g. after Remove) still fires onChange.
    e.target.value = '';
  }, [handleIecCertFile]);

  const handleIecCertDrop = useCallback((e: React.DragEvent<HTMLElement>) => {
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
      label: 'Aadhaar Card',
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
    // Reset the input so re-selecting the same file (e.g. after Remove) still fires onChange.
    e.target.value = '';
  }, [handleAadhaarFile]);

  const handleAadhaarDrop = useCallback((e: React.DragEvent<HTMLElement>) => {
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

  // ── Website reachability verification ─────────────────────────────
  type WebsiteStatus = 'idle' | 'checking' | 'verified' | 'error';
  const [websiteStatus, setWebsiteStatus] = useState<WebsiteStatus>('idle');
  const [websiteError, setWebsiteError] = useState('');
  const websiteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (websiteTimerRef.current) clearTimeout(websiteTimerRef.current);

    const raw = formData.website.trim();
    if (!raw) {
      setWebsiteStatus('idle');
      setWebsiteError('');
      return;
    }

    // Normalise: prepend https:// if the user omitted the scheme
    let urlStr = raw;
    if (!/^https?:\/\//i.test(raw)) urlStr = `https://${raw}`;

    let parsed: URL;
    try {
      parsed = new URL(urlStr);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') throw new Error();
    } catch {
      setWebsiteStatus('error');
      setWebsiteError('Enter a valid URL, e.g. https://example.com');
      return;
    }

    setWebsiteStatus('checking');
    websiteTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/check-url?url=${encodeURIComponent(parsed.toString())}`);
        const json = await res.json();
        if (json.reachable) {
          setWebsiteStatus('verified');
          setWebsiteError('');
        } else {
          setWebsiteStatus('error');
          setWebsiteError(json.error || 'Website could not be reached');
        }
      } catch {
        setWebsiteStatus('error');
        setWebsiteError('Could not verify — check your internet connection');
      }
    }, 800);

    return () => {
      if (websiteTimerRef.current) clearTimeout(websiteTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.website]);

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
      // PAN and IEC Code are optional but format-validated when provided.
      if (currentFormData.panNumber && !PAN_PATTERN.test(currentFormData.panNumber)) {
        newErrors.panNumber = 'PAN must be 5 letters + 4 digits + 1 letter (e.g. AAAAA0000A)';
      }
      if (currentFormData.iecCode && !/^[A-Z0-9]{10}$/i.test(currentFormData.iecCode)) {
        newErrors.iecCode = 'IEC Code must be exactly 10 alphanumeric characters';
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
        newErrors.panNumber = `${currentFormData.businessType === 'proprietorship' ? 'Proprietor PAN Number' : 'Company PAN Number'} is required`;
      } else if (!PAN_PATTERN.test(currentFormData.panNumber)) {
        newErrors.panNumber = 'PAN must be 5 letters + 4 digits + 1 letter (e.g. AAAAA0000A)';
      }
    }
    // "Others" (custom non-canonical type) — PAN is optional, format-check only.
    if (!typeMeta && !isUnregistered && currentFormData.panNumber && !PAN_PATTERN.test(currentFormData.panNumber)) {
      newErrors.panNumber = 'PAN must be 5 letters + 4 digits + 1 letter (e.g. AAAAA0000A)';
    }
    // Others Registration Number is required when a supporting document is uploaded.
    if (!typeMeta && !isUnregistered && currentFormData.typeCertDocument && !currentFormData.companyIdNumber) {
      newErrors.companyIdNumber = 'Registration number is required when a supporting document is uploaded';
    }

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

    // ── Required uploads ─────────────────────────────────────────────
    if (!currentFormData.logo) {
      newErrors.logo = 'Company Logo is required';
    }

    // Factory site photos are always required here — when sameAsWarehouse is
    // true the user still uploads them in this step and they sync to Warehouse.
    for (const slot of FACTORY_IMAGE_SLOTS) {
      if (slot.required && !currentFormData.factorySiteImages[slot.id]) {
        newErrors[`factorySiteImage:${slot.id}`] = `${slot.label} photo is required`;
      }
    }

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
      // Company PAN Card upload stays mandatory for the four registered types,
      // but is OPTIONAL for custom "Others" vendors (no typeMeta).
      if (typeMeta && !currentFormData.panCardDocument) {
        newErrors.panCardDocument = `${currentFormData.businessType === 'proprietorship' ? 'Proprietor PAN Card' : 'Company PAN Card'} upload is required`;
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
        ...FACTORY_IMAGE_SLOTS.map((s) => `factorySiteImage:${s.id}`),
      ];

      const firstErrorField = FIELD_ORDER.find(f => newErrors[f]);
      if (firstErrorField) {
        const targetSection = FIELD_SECTION_MAP[firstErrorField] ||
          (firstErrorField.startsWith('factorySiteImage:') ? 'photos' as SectionKey : undefined);
        if (targetSection) setActiveSection(targetSection);
      }

      const errorCount = Object.keys(newErrors).length;
      centerNotice.warning(
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

    // Assemble landline strings for backend/ReviewSubmit consumption
    const localLandline = (currentFormData.localLandlineStd + currentFormData.localLandlineNumber).trim();
    const intlLandline = (currentFormData.intlLandlineCountryCode + currentFormData.intlLandlineStd + currentFormData.intlLandlineNumber).replace(/^\+?$/, '');
    // These assembled keys are not in FormData so they flow through the [key:string]:any index
    updatedData.landlineNumber = localLandline || '';
    updatedData.intlLandline = intlLandline || '';

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
      // Mirror warehousing capacity so the Warehouse step shows the same value.
      updatedData.warehousingCapacity = currentFormData.factorySiteCapacity;
      // Sync factory photos to warehouse — WarehouseDetails displays them
      // as read-only when isLinked=true.
      updatedData.factoryImages = currentFormData.factorySiteImages;
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
      const optional = [formData.email2, formData.phoneNumber2, formData.localLandlineNumber, formData.intlLandlineNumber];
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
    if (section === 'photos') {
      const images = formData.factorySiteImages;
      const required = FACTORY_IMAGE_SLOTS.filter((s) => s.required);
      const filled = required.filter((s) => images[s.id]);
      if (filled.length === required.length) return 'complete';
      if (filled.length > 0) return 'partial';
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

          {/* Company Name + Company Logo — 2-col pair */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
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

            <DocUpload
              title="Company Logo"
              requiredMark="required"
              hint="PNG, JPG, WEBP or SVG · max 2 MB"
              inputId="logoUpload"
              accept="image/*"
              file={formData.logoFile}
              documentUrl={formData.logo}
              forceImagePreview
              fallbackName="logo.png"
              error={logoError || errors.logo}
              invalid={!!errors.logo}
              dataField="logo"
              onChange={handleLogoChange}
              onDrop={handleLogoDrop}
              onDragOver={handleDragOver}
              onRemove={handleRemoveLogo}
            />
          </div>

          {/* Regulatory IDs & Documents — each upload sits beside its number.
              Which fields/uploads appear per business type is unchanged from
              before; only their placement (inline vs a separate section) moved. */}
          <div className="rounded-xl bg-brand-50/40 border border-brand-100 p-4 space-y-4">
            <div>
              <h4 className="text-sm font-bold text-slate-800">Regulatory IDs &amp; Documents</h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Each document upload sits next to its number. Accepted: PDF, PNG, JPG, WEBP or DOC — max 5 MB each.
              </p>
            </div>

            {(() => {
              const meta = COMPANY_TYPE_META[formData.businessType as CompanyTypeId];
              const isUnreg = formData.businessType === UNREGISTERED_TYPE_ID;
              const isProp = formData.businessType === 'proprietorship';
              const panCardLabel = isProp ? 'Proprietor PAN Card' : (meta ? 'Company PAN Card' : 'PAN Card');
              const panNumberLabel = isProp ? 'Proprietor PAN Number' : (meta ? 'Company PAN Number' : 'PAN Number');
              const idErr = !!(errors.companyIdNumber && touched.companyIdNumber);
              const panErr = !!(errors.panNumber && touched.panNumber);
              const iecErr = !!(errors.iecCode && touched.iecCode);

              return (
                <>
                  {/* GST Number | GST Certificate */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">
                        GST Number{' '}
                        {!isUnreg && <span className="text-brand-500" aria-hidden="true">*</span>}
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
                    <DocUpload
                      title="GST Certificate"
                      requiredMark={isUnreg ? 'optional' : 'required'}
                      inputId="gstUpload"
                      accept="application/pdf,image/*,.doc,.docx"
                      file={formData.gstFile}
                      documentUrl={formData.gstDocument}
                      fallbackName="gst_certificate.pdf"
                      error={gstError || errors.gstDocument}
                      invalid={!!errors.gstDocument}
                      dataField="gstDocument"
                      onChange={handleGstChange}
                      onDrop={handleGstDrop}
                      onDragOver={handleDragOver}
                      onRemove={handleRemoveGst}
                    />
                  </div>

                  {/* Unregistered Vendor — Aadhaar Number | Aadhaar Card */}
                  {isUnreg && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
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
                      <DocUpload
                        title="Aadhaar Card"
                        requiredMark="required"
                        inputId="aadhaarUpload"
                        accept="application/pdf,image/*,.doc,.docx"
                        file={formData.aadhaarFile}
                        documentUrl={formData.aadhaarDocument}
                        fallbackName="aadhaar_card.pdf"
                        error={aadhaarError || errors.aadhaarDocument}
                        invalid={!!errors.aadhaarDocument}
                        dataField="aadhaarDocument"
                        onChange={handleAadhaarChange}
                        onDrop={handleAadhaarDrop}
                        onDragOver={handleDragOver}
                        onRemove={handleRemoveAadhaar}
                      />
                    </div>
                  )}

                  {/* Supported registered types (Proprietorship / Pvt Ltd /
                      Partnership / LLP) — IEC, the type-specific ID, and PAN,
                      each paired with its certificate. */}
                  {meta && (
                    <>
                      {/* IEC Code | IEC Certificate. For a Proprietorship the
                          IEC certificate IS the type-specific certificate
                          (typeCert handlers); for the other types it's the
                          separate optional IEC certificate (iecCert handlers). */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
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
                        {isProp ? (
                          <DocUpload
                            title="IEC Certificate"
                            requiredMark="none"
                            inputId="typeCertUpload"
                            accept="application/pdf,image/*,.doc,.docx"
                            file={formData.typeCertFile}
                            documentUrl={formData.typeCertDocument}
                            fallbackName="iec_certificate.pdf"
                            error={typeCertError || errors.typeCertDocument}
                            invalid={!!errors.typeCertDocument}
                            dataField="typeCertDocument"
                            onChange={handleTypeCertChange}
                            onDrop={handleTypeCertDrop}
                            onDragOver={handleDragOver}
                            onRemove={handleRemoveTypeCert}
                          />
                        ) : (
                          <DocUpload
                            title="IEC Certificate"
                            requiredMark="none"
                            inputId="iecCertUpload"
                            accept="application/pdf,image/*,.doc,.docx"
                            file={formData.iecCertFile}
                            documentUrl={formData.iecCertDocument}
                            fallbackName="iec_certificate.pdf"
                            error={iecCertError}
                            onChange={handleIecCertChange}
                            onDrop={handleIecCertDrop}
                            onDragOver={handleDragOver}
                            onRemove={handleRemoveIecCert}
                          />
                        )}
                      </div>

                      {/* Type-specific regulatory ID (CIN / Deed / LLPIN) |
                          its certificate — not shown for Proprietorship. */}
                      {!isProp && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
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
                          <DocUpload
                            title={meta.certLabel}
                            requiredMark="required"
                            inputId="typeCertUpload"
                            accept="application/pdf,image/*,.doc,.docx"
                            file={formData.typeCertFile}
                            documentUrl={formData.typeCertDocument}
                            fallbackName="certificate.pdf"
                            error={typeCertError || errors.typeCertDocument}
                            invalid={!!errors.typeCertDocument}
                            dataField="typeCertDocument"
                            onChange={handleTypeCertChange}
                            onDrop={handleTypeCertDrop}
                            onDragOver={handleDragOver}
                            onRemove={handleRemoveTypeCert}
                          />
                        </div>
                      )}

                      {/* Company PAN Number | PAN Card */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                        <div>
                          <label htmlFor="panNumber" className="block text-sm font-semibold text-slate-700 mb-1">
                            {panNumberLabel} <span className="text-brand-500" aria-hidden="true">*</span>
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
                        <DocUpload
                          title={panCardLabel}
                          requiredMark="required"
                          inputId="panCardUpload"
                          accept="application/pdf,image/*,.doc,.docx"
                          file={formData.panCardFile}
                          documentUrl={formData.panCardDocument}
                          fallbackName="pan_card.pdf"
                          error={panCardError || errors.panCardDocument}
                          invalid={!!errors.panCardDocument}
                          dataField="panCardDocument"
                          onChange={handlePanCardChange}
                          onDrop={handlePanCardDrop}
                          onDragOver={handleDragOver}
                          onRemove={handleRemovePanCard}
                        />
                      </div>
                    </>
                  )}

                  {/* Custom "Others" type or no type yet — show an optional
                      PAN Number + PAN Card pair, plus an Others Registration
                      Number alongside the Other Supporting Document upload. */}
                  {!meta && !isUnreg && (
                    <>
                      {/* PAN Number | PAN Card (both optional) */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                        <div>
                          <label htmlFor="panNumber" className="block text-sm font-semibold text-slate-700 mb-1">
                            {panNumberLabel}
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
                        <DocUpload
                          title={panCardLabel}
                          requiredMark="none"
                          inputId="panCardUpload"
                          accept="application/pdf,image/*,.doc,.docx"
                          file={formData.panCardFile}
                          documentUrl={formData.panCardDocument}
                          fallbackName="pan_card.pdf"
                          error={panCardError || errors.panCardDocument}
                          invalid={!!errors.panCardDocument}
                          dataField="panCardDocument"
                          onChange={handlePanCardChange}
                          onDrop={handlePanCardDrop}
                          onDragOver={handleDragOver}
                          onRemove={handleRemovePanCard}
                        />
                      </div>

                      {/* Others Registration Number | Other Supporting Document */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                        <div>
                          <label htmlFor="companyIdNumber" className="block text-sm font-semibold text-slate-700 mb-1">
                            Others Registration Number
                          </label>
                          <input
                            id="companyIdNumber"
                            type="text"
                            name="companyIdNumber"
                            value={formData.companyIdNumber}
                            onChange={(e) => handleInputChange('companyIdNumber', e.target.value)}
                            onBlur={() => handleBlur('companyIdNumber')}
                            maxLength={120}
                            spellCheck={false}
                            autoComplete="off"
                            aria-describedby={idErr ? 'companyIdNumber-error' : undefined}
                            aria-invalid={idErr}
                            className={`w-full text-sm font-medium px-4 py-2.5 border rounded-lg transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:border-brand-500 ${
                              idErr ? 'border-red-500 bg-red-50' : 'border-slate-300 hover:border-slate-400'
                            }`}
                            placeholder="Registration / certificate number"
                          />
                          {idErr && (
                            <p id="companyIdNumber-error" className="text-red-500 text-xs mt-1" role="alert">{errors.companyIdNumber}</p>
                          )}
                        </div>
                        <DocUpload
                          title="Other Supporting Document"
                          requiredMark="none"
                          hint="Trust / Society / NGO / Section 8 / other registration proof"
                          inputId="typeCertUpload"
                          accept="application/pdf,image/*,.doc,.docx"
                          file={formData.typeCertFile}
                          documentUrl={formData.typeCertDocument}
                          fallbackName="supporting_document.pdf"
                          error={typeCertError}
                          onChange={handleTypeCertChange}
                          onDrop={handleTypeCertDrop}
                          onDragOver={handleDragOver}
                          onRemove={handleRemoveTypeCert}
                        />
                      </div>
                    </>
                  )}

                  {/* Unregistered Vendor — PAN Number + PAN Card (optional),
                      then IEC Code + IEC Certificate (optional). */}
                  {isUnreg && (
                    <>
                      {/* PAN Number | PAN Card */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                        <div>
                          <label htmlFor="panNumber" className="block text-sm font-semibold text-slate-700 mb-1">
                            {panNumberLabel}
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
                        <DocUpload
                          title={panCardLabel}
                          requiredMark="none"
                          inputId="panCardUpload"
                          accept="application/pdf,image/*,.doc,.docx"
                          file={formData.panCardFile}
                          documentUrl={formData.panCardDocument}
                          fallbackName="pan_card.pdf"
                          error={panCardError || errors.panCardDocument}
                          invalid={!!errors.panCardDocument}
                          dataField="panCardDocument"
                          onChange={handlePanCardChange}
                          onDrop={handlePanCardDrop}
                          onDragOver={handleDragOver}
                          onRemove={handleRemovePanCard}
                        />
                      </div>

                      {/* IEC Code | IEC Certificate */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
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
                        <DocUpload
                          title="IEC Certificate"
                          requiredMark="none"
                          inputId="iecCertUpload"
                          accept="application/pdf,image/*,.doc,.docx"
                          file={formData.iecCertFile}
                          documentUrl={formData.iecCertDocument}
                          fallbackName="iec_certificate.pdf"
                          error={iecCertError}
                          onChange={handleIecCertChange}
                          onDrop={handleIecCertDrop}
                          onDragOver={handleDragOver}
                          onRemove={handleRemoveIecCert}
                        />
                      </div>
                    </>
                  )}
                </>
              );
            })()}
          </div>
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

          {/* Landlines + Website */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>Local Landline</span>
              </label>
              <LocalLandlineInput
                locked
                value={{ countryCode: '+91', std: formData.localLandlineStd, number: formData.localLandlineNumber }}
                onChange={(v: LocalLandlineValue) => {
                  handleInputChange('localLandlineStd', v.std);
                  handleInputChange('localLandlineNumber', v.number);
                }}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>International Landline</span>
              </label>
              <LocalLandlineInput
                value={{ countryCode: formData.intlLandlineCountryCode, std: formData.intlLandlineStd, number: formData.intlLandlineNumber }}
                onChange={(v: LocalLandlineValue) => {
                  handleInputChange('intlLandlineCountryCode', v.countryCode);
                  handleInputChange('intlLandlineStd', v.std);
                  handleInputChange('intlLandlineNumber', v.number);
                }}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>Website</span>
              </label>
              <div className="relative">
                <input
                  type="url"
                  name="website"
                  value={formData.website}
                  onChange={(e) => handleInputChange("website", e.target.value)}
                  className={`w-full text-sm font-medium px-4 py-2.5 border rounded-lg transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:border-brand-500 ${
                    websiteStatus === 'verified'
                      ? 'border-emerald-400 pr-28'
                      : websiteStatus === 'error'
                      ? 'border-red-400 bg-red-50/40 pr-28'
                      : websiteStatus === 'checking'
                      ? 'border-slate-300 pr-28'
                      : 'border-slate-300 hover:border-slate-400'
                  }`}
                  placeholder="www.yourcompany.com"
                  autoComplete="url"
                />
                {/* Inline status badge — absolutely positioned inside the input */}
                {websiteStatus !== 'idle' && (
                  <span
                    className={`absolute right-3 top-1/2 -translate-y-1/2 inline-flex items-center gap-1 text-xs font-semibold pointer-events-none select-none ${
                      websiteStatus === 'verified'
                        ? 'text-emerald-600'
                        : websiteStatus === 'error'
                        ? 'text-red-500'
                        : 'text-slate-400'
                    }`}
                  >
                    {websiteStatus === 'checking' && (
                      <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Checking…</>
                    )}
                    {websiteStatus === 'verified' && (
                      <><CheckCircle2 className="w-3.5 h-3.5" /> Verified</>
                    )}
                    {websiteStatus === 'error' && (
                      <><AlertCircle className="w-3.5 h-3.5" /> Unreachable</>
                    )}
                  </span>
                )}
              </div>
              {/* Error detail shown below the field */}
              {websiteStatus === 'error' && websiteError && (
                <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                  {websiteError}
                </p>
              )}
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
                centerNotice.info('Address Auto-filled', s.displayName);
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
              {zipPlaces.length > 1 ? (
                <ZipAreaSelect
                  places={zipPlaces}
                  value={formData.city}
                  onChange={(p) => {
                    handleInputChange("city", p.area || p.city);
                    handleInputChange("state", p.state);
                  }}
                  onBlur={() => handleBlur("city")}
                  invalid={!!(errors.city && touched.city)}
                />
              ) : (
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
              )}
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
                  onChange={(e) => {
                    handleInputChange("zipCode", e.target.value);
                    if (!e.target.value.trim()) clearZip();
                    else if (e.target.value.trim().length >= 6) runZipLookup(e.target.value, formData.country);
                  }}
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
              <p className="mt-1 text-xs text-slate-400">
                Enter ZIP/PIN Code to automatically fetch available State, District, City, and Area details.
              </p>
              {errors.zipCode && touched.zipCode && (
                <p className="text-red-500 text-xs mt-1" role="alert">{errors.zipCode}</p>
              )}
            </div>
          </div>

          {/* Warehousing Capacity */}
          <div className="w-full max-w-xs">
            <label htmlFor="factorySiteCapacity" className="block text-sm font-semibold text-slate-700 mb-1">
              Warehousing Capacity{' '}
              <span className="text-slate-400 text-xs font-normal">(sq ft, optional)</span>
            </label>
            <p className="text-xs text-slate-500 mb-3">Total floor area of your factory / warehouse site.</p>
            <div className="flex items-stretch border border-slate-300 hover:border-slate-400 rounded-lg overflow-hidden transition-colors focus-within:ring-2 focus-within:ring-brand-500/40 focus-within:border-brand-500">
              <input
                id="factorySiteCapacity"
                type="number"
                name="factorySiteCapacity"
                value={formData.factorySiteCapacity || ''}
                onChange={(e) => handleInputChange('factorySiteCapacity', e.target.value)}
                onBlur={() => handleBlur('factorySiteCapacity')}
                className="flex-1 min-w-0 text-sm font-medium pl-4 pr-2 py-2.5 border-0 outline-none bg-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                placeholder="e.g. 50000"
                min="0"
              />
              <span className="flex items-center px-3 text-sm font-semibold text-slate-500 bg-slate-50 border-l border-slate-200 select-none whitespace-nowrap">sq ft</span>
            </div>
          </div>
        </AccordionSection>

        {/* ── SECTION 4 — Factory & Facility Photos ──────────────────── */}
        <AccordionSection
          {...sectionProps('photos')}
          icon={<Camera className="w-5 h-5" />}
          title="Factory & Facility Photos"
          subtitle="Upload photos of your factory site for quality inspection records."
        >
          <div className="space-y-5">
            <p className="text-sm text-slate-500">
              Upload photos for each location. All required slots must be filled before proceeding.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {FACTORY_IMAGE_SLOTS.map((slot) => {
                const img = formData.factorySiteImages[slot.id as FactoryImageSlotId];
                const errKey = `factorySiteImage:${slot.id}` as keyof typeof errors;
                const hasErr = !!(errors[errKey] && (touched[errKey] || errors[errKey]));

                return (
                  <div key={slot.id} className="flex flex-col gap-2">
                    <p className="text-xs font-semibold text-slate-700 truncate">
                      {slot.label}
                      {slot.required && <span className="text-red-500 ml-0.5">*</span>}
                    </p>
                    <p className="text-[11px] text-slate-400 leading-tight -mt-1">{slot.description}</p>

                    {img?.url ? (
                      /* ── Filled slot ─────────────────────────────── */
                      <div className="relative aspect-[4/3] rounded-xl overflow-hidden border border-slate-200 bg-slate-50 group">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={img.url} alt={slot.label} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <button
                            type="button"
                            title="View"
                            onClick={() => window.open(img.url, '_blank')}
                            className="flex items-center justify-center w-8 h-8 rounded-full bg-white/90 text-slate-700 hover:bg-white transition-colors"
                          >
                            <Eye className="w-4 h-4" aria-hidden="true" />
                          </button>
                          <label
                            title="Replace"
                            className="flex items-center justify-center w-8 h-8 rounded-full bg-white/90 text-slate-700 hover:bg-white transition-colors cursor-pointer"
                          >
                            <Upload className="w-4 h-4" aria-hidden="true" />
                            <input
                              type="file"
                              accept={SITE_IMAGE_ALLOWED_TYPES.join(',')}
                              className="sr-only"
                              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFactorySlotUpload(slot.id as FactoryImageSlotId, f); e.target.value = ''; }}
                            />
                          </label>
                          <button
                            type="button"
                            title="Remove"
                            onClick={() => handleFactorySlotRemove(slot.id as FactoryImageSlotId)}
                            className="flex items-center justify-center w-8 h-8 rounded-full bg-white/90 text-red-500 hover:bg-white transition-colors"
                          >
                            <X className="w-4 h-4" aria-hidden="true" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* ── Empty slot ──────────────────────────────── */
                      <label
                        className={`aspect-[4/3] rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors ${
                          hasErr
                            ? 'border-red-400 bg-red-50 hover:border-red-500'
                            : 'border-slate-300 bg-slate-50 hover:border-brand-400 hover:bg-brand-50/30'
                        }`}
                      >
                        <Camera className={`w-7 h-7 ${hasErr ? 'text-red-400' : 'text-slate-400'}`} aria-hidden="true" />
                        <span className={`text-xs font-medium ${hasErr ? 'text-red-500' : 'text-slate-500'}`}>
                          Upload photo
                        </span>
                        <input
                          type="file"
                          accept={SITE_IMAGE_ALLOWED_TYPES.join(',')}
                          className="sr-only"
                          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFactorySlotUpload(slot.id as FactoryImageSlotId, f); e.target.value = ''; }}
                        />
                      </label>
                    )}

                    {hasErr && (
                      <p className="text-red-500 text-xs mt-0.5" role="alert">{errors[errKey]}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </AccordionSection>

        {/* ── Same as Warehouse Checkbox — placed after photos so user
              fills everything first, then decides to link ─────────── */}
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
                Same as Warehouse Address &amp; Warehouse Photos
              </div>
              <div className="text-xs text-slate-500 leading-relaxed">
                Check this if your warehouse uses the same address, capacity, and photos as your factory site.
                All Warehouse fields will be pre-filled and locked when you reach the Warehouse step.
              </div>
            </div>
          </label>
        </div>

      </div>{/* end accordion sections */}

      {/* ── Factory Image Crop Modal ────────────────────────────────────── */}
      <ImageCropModal
        src={factoryCropPending?.src ?? null}
        fileName={factoryCropPending?.fileName}
        title="Crop Factory Image"
        cropShape="rect"
        showGrid={true}
        onCancel={handleFactoryCropCancel}
        onCropped={handleFactoryCropConfirm}
      />

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
