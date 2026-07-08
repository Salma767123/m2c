'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/UI/Button';
import { User, Calendar, Users, Mail, Plus, Trash2, ArrowLeft, ArrowRight, IdCard, Phone as PhoneIcon, Image as ImageIcon } from 'lucide-react';
import { ToggleButton, PhoneInput, validatePhoneE164, AccordionSection, LocalLandlineInput, parsePhone, TitleSelect, type LocalLandlineValue } from '@/components/VendorHub/FormUI';
import { scrollToFirstError } from '@/lib/formErrorScroll';
import { calculateDuration } from '@/lib/utils';
import { handleUpload } from '@/lib/toast-utils';
import { centerNotice } from '@/components/UI/CenterNotice';
import ImageCropModal from '@/components/UI/ImageCropModal';

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

// ── Step 3 accordion section map ─────────────────────────────────────────
// `SECTION_FIELDS` lists every form field that belongs to the section so
// auto-expand-on-error knows which sections to keep visible after a failed
// Save & Continue. `SECTION_REQUIRED` is the strict subset of fields that
// must be filled for the green "complete" checkmark to render in the
// section header. Additional contacts are validated dynamically (the team
// section toggles by whether any partial rows exist), so they're not
// listed here. Keep these in lockstep with the validation in handleNext.
const SECTION_FIELDS: Record<string, string[]> = {
  identity: ['designation', 'ownerFirstName', 'ownerLastName', 'ownerPhoto'],
  contact: ['ownerEmail', 'ownerEmail2', 'ownerPhone', 'ownerPhone2', 'ownerLandline'],
  team: [],
  history: ['businessStartDate'],
  size: ['employeeCount'],
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

const MAX_ADDITIONAL_OWNERS = 4;

const OWNER_STRUCTURE: Record<string, OwnerStructureConfig> = {
  proprietorship: {
    allowMultiple: false,
    contactLabel: 'Owner',
    contactLabelPlural: 'Owners',
    description: 'A sole proprietorship has one owner — no additional contacts needed.',
  },
  unregistered: {
    allowMultiple: false,
    contactLabel: 'Owner',
    contactLabelPlural: 'Owners',
    description: 'An unregistered vendor has one owner — no additional contacts needed.',
  },
  'pvt-ltd': {
    allowMultiple: true,
    contactLabel: 'Owner',
    contactLabelPlural: 'Owners',
    description: 'Add each owner with their contact details.',
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

// Fallback for "others" / unset types — single owner only.
const DEFAULT_OWNER_STRUCTURE: OwnerStructureConfig = {
  allowMultiple: false,
  contactLabel: 'Owner',
  contactLabelPlural: 'Owners',
  description: 'Only one owner is allowed for this business type.',
};

function resolveOwnerStructure(businessType: string | undefined): OwnerStructureConfig {
  if (!businessType) return DEFAULT_OWNER_STRUCTURE;
  return (OWNER_STRUCTURE as Record<string, OwnerStructureConfig>)[businessType] ??
    DEFAULT_OWNER_STRUCTURE;
}

export default function OwnerProfile({ onNext, onPrev, onUpdateData, data }: OwnerProfileProps) {
  const [formData, setFormData] = useState({
    ownerTitle: data.ownerTitle || '',
    ownerFirstName: data.ownerFirstName || (data.ownerName ? data.ownerName.split(' ')[0] : ''),
    ownerMiddleName: data.ownerMiddleName || '',
    ownerLastName: data.ownerLastName || (data.ownerName && data.ownerName.includes(' ') ? data.ownerName.split(' ').slice(1).join(' ') : ''),
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
    /** Local landline STD code (India, locked +91). */
    ownerLocalLandlineStd: data.ownerLocalLandlineStd || '',
    /** Local landline subscriber number. */
    ownerLocalLandlineNumber: data.ownerLocalLandlineNumber || (data.ownerLandline ? parsePhone(data.ownerLandline).national : ''),
    /** International landline — assembled dial+std+number or empty. */
    ownerIntlLandlineCountryCode: data.ownerIntlLandlineCountryCode || parsePhone(data.ownerIntlLandline || '').dial,
    ownerIntlLandlineStd: data.ownerIntlLandlineStd || '',
    ownerIntlLandlineNumber: data.ownerIntlLandlineNumber || parsePhone(data.ownerIntlLandline || '').national,
    businessStartDate: data.businessStartDate || data.yearEstablished || '',
    employeeCount: data.employeeCount || '',
    /** Owner profile photo — preview URL (object URL or remote) for display. */
    ownerPhoto: data.ownerPhoto || null,
    /** Owner profile photo — the File pending upload (optional). */
    ownerPhotoFile: data.ownerPhotoFile || null
  });

  // Additional contact shape mirrors the primary owner so admins reading a
  // partnership / Pvt Ltd / LLP vendor get the same detail per director/partner.
  // All fields except name / email / phone are optional.
  const [additionalOwners, setAdditionalOwners] = useState<Array<{
    title?: string;
    firstName: string;
    middleName?: string;
    lastName: string;
    designation?: string;
    email: string;
    email2?: string;
    phone: string;
    phone2?: string;
    landline?: string; // legacy
    localLandlineStd: string;
    localLandline: string;
    intlLandlineCountryCode: string;
    intlLandlineStd: string;
    intlLandlineNumber: string;
  }>>(
    (data.additionalOwners || []).map((o: any) => ({
      ...o,
      title: o.title || '',
      firstName: o.firstName || (o.name ? o.name.split(' ')[0] : ''),
      middleName: o.middleName || '',
      lastName: o.lastName || (o.name && o.name.includes(' ') ? o.name.split(' ').slice(1).join(' ') : ''),
      localLandlineStd: o.localLandlineStd || '',
      localLandline: o.localLandline || (o.landline ? parsePhone(o.landline).national : ''),
      intlLandlineCountryCode: o.intlLandlineCountryCode || parsePhone(o.intlLandline || '').dial,
      intlLandlineStd: o.intlLandlineStd || '',
      intlLandlineNumber: o.intlLandlineNumber || parsePhone(o.intlLandline || '').national,
    }))
  );

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Builds the payload persisted to VendorPanel — filters empty additional
  // owners, joins the owner name parts, and assembles landline strings.
  // Shared by handleNext (Save & Continue) and the unmount sync below so
  // both paths store an identical shape.
  const buildPersistPayload = () => {
    const filledOwners = additionalOwners
      .filter((o) => o.firstName || o.email || o.phone)
      .map((o) => {
        const ownerLocalLandline = (o.localLandlineStd + o.localLandline).trim();
        const ownerIntlLandline = (o.intlLandlineCountryCode + o.intlLandlineStd + o.intlLandlineNumber).replace(/^\+?$/, '');
        return {
          ...o,
          name: [o.title, o.firstName, o.middleName, o.lastName].filter(Boolean).join(' '),
          localLandline: ownerLocalLandline || undefined,
          localLandlineStd: o.localLandlineStd || undefined,
          intlLandline: ownerIntlLandline || undefined,
          intlLandlineCountryCode: o.intlLandlineCountryCode || undefined,
          intlLandlineStd: o.intlLandlineStd || undefined,
          intlLandlineNumber: o.intlLandlineNumber || undefined,
        };
      });
    const localLandline = (formData.ownerLocalLandlineStd + formData.ownerLocalLandlineNumber).trim();
    const intlLandline = (formData.ownerIntlLandlineCountryCode + formData.ownerIntlLandlineStd + formData.ownerIntlLandlineNumber).replace(/^\+?$/, '');
    return {
      ...formData,
      ownerName: [formData.ownerTitle, formData.ownerFirstName, formData.ownerMiddleName, formData.ownerLastName].filter(Boolean).join(' '),
      ownerLandline: localLandline || undefined,
      ownerLocalLandlineStd: formData.ownerLocalLandlineStd || undefined,
      ownerLocalLandlineNumber: formData.ownerLocalLandlineNumber || undefined,
      ownerIntlLandline: intlLandline || undefined,
      ownerIntlLandlineCountryCode: formData.ownerIntlLandlineCountryCode || undefined,
      ownerIntlLandlineStd: formData.ownerIntlLandlineStd || undefined,
      ownerIntlLandlineNumber: formData.ownerIntlLandlineNumber || undefined,
      additionalOwners: filledOwners.length > 0 ? filledOwners : undefined,
    };
  };

  // Push the latest local state up whenever this step unmounts (Back
  // button, sidebar jump, edit-from-review) — not only on Save & Continue —
  // so the Review step always reflects the latest edits.
  const persistRef = useRef<any>(null);
  persistRef.current = buildPersistPayload();
  const onUpdateDataRef = useRef(onUpdateData);
  onUpdateDataRef.current = onUpdateData;
  useEffect(() => () => onUpdateDataRef.current(persistRef.current), []);

  // Accordion: single-active-section pattern matching Step 1
  // (CompanyDetails.tsx → AccordionSection). One section open at a time;
  // clicking a different section's header switches the focus. Default to
  // the first section so a new visitor sees Owner Identity expanded.
  type SectionKey = 'identity' | 'contact' | 'team' | 'history' | 'size';
  const [activeSection, setActiveSection] = useState<SectionKey>('identity');

  // Maps each form field name → the section that owns it. Used by handleNext
  // to auto-open the section containing the first failed field (mirrors
  // Step 1's pattern at CompanyDetails.tsx:929).
  const FIELD_SECTION_MAP: Record<string, SectionKey> = {
    ownerTitle: 'identity',
    ownerFirstName: 'identity',
    ownerMiddleName: 'identity',
    ownerLastName: 'identity',
    designation: 'identity',
    ownerPhoto: 'identity',
    ownerEmail: 'contact',
    ownerEmail2: 'contact',
    ownerPhone: 'contact',
    ownerPhone2: 'contact',
    ownerLocalLandlineStd: 'contact',
    ownerLocalLandlineNumber: 'contact',
    ownerIntlLandlineCountryCode: 'contact',
    ownerIntlLandlineStd: 'contact',
    ownerIntlLandlineNumber: 'contact',
    businessStartDate: 'history',
    employeeCount: 'size',
  };

  // Render-phase sync (Vercel §5.1) — avoids the
  // `react-hooks/set-state-in-effect` rule and runs cleanly when the
  // `data` prop reference changes (edit mode load, step navigation).
  const [prevData, setPrevData] = useState(data);
  if (data !== prevData) {
    setPrevData(data);
    setFormData({
      ownerTitle: data.ownerTitle || '',
      ownerFirstName: data.ownerFirstName || (data.ownerName ? data.ownerName.split(' ')[0] : ''),
      ownerMiddleName: data.ownerMiddleName || '',
      ownerLastName: data.ownerLastName || (data.ownerName && data.ownerName.includes(' ') ? data.ownerName.split(' ').slice(1).join(' ') : ''),
      designation: data.designation || '',
      ownerEmail: data.ownerEmail || '',
      ownerEmail2: data.ownerEmail2 || '',
      ownerPhone: data.ownerPhone || '',
      ownerPhone2: data.ownerPhone2 || '',
      ownerLocalLandlineStd: data.ownerLocalLandlineStd || '',
      ownerLocalLandlineNumber: data.ownerLocalLandlineNumber || (data.ownerLandline ? parsePhone(data.ownerLandline).national : ''),
      ownerIntlLandlineCountryCode: data.ownerIntlLandlineCountryCode || parsePhone(data.ownerIntlLandline || '').dial,
      ownerIntlLandlineStd: data.ownerIntlLandlineStd || '',
      ownerIntlLandlineNumber: data.ownerIntlLandlineNumber || parsePhone(data.ownerIntlLandline || '').national,
      businessStartDate: data.businessStartDate || data.yearEstablished || '',
      employeeCount: data.employeeCount || '',
      ownerPhoto: data.ownerPhoto || null,
      ownerPhotoFile: data.ownerPhotoFile || null,
    });
    // Business-rule guard: when the upstream company type only allows a
    // single owner (proprietorship), drop any additional contacts that
    // came in. For multi-owner types we accept the incoming array as-is.
    const incomingConfig = resolveOwnerStructure(data.businessType);
    setAdditionalOwners(
      incomingConfig.allowMultiple
        ? (data.additionalOwners || []).map((o: any) => ({
            ...o,
            title: o.title || '',
            firstName: o.firstName || (o.name ? o.name.split(' ')[0] : ''),
            middleName: o.middleName || '',
            lastName: o.lastName || (o.name && o.name.includes(' ') ? o.name.split(' ').slice(1).join(' ') : ''),
            localLandlineStd: o.localLandlineStd || '',
            localLandline: o.localLandline || (o.landline ? parsePhone(o.landline).national : ''),
            intlLandlineCountryCode: o.intlLandlineCountryCode || parsePhone(o.intlLandline || '').dial,
            intlLandlineStd: o.intlLandlineStd || '',
            intlLandlineNumber: o.intlLandlineNumber || parsePhone(o.intlLandline || '').national,
          }))
        : [],
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
    if (additionalOwners.length >= MAX_ADDITIONAL_OWNERS) return;
    setAdditionalOwners(prev => [...prev, {
      title: '',
      firstName: '',
      middleName: '',
      lastName: '',
      designation: '',
      email: '',
      email2: '',
      phone: '',
      phone2: '',
      landline: '',
      localLandlineStd: '',
      localLandline: '',
      intlLandlineCountryCode: '',
      intlLandlineStd: '',
      intlLandlineNumber: '',
    }]);
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
      if (field === 'ownerPhone' || field === 'ownerPhone2') {
        const labelMap: Record<string, string> = {
          ownerPhone: 'Primary Phone',
          ownerPhone2: 'Secondary Phone',
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
      ownerPhone: 'Primary Phone',
      ownerPhone2: 'Secondary Phone',
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

  // ── Owner profile photo upload ────────────────────────────────────────
  // Image-only, optional. Mirrors CompanyDetails' logo upload: validate via
  // handleUpload, store the File + an object-URL preview, revoke the prior
  // object URL on replace/remove to avoid leaks.
  const [ownerPhotoError, setOwnerPhotoError] = useState<string | null>(null);
  // Selected image awaiting crop (1:1). The image is only saved after the user
  // crops & confirms — never uploaded directly.
  const [cropState, setCropState] = useState<{ src: string; name: string } | null>(null);

  const openOwnerPhotoCropper = useCallback((file: File) => {
    // Non-images can't be cropped — route through the normal validator so the
    // user still gets the "must be an image" error notice.
    if (!file.type.startsWith('image/')) {
      handleOwnerPhotoFile(file);
      return;
    }
    setCropState({ src: URL.createObjectURL(file), name: file.name });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const closeCropper = useCallback(() => {
    setCropState((prev) => {
      if (prev?.src.startsWith('blob:')) URL.revokeObjectURL(prev.src);
      return null;
    });
  }, []);

  const handleOwnerPhotoFile = useCallback((file: File) => {
    const result = handleUpload(file, {
      label: 'Owner Photo',
      allowedTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'],
      allowedLabel: 'PNG, JPG, or WEBP',
      maxBytes: 2 * 1024 * 1024,
      maxLabel: '2,048 KB',
    });
    if (!result.ok) {
      setOwnerPhotoError(result.message);
      return;
    }
    const url = URL.createObjectURL(file);
    setFormData((prev) => {
      if (prev.ownerPhotoFile && typeof prev.ownerPhoto === 'string' && prev.ownerPhoto.startsWith('blob:')) {
        URL.revokeObjectURL(prev.ownerPhoto);
      }
      return { ...prev, ownerPhotoFile: file, ownerPhoto: url };
    });
    setOwnerPhotoError(null);
    setErrors((prev) => (prev.ownerPhoto ? { ...prev, ownerPhoto: '' } : prev));
  }, []);

  const handleOwnerPhotoChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) openOwnerPhotoCropper(file);
    // Reset the input so re-selecting the same file (e.g. after Remove) still fires onChange.
    e.target.value = '';
  }, [openOwnerPhotoCropper]);

  const handleOwnerPhotoDrop = useCallback((e: React.DragEvent<HTMLElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) openOwnerPhotoCropper(file);
  }, [openOwnerPhotoCropper]);

  const handleRemoveOwnerPhoto = useCallback(() => {
    setFormData((prev) => {
      if (prev.ownerPhotoFile && typeof prev.ownerPhoto === 'string' && prev.ownerPhoto.startsWith('blob:')) {
        URL.revokeObjectURL(prev.ownerPhoto);
      }
      return { ...prev, ownerPhotoFile: null, ownerPhoto: null };
    });
    setOwnerPhotoError(null);
  }, []);

  const handleOwnerPhotoDragOver = useCallback((e: React.DragEvent<HTMLElement>) => {
    e.preventDefault();
  }, []);

  const handleNext = useCallback(() => {
    const newErrors: Record<string, string> = {};

    if (!formData.ownerFirstName) newErrors.ownerFirstName = 'First name is required';
    if (!formData.ownerLastName) newErrors.ownerLastName = 'Last name is required';

    // Owner profile photo is mandatory — accept either a freshly chosen File
    // or an existing uploaded photo (edit mode).
    if (!formData.ownerPhotoFile && !formData.ownerPhoto) {
      newErrors.ownerPhoto = 'Owner profile photo is required';
    }

    // Designation: required, with "Other" requiring a typed value
    const dRaw = formData.designation;
    const isOtherSelected =
      dRaw === DESIGNATION_OTHER || (!!dRaw && !DESIGNATION_IDS.has(dRaw));
    if (!dRaw) {
      newErrors.designation = 'Please select your designation';
    } else if (isOtherSelected && (dRaw === DESIGNATION_OTHER || dRaw.trim().length < 2)) {
      newErrors.designation = 'Please type your designation';
    }

    // Primary email (required)
    if (!formData.ownerEmail) {
      newErrors.ownerEmail = 'Primary Email is required';
    } else if (!EMAIL_RE.test(formData.ownerEmail)) {
      newErrors.ownerEmail = 'Please enter a valid email address';
    }
    // Secondary email (optional but must be valid + distinct when supplied)
    if (formData.ownerEmail2 && !EMAIL_RE.test(formData.ownerEmail2)) {
      newErrors.ownerEmail2 = 'Please enter a valid email address';
    } else if (
      formData.ownerEmail2 &&
      formData.ownerEmail &&
      formData.ownerEmail2.trim().toLowerCase() === formData.ownerEmail.trim().toLowerCase()
    ) {
      newErrors.ownerEmail2 = 'Secondary Email must be different from Primary Email';
    }

    // Phones — libphonenumber-js validates per country
    const phoneErr = validatePhoneE164(formData.ownerPhone, {
      required: true,
      label: 'Primary Phone',
    });
    if (phoneErr) newErrors.ownerPhone = phoneErr;
    const phone2Err = validatePhoneE164(formData.ownerPhone2, {
      required: false,
      label: 'Secondary Phone',
    });
    if (phone2Err) newErrors.ownerPhone2 = phone2Err;
    if (!formData.businessStartDate) newErrors.businessStartDate = 'Start date is required';
    if (!formData.employeeCount) newErrors.employeeCount = 'Please pick an employee range';

    // Additional contacts (only validate filled rows, and only when the
    // company type actually allows multiple — proprietorship has none).
    const allowMultiple = resolveOwnerStructure(data.businessType).allowMultiple;
    if (allowMultiple) additionalOwners.forEach((owner, index) => {
      if (owner.firstName || owner.email || owner.phone) {
        if (!owner.firstName) newErrors[`additionalOwner_${index}_firstName`] = 'First name is required';
        if (!owner.lastName) newErrors[`additionalOwner_${index}_lastName`] = 'Last name is required';
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
      // Auto-open the section containing the first error so the field is
      // visible the instant the user lands on the failing field (mirrors
      // Step 1's behaviour — CompanyDetails.tsx → handleNext).
      const fieldOrder = [
        'designation',
        'ownerTitle',
        'ownerFirstName',
        'ownerMiddleName',
        'ownerLastName',
        'ownerPhoto',
        'ownerEmail',
        'ownerEmail2',
        'ownerPhone',
        'ownerPhone2',
        'businessStartDate',
        'employeeCount',
      ];
      const firstErrorField = fieldOrder.find((f) => newErrors[f]);
      const targetSection = firstErrorField ? FIELD_SECTION_MAP[firstErrorField] : null;
      if (targetSection) setActiveSection(targetSection);
      const allTouched: Record<string, boolean> = {};
      Object.keys(newErrors).forEach((key) => {
        allTouched[key] = true;
      });
      setTouched(allTouched);

      const count = Object.keys(newErrors).length;
      centerNotice.warning(
        count === 1
          ? '1 field needs your attention'
          : `${count} fields need your attention`,
        'Scroll down to the highlighted field and fix it to continue.',
      );

      requestAnimationFrame(() => {
        scrollToFirstError(newErrors, {
          fieldOrder: [
            'designation',
            'ownerTitle',
            'ownerFirstName',
            'ownerMiddleName',
            'ownerLastName',
            'ownerPhoto',
            'ownerEmail',
            'ownerEmail2',
            'ownerPhone',
            'ownerPhone2',
            'businessStartDate',
            'employeeCount',
          ],
          selectorMap: {
            designation: '[data-field="designation"]',
            ownerPhoto: '[data-field="ownerPhoto"]',
            ownerPhone: '[name="ownerPhone"]',
            ownerPhone2: '[name="ownerPhone2"]',
            employeeCount: '[data-field="employeeCount"]',
          },
        });
      });
      return;
    }

    onUpdateData(persistRef.current);
    onNext();
  }, [formData, additionalOwners, data.businessType, onUpdateData, onNext]);

  // ── Section status helpers ─────────────────────────────────────────────
  // Mirrors Step 1's `getSectionStatus` (CompanyDetails.tsx) — returns one
  // of three states the accordion header surfaces as a colored badge:
  //   - 'complete' (green "Done")   → every required field filled
  //   - 'partial'  (amber "In progress") → some field touched but not all
  //   - 'empty'    (no badge)        → nothing entered yet
  const allowMultipleOwners = resolveOwnerStructure(data.businessType).allowMultiple;
  const getSectionStatus = (section: SectionKey): 'complete' | 'partial' | 'empty' => {
    if (section === 'identity') {
      const required = [formData.ownerFirstName, formData.ownerLastName, formData.designation, formData.ownerPhoto];
      const filled = required.filter(Boolean).length;
      if (filled === required.length) return 'complete';
      if (filled > 0) return 'partial';
      return 'empty';
    }
    if (section === 'contact') {
      const required = [formData.ownerEmail, formData.ownerPhone];
      const optional = [formData.ownerEmail2, formData.ownerPhone2, formData.ownerLocalLandlineNumber, formData.ownerIntlLandlineNumber];
      if (required.every(Boolean)) return 'complete';
      if (required.some(Boolean) || optional.some(Boolean)) return 'partial';
      return 'empty';
    }
    if (section === 'team') {
      // Optional section — "complete" once at least one row is filled,
      // "partial" if any partial row exists, otherwise "empty".
      if (!allowMultipleOwners) return 'empty';
      const filledRows = additionalOwners.filter((o) => o.firstName && o.email && o.phone);
      const partialRows = additionalOwners.filter((o) => o.firstName || o.email || o.phone);
      if (filledRows.length > 0 && filledRows.length === additionalOwners.length) return 'complete';
      if (partialRows.length > 0) return 'partial';
      return 'empty';
    }
    if (section === 'history') {
      if (formData.businessStartDate) return 'complete';
      return 'empty';
    }
    if (section === 'size') {
      if (formData.employeeCount) return 'complete';
      return 'empty';
    }
    return 'empty';
  };

  // Helper that computes the AccordionSection props for a given section id.
  // Spread into each JSX call (`<AccordionSection {...sectionProps('identity')} ...>`)
  // so the module-level component stays stateless while we close over the
  // local errors / activeSection / status state here.
  const sectionProps = (id: SectionKey) => {
    const isOpen = activeSection === id;
    const status = getSectionStatus(id);
    const fields = SECTION_FIELDS[id] || [];
    const teamErrorKeys =
      id === 'team' ? Object.keys(errors).filter((k) => k.startsWith('additionalOwner_')) : [];
    const hasErrors =
      (id === 'team' ? teamErrorKeys.length : fields.filter((f) => errors[f]).length) > 0;
    return {
      id,
      isOpen,
      status,
      hasErrors,
      onActivate: () => setActiveSection(id),
    };
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-4 sm:px-6 sm:py-6 space-y-5 font-sans animate-in fade-in slide-in-from-bottom-4 duration-500">
      <ImageCropModal
        src={cropState?.src ?? null}
        fileName={cropState?.name}
        title="Crop Owner Photo"
        onCancel={closeCropper}
        onCropped={(file) => {
          handleOwnerPhotoFile(file);
          closeCropper();
        }}
      />
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

      {/* ── Accordion Sections ──────────────────────────────────────────
          Same single-active-section pattern as Step 1 (CompanyDetails) so
          a vendor moving from Step 1 → Step 3 sees identical chrome,
          status badges, and interactions. */}
      <div className="space-y-3">

      <AccordionSection
        {...sectionProps('identity')}
        icon={<IdCard className="w-4.5 h-4.5" aria-hidden="true" />}
        title="Owner Identity"
        subtitle="Designation and owner full name"
      >
          {/* Top row: Designation (left) | Profile Photo (right) — side by side */}
          <div className="grid grid-cols-[1fr_auto] gap-5 items-start">

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
                        onClick={() => handleInputChange('designation', d === opt.id ? '' : opt.id)}
                      >
                        {opt.label}
                      </ToggleButton>
                    ))}
                    <ToggleButton
                      selected={otherSelected}
                      invalid={invalid && !d}
                      onClick={() => {
                        handleInputChange('designation', otherSelected ? '' : DESIGNATION_OTHER);
                      }}
                    >
                      Other
                    </ToggleButton>
                  </div>

                  {otherSelected && (
                    <div className="mt-3 max-w-sm">
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

            {/* Owner Profile Photo — right column, vertically aligned with Designation */}
            {(() => {
              const photoInvalid = !!(errors.ownerPhoto && touched.ownerPhoto) || !!ownerPhotoError;
              return (
                <div className="w-64 shrink-0">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Owner Profile Photo <span className="text-red-500" aria-hidden="true">*</span>
                  </label>
                  <label
                    htmlFor="ownerPhotoUpload"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); document.getElementById('ownerPhotoUpload')?.click(); } }}
                    className={`flex items-center gap-3 border-2 border-dashed rounded-lg p-3 transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 ${
                      photoInvalid ? 'border-red-300 bg-red-50/30' : 'border-slate-200 bg-white hover:border-brand-400/50 hover:bg-brand-50/10'
                    }`}
                    onDragOver={handleOwnerPhotoDragOver}
                    onDrop={handleOwnerPhotoDrop}
                    data-field="ownerPhoto"
                  >
                    <div className="w-16 h-16 shrink-0 bg-white rounded-full border border-slate-100 overflow-hidden flex items-center justify-center shadow-sm">
                      {formData.ownerPhoto ? (
                        <img src={formData.ownerPhoto as string} alt="Owner Profile" className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon className="w-5 h-5 text-slate-300" aria-hidden="true" />
                      )}
                    </div>
                    {/* Once a photo is uploaded the thumbnail says it all — no
                        filename/hint text, just the Browse/Remove actions. */}
                    {formData.ownerPhoto ? (
                      <div className="flex-1" />
                    ) : (
                      <div className="min-w-0 flex-1">
                        <div className="text-xs text-slate-500 truncate">Drag &amp; drop or browse</div>
                        <p className="text-[11px] text-slate-400 mt-0.5 truncate">PNG, JPG, WEBP — max 2 MB</p>
                      </div>
                    )}
                    <input id="ownerPhotoUpload" type="file" accept="image/*" onChange={handleOwnerPhotoChange} className="hidden" />
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="inline-flex items-center justify-center px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg transition-colors duration-200">
                        Browse
                      </span>
                      {formData.ownerPhoto && (
                        <button
                          type="button"
                          onClick={(e) => { e.preventDefault(); handleRemoveOwnerPhoto(); }}
                          className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 text-red-500 hover:bg-red-50 transition-colors duration-200"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </label>
                  {(ownerPhotoError || (errors.ownerPhoto && touched.ownerPhoto)) && (
                    <p className="text-red-500 text-xs mt-1">{ownerPhotoError || errors.ownerPhoto}</p>
                  )}
                </div>
              );
            })()}

          </div>

          {/* Owner Name — single row: Title | First | Middle | Last */}
          <div className="grid grid-cols-[130px_1fr_1fr_1fr] gap-4 items-start">
            <div>
              <label htmlFor="ownerTitle" className="block text-sm font-medium text-gray-700 mb-1.5">
                Title
              </label>
              <TitleSelect
                id="ownerTitle"
                value={formData.ownerTitle}
                onChange={(v) => handleInputChange('ownerTitle', v)}
              />
            </div>
            <div>
              <label htmlFor="ownerFirstName" className="block text-sm font-medium text-gray-700 mb-1.5">
                First Name <span className="text-red-500" aria-hidden="true">*</span>
              </label>
              <input
                id="ownerFirstName"
                type="text"
                name="ownerFirstName"
                value={formData.ownerFirstName}
                onChange={(e) => handleInputChange('ownerFirstName', e.target.value)}
                onBlur={() => handleBlur('ownerFirstName')}
                autoComplete="given-name"
                className={`w-full h-10 px-3 border rounded-md text-sm shadow-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand-500/20 focus-visible:border-brand-500 ${
                  errors.ownerFirstName && touched.ownerFirstName ? 'border-red-400 bg-red-50' : 'border-slate-200 hover:border-slate-300'
                }`}
                placeholder="First name"
              />
              {errors.ownerFirstName && touched.ownerFirstName && (
                <p className="text-red-600 text-xs mt-1 font-medium" role="alert">{errors.ownerFirstName}</p>
              )}
            </div>
            <div>
              <label htmlFor="ownerMiddleName" className="block text-sm font-medium text-gray-700 mb-1.5">
                Middle Name <span className="text-slate-400 text-xs font-normal">(optional)</span>
              </label>
              <input
                id="ownerMiddleName"
                type="text"
                name="ownerMiddleName"
                value={formData.ownerMiddleName}
                onChange={(e) => handleInputChange('ownerMiddleName', e.target.value)}
                autoComplete="additional-name"
                className="w-full h-10 px-3 border border-slate-200 hover:border-slate-300 rounded-md text-sm shadow-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand-500/20 focus-visible:border-brand-500"
                placeholder="Middle name"
              />
            </div>
            <div>
              <label htmlFor="ownerLastName" className="block text-sm font-medium text-gray-700 mb-1.5">
                Last Name <span className="text-red-500" aria-hidden="true">*</span>
              </label>
              <input
                id="ownerLastName"
                type="text"
                name="ownerLastName"
                value={formData.ownerLastName}
                onChange={(e) => handleInputChange('ownerLastName', e.target.value)}
                onBlur={() => handleBlur('ownerLastName')}
                autoComplete="family-name"
                className={`w-full h-10 px-3 border rounded-md text-sm shadow-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand-500/20 focus-visible:border-brand-500 ${
                  errors.ownerLastName && touched.ownerLastName ? 'border-red-400 bg-red-50' : 'border-slate-200 hover:border-slate-300'
                }`}
                placeholder="Last name"
              />
              {errors.ownerLastName && touched.ownerLastName && (
                <p className="text-red-600 text-xs mt-1 font-medium" role="alert">{errors.ownerLastName}</p>
              )}
            </div>
          </div>
      </AccordionSection>

      <AccordionSection
        {...sectionProps('contact')}
        icon={<PhoneIcon className="w-4.5 h-4.5" aria-hidden="true" />}
        title="Owner Contact"
        subtitle="Email + phone numbers we'll use to reach the owner"
      >
          {/* Emails — primary required, secondary optional, 2-col on sm+.
              Format mirrors Step 1 → Contact & Communication. */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="ownerEmail" className="block text-sm font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" aria-hidden="true" />
                <span>Primary Email</span>
                <span className="text-brand-500" aria-hidden="true">*</span>
              </label>
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
                className={`w-full text-sm font-medium px-4 py-2.5 border rounded-lg transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:border-brand-500 ${
                  errors.ownerEmail && touched.ownerEmail ? 'border-red-500 bg-red-50' : 'border-slate-300 hover:border-slate-400'
                }`}
                placeholder="owner@company.com"
              />
              {errors.ownerEmail && touched.ownerEmail && (
                <p className="text-red-500 text-xs mt-1">{errors.ownerEmail}</p>
              )}
            </div>

            <div>
              <label htmlFor="ownerEmail2" className="block text-sm font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" aria-hidden="true" />
                <span>Secondary Email</span>
                <span className="text-slate-400 text-xs font-normal">(Optional)</span>
              </label>
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
                className={`w-full text-sm font-medium px-4 py-2.5 border rounded-lg transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:border-brand-500 ${
                  errors.ownerEmail2 && touched.ownerEmail2 ? 'border-red-500 bg-red-50' : 'border-slate-300 hover:border-slate-400'
                }`}
                placeholder="alternate@company.com"
              />
              {errors.ownerEmail2 && touched.ownerEmail2 && (
                <p className="text-red-500 text-xs mt-1">{errors.ownerEmail2}</p>
              )}
            </div>
          </div>

          {/* Phones — Primary required, Secondary + Landline optional.
              Format mirrors Step 1 → Contact & Communication. */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <PhoneIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" aria-hidden="true" />
                <span>Primary Phone</span>
                <span className="text-brand-500" aria-hidden="true">*</span>
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
                <p className="text-red-500 text-xs mt-1">{errors.ownerPhone}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <PhoneIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" aria-hidden="true" />
                <span>Secondary Phone</span>
                <span className="text-slate-400 text-xs font-normal">(Optional)</span>
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
                <p className="text-red-500 text-xs mt-1">{errors.ownerPhone2}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <PhoneIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" aria-hidden="true" />
                <span>Local Landline</span>
                <span className="text-slate-400 text-xs font-normal">(Optional)</span>
              </label>
              <LocalLandlineInput
                locked
                value={{ countryCode: '+91', std: formData.ownerLocalLandlineStd, number: formData.ownerLocalLandlineNumber }}
                onChange={(v: LocalLandlineValue) => {
                  handleInputChange('ownerLocalLandlineStd', v.std);
                  handleInputChange('ownerLocalLandlineNumber', v.number);
                }}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <PhoneIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" aria-hidden="true" />
                <span>International Landline</span>
                <span className="text-slate-400 text-xs font-normal">(Optional)</span>
              </label>
              <LocalLandlineInput
                value={{ countryCode: formData.ownerIntlLandlineCountryCode, std: formData.ownerIntlLandlineStd, number: formData.ownerIntlLandlineNumber }}
                onChange={(v: LocalLandlineValue) => {
                  handleInputChange('ownerIntlLandlineCountryCode', v.countryCode);
                  handleInputChange('ownerIntlLandlineStd', v.std);
                  handleInputChange('ownerIntlLandlineNumber', v.number);
                }}
              />
            </div>
          </div>
      </AccordionSection>

      {/* Additional Contacts (Directors / Partners / Owners) — only
         rendered when the upstream company type allows multiple contacts.
         Proprietorship has a single owner, so the section is simply hidden. */}
      {ownerStructure.allowMultiple && (
      <AccordionSection
        {...sectionProps('team')}
        icon={<Users className="w-4.5 h-4.5" aria-hidden="true" />}
        title="Additional Owners"
        subtitle={
          additionalOwners.length > 0
            ? `${additionalOwners.length} ${additionalOwners.length === 1 ? 'owner' : 'owners'} added — ${ownerStructure.description.toLowerCase()}`
            : ownerStructure.description
        }
      >
          {additionalOwners.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-2">
              No additional owners added yet.
              {' '}
              <button
                type="button"
                onClick={handleAddOwner}
                className="text-brand-700 font-medium hover:text-brand-600 underline-offset-2 hover:underline"
              >
                Add an additional owner
              </button>
              {' '}to get started.
            </p>
          ) : (
            additionalOwners.map((owner, index) => (
              <div key={index} className="p-4 border border-gray-200 rounded-lg bg-gray-50/40 relative">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-gray-800">
                    Owner {index + 2}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveOwner(index)}
                    aria-label={`Remove Owner ${index + 2}`}
                    className="inline-flex items-center gap-1 text-sm text-red-600 hover:text-red-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/40 rounded"
                  >
                    <Trash2 className="w-4 h-4" aria-hidden="true" />
                    Remove
                  </button>
                </div>
                {/* 2-col grid throughout — matches the primary owner section
                    above. Required + optional fields pair up naturally:
                      row 1: Full Name * | Designation
                      row 2: Email *     | Email 2
                      row 3: Phone *     | Phone 2
                      row 4: Landline    (full-width, max-md so it doesn't
                                          stretch wider than the input above)
                    The earlier 3-col grid left empty placeholder columns on
                    rows 1 and 2 which read as awkward visual gaps. */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Name row: Title | First | Middle | Last — single line */}
                  <div className="sm:col-span-2 grid grid-cols-[100px_1fr_1fr_1fr] gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Title</label>
                      <TitleSelect
                        value={owner.title || ''}
                        onChange={(v) => handleOwnerFieldChange(index, 'title', v)}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        First Name <span className="text-red-500" aria-hidden="true">*</span>
                      </label>
                      <input
                        type="text"
                        value={owner.firstName || ''}
                        onChange={(e) => handleOwnerFieldChange(index, 'firstName', e.target.value)}
                        className={`w-full h-10 px-3 border rounded-md text-sm shadow-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand-500/20 focus-visible:border-brand-500 ${errors[`additionalOwner_${index}_firstName`] ? 'border-red-400 bg-red-50' : 'border-slate-200 hover:border-slate-300'}`}
                        placeholder="First name"
                      />
                      {errors[`additionalOwner_${index}_firstName`] && (
                        <p className="text-red-600 text-xs mt-1 font-medium">{errors[`additionalOwner_${index}_firstName`]}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Middle Name <span className="text-gray-400">(optional)</span>
                      </label>
                      <input
                        type="text"
                        value={owner.middleName || ''}
                        onChange={(e) => handleOwnerFieldChange(index, 'middleName', e.target.value)}
                        className="w-full h-10 px-3 border border-slate-200 hover:border-slate-300 rounded-md text-sm shadow-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand-500/20 focus-visible:border-brand-500"
                        placeholder="Middle name"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Last Name <span className="text-red-500" aria-hidden="true">*</span>
                      </label>
                      <input
                        type="text"
                        value={owner.lastName || ''}
                        onChange={(e) => handleOwnerFieldChange(index, 'lastName', e.target.value)}
                        className={`w-full h-10 px-3 border rounded-md text-sm shadow-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand-500/20 focus-visible:border-brand-500 ${errors[`additionalOwner_${index}_lastName`] ? 'border-red-400 bg-red-50' : 'border-slate-200 hover:border-slate-300'}`}
                        placeholder="Last name"
                      />
                      {errors[`additionalOwner_${index}_lastName`] && (
                        <p className="text-red-600 text-xs mt-1 font-medium">{errors[`additionalOwner_${index}_lastName`]}</p>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Designation <span className="text-gray-400">(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={owner.designation || ''}
                      onChange={(e) => handleOwnerFieldChange(index, 'designation', e.target.value)}
                      autoComplete="off"
                      className="w-full px-3 py-2 border border-slate-200 hover:border-slate-300 rounded-lg outline-none focus-visible:ring-1 focus-visible:ring-brand-500 focus-visible:border-brand-500 transition-colors text-sm"
                      placeholder={`e.g. ${ownerStructure.contactLabel}`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Primary Email <span className="text-red-500" aria-hidden="true">*</span>
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
                      Secondary Email <span className="text-gray-400">(optional)</span>
                    </label>
                    <input
                      type="email"
                      value={owner.email2 || ''}
                      onChange={(e) => handleOwnerFieldChange(index, 'email2', e.target.value)}
                      autoComplete="off"
                      inputMode="email"
                      spellCheck={false}
                      className="w-full px-3 py-2 border border-slate-200 hover:border-slate-300 rounded-lg outline-none focus-visible:ring-1 focus-visible:ring-brand-500 focus-visible:border-brand-500 transition-colors text-sm"
                      placeholder="optional secondary email"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Primary Phone <span className="text-red-500" aria-hidden="true">*</span>
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
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Secondary Phone <span className="text-gray-400">(optional)</span>
                    </label>
                    <input
                      type="tel"
                      value={owner.phone2 || ''}
                      onChange={(e) => handleOwnerFieldChange(index, 'phone2', e.target.value)}
                      autoComplete="off"
                      inputMode="tel"
                      className="w-full px-3 py-2 border border-slate-200 hover:border-slate-300 rounded-lg outline-none focus-visible:ring-1 focus-visible:ring-brand-500 focus-visible:border-brand-500 transition-colors text-sm"
                      placeholder="optional secondary phone"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Local Landline <span className="text-gray-400">(optional)</span>
                    </label>
                    <LocalLandlineInput
                      locked
                      value={{ countryCode: '+91', std: owner.localLandlineStd, number: owner.localLandline }}
                      onChange={(v: LocalLandlineValue) => {
                        setAdditionalOwners(prev => prev.map((o, i) =>
                          i === index ? { ...o, localLandlineStd: v.std, localLandline: v.number } : o
                        ));
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      International Landline <span className="text-gray-400">(optional)</span>
                    </label>
                    <LocalLandlineInput
                      value={{ countryCode: owner.intlLandlineCountryCode, std: owner.intlLandlineStd, number: owner.intlLandlineNumber }}
                      onChange={(v: LocalLandlineValue) => {
                        setAdditionalOwners(prev => prev.map((o, i) =>
                          i === index ? { ...o, intlLandlineCountryCode: v.countryCode, intlLandlineStd: v.std, intlLandlineNumber: v.number } : o
                        ));
                      }}
                    />
                  </div>
                </div>
              </div>
            ))
          )}

          {/* "+ Add another" tile — sits inside the section body, after the
              last director card. Disabled and replaced with a limit notice
              once MAX_ADDITIONAL_OWNERS is reached. */}
          {additionalOwners.length > 0 && (
            additionalOwners.length >= MAX_ADDITIONAL_OWNERS ? (
              <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-center">
                Maximum of {MAX_ADDITIONAL_OWNERS} additional owners reached.
              </p>
            ) : (
              <button
                type="button"
                onClick={handleAddOwner}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-brand-700 bg-brand-50/50 border border-dashed border-brand-300 rounded-lg hover:bg-brand-50 hover:border-brand-500 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
              >
                <Plus className="w-4 h-4" aria-hidden="true" />
                Add Additional Owner
              </button>
            )
          )}
      </AccordionSection>
      )}

      <AccordionSection
        {...sectionProps('history')}
        icon={<Calendar className="w-4.5 h-4.5" aria-hidden="true" />}
        title="Business History"
        subtitle="When operations began and total business duration"
      >
        <div>
          {/* Start, Present, and computed Duration as three equal-width fields
              on one row (stacks on mobile). The duration is a read-only field
              styled to match the date inputs — no separate bulky card. */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <label htmlFor="businessStartDate" className="block text-sm font-medium text-gray-700 mb-1.5">
                Start Business Date <span className="text-red-500">*</span>
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
                Present Date
              </label>
              <input
                id="tillDate"
                type="date"
                value={new Date().toISOString().split('T')[0]}
                disabled
                readOnly
                className="w-full px-4 py-3 border border-slate-200 rounded-lg bg-slate-50 text-slate-500 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Total Business Duration
              </label>
              <div className="flex min-h-[46px] w-full items-center rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                {(() => {
                  const duration = calculateDuration(formData.businessStartDate);
                  return duration ? (
                    <span className="whitespace-nowrap text-sm font-bold tracking-tight text-brand-500">
                      {duration}
                    </span>
                  ) : (
                    <span className="text-sm text-slate-400">Select a start date</span>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      </AccordionSection>

      <AccordionSection
        {...sectionProps('size')}
        icon={<Users className="w-4.5 h-4.5" aria-hidden="true" />}
        title="Company Size"
        subtitle="How many people work in your business today"
      >
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
          Save &amp; Continue
          <ArrowRight className="w-4 h-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}