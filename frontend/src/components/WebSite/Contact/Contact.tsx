'use client';

import { Mail, Phone, MapPin, Clock, Send, Store, X, Building2, FileText, Globe } from 'lucide-react';
import { useState } from 'react';
import Reveal from '@/components/WebSite/Shared/Reveal';
import { showSuccessToast, showErrorToast } from '@/lib/toast-utils';
import { enquiryService } from '@/services/enquiryService';
import { contactEnquiryService } from '@/services/contactEnquiryService';
import { HEAR_ABOUT_US_OPTIONS } from '@/lib/enquirySources';
import Dropdown from '@/components/UI/Dropdown';

const Contact = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
    hearAboutUs: '',
    hearAboutUsOther: ''
  });

  // The custom Dropdown is a button, not a form control, so native `required`
  // can't validate it — this drives the inline error instead.
  const [hearAboutUsError, setHearAboutUsError] = useState(false);
  const [hearAboutUsOtherError, setHearAboutUsOtherError] = useState(false);

  const [showVendorModal, setShowVendorModal] = useState(false);
  const [vendorFormData, setVendorFormData] = useState({
    name: '',
    companyName: '',
    gstNumber: '',
    email: '',
    phone: '',
    website: ''
  });
  const [isSubmittingVendor, setIsSubmittingVendor] = useState(false);
  const [gstError, setGstError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.hearAboutUs) {
      setHearAboutUsError(true);
      document.getElementById('hearAboutUs')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    // "Other" is only useful if they say what it was.
    if (formData.hearAboutUs === 'other' && !formData.hearAboutUsOther.trim()) {
      setHearAboutUsOtherError(true);
      document.getElementById('hearAboutUsOther')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    try {
      await contactEnquiryService.submitEnquiry({
        name: formData.name,
        email: formData.email,
        subject: formData.subject,
        message: formData.message,
        hearAboutUs: formData.hearAboutUs || undefined,
        hearAboutUsOther: formData.hearAboutUs === 'other' ? formData.hearAboutUsOther.trim() : undefined
      });

      // Reset form
      setFormData({ name: '', email: '', subject: '', message: '', hearAboutUs: '', hearAboutUsOther: '' });
      setHearAboutUsError(false);
      setHearAboutUsOtherError(false);
      showSuccessToast('Message Sent!', 'Thank you for your message! We will get back to you soon.');
    } catch (error: any) {
      console.error('Contact form error:', error);
      showErrorToast('Send Failed', error.message || 'Unable to send message. Please try again.');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleVendorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    // Convert GST number to uppercase
    const updatedValue = name === 'gstNumber' ? value.toUpperCase() : value;
    
    setVendorFormData({
      ...vendorFormData,
      [name]: updatedValue
    });

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
        website: vendorFormData.website || undefined
      });
      setVendorFormData({ name: '', companyName: '', gstNumber: '', email: '', phone: '', website: '' });
      setGstError('');
      setShowVendorModal(false);
      showSuccessToast('Application Submitted!', 'Thank you for your interest! We will review your application and get back to you soon.');
    } catch (error: any) {
      showErrorToast('Submission Failed', error.message || 'Unable to submit application. Please try again.');
    } finally {
      setIsSubmittingVendor(false);
    }
  };

  return (
    <div className="bg-white font-sans" >
      {/* Hero Section */}
      <section className="relative bg-[#f7f7f5] py-10 sm:py-12 lg:py-16">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
          <Reveal className="text-center">
            <span className="inline-flex items-center gap-2 text-[11px] sm:text-xs font-semibold uppercase tracking-[0.18em] text-[#e01a1b] mb-3">
              <span className="h-px w-6 bg-[#e01a1b]" />
              Get in touch
            </span>
            <h1 className="font-playfair text-3xl sm:text-4xl lg:text-5xl font-semibold text-[#1a1a1a] tracking-tight mb-3 sm:mb-6">
              Get in Touch
            </h1>
            <p className="text-base sm:text-lg lg:text-xl text-gray-600 max-w-3xl mx-auto">
              Have questions about our products or want to learn more about our artisans?
              We'd love to hear from you.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="py-10 sm:py-12 lg:py-16">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
            {/* Contact Information */}
            <div>
              <Reveal>
                <span className="inline-flex items-center gap-2 text-[11px] sm:text-xs font-semibold uppercase tracking-[0.18em] text-[#e01a1b] mb-3">
                  <span className="h-px w-6 bg-[#e01a1b]" />
                  Reach Us
                </span>
                <h2 className="font-playfair text-2xl sm:text-3xl md:text-4xl font-semibold text-[#1a1a1a] tracking-tight mb-5 sm:mb-6 lg:mb-8">Contact Information</h2>
              </Reveal>

              <div className="space-y-4 sm:space-y-5 font-medium">
                <Reveal delay={0} className="group flex items-start bg-white rounded-2xl ring-1 ring-black/5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:shadow-[0_18px_40px_rgba(0,0,0,0.12)] hover:-translate-y-1.5 hover:ring-[#e01a1b]/20 transition-all duration-500 p-5">
                  <div className="w-12 h-12 bg-[#e01a1b] rounded-full flex items-center justify-center mr-4 shrink-0 shadow-[0_6px_20px_rgba(224,26,27,0.3)] group-hover:scale-110 transition-transform duration-300">
                    <Mail className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-[#1a1a1a] mb-1">Email Us</h3>
                    <p className="text-gray-600">info@heritagetextiles.com</p>
                    <p className="text-gray-600">support@heritagetextiles.com</p>
                  </div>
                </Reveal>

                <Reveal delay={90} className="group flex items-start bg-white rounded-2xl ring-1 ring-black/5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:shadow-[0_18px_40px_rgba(0,0,0,0.12)] hover:-translate-y-1.5 hover:ring-[#e01a1b]/20 transition-all duration-500 p-5">
                  <div className="w-12 h-12 bg-[#e01a1b] rounded-full flex items-center justify-center mr-4 shrink-0 shadow-[0_6px_20px_rgba(224,26,27,0.3)] group-hover:scale-110 transition-transform duration-300">
                    <Phone className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-[#1a1a1a] mb-1">Call Us</h3>
                    <p className="text-gray-600">+1 (555) 123-4567</p>
                    <p className="text-gray-600">+1 (555) 987-6543</p>
                  </div>
                </Reveal>

                <Reveal delay={180} className="group flex items-start bg-white rounded-2xl ring-1 ring-black/5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:shadow-[0_18px_40px_rgba(0,0,0,0.12)] hover:-translate-y-1.5 hover:ring-[#e01a1b]/20 transition-all duration-500 p-5">
                  <div className="w-12 h-12 bg-[#e01a1b] rounded-full flex items-center justify-center mr-4 shrink-0 shadow-[0_6px_20px_rgba(224,26,27,0.3)] group-hover:scale-110 transition-transform duration-300">
                    <MapPin className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-[#1a1a1a] mb-1">Visit Us</h3>
                    <p className="text-gray-600">123 Heritage Lane</p>
                    <p className="text-gray-600">Artisan District, AD 12345</p>
                    <p className="text-gray-600">United States</p>
                  </div>
                </Reveal>

                <Reveal delay={270} className="group flex items-start bg-white rounded-2xl ring-1 ring-black/5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:shadow-[0_18px_40px_rgba(0,0,0,0.12)] hover:-translate-y-1.5 hover:ring-[#e01a1b]/20 transition-all duration-500 p-5">
                  <div className="w-12 h-12 bg-[#e01a1b] rounded-full flex items-center justify-center mr-4 shrink-0 shadow-[0_6px_20px_rgba(224,26,27,0.3)] group-hover:scale-110 transition-transform duration-300">
                    <Clock className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-[#1a1a1a] mb-1">Business Hours</h3>
                    <p className="text-gray-600">Monday - Friday: 9:00 AM - 6:00 PM</p>
                    <p className="text-gray-600">Saturday: 10:00 AM - 4:00 PM</p>
                    <p className="text-gray-600">Sunday: Closed</p>
                  </div>
                </Reveal>
              </div>

              {/* Additional Info */}
              <div className="mt-8 p-6 bg-[#f7f7f5] rounded-2xl ring-1 ring-black/5 font-medium">
                <h3 className="text-lg font-semibold text-[#1a1a1a] mb-2">For Artisan Partnerships</h3>
                <p className="text-gray-600 mb-2">
                  Are you a skilled artisan interested in joining our marketplace?
                  We'd love to learn about your craft and explore partnership opportunities.
                </p>
                <p className="text-gray-600">
                  Email us at: <span className="font-medium text-[#e01a1b]">partnerships@heritagetextiles.com</span>
                </p>
              </div>
            </div>

            {/* Contact Form */}
            <div>
              <Reveal>
                <span className="inline-flex items-center gap-2 text-[11px] sm:text-xs font-semibold uppercase tracking-[0.18em] text-[#e01a1b] mb-3">
                  <span className="h-px w-6 bg-[#e01a1b]" />
                  Say Hello
                </span>
                <h2 className="font-playfair text-3xl md:text-4xl font-semibold text-[#1a1a1a] tracking-tight mb-8">Send us a Message</h2>
              </Reveal>

              <form onSubmit={handleSubmit} className="bg-[#f7f7f5] p-6 ring-1 ring-black/5 rounded-2xl space-y-6 font-medium">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#e01a1b]/40 focus:border-[#e01a1b] transition-colors"
                    placeholder="Your full name"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#e01a1b]/40 focus:border-[#e01a1b] transition-colors"
                    placeholder="your.email@example.com"
                  />
                </div>

                <div>
                  <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
                    Subject *
                  </label>
                  <input
                    type="text"
                    id="subject"
                    name="subject"
                    required
                    value={formData.subject}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#e01a1b]/40 focus:border-[#e01a1b] transition-colors"
                    placeholder="What is this regarding?"
                  />
                </div>

                <div>
                  <label htmlFor="hearAboutUs" className="block text-sm font-medium text-gray-700 mb-2">
                    How Did You Hear About Us? *
                  </label>
                  {/* Shared Dropdown (same control as checkout / admin) — a native
                      <select> renders the OS menu, which ignores the brand theme. */}
                  <Dropdown
                    id="hearAboutUs"
                    value={formData.hearAboutUs}
                    options={HEAR_ABOUT_US_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
                    placeholder="Please select an option"
                    onChange={(val) => {
                      const next = val as string;
                      setFormData((prev) => ({
                        ...prev,
                        hearAboutUs: next,
                        // Drop any stale text when switching away from "Other".
                        hearAboutUsOther: next === 'other' ? prev.hearAboutUsOther : '',
                      }));
                      setHearAboutUsError(false);
                      setHearAboutUsOtherError(false);
                    }}
                    error={hearAboutUsError}
                    // Match the sibling inputs exactly: no fill (the panel's
                    // #f7f7f5 shows through) and the same gray-200 border. The
                    // shared Dropdown defaults to bg-white / slate-300, so both
                    // need overriding. The popup list stays white on its own.
                    buttonClassName="py-3 rounded-xl !bg-transparent !border-gray-200"
                  />
                  {hearAboutUsError && (
                    <p className="mt-1.5 text-sm text-[#e01a1b]">Please select an option.</p>
                  )}

                  {/* "Other" needs the actual answer, otherwise the bucket is
                      meaningless in the source report. */}
                  {formData.hearAboutUs === 'other' && (
                    <div className="mt-3">
                      <label htmlFor="hearAboutUsOther" className="block text-sm font-medium text-gray-700 mb-2">
                        Please tell us how *
                      </label>
                      <input
                        type="text"
                        id="hearAboutUsOther"
                        name="hearAboutUsOther"
                        maxLength={200}
                        value={formData.hearAboutUsOther}
                        onChange={(e) => {
                          handleChange(e);
                          if (e.target.value.trim()) setHearAboutUsOtherError(false);
                        }}
                        className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#e01a1b]/40 focus:border-[#e01a1b] transition-colors ${
                          hearAboutUsOtherError ? 'border-[#e01a1b] bg-red-50/40' : 'border-gray-200'
                        }`}
                        placeholder="e.g. Saw your stall at a local market"
                      />
                      {hearAboutUsOtherError && (
                        <p className="mt-1.5 text-sm text-[#e01a1b]">Please tell us how you heard about us.</p>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                    Message *
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    required
                    rows={6}
                    value={formData.message}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#e01a1b]/40 focus:border-[#e01a1b] transition-colors resize-vertical"
                    placeholder="Tell us more about your inquiry..."
                  />
                </div>

                <button
                  type="submit"
                  className="btn-shine w-full bg-[#e01a1b] text-white py-3 px-6 rounded-full hover:bg-[#c41617] shadow-[0_6px_20px_rgba(224,26,27,0.3)] hover:shadow-[0_12px_30px_rgba(224,26,27,0.45)] hover:-translate-y-0.5 transition-all duration-300 font-semibold flex items-center justify-center"
                >
                  <Send className="w-5 h-5 mr-2" />
                  Send Message
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Vendor Invitation Section */}
      <section className="py-10 sm:py-12 lg:py-16 bg-gradient-to-br from-gray-900 to-gray-800">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
          <Reveal className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-[#e01a1b] rounded-full mb-4 sm:mb-6 shadow-[0_6px_20px_rgba(224,26,27,0.4)]">
              <Store className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
            </div>
            <span className="inline-flex items-center gap-2 text-[11px] sm:text-xs font-semibold uppercase tracking-[0.18em] text-[#f24344] mb-3">
              <span className="h-px w-6 bg-[#f24344]" />
              Partner With Us
            </span>
            <h2 className="font-playfair text-2xl sm:text-3xl lg:text-4xl font-semibold text-white tracking-tight mb-3 sm:mb-4">
              Become a Vendor Partner
            </h2>
            <p className="text-base sm:text-lg lg:text-xl text-gray-300 max-w-3xl mx-auto mb-6 sm:mb-8">
              Join our marketplace and showcase your products to thousands of customers.
              We're looking for quality vendors who share our commitment to excellence.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5 lg:gap-6 max-w-4xl mx-auto mb-8 sm:mb-10">
              <div className="bg-white/10 backdrop-blur-sm p-4 sm:p-5 lg:p-6 rounded-2xl ring-1 ring-white/10 hover:ring-[#f24344]/40 transition-all duration-500">
                <div className="text-2xl sm:text-3xl font-bold text-white mb-1 sm:mb-2">10K+</div>
                <div className="text-sm sm:text-base text-gray-300">Active Customers</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm p-4 sm:p-5 lg:p-6 rounded-2xl ring-1 ring-white/10 hover:ring-[#f24344]/40 transition-all duration-500">
                <div className="text-2xl sm:text-3xl font-bold text-white mb-1 sm:mb-2">500+</div>
                <div className="text-sm sm:text-base text-gray-300">Vendor Partners</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm p-4 sm:p-5 lg:p-6 rounded-2xl ring-1 ring-white/10 hover:ring-[#f24344]/40 transition-all duration-500">
                <div className="text-2xl sm:text-3xl font-bold text-white mb-1 sm:mb-2">24/7</div>
                <div className="text-sm sm:text-base text-gray-300">Support Available</div>
              </div>
            </div>

            <button
              onClick={() => setShowVendorModal(true)}
              className="btn-shine bg-[#e01a1b] text-white px-6 sm:px-8 py-3 sm:py-4 rounded-full font-semibold text-base sm:text-lg hover:bg-[#c41617] transition-all duration-300 transform hover:-translate-y-0.5 shadow-[0_6px_20px_rgba(224,26,27,0.35)] hover:shadow-[0_12px_30px_rgba(224,26,27,0.5)] inline-flex items-center gap-2"
            >
              <Store className="w-5 h-5" />
              Join Us as a Vendor
            </button>
          </Reveal>
        </div>
      </section>

      {/* Vendor Application Modal */}
      {showVendorModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-4">
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
                onClick={() => setShowVendorModal(false)}
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
                    {gstError && (
                      <p className="text-red-500 text-sm mt-1">{gstError}</p>
                    )}
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
                    onClick={() => setShowVendorModal(false)}
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
      )}
    </div>
  );
};

export default Contact;
