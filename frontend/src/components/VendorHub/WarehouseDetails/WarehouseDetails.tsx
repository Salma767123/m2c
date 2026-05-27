"use client";

import { useCallback, useState } from "react";

import { Button } from "@/components/UI/Button";
import LocationPicker from "@/components/UI/LocationPicker";
import {
  Warehouse,
  Upload,
  MapPin,
  Camera,
  Map,
  X,
  ShieldUser,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";
import { CountrySelect, ToggleButton } from "@/components/VendorHub/FormUI";
import { scrollToFirstError } from "@/lib/formErrorScroll";
import { showErrorToast, handleUpload } from "@/lib/toast-utils";

interface WarehouseDetailsProps {
  onNext: () => void;
  onPrev: () => void;
  onUpdateData: (data: any) => void;
  data: any;
}

const ownershipTypes = [
  { id: "owned", label: "Owned", description: "You own the facility" },
  { id: "rented", label: "Rented", description: "Monthly rental agreement" },
  { id: "lease", label: "Lease", description: "Long-term lease agreement" },
];

// ── Factory image slots (Change 11) ────────────────────────────────────
// Named upload slots replace the previous generic "drop images here" zone.
// Required slots block submit; optional ones surface a "Recommended" hint.
type FactoryImageSlotId =
  | 'nameBoard'
  | 'frontView'
  | 'backView'
  | 'leftView'
  | 'rightView'
  | 'roadView'
  | 'insideFactory'
  | 'others';

interface FactoryImageSlotConfig {
  id: FactoryImageSlotId;
  label: string;
  description: string;
  required: boolean;
}

interface FactoryImageValue {
  file: File | null;
  url: string;
  name: string;
}

const FACTORY_IMAGE_SLOTS: FactoryImageSlotConfig[] = [
  { id: 'nameBoard', label: 'Factory Name Board', description: 'Signage showing the factory name', required: true },
  { id: 'frontView', label: 'Front View', description: 'Main entrance / facade', required: true },
  { id: 'backView', label: 'Back View', description: 'Rear of the building', required: false },
  { id: 'leftView', label: 'Left View', description: 'Left-side elevation', required: false },
  { id: 'rightView', label: 'Right View', description: 'Right-side elevation', required: false },
  { id: 'roadView', label: 'Road View', description: 'Approach road / driveway', required: false },
  { id: 'insideFactory', label: 'Inside Factory', description: 'Production floor or interior', required: false },
  { id: 'others', label: 'Others', description: 'Any additional photo', required: false },
];

// File size constraints — Change 12: display in KB across the product.
const FACTORY_IMAGE_ALLOWED_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
];
const FACTORY_IMAGE_MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const FACTORY_IMAGE_MAX_LABEL = '10,240 KB';

// Read incoming `data.factoryImages` — could be the new record shape or
// the legacy array; tolerate both during the transition.
function normaliseFactoryImages(
  raw: unknown,
): Partial<Record<FactoryImageSlotId, FactoryImageValue>> {
  if (!raw) return {};
  if (Array.isArray(raw)) {
    const out: Partial<Record<FactoryImageSlotId, FactoryImageValue>> = {};
    for (const item of raw) {
      const slotId = item?.slotId as FactoryImageSlotId | undefined;
      if (slotId && FACTORY_IMAGE_SLOTS.some((s) => s.id === slotId)) {
        out[slotId] = {
          file: item.file ?? null,
          url: item.url ?? '',
          name: item.name ?? '',
        };
      }
    }
    return out;
  }
  if (typeof raw === 'object') {
    return raw as Partial<Record<FactoryImageSlotId, FactoryImageValue>>;
  }
  return {};
}

