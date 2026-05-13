'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/UI/Button';
import Dropdown from '@/components/UI/Dropdown';
import { User, Calendar, Users, Mail, Phone, Plus, Trash2 } from 'lucide-react';

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

export default function OwnerProfile({ onNext, onPrev, onUpdateData, data }: OwnerProfileProps) {
  const [formData, setFormData] = useState({
    ownerName: data.ownerName || '',
    ownerEmail: data.ownerEmail || '',
    ownerPhone: data.ownerPhone || '',
    yearEstablished: data.yearEstablished || '',
    employeeCount: data.employeeCount || ''
  });

  const [additionalOwners, setAdditionalOwners] = useState<Array<{ name: string; email: string; phone: string }>>(
    data.additionalOwners || []
  );

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Sync formData with data prop when it changes (for edit mode)
  useEffect(() => {
    console.log('OwnerProfile: data prop changed', data)
    setFormData({
      ownerName: data.ownerName || '',
      ownerEmail: data.ownerEmail || '',
      ownerPhone: data.ownerPhone || '',
      yearEstablished: data.yearEstablished || '',
      employeeCount: data.employeeCount || ''
    })
    setAdditionalOwners(data.additionalOwners || [])
  }, [data]);

  const handleAddOwner = () => {
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

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const handleNext = () => {
    // Validate required fields
    const newErrors: Record<string, string> = {};
    
    if (!formData.ownerName) newErrors.ownerName = 'Owner Name is required';
    if (!formData.ownerEmail) {
      newErrors.ownerEmail = 'Owner Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.ownerEmail)) {
      newErrors.ownerEmail = 'Please enter a valid email address';
    }
    if (!formData.ownerPhone) {
      newErrors.ownerPhone = 'Owner Phone is required';
    } else {
      const cleanPhone = formData.ownerPhone.replace(/[\s\-\(\)]/g, '');
      if (!/^(\+?[0-9]{10,15})$/.test(cleanPhone)) {
        newErrors.ownerPhone = 'Please enter a valid phone number (10-15 digits, optional + prefix)';
      }
    }
    if (!formData.yearEstablished) newErrors.yearEstablished = 'Year Established is required';
    if (!formData.employeeCount) newErrors.employeeCount = 'Employee Count is required';

    // Validate additional owners (only filled ones)
    additionalOwners.forEach((owner, index) => {
      if (owner.name || owner.email || owner.phone) {
        if (!owner.name) newErrors[`additionalOwner_${index}_name`] = 'Name is required';
        if (!owner.email) {
          newErrors[`additionalOwner_${index}_email`] = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(owner.email)) {
          newErrors[`additionalOwner_${index}_email`] = 'Invalid email';
        }
        if (!owner.phone) {
          newErrors[`additionalOwner_${index}_phone`] = 'Phone is required';
        } else {
          const cleanPhone = owner.phone.replace(/[\s\-\(\)]/g, '');
          if (!/^(\+?[0-9]{10,15})$/.test(cleanPhone)) {
            newErrors[`additionalOwner_${index}_phone`] = 'Invalid phone';
          }
        }
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      const allTouched: Record<string, boolean> = {};
      Object.keys(newErrors).forEach(key => {
        allTouched[key] = true;
      });
      setTouched(allTouched);
      
      const firstErrorField = Object.keys(newErrors)[0];
      const element = document.querySelector(`[name="${firstErrorField}"]`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    // Filter out empty additional owners
    const filledOwners = additionalOwners.filter(o => o.name || o.email || o.phone);
    onUpdateData({ ...formData, additionalOwners: filledOwners.length > 0 ? filledOwners : undefined });
    onNext();
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 50 }, (_, i) => currentYear - i);

  return (
    <div className="max-w-420 p-4 space-y-4 font-sans">
      {/* Header */}
          <div className="flex p-2 items-center gap-4 mb-4">
            <User className="w-12 h-12 text-gray-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Owner & Business Profile</h1>
              <p className="text-gray-600 mt-1">Tell us about the business owner and company history</p>
            </div>
          </div>

      {/* Owner Details */}
      <section className="bg-white max-w-2xl border border-gray-200 rounded-lg shadow-sm">
        <div className="px-6 py-4 ">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <User className="w-5 h-5 mr-2" />
            Owner Information
          </h2>
        </div>
        <div className="p-6 space-y-6 ">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Owner Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="ownerName"
              value={formData.ownerName}
              onChange={(e) => handleInputChange('ownerName', e.target.value)}
              onBlur={() => handleBlur('ownerName')}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.ownerName && touched.ownerName
                  ? 'border-red-500 bg-red-50'
                  : 'border-gray-300'
              }`}
              placeholder="Enter owner's full name"
            />
            {errors.ownerName && touched.ownerName && (
              <p className="text-red-500 text-sm mt-1">{errors.ownerName}</p>
            )}
          </div>

          
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Owner Email <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  name="ownerEmail"
                  value={formData.ownerEmail}
                  onChange={(e) => handleInputChange('ownerEmail', e.target.value)}
                  onBlur={() => handleBlur('ownerEmail')}
                  className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.ownerEmail && touched.ownerEmail
                      ? 'border-red-500 bg-red-50'
                      : 'border-gray-300'
                  }`}
                  placeholder="owner@company.com"
                />
              </div>
              {errors.ownerEmail && touched.ownerEmail && (
                <p className="text-red-500 text-sm mt-1">{errors.ownerEmail}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Owner Phone <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input
                  type="tel"
                  name="ownerPhone"
                  value={formData.ownerPhone}
                  onChange={(e) => handleInputChange('ownerPhone', e.target.value)}
                  onBlur={() => handleBlur('ownerPhone')}
                  className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.ownerPhone && touched.ownerPhone
                      ? 'border-red-500 bg-red-50'
                      : 'border-gray-300'
                  }`}
                  placeholder="+1 (555) 000-0000"
                />
              </div>
              {errors.ownerPhone && touched.ownerPhone && (
                <p className="text-red-500 text-sm mt-1">{errors.ownerPhone}</p>
              )}
            </div>
        
        </div>
      </section>

      {/* Additional Owners */}
      <section className="bg-white max-w-2xl border border-gray-200 rounded-lg shadow-sm">
        <div className="px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <Users className="w-5 h-5 mr-2" />
            Additional Owners
          </h2>
          <button
            type="button"
            onClick={handleAddOwner}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Owner
          </button>
        </div>
        <div className="px-6 pb-6 space-y-4">
          {additionalOwners.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">No additional owners added. Click &quot;Add Owner&quot; to add more.</p>
          ) : (
            additionalOwners.map((owner, index) => (
              <div key={index} className="p-4 border border-gray-200 rounded-lg bg-gray-50 relative">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-gray-700">Owner {index + 2}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveOwner(index)}
                    className="flex items-center gap-1 text-sm text-red-500 hover:text-red-700 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Remove
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={owner.name}
                      onChange={(e) => handleOwnerFieldChange(index, 'name', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm ${
                        errors[`additionalOwner_${index}_name`] ? 'border-red-500 bg-red-50' : 'border-gray-300'
                      }`}
                      placeholder="Owner name"
                    />
                    {errors[`additionalOwner_${index}_name`] && (
                      <p className="text-red-500 text-xs mt-1">{errors[`additionalOwner_${index}_name`]}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={owner.email}
                      onChange={(e) => handleOwnerFieldChange(index, 'email', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm ${
                        errors[`additionalOwner_${index}_email`] ? 'border-red-500 bg-red-50' : 'border-gray-300'
                      }`}
                      placeholder="owner@email.com"
                    />
                    {errors[`additionalOwner_${index}_email`] && (
                      <p className="text-red-500 text-xs mt-1">{errors[`additionalOwner_${index}_email`]}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Phone <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      value={owner.phone}
                      onChange={(e) => handleOwnerFieldChange(index, 'phone', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm ${
                        errors[`additionalOwner_${index}_phone`] ? 'border-red-500 bg-red-50' : 'border-gray-300'
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

      {/* Business History */}
      <section className="bg-white border border-gray-200 rounded-lg shadow-sm">
        <div className="px-6 py-4 ">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <Calendar className="w-5 h-5 mr-2" />
            Business History
          </h2>
        </div>
        <div className="p-6 max-w-2xl">
          <div>
            <Dropdown
              id="year-established"
              label="Year Business Established"
              value={formData.yearEstablished}
              options={years}
              placeholder="Select year"
              onChange={(v) => handleInputChange('yearEstablished', v)}
            />
            {errors.yearEstablished && touched.yearEstablished && (
              <p className="text-red-500 text-sm mt-1">{errors.yearEstablished}</p>
            )}
          </div>
        </div>
      </section>

      {/* Employee Count */}
      <section className="bg-white border border-gray-200 rounded-lg shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
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
                <div
                  key={range.id}
                  onClick={() => handleInputChange('employeeCount', range.id)}
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-colors text-center ${
                    formData.employeeCount === range.id
                      ? 'border-blue-600 bg-blue-50'
                      : errors.employeeCount && touched.employeeCount
                      ? 'border-red-500 bg-red-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-medium text-gray-900 text-lg">{range.label}</div>
                  <div className="text-sm text-gray-600">{range.description}</div>
                </div>
              ))}
            </div>
            {errors.employeeCount && touched.employeeCount && (
              <p className="text-red-500 text-sm mt-2">{errors.employeeCount}</p>
            )}
          </div>
        </div>
      </section>

      {/* Business Experience */}
      <section className="bg-white border border-gray-200 rounded-lg shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Business Experience</h2>
        </div>
        <div className="p-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-blue-800 font-medium">Years in Business:</span>
              <span className="text-blue-900 font-semibold">
                {formData.yearEstablished ? currentYear - parseInt(formData.yearEstablished) : 0} years
              </span>
            </div>
          </div>
        </div>
      </section>

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