'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/UI/Button';
import { Phone, Mail, User, Plus, Trash2, Globe, MapPin, Camera, X, ArrowLeft, ArrowRight } from 'lucide-react';
import Image from 'next/image';
import Dropdown from '@/components/UI/Dropdown';
import { PhoneInput, LocalLandlineInput, parsePhone, CountryMultiSelect, validatePhoneE164, AccordionSection, TitleSelect, type LocalLandlineValue } from '@/components/VendorHub/FormUI';
import { handleUpload } from '@/lib/toast-utils';
import ImageCropModal from '@/components/UI/ImageCropModal';

interface ContactTradeInfoProps {
  onNext: () => void;
  onPrev: () => void;
  onUpdateData: (data: any) => void;
  data: any;
}

interface Contact {
  id: string;
  title?: string;
  firstName: string;
  middleName: string;
  lastName: string;
  designation: string;
  customDesignation?: string;
  email1: string;
  email2?: string;
  phone1: string;
  phone2?: string;
  /** Legacy single-string landline — kept for loading old records. */
  landline?: string;
  localLandlineStd: string;
  localLandline: string;
  intlLandlineCountryCode: string;
  intlLandlineStd: string;
  intlLandlineNumber: string;
  department: string;
  customDepartment?: string;
  photo: string | null;
  photoFile: File | null;
}

const DESIGNATION_OPTIONS = [
  'Founder', 'CEO', 'Chairman', 'Director', 'Managing Director', 
  'General Manager', 'Factory Manager', 'Office Manager', 
  'Production Manager', 'Supervisor', 'Others'
];

const DEPARTMENT_OPTIONS = [
  'Sales', 'Export', 'Business Development', 'Operations', 'Management', 'Others'
];

const parseName = (name: string) => {
  if (!name) return { first: '', middle: '', last: '' };
  const parts = name.trim().split(' ');
  if (parts.length === 1) return { first: parts[0], middle: '', last: '' };
  if (parts.length === 2) return { first: parts[0], middle: '', last: parts[1] };
  return { first: parts[0], middle: parts.slice(1, -1).join(' '), last: parts[parts.length - 1] };
};

const parseIntlLandline = (value: string) => {
  const { dial, national } = parsePhone(value);
  return { countryCode: dial, std: '', number: national };
};

