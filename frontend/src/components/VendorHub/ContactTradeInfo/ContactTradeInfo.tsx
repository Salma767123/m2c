'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/UI/Button';
import { Phone, Mail, User, Plus, Trash2, Globe, MapPin, Camera, X, ArrowLeft, ArrowRight, Landmark, FileText } from 'lucide-react';
import Image from 'next/image';
import Dropdown from '@/components/UI/Dropdown';
import { PhoneInput, CountrySelect, validatePhoneE164 } from '@/components/VendorHub/FormUI';
import { handleUpload } from '@/lib/toast-utils';

interface ContactTradeInfoProps {
  onNext: () => void;
  onPrev: () => void;
  onUpdateData: (data: any) => void;
  data: any;
}

interface Contact {
  id: string;
  firstName: string;
  middleName: string;
  lastName: string;
  designation: string;
  customDesignation?: string;
  email1: string;
  email2?: string;
  phone1: string;
  phone2?: string;
  landline?: string;
  department: string;
  customDepartment?: string;
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

export default function ContactTradeInfo({ onNext, onPrev, onUpdateData, data }: ContactTradeInfoProps) {
  const [formData, setFormData] = useState(() => {
    const mainNameParts = parseName(data?.mainContact?.name || '');
    return {
      mainContact: {
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
        department: data?.mainContact?.department || '',
        customDepartment: data?.mainContact?.customDepartment || ''
      },
      alternateContacts: (data?.alternateContacts || []).map((c: any) => {
        const altNameParts = parseName(c.name || '');
        return {
          id: c.id || Date.now().toString(),
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
          department: c.department || '',
          customDepartment: c.customDepartment || ''
        };
      }),
      hasImportExport: data.hasImportExport || 'no',
      importCountries: data.importCountries || [],
      exportCountries: data.exportCountries || [],
      tradeLicenseNumber: data.tradeLicenseNumber || '',
      businessRegistrationNumber: data.businessRegistrationNumber || '',
      taxIdentificationNumber: data.taxIdentificationNumber || '',
      bankingDetails: data.bankingDetails || {
        bankName: '',
        accountNumber: '',
        swiftCode: '',
        iban: ''
      }
    };
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const mainNameParts = parseName(data?.mainContact?.name || '');
    setFormData({
      mainContact: {
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
        department: data?.mainContact?.department || '',
        customDepartment: data?.mainContact?.customDepartment || ''
      },
      alternateContacts: (data?.alternateContacts || []).map((c: any) => {
        const altNameParts = parseName(c.name || '');
        return {
          id: c.id || Date.now().toString(),
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
          department: c.department || '',
          customDepartment: c.customDepartment || ''
        };
      }),
      hasImportExport: data.hasImportExport || 'no',
      importCountries: data.importCountries || [],
      exportCountries: data.exportCountries || [],
      tradeLicenseNumber: data.tradeLicenseNumber || '',
      businessRegistrationNumber: data.businessRegistrationNumber || '',
      taxIdentificationNumber: data.taxIdentificationNumber || '',
      bankingDetails: data.bankingDetails || {
        bankName: '',
        accountNumber: '',
        swiftCode: '',
        iban: ''
      }
    });
  }, [data]);

  const [contactPhoto, setContactPhoto] = useState<string | null>(data?.mainContact?.photo || null);
  const [contactPhotoFile, setContactPhotoFile] = useState<File | null>(null);

  const handleContactPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const result = handleUpload(file, {
        label: 'Profile photo',
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
    }
  };

  const removeContactPhoto = () => {
    setContactPhoto(null);
    setContactPhotoFile(null);
    setErrors(prev => ({ ...prev, 'mainContact.photo': '' }));
  };

  const addAlternateContact = () => {
    if (formData.alternateContacts.length < 3) {
      const newContact: Contact = {
        id: Date.now().toString(),
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
        department: '',
        customDepartment: ''
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

    checkEmailUniqueness(main.email1, 'mainContact.email1', 'Main Contact (Email 1)');
    checkEmailUniqueness(main.email2, 'mainContact.email2', 'Main Contact (Email 2)');

    const phone1Err = validatePhoneE164(main.phone1, { required: true, label: 'Phone Number 1' });
    if (phone1Err) {
      newErrors['mainContact.phone1'] = phone1Err;
    }

    if (main.phone2) {
      const phoneErr = validatePhoneE164(main.phone2, { label: 'Phone Number 2' });
      if (phoneErr) newErrors['mainContact.phone2'] = phoneErr;
    }

    if (main.landline) {
      const landErr = validatePhoneE164(main.landline, { label: 'Landline Number' });
      if (landErr) newErrors['mainContact.landline'] = landErr;
    }

    if (!main.department?.trim()) {
      newErrors['mainContact.department'] = 'Department is required';
    } else if (main.department === 'Others' && (!main.customDepartment || main.customDepartment.trim() === '')) {
      newErrors['mainContact.customDepartment'] = 'Please specify department';
    }

    formData.alternateContacts.forEach((alt: Contact, idx: number) => {
      const prefix = `altContact_${alt.id}`;
      
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

      checkEmailUniqueness(alt.email1, `${prefix}_email1`, `Contact Person ${idx + 2} (Email 1)`);
      checkEmailUniqueness(alt.email2, `${prefix}_email2`, `Contact Person ${idx + 2} (Email 2)`);

      const altPhone1Err = validatePhoneE164(alt.phone1, { required: true, label: 'Phone Number 1' });
      if (altPhone1Err) {
        newErrors[`${prefix}_phone1`] = altPhone1Err;
      }

      if (alt.phone2) {
        const phoneErr = validatePhoneE164(alt.phone2, { label: 'Phone Number 2' });
        if (phoneErr) newErrors[`${prefix}_phone2`] = phoneErr;
      }

      if (alt.landline) {
        const landErr = validatePhoneE164(alt.landline, { label: 'Landline Number' });
        if (landErr) newErrors[`${prefix}_landline`] = landErr;
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
      
      setTimeout(() => {
        const firstErrorKey = Object.keys(newErrors)[0];
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
      }, 50);
      return;
    }

    // Transform for storage
    const transformedMainContact = {
      ...formData.mainContact,
      name: `${formData.mainContact.firstName} ${formData.mainContact.middleName ? formData.mainContact.middleName + ' ' : ''}${formData.mainContact.lastName}`.trim(),
      photo: contactPhoto,
      photoFile: contactPhotoFile,
    };

    const transformedAlternateContacts = formData.alternateContacts.map((c: Contact) => ({
      ...c,
      name: `${c.firstName} ${c.middleName ? c.middleName + ' ' : ''}${c.lastName}`.trim()
    }));

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

      {/* Main Contact */}
      <section className="bg-white border border-slate-200 rounded-lg overflow-visible relative z-30">
        <div className="px-6 pt-6 pb-4 border-b border-slate-100">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <User className="w-5 h-5 text-gray-500 shrink-0" aria-hidden="true" />
            Contact Person
          </h3>
        </div>
        <div className="px-6 py-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Profile Photo Upload moved to the top */}
            <div className="md:col-span-2 mb-2" id="mainContact.photo">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Profile Photo
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
                        if (fileInput) {
                          fileInput.click();
                        }
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                First Name <span className="text-red-500 text-lg">*</span>
              </label>
              <input
                type="text"
                name="mainContact.firstName"
                value={formData.mainContact.firstName}
                onChange={(e) => updateMainContact('firstName', e.target.value)}
                onBlur={() => handleBlur('mainContact.firstName')}
                className={`w-full px-4 py-3 border rounded-lg outline-none focus-visible:ring-1 focus-visible:ring-brand-500 focus-visible:border-brand-500 transition-colors text-slate-900 ${
                  errors['mainContact.firstName'] && touched['mainContact.firstName']
                    ? 'border-red-500 bg-red-50'
                    : 'border-slate-300 hover:border-slate-400'
                }`}
                placeholder="John"
                required
              />
              {errors['mainContact.firstName'] && touched['mainContact.firstName'] && (
                <p className="text-red-500 text-sm mt-1">{errors['mainContact.firstName']}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Middle Name (Optional)
              </label>
              <input
                type="text"
                name="mainContact.middleName"
                value={formData.mainContact.middleName}
                onChange={(e) => updateMainContact('middleName', e.target.value)}
                onBlur={() => handleBlur('mainContact.middleName')}
                className={`w-full px-4 py-3 border rounded-lg outline-none focus-visible:ring-1 focus-visible:ring-brand-500 focus-visible:border-brand-500 transition-colors text-slate-900 ${
                  errors['mainContact.middleName'] && touched['mainContact.middleName']
                    ? 'border-red-500 bg-red-50'
                    : 'border-slate-300 hover:border-slate-400'
                }`}
                placeholder="William"
              />
              {errors['mainContact.middleName'] && touched['mainContact.middleName'] && (
                <p className="text-red-500 text-sm mt-1">{errors['mainContact.middleName']}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Last Name <span className="text-red-500 text-lg">*</span>
              </label>
              <input
                type="text"
                name="mainContact.lastName"
                value={formData.mainContact.lastName}
                onChange={(e) => updateMainContact('lastName', e.target.value)}
                onBlur={() => handleBlur('mainContact.lastName')}
                className={`w-full px-4 py-3 border rounded-lg outline-none focus-visible:ring-1 focus-visible:ring-brand-500 focus-visible:border-brand-500 transition-colors text-slate-900 ${
                  errors['mainContact.lastName'] && touched['mainContact.lastName']
                    ? 'border-red-500 bg-red-50'
                    : 'border-slate-300 hover:border-slate-400'
                }`}
                placeholder="Smith"
                required
              />
              {errors['mainContact.lastName'] && touched['mainContact.lastName'] && (
                <p className="text-red-500 text-sm mt-1">{errors['mainContact.lastName']}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Designation <span className="text-red-500 text-lg">*</span>
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
                />
              </div>
              {errors['mainContact.designation'] && touched['mainContact.designation'] && (
                <p className="text-red-500 text-sm mt-1">{errors['mainContact.designation']}</p>
              )}
            </div>

            {formData.mainContact.designation === 'Others' && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Custom Designation <span className="text-red-500 text-lg">*</span>
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address 1 <span className="text-red-500 text-lg">*</span>
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
                Email Address 2 (Optional)
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
                Phone Number 1 <span className="text-red-500 text-lg">*</span>
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
                Phone Number 2 (Optional)
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

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Landline Number (Optional)
              </label>
              <div id="mainContact.landline">
                <PhoneInput
                  name="mainContact.landline"
                  value={formData.mainContact.landline || ''}
                  onChange={(v) => updateMainContact('landline', v)}
                  onBlur={() => handleBlur('mainContact.landline')}
                  invalid={!!(errors['mainContact.landline'] && touched['mainContact.landline'])}
                  placeholder="+1 555 987 6543"
                />
              </div>
              {errors['mainContact.landline'] && touched['mainContact.landline'] && (
                <p className="text-red-500 text-sm mt-1">{errors['mainContact.landline']}</p>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Department <span className="text-red-500 text-lg">*</span>
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
                />
              </div>
              {errors['mainContact.department'] && touched['mainContact.department'] && (
                <p className="text-red-500 text-sm mt-1">{errors['mainContact.department']}</p>
              )}
            </div>

            {formData.mainContact.department === 'Others' && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Custom Department <span className="text-red-500 text-lg">*</span>
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
          </div>
        </div>
      </section>

      {/* Alternate Contacts */}
      <section className="bg-white border border-slate-200 rounded-lg overflow-visible relative z-20">
        <div className="px-6 pt-6 pb-4 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Mail className="w-5 h-5 text-gray-500 shrink-0" aria-hidden="true" />
              Contact Person 2 (Optional)
            </h3>
            {formData.alternateContacts.length < 3 && (
              <Button onClick={addAlternateContact} variant="outline" size="sm" className="bg-brand-500 text-white hover:bg-brand-600 border-transparent">
                <Plus className="w-4 h-4 mr-1.5" aria-hidden="true" />
                Add Contact
              </Button>
            )}
          </div>
        </div>
        <div className="px-6 py-6">
          {formData.alternateContacts.length === 0 ? (
            <p className="text-slate-500 text-center py-4 text-sm font-medium">No alternate contacts added</p>
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
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">First Name <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        name={`altContact_${contact.id}_firstName`}
                        value={contact.firstName}
                        onChange={(e) => updateAlternateContact(contact.id, 'firstName', e.target.value)}
                        onBlur={() => handleBlur(`altContact_${contact.id}_firstName`)}
                        className={`w-full px-4 py-3 border rounded-lg outline-none focus-visible:ring-1 focus-visible:ring-brand-500 focus-visible:border-brand-500 transition-colors text-slate-900 ${
                          errors[`altContact_${contact.id}_firstName`] && touched[`altContact_${contact.id}_firstName`]
                            ? 'border-red-500 bg-red-50'
                            : 'border-slate-300 hover:border-slate-400'
                        }`}
                        placeholder="Jane"
                      />
                      {errors[`altContact_${contact.id}_firstName`] && touched[`altContact_${contact.id}_firstName`] && (
                        <p className="text-red-500 text-sm mt-1">{errors[`altContact_${contact.id}_firstName`]}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Middle Name (Optional)</label>
                      <input
                        type="text"
                        name={`altContact_${contact.id}_middleName`}
                        value={contact.middleName}
                        onChange={(e) => updateAlternateContact(contact.id, 'middleName', e.target.value)}
                        onBlur={() => handleBlur(`altContact_${contact.id}_middleName`)}
                        className={`w-full px-4 py-3 border rounded-lg outline-none focus-visible:ring-1 focus-visible:ring-brand-500 focus-visible:border-brand-500 transition-colors text-slate-900 ${
                          errors[`altContact_${contact.id}_middleName`] && touched[`altContact_${contact.id}_middleName`]
                            ? 'border-red-500 bg-red-50'
                            : 'border-slate-300 hover:border-slate-400'
                        }`}
                        placeholder="A."
                      />
                      {errors[`altContact_${contact.id}_middleName`] && touched[`altContact_${contact.id}_middleName`] && (
                        <p className="text-red-500 text-sm mt-1">{errors[`altContact_${contact.id}_middleName`]}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Last Name <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        name={`altContact_${contact.id}_lastName`}
                        value={contact.lastName}
                        onChange={(e) => updateAlternateContact(contact.id, 'lastName', e.target.value)}
                        onBlur={() => handleBlur(`altContact_${contact.id}_lastName`)}
                        className={`w-full px-4 py-3 border rounded-lg outline-none focus-visible:ring-1 focus-visible:ring-brand-500 focus-visible:border-brand-500 transition-colors text-slate-900 ${
                          errors[`altContact_${contact.id}_lastName`] && touched[`altContact_${contact.id}_lastName`]
                            ? 'border-red-500 bg-red-50'
                            : 'border-slate-300 hover:border-slate-400'
                        }`}
                        placeholder="Doe"
                      />
                      {errors[`altContact_${contact.id}_lastName`] && touched[`altContact_${contact.id}_lastName`] && (
                        <p className="text-red-500 text-sm mt-1">{errors[`altContact_${contact.id}_lastName`]}</p>
                      )}
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
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Email Address 1 <span className="text-red-500">*</span></label>
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
                      <label className="block text-sm font-medium text-gray-700 mb-2">Email Address 2 (Optional)</label>
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
                      <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number 1 <span className="text-red-500">*</span></label>
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
                      <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number 2 (Optional)</label>
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
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Landline Number (Optional)</label>
                      <div id={`altContact_${contact.id}_landline`}>
                        <PhoneInput
                          name={`altContact_${contact.id}_landline`}
                          value={contact.landline || ''}
                          onChange={(v) => updateAlternateContact(contact.id, 'landline', v)}
                          onBlur={() => handleBlur(`altContact_${contact.id}_landline`)}
                          invalid={!!(errors[`altContact_${contact.id}_landline`] && touched[`altContact_${contact.id}_landline`])}
                          placeholder="+1 555 111 2222"
                        />
                      </div>
                      {errors[`altContact_${contact.id}_landline`] && touched[`altContact_${contact.id}_landline`] && (
                        <p className="text-red-500 text-sm mt-1">{errors[`altContact_${contact.id}_landline`]}</p>
                      )}
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
                    {contact.department === 'Others' && (
                      <div className="animate-in fade-in slide-in-from-top-2">
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
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Import/Export Information */}
      <section className="bg-white border border-slate-200 rounded-lg overflow-visible relative z-10">
        <div className="px-6 pt-6 pb-4 border-b border-slate-100">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Globe className="w-5 h-5 text-gray-500 shrink-0" aria-hidden="true" />
            Import/Export Information
          </h3>
        </div>
        <div className="px-6 py-6 space-y-4">
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-20">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Import Countries
                </label>
                <div id="importCountries">
                  <CountrySelect
                    id="import-countries"
                    value=""
                    onChange={(v) => {
                      if (!formData.importCountries.includes(v)) {
                        handleInputChange('importCountries', [...formData.importCountries, v]);
                        if (errors['importCountries']) {
                          setErrors(prev => ({ ...prev, importCountries: '' }));
                        }
                      }
                    }}
                    onBlur={() => handleBlur('importCountries')}
                    placeholder="Select a country to add..."
                    invalid={!!(errors['importCountries'] && touched['importCountries'])}
                  />
                </div>
                {errors['importCountries'] && touched['importCountries'] && (
                  <p className="text-red-500 text-sm mt-1">{errors['importCountries']}</p>
                )}
                {formData.importCountries.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {formData.importCountries.map((country: string) => (
                      <span key={country} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-brand-50 text-brand-700 text-sm font-medium border border-brand-200">
                        {country}
                        <button
                          type="button"
                          onClick={() => handleInputChange('importCountries', formData.importCountries.filter((c: string) => c !== country))}
                          className="hover:bg-brand-100 rounded-full p-0.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                          aria-label={`Remove ${country}`}
                        >
                          <X className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                {!formData.importCountries.length && (
                  <p className="text-xs text-slate-500 mt-1">Select one or more countries</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Export Countries
                </label>
                <div id="exportCountries">
                  <CountrySelect
                    id="export-countries"
                    value=""
                    onChange={(v) => {
                      if (!formData.exportCountries.includes(v)) {
                        handleInputChange('exportCountries', [...formData.exportCountries, v]);
                        if (errors['exportCountries']) {
                          setErrors(prev => ({ ...prev, exportCountries: '' }));
                        }
                      }
                    }}
                    onBlur={() => handleBlur('exportCountries')}
                    placeholder="Select a country to add..."
                    invalid={!!(errors['exportCountries'] && touched['exportCountries'])}
                  />
                </div>
                {errors['exportCountries'] && touched['exportCountries'] && (
                  <p className="text-red-500 text-sm mt-1">{errors['exportCountries']}</p>
                )}
                {formData.exportCountries.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {formData.exportCountries.map((country: string) => (
                      <span key={country} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-brand-50 text-brand-700 text-sm font-medium border border-brand-200">
                        {country}
                        <button
                          type="button"
                          onClick={() => handleInputChange('exportCountries', formData.exportCountries.filter((c: string) => c !== country))}
                          className="hover:bg-brand-100 rounded-full p-0.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                          aria-label={`Remove ${country}`}
                        >
                          <X className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                {!formData.exportCountries.length && (
                  <p className="text-xs text-slate-500 mt-1">Select one or more countries</p>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Regulatory IDs — Trade License / Business Registration / Tax ID.
          All optional, persisted to dedicated Vendor columns. */}
      <section className="bg-white border border-slate-200 rounded-lg">
        <div className="px-6 pt-6 pb-4 border-b border-slate-100">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-gray-500 shrink-0" aria-hidden="true" />
            Regulatory IDs
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Optional — admins use these to verify the vendor against external registries.
          </p>
        </div>
        <div className="px-6 py-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="tradeLicenseNumber" className="block text-sm font-medium text-gray-700 mb-1">
              Trade License Number <span className="text-gray-400">(optional)</span>
            </label>
            <input
              type="text"
              id="tradeLicenseNumber"
              value={formData.tradeLicenseNumber}
              onChange={(e) => handleInputChange('tradeLicenseNumber', e.target.value)}
              autoComplete="off"
              className="w-full px-3 py-2 border border-slate-200 hover:border-slate-300 rounded-lg outline-none focus-visible:ring-1 focus-visible:ring-brand-500 focus-visible:border-brand-500 transition-colors text-sm"
              placeholder="e.g. TL-2024-001234"
            />
          </div>
          <div>
            <label htmlFor="businessRegistrationNumber" className="block text-sm font-medium text-gray-700 mb-1">
              Business Registration No. <span className="text-gray-400">(optional)</span>
            </label>
            <input
              type="text"
              id="businessRegistrationNumber"
              value={formData.businessRegistrationNumber}
              onChange={(e) => handleInputChange('businessRegistrationNumber', e.target.value)}
              autoComplete="off"
              className="w-full px-3 py-2 border border-slate-200 hover:border-slate-300 rounded-lg outline-none focus-visible:ring-1 focus-visible:ring-brand-500 focus-visible:border-brand-500 transition-colors text-sm"
              placeholder="Issued by your local registrar"
            />
          </div>
          <div>
            <label htmlFor="taxIdentificationNumber" className="block text-sm font-medium text-gray-700 mb-1">
              Tax Identification No. <span className="text-gray-400">(optional)</span>
            </label>
            <input
              type="text"
              id="taxIdentificationNumber"
              value={formData.taxIdentificationNumber}
              onChange={(e) => handleInputChange('taxIdentificationNumber', e.target.value)}
              autoComplete="off"
              className="w-full px-3 py-2 border border-slate-200 hover:border-slate-300 rounded-lg outline-none focus-visible:ring-1 focus-visible:ring-brand-500 focus-visible:border-brand-500 transition-colors text-sm"
              placeholder="e.g. TIN-2024-XXXX"
            />
          </div>
        </div>
      </section>

      {/* Banking — bank name + account number are India-domestic; SWIFT/IBAN
          are international. All optional at the form level so vendors can
          fill what applies. Persisted to VendorBankDetails (1:1 with Vendor). */}
      <section className="bg-white border border-slate-200 rounded-lg">
        <div className="px-6 pt-6 pb-4 border-b border-slate-100">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Landmark className="w-5 h-5 text-gray-500 shrink-0" aria-hidden="true" />
            Banking Details
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Optional — used for payouts once your account is approved. SWIFT and IBAN are only needed for international wires.
          </p>
        </div>
        <div className="px-6 py-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="bankName" className="block text-sm font-medium text-gray-700 mb-1">
              Bank Name <span className="text-gray-400">(optional)</span>
            </label>
            <input
              type="text"
              id="bankName"
              value={formData.bankingDetails.bankName}
              onChange={(e) => handleInputChange('bankingDetails', { ...formData.bankingDetails, bankName: e.target.value })}
              autoComplete="off"
              className="w-full px-3 py-2 border border-slate-200 hover:border-slate-300 rounded-lg outline-none focus-visible:ring-1 focus-visible:ring-brand-500 focus-visible:border-brand-500 transition-colors text-sm"
              placeholder="e.g. HDFC Bank"
            />
          </div>
          <div>
            <label htmlFor="accountNumber" className="block text-sm font-medium text-gray-700 mb-1">
              Account Number <span className="text-gray-400">(optional)</span>
            </label>
            <input
              type="text"
              id="accountNumber"
              value={formData.bankingDetails.accountNumber}
              onChange={(e) => handleInputChange('bankingDetails', { ...formData.bankingDetails, accountNumber: e.target.value })}
              autoComplete="off"
              inputMode="numeric"
              className="w-full px-3 py-2 border border-slate-200 hover:border-slate-300 rounded-lg outline-none focus-visible:ring-1 focus-visible:ring-brand-500 focus-visible:border-brand-500 transition-colors text-sm"
              placeholder="Account number"
            />
          </div>
          <div>
            <label htmlFor="swiftCode" className="block text-sm font-medium text-gray-700 mb-1">
              SWIFT / BIC <span className="text-gray-400">(international only)</span>
            </label>
            <input
              type="text"
              id="swiftCode"
              value={formData.bankingDetails.swiftCode}
              onChange={(e) => handleInputChange('bankingDetails', { ...formData.bankingDetails, swiftCode: e.target.value.toUpperCase() })}
              autoComplete="off"
              maxLength={11}
              className="w-full px-3 py-2 border border-slate-200 hover:border-slate-300 rounded-lg outline-none focus-visible:ring-1 focus-visible:ring-brand-500 focus-visible:border-brand-500 transition-colors text-sm font-mono"
              placeholder="e.g. HDFCINBBXXX"
            />
          </div>
          <div>
            <label htmlFor="iban" className="block text-sm font-medium text-gray-700 mb-1">
              IBAN <span className="text-gray-400">(international only)</span>
            </label>
            <input
              type="text"
              id="iban"
              value={formData.bankingDetails.iban}
              onChange={(e) => handleInputChange('bankingDetails', { ...formData.bankingDetails, iban: e.target.value.toUpperCase().replace(/\s+/g, '') })}
              autoComplete="off"
              maxLength={34}
              className="w-full px-3 py-2 border border-slate-200 hover:border-slate-300 rounded-lg outline-none focus-visible:ring-1 focus-visible:ring-brand-500 focus-visible:border-brand-500 transition-colors text-sm font-mono"
              placeholder="e.g. DE89370400440532013000"
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