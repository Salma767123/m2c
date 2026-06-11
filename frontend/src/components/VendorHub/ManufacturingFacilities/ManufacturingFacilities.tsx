'use client';

import { useCallback, useState } from 'react';
import { Button } from '@/components/UI/Button';
import { Factory, Settings, Palette, Printer, Scissors, Shirt, ArrowLeft, ArrowRight } from 'lucide-react';
import { Grid3, Field, Input, Textarea, AccordionSection } from '../FormUI';
import { scrollToFirstError } from '@/lib/formErrorScroll';
import { showErrorToast } from '@/lib/toast-utils';

interface ManufacturingFacilitiesProps {
  onNext: () => void;
  onPrev: () => void;
  onUpdateData: (data: any) => void;
  data: any;
}

// ── Validation bounds (business rules) ────────────────────────────────
const MAX_MACHINES = 9999;
const MAX_CAPACITY_KG = 999_999;
const REMARKS_MAX_LEN = 500;

type FieldKind = 'integer' | 'decimal' | 'text';

interface FacilityField {
  id: string;
  label: string;
  type: string;
  kind: FieldKind;
  placeholder?: string;
}

interface FacilityType {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  fields: FacilityField[];
}

// Standard fields shared by every facility — declared once, reused below
// so labels, validation kinds, and placeholders stay in lockstep.
const remarksField: FacilityField = {
  id: 'remarks',
  label: 'Remarks',
  type: 'textarea',
  kind: 'text',
  placeholder: 'Enter production details or anything related to this',
};

const facilityTypes: FacilityType[] = [
  {
    id: 'spinning',
    label: 'Spinning',
    icon: Settings,
    description: 'Yarn and thread production',
    fields: [
      { id: 'spinningMachines', label: 'Number of Machines', type: 'number', kind: 'integer' },
      { id: 'spinningCapacity', label: 'Daily Capacity (kg)', type: 'number', kind: 'decimal' },
      remarksField,
    ],
  },
  {
    id: 'weaving',
    label: 'Weaving',
    icon: Scissors,
    description: 'Fabric production',
    fields: [
      { id: 'loomCount', label: 'Number of Machines', type: 'number', kind: 'integer' },
      { id: 'weavingCapacity', label: 'Daily Capacity (kg)', type: 'number', kind: 'decimal' },
      remarksField,
    ],
  },
  {
    id: 'dyeing',
    label: 'Dyeing',
    icon: Palette,
    description: 'Fabric coloring and treatment',
    fields: [
      { id: 'dyeingMachines', label: 'Number of Machines', type: 'number', kind: 'integer' },
      { id: 'dyeingCapacity', label: 'Daily Capacity (kg)', type: 'number', kind: 'decimal' },
      remarksField,
    ],
  },
  {
    id: 'printing',
    label: 'Printing',
    icon: Printer,
    description: 'Pattern and design printing',
    fields: [
      { id: 'printingMachines', label: 'Number of Machines', type: 'number', kind: 'integer' },
      { id: 'printingCapacity', label: 'Daily Capacity (kg)', type: 'number', kind: 'decimal' },
      remarksField,
    ],
  },
  {
    id: 'stitching',
    label: 'Stitching',
    icon: Shirt,
    description: 'Cutting and stitching of garments',
    fields: [
      { id: 'stitchingMachines', label: 'Number of Machines', type: 'number', kind: 'integer' },
      { id: 'stitchingCapacity', label: 'Daily Capacity (kg)', type: 'number', kind: 'decimal' },
      remarksField,
    ],
  },
  {
    id: 'finishing',
    label: 'Final Packing and Dispatch',
    icon: Factory,
    description: 'Final processing and quality control',
    fields: [
      { id: 'finishingCapacity', label: 'Daily Capacity (kg)', type: 'number', kind: 'decimal' },
      remarksField,
    ],
  },
];

// Error/touched keys use `${facilityId}-${fieldId}` so they match the
// DOM `id` attribute on each input — lets `scrollToFirstError` find the
// invalid control via its default `#id` selector.
const errKey = (facilityId: string, fieldId: string) => `${facilityId}-${fieldId}`;

/**
 * Per-field validator. Empty/optional fields only fail when the parent
 * facility is enabled (business rule from the spec). Remarks is always
 * optional but length-capped.
 */