export default function ContactTradeInfo({ onNext, onPrev, onUpdateData, data }: ContactTradeInfoProps) {
  const [formData, setFormData] = useState(() => {
    const mainNameParts = parseName(data?.mainContact?.name || '');
    return {
      mainContact: {
        title: data?.mainContact?.title || '',
        firstName: data?.mainContact?.firstName || mainNameParts.first,
        middleName: data?.mainContact?.middleName || mainNameParts.middle,
        lastName: data?.mainContact?.lastName || mainNameParts.last,
        designation: data?.mainContact?.designation || '',
        customDesignation: data?.mainContact?.customDesignation || '',
        email1: data?.mainContact?.email || data?.mainContact?.email1 || '',
        email2: data?.mainContact?.email2 || '',
        phone1: data?.mainContact?.phone || data?.mainContact?.phone1 || '',
        phone2: data?.mainContact?.phone2 || '',
        landline: data?.mainContact?.landline || '',
        localLandlineCountryCode: data?.mainContact?.localLandlineCountryCode || '+91',
        localLandlineStd: data?.mainContact?.localLandlineStd || '',
        localLandline: data?.mainContact?.localLandline || '',
        intlLandline: data?.mainContact?.intlLandline || '',
        intlLandlineCountryCode: data?.mainContact?.intlLandlineCountryCode
          || parseIntlLandline(data?.mainContact?.intlLandline || '').countryCode,
        intlLandlineStd: data?.mainContact?.intlLandlineStd || '',
        intlLandlineNumber: data?.mainContact?.intlLandlineNumber
          || parseIntlLandline(data?.mainContact?.intlLandline || '').number,
        department: data?.mainContact?.department || '',
        customDepartment: data?.mainContact?.customDepartment || ''
      },
      alternateContacts: (data?.alternateContacts || []).map((c: any) => {
        const altNameParts = parseName(c.name || '');
        return {
          id: c.id || Date.now().toString(),
          title: c.title || '',
          firstName: c.firstName || altNameParts.first,
          middleName: c.middleName || altNameParts.middle,
          lastName: c.lastName || altNameParts.last,
          designation: c.designation || '',
          customDesignation: c.customDesignation || '',
          email1: c.email || c.email1 || '',
          email2: c.email2 || '',
          phone1: c.phone || c.phone1 || '',
          phone2: c.phone2 || '',
          landline: c.landline || '',
          localLandlineStd: c.localLandlineStd || '',
          localLandline: c.localLandline || (c.landline ? parsePhone(c.landline).national : ''),
          intlLandlineCountryCode: c.intlLandlineCountryCode || parseIntlLandline(c.intlLandline || '').countryCode,
          intlLandlineStd: c.intlLandlineStd || '',
          intlLandlineNumber: c.intlLandlineNumber || parseIntlLandline(c.intlLandline || '').number,
          department: c.department || '',
          customDepartment: c.customDepartment || '',
          photo: c.photo || null,
          photoFile: null,
        };
      }),
      hasImportExport: data.hasImportExport || '',
      importCountries: data.importCountries || [],
      exportCountries: data.exportCountries || [],
    };
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Accordion: single-active-section pattern matching Steps 3/4/5/6.
  // Three sections grouping the field clusters:
  //   - 'mainContact':  primary person we'll talk to
  //   - 'alternates':   secondary contacts (optional, multi-add)
  //   - 'tradeFlow':    import/export experience + countries
  type SectionKey = 'mainContact' | 'alternates' | 'tradeFlow';
  const [activeSection, setActiveSection] = useState<SectionKey>('mainContact');

  // Maps error keys → owning section. Used in handleNext to auto-open
  // the failing section after a Save attempt.
  const FIELD_SECTION_MAP: Record<string, SectionKey> = {
    'mainContact.firstName': 'mainContact',
    'mainContact.lastName': 'mainContact',
    'mainContact.designation': 'mainContact',
    'mainContact.email1': 'mainContact',
    'mainContact.phone1': 'mainContact',
    'mainContact.department': 'mainContact',
    'mainContact.photo': 'mainContact',
    hasImportExport: 'tradeFlow',
    importCountries: 'tradeFlow',
    exportCountries: 'tradeFlow',
  };

  // Returns 'complete' | 'partial' | 'empty' per section — drives the
  // colored status badge in the section header.
  const getSectionStatus = (section: SectionKey): 'complete' | 'partial' | 'empty' => {
    if (section === 'mainContact') {
      const mc = formData.mainContact;
      const required = [mc.firstName, mc.lastName, mc.designation, mc.email1, mc.phone1, mc.department];
      const filled = required.filter(Boolean).length;
      if (filled === required.length) return 'complete';
      if (filled > 0) return 'partial';
      return 'empty';
    }
    if (section === 'alternates') {
      if (formData.alternateContacts.length === 0) return 'empty';
      const allValid = formData.alternateContacts.every((c: any) =>
        c.firstName && c.lastName && c.designation && c.email1 && c.phone1 && c.department
      );
      return allValid ? 'complete' : 'partial';
    }
    if (section === 'tradeFlow') {
      if (formData.hasImportExport === 'yes') {
        const hasCountries =
          formData.importCountries.length > 0 || formData.exportCountries.length > 0;
        return hasCountries ? 'complete' : 'partial';
      }
      if (formData.hasImportExport === 'no') return 'complete';
      return 'empty';
    }
    return 'empty';
  };

  const sectionProps = (id: SectionKey) => ({
    id,
    isOpen: activeSection === id,
    status: getSectionStatus(id),
    hasErrors: Object.keys(errors).some((k) => FIELD_SECTION_MAP[k] === id && Boolean(errors[k])),
    onActivate: () => setActiveSection(id),
  });

  useEffect(() => {
    const mainNameParts = parseName(data?.mainContact?.name || '');
    setFormData({
      mainContact: {
        title: data?.mainContact?.title || '',
        firstName: data?.mainContact?.firstName || mainNameParts.first,
        middleName: data?.mainContact?.middleName || mainNameParts.middle,
        lastName: data?.mainContact?.lastName || mainNameParts.last,
        designation: data?.mainContact?.designation || '',
        customDesignation: data?.mainContact?.customDesignation || '',
        email1: data?.mainContact?.email || data?.mainContact?.email1 || '',
        email2: data?.mainContact?.email2 || '',
        phone1: data?.mainContact?.phone || data?.mainContact?.phone1 || '',
        phone2: data?.mainContact?.phone2 || '',
        landline: data?.mainContact?.landline || '',
        localLandlineCountryCode: data?.mainContact?.localLandlineCountryCode || '+91',
        localLandlineStd: data?.mainContact?.localLandlineStd || '',
        localLandline: data?.mainContact?.localLandline || '',
        intlLandline: data?.mainContact?.intlLandline || '',
        intlLandlineCountryCode: data?.mainContact?.intlLandlineCountryCode
          || parseIntlLandline(data?.mainContact?.intlLandline || '').countryCode,
        intlLandlineStd: data?.mainContact?.intlLandlineStd || '',
        intlLandlineNumber: data?.mainContact?.intlLandlineNumber
          || parseIntlLandline(data?.mainContact?.intlLandline || '').number,
        department: data?.mainContact?.department || '',
        customDepartment: data?.mainContact?.customDepartment || ''
      },
      alternateContacts: (data?.alternateContacts || []).map((c: any) => {
        const altNameParts = parseName(c.name || '');
        return {
          id: c.id || Date.now().toString(),
          title: c.title || '',
          firstName: c.firstName || altNameParts.first,
          middleName: c.middleName || altNameParts.middle,
          lastName: c.lastName || altNameParts.last,
          designation: c.designation || '',
          customDesignation: c.customDesignation || '',
          email1: c.email || c.email1 || '',
          email2: c.email2 || '',
          phone1: c.phone || c.phone1 || '',
          phone2: c.phone2 || '',
          landline: c.landline || '',
          localLandlineStd: c.localLandlineStd || '',
          localLandline: c.localLandline || (c.landline ? parsePhone(c.landline).national : ''),
          intlLandlineCountryCode: c.intlLandlineCountryCode || parseIntlLandline(c.intlLandline || '').countryCode,
          intlLandlineStd: c.intlLandlineStd || '',
          intlLandlineNumber: c.intlLandlineNumber || parseIntlLandline(c.intlLandline || '').number,
          department: c.department || '',
          customDepartment: c.customDepartment || '',
          photo: c.photo || null,
          photoFile: null,
        };
      }),
      hasImportExport: data.hasImportExport || '',
      importCountries: data.importCountries || [],
      exportCountries: data.exportCountries || [],
    });
  }, [data]);

  const [contactPhoto, setContactPhoto] = useState<string | null>(data?.mainContact?.photo || null);
  const [contactPhotoFile, setContactPhotoFile] = useState<File | null>(null);
  // Selected image awaiting crop (1:1). Saved only after the user crops & confirms.
  // target: 'main' for the primary contact, or an alt contact id string.
  const [cropState, setCropState] = useState<{ src: string; name: string; target: 'main' | string } | null>(null);

  const closeCropper = () => {
    setCropState((prev) => {
      if (prev?.src.startsWith('blob:')) URL.revokeObjectURL(prev.src);
      return null;
    });
  };

  // Validate + store the (already cropped) photo.
  const applyContactPhoto = (file: File) => {
    const result = handleUpload(file, {
      label: 'Profile Photo',
      allowedTypes: ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'],
      allowedLabel: 'JPG, PNG or WebP',
      maxBytes: 5 * 1024 * 1024,
      maxLabel: '5,120 KB'
    });

    if (!result.ok) {
      setErrors(prev => ({ ...prev, 'mainContact.photo': result.message || 'Invalid file upload' }));
      return;
    }

    setErrors(prev => ({ ...prev, 'mainContact.photo': '' }));
    setContactPhotoFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setContactPhoto(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleContactPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reset the input so re-selecting the same file (e.g. after Remove) still fires onChange.
    e.target.value = '';
    if (!file) return;
    // Non-images can't be cropped — run the validator so the user still sees the error.
    if (!file.type.startsWith('image/')) {
      applyContactPhoto(file);
      return;
    }
    setCropState({ src: URL.createObjectURL(file), name: file.name, target: 'main' });
  };

  const removeContactPhoto = () => {
    setContactPhoto(null);
    setContactPhotoFile(null);
    setErrors(prev => ({ ...prev, 'mainContact.photo': '' }));
  };

  const applyAltContactPhoto = (id: string, file: File) => {
    const result = handleUpload(file, {
      label: 'Profile Photo',
      allowedTypes: ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'],
      allowedLabel: 'JPG, PNG or WebP',
      maxBytes: 5 * 1024 * 1024,
      maxLabel: '5,120 KB'
    });
    if (!result.ok) {
      setErrors(prev => ({ ...prev, [`altContact_${id}_photo`]: result.message || 'Invalid file upload' }));
      return;
    }
    setErrors(prev => ({ ...prev, [`altContact_${id}_photo`]: '' }));
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      setFormData(prev => ({
        ...prev,
        alternateContacts: prev.alternateContacts.map((c: Contact) =>
          c.id === id ? { ...c, photo: dataUrl, photoFile: file } : c
        ),
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleAltContactPhotoChange = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      applyAltContactPhoto(id, file);
      return;
    }
    setCropState({ src: URL.createObjectURL(file), name: file.name, target: id });
  };

  const removeAltContactPhoto = (id: string) => {
    setFormData(prev => ({
      ...prev,
      alternateContacts: prev.alternateContacts.map((c: Contact) =>
        c.id === id ? { ...c, photo: null, photoFile: null } : c
      ),
    }));
    setErrors(prev => ({ ...prev, [`altContact_${id}_photo`]: '' }));
  };

  const addAlternateContact = () => {
    if (formData.alternateContacts.length < 3) {
      const newContact: Contact = {
        id: Date.now().toString(),
        title: '',
        firstName: '',
        middleName: '',
        lastName: '',
        designation: '',
        customDesignation: '',
        email1: '',
        email2: '',
        phone1: '',
        phone2: '',
        landline: '',
        localLandlineStd: '',
        localLandline: '',
        intlLandlineCountryCode: '',
        intlLandlineStd: '',
        intlLandlineNumber: '',
        department: '',
        customDepartment: '',
        photo: null,
        photoFile: null,
      };
      setFormData(prev => ({
        ...prev,
        alternateContacts: [...prev.alternateContacts, newContact]
      }));
    }
  };

  const removeAlternateContact = (id: string) => {
    setFormData(prev => ({
      ...prev,
      alternateContacts: prev.alternateContacts.filter((contact: Contact) => contact.id !== id)
    }));
  };

  const updateMainContact = (field: string, value: string) => {
    setFormData(prev => {
      const updatedMain = { ...prev.mainContact, [field]: value };
      if (field === 'designation' && value !== 'Others') {
        updatedMain.customDesignation = '';
      }
      if (field === 'department' && value !== 'Others') {
        updatedMain.customDepartment = '';
      }
      return {
        ...prev,
        mainContact: updatedMain
      };
    });
    
    setErrors(prev => {
      const updatedErrors = { ...prev };
      updatedErrors[`mainContact.${field}`] = '';
      if (field === 'designation' && value !== 'Others') {
        updatedErrors['mainContact.customDesignation'] = '';
      }
      if (field === 'department' && value !== 'Others') {
        updatedErrors['mainContact.customDepartment'] = '';
      }
      return updatedErrors;
    });
  };

  // Update several mainContact keys at once (used by the composite
  // Local Landline control, which emits country code + STD + number together).
  const updateMainContactFields = (fields: Record<string, string>) => {
    setFormData(prev => ({
      ...prev,
      mainContact: { ...prev.mainContact, ...fields },
    }));
  };

  const handleBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const updateAlternateContact = (id: string, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      alternateContacts: prev.alternateContacts.map((contact: Contact) => {
        if (contact.id === id) {
          const updated = { ...contact, [field]: value };
          if (field === 'designation' && value !== 'Others') {
            updated.customDesignation = '';
          }
          if (field === 'department' && value !== 'Others') {
            updated.customDepartment = '';
          }
          return updated;
        }
        return contact;
      })
    }));

    setErrors(prev => {
      const updatedErrors = { ...prev };
      updatedErrors[`altContact_${id}_${field}`] = '';
      if (field === 'designation' && value !== 'Others') {
        updatedErrors[`altContact_${id}_customDesignation`] = '';
      }
      if (field === 'department' && value !== 'Others') {
        updatedErrors[`altContact_${id}_customDepartment`] = '';
      }
      return updatedErrors;
    });
  };

  const updateAlternateContactFields = (id: string, fields: Record<string, string>) => {
    setFormData(prev => ({
      ...prev,
      alternateContacts: prev.alternateContacts.map((contact: Contact) =>
        contact.id === id ? { ...contact, ...fields } : contact
      )
    }));
  };

  const handleInputChange = (field: string, value: string | string[] | any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleNext = () => {
    const newErrors: Record<string, string> = {};
    const nameRegex = /^[A-Za-z\s\-']+$/;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    const main = formData.mainContact;

    if (!contactPhoto) {
      newErrors['mainContact.photo'] = 'Profile photo is required';
    }

    if (!main.firstName?.trim()) {
      newErrors['mainContact.firstName'] = 'First Name is required';
    } else if (main.firstName.trim().length < 2) {
      newErrors['mainContact.firstName'] = 'First Name must be at least 2 characters';
    } else if (!nameRegex.test(main.firstName)) {
      newErrors['mainContact.firstName'] = 'Invalid characters';
    }

    if (main.middleName?.trim()) {
      if (!nameRegex.test(main.middleName)) {
        newErrors['mainContact.middleName'] = 'Invalid characters';
      }
    }

    if (!main.lastName?.trim()) {
      newErrors['mainContact.lastName'] = 'Last Name is required';
    } else if (main.lastName.trim().length < 2) {
      newErrors['mainContact.lastName'] = 'Last Name must be at least 2 characters';
    } else if (!nameRegex.test(main.lastName)) {
      newErrors['mainContact.lastName'] = 'Invalid characters';
    }

    if (!main.designation?.trim()) {
      newErrors['mainContact.designation'] = 'Designation is required';
    } else if (main.designation === 'Others' && (!main.customDesignation || main.customDesignation.trim() === '')) {
      newErrors['mainContact.customDesignation'] = 'Please specify designation';
    }

    if (!main.email1?.trim()) {
      newErrors['mainContact.email1'] = 'Email is required';
    } else if (!emailRegex.test(main.email1)) {
      newErrors['mainContact.email1'] = 'Valid email is required';
    }

    if (main.email2 && !emailRegex.test(main.email2)) {
      newErrors['mainContact.email2'] = 'Valid email is required';
    }

    // Set up global uniqueness tracker for email validation
    const seenEmails = new Map<string, { label: string; fieldKey: string }>();

    const checkEmailUniqueness = (emailVal: string | undefined, fieldKey: string, fieldLabel: string) => {
      if (!emailVal || !emailVal.trim() || !emailRegex.test(emailVal)) return;
      const normalized = emailVal.trim().toLowerCase();
      if (seenEmails.has(normalized)) {
        const existing = seenEmails.get(normalized)!;
        newErrors[fieldKey] = `Email is already used by ${existing.label}`;
      } else {
        seenEmails.set(normalized, { label: fieldLabel, fieldKey });
      }
    };

    checkEmailUniqueness(main.email1, 'mainContact.email1', 'Main Contact (Primary Email)');
    checkEmailUniqueness(main.email2, 'mainContact.email2', 'Main Contact (Secondary Email)');

    const phone1Err = validatePhoneE164(main.phone1, { required: true, label: 'Primary Phone' });
    if (phone1Err) {
      newErrors['mainContact.phone1'] = phone1Err;
    }

    if (main.phone2) {
      const phoneErr = validatePhoneE164(main.phone2, { label: 'Secondary Phone' });
      if (phoneErr) newErrors['mainContact.phone2'] = phoneErr;
    }

    // Local landline (country + STD + number) — number is the meaningful part.
    if (main.localLandline && main.localLandline.trim()) {
      const num = main.localLandline.trim();
      const std = (main.localLandlineStd || '').trim();
      if (!/^\d{5,15}$/.test(num)) {
        newErrors['mainContact.localLandline'] = 'Landline number must be 5-15 digits';
      } else if (std && !/^\d{1,6}$/.test(std)) {
        newErrors['mainContact.localLandline'] = 'STD / area code must be up to 6 digits';
      }
    }

    // International landline — E.164 (PhoneInput). A bare dial code like "+91"
    // counts as empty (country picked, nothing typed).
    const intlVal = (main.intlLandline || '').trim();
    if (intlVal && !/^\+\d{1,4}$/.test(intlVal) && !/^\+\d{7,16}$/.test(intlVal)) {
      newErrors['mainContact.intlLandline'] = 'Enter a valid international landline (country code + number)';
    }

    if (!main.department?.trim()) {
      newErrors['mainContact.department'] = 'Department is required';
    } else if (main.department === 'Others' && (!main.customDepartment || main.customDepartment.trim() === '')) {
      newErrors['mainContact.customDepartment'] = 'Please specify department';
    }

    formData.alternateContacts.forEach((alt: Contact, idx: number) => {
      const prefix = `altContact_${alt.id}`;

      if (!alt.photo) {
        newErrors[`${prefix}_photo`] = 'Profile photo is required';
      }

      if (!alt.firstName?.trim()) {
        newErrors[`${prefix}_firstName`] = 'First Name is required';
      } else if (alt.firstName.trim().length < 2) {
        newErrors[`${prefix}_firstName`] = 'First Name must be at least 2 characters';
      } else if (!nameRegex.test(alt.firstName)) {
        newErrors[`${prefix}_firstName`] = 'Invalid characters';
      }

      if (alt.middleName?.trim()) {
        if (!nameRegex.test(alt.middleName)) {
          newErrors[`${prefix}_middleName`] = 'Invalid characters';
        }
      }

      if (!alt.lastName?.trim()) {
        newErrors[`${prefix}_lastName`] = 'Last Name is required';
      } else if (alt.lastName.trim().length < 2) {
        newErrors[`${prefix}_lastName`] = 'Last Name must be at least 2 characters';
      } else if (!nameRegex.test(alt.lastName)) {
        newErrors[`${prefix}_lastName`] = 'Invalid characters';
      }

      if (!alt.designation?.trim()) {
        newErrors[`${prefix}_designation`] = 'Designation is required';
      } else if (alt.designation === 'Others' && (!alt.customDesignation || alt.customDesignation.trim() === '')) {
        newErrors[`${prefix}_customDesignation`] = 'Please specify designation';
      }

      if (!alt.email1?.trim()) {
        newErrors[`${prefix}_email1`] = 'Email is required';
      } else if (!emailRegex.test(alt.email1)) {
        newErrors[`${prefix}_email1`] = 'Valid email is required';
      }

      if (alt.email2 && !emailRegex.test(alt.email2)) {
        newErrors[`${prefix}_email2`] = 'Valid email is required';
      }

      checkEmailUniqueness(alt.email1, `${prefix}_email1`, `Contact Person ${idx + 2} (Primary Email)`);
      checkEmailUniqueness(alt.email2, `${prefix}_email2`, `Contact Person ${idx + 2} (Secondary Email)`);

      const altPhone1Err = validatePhoneE164(alt.phone1, { required: true, label: 'Primary Phone' });
      if (altPhone1Err) {
        newErrors[`${prefix}_phone1`] = altPhone1Err;
      }

      if (alt.phone2) {
        const phoneErr = validatePhoneE164(alt.phone2, { label: 'Secondary Phone' });
        if (phoneErr) newErrors[`${prefix}_phone2`] = phoneErr;
      }

      if (!alt.department?.trim()) {
        newErrors[`${prefix}_department`] = 'Department is required';
      } else if (alt.department === 'Others' && (!alt.customDepartment || alt.customDepartment.trim() === '')) {
        newErrors[`${prefix}_customDepartment`] = 'Please specify department';
      }
    });

    if (formData.hasImportExport === 'yes') {
      if (formData.importCountries.length === 0) {
        newErrors['importCountries'] = 'Please select at least one import country';
      }
      if (formData.exportCountries.length === 0) {
        newErrors['exportCountries'] = 'Please select at least one export country';
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      const allTouched: Record<string, boolean> = { ...touched };
      Object.keys(newErrors).forEach(key => {
        allTouched[key] = true;
      });
      setTouched(allTouched);

      // Auto-open the section containing the first error so the user can
      // actually SEE the failing fields. Without this, errors on a closed
      // section land inside a max-h-0 body — the user only sees an empty
      // red bar with a "Fix required" badge and no way to fix anything.
      // FIELD_SECTION_MAP doesn't enumerate every optional field, so we
      // also fall back to the key's prefix (mainContact.* / altContact_*).
      const firstErrorKey = Object.keys(newErrors)[0];
      const targetSection: SectionKey | undefined =
        FIELD_SECTION_MAP[firstErrorKey] ||
        (firstErrorKey.startsWith('mainContact.') ? 'mainContact' : undefined) ||
        (firstErrorKey.startsWith('altContact_') ? 'alternates' : undefined);
      if (targetSection) setActiveSection(targetSection);

      setTimeout(() => {
        const element = document.querySelector(`[name="${firstErrorKey}"]`) || document.getElementById(firstErrorKey);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });

          let focusTarget = element as HTMLElement;
          if (focusTarget.tagName === 'DIV') {
            const interactiveChild = focusTarget.querySelector('button, input, select, textarea, [tabindex="0"]') as HTMLElement;
            if (interactiveChild) {
              focusTarget = interactiveChild;
            }
          }
          focusTarget.focus({ preventScroll: true });
        }
      }, 350); // wait for accordion expand transition (300ms) before scrolling
      return;
    }

    // Transform for storage
    const transformedMainContact = {
      ...formData.mainContact,
      name: [formData.mainContact.title, formData.mainContact.firstName, formData.mainContact.middleName, formData.mainContact.lastName].filter(Boolean).join(' '),
      photo: contactPhoto,
      photoFile: contactPhotoFile,
    };

    const transformedAlternateContacts = formData.alternateContacts.map((c: Contact) => {
      const localLandline = (c.localLandlineStd + c.localLandline).trim();
      const intlLandline = (c.intlLandlineCountryCode + c.intlLandlineStd + c.intlLandlineNumber).replace(/^\+?$/, '');
      return {
        ...c,
        name: [c.title, c.firstName, c.middleName, c.lastName].filter(Boolean).join(' '),
        localLandline: localLandline || undefined,
        localLandlineStd: c.localLandlineStd || undefined,
        intlLandline: intlLandline || undefined,
        intlLandlineCountryCode: c.intlLandlineCountryCode || undefined,
        intlLandlineStd: c.intlLandlineStd || undefined,
        intlLandlineNumber: c.intlLandlineNumber || undefined,
      };
    });

    onUpdateData({
      ...formData,
      mainContact: transformedMainContact,
      alternateContacts: transformedAlternateContacts
    });
    onNext();
  };

  const countries = [
    'United States', 'United Kingdom', 'Germany', 'France', 'Italy', 'Spain', 'Netherlands',
    'Belgium', 'Sweden', 'Norway', 'Denmark', 'Finland', 'Switzerland', 'Austria',
    'Canada', 'Australia', 'New Zealand', 'Japan', 'South Korea', 'Singapore',
    'Hong Kong', 'UAE', 'Saudi Arabia', 'India', 'China', 'Brazil', 'Mexico'
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-4 sm:px-6 sm:py-6 space-y-5 font-sans animate-in fade-in slide-in-from-bottom-4 duration-500">
      <ImageCropModal
        src={cropState?.src ?? null}
        fileName={cropState?.name}
        title="Crop Profile Photo"
        onCancel={closeCropper}
        onCropped={(file) => {
          if (cropState?.target === 'main') {
            applyContactPhoto(file);
          } else if (cropState?.target) {
            applyAltContactPhoto(cropState.target, file);
          }
          closeCropper();
        }}
      />
      {/* Header */}
      <div className="flex items-center gap-3 pb-2">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-brand-50 text-brand-600 shrink-0">
          <Phone className="w-5 h-5" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <h2 className="text-headline-md text-gray-900 leading-tight" style={{ textWrap: "balance" as any }}>
            Contact & Trade Information
          </h2>
          <p className="text-sm text-gray-600 mt-0.5">
            Provide your contact details and trade information
          </p>
        </div>
      </div>

      <div className="space-y-3">
      {/* Main Contact */}
      <AccordionSection
        {...sectionProps('mainContact')}
        icon={<User className="w-4.5 h-4.5" aria-hidden="true" />}
        title="Main Contact Person"
        subtitle="Primary contact details"
      >
        <div>
          <div className="grid grid-cols-1 md:grid-cols-2 items-start gap-4">

            {/* Profile Photo — top left */}
            <div className="md:col-span-2 flex justify-start" id="mainContact.photo">
              <div className="w-fit">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Profile Photo <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-4">
                  {contactPhoto ? (
                    <div className="relative">
                      <Image
                        src={contactPhoto}
                        alt="Contact photo"
                        width={80}
                        height={80}
                        className="w-20 h-20 rounded-full object-cover border-2 border-slate-200"
                      />
                      <button
                        type="button"
                        onClick={removeContactPhoto}
                        className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-slate-50 border-2 border-dashed border-slate-300 flex items-center justify-center">
                      <Camera className="w-6 h-6 text-slate-400" />
                    </div>
                  )}
                  <div>
                    <label
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          const fileInput = document.getElementById('contact-photo-file-input');
                          if (fileInput) fileInput.click();
                        }
                      }}
                      className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-brand-600 bg-brand-50 border border-brand-200 rounded-lg hover:bg-brand-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                    >
                      <Camera className="w-4 h-4" />
                      {contactPhoto ? 'Change Photo' : 'Upload Photo'}
                      <input
                        id="contact-photo-file-input"
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleContactPhotoChange}
                        className="hidden"
                      />
                    </label>
                    <p className="text-xs text-slate-500 mt-1">JPG, PNG or WebP. Max 5,120 KB.</p>
                  </div>
                </div>
                {errors['mainContact.photo'] && (
                  <p className="text-red-500 text-sm mt-1">{errors['mainContact.photo']}</p>
                )}
              </div>
            </div>

            {/* Name row: Title | First | Middle | Last — single line */}
            <div className="md:col-span-2 grid grid-cols-[130px_1fr_1fr_1fr] gap-4 items-start">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                <TitleSelect
                  value={formData.mainContact.title || ''}
                  onChange={(v) => updateMainContact('title', v)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="mainContact.firstName"
                  value={formData.mainContact.firstName}
                  onChange={(e) => updateMainContact('firstName', e.target.value)}
                  onBlur={() => handleBlur('mainContact.firstName')}
                  className={`w-full h-10 px-3 border rounded-md text-sm shadow-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand-500/20 focus-visible:border-brand-500 text-slate-900 ${
                    errors['mainContact.firstName'] && touched['mainContact.firstName']
                      ? 'border-red-400 bg-red-50'
                      : 'border-slate-300 hover:border-slate-400'
                  }`}
                  placeholder="First name"
                  required
                />
                {errors['mainContact.firstName'] && touched['mainContact.firstName'] && (
                  <p className="text-red-500 text-xs mt-1">{errors['mainContact.firstName']}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Middle Name <span className="text-slate-400 text-xs font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  name="mainContact.middleName"
                  value={formData.mainContact.middleName}
                  onChange={(e) => updateMainContact('middleName', e.target.value)}
                  className="w-full h-10 px-3 border border-slate-300 hover:border-slate-400 rounded-md text-sm shadow-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand-500/20 focus-visible:border-brand-500 text-slate-900"
                  placeholder="Middle name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="mainContact.lastName"
                  value={formData.mainContact.lastName}
                  onChange={(e) => updateMainContact('lastName', e.target.value)}
                  onBlur={() => handleBlur('mainContact.lastName')}
                  className={`w-full h-10 px-3 border rounded-md text-sm shadow-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand-500/20 focus-visible:border-brand-500 text-slate-900 ${
                    errors['mainContact.lastName'] && touched['mainContact.lastName']
                      ? 'border-red-400 bg-red-50'
                      : 'border-slate-300 hover:border-slate-400'
                  }`}
                  placeholder="Last name"
                  required
                />
                {errors['mainContact.lastName'] && touched['mainContact.lastName'] && (
                  <p className="text-red-500 text-xs mt-1">{errors['mainContact.lastName']}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Department <span className="text-red-500">*</span>
              </label>
              <div id="mainContact.department">
                <Dropdown
                  id="main-contact-department"
                  value={formData.mainContact.department}
                  options={DEPARTMENT_OPTIONS}
                  onChange={(v) => updateMainContact('department', String(v))}
                  onBlur={() => handleBlur('mainContact.department')}
                  placeholder="Select department"
                  error={errors['mainContact.department'] && touched['mainContact.department']}
                  buttonClassName="py-3 rounded-lg"
                />
              </div>
              {errors['mainContact.department'] && touched['mainContact.department'] && (
                <p className="text-red-500 text-sm mt-1">{errors['mainContact.department']}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Designation <span className="text-red-500">*</span>
              </label>
              <div id="mainContact.designation">
                <Dropdown
                  id="main-contact-designation"
                  value={formData.mainContact.designation}
                  options={DESIGNATION_OPTIONS}
                  onChange={(v) => updateMainContact('designation', String(v))}
                  onBlur={() => handleBlur('mainContact.designation')}
                  placeholder="Select Designation"
                  error={errors['mainContact.designation'] && touched['mainContact.designation']}
                  buttonClassName="py-3 rounded-lg"
                />
              </div>
              {errors['mainContact.designation'] && touched['mainContact.designation'] && (
                <p className="text-red-500 text-sm mt-1">{errors['mainContact.designation']}</p>
              )}
            </div>

            {formData.mainContact.designation === 'Others' && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Custom Designation <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="mainContact.customDesignation"
                  value={formData.mainContact.customDesignation}
                  onChange={(e) => updateMainContact('customDesignation', e.target.value)}
                  onBlur={() => handleBlur('mainContact.customDesignation')}
                  className={`w-full px-4 py-3 border rounded-lg outline-none focus-visible:ring-1 focus-visible:ring-brand-500 focus-visible:border-brand-500 transition-colors text-slate-900 ${
                    errors['mainContact.customDesignation'] && touched['mainContact.customDesignation']
                      ? 'border-red-500 bg-red-50'
                      : 'border-slate-300 hover:border-slate-400'
                  }`}
                  placeholder="Enter custom designation"
                />
                {errors['mainContact.customDesignation'] && touched['mainContact.customDesignation'] && (
                  <p className="text-red-500 text-sm mt-1">{errors['mainContact.customDesignation']}</p>
                )}
              </div>
            )}

            {formData.mainContact.department === 'Others' && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Custom Department <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="mainContact.customDepartment"
                  value={formData.mainContact.customDepartment}
                  onChange={(e) => updateMainContact('customDepartment', e.target.value)}
                  onBlur={() => handleBlur('mainContact.customDepartment')}
                  className={`w-full px-4 py-3 border rounded-lg outline-none focus-visible:ring-1 focus-visible:ring-brand-500 focus-visible:border-brand-500 transition-colors text-slate-900 ${
                    errors['mainContact.customDepartment'] && touched['mainContact.customDepartment']
                      ? 'border-red-500 bg-red-50'
                      : 'border-slate-300 hover:border-slate-400'
                  }`}
                  placeholder="Enter custom department"
                />
                {errors['mainContact.customDepartment'] && touched['mainContact.customDepartment'] && (
                  <p className="text-red-500 text-sm mt-1">{errors['mainContact.customDepartment']}</p>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Primary Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                name="mainContact.email1"
                value={formData.mainContact.email1}
                onChange={(e) => updateMainContact('email1', e.target.value)}
                onBlur={() => handleBlur('mainContact.email1')}
                className={`w-full px-4 py-3 border rounded-lg outline-none focus-visible:ring-1 focus-visible:ring-brand-500 focus-visible:border-brand-500 transition-colors text-slate-900 ${
                  errors['mainContact.email1'] && touched['mainContact.email1']
                    ? 'border-red-500 bg-red-50'
                    : 'border-slate-300 hover:border-slate-400'
                }`}
                placeholder="john@company.com"
                required
              />
              {errors['mainContact.email1'] && touched['mainContact.email1'] && (
                <p className="text-red-500 text-sm mt-1">{errors['mainContact.email1']}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Secondary Email (Optional)
              </label>
              <input
                type="email"
                name="mainContact.email2"
                value={formData.mainContact.email2}
                onChange={(e) => updateMainContact('email2', e.target.value)}
                onBlur={() => handleBlur('mainContact.email2')}
                className={`w-full px-4 py-3 border rounded-lg outline-none focus-visible:ring-1 focus-visible:ring-brand-500 focus-visible:border-brand-500 transition-colors text-slate-900 ${
                  errors['mainContact.email2'] && touched['mainContact.email2']
                    ? 'border-red-500 bg-red-50'
                    : 'border-slate-300 hover:border-slate-400'
                }`}
                placeholder="john.secondary@company.com"
              />
              {errors['mainContact.email2'] && touched['mainContact.email2'] && (
                <p className="text-red-500 text-sm mt-1">{errors['mainContact.email2']}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Primary Phone <span className="text-red-500">*</span>
              </label>
              <PhoneInput
                name="mainContact.phone1"
                value={formData.mainContact.phone1}
                onChange={(v) => updateMainContact('phone1', v)}
                onBlur={() => handleBlur('mainContact.phone1')}
                invalid={!!(errors['mainContact.phone1'] && touched['mainContact.phone1'])}
                placeholder="+1 555 123 4567"
              />
              {errors['mainContact.phone1'] && touched['mainContact.phone1'] && (
                <p className="text-red-500 text-sm mt-1">{errors['mainContact.phone1']}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Secondary Phone (Optional)
              </label>
              <div id="mainContact.phone2">
                <PhoneInput
                  name="mainContact.phone2"
                  value={formData.mainContact.phone2 || ''}
                  onChange={(v) => updateMainContact('phone2', v)}
                  onBlur={() => handleBlur('mainContact.phone2')}
                  invalid={!!(errors['mainContact.phone2'] && touched['mainContact.phone2'])}
                  placeholder="+1 555 765 4321"
                />
              </div>
              {errors['mainContact.phone2'] && touched['mainContact.phone2'] && (
                <p className="text-red-500 text-sm mt-1">{errors['mainContact.phone2']}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Local Landline Number (Optional)
              </label>
              <LocalLandlineInput
                name="mainContact.localLandline"
                locked
                value={{
                  countryCode: '+91',
                  std: formData.mainContact.localLandlineStd || '',
                  number: formData.mainContact.localLandline || '',
                }}
                onChange={(v) => {
                  updateMainContactFields({
                    localLandlineCountryCode: '+91',
                    localLandlineStd: v.std,
                    localLandline: v.number,
                  });
                  setErrors((prev) => ({ ...prev, 'mainContact.localLandline': '' }));
                }}
                onBlur={() => handleBlur('mainContact.localLandline')}
                invalid={!!(errors['mainContact.localLandline'] && touched['mainContact.localLandline'])}
              />
              <p className="mt-1 text-xs text-slate-500">
                India (+91) only — STD / area code, then the landline number.
              </p>
              {errors['mainContact.localLandline'] && touched['mainContact.localLandline'] && (
                <p className="text-red-500 text-sm mt-1">{errors['mainContact.localLandline']}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                International Landline Number (Optional)
              </label>
              <LocalLandlineInput
                name="mainContact.intlLandlineNumber"
                value={{
                  countryCode: formData.mainContact.intlLandlineCountryCode || '+91',
                  std: formData.mainContact.intlLandlineStd || '',
                  number: formData.mainContact.intlLandlineNumber || '',
                }}
                onChange={(v) => {
                  const assembled = v.countryCode + v.std + v.number;
                  updateMainContactFields({
                    intlLandlineCountryCode: v.countryCode,
                    intlLandlineStd: v.std,
                    intlLandlineNumber: v.number,
                    intlLandline: assembled,
                  });
                  setErrors((prev) => ({ ...prev, 'mainContact.intlLandline': '' }));
                }}
                onBlur={() => handleBlur('mainContact.intlLandline')}
                invalid={!!(errors['mainContact.intlLandline'] && touched['mainContact.intlLandline'])}
              />
              <p className="mt-1 text-xs text-slate-500">
                Country code, then STD / area code, then the landline number.
              </p>
              {errors['mainContact.intlLandline'] && touched['mainContact.intlLandline'] && (
                <p className="text-red-500 text-sm mt-1">{errors['mainContact.intlLandline']}</p>
              )}
            </div>
          </div>
        </div>
      </AccordionSection>

      {/* Alternate Contacts */}
      <AccordionSection
        {...sectionProps('alternates')}
        icon={<Mail className="w-4.5 h-4.5" aria-hidden="true" />}
        title={formData.alternateContacts.length === 0 ? 'Additional Contact Persons (Optional)' : `Contact Person 2${formData.alternateContacts.length > 1 ? ` – ${formData.alternateContacts.length + 1}` : ''} (Optional)`}
        subtitle="Secondary contact persons"
      >
        <div>
          {formData.alternateContacts.length === 0 ? (
            <div className="text-center py-6 border border-dashed border-slate-300 rounded-lg bg-slate-50">
              <p className="text-slate-500 text-sm font-medium mb-4">No alternate contacts added</p>
              <Button onClick={addAlternateContact} variant="outline" size="sm" className="bg-brand-500 text-white hover:bg-brand-600 border-transparent">
                <Plus className="w-4 h-4 mr-1.5" aria-hidden="true" />
                Add Contact
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {formData.alternateContacts.map((contact: Contact, index: number) => (
                <div key={contact.id} className="border border-slate-200 rounded-lg p-5 bg-slate-50/50">
                  <div className="flex items-center justify-between mb-5">
                    <h4 className="font-semibold text-slate-900">Contact Person {index + 2}</h4>
                    <Button
                      onClick={() => removeAlternateContact(contact.id)}
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:bg-red-50 border-red-200"
                    >
                      <Trash2 className="w-4 h-4 mr-1.5" /> Remove
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Profile Photo */}
                    <div className="md:col-span-2" id={`altContact_${contact.id}_photo`}>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Profile Photo <span className="text-red-500">*</span>
                      </label>
                      <div className="flex items-center gap-4">
                        {contact.photo ? (
                          <div className="relative">
                            <Image
                              src={contact.photo}
                              alt="Contact photo"
                              width={80}
                              height={80}
                              className="w-20 h-20 rounded-full object-cover border-2 border-slate-200"
                            />
                            <button
                              type="button"
                              onClick={() => removeAltContactPhoto(contact.id)}
                              className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <div className={`w-20 h-20 rounded-full border-2 border-dashed flex items-center justify-center ${
                            errors[`altContact_${contact.id}_photo`] && touched[`altContact_${contact.id}_photo`]
                              ? 'border-red-400 bg-red-50'
                              : 'border-slate-300 bg-slate-50'
                          }`}>
                            <Camera className="w-6 h-6 text-slate-400" />
                          </div>
                        )}
                        <div>
                          <label
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                document.getElementById(`altContact_${contact.id}_photoInput`)?.click();
                              }
                            }}
                            className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-brand-600 bg-brand-50 border border-brand-200 rounded-lg hover:bg-brand-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                          >
                            <Camera className="w-4 h-4" />
                            {contact.photo ? 'Change Photo' : 'Upload Photo'}
                            <input
                              id={`altContact_${contact.id}_photoInput`}
                              type="file"
                              accept="image/jpeg,image/png,image/webp"
                              onChange={(e) => handleAltContactPhotoChange(contact.id, e)}
                              className="hidden"
                            />
                          </label>
                          <p className="text-xs text-slate-500 mt-1">JPG, PNG or WebP. Max 5,120 KB.</p>
                        </div>
                      </div>
                      {errors[`altContact_${contact.id}_photo`] && touched[`altContact_${contact.id}_photo`] && (
                        <p className="text-red-500 text-sm mt-1">{errors[`altContact_${contact.id}_photo`]}</p>
                      )}
                    </div>

                    <div className="md:col-span-2 grid grid-cols-[130px_1fr_1fr_1fr] gap-4 items-start">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                        <TitleSelect
                          value={contact.title || ''}
                          onChange={(v) => updateAlternateContact(contact.id, 'title', v)}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">First Name <span className="text-red-500">*</span></label>
                        <input
                          type="text"
                          name={`altContact_${contact.id}_firstName`}
                          value={contact.firstName}
                          onChange={(e) => updateAlternateContact(contact.id, 'firstName', e.target.value)}
                          onBlur={() => handleBlur(`altContact_${contact.id}_firstName`)}
                          className={`w-full h-10 px-3 border rounded-md text-sm shadow-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand-500/20 focus-visible:border-brand-500 text-slate-900 ${
                            errors[`altContact_${contact.id}_firstName`] && touched[`altContact_${contact.id}_firstName`]
                              ? 'border-red-400 bg-red-50'
                              : 'border-slate-300 hover:border-slate-400'
                          }`}
                          placeholder="First name"
                        />
                        {errors[`altContact_${contact.id}_firstName`] && touched[`altContact_${contact.id}_firstName`] && (
                          <p className="text-red-500 text-xs mt-1">{errors[`altContact_${contact.id}_firstName`]}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Middle Name <span className="text-slate-400 text-xs font-normal">(optional)</span></label>
                        <input
                          type="text"
                          name={`altContact_${contact.id}_middleName`}
                          value={contact.middleName}
                          onChange={(e) => updateAlternateContact(contact.id, 'middleName', e.target.value)}
                          className="w-full h-10 px-3 border border-slate-300 hover:border-slate-400 rounded-md text-sm shadow-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand-500/20 focus-visible:border-brand-500 text-slate-900"
                          placeholder="Middle name"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Last Name <span className="text-red-500">*</span></label>
                        <input
                          type="text"
                          name={`altContact_${contact.id}_lastName`}
                          value={contact.lastName}
                          onChange={(e) => updateAlternateContact(contact.id, 'lastName', e.target.value)}
                          onBlur={() => handleBlur(`altContact_${contact.id}_lastName`)}
                          className={`w-full h-10 px-3 border rounded-md text-sm shadow-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand-500/20 focus-visible:border-brand-500 text-slate-900 ${
                            errors[`altContact_${contact.id}_lastName`] && touched[`altContact_${contact.id}_lastName`]
                              ? 'border-red-400 bg-red-50'
                              : 'border-slate-300 hover:border-slate-400'
                          }`}
                          placeholder="Last name"
                        />
                        {errors[`altContact_${contact.id}_lastName`] && touched[`altContact_${contact.id}_lastName`] && (
                          <p className="text-red-500 text-xs mt-1">{errors[`altContact_${contact.id}_lastName`]}</p>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Department <span className="text-red-500">*</span></label>
                      <div id={`altContact_${contact.id}_department`}>
                        <Dropdown
                          options={DEPARTMENT_OPTIONS}
                          value={contact.department}
                          onChange={(val) => updateAlternateContact(contact.id, 'department', String(val))}
                          onBlur={() => handleBlur(`altContact_${contact.id}_department`)}
                          placeholder="Select Department"
                          error={errors[`altContact_${contact.id}_department`] && touched[`altContact_${contact.id}_department`]}
                        />
                        {errors[`altContact_${contact.id}_department`] && touched[`altContact_${contact.id}_department`] && (
                          <p className="text-red-500 text-sm mt-1">{errors[`altContact_${contact.id}_department`]}</p>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Designation <span className="text-red-500">*</span></label>
                      <div id={`altContact_${contact.id}_designation`}>
                        <Dropdown
                          options={DESIGNATION_OPTIONS}
                          value={contact.designation}
                          onChange={(val) => updateAlternateContact(contact.id, 'designation', String(val))}
                          onBlur={() => handleBlur(`altContact_${contact.id}_designation`)}
                          placeholder="Select Designation"
                          error={errors[`altContact_${contact.id}_designation`] && touched[`altContact_${contact.id}_designation`]}
                        />
                        {errors[`altContact_${contact.id}_designation`] && touched[`altContact_${contact.id}_designation`] && (
                          <p className="text-red-500 text-sm mt-1">{errors[`altContact_${contact.id}_designation`]}</p>
                        )}
                      </div>
                    </div>
                    {contact.designation === 'Others' && (
                      <div className="md:col-span-2 animate-in fade-in slide-in-from-top-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Custom Designation <span className="text-red-500">*</span></label>
                        <input
                          type="text"
                          name={`altContact_${contact.id}_customDesignation`}
                          value={contact.customDesignation || ''}
                          onChange={(e) => updateAlternateContact(contact.id, 'customDesignation', e.target.value)}
                          onBlur={() => handleBlur(`altContact_${contact.id}_customDesignation`)}
                          className={`w-full px-4 py-3 border rounded-lg outline-none focus-visible:ring-1 focus-visible:ring-brand-500 focus-visible:border-brand-500 transition-colors text-slate-900 ${
                            errors[`altContact_${contact.id}_customDesignation`] && touched[`altContact_${contact.id}_customDesignation`]
                              ? 'border-red-500 bg-red-50'
                              : 'border-slate-300 hover:border-slate-400'
                          }`}
                          placeholder="Enter custom designation"
                        />
                        {errors[`altContact_${contact.id}_customDesignation`] && touched[`altContact_${contact.id}_customDesignation`] && (
                          <p className="text-red-500 text-sm mt-1">{errors[`altContact_${contact.id}_customDesignation`]}</p>
                        )}
                      </div>
                    )}
                    {contact.department === 'Others' && (
                      <div className="md:col-span-2 animate-in fade-in slide-in-from-top-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Custom Department <span className="text-red-500">*</span></label>
                        <input
                          type="text"
                          name={`altContact_${contact.id}_customDepartment`}
                          value={contact.customDepartment || ''}
                          onChange={(e) => updateAlternateContact(contact.id, 'customDepartment', e.target.value)}
                          onBlur={() => handleBlur(`altContact_${contact.id}_customDepartment`)}
                          className={`w-full px-4 py-3 border rounded-lg outline-none focus-visible:ring-1 focus-visible:ring-brand-500 focus-visible:border-brand-500 transition-colors text-slate-900 ${
                            errors[`altContact_${contact.id}_customDepartment`] && touched[`altContact_${contact.id}_customDepartment`]
                              ? 'border-red-500 bg-red-50'
                              : 'border-slate-300 hover:border-slate-400'
                          }`}
                          placeholder="Enter custom department"
                        />
                        {errors[`altContact_${contact.id}_customDepartment`] && touched[`altContact_${contact.id}_customDepartment`] && (
                          <p className="text-red-500 text-sm mt-1">{errors[`altContact_${contact.id}_customDepartment`]}</p>
                        )}
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Primary Email <span className="text-red-500">*</span></label>
                      <input
                        type="email"
                        name={`altContact_${contact.id}_email1`}
                        value={contact.email1}
                        onChange={(e) => updateAlternateContact(contact.id, 'email1', e.target.value)}
                        onBlur={() => handleBlur(`altContact_${contact.id}_email1`)}
                        className={`w-full px-4 py-3 border rounded-lg outline-none focus-visible:ring-1 focus-visible:ring-brand-500 focus-visible:border-brand-500 transition-colors text-slate-900 ${
                          errors[`altContact_${contact.id}_email1`] && touched[`altContact_${contact.id}_email1`]
                            ? 'border-red-500 bg-red-50'
                            : 'border-slate-300 hover:border-slate-400'
                        }`}
                        placeholder="jane@company.com"
                      />
                      {errors[`altContact_${contact.id}_email1`] && touched[`altContact_${contact.id}_email1`] && (
                        <p className="text-red-500 text-sm mt-1">{errors[`altContact_${contact.id}_email1`]}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Secondary Email (Optional)</label>
                      <input
                        type="email"
                        name={`altContact_${contact.id}_email2`}
                        value={contact.email2 || ''}
                        onChange={(e) => updateAlternateContact(contact.id, 'email2', e.target.value)}
                        onBlur={() => handleBlur(`altContact_${contact.id}_email2`)}
                        className={`w-full px-4 py-3 border rounded-lg outline-none focus-visible:ring-1 focus-visible:ring-brand-500 focus-visible:border-brand-500 transition-colors text-slate-900 ${
                          errors[`altContact_${contact.id}_email2`] && touched[`altContact_${contact.id}_email2`]
                            ? 'border-red-500 bg-red-50'
                            : 'border-slate-300 hover:border-slate-400'
                        }`}
                        placeholder="jane.secondary@company.com"
                      />
                      {errors[`altContact_${contact.id}_email2`] && touched[`altContact_${contact.id}_email2`] && (
                        <p className="text-red-500 text-sm mt-1">{errors[`altContact_${contact.id}_email2`]}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Primary Phone <span className="text-red-500">*</span></label>
                      <div id={`altContact_${contact.id}_phone1`}>
                        <PhoneInput
                          name={`altContact_${contact.id}_phone1`}
                          value={contact.phone1}
                          onChange={(v) => updateAlternateContact(contact.id, 'phone1', v)}
                          onBlur={() => handleBlur(`altContact_${contact.id}_phone1`)}
                          invalid={!!(errors[`altContact_${contact.id}_phone1`] && touched[`altContact_${contact.id}_phone1`])}
                          placeholder="+1 555 987 6543"
                        />
                      </div>
                      {errors[`altContact_${contact.id}_phone1`] && touched[`altContact_${contact.id}_phone1`] && (
                        <p className="text-red-500 text-sm mt-1">{errors[`altContact_${contact.id}_phone1`]}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Secondary Phone (Optional)</label>
                      <div id={`altContact_${contact.id}_phone2`}>
                        <PhoneInput
                          name={`altContact_${contact.id}_phone2`}
                          value={contact.phone2 || ''}
                          onChange={(v) => updateAlternateContact(contact.id, 'phone2', v)}
                          onBlur={() => handleBlur(`altContact_${contact.id}_phone2`)}
                          invalid={!!(errors[`altContact_${contact.id}_phone2`] && touched[`altContact_${contact.id}_phone2`])}
                          placeholder="+1 555 321 0987"
                        />
                      </div>
                      {errors[`altContact_${contact.id}_phone2`] && touched[`altContact_${contact.id}_phone2`] && (
                        <p className="text-red-500 text-sm mt-1">{errors[`altContact_${contact.id}_phone2`]}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" aria-hidden="true" />
                        Local Landline <span className="text-slate-400 text-xs font-normal">(Optional)</span>
                      </label>
                      <LocalLandlineInput
                        locked
                        value={{ countryCode: '+91', std: contact.localLandlineStd, number: contact.localLandline }}
                        onChange={(v: LocalLandlineValue) => updateAlternateContactFields(contact.id, {
                          localLandlineStd: v.std,
                          localLandline: v.number,
                        })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" aria-hidden="true" />
                        International Landline <span className="text-slate-400 text-xs font-normal">(Optional)</span>
                      </label>
                      <LocalLandlineInput
                        value={{ countryCode: contact.intlLandlineCountryCode, std: contact.intlLandlineStd, number: contact.intlLandlineNumber }}
                        onChange={(v: LocalLandlineValue) => updateAlternateContactFields(contact.id, {
                          intlLandlineCountryCode: v.countryCode,
                          intlLandlineStd: v.std,
                          intlLandlineNumber: v.number,
                        })}
                      />
                    </div>
                  </div>
                </div>
              ))}
              
              {formData.alternateContacts.length < 3 && (
                <div className="flex justify-end pt-2">
                  <Button onClick={addAlternateContact} variant="outline" size="sm" className="bg-brand-500 text-white hover:bg-brand-600 border-transparent">
                    <Plus className="w-4 h-4 mr-1.5" aria-hidden="true" />
                    Add Another Contact
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </AccordionSection>

      {/* Import/Export Information */}
      <AccordionSection
        {...sectionProps('tradeFlow')}
        icon={<Globe className="w-4.5 h-4.5" aria-hidden="true" />}
        title="Import/Export Information"
        subtitle="Import and export experience"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Do you engage in import/export activities?
            </label>
            <div className="flex space-x-4">
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  value="yes"
                  checked={formData.hasImportExport === 'yes'}
                  onChange={(e) => handleInputChange('hasImportExport', e.target.value)}
                  className="w-4 h-4 accent-brand-500 border-slate-300 focus-visible:ring-brand-500"
                />
                <span className="ml-2 text-sm text-gray-700">Yes</span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  value="no"
                  checked={formData.hasImportExport === 'no'}
                  onChange={(e) => handleInputChange('hasImportExport', e.target.value)}
                  className="w-4 h-4 accent-brand-500 border-slate-300 focus-visible:ring-brand-500"
                />
                <span className="ml-2 text-sm text-gray-700">No</span>
              </label>
            </div>
          </div>

          {formData.hasImportExport === 'yes' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div id="importCountries">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Import Countries
                </label>
                <CountryMultiSelect
                  label="Select Import Countries"
                  buttonLabel="Select Import Countries"
                  value={formData.importCountries}
                  onChange={(names) => {
                    handleInputChange('importCountries', names);
                    handleBlur('importCountries');
                    if (errors['importCountries'] && names.length > 0) {
                      setErrors(prev => ({ ...prev, importCountries: '' }));
                    }
                  }}
                  invalid={!!(errors['importCountries'] && touched['importCountries'])}
                  emptyHint="No import countries selected yet"
                />
                {errors['importCountries'] && touched['importCountries'] && (
                  <p className="text-red-500 text-sm mt-1">{errors['importCountries']}</p>
                )}
              </div>
              <div id="exportCountries">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Export Countries
                </label>
                <CountryMultiSelect
                  label="Select Export Countries"
                  buttonLabel="Select Export Countries"
                  value={formData.exportCountries}
                  onChange={(names) => {
                    handleInputChange('exportCountries', names);
                    handleBlur('exportCountries');
                    if (errors['exportCountries'] && names.length > 0) {
                      setErrors(prev => ({ ...prev, exportCountries: '' }));
                    }
                  }}
                  invalid={!!(errors['exportCountries'] && touched['exportCountries'])}
                  emptyHint="No export countries selected yet"
                />
                {errors['exportCountries'] && touched['exportCountries'] && (
                  <p className="text-red-500 text-sm mt-1">{errors['exportCountries']}</p>
                )}
              </div>
            </div>
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
          Save & Continue
          <ArrowRight className="w-4 h-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}