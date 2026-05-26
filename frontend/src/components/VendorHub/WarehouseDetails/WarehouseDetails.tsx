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

  return (
    <div className="mx-auto max-w-5xl px-4 py-4 sm:px-6 sm:py-6 space-y-5 font-sans">
      {/* Header — h2 not h1, page h1 lives in VendorPanel
         (web-design-guidelines: single h1 per page) */}
      <div className="flex items-center gap-3 pb-2">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-brand-50 text-brand-600 shrink-0">
          <Warehouse className="w-5 h-5" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <h2
            className="text-headline-md text-gray-900 leading-tight"
            style={{ textWrap: 'balance' as any }}
          >
            Warehouse Details
          </h2>
          <p className="text-sm text-gray-600 mt-0.5">
            Please provide the details of your warehouse facility.
          </p>
        </div>
      </div>

      {/* ── Inheritance banner ───────────────────────────────────────
          Surfaces when the user enabled "Same as warehouse address" on
          the Company Details step. Address + ownership flow in live from
          there; the user has to go back to edit. */}
      {isLinked && (
        <div
          role="status"
          aria-live="polite"
          className="rounded-lg border border-brand-500/30 bg-brand-50/50 p-6 mb-4"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0">
              <svg
                className="h-5 w-5 shrink-0 text-brand-600 mt-0.5"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M9.243 3.03a1 1 0 01.727 1.213L9.53 6h2.94l.56-2.243a1 1 0 111.94.486L14.53 6H17a1 1 0 110 2h-2.97l-1 4H15a1 1 0 110 2h-2.47l-.56 2.242a1 1 0 11-1.94-.485L10.47 14H7.53l-.56 2.242a1 1 0 11-1.94-.485L5.47 14H3a1 1 0 110-2h2.97l1-4H5a1 1 0 110-2h2.47l.56-2.243a1 1 0 011.213-.727zM7.97 8l-1 4h2.94l1-4H7.97z"
                  clipRule="evenodd"
                />
              </svg>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-brand-800">
                  Inherited from Company Details
                </p>
                <p className="text-sm text-brand-700 mt-0.5 leading-relaxed">
                  Ownership type and address are linked to the previous step. Edits
                  there update these fields in real time. To enter different details,
                  go back and uncheck <em>&ldquo;Same as warehouse address&rdquo;</em>.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onPrev}
              className="shrink-0 w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 sm:px-3 sm:py-1.5 text-sm font-medium text-brand-700 bg-white border border-brand-500/40 rounded-md hover:bg-brand-50 hover:border-brand-500 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 shadow-sm"
            >
              ← Edit on Company Details
            </button>
          </div>
        </div>
      )}

      {/* Ownership Type */}
      <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-6 pt-6 pb-4 border-b border-slate-100">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <ShieldUser className="w-5 h-5 text-gray-500 shrink-0" aria-hidden="true" />
            Facility Ownership{' '}
            <span className="text-red-500 text-lg" aria-hidden="true">*</span>
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Select the type of ownership for your warehouse facility.
          </p>
        </div>
        <div className="px-6 py-6">
          <div
            className="flex flex-wrap gap-2.5"
            role="radiogroup"
            aria-label="Facility ownership"
            aria-disabled={isLinked}
            data-field="ownershipType"
          >
            {ownershipTypes.map((type) => {
              const isSelected = formData.ownershipType === type.id;
              return (
                <ToggleButton
                  key={type.id}
                  selected={isSelected}
                  invalid={!isLinked && !!(errors.ownershipType && touched.ownershipType)}
                  disabled={isLinked}
                  onClick={() => handleInputChange('ownershipType', type.id)}
                >
                  {type.label}
                </ToggleButton>
              );
            })}
          </div>
          {errors.ownershipType && touched.ownershipType && !isLinked && (
            <p className="text-red-600 text-sm mt-2 font-medium" role="alert">
              {errors.ownershipType}
            </p>
          )}
        </div>

        <div className="px-6 py-6 border-t border-slate-100">
          <label htmlFor="warehousingCapacity" className="block text-base font-medium text-gray-700 mb-2">
            Warehousing Capacity (sq ft)
          </label>
          <input
            id="warehousingCapacity"
            type="number"
            name="warehousingCapacity"
            value={formData.warehousingCapacity}
            onChange={(e) => handleInputChange("warehousingCapacity", e.target.value)}
            onBlur={() => handleBlur("warehousingCapacity")}
            disabled={isLinked}
            readOnly={isLinked}
            aria-readonly={isLinked}
            className={`w-full text-base font-medium px-4 py-3 border rounded-lg outline-none focus-visible:ring-1 focus-visible:ring-brand-500 focus-visible:border-brand-500 transition-colors ${
              isLinked
                ? 'bg-slate-50 text-slate-700 border-slate-200 cursor-not-allowed'
                : 'border-slate-200 hover:border-slate-300'
            }`}
            placeholder="e.g. 50000"
          />
        </div>
      </section>

      {/* Warehouse Address */}
      <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-6 pt-6 pb-4 border-b border-slate-100">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-gray-500 shrink-0" aria-hidden="true" />
            Warehouse Address
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Where your facility is physically located.
          </p>
          {/* The "address copied" banner moved to the top of the page —
             see the `isLinked` banner above the Ownership section. */}
        </div>
        <div className="px-6 py-6 space-y-5">
          {/* Address Line 1 — required */}
          <div>
            <label htmlFor="warehouseAddress" className="block text-base font-medium text-gray-700 mb-2">
              Address Line 1 <span className="text-red-500 text-lg" aria-hidden="true">*</span>
            </label>
            <input
              id="warehouseAddress"
              type="text"
              name="warehouseAddress"
              value={formData.warehouseAddress}
              onChange={(e) => handleInputChange("warehouseAddress", e.target.value)}
              onBlur={() => handleBlur("warehouseAddress")}
              disabled={isLinked}
              readOnly={isLinked}
              aria-readonly={isLinked}
              autoComplete="address-line1"
              className={`w-full text-base font-medium px-4 py-3 border rounded-lg outline-none focus-visible:ring-1 focus-visible:ring-brand-500 focus-visible:border-brand-500 transition-colors ${
                isLinked
                  ? 'bg-slate-50 text-slate-700 border-slate-200 cursor-not-allowed'
                  : errors.warehouseAddress && touched.warehouseAddress
                    ? 'border-red-500 bg-red-50'
                    : 'border-slate-200 hover:border-slate-300'
              }`}
              placeholder="House / building / street"
            />
            {errors.warehouseAddress && touched.warehouseAddress && !isLinked && (
              <p className="text-red-600 text-sm mt-1 font-medium" role="alert">
                {errors.warehouseAddress}
              </p>
            )}
          </div>

          {/* Address Line 2 — optional */}
          <div>
            <label htmlFor="warehouseAddressLine2" className="block text-base font-medium text-gray-700 mb-2">
              Address Line 2 <span className="text-gray-400 text-sm font-normal">(optional)</span>
            </label>
            <input
              id="warehouseAddressLine2"
              type="text"
              name="warehouseAddressLine2"
              value={formData.warehouseAddressLine2}
              onChange={(e) => handleInputChange("warehouseAddressLine2", e.target.value)}
              disabled={isLinked}
              readOnly={isLinked}
              aria-readonly={isLinked}
              autoComplete="address-line2"
              className={`w-full text-base font-medium px-4 py-3 border rounded-lg outline-none focus-visible:ring-1 focus-visible:ring-brand-500 focus-visible:border-brand-500 transition-colors ${
                isLinked
                  ? 'bg-slate-50 text-slate-700 border-slate-200 cursor-not-allowed'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
              placeholder="Apartment, suite, floor"
            />
          </div>

          {/* Address Line 3 — optional */}
          <div>
            <label htmlFor="warehouseAddressLine3" className="block text-base font-medium text-gray-700 mb-2">
              Address Line 3 <span className="text-gray-400 text-sm font-normal">(optional)</span>
            </label>
            <input
              id="warehouseAddressLine3"
              type="text"
              name="warehouseAddressLine3"
              value={formData.warehouseAddressLine3}
              onChange={(e) => handleInputChange("warehouseAddressLine3", e.target.value)}
              disabled={isLinked}
              readOnly={isLinked}
              aria-readonly={isLinked}
              autoComplete="address-line3"
              className={`w-full text-base font-medium px-4 py-3 border rounded-lg outline-none focus-visible:ring-1 focus-visible:ring-brand-500 focus-visible:border-brand-500 transition-colors ${
                isLinked
                  ? 'bg-slate-50 text-slate-700 border-slate-200 cursor-not-allowed'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
              placeholder="Building name, block, complex"
            />
          </div>

          {/* Landmark — optional */}
          <div>
            <label htmlFor="warehouseLandmark" className="block text-base font-medium text-gray-700 mb-2">
              Landmark <span className="text-gray-400 text-sm font-normal">(optional)</span>
            </label>
            <input
              id="warehouseLandmark"
              type="text"
              name="warehouseLandmark"
              value={formData.warehouseLandmark}
              onChange={(e) => handleInputChange("warehouseLandmark", e.target.value)}
              disabled={isLinked}
              readOnly={isLinked}
              aria-readonly={isLinked}
              autoComplete="off"
              className={`w-full text-base font-medium px-4 py-3 border rounded-lg outline-none focus-visible:ring-1 focus-visible:ring-brand-500 focus-visible:border-brand-500 transition-colors ${
                isLinked
                  ? 'bg-slate-50 text-slate-700 border-slate-200 cursor-not-allowed'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
              placeholder="e.g. Near Central Mall, opposite Park View School"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="warehouseCity" className="block text-base font-medium text-gray-700 mb-2">
                City <span className="text-red-500 text-lg" aria-hidden="true">*</span>
              </label>
              <input
                id="warehouseCity"
                type="text"
                name="warehouseCity"
                value={formData.warehouseCity}
                onChange={(e) => handleInputChange("warehouseCity", e.target.value)}
                onBlur={() => handleBlur("warehouseCity")}
                disabled={isLinked}
                readOnly={isLinked}
                aria-readonly={isLinked}
                autoComplete="address-level2"
                className={`w-full text-base font-medium px-4 py-3 border rounded-lg outline-none focus-visible:ring-1 focus-visible:ring-brand-500 focus-visible:border-brand-500 transition-colors ${
                  isLinked
                    ? 'bg-slate-50 text-slate-700 border-slate-200 cursor-not-allowed'
                    : errors.warehouseCity && touched.warehouseCity
                      ? 'border-red-500 bg-red-50'
                      : 'border-slate-200 hover:border-slate-300'
                }`}
                placeholder="City"
              />
              {errors.warehouseCity && touched.warehouseCity && !isLinked && (
                <p className="text-red-600 text-sm mt-1 font-medium" role="alert">{errors.warehouseCity}</p>
              )}
            </div>

            <div>
              <label htmlFor="warehouseState" className="block text-base font-medium text-gray-700 mb-2">
                State/Province <span className="text-red-500 text-lg" aria-hidden="true">*</span>
              </label>
              <input
                id="warehouseState"
                type="text"
                name="warehouseState"
                value={formData.warehouseState}
                onChange={(e) => handleInputChange("warehouseState", e.target.value)}
                onBlur={() => handleBlur("warehouseState")}
                disabled={isLinked}
                readOnly={isLinked}
                aria-readonly={isLinked}
                autoComplete="address-level1"
                className={`w-full text-base font-medium px-4 py-3 border rounded-lg outline-none focus-visible:ring-1 focus-visible:ring-brand-500 focus-visible:border-brand-500 transition-colors ${
                  isLinked
                    ? 'bg-slate-50 text-slate-700 border-slate-200 cursor-not-allowed'
                    : errors.warehouseState && touched.warehouseState
                      ? 'border-red-500 bg-red-50'
                      : 'border-slate-200 hover:border-slate-300'
                }`}
                placeholder="State"
              />
              {errors.warehouseState && touched.warehouseState && !isLinked && (
                <p className="text-red-600 text-sm mt-1 font-medium" role="alert">{errors.warehouseState}</p>
              )}
            </div>

            <div>
              <label htmlFor="warehouseZip" className="block text-base font-medium text-gray-700 mb-2">
                ZIP/Postal Code <span className="text-red-500 text-lg" aria-hidden="true">*</span>
              </label>
              <input
                id="warehouseZip"
                type="text"
                name="warehouseZip"
                value={formData.warehouseZip}
                onChange={(e) => handleInputChange("warehouseZip", e.target.value)}
                onBlur={() => handleBlur("warehouseZip")}
                disabled={isLinked}
                readOnly={isLinked}
                aria-readonly={isLinked}
                autoComplete="postal-code"
                className={`w-full text-base font-medium px-4 py-3 border rounded-lg outline-none focus-visible:ring-1 focus-visible:ring-brand-500 focus-visible:border-brand-500 transition-colors ${
                  isLinked
                    ? 'bg-slate-50 text-slate-700 border-slate-200 cursor-not-allowed'
                    : errors.warehouseZip && touched.warehouseZip
                      ? 'border-red-500 bg-red-50'
                      : 'border-slate-200 hover:border-slate-300'
                }`}
                placeholder="ZIP Code"
              />
              {errors.warehouseZip && touched.warehouseZip && !isLinked && (
                <p className="text-red-600 text-sm mt-1 font-medium" role="alert">{errors.warehouseZip}</p>
              )}
            </div>
          </div>
          <div>
            <label
              htmlFor="warehouse-country-select"
              className="block text-base font-medium text-gray-700 mb-2"
            >
              Country <span className="text-red-500 text-lg" aria-hidden="true">*</span>
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
              <p
                id="warehouse-country-error"
                className="text-red-600 text-sm mt-1 font-medium"
                role="alert"
              >
                {errors.warehouseCountry}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Factory Images */}
      <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-6 pt-6 pb-4 border-b border-slate-100">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Camera className="w-5 h-5 text-gray-500 shrink-0" aria-hidden="true" />
            Factory Images
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Photos of your facility — helps buyers verify the operation.
          </p>
        </div>
        <div className="px-6 py-6 space-y-4">
          <p className="text-xs text-gray-500">
            PNG, JPG, WEBP, or GIF · up to {FACTORY_IMAGE_MAX_LABEL} each.{' '}
            <span className="font-medium text-gray-700">Required:</span> Factory Name Board, Front View.
          </p>
          <div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
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
                  className="flex flex-col rounded-lg border border-gray-200 bg-gray-50/40 p-3 transition-colors hover:bg-gray-50"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 leading-tight">
                        {slot.label}
                        {slot.required ? (
                          <span className="text-red-500 ml-0.5" aria-hidden="true">*</span>
                        ) : (
                          <span className="ml-1.5 text-[11px] font-normal text-gray-400">
                            (optional)
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">{slot.description}</p>
                    </div>
                  </div>

                  <div
                    className={`relative aspect-[4/3] w-full overflow-hidden rounded-md border-2 border-dashed transition-colors ${
                      slotError
                        ? 'border-red-400 bg-red-50/40'
                        : value
                          ? 'border-brand-500/30 bg-white'
                          : 'border-gray-300 bg-white hover:border-brand-500/40 hover:bg-brand-50/20'
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
                          className="absolute top-1.5 right-1.5 inline-flex items-center justify-center w-7 h-7 rounded-full bg-white/95 text-red-600 shadow-sm hover:bg-red-50 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/40 transition-colors"
                        >
                          <X className="w-4 h-4" aria-hidden="true" />
                        </button>
                      </>
                    ) : (
                      <label
                        htmlFor={inputId}
                        className="absolute inset-0 flex flex-col items-center justify-center gap-1 cursor-pointer text-center px-3 focus-within:ring-2 focus-within:ring-brand-500/40 rounded-md"
                      >
                        <Upload className="w-6 h-6 text-gray-400" aria-hidden="true" />
                        <span className="text-xs font-medium text-brand-700">Click to upload</span>
                        <span className="text-[11px] text-gray-500">or drag &amp; drop</span>
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

                  {value && (
                    <div className="mt-2 flex items-center justify-between gap-2 text-xs">
                      <p className="truncate text-gray-700" title={value.name}>
                        {value.name}
                      </p>
                      <label
                        htmlFor={inputId}
                        className="shrink-0 cursor-pointer text-brand-700 hover:text-brand-600 font-medium"
                      >
                        Replace
                      </label>
                    </div>
                  )}

                  {slotError && (
                    <p className="text-red-600 text-xs mt-1 font-medium" role="alert">
                      {slotError}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Route Map */}
      <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-6 pt-6 pb-4 border-b border-slate-100">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Map className="w-5 h-5 text-gray-500 shrink-0" aria-hidden="true" />
            Location Map{' '}
            <span className="text-red-500 text-lg" aria-hidden="true">*</span>
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Search your warehouse address or drop a pin — the embed link generates automatically.
          </p>
        </div>
        <div className="px-6 py-6">
          <div data-field-name="mapLink">
            <LocationPicker
              label="Warehouse Location"
              required
              value={formData.mapLink}
              onChange={(link) => {
                handleInputChange("mapLink", link);
                // Live-sync to parent so the user can jump to Review via the
                // sidebar without clicking Continue first. Push the *whole*
                // local state, not just `mapLink` — a partial push causes
                // VendorPanel to round-trip a `data` prop missing the
                // local-only fields (factoryImages, blob URLs, etc.), and
                // the render-phase sync then wipes them from local state.
                // See: factory images vanished when user updated the map.
                onUpdateData({ ...formData, mapLink: link });
              }}
              error={errors.mapLink && touched.mapLink ? errors.mapLink : undefined}
            />
          </div>
        </div>
      </section>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4 gap-3">
        <Button
          onClick={onPrev}
          className="inline-flex items-center gap-2 h-11 px-5 text-sm font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 hover:border-slate-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/30"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          Back to Company Details
        </Button>
        <Button
          onClick={handleNext}
          className="inline-flex items-center gap-2 h-11 px-6 text-sm font-semibold text-white bg-brand-500 hover:bg-brand-600 transition-colors shadow-sm shadow-brand-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
        >
          Save &amp; Continue to Owner Profile
          <ArrowRight className="w-4 h-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