function validateFacilityField(field: FacilityField, raw: string, enabled: boolean): string {
  const value = (raw ?? '').trim();

  if (field.kind === 'text') {
    if (value.length > REMARKS_MAX_LEN) {
      return `Remarks must be ${REMARKS_MAX_LEN} characters or fewer (currently ${value.length}).`;
    }
    return '';
  }

  // Numeric fields — required when the facility is enabled
  if (!enabled) return '';
  if (!value) return `${field.label} is required`;

  if (field.kind === 'integer') {
    if (!/^\d+$/.test(value)) {
      return `${field.label} must be a whole number (no decimals or negatives).`;
    }
    const n = parseInt(value, 10);
    if (n < 1) return `${field.label} must be at least 1.`;
    if (n > MAX_MACHINES) return `${field.label} can't exceed ${MAX_MACHINES.toLocaleString()}.`;
    return '';
  }

  if (field.kind === 'decimal') {
    if (!/^\d+(\.\d{1,3})?$/.test(value)) {
      return `${field.label} must be a positive number (e.g. 250 or 250.5).`;
    }
    const n = parseFloat(value);
    if (n <= 0) return `${field.label} must be greater than 0.`;
    if (n > MAX_CAPACITY_KG)
      return `${field.label} can't exceed ${MAX_CAPACITY_KG.toLocaleString()} kg.`;
    return '';
  }

  return '';
}