export default function WarehouseDetails({
  onNext,
  onPrev,
  onUpdateData,
  data,
}: WarehouseDetailsProps) {
  const [formData, setFormData] = useState({
    ownershipType: data.ownershipType || "",
    warehousingCapacity: data.warehousingCapacity || "",
    warehouseAddress: data.warehouseAddress || "",
    /** Address Line 2 — apartment / suite / floor (optional). */
    warehouseAddressLine2: data.warehouseAddressLine2 || "",
    /** Address Line 3 — building name, block, complex (optional). */
    warehouseAddressLine3: data.warehouseAddressLine3 || "",
    /** Landmark — nearby reference for delivery/locating (optional). */
    warehouseLandmark: data.warehouseLandmark || "",
    warehouseCity: data.warehouseCity || "",
    warehouseState: data.warehouseState || "",
    warehouseZip: data.warehouseZip || "",
    // Fall back to the company country first (matches whatever the user
    // already picked on the previous step) before any hard-coded default.
    // Keeps the two steps consistent when "Same as warehouse" is off but
    // the warehouse is still in the same country (the common case).
    warehouseCountry: data.warehouseCountry || data.country || "India",
    factoryImages: normaliseFactoryImages(data.factoryImages),
    mapLink: data.mapLink || "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Render-phase sync (Vercel §5.1 — same pattern as CompanyDetails) to
  // avoid the `react-hooks/set-state-in-effect` rule that flags state
  // updates inside useEffect. When the `data` prop reference changes
  // (e.g. VendorPanel got a real-time push from CompanyDetails), we
  // rebuild the local state directly during render.
  const [prevData, setPrevData] = useState(data);
  if (data !== prevData) {
    setPrevData(data);
    setFormData({
      ownershipType: data.ownershipType || "",
      warehousingCapacity: data.warehousingCapacity || "",
      warehouseAddress: data.warehouseAddress || "",
      warehouseAddressLine2: data.warehouseAddressLine2 || "",
      warehouseAddressLine3: data.warehouseAddressLine3 || "",
      warehouseLandmark: data.warehouseLandmark || "",
      warehouseCity: data.warehouseCity || "",
      warehouseState: data.warehouseState || "",
      warehouseZip: data.warehouseZip || "",
      // Fall back to the company country first (matches whatever the user
      // already picked on the previous step) before any hard-coded default.
      warehouseCountry: data.warehouseCountry || data.country || "India",
      factoryImages: normaliseFactoryImages(data.factoryImages),
      mapLink: data.mapLink || "",
    });
  }

  // ── "Same as warehouse address" link state ──────────────────────────
  // CompanyDetails sets `data.sameAsWarehouse` and streams the address +
  // ownership values up to VendorPanel in real time. When that's on we
  // show a banner, lock the inputs, and route "edit" back to the previous
  // step rather than letting the user fight the live sync.
  const isLinked = data.sameAsWarehouse === true;

  // Stable handler references (vercel-react: rerender-functional-setstate) —
  // useCallback prevents child components like LocationPicker and ToggleButton
  // from re-rendering just because the parent re-rendered.
  const handleInputChange = useCallback(
    (field: string, value: any) => {
      // Defensive: ignore edits while linked. The UI disables inputs but a
      // programmatic call shouldn't be able to bypass the lock either.
      if (isLinked) return;
      setFormData((prev) => ({ ...prev, [field]: value }));
      // Clear error when user starts typing
      setErrors((prev) => (prev[field] ? { ...prev, [field]: '' } : prev));
    },
    [isLinked],
  );

  const handleBlur = useCallback((field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }, []);

  const handleNext = useCallback(() => {
    const newErrors: Record<string, string> = {};

    // When linked from CompanyDetails, ownership + address are already
    // validated upstream and locked here. Skip the per-field required
    // checks — they'd never fail (CompanyDetails blocked submit) and the
    // user has no way to fix anything from this step. We still validate
    // the map link since that's specific to the warehouse.
    if (!isLinked) {
      if (!formData.ownershipType)
        newErrors.ownershipType = 'Please select a facility ownership type';
      if (!formData.warehouseAddress)
        newErrors.warehouseAddress = 'Address Line 1 is required';
      if (!formData.warehouseCity) newErrors.warehouseCity = 'City is required';
      if (!formData.warehouseState) newErrors.warehouseState = 'State is required';
      if (!formData.warehouseZip)
        newErrors.warehouseZip = 'ZIP / postal code is required';
      if (!formData.warehouseCountry)
        newErrors.warehouseCountry = 'Please select a country';
    }
    if (!formData.mapLink) {
      newErrors.mapLink = 'Drop a pin on the map or paste a Google Maps link';
    }

    // Required factory image slots (Change 11)
    for (const slot of FACTORY_IMAGE_SLOTS) {
      if (slot.required && !formData.factoryImages[slot.id]) {
        newErrors[`factoryImage:${slot.id}`] = `${slot.label} photo is required`;
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      const allTouched: Record<string, boolean> = {};
      Object.keys(newErrors).forEach((key) => {
        allTouched[key] = true;
      });
      setTouched(allTouched);

      const errorCount = Object.keys(newErrors).length;
      showErrorToast(
        errorCount === 1
          ? '1 field needs your attention'
          : `${errorCount} fields need your attention`,
        'Scroll down to the highlighted field and fix it to continue.',
      );

      // Wait one tick so React paints the error styling before we measure
      // the scroll target.
      requestAnimationFrame(() => {
        scrollToFirstError(newErrors, {
          fieldOrder: [
            'ownershipType',
            'warehouseAddress',
            'warehouseCity',
            'warehouseState',
            'warehouseZip',
            'warehouseCountry',
            ...FACTORY_IMAGE_SLOTS.map((s) => `factoryImage:${s.id}`),
            'mapLink',
          ],
          selectorMap: {
            ownershipType: '[data-field="ownershipType"]',
            warehouseCountry: '[data-field="warehouseCountry"]',
            mapLink: '[data-field-name="mapLink"]',
            // Slot anchors use the same `data-field="factoryImage:<id>"`
            // attribute the helper's default selector falls through to.
          },
        });
      });
      return;
    }

    onUpdateData(formData);
    onNext();
  }, [formData, isLinked, onNext, onUpdateData]);

  // ── Factory image slots (Change 11) ────────────────────────────────
  // Single-image-per-slot upload handler. Validates with the shared
  // toast helper, revokes prior blob URLs on replace, and clears any
  // submit-time error for the slot.
  const handleSlotUpload = useCallback(
    (slotId: FactoryImageSlotId, file: File) => {
      const slot = FACTORY_IMAGE_SLOTS.find((s) => s.id === slotId);
      const label = slot ? slot.label : 'Image';
      const result = handleUpload(file, {
        label,
        allowedTypes: FACTORY_IMAGE_ALLOWED_TYPES,
        allowedLabel: 'PNG, JPG, WEBP, or GIF',
        maxBytes: FACTORY_IMAGE_MAX_BYTES,
        maxLabel: FACTORY_IMAGE_MAX_LABEL,
      });
      if (!result.ok) return;

      setFormData((prev) => {
        const existing = prev.factoryImages[slotId];
        if (existing?.url && existing.file) {
          URL.revokeObjectURL(existing.url);
        }
        return {
          ...prev,
          factoryImages: {
            ...prev.factoryImages,
            [slotId]: {
              file,
              url: URL.createObjectURL(file),
              name: file.name,
            },
          },
        };
      });
      const errKey = `factoryImage:${slotId}`;
      setErrors((prev) => (prev[errKey] ? { ...prev, [errKey]: '' } : prev));
    },
    [],
  );

  const handleSlotRemove = useCallback((slotId: FactoryImageSlotId) => {
    setFormData((prev) => {
      const existing = prev.factoryImages[slotId];
      if (existing?.url && existing.file) {
        URL.revokeObjectURL(existing.url);
      }
      const { [slotId]: _removed, ...rest } = prev.factoryImages;
      return { ...prev, factoryImages: rest };
    });
  }, []);

  // ── Accordion Section State ────────────────────────────────────────
  type SectionKey = 'ownership' | 'address' | 'photos' | 'map';
  const [activeSection, setActiveSection] = useState<SectionKey>('ownership');

  // Maps error field keys → their parent accordion section
  const FIELD_SECTION_MAP: Record<string, SectionKey> = {
    ownershipType: 'ownership',
    warehousingCapacity: 'ownership',
    warehouseAddress: 'address',
    warehouseCity: 'address',
    warehouseState: 'address',
    warehouseZip: 'address',
    warehouseCountry: 'address',
    mapLink: 'map',
  };
  // factory image slot errors are handled separately in the photos section

  const getSectionStatus = (section: SectionKey): 'complete' | 'partial' | 'empty' => {
    if (section === 'ownership') {
      if (formData.ownershipType) return 'complete';
      return 'empty';
    }
    if (section === 'address') {
      if (isLinked) {
        return formData.warehouseAddress && formData.warehouseCity ? 'complete' : 'partial';
      }
      const required = [formData.warehouseAddress, formData.warehouseCity, formData.warehouseState, formData.warehouseZip, formData.warehouseCountry];
      const filled = required.filter(Boolean).length;
      if (filled === required.length) return 'complete';
      if (filled > 0) return 'partial';
      return 'empty';
    }
    if (section === 'photos') {
      const requiredSlots = FACTORY_IMAGE_SLOTS.filter((s) => s.required);
      const optionalSlots = FACTORY_IMAGE_SLOTS.filter((s) => !s.required);
      const requiredDone = requiredSlots.every((s) => !!formData.factoryImages[s.id]);
      const anyFilled = FACTORY_IMAGE_SLOTS.some((s) => !!formData.factoryImages[s.id]);
      if (requiredDone && optionalSlots.every((s) => !!formData.factoryImages[s.id])) return 'complete';
      if (requiredDone) return 'complete';
      if (anyFilled) return 'partial';
      return 'empty';
    }
    if (section === 'map') {
      if (formData.mapLink) return 'complete';
      return 'empty';
    }
    return 'empty';
  };

  const hasSectionErrors = (section: SectionKey): boolean => {
    const directErrors = Object.keys(errors).filter(
      (k) => FIELD_SECTION_MAP[k] === section && errors[k] && touched[k]
    );
    if (directErrors.length > 0) return true;
    if (section === 'photos') {
      return FACTORY_IMAGE_SLOTS.some((s) => {
        const k = `factoryImage:${s.id}`;
        return errors[k] && touched[k];
      });
    }
    return false;
  };

  // AccordionSection — inline component (same pattern as Step 1)
  const AccordionSection = ({
    id,
    icon,
    title,
    subtitle,
    children,
  }: {
    id: SectionKey;
    icon: React.ReactNode;
    title: string;
    subtitle: string;
    children: React.ReactNode;
  }) => {
    const isOpen = activeSection === id;
    const status = getSectionStatus(id);
    const hasErrors = hasSectionErrors(id);

    return (
      <div
        className={`rounded-xl border transition-all duration-300 ${!isOpen ? 'overflow-hidden' : ''} ${
          isOpen
            ? 'border-brand-300 shadow-md shadow-brand-500/8'
            : hasErrors
            ? 'border-red-300 bg-red-50/30'
            : 'border-slate-200 hover:border-slate-300'
        }`}
      >
        <button
          type="button"
          onClick={() => setActiveSection(isOpen ? id : id)}
          className={`w-full rounded-t-xl flex items-center gap-4 px-5 py-4 text-left transition-colors duration-200 ${
            isOpen ? 'bg-gradient-to-r from-brand-50/80 to-white' : 'bg-white hover:bg-slate-50/60'
          }`}
          aria-expanded={isOpen}
          aria-controls={`wh-section-${id}`}
        >
          <div
            className={`flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-lg transition-colors duration-200 ${
              isOpen
                ? 'bg-brand-500 text-white'
                : hasErrors
                ? 'bg-red-100 text-red-600'
                : status === 'complete'
                ? 'bg-emerald-100 text-emerald-600'
                : 'bg-slate-100 text-slate-500'
            }`}
          >
            {icon}
          </div>

          <div className="flex-1 min-w-0">
            <p className={`font-semibold text-sm leading-tight ${isOpen ? 'text-brand-700' : 'text-slate-800'}`}>
              {title}
            </p>
            <p className="text-xs text-slate-500 mt-0.5 truncate">{subtitle}</p>
          </div>

          <div className="flex-shrink-0 flex items-center gap-2">
            {hasErrors && !isOpen && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-600 text-xs font-semibold">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                Fix required
              </span>
            )}
            {!hasErrors && status === 'complete' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Done
              </span>
            )}
            {!hasErrors && status === 'partial' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold">
                In progress
              </span>
            )}
            <svg
              className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </button>

        <div
          id={`wh-section-${id}`}
          className={`transition-all duration-300 ${
            isOpen ? 'max-h-[9999px] opacity-100' : 'max-h-0 opacity-0 pointer-events-none overflow-hidden'
          }`}
          aria-hidden={!isOpen}
        >
          <div className="px-5 pb-6 pt-2 space-y-5 border-t border-slate-100">
            {children}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-4 sm:px-6 sm:py-6 font-sans animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div className="flex items-start gap-4 pb-5 border-b border-slate-100 mb-5">
        <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-brand-500 text-white shrink-0 shadow-sm">
          <Warehouse className="w-5 h-5" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-bold text-slate-900 leading-tight">
            Warehouse Details
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Provide details of your warehouse facility, photos, and location.
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-medium text-slate-600 shrink-0">
          <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
          Step 2 of 8
        </div>
      </div>

      {/* ── Linked-address banner (when Same as warehouse is ON) ─────────── */}
      {isLinked && (
        <div
          role="status"
          aria-live="polite"
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-xl border border-brand-300/40 bg-brand-50/60 px-5 py-4 mb-4"
        >
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-brand-100 text-brand-600 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M9.243 3.03a1 1 0 01.727 1.213L9.53 6h2.94l.56-2.243a1 1 0 111.94.486L14.53 6H17a1 1 0 110 2h-2.97l-1 4H15a1 1 0 110 2h-2.47l-.56 2.242a1 1 0 11-1.94-.485L10.47 14H7.53l-.56 2.242a1 1 0 11-1.94-.485L5.47 14H3a1 1 0 110-2h2.97l1-4H5a1 1 0 110-2h2.47l.56-2.243a1 1 0 011.213-.727zM7.97 8l-1 4h2.94l1-4H7.97z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-brand-800">Address inherited from Company Details</p>
              <p className="text-xs text-brand-700 mt-0.5 leading-relaxed">
                Ownership and address are synced from Step 1. To enter different details, go back and uncheck{' '}
                <em>&ldquo;Same as warehouse address&rdquo;</em>.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onPrev}
            className="shrink-0 w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-brand-700 bg-white border border-brand-400/40 rounded-lg hover:bg-brand-50 hover:border-brand-500 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 shadow-sm"
          >
            <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
            Edit on Company Details
          </button>
        </div>
      )}

      {/* ── Accordion Sections ──────────────────────────────────────────── */}
      <div className="space-y-3">

        {/* ═══════════════════════════════════════════════════════════════
            SECTION 1 — Facility Ownership & Capacity
            ═══════════════════════════════════════════════════════════════ */}
        <AccordionSection
          id="ownership"
          icon={<ShieldUser className="w-4 h-4" aria-hidden="true" />}
          title="Facility Ownership & Capacity"
          subtitle="How you hold the warehouse and its total floor area"
        >
          {/* Ownership Type Chips */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              Ownership Type{' '}
              {!isLinked && <span className="text-brand-500" aria-hidden="true">*</span>}
            </label>
            <p className="text-xs text-slate-500 mb-3">
              Select the type of ownership for your warehouse facility.
            </p>
            <div
              className="flex flex-wrap gap-2.5"
              role="radiogroup"
              aria-label="Facility ownership"
              aria-disabled={isLinked}
              data-field="ownershipType"
            >
              {ownershipTypes.map((type) => (
                <ToggleButton
                  key={type.id}
                  selected={formData.ownershipType === type.id}
                  invalid={!isLinked && !!(errors.ownershipType && touched.ownershipType)}
                  disabled={isLinked}
                  onClick={() => handleInputChange('ownershipType', type.id)}
                >
                  <span className="font-semibold">{type.label}</span>
                  <span className="hidden sm:inline text-xs opacity-70 ml-1">— {type.description}</span>
                </ToggleButton>
              ))}
            </div>
            {errors.ownershipType && touched.ownershipType && !isLinked && (
              <p className="text-red-600 text-xs mt-2 font-medium" role="alert">
                {errors.ownershipType}
              </p>
            )}
          </div>

          {/* Warehousing Capacity */}
          <div className="max-w-xs">
            <label htmlFor="warehousingCapacity" className="block text-sm font-semibold text-slate-700 mb-1">
              Warehousing Capacity{' '}
              <span className="text-slate-400 text-xs font-normal">(sq ft, optional)</span>
            </label>
            <div className="relative">
              <input
                id="warehousingCapacity"
                type="number"
                name="warehousingCapacity"
                value={formData.warehousingCapacity}
                onChange={(e) => handleInputChange('warehousingCapacity', e.target.value)}
                onBlur={() => handleBlur('warehousingCapacity')}
                disabled={isLinked}
                readOnly={isLinked}
                aria-readonly={isLinked}
                className={`w-full text-sm font-medium px-4 py-2.5 border rounded-lg outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:border-brand-500 ${
                  isLinked
                    ? 'bg-slate-50 text-slate-500 border-slate-200 cursor-not-allowed'
                    : 'border-slate-300 hover:border-slate-400'
                }`}
                placeholder="e.g. 50000"
                min="0"
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">sq ft</span>
            </div>
          </div>
        </AccordionSection>

        {/* ═══════════════════════════════════════════════════════════════
            SECTION 2 — Warehouse Address
            ═══════════════════════════════════════════════════════════════ */}
        <AccordionSection
          id="address"
          icon={<MapPin className="w-4 h-4" aria-hidden="true" />}
          title="Warehouse Address"
          subtitle="Physical location of your warehouse facility"
        >
          {/* Address Line 1 */}
          <div>
            <label htmlFor="warehouseAddress" className="block text-sm font-semibold text-slate-700 mb-1">
              Address Line 1{' '}
              {!isLinked && <span className="text-brand-500" aria-hidden="true">*</span>}
            </label>
            <input
              id="warehouseAddress"
              type="text"
              name="warehouseAddress"
              value={formData.warehouseAddress}
              onChange={(e) => handleInputChange('warehouseAddress', e.target.value)}
              onBlur={() => handleBlur('warehouseAddress')}
              disabled={isLinked}
              readOnly={isLinked}
              aria-readonly={isLinked}
              autoComplete="address-line1"
              className={`w-full text-sm font-medium px-4 py-2.5 border rounded-lg outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:border-brand-500 ${
                isLinked
                  ? 'bg-slate-50 text-slate-500 border-slate-200 cursor-not-allowed'
                  : errors.warehouseAddress && touched.warehouseAddress
                  ? 'border-red-500 bg-red-50'
                  : 'border-slate-300 hover:border-slate-400'
              }`}
              placeholder="House / building / street"
            />
            {errors.warehouseAddress && touched.warehouseAddress && !isLinked && (
              <p className="text-red-600 text-xs mt-1 font-medium" role="alert">{errors.warehouseAddress}</p>
            )}
          </div>

          {/* Address Line 2 + 3 — 2-col grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="warehouseAddressLine2" className="block text-sm font-semibold text-slate-700 mb-1">
                Address Line 2 <span className="text-slate-400 text-xs font-normal">(optional)</span>
              </label>
              <input
                id="warehouseAddressLine2"
                type="text"
                name="warehouseAddressLine2"
                value={formData.warehouseAddressLine2}
                onChange={(e) => handleInputChange('warehouseAddressLine2', e.target.value)}
                disabled={isLinked}
                readOnly={isLinked}
                aria-readonly={isLinked}
                autoComplete="address-line2"
                className={`w-full text-sm font-medium px-4 py-2.5 border rounded-lg outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:border-brand-500 ${
                  isLinked ? 'bg-slate-50 text-slate-500 border-slate-200 cursor-not-allowed' : 'border-slate-300 hover:border-slate-400'
                }`}
                placeholder="Apartment, suite, floor"
              />
            </div>
            <div>
              <label htmlFor="warehouseAddressLine3" className="block text-sm font-semibold text-slate-700 mb-1">
                Address Line 3 <span className="text-slate-400 text-xs font-normal">(optional)</span>
              </label>
              <input
                id="warehouseAddressLine3"
                type="text"
                name="warehouseAddressLine3"
                value={formData.warehouseAddressLine3}
                onChange={(e) => handleInputChange('warehouseAddressLine3', e.target.value)}
                disabled={isLinked}
                readOnly={isLinked}
                aria-readonly={isLinked}
                autoComplete="address-line3"
                className={`w-full text-sm font-medium px-4 py-2.5 border rounded-lg outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:border-brand-500 ${
                  isLinked ? 'bg-slate-50 text-slate-500 border-slate-200 cursor-not-allowed' : 'border-slate-300 hover:border-slate-400'
                }`}
                placeholder="Building name, block, complex"
              />
            </div>
          </div>

          {/* Landmark */}
          <div>
            <label htmlFor="warehouseLandmark" className="block text-sm font-semibold text-slate-700 mb-1">
              Landmark <span className="text-slate-400 text-xs font-normal">(optional)</span>
            </label>
            <input
              id="warehouseLandmark"
              type="text"
              name="warehouseLandmark"
              value={formData.warehouseLandmark}
              onChange={(e) => handleInputChange('warehouseLandmark', e.target.value)}
              disabled={isLinked}
              readOnly={isLinked}
              aria-readonly={isLinked}
              autoComplete="off"
              className={`w-full text-sm font-medium px-4 py-2.5 border rounded-lg outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:border-brand-500 ${
                isLinked ? 'bg-slate-50 text-slate-500 border-slate-200 cursor-not-allowed' : 'border-slate-300 hover:border-slate-400'
              }`}
              placeholder="e.g. Near Central Mall, opposite Park View School"
            />
          </div>

          {/* City + State + ZIP — 3-col */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="warehouseCity" className="block text-sm font-semibold text-slate-700 mb-1">
                City {!isLinked && <span className="text-brand-500" aria-hidden="true">*</span>}
              </label>
              <input
                id="warehouseCity"
                type="text"
                name="warehouseCity"
                value={formData.warehouseCity}
                onChange={(e) => handleInputChange('warehouseCity', e.target.value)}
                onBlur={() => handleBlur('warehouseCity')}
                disabled={isLinked}
                readOnly={isLinked}
                aria-readonly={isLinked}
                autoComplete="address-level2"
                className={`w-full text-sm font-medium px-4 py-2.5 border rounded-lg outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:border-brand-500 ${
                  isLinked ? 'bg-slate-50 text-slate-500 border-slate-200 cursor-not-allowed'
                    : errors.warehouseCity && touched.warehouseCity ? 'border-red-500 bg-red-50'
                    : 'border-slate-300 hover:border-slate-400'
                }`}
                placeholder="City"
              />
              {errors.warehouseCity && touched.warehouseCity && !isLinked && (
                <p className="text-red-600 text-xs mt-1 font-medium" role="alert">{errors.warehouseCity}</p>
              )}
            </div>

            <div>
              <label htmlFor="warehouseState" className="block text-sm font-semibold text-slate-700 mb-1">
                State / Province {!isLinked && <span className="text-brand-500" aria-hidden="true">*</span>}
              </label>
              <input
                id="warehouseState"
                type="text"
                name="warehouseState"
                value={formData.warehouseState}
                onChange={(e) => handleInputChange('warehouseState', e.target.value)}
                onBlur={() => handleBlur('warehouseState')}
                disabled={isLinked}
                readOnly={isLinked}
                aria-readonly={isLinked}
                autoComplete="address-level1"
                className={`w-full text-sm font-medium px-4 py-2.5 border rounded-lg outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:border-brand-500 ${
                  isLinked ? 'bg-slate-50 text-slate-500 border-slate-200 cursor-not-allowed'
                    : errors.warehouseState && touched.warehouseState ? 'border-red-500 bg-red-50'
                    : 'border-slate-300 hover:border-slate-400'
                }`}
                placeholder="State"
              />
              {errors.warehouseState && touched.warehouseState && !isLinked && (
                <p className="text-red-600 text-xs mt-1 font-medium" role="alert">{errors.warehouseState}</p>
              )}
            </div>

            <div>
              <label htmlFor="warehouseZip" className="block text-sm font-semibold text-slate-700 mb-1">
                ZIP / Postal Code {!isLinked && <span className="text-brand-500" aria-hidden="true">*</span>}
              </label>
              <input
                id="warehouseZip"
                type="text"
                name="warehouseZip"
                value={formData.warehouseZip}
                onChange={(e) => handleInputChange('warehouseZip', e.target.value)}
                onBlur={() => handleBlur('warehouseZip')}
                disabled={isLinked}
                readOnly={isLinked}
                aria-readonly={isLinked}
                autoComplete="postal-code"
                className={`w-full text-sm font-medium px-4 py-2.5 border rounded-lg outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:border-brand-500 ${
                  isLinked ? 'bg-slate-50 text-slate-500 border-slate-200 cursor-not-allowed'
                    : errors.warehouseZip && touched.warehouseZip ? 'border-red-500 bg-red-50'
                    : 'border-slate-300 hover:border-slate-400'
                }`}
                placeholder="ZIP Code"
              />
              {errors.warehouseZip && touched.warehouseZip && !isLinked && (
                <p className="text-red-600 text-xs mt-1 font-medium" role="alert">{errors.warehouseZip}</p>
              )}
            </div>
          </div>

          {/* Country */}
          <div>
            <label htmlFor="warehouse-country-select" className="block text-sm font-semibold text-slate-700 mb-1">
              Country {!isLinked && <span className="text-brand-500" aria-hidden="true">*</span>}
            </label>
            <div data-field="warehouseCountry">
              <CountrySelect
                id="warehouse-country-select"
                value={formData.warehouseCountry}
                onChange={(name) => handleInputChange('warehouseCountry', name)}
                onBlur={() => handleBlur('warehouseCountry')}
                invalid={!!(errors.warehouseCountry && touched.warehouseCountry)}
                disabled={isLinked}
                placeholder="Select a country…"
                ariaDescribedBy={
                  errors.warehouseCountry && touched.warehouseCountry
                    ? 'warehouse-country-error'
                    : undefined
                }
              />
            </div>
            {errors.warehouseCountry && touched.warehouseCountry && !isLinked && (
              <p id="warehouse-country-error" className="text-red-600 text-xs mt-1 font-medium" role="alert">
                {errors.warehouseCountry}
              </p>
            )}
          </div>
        </AccordionSection>

        {/* ═══════════════════════════════════════════════════════════════
            SECTION 3 — Factory / Facility Photos
            ═══════════════════════════════════════════════════════════════ */}
        <AccordionSection
          id="photos"
          icon={<Camera className="w-4 h-4" aria-hidden="true" />}
          title="Factory & Facility Photos"
          subtitle="Upload named facility photos — Name Board and Front View are required"
        >
          <div className="flex flex-col">
            <p className="text-xs text-slate-500 mb-2">
              PNG, JPG, WEBP, or GIF • up to {FACTORY_IMAGE_MAX_LABEL} each.{' '}
              <span className="font-semibold text-slate-700">Required:</span> Factory Name Board, Front View.
            </p>

            <div
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
              role="group"
              aria-label="Factory images"
            >
            {FACTORY_IMAGE_SLOTS.map((slot) => {
              const value = formData.factoryImages[slot.id];
              const slotErrKey = `factoryImage:${slot.id}`;
              const slotError = errors[slotErrKey] && touched[slotErrKey] ? errors[slotErrKey] : '';
              const inputId = `factory-img-${slot.id}`;

              return (
                <div
                  key={slot.id}
                  data-field={slotErrKey}
                  className={`flex flex-col rounded-xl border p-3 transition-all duration-200 ${
                    slotError
                      ? 'border-red-300 bg-red-50/30'
                      : value
                      ? 'border-brand-300/40 bg-brand-50/10'
                      : 'border-slate-200 bg-slate-50/50 hover:border-slate-300'
                  }`}
                >
                  {/* Slot header */}
                  <div className="mb-2">
                    <p className="text-xs font-bold text-slate-800 leading-tight">
                      {slot.label}
                      {slot.required ? (
                        <span className="text-brand-500 ml-0.5" aria-hidden="true">*</span>
                      ) : (
                        <span className="ml-1 text-[10px] font-normal text-slate-400">(optional)</span>
                      )}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{slot.description}</p>
                  </div>

                  {/* Upload zone */}
                  <div
                    className={`relative aspect-[4/3] w-full overflow-hidden rounded-lg border-2 border-dashed transition-colors ${
                      slotError
                        ? 'border-red-400 bg-red-50/30'
                        : value
                        ? 'border-brand-400/30 bg-white'
                        : 'border-slate-300 bg-white hover:border-brand-400/50 hover:bg-brand-50/10'
                    }`}
                  >
                    {value?.url ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={value.url}
                          alt={`${slot.label} preview`}
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => handleSlotRemove(slot.id)}
                          aria-label={`Remove ${slot.label}`}
                          className="absolute top-1.5 right-1.5 inline-flex items-center justify-center w-6 h-6 rounded-full bg-white/95 text-red-600 shadow-sm hover:bg-red-50 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/40 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                      </>
                    ) : (
                      <label
                        htmlFor={inputId}
                        className="absolute inset-0 flex flex-col items-center justify-center gap-1 cursor-pointer text-center px-2 focus-within:ring-2 focus-within:ring-brand-500/40 rounded-lg"
                      >
                        <Upload className="w-5 h-5 text-slate-300" aria-hidden="true" />
                        <span className="text-[11px] font-semibold text-brand-600">Upload</span>
                        <span className="text-[10px] text-slate-400">or drag & drop</span>
                      </label>
                    )}
                    <input
                      id={inputId}
                      type="file"
                      accept={FACTORY_IMAGE_ALLOWED_TYPES.join(',')}
                      className="sr-only"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleSlotUpload(slot.id, file);
                        e.target.value = '';
                      }}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        const file = e.dataTransfer.files?.[0];
                        if (file) handleSlotUpload(slot.id, file);
                      }}
                    />
                  </div>

                  {/* Filename + replace link */}
                  {value && (
                    <div className="mt-1.5 flex items-center justify-between gap-1 text-[11px]">
                      <p className="truncate text-slate-600" title={value.name}>{value.name}</p>
                      <label htmlFor={inputId} className="shrink-0 cursor-pointer text-brand-600 hover:text-brand-500 font-semibold">
                        Replace
                      </label>
                    </div>
                  )}

                  {slotError && (
                    <p className="text-red-600 text-[11px] mt-1 font-medium" role="alert">{slotError}</p>
                  )}
                </div>
              );
            })}
            </div>
          </div>
        </AccordionSection>

        {/* ═══════════════════════════════════════════════════════════════
            SECTION 4 — Location Map
            ═══════════════════════════════════════════════════════════════ */}
        <AccordionSection
          id="map"
          icon={<Map className="w-4 h-4" aria-hidden="true" />}
          title="Location Map"
          subtitle="Search address or drop a pin — Google Maps embed generates automatically"
        >
          <div data-field-name="mapLink">
            <LocationPicker
              label="Warehouse Location"
              required
              value={formData.mapLink}
              onChange={(link) => {
                handleInputChange('mapLink', link);
                onUpdateData({ ...formData, mapLink: link });
              }}
              error={errors.mapLink && touched.mapLink ? errors.mapLink : undefined}
            />
          </div>
        </AccordionSection>

      </div>{/* end accordion sections */}

      {/* ── Footer Navigation ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between pt-5 mt-5 border-t border-slate-100 gap-3">
        <Button
          onClick={onPrev}
          className="inline-flex items-center gap-2 h-11 px-5 text-sm font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 hover:border-slate-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/30 rounded-lg"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          Back
        </Button>
        <Button
          onClick={handleNext}
          className="inline-flex items-center gap-2 h-11 px-7 text-sm font-semibold text-white bg-brand-500 hover:bg-brand-600 active:bg-brand-700 transition-colors shadow-sm shadow-brand-500/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 rounded-lg"
        >
          Save &amp; Continue
          <ArrowRight className="w-4 h-4" aria-hidden="true" />
        </Button>
      </div>

    </div>
  );
}
