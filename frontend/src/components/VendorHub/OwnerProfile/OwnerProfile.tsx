'use client';

import { useCallback, useState } from 'react';
import { Button } from '@/components/UI/Button';
import Dropdown from '@/components/UI/Dropdown';
import { User, Calendar, Users, Mail, Plus, Trash2, ArrowLeft, ArrowRight } from 'lucide-react';
import { ToggleButton, PhoneInput, validatePhoneE164 } from '@/components/VendorHub/FormUI';
import { scrollToFirstError } from '@/lib/formErrorScroll';
import { showErrorToast } from '@/lib/toast-utils';

interface OwnerProfileProps {
  onNext: () => void;
  onPrev: () => void;
  onUpdateData: (data: any) => void;
  data: any;
}

const employeeRanges = [
  { id: '10-20', label: '10-20', description: 'Small team' },
  { id: '20-50', label: '20-50', description: 'Growing business' },
  { id: '50-100', label: '50-100', description: 'Medium enterprise' },
  { id: '100+', label: '100+', description: 'Large enterprise' }
];

// ── Designation chip set (Owner Profile additional fields) ─────────────
// Six common designations; "other" reveals a free-text input below so the
// chip stays selected while the user types their custom title.
const designationOptions = [
  { id: 'proprietor', label: 'Proprietor' },
  { id: 'ceo', label: 'CEO' },
  { id: 'director', label: 'Director' },
  { id: 'managing-director', label: 'Managing Director' },
  { id: 'founder', label: 'Founder' },
];
const DESIGNATION_IDS = new Set(designationOptions.map((d) => d.id));
const DESIGNATION_OTHER = 'other';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const calculateDuration = (startDate: string) => {
  if (!startDate) return '00Y / 00M';
  const start = new Date(startDate);
  const now = new Date();
  if (isNaN(start.getTime()) || start > now) return '00Y / 00M';
  
  let years = now.getFullYear() - start.getFullYear();
  let months = now.getMonth() - start.getMonth();
  
  if (months < 0) {
    years--;
    months += 12;
  }
  
  const yy = years.toString().padStart(2, '0');
  const mm = months.toString().padStart(2, '0');
  return `${yy}Y / ${mm}M`;
};

// ── Company-type → owner structure (Change 14) ────────────────────────
// CompanyDetails stores `businessType` as one of the four ids below (or
// "other"/empty). We use that to decide:
//   - whether multiple owner/director/partner rows are allowed,
//   - what label to render in the UI ("Director", "Partner", "Owner"),
//   - whether the "Add" button is visible at all.
type CompanyTypeKey =
  | 'proprietorship'
  | 'pvt-ltd'
  | 'partnership-firm'
  | 'llp';

interface OwnerStructureConfig {
  /** When false, the entire "Additional contacts" section is hidden. */
  allowMultiple: boolean;
  /** Singular noun used in card titles + Add button: "Director", "Partner", "Owner". */
  contactLabel: string;
  /** Plural form used in section heading: "Directors", "Partners". */
  contactLabelPlural: string;
  /** Description shown under the section heading. */
  description: string;
}

const OWNER_STRUCTURE: Record<CompanyTypeKey, OwnerStructureConfig> = {
  proprietorship: {
    allowMultiple: false,
    contactLabel: 'Owner',
    contactLabelPlural: 'Owners',
    description: 'A sole proprietorship has one owner — no additional contacts needed.',
  },
  'pvt-ltd': {
    allowMultiple: true,
    contactLabel: 'Director',
    contactLabelPlural: 'Directors',
    description: 'Add each director with their contact details.',
  },
  'partnership-firm': {
    allowMultiple: true,
    contactLabel: 'Partner',
    contactLabelPlural: 'Partners',
    description: 'Add each partner with their contact details.',
  },
  llp: {
    allowMultiple: true,
    contactLabel: 'Partner',
    contactLabelPlural: 'Partners',
    description: 'Add each designated partner with their contact details.',
  },
};

