'use client';

import { useState } from 'react';
import { Button } from '@/components/UI/Button';
import { Phone, Mail, User, Plus, Trash2, Globe, MapPin } from 'lucide-react';
import Dropdown from '@/components/UI/Dropdown';

interface ContactTradeInfoProps {
  onNext: () => void;
  onPrev: () => void;
  onUpdateData: (data: any) => void;
  data: any;
}

interface Contact {
  id: string;
  name: string;
  designation: string;
  email1: string;
  email2?: string;
  phone1: string;
  phone2?: string;
  department: string;
}

export default function ContactTradeInfo({ onNext, onPrev, onUpdateData, data }: ContactTradeInfoProps) {
  const [formData, setFormData] = useState(() => ({
    mainContact: {
      name: data?.mainContact?.name || '',
      designation: data?.mainContact?.designation || '',
      email1: data?.mainContact?.email || data?.mainContact?.email1 || '',
      email2: data?.mainContact?.email2 || '',
      phone1: data?.mainContact?.phone || data?.mainContact?.phone1 || '',
      phone2: data?.mainContact?.phone2 || '',
      department: data?.mainContact?.department || 'Sales'
    },
    alternateContacts: (data?.alternateContacts || []).map((c: any) => ({
      id: c.id || Date.now().toString(),
      name: c.name || '',
      designation: c.designation || '',
      email1: c.email || c.email1 || '',
      email2: c.email2 || '',
      phone1: c.phone || c.phone1 || '',
      phone2: c.phone2 || '',
      department: c.department || 'Sales'
    })),
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
  }));

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const addAlternateContact = () => {
    if (formData.alternateContacts.length < 3) {
      const newContact: Contact = {
        id: Date.now().toString(),
        name: '',
        designation: '',
        email1: '',
        email2: '',
        phone1: '',
        phone2: '',
        department: 'Sales'
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
    setFormData(prev => ({
      ...prev,
      mainContact: {
        ...prev.mainContact,
        [field]: value
      }
    }));
    // Clear error when user starts typing
    const errorKey = `mainContact.${field}`;
    if (errors[errorKey]) {
      setErrors(prev => ({ ...prev, [errorKey]: '' }));
    }
  };

  const handleBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const updateAlternateContact = (id: string, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      alternateContacts: prev.alternateContacts.map((contact: Contact) =>
        contact.id === id ? { ...contact, [field]: value } : contact
      )
    }));
  };

  const updateBankingDetails = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      bankingDetails: {
        ...prev.bankingDetails,
        [field]: value
      }
    }));
  };

  const handleInputChange = (field: string, value: string | string[] | any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleNext = () => {
    // Validate main contact required fields
    const newErrors: Record<string, string> = {};
    
    if (!formData.mainContact.name || formData.mainContact.name.trim() === '') {
      newErrors['mainContact.name'] = 'Name is required';
    }

    if (!formData.mainContact.designation || formData.mainContact.designation.trim() === '') {
      newErrors['mainContact.designation'] = 'Designation is required';
    }

    if (!formData.mainContact.email1 || formData.mainContact.email1.trim() === '') {
      newErrors['mainContact.email1'] = 'Email is required';
    } else {
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.mainContact.email1)) {
        newErrors['mainContact.email1'] = 'Please enter a valid email address';
      }
    }

    if (!formData.mainContact.phone1 || formData.mainContact.phone1.trim() === '') {
      newErrors['mainContact.phone1'] = 'Phone is required';
    } else {
      const cleanPhone = formData.mainContact.phone1.replace(/[\s\-\(\)]/g, '');
      if (!/^(\+?[0-9]{10,15})$/.test(cleanPhone)) {
        newErrors['mainContact.phone1'] = 'Please enter a valid phone number (10-15 digits, optional + prefix)';
      }
    }

    if (!formData.mainContact.department || formData.mainContact.department.trim() === '') {
      newErrors['mainContact.department'] = 'Department is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      // Mark all fields as touched to show errors
      const allTouched: Record<string, boolean> = {};
      Object.keys(newErrors).forEach(key => {
        allTouched[key] = true;
      });
      setTouched(allTouched);
      
      // Scroll to first error
      const firstErrorField = Object.keys(newErrors)[0].split('.')[1];
      const element = document.querySelector(`[name="mainContact.${firstErrorField}"]`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    onUpdateData(formData);
    onNext();
  };

  const countries = [
    'United States', 'United Kingdom', 'Germany', 'France', 'Italy', 'Spain', 'Netherlands',
    'Belgium', 'Sweden', 'Norway', 'Denmark', 'Finland', 'Switzerland', 'Austria',
    'Canada', 'Australia', 'New Zealand', 'Japan', 'South Korea', 'Singapore',
    'Hong Kong', 'UAE', 'Saudi Arabia', 'India', 'China', 'Brazil', 'Mexico'
  ];

  return (
    <div className="space-y-4 p-4 max-w-420 font-sans">
      {/* Header */}
          <div className="flex p-2 items-center gap-4 mb-4">
            <Phone className="w-12 h-12 text-gray-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Contact & Trade Information</h1>
              <p className="text-gray-600 mt-2">Provide your contact details and trade information</p>
            </div>
          </div>

      {/* Main Contact */}
      <section className="bg-white border border-gray-200 rounded-lg">
        <div className="px-4 py-3">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <User className="w-5 h-5 mr-2" />
            Main Contact Person
          </h2>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full Name <span className="text-red-500 text-lg">*</span>
              </label>
              <input
                type="text"
                name="mainContact.name"
                value={formData.mainContact.name}
                onChange={(e) => updateMainContact('name', e.target.value)}
                onBlur={() => handleBlur('mainContact.name')}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors['mainContact.name'] && touched['mainContact.name']
                    ? 'border-red-500 bg-red-50'
                    : 'border-gray-300'
                }`}
                placeholder="John Smith"
                required
              />
              {errors['mainContact.name'] && touched['mainContact.name'] && (
                <p className="text-red-500 text-sm mt-1">{errors['mainContact.name']}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Designation <span className="text-red-500 text-lg">*</span>
              </label>
              <input
                type="text"
                name="mainContact.designation"
                value={formData.mainContact.designation}
                onChange={(e) => updateMainContact('designation', e.target.value)}
                onBlur={() => handleBlur('mainContact.designation')}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors['mainContact.designation'] && touched['mainContact.designation']
                    ? 'border-red-500 bg-red-50'
                    : 'border-gray-300'
                }`}
                placeholder="Sales Manager"
                required
              />
              {errors['mainContact.designation'] && touched['mainContact.designation'] && (
                <p className="text-red-500 text-sm mt-1">{errors['mainContact.designation']}</p>
              )}
            </div>
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
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors['mainContact.email1'] && touched['mainContact.email1']
                    ? 'border-red-500 bg-red-50'
                    : 'border-gray-300'
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
                value={formData.mainContact.email2}
                onChange={(e) => updateMainContact('email2', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="john.secondary@company.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number 1 <span className="text-red-500 text-lg">*</span>
              </label>
              <input
                type="tel"
                name="mainContact.phone1"
                value={formData.mainContact.phone1}
                onChange={(e) => updateMainContact('phone1', e.target.value)}
                onBlur={() => handleBlur('mainContact.phone1')}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors['mainContact.phone1'] && touched['mainContact.phone1']
                    ? 'border-red-500 bg-red-50'
                    : 'border-gray-300'
                }`}
                placeholder="+1 (555) 123-4567"
                required
              />
              {errors['mainContact.phone1'] && touched['mainContact.phone1'] && (
                <p className="text-red-500 text-sm mt-1">{errors['mainContact.phone1']}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number 2 (Optional)
              </label>
              <input
                type="tel"
                value={formData.mainContact.phone2}
                onChange={(e) => updateMainContact('phone2', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="+1 (555) 765-4321"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Department <span className="text-red-500 text-lg">*</span>
              </label>
              <Dropdown
                id="main-contact-department"
                value={formData.mainContact.department}
                options={['Sales', 'Export', 'Business Development', 'Operations', 'Management']}
                onChange={(v) => updateMainContact('department', String(v))}
                placeholder="Select department"
              />
              {errors['mainContact.department'] && touched['mainContact.department'] && (
                <p className="text-red-500 text-sm mt-1">{errors['mainContact.department']}</p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Alternate Contacts */}
      <section className="bg-white border border-gray-200 rounded-lg">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <Mail className="w-5 h-5 mr-2" />
              Alternate Contacts (Optional)
            </h2>
            {formData.alternateContacts.length < 3 && (
              <Button onClick={addAlternateContact} variant="outline" size="sm"className='bg-green-500 text-white p-4' >
                <Plus className="w-4 h-4 mr-2 " />
                Add Contact
              </Button>
            )}
          </div>
        </div>
        <div className="p-4">
          {formData.alternateContacts.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No alternate contacts added</p>
          ) : (
            <div className="space-y-6">
              {formData.alternateContacts.map((contact: Contact, index: number) => (
                <div key={contact.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-medium text-gray-900">Contact {index + 1}</h4>
                    <Button
                      onClick={() => removeAlternateContact(contact.id)}
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Full Name
                      </label>
                      <input
                        type="text"
                        value={contact.name}
                        onChange={(e) => updateAlternateContact(contact.id, 'name', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Jane Doe"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Designation
                      </label>
                      <input
                        type="text"
                        value={contact.designation}
                        onChange={(e) => updateAlternateContact(contact.id, 'designation', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Export Manager"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email Address 1
                      </label>
                      <input
                        type="email"
                        value={contact.email1}
                        onChange={(e) => updateAlternateContact(contact.id, 'email1', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="jane@company.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email Address 2 (Optional)
                      </label>
                      <input
                        type="email"
                        value={contact.email2}
                        onChange={(e) => updateAlternateContact(contact.id, 'email2', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="jane.secondary@company.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Phone Number 1
                      </label>
                      <input
                        type="tel"
                        value={contact.phone1}
                        onChange={(e) => updateAlternateContact(contact.id, 'phone1', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="+1 (555) 987-6543"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Phone Number 2 (Optional)
                      </label>
                      <input
                        type="tel"
                        value={contact.phone2}
                        onChange={(e) => updateAlternateContact(contact.id, 'phone2', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="+1 (555) 321-0987"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Phone Number 2 (Optional)
                      </label>
                      <input
                        type="tel"
                        value={contact.phone2}
                        onChange={(e) => updateAlternateContact(contact.id, 'phone2', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="+1 (555) 321-0987"
                      />
                      <div className="mt-3">
                        <Dropdown
                          id={`alt-contact-dept-${contact.id}`}
                          value={contact.department}
                          options={['Sales', 'Export', 'Business Development', 'Operations', 'Management']}
                          onChange={(v) => updateAlternateContact(contact.id, 'department', String(v))}
                          placeholder="Select department"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Import/Export Information */}
      <section className="bg-white border border-gray-200 rounded-lg">
        <div className="px-4 py-3">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <Globe className="w-5 h-5 mr-2" />
            Import/Export Information
          </h2>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Do you engage in import/export activities?
            </label>
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="yes"
                  checked={formData.hasImportExport === 'yes'}
                  onChange={(e) => handleInputChange('hasImportExport', e.target.value)}
                  className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Yes</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="no"
                  checked={formData.hasImportExport === 'no'}
                  onChange={(e) => handleInputChange('hasImportExport', e.target.value)}
                  className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">No</span>
              </label>
            </div>
          </div>

          {formData.hasImportExport === 'yes' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Import Countries
                </label>
                <Dropdown
                  id="import-countries"
                  label="Import Countries"
                  options={countries}
                  value={formData.importCountries}
                  multiple
                  onChange={(v) => handleInputChange('importCountries', Array.isArray(v) ? v : [String(v)])}
                />
                <p className="text-xs text-gray-500 mt-1">Hold Ctrl/Cmd to select multiple countries</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Export Countries
                </label>
                <Dropdown
                  id="export-countries"
                  options={countries}
                  value={formData.exportCountries}
                  multiple
                  onChange={(v) => handleInputChange('exportCountries', Array.isArray(v) ? v : [String(v)])}
                />
                <p className="text-xs text-gray-500 mt-1">Hold Ctrl/Cmd to select multiple countries</p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Business Registration */}
      {/* <section className="bg-white border border-gray-200 rounded-lg">
        <div className="px-4 py-3">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <MapPin className="w-5 h-5 mr-2" />
            Business Registration & Banking
          </h2>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Trade License Number
              </label>
              <input
                type="text"
                value={formData.tradeLicenseNumber}
                onChange={(e) => handleInputChange('tradeLicenseNumber', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="TL123456789"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Business Registration Number
              </label>
              <input
                type="text"
                value={formData.businessRegistrationNumber}
                onChange={(e) => handleInputChange('businessRegistrationNumber', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="BR987654321"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tax Identification Number
              </label>
              <input
                type="text"
                value={formData.taxIdentificationNumber}
                onChange={(e) => handleInputChange('taxIdentificationNumber', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="TIN123456789"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bank Name
              </label>
              <input
                type="text"
                value={formData.bankingDetails.bankName}
                onChange={(e) => updateBankingDetails('bankName', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Bank of America"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Account Number
              </label>
              <input
                type="text"
                value={formData.bankingDetails.accountNumber}
                onChange={(e) => updateBankingDetails('accountNumber', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="1234567890"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                SWIFT Code
              </label>
              <input
                type="text"
                value={formData.bankingDetails.swiftCode}
                onChange={(e) => updateBankingDetails('swiftCode', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="BOFAUS3N"
              />
            </div>
          </div>
        </div>
      </section> */}

      {/* Navigation */}
      <div className="flex justify-between text-white ">
        <Button
          onClick={onPrev}
          className="px-8 font-bold bg-green-400 hover:bg-gray-300"
        >
          Previous
        </Button>
        <Button
          onClick={handleNext}
          className="bg-blue-600 hover:bg-blue-700 px-8 font-bold"
        >
          Continue
        </Button>
      </div>
    </div>
  );
}