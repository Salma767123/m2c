'use client';

import { Mail, Phone, MapPin, Clock, Send, Store, X, Building2, FileText, Globe } from 'lucide-react';
import { useState } from 'react';
import { showSuccessToast, showErrorToast } from '@/lib/toast-utils';
import { enquiryService } from '@/services/enquiryService';
import { contactEnquiryService } from '@/services/contactEnquiryService';

const Contact = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });

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
    try {
      await contactEnquiryService.submitEnquiry({
        name: formData.name,
        email: formData.email,
        subject: formData.subject,
        message: formData.message
      });
      
      // Reset form
      setFormData({ name: '', email: '', subject: '', message: '' });
      showSuccessToast('Message Sent!', 'Thank you for your message! We will get back to you soon.');
    } catch (error: any) {
      console.error('Contact form error:', error);
      showErrorToast('Send Failed', error.message || 'Unable to send message. Please try again.');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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
      <section className="relative bg-gray-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
              Get in Touch
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Have questions about our products or want to learn more about our artisans?
              We'd love to hear from you.
            </p>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Contact Information */}
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-8">Contact Information</h2>

              <div className="space-y-6 font-medium">
                <div className="flex items-start">
                  <div className="w-12 h-12 bg-gray-700 rounded-full flex items-center justify-center mr-4 shrink-0">
                    <Mail className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">Email Us</h3>
                    <p className="text-gray-600">info@heritagetextiles.com</p>
                    <p className="text-gray-600">support@heritagetextiles.com</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="w-12 h-12 bg-gray-700 rounded-full flex items-center justify-center mr-4 shrink-0">
                    <Phone className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">Call Us</h3>
                    <p className="text-gray-600">+1 (555) 123-4567</p>
                    <p className="text-gray-600">+1 (555) 987-6543</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="w-12 h-12 bg-gray-700 rounded-full flex items-center justify-center mr-4 shrink-0">
                    <MapPin className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">Visit Us</h3>
                    <p className="text-gray-600">123 Heritage Lane</p>
                    <p className="text-gray-600">Artisan District, AD 12345</p>
                    <p className="text-gray-600">United States</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="w-12 h-12 bg-gray-700 rounded-full flex items-center justify-center mr-4 shrink-0">
                    <Clock className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">Business Hours</h3>
                    <p className="text-gray-600">Monday - Friday: 9:00 AM - 6:00 PM</p>
                    <p className="text-gray-600">Saturday: 10:00 AM - 4:00 PM</p>
                    <p className="text-gray-600">Sunday: Closed</p>
                  </div>
                </div>
              </div>

              {/* Additional Info */}
              <div className="mt-8 p-6 bg-gray-50 rounded-lg font-medium">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">For Artisan Partnerships</h3>
                <p className="text-gray-600 mb-2">
                  Are you a skilled artisan interested in joining our marketplace?
                  We'd love to learn about your craft and explore partnership opportunities.
                </p>
                <p className="text-gray-600">
                  Email us at: <span className="font-medium">partnerships@heritagetextiles.com</span>
                </p>
              </div>
            </div>

            {/* Contact Form */}
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-8">Send us a Message</h2>

              <form onSubmit={handleSubmit} className="bg-gray-50 p-6 border border-white rounded-xl space-y-6 font-medium">
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
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-50 transition-colors"
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
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-50 focus:border-gray-50 transition-colors"
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
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-50 focus:border-gray-50 transition-colors"
                    placeholder="What is this regarding?"
                  />
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
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-50 focus:border-gray-50 transition-colors resize-vertical"
                    placeholder="Tell us more about your inquiry..."
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-gray-700 text-white py-3 px-6 rounded-lg hover:bg-gray-700 transition-colors font-semibold flex items-center justify-center"
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
      <section className="py-16 bg-gradient-to-br from-gray-900 to-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-full mb-6">
              <Store className="w-8 h-8 text-gray-900" />
            </div>
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
              Become a Vendor Partner
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-8">
              Join our marketplace and showcase your products to thousands of customers.
              We're looking for quality vendors who share our commitment to excellence.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-10">
              <div className="bg-white/10 backdrop-blur-sm p-6 rounded-lg">
                <div className="text-3xl font-bold text-white mb-2">10K+</div>
                <div className="text-gray-300">Active Customers</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm p-6 rounded-lg">
                <div className="text-3xl font-bold text-white mb-2">500+</div>
                <div className="text-gray-300">Vendor Partners</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm p-6 rounded-lg">
                <div className="text-3xl font-bold text-white mb-2">24/7</div>
                <div className="text-gray-300">Support Available</div>
              </div>
            </div>

            <button
              onClick={() => setShowVendorModal(true)}
              className="bg-white text-gray-900 px-8 py-4 rounded-lg font-semibold text-lg hover:bg-gray-100 transition-all transform hover:scale-105 shadow-xl inline-flex items-center gap-2"
            >
              <Store className="w-5 h-5" />
              Join Us as a Vendor
            </button>
          </div>
        </div>
      </section>

      {/* Vendor Application Modal */}
      {showVendorModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-900 rounded-full flex items-center justify-center">
                  <Store className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Vendor Application</h2>
                  <p className="text-sm text-gray-600">Fill in your details to join our marketplace</p>
                </div>
              </div>
              <button
                onClick={() => setShowVendorModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
              <form onSubmit={handleVendorSubmit} className="space-y-5">
                {/* Row 1: Full Name | Company Name */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all"
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
                        className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all"
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
                        className={`w-full pl-11 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all ${
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
                        className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all"
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
                        className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all"
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
                        className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all"
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

                <div className="flex items-center gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowVendorModal(false)}
                    disabled={isSubmittingVendor}
                    className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-semibold disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingVendor}
                    className="flex-1 px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-semibold flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
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
