'use client';

import { Mail, Phone, Send, Store, X, Building2, FileText, Globe } from 'lucide-react';
import { useState } from 'react';
import { showSuccessToast, showErrorToast } from '@/lib/toast-utils';
import { enquiryService } from '@/services/enquiryService';

/**
 * Reusable "Join Us as a Vendor" application modal. Self-contained state +
 * submit — mirrors the vendor form on the Contact page so both entry points
 * (Contact page + home BrandPromo banner) share one implementation.
 */
export default function VendorApplicationModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [vendorFormData, setVendorFormData] = useState({
    name: '',
    companyName: '',
    gstNumber: '',
    email: '',
    phone: '',
    website: '',
  });
  const [isSubmittingVendor, setIsSubmittingVendor] = useState(false);
  const [gstError, setGstError] = useState('');

  const handleVendorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    // Convert GST number to uppercase
    const updatedValue = name === 'gstNumber' ? value.toUpperCase() : value;

    setVendorFormData((prev) => ({
      ...prev,
      [name]: updatedValue,
    }));

    // Validate GST number on change
    if (name === 'gstNumber') {
      if (value && !/^[A-Z0-9]{15}$/i.test(value)) {
        setGstError('GST Number must be exactly 15 alphanumeric characters');
      } else {
        setGstError('');
      }
    }
  };

  const handleVendorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate GST number before submission
    if (!vendorFormData.gstNumber) {
      setGstError('GST Number is required');
      return;
    }

    if (!/^[A-Z0-9]{15}$/i.test(vendorFormData.gstNumber)) {
      setGstError('GST Number must be exactly 15 alphanumeric characters');
      return;
    }

    setIsSubmittingVendor(true);
    try {
      await enquiryService.submitEnquiry({
        name: vendorFormData.name,
        companyName: vendorFormData.companyName,
        gstNumber: vendorFormData.gstNumber,
        email: vendorFormData.email,
        phone: vendorFormData.phone,
        website: vendorFormData.website || undefined,
      });
      setVendorFormData({ name: '', companyName: '', gstNumber: '', email: '', phone: '', website: '' });
      setGstError('');
      onClose();
      showSuccessToast('Application Submitted!', 'Thank you for your interest! We will review your application and get back to you soon.');
    } catch (error: any) {
      showErrorToast('Submission Failed', error.message || 'Unable to submit application. Please try again.');
    } finally {
      setIsSubmittingVendor(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-3 sm:p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-5xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 lg:p-6 border-b border-gray-200 bg-gray-50 shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-linear-to-br from-[#e01a1b] to-[#8d1618] rounded-full flex items-center justify-center shrink-0">
              <Store className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 truncate">Vendor Application</h2>
              <p className="text-xs sm:text-sm text-gray-600 hidden sm:block">Fill in your details to join our marketplace</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-gray-400 hover:text-gray-600 transition-colors shrink-0 p-1"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 lg:p-6 overflow-y-auto flex-1">
          <form onSubmit={handleVendorSubmit} className="space-y-4 sm:space-y-5">
            {/* Row 1: Full Name | Company Name */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
              <div>
                <label htmlFor="vendor-name" className="block text-sm font-semibold text-gray-700 mb-2">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="vendor-name"
                  name="name"
                  required
                  value={vendorFormData.name}
                  onChange={handleVendorChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#e01a1b]/40 focus:border-[#e01a1b] transition-all"
                  placeholder="Enter your full name"
                />
              </div>

              <div>
                <label htmlFor="company-name" className="block text-sm font-semibold text-gray-700 mb-2">
                  Company Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    id="company-name"
                    name="companyName"
                    required
                    value={vendorFormData.companyName}
                    onChange={handleVendorChange}
                    className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#e01a1b]/40 focus:border-[#e01a1b] transition-all"
                    placeholder="Your company name"
                  />
                </div>
              </div>
            </div>

            {/* Row 2: GST Number | Email Address */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label htmlFor="gst-number" className="block text-sm font-semibold text-gray-700 mb-2">
                  GST Number <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    id="gst-number"
                    name="gstNumber"
                    required
                    maxLength={15}
                    value={vendorFormData.gstNumber}
                    onChange={handleVendorChange}
                    className={`w-full pl-11 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#e01a1b]/40 focus:border-[#e01a1b] transition-all ${
                      gstError ? 'border-red-500 bg-red-50' : 'border-gray-300'
                    }`}
                    placeholder="e.g., 29ABCDE1234F1Z5"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">15 alphanumeric characters (e.g., 22AAAAA0000A1Z5)</p>
                {gstError && <p className="text-red-500 text-sm mt-1">{gstError}</p>}
              </div>

              <div>
                <label htmlFor="vendor-email" className="block text-sm font-semibold text-gray-700 mb-2">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    id="vendor-email"
                    name="email"
                    required
                    value={vendorFormData.email}
                    onChange={handleVendorChange}
                    className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#e01a1b]/40 focus:border-[#e01a1b] transition-all"
                    placeholder="your.email@company.com"
                  />
                </div>
              </div>
            </div>

            {/* Row 3: Phone Number | Website URL */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label htmlFor="vendor-phone" className="block text-sm font-semibold text-gray-700 mb-2">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="tel"
                    id="vendor-phone"
                    name="phone"
                    required
                    value={vendorFormData.phone}
                    onChange={handleVendorChange}
                    className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#e01a1b]/40 focus:border-[#e01a1b] transition-all"
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="vendor-website" className="block text-sm font-semibold text-gray-700 mb-2">
                  Website URL <span className="text-gray-500 text-xs">(Optional)</span>
                </label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="url"
                    id="vendor-website"
                    name="website"
                    value={vendorFormData.website}
                    onChange={handleVendorChange}
                    className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#e01a1b]/40 focus:border-[#e01a1b] transition-all"
                    placeholder="https://www.yourcompany.com"
                  />
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> After submitting your application, our team will review your details and contact you within 2-3 business days.
              </p>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmittingVendor}
                className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 border border-gray-300 text-gray-700 rounded-full hover:bg-gray-50 transition-colors font-semibold disabled:opacity-50 text-sm sm:text-base"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmittingVendor}
                className="btn-shine flex-1 px-4 sm:px-6 py-2.5 sm:py-3 bg-[#e01a1b] text-white rounded-full hover:bg-[#c41617] shadow-[0_6px_20px_rgba(224,26,27,0.3)] hover:shadow-[0_12px_30px_rgba(224,26,27,0.45)] transition-all duration-300 font-semibold flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed text-sm sm:text-base"
              >
                {isSubmittingVendor ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Submit Application
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