export default function ManufacturingFacilities({ onNext, onPrev, onUpdateData, data }: ManufacturingFacilitiesProps) {
  const [formData, setFormData] = useState({
    enabledFacilities: data.enabledFacilities || {},
    facilityDetails: data.facilityDetails || {},
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Accordion: matches the visual + status-badge contract of Steps 3/4/6.
  // Step 5 only has ONE logical section (the facility list), so this is
  // essentially decorative — but keeping the same chrome (icon bubble,
  // gradient header, status badge) avoids the "this step looks different
  // from the others" jolt. Default open.
  type SectionKey = 'facilities';
  const [activeSection, setActiveSection] = useState<SectionKey>('facilities');

  // Aggregate status across all facilities:
  //   - 'empty'    → no facilities enabled
  //   - 'partial'  → at least one enabled but some required field still empty
  //   - 'complete' → every enabled facility has all required fields filled
  const getFacilitiesStatus = (): 'complete' | 'partial' | 'empty' => {
    const enabledIds = Object.keys(formData.enabledFacilities).filter(
      (id) => formData.enabledFacilities[id]
    );
    if (enabledIds.length === 0) return 'empty';
    const allValid = enabledIds.every((facilityId) => {
      const facility = facilityTypes.find((f) => f.id === facilityId);
      if (!facility) return true;
      const details = formData.facilityDetails[facilityId] || {};
      return facility.fields
        .filter((f) => f.kind !== 'text') // text (Remarks) is always optional
        .every((f) => {
          const v = String(details[f.id] ?? '').trim();
          return v.length > 0;
        });
    });
    return allValid ? 'complete' : 'partial';
  };

  const sectionProps = (id: SectionKey) => ({
    id,
    isOpen: activeSection === id,
    status: getFacilitiesStatus(),
    hasErrors: Object.keys(errors).some((k) => Boolean(errors[k])),
    onActivate: () => setActiveSection(id),
  });

  // Render-phase sync (Vercel §5.1) — same pattern as the other steps.
  // Replaces the previous `useEffect(() => setFormData(...), [data])` which
  // tripped the `react-hooks/set-state-in-effect` rule.
  const [prevData, setPrevData] = useState(data);
  if (data !== prevData) {
    setPrevData(data);
    setFormData({
      enabledFacilities: data.enabledFacilities || {},
      facilityDetails: data.facilityDetails || {},
    });
  }

  // Resolve the field config for a given key — used by the live
  // validator and by the blur handler so we don't duplicate the lookup.
  const findField = (facilityId: string, fieldId: string): FacilityField | undefined => {
    const facility = facilityTypes.find((f) => f.id === facilityId);
    return facility?.fields.find((f) => f.id === fieldId);
  };

  const handleToggleFacility = useCallback((facilityId: string) => {
    setFormData((prev) => {
      const wasEnabled = Boolean(prev.enabledFacilities[facilityId]);
      return {
        ...prev,
        enabledFacilities: {
          ...prev.enabledFacilities,
          [facilityId]: !wasEnabled,
        },
      };
    });
    // Disabling a facility clears any stale errors on its fields so we
    // don't show "required" messages for a section the user has hidden.
    setErrors((prev) => {
      const next = { ...prev };
      let changed = false;
      Object.keys(next).forEach((k) => {
        if (k.startsWith(`${facilityId}-`)) {
          delete next[k];
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, []);

  const handleFieldChange = useCallback(
    (facilityId: string, fieldId: string, value: string) => {
      setFormData((prev) => ({
        ...prev,
        facilityDetails: {
          ...prev.facilityDetails,
          [facilityId]: {
            ...prev.facilityDetails[facilityId],
            [fieldId]: value,
          },
        },
      }));

      // Live validation — re-run on every keystroke so previously-flagged
      // fields clear themselves as the user corrects the value. The error
      // only *renders* once the field is also touched (blur gate in JSX),
      // so first-time typing doesn't surface "required" mid-entry.
      const field = findField(facilityId, fieldId);
      if (!field) return;
      const key = errKey(facilityId, fieldId);
      // We don't have the live enabled state in the closure without a
      // functional setState read — use the previous value via setErrors.
      setErrors((prev) => {
        const enabled = Boolean(
          // We re-derive enabled from the most recent formData snapshot
          // via a guarded read. setFormData above already scheduled the
          // value update; enabled state didn't change here.
          (formData.enabledFacilities as Record<string, boolean>)[facilityId],
        );
        const next = validateFacilityField(field, value, enabled);
        if (prev[key] === next) return prev;
        return { ...prev, [key]: next };
      });
    },
    [formData.enabledFacilities],
  );

  const handleFieldBlur = useCallback(
    (facilityId: string, fieldId: string) => {
      const key = errKey(facilityId, fieldId);
      setTouched((prev) => (prev[key] ? prev : { ...prev, [key]: true }));
      const field = findField(facilityId, fieldId);
      if (!field) return;
      const enabled = Boolean(formData.enabledFacilities[facilityId]);
      const raw = formData.facilityDetails[facilityId]?.[fieldId] ?? '';
      const err = validateFacilityField(field, raw, enabled);
      setErrors((prev) => (prev[key] === err ? prev : { ...prev, [key]: err }));
    },
    [formData.enabledFacilities, formData.facilityDetails],
  );

  // Helper function to get field value with guaranteed string (never undefined or null)
  const getFieldValue = (facilityId: string, fieldId: string): string => {
    const value = formData.facilityDetails[facilityId]?.[fieldId];
    return typeof value === 'string' ? value : '';
  };

  const handleNext = useCallback(() => {
    // Walk every enabled facility (+ remarks on every facility, since
    // remarks length-validates regardless of enabled state) and collect
    // all violations.
    const newErrors: Record<string, string> = {};
    const fieldOrder: string[] = [];

    for (const facility of facilityTypes) {
      const enabled = Boolean(formData.enabledFacilities[facility.id]);
      for (const field of facility.fields) {
        const value = formData.facilityDetails[facility.id]?.[field.id] ?? '';
        const err = validateFacilityField(field, value, enabled);
        const key = errKey(facility.id, field.id);
        if (err) newErrors[key] = err;
        fieldOrder.push(key);
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      const allTouched: Record<string, boolean> = {};
      Object.keys(newErrors).forEach((k) => {
        allTouched[k] = true;
      });
      setTouched((prev) => ({ ...prev, ...allTouched }));

      const count = Object.keys(newErrors).length;
      showErrorToast(
        count === 1
          ? '1 field needs your attention'
          : `${count} fields need your attention`,
        'Scroll down to the highlighted field and fix it to continue.',
      );

      requestAnimationFrame(() => {
        scrollToFirstError(newErrors, { fieldOrder });
      });
      return;
    }

    onUpdateData(formData);
    onNext();
  }, [formData, onUpdateData, onNext]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-4 sm:px-6 sm:py-6 space-y-5 font-sans animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header */}
      <div className="flex items-center gap-3 pb-2">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-brand-50 text-brand-600 shrink-0">
          <Factory className="w-5 h-5" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <h2 className="text-headline-md text-gray-900 leading-tight" style={{ textWrap: 'balance' as any }}>
            Manufacturing Facilities
          </h2>
          <p className="text-sm text-gray-600 mt-0.5">
            Select your manufacturing capabilities and provide facility details.
          </p>
        </div>
      </div>

      {/* ── Accordion Section ──────────────────────────────────────────
          Same chrome as Steps 3/4/6 (icon bubble, gradient header, status
          badge). Step 5 only has one logical group — the facility list —
          so this is a single-section accordion. The Yes/No toggle on each
          facility card inside continues to act as the per-facility
          "open/close" affordance (revealing the field grid). */}
      <div className="space-y-3">
      <AccordionSection
        {...sectionProps('facilities')}
        icon={<Factory className="w-4.5 h-4.5" aria-hidden="true" />}
        title="Manufacturing Facilities"
        subtitle="Toggle the stages you operate on-site and fill in capacity per facility."
      >
      <div className="space-y-4">
        {facilityTypes.map((facility) => {
          const Icon = facility.icon;
          const isEnabled = Boolean(formData.enabledFacilities[facility.id]);

          return (
            <section
              key={facility.id}
              className={`border rounded-lg overflow-hidden transition-all duration-200 ${
                isEnabled ? 'border-brand-300 bg-brand-50/10 shadow-sm shadow-brand-500/5' : 'border-slate-200 bg-white'
              }`}
            >
              <div className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${isEnabled ? 'bg-brand-100 text-brand-600' : 'bg-slate-100 text-slate-500'}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className={`text-lg font-semibold ${isEnabled ? 'text-brand-900' : 'text-slate-900'}`}>{facility.label}</h3>
                    <p className={`text-sm ${isEnabled ? 'text-brand-700/70' : 'text-slate-500'}`}>{facility.description}</p>
                  </div>
                </div>
                
                {/* Yes/No Segmented Control */}
                <div className="flex items-center p-1 bg-slate-100 border border-slate-200 rounded-md">
                  <button
                    type="button"
                    onClick={() => {
                      if (!isEnabled) handleToggleFacility(facility.id);
                    }}
                    className={`px-4 py-1.5 rounded text-sm font-semibold transition-all ${
                      isEnabled
                        ? 'bg-brand-500 text-white shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (isEnabled) handleToggleFacility(facility.id);
                    }}
                    className={`px-4 py-1.5 rounded text-sm font-semibold transition-all ${
                      !isEnabled
                        ? 'bg-white text-slate-700 shadow-sm border border-slate-200'
                        : 'text-slate-500 hover:text-slate-700 border border-transparent'
                    }`}
                  >
                    No
                  </button>
                </div>
              </div>

              {isEnabled && (
                <div className="px-6 pb-6 pt-2 border-t border-slate-100 bg-white">
                  <Grid3 className="pt-4">
                    {facility.fields.map((field) => {
                      const key = errKey(facility.id, field.id);
                      const value = getFieldValue(facility.id, field.id);
                      const fieldErr = errors[key];
                      const showErr = !!(fieldErr && touched[key]);
                      const isRequired = field.kind !== 'text';
                      const inputId = `${facility.id}-${field.id}`;
                      // For Remarks, surface a live char counter as the hint
                      // (so the user sees they're approaching the cap).
                      const remarksHint = field.kind === 'text'
                        ? `${value.length}/${REMARKS_MAX_LEN}`
                        : undefined;
                      return (
                        <div
                          key={field.id}
                          className={field.type === 'textarea' ? 'col-span-1 sm:col-span-2 lg:col-span-3' : ''}
                        >
                          <Field
                            label={field.label}
                            htmlFor={inputId}
                            required={isRequired}
                            error={showErr ? fieldErr : undefined}
                            hint={!showErr ? remarksHint : undefined}
                          >
                            {field.type === 'textarea' ? (
                              <Textarea
                                id={inputId}
                                name={inputId}
                                value={value}
                                onChange={(e) => handleFieldChange(facility.id, field.id, e.target.value)}
                                onBlur={() => handleFieldBlur(facility.id, field.id)}
                                invalid={showErr}
                                maxLength={REMARKS_MAX_LEN}
                                placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}...`}
                                rows={3}
                                aria-invalid={showErr}
                                aria-describedby={showErr ? `${inputId}-error` : undefined}
                              />
                            ) : (
                              <Input
                                id={inputId}
                                name={inputId}
                                type="text"
                                inputMode={field.kind === 'integer' ? 'numeric' : 'decimal'}
                                value={value}
                                onChange={(e) => handleFieldChange(facility.id, field.id, e.target.value)}
                                onBlur={() => handleFieldBlur(facility.id, field.id)}
                                invalid={showErr}
                                autoComplete="off"
                                placeholder={
                                  field.kind === 'integer'
                                    ? 'e.g. 25'
                                    : field.kind === 'decimal'
                                      ? 'e.g. 250.5'
                                      : `e.g. ${field.label}`
                                }
                                aria-invalid={showErr}
                                aria-describedby={showErr ? `${inputId}-error` : undefined}
                              />
                            )}
                          </Field>
                        </div>
                      );
                    })}
                  </Grid3>
                </div>
              )}
            </section>
          );
        })}
      </div>
      </AccordionSection>
      </div>


      {/* Navigation */}
      <div className="flex items-center justify-between pt-4 gap-3">
        <Button
          onClick={onPrev}
          className="inline-flex items-center gap-2 h-11 px-5 text-sm font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 hover:border-slate-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/30"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          Back
        </Button>
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