// Fallback for "other" / unset types — keeps the section available but
// uses generic copy.
const DEFAULT_OWNER_STRUCTURE: OwnerStructureConfig = {
  allowMultiple: true,
  contactLabel: 'Owner',
  contactLabelPlural: 'Owners',
  description: 'Add additional owners or directors with their contact details.',
};

function resolveOwnerStructure(businessType: string | undefined): OwnerStructureConfig {
  if (!businessType) return DEFAULT_OWNER_STRUCTURE;
  return (OWNER_STRUCTURE as Record<string, OwnerStructureConfig>)[businessType] ??
    DEFAULT_OWNER_STRUCTURE;
}

export default function OwnerProfile({ onNext, onPrev, onUpdateData, data }: OwnerProfileProps) {
  const [formData, setFormData] = useState({
    ownerName: data.ownerName || '',
    /** Designation id — one of the predefined options, or the raw user-typed
     *  value when the chip is "Other". `DESIGNATION_OTHER` ('other') is the
     *  placeholder used while the input is empty. */
    designation: data.designation || '',
    ownerEmail: data.ownerEmail || '',
    /** Optional secondary email. */
    ownerEmail2: data.ownerEmail2 || '',
    /** Primary phone — E.164 (e.g. "+919876543210") via PhoneInput. */
    ownerPhone: data.ownerPhone || '',
    /** Optional secondary phone. */
    ownerPhone2: data.ownerPhone2 || '',
    /** Optional landline. */
    ownerLandline: data.ownerLandline || '',
    businessStartDate: data.businessStartDate || data.yearEstablished || '',
    employeeCount: data.employeeCount || ''
  });

  const [additionalOwners, setAdditionalOwners] = useState<Array<{ name: string; email: string; phone: string }>>(
    data.additionalOwners || []
  );

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Render-phase sync (Vercel §5.1) — avoids the
  // `react-hooks/set-state-in-effect` rule and runs cleanly when the
  // `data` prop reference changes (edit mode load, step navigation).
  const [prevData, setPrevData] = useState(data);
  if (data !== prevData) {
    setPrevData(data);
    setFormData({
      ownerName: data.ownerName || '',
      designation: data.designation || '',
      ownerEmail: data.ownerEmail || '',
      ownerEmail2: data.ownerEmail2 || '',
      ownerPhone: data.ownerPhone || '',
      ownerPhone2: data.ownerPhone2 || '',
      ownerLandline: data.ownerLandline || '',
      businessStartDate: data.businessStartDate || data.yearEstablished || '',
      employeeCount: data.employeeCount || '',
    });
    // Business-rule guard: when the upstream company type only allows a
    // single owner (proprietorship), drop any additional contacts that
    // came in. For multi-owner types we accept the incoming array as-is.
    const incomingConfig = resolveOwnerStructure(data.businessType);
    setAdditionalOwners(
      incomingConfig.allowMultiple ? data.additionalOwners || [] : [],
    );
  }

  // Owner-structure config derived from the upstream company type.
  // Drives whether the "Additional contacts" section + button render
  // and what label to use ("Director" / "Partner" / "Owner").
  const ownerStructure = resolveOwnerStructure(data.businessType);

  const handleAddOwner = () => {
    // Defensive: ignore Add clicks when the company type only allows a
    // single owner. The button is hidden in the UI, but a stale event or
    // programmatic call shouldn't be able to bypass the rule either.
    if (!resolveOwnerStructure(data.businessType).allowMultiple) return;
    setAdditionalOwners(prev => [...prev, { name: '', email: '', phone: '' }]);
  };

  const handleRemoveOwner = (index: number) => {
    setAdditionalOwners(prev => prev.filter((_, i) => i !== index));
  };

  const handleOwnerFieldChange = (index: number, field: string, value: string) => {
    setAdditionalOwners(prev => prev.map((owner, i) =>
      i === index ? { ...owner, [field]: value } : owner
    ));
    // Clear error for this field
    const errorKey = `additionalOwner_${index}_${field}`;
    if (errors[errorKey]) {
      setErrors(prev => ({ ...prev, [errorKey]: '' }));
    }
  };

  const handleInputChange = useCallback(
    (field: string, value: any) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
      setErrors((prev) => (prev[field] ? { ...prev, [field]: '' } : prev));

      // Live phone validation — same pattern as CompanyDetails. Error only
      // *renders* after blur (touched gate), but updates live as the user
      // edits a previously-flagged number.
      if (field === 'ownerPhone' || field === 'ownerPhone2' || field === 'ownerLandline') {
        const labelMap: Record<string, string> = {
          ownerPhone: 'Phone Number 1',
          ownerPhone2: 'Phone Number 2',
          ownerLandline: 'Landline Number',
        };
        const liveErr = value
          ? validatePhoneE164(value, {
              required: field === 'ownerPhone',
              label: labelMap[field],
              isLive: true,
            })
          : '';
        setErrors((prev) => (prev[field] === liveErr ? prev : { ...prev, [field]: liveErr }));
      }
    },
    [],
  );

  const handleBlur = useCallback((field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));

    // Strict (non-live) phone validation on blur — flags too-short/empty.
    const phoneLabels: Record<string, string> = {
      ownerPhone: 'Phone Number 1',
      ownerPhone2: 'Phone Number 2',
      ownerLandline: 'Landline Number',
    };
    if (field in phoneLabels) {
      const value = (formData as any)[field] as string;
      if (value) {
        const err = validatePhoneE164(value, {
          required: field === 'ownerPhone',
          label: phoneLabels[field],
        });
        setErrors((prev) => (prev[field] === err ? prev : { ...prev, [field]: err }));
      }
    }
  }, [formData]);

  const handleNext = useCallback(() => {
    const newErrors: Record<string, string> = {};

    if (!formData.ownerName) newErrors.ownerName = 'Owner full name is required';

    // Designation: required, with "Other" requiring a typed value
    const dRaw = formData.designation;
    const isOtherSelected =
      dRaw === DESIGNATION_OTHER || (!!dRaw && !DESIGNATION_IDS.has(dRaw));
    if (!dRaw) {
      newErrors.designation = 'Please select your designation';
    } else if (isOtherSelected && (dRaw === DESIGNATION_OTHER || dRaw.trim().length < 2)) {
      newErrors.designation = 'Please type your designation';
    }

    // Email 1 (required)
    if (!formData.ownerEmail) {
      newErrors.ownerEmail = 'Email ID 1 is required';
    } else if (!EMAIL_RE.test(formData.ownerEmail)) {
      newErrors.ownerEmail = 'Please enter a valid email address';
    }
    // Email 2 (optional but must be valid + distinct when supplied)
    if (formData.ownerEmail2 && !EMAIL_RE.test(formData.ownerEmail2)) {
      newErrors.ownerEmail2 = 'Please enter a valid email address';
    } else if (
      formData.ownerEmail2 &&
      formData.ownerEmail &&
      formData.ownerEmail2.trim().toLowerCase() === formData.ownerEmail.trim().toLowerCase()
    ) {
      newErrors.ownerEmail2 = 'Email ID 2 must be different from Email ID 1';
    }

    // Phones — libphonenumber-js validates per country
    const phoneErr = validatePhoneE164(formData.ownerPhone, {
      required: true,
      label: 'Phone Number 1',
    });
    if (phoneErr) newErrors.ownerPhone = phoneErr;
    const phone2Err = validatePhoneE164(formData.ownerPhone2, {
      required: false,
      label: 'Phone Number 2',
    });
    if (phone2Err) newErrors.ownerPhone2 = phone2Err;
    const landlineErr = validatePhoneE164(formData.ownerLandline, {
      required: false,
      label: 'Landline Number',
    });
    if (landlineErr) newErrors.ownerLandline = landlineErr;

    if (!formData.businessStartDate) newErrors.businessStartDate = 'Start date is required';
    if (!formData.employeeCount) newErrors.employeeCount = 'Please pick an employee range';

    // Additional contacts (only validate filled rows, and only when the
    // company type actually allows multiple — proprietorship has none).
    const allowMultiple = resolveOwnerStructure(data.businessType).allowMultiple;
    if (allowMultiple) additionalOwners.forEach((owner, index) => {
      if (owner.name || owner.email || owner.phone) {
        if (!owner.name) newErrors[`additionalOwner_${index}_name`] = 'Name is required';
        if (!owner.email) {
          newErrors[`additionalOwner_${index}_email`] = 'Email is required';
        } else if (!EMAIL_RE.test(owner.email)) {
          newErrors[`additionalOwner_${index}_email`] = 'Invalid email';
        }
        const ownerPhoneErr = validatePhoneE164(owner.phone, {
          required: true,
          label: 'Phone',
        });
        if (ownerPhoneErr) newErrors[`additionalOwner_${index}_phone`] = ownerPhoneErr;
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      const allTouched: Record<string, boolean> = {};
      Object.keys(newErrors).forEach((key) => {
        allTouched[key] = true;
      });
      setTouched(allTouched);

      const count = Object.keys(newErrors).length;
      showErrorToast(
        count === 1
          ? '1 field needs your attention'
          : `${count} fields need your attention`,
        'Scroll down to the highlighted field and fix it to continue.',
      );

      requestAnimationFrame(() => {
        scrollToFirstError(newErrors, {
          fieldOrder: [
            'ownerName',
            'designation',
            'ownerEmail',
            'ownerEmail2',
            'ownerPhone',
            'ownerPhone2',
            'ownerLandline',
            'businessStartDate',
            'employeeCount',
          ],
          selectorMap: {
            designation: '[data-field="designation"]',
            ownerPhone: '[name="ownerPhone"]',
            ownerPhone2: '[name="ownerPhone2"]',
            ownerLandline: '[name="ownerLandline"]',
            employeeCount: '[data-field="employeeCount"]',
          },
        });
      });
      return;
    }

    // Filter out empty additional owners
    const filledOwners = additionalOwners.filter((o) => o.name || o.email || o.phone);
    onUpdateData({
      ...formData,
      additionalOwners: filledOwners.length > 0 ? filledOwners : undefined,
    });
    onNext();
  }, [formData, additionalOwners, data.businessType, onUpdateData, onNext]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-4 sm:px-6 sm:py-6 space-y-5 font-sans animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex items-center gap-3 pb-2">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-brand-50 text-brand-600 shrink-0">
          <User className="w-5 h-5" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <h2 className="text-headline-md text-gray-900 leading-tight" style={{ textWrap: "balance" as any }}>
            Owner & Business Profile
          </h2>
          <p className="text-sm text-gray-600 mt-0.5">
            Tell us about the business owner and company history
          </p>
        </div>
      </div>

      {/* Owner Details */}
      <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-6 pt-6 pb-4 border-b border-slate-100">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <User className="w-5 h-5 text-gray-500 shrink-0" aria-hidden="true" />
            Owner Information
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Identity and contact details for the primary point-of-contact.
          </p>
        </div>
        <div className="p-6 space-y-5">
          {/* Owner Name */}
          <div>
            <label htmlFor="ownerName" className="block text-sm font-medium text-gray-700 mb-1.5">
              Owner Full Name <span className="text-red-500" aria-hidden="true">*</span>
            </label>
            <input
              id="ownerName"
              type="text"
              name="ownerName"
              value={formData.ownerName}
              onChange={(e) => handleInputChange('ownerName', e.target.value)}
              onBlur={() => handleBlur('ownerName')}
              autoComplete="name"
              className={`w-full px-4 py-3 border rounded-lg outline-none focus-visible:ring-1 focus-visible:ring-brand-500 focus-visible:border-brand-500 transition-colors ${
                errors.ownerName && touched.ownerName
                  ? 'border-red-500 bg-red-50'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
              placeholder="Enter owner's full name"
            />
            {errors.ownerName && touched.ownerName && (
              <p className="text-red-600 text-sm mt-1 font-medium" role="alert">
                {errors.ownerName}
              </p>
            )}
          </div>

          {/* Designation — chip group + "Other" conditional input */}
          {(() => {
            const d = formData.designation;
            const isOtherTyped =
              !!d && d !== DESIGNATION_OTHER && !DESIGNATION_IDS.has(d);
            const otherSelected = d === DESIGNATION_OTHER || isOtherTyped;
            const otherValue = isOtherTyped ? d : '';
            const invalid = !!(errors.designation && touched.designation);
            return (
              <div>
                <label
                  id="designation-label"
                  className="block text-sm font-medium text-gray-700 mb-1.5"
                >
                  Designation <span className="text-red-500" aria-hidden="true">*</span>
                </label>
                <p className="text-xs text-gray-500 -mt-0.5 mb-2">
                  Role of this person at the company.
                </p>
                <div
                  className="flex flex-wrap gap-2"
                  role="radiogroup"
                  aria-labelledby="designation-label"
                  data-field="designation"
                >
                  {designationOptions.map((opt) => (
                    <ToggleButton
                      key={opt.id}
                      selected={d === opt.id}
                      invalid={invalid && !d}
                      onClick={() => handleInputChange('designation', opt.id)}
                    >
                      {opt.label}
                    </ToggleButton>
                  ))}
                  <ToggleButton
                    selected={otherSelected}
                    invalid={invalid && !d}
                    onClick={() => {
                      if (!otherSelected) handleInputChange('designation', DESIGNATION_OTHER);
                    }}
                  >
                    Other
                  </ToggleButton>
                </div>

                {otherSelected && (
                  <div className="mt-3 max-w-md">
                    <label
                      htmlFor="designationOther"
                      className="block text-sm font-medium text-gray-700 mb-1.5"
                    >
                      Specify your designation
                      <span className="text-red-500 ml-1" aria-hidden="true">*</span>
                    </label>
                    <input
                      id="designationOther"
                      type="text"
                      name="designationOther"
                      value={otherValue}
                      onChange={(e) => {
                        const v = e.target.value;
                        // Empty input falls back to placeholder so chip stays selected
                        handleInputChange('designation', v.trim() === '' ? DESIGNATION_OTHER : v);
                      }}
                      onBlur={() => handleBlur('designation')}
                      placeholder="e.g. Partner, Co-Founder, Head of Operations…"
                      autoComplete="off"
                      className={`w-full px-4 py-2.5 border rounded-lg outline-none focus-visible:ring-1 focus-visible:ring-brand-500 focus-visible:border-brand-500 transition-colors ${
                        invalid ? 'border-red-500 bg-red-50' : 'border-slate-200 hover:border-slate-300'
                      }`}
                    />
                  </div>
                )}

                {invalid && (
                  <p className="text-red-600 text-sm mt-2 font-medium" role="alert">
                    {errors.designation}
                  </p>
                )}
              </div>
            );
          })()}

          {/* Emails — primary required, secondary optional, 2-col on sm+ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="ownerEmail" className="block text-sm font-medium text-gray-700 mb-1.5">
                Email ID 1 <span className="text-red-500" aria-hidden="true">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" aria-hidden="true" />
                <input
                  id="ownerEmail"
                  type="email"
                  name="ownerEmail"
                  value={formData.ownerEmail}
                  onChange={(e) => handleInputChange('ownerEmail', e.target.value)}
                  onBlur={() => handleBlur('ownerEmail')}
                  autoComplete="email"
                  inputMode="email"
                  spellCheck={false}
                  className={`w-full pl-9 pr-4 py-3 border rounded-lg outline-none focus-visible:ring-1 focus-visible:ring-brand-500 focus-visible:border-brand-500 transition-colors ${
                    errors.ownerEmail && touched.ownerEmail
                      ? 'border-red-500 bg-red-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                  placeholder="owner@company.com"
                />
              </div>
              {errors.ownerEmail && touched.ownerEmail && (
                <p className="text-red-600 text-sm mt-1 font-medium" role="alert">
                  {errors.ownerEmail}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="ownerEmail2" className="block text-sm font-medium text-gray-700 mb-1.5">
                Email ID 2{' '}
                <span className="text-gray-400 text-xs font-normal">(optional)</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" aria-hidden="true" />
                <input
                  id="ownerEmail2"
                  type="email"
                  name="ownerEmail2"
                  value={formData.ownerEmail2}
                  onChange={(e) => handleInputChange('ownerEmail2', e.target.value)}
                  onBlur={() => handleBlur('ownerEmail2')}
                  autoComplete="off"
                  inputMode="email"
                  spellCheck={false}
                  className={`w-full pl-9 pr-4 py-3 border rounded-lg outline-none focus-visible:ring-1 focus-visible:ring-brand-500 focus-visible:border-brand-500 transition-colors ${
                    errors.ownerEmail2 && touched.ownerEmail2
                      ? 'border-red-500 bg-red-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                  placeholder="alternate@company.com"
                />
              </div>
              {errors.ownerEmail2 && touched.ownerEmail2 && (
                <p className="text-red-600 text-sm mt-1 font-medium" role="alert">
                  {errors.ownerEmail2}
                </p>
              )}
            </div>
          </div>

          {/* Phones — Phone 1 required, Phone 2 + Landline optional */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Phone Number 1 <span className="text-red-500" aria-hidden="true">*</span>
              </label>
              <PhoneInput
                name="ownerPhone"
                value={formData.ownerPhone}
                onChange={(v) => handleInputChange('ownerPhone', v)}
                onBlur={() => handleBlur('ownerPhone')}
                invalid={!!(errors.ownerPhone && touched.ownerPhone)}
                placeholder="9876543210"
                autoComplete="tel"
              />
              {errors.ownerPhone && touched.ownerPhone && (
                <p className="text-red-600 text-sm mt-1 font-medium" role="alert">
                  {errors.ownerPhone}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Phone Number 2{' '}
                <span className="text-gray-400 text-xs font-normal">(optional)</span>
              </label>
              <PhoneInput
                name="ownerPhone2"
                value={formData.ownerPhone2}
                onChange={(v) => handleInputChange('ownerPhone2', v)}
                onBlur={() => handleBlur('ownerPhone2')}
                invalid={!!(errors.ownerPhone2 && touched.ownerPhone2)}
                placeholder="9876543210"
                autoComplete="off"
              />
              {errors.ownerPhone2 && touched.ownerPhone2 && (
                <p className="text-red-600 text-sm mt-1 font-medium" role="alert">
                  {errors.ownerPhone2}
                </p>
              )}
            </div>

            <div className="sm:col-span-2 sm:max-w-md">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Landline Number{' '}
                <span className="text-gray-400 text-xs font-normal">(optional)</span>
              </label>
              <PhoneInput
                name="ownerLandline"
                value={formData.ownerLandline}
                onChange={(v) => handleInputChange('ownerLandline', v)}
                onBlur={() => handleBlur('ownerLandline')}
                invalid={!!(errors.ownerLandline && touched.ownerLandline)}
                placeholder="2228175000"
                autoComplete="off"
              />
              {errors.ownerLandline && touched.ownerLandline && (
                <p className="text-red-600 text-sm mt-1 font-medium" role="alert">
                  {errors.ownerLandline}
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Additional Contacts (Directors / Partners / Owners) — only
         rendered when the upstream company type allows multiple contacts.
         Proprietorship has a single owner, so the section is hidden. */}
      {ownerStructure.allowMultiple ? (
      <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-6 pt-6 pb-4 border-b border-slate-100 flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-gray-500 shrink-0" aria-hidden="true" />
              Additional {ownerStructure.contactLabelPlural}
            </h3>
            <p className="text-sm text-gray-600 mt-1">{ownerStructure.description}</p>
          </div>
          <button
            type="button"
            onClick={handleAddOwner}
            className="shrink-0 inline-flex items-center gap-2 h-9 px-3 text-sm font-medium text-brand-700 bg-brand-50 border border-brand-500/30 rounded-md hover:bg-brand-100 hover:border-brand-500/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            Add {ownerStructure.contactLabel}
          </button>
        </div>
        <div className="px-6 py-6 space-y-4">
          {additionalOwners.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-2">
              No additional {ownerStructure.contactLabelPlural.toLowerCase()} added yet.
              {' '}
              <button
                type="button"
                onClick={handleAddOwner}
                className="text-brand-700 font-medium hover:text-brand-600 underline-offset-2 hover:underline"
              >
                Add a {ownerStructure.contactLabel.toLowerCase()}
              </button>
              {' '}to get started.
            </p>
          ) : (
            additionalOwners.map((owner, index) => (
              <div key={index} className="p-4 border border-gray-200 rounded-lg bg-gray-50/40 relative">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-gray-800">
                    {ownerStructure.contactLabel} {index + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveOwner(index)}
                    aria-label={`Remove ${ownerStructure.contactLabel} ${index + 1}`}
                    className="inline-flex items-center gap-1 text-sm text-red-600 hover:text-red-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/40 rounded"
                  >
                    <Trash2 className="w-4 h-4" aria-hidden="true" />
                    Remove
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Full Name <span className="text-red-500" aria-hidden="true">*</span>
                    </label>
                    <input
                      type="text"
                      value={owner.name}
                      onChange={(e) => handleOwnerFieldChange(index, 'name', e.target.value)}
                      autoComplete="off"
                      className={`w-full px-3 py-2 border rounded-lg outline-none focus-visible:ring-1 focus-visible:ring-brand-500 focus-visible:border-brand-500 transition-colors text-sm ${
                        errors[`additionalOwner_${index}_name`]
                          ? 'border-red-500 bg-red-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                      placeholder={`${ownerStructure.contactLabel} name`}
                    />
                    {errors[`additionalOwner_${index}_name`] && (
                      <p className="text-red-600 text-xs mt-1 font-medium" role="alert">
                        {errors[`additionalOwner_${index}_name`]}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Email <span className="text-red-500" aria-hidden="true">*</span>
                    </label>
                    <input
                      type="email"
                      value={owner.email}
                      onChange={(e) => handleOwnerFieldChange(index, 'email', e.target.value)}
                      autoComplete="off"
                      inputMode="email"
                      spellCheck={false}
                      className={`w-full px-3 py-2 border rounded-lg outline-none focus-visible:ring-1 focus-visible:ring-brand-500 focus-visible:border-brand-500 transition-colors text-sm ${
                        errors[`additionalOwner_${index}_email`]
                          ? 'border-red-500 bg-red-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                      placeholder="contact@email.com"
                    />
                    {errors[`additionalOwner_${index}_email`] && (
                      <p className="text-red-600 text-xs mt-1 font-medium" role="alert">
                        {errors[`additionalOwner_${index}_email`]}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Phone <span className="text-red-500" aria-hidden="true">*</span>
                    </label>
                    <input
                      type="tel"
                      value={owner.phone}
                      onChange={(e) => handleOwnerFieldChange(index, 'phone', e.target.value)}
                      autoComplete="off"
                      inputMode="tel"
                      className={`w-full px-3 py-2 border rounded-lg outline-none focus-visible:ring-1 focus-visible:ring-brand-500 focus-visible:border-brand-500 transition-colors text-sm ${
                        errors[`additionalOwner_${index}_phone`]
                          ? 'border-red-500 bg-red-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                      placeholder="+91 98765 43210"
                    />
                    {errors[`additionalOwner_${index}_phone`] && (
                      <p className="text-red-500 text-xs mt-1">{errors[`additionalOwner_${index}_phone`]}</p>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
      ) : (
        // Proprietorship — single owner only. Show an info note instead of
        // the Add-owner section so the user understands why it's hidden.
        <section className="bg-white border border-slate-200 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <Users className="w-5 h-5 mt-0.5 text-gray-400 shrink-0" aria-hidden="true" />
            <p className="text-sm text-gray-600">
              {ownerStructure.description}{' '}
              <span className="text-gray-500">
                Switch the business type on the previous step to add directors or partners.
              </span>
            </p>
          </div>
        </section>
      )}

      {/* Business History */}
      <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-6 pt-6 pb-4 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <Calendar className="w-5 h-5 mr-2" />
            Business History
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            When did you start operations?
          </p>
        </div>
        <div className="p-6 max-w-3xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label htmlFor="businessStartDate" className="block text-sm font-medium text-gray-700 mb-1.5">
                Start Business <span className="text-red-500">*</span>
              </label>
              <input
                id="businessStartDate"
                type="date"
                name="businessStartDate"
                value={formData.businessStartDate}
                onChange={(e) => handleInputChange('businessStartDate', e.target.value)}
                onBlur={() => handleBlur('businessStartDate')}
                max={new Date().toISOString().split('T')[0]}
                className={`w-full px-4 py-3 border rounded-lg outline-none focus-visible:ring-1 focus-visible:ring-brand-500 focus-visible:border-brand-500 transition-colors ${
                  errors.businessStartDate && touched.businessStartDate
                    ? 'border-red-500 bg-red-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              />
              {errors.businessStartDate && touched.businessStartDate && (
                <p className="text-red-500 text-sm mt-1">{errors.businessStartDate}</p>
              )}
            </div>
            
            <div>
              <label htmlFor="tillDate" className="block text-sm font-medium text-gray-700 mb-1.5">
                Till Date
              </label>
              <input
                id="tillDate"
                type="text"
                value="Present"
                disabled
                className="w-full px-4 py-3 border border-slate-200 rounded-lg bg-slate-50 text-slate-500 cursor-not-allowed"
              />
            </div>
          </div>
          
          <div className="mt-8 pt-6 border-t border-slate-100">
            <h3 className="text-base font-semibold text-gray-900 mb-4">Business Experience</h3>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-6">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-700 font-medium">Total Business Duration:</span>
                <span className="text-slate-900 font-semibold text-base">
                  {calculateDuration(formData.businessStartDate)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Employee Count */}
      <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-6 pt-6 pb-4 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <Users className="w-5 h-5 mr-2" />
            Company Size
          </h2>
        </div>
        <div className="p-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-4">
              Number of Employees <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {employeeRanges.map((range) => (
                <button
                  type="button"
                  key={range.id}
                  onClick={() => handleInputChange('employeeCount', formData.employeeCount === range.id ? '' : range.id)}
                  className={`p-4 border rounded-lg cursor-pointer transition-all duration-200 text-center outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:border-brand-500 active:scale-[0.98] ${
                    formData.employeeCount === range.id
                      ? 'border-brand-500 bg-brand-50 shadow-sm shadow-brand-500/10'
                      : errors.employeeCount && touched.employeeCount
                      ? 'border-red-500 bg-red-50 hover:bg-red-100 hover:border-red-600'
                      : 'border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 hover:shadow-sm'
                  }`}
                >
                  <div className={`font-medium text-lg ${formData.employeeCount === range.id ? 'text-brand-900' : 'text-slate-900'}`}>{range.label}</div>
                  <div className={`text-sm mt-0.5 ${formData.employeeCount === range.id ? 'text-brand-700' : 'text-slate-500'}`}>{range.description}</div>
                </button>
              ))}
            </div>
            {errors.employeeCount && touched.employeeCount && (
              <p className="text-red-500 text-sm mt-2">{errors.employeeCount}</p>
            )}
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
          Back to Warehouse Details
        </Button>
        <Button
          onClick={handleNext}
          className="inline-flex items-center gap-2 h-11 px-6 text-sm font-semibold text-white bg-brand-500 hover:bg-brand-600 transition-colors shadow-sm shadow-brand-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
        >
          Save &amp; Continue to Vendor Type
          <ArrowRight className="w-4 h-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}