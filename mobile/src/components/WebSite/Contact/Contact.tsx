import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  Mail,
  Phone,
  MapPin,
  Clock,
  Send,
  Store,
  X,
  Building2,
  FileText,
  Globe,
} from 'lucide-react-native';
import { showSuccessToast, showErrorToast } from '@/lib/toast-utils';
import { enquiryService } from '@/services/enquiryService';

interface ContactFormData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

interface VendorFormData {
  name: string;
  companyName: string;
  gstNumber: string;
  email: string;
  phone: string;
  website: string;
}

export default function Contact() {
  const [formData, setFormData] = useState<ContactFormData>({
    name: '',
    email: '',
    subject: '',
    message: '',
  });

  const [showVendorModal, setShowVendorModal] = useState(false);
  const [vendorFormData, setVendorFormData] = useState<VendorFormData>({
    name: '',
    companyName: '',
    gstNumber: '',
    email: '',
    phone: '',
    website: '',
  });
  const [isSubmittingVendor, setIsSubmittingVendor] = useState(false);

  const handleSubmit = () => {
    if (!formData.name || !formData.email || !formData.subject || !formData.message) {
      showErrorToast('Required Fields', 'Please fill in all required fields');
      return;
    }

    try {
      console.log('Form submitted:', formData);
      setFormData({ name: '', email: '', subject: '', message: '' });
      showSuccessToast('Message Sent!', 'Thank you for your message! We will get back to you soon.');
    } catch (error) {
      showErrorToast('Send Failed', 'Unable to send message. Please try again.');
    }
  };

  const handleVendorSubmit = async () => {
    if (
      !vendorFormData.name ||
      !vendorFormData.companyName ||
      !vendorFormData.gstNumber ||
      !vendorFormData.email ||
      !vendorFormData.phone
    ) {
      showErrorToast('Required Fields', 'Please fill in all required fields');
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
      setVendorFormData({
        name: '',
        companyName: '',
        gstNumber: '',
        email: '',
        phone: '',
        website: '',
      });
      setShowVendorModal(false);
      showSuccessToast(
        'Application Submitted!',
        'Thank you for your interest! We will review your application and get back to you soon.'
      );
    } catch (error: any) {
      showErrorToast(
        'Submission Failed',
        error.message || 'Unable to submit application. Please try again.'
      );
    } finally {
      setIsSubmittingVendor(false);
    }
  };

  return (
    <ScrollView className="flex-1 bg-white">
      <View className='h-2 bg-white border ' />
      {/* Hero Section */}
      <View className="bg-gray-900 px-6 py-12">
        <Text className="text-4xl font-bold text-gray-200 mb-4 text-center">Get in Touch</Text>
        <Text className="text-base text-gray-200 text-center leading-6">
          Have questions about our products or want to learn more about our artisans? We'd love to
          hear from you.
        </Text>
      </View>

      {/* Contact Information */}
      <View className="px-6 py-8">
        <Text className="text-3xl font-bold text-gray-900 mb-6">Contact Information</Text>

        <View className="space-y-6 gap-4">
          <View className="flex-row items-start">
            <View className="w-12 h-12 bg-gray-700 rounded-full items-center justify-center mr-4">
              <Mail size={24} color="#ffffff" />
            </View>
            <View className="flex-1">
              <Text className="text-lg font-bold text-gray-900 mb-1">Email Us</Text>
              <Text className="text-gray-600">info@heritagetextiles.com</Text>
              <Text className="text-gray-600">support@heritagetextiles.com</Text>
            </View>
          </View>

          <View className="flex-row items-start">
            <View className="w-12 h-12 bg-gray-700 rounded-full items-center justify-center mr-4">
              <Phone size={24} color="#ffffff" />
            </View>
            <View className="flex-1">
              <Text className="text-lg font-bold text-gray-900 mb-1">Call Us</Text>
              <Text className="text-gray-600">+1 (555) 123-4567</Text>
              <Text className="text-gray-600">+1 (555) 987-6543</Text>
            </View>
          </View>

          <View className="flex-row items-start">
            <View className="w-12 h-12 bg-gray-700 rounded-full items-center justify-center mr-4">
              <MapPin size={24} color="#ffffff" />
            </View>
            <View className="flex-1">
              <Text className="text-lg font-bold text-gray-900 mb-1">Visit Us</Text>
              <Text className="text-gray-600">123 Heritage Lane</Text>
              <Text className="text-gray-600">Artisan District, AD 12345</Text>
              <Text className="text-gray-600">United States</Text>
            </View>
          </View>

          <View className="flex-row items-start">
            <View className="w-12 h-12 bg-gray-700 rounded-full items-center justify-center mr-4">
              <Clock size={24} color="#ffffff" />
            </View>
            <View className="flex-1">
              <Text className="text-lg font-bold text-gray-900 mb-1">Business Hours</Text>
              <Text className="text-gray-600">Monday - Friday: 9:00 AM - 6:00 PM</Text>
              <Text className="text-gray-600">Saturday: 10:00 AM - 4:00 PM</Text>
              <Text className="text-gray-600">Sunday: Closed</Text>
            </View>
          </View>
        </View>

        {/* Additional Info */}
        <View className="mt-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
          <Text className="text-lg font-bold text-gray-900 mb-2">For Artisan Partnerships</Text>
          <Text className="text-gray-600 mb-2 leading-6">
            Are you a skilled artisan interested in joining our marketplace? We'd love to learn
            about your craft and explore partnership opportunities.
          </Text>
          <Text className="text-gray-600">
            Email us at:{' '}
            <Text className="font-bold">partnerships@heritagetextiles.com</Text>
          </Text>
        </View>
      </View>

      {/* Contact Form */}
      <View className="px-6 py-8 bg-gray-50">
        <Text className="text-3xl font-bold text-gray-900 mb-6">Send us a Message</Text>

        <View className="bg-white p-6 rounded-2xl border border-gray-200">
          <View className="mb-4">
            <Text className="text-sm font-bold text-gray-700 mb-2">
              Full Name <Text className="text-red-500">*</Text>
            </Text>
            <TextInput
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
              placeholder="Your full name"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white"
            />
          </View>

          <View className="mb-4">
            <Text className="text-sm font-bold text-gray-700 mb-2">
              Email Address <Text className="text-red-500">*</Text>
            </Text>
            <TextInput
              value={formData.email}
              onChangeText={(text) => setFormData({ ...formData, email: text })}
              placeholder="your.email@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white"
            />
          </View>

          <View className="mb-4">
            <Text className="text-sm font-bold text-gray-700 mb-2">
              Subject <Text className="text-red-500">*</Text>
            </Text>
            <TextInput
              value={formData.subject}
              onChangeText={(text) => setFormData({ ...formData, subject: text })}
              placeholder="What is this regarding?"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white"
            />
          </View>

          <View className="mb-6">
            <Text className="text-sm font-bold text-gray-700 mb-2">
              Message <Text className="text-red-500">*</Text>
            </Text>
            <TextInput
              value={formData.message}
              onChangeText={(text) => setFormData({ ...formData, message: text })}
              placeholder="Tell us more about your inquiry..."
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white"
              style={{ minHeight: 120 }}
            />
          </View>

          <TouchableOpacity
            onPress={handleSubmit}
            className="bg-gray-700 py-4 rounded-xl flex-row items-center justify-center"
          >
            <Send size={20} color="#ffffff" />
            <Text className="text-white font-bold text-base ml-2">Send Message</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Vendor Invitation Section */}
      <View className="bg-gray-900 px-6 py-12">
        <View className="items-center">
          <View className="w-16 h-16 bg-white rounded-full items-center justify-center mb-6">
            <Store size={32} color="#111827" />
          </View>
          <Text className="text-3xl font-bold text-white mb-4 text-center">
            Become a Vendor Partner
          </Text>
          <Text className="text-base text-gray-300 text-center leading-6 mb-8">
            Join our marketplace and showcase your products to thousands of customers. We're looking
            for quality vendors who share our commitment to excellence.
          </Text>

          <View className="w-full mb-8 gap-4">
            <View className="bg-white/10 p-6 rounded-xl items-center">
              <Text className="text-3xl font-bold text-white mb-2">10K+</Text>
              <Text className="text-gray-300">Active Customers</Text>
            </View>
            <View className="bg-white/10 p-6 rounded-xl items-center">
              <Text className="text-3xl font-bold text-white mb-2">500+</Text>
              <Text className="text-gray-300">Vendor Partners</Text>
            </View>
            <View className="bg-white/10 p-6 rounded-xl items-center">
              <Text className="text-3xl font-bold text-white mb-2">24/7</Text>
              <Text className="text-gray-300">Support Available</Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={() => setShowVendorModal(true)}
            className="bg-white px-8 py-4 rounded-xl flex-row items-center"
          >
            <Store size={20} color="#111827" />
            <Text className="text-gray-900 font-bold text-lg ml-2">Join Us as a Vendor</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Vendor Application Modal */}
      <Modal
        visible={showVendorModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowVendorModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1 bg-black/50 justify-center p-4"
        >
          <View className="bg-white rounded-2xl max-h-[90%] overflow-hidden">
            {/* Modal Header */}
            <View className="flex-row items-center justify-between p-6 border-b border-gray-200 bg-gray-50">
              <View className="flex-row items-center flex-1">
                <View className="w-10 h-10 bg-gray-900 rounded-full items-center justify-center mr-3">
                  <Store size={20} color="#ffffff" />
                </View>
                <View className="flex-1">
                  <Text className="text-xl font-bold text-gray-900">Vendor Application</Text>
                  <Text className="text-xs text-gray-600">Fill in your details to join</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setShowVendorModal(false)} className="p-2">
                <X size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            {/* Modal Body */}
            <ScrollView className="p-6">
              <View className="space-y-4 gap-4">
                <View>
                  <Text className="text-sm font-bold text-gray-700 mb-2">
                    Full Name <Text className="text-red-500">*</Text>
                  </Text>
                  <TextInput
                    value={vendorFormData.name}
                    onChangeText={(text) => setVendorFormData({ ...vendorFormData, name: text })}
                    placeholder="Enter your full name"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white"
                  />
                </View>

                <View>
                  <Text className="text-sm font-bold text-gray-700 mb-2">
                    Company Name <Text className="text-red-500">*</Text>
                  </Text>
                  <View className="relative">
                    <TextInput
                      value={vendorFormData.companyName}
                      onChangeText={(text) =>
                        setVendorFormData({ ...vendorFormData, companyName: text })
                      }
                      placeholder="Your company name"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white"
                    />
                  </View>
                </View>

                <View>
                  <Text className="text-sm font-bold text-gray-700 mb-2">
                    GST Number <Text className="text-red-500">*</Text>
                  </Text>
                  <TextInput
                    value={vendorFormData.gstNumber}
                    onChangeText={(text) =>
                      setVendorFormData({ ...vendorFormData, gstNumber: text })
                    }
                    placeholder="e.g., 29ABCDE1234F1Z5"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white"
                  />
                </View>

                <View>
                  <Text className="text-sm font-bold text-gray-700 mb-2">
                    Email Address <Text className="text-red-500">*</Text>
                  </Text>
                  <TextInput
                    value={vendorFormData.email}
                    onChangeText={(text) => setVendorFormData({ ...vendorFormData, email: text })}
                    placeholder="your.email@company.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white"
                  />
                </View>

                <View>
                  <Text className="text-sm font-bold text-gray-700 mb-2">
                    Phone Number <Text className="text-red-500">*</Text>
                  </Text>
                  <TextInput
                    value={vendorFormData.phone}
                    onChangeText={(text) => setVendorFormData({ ...vendorFormData, phone: text })}
                    placeholder="+1 (555) 123-4567"
                    keyboardType="phone-pad"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white"
                  />
                </View>

                <View>
                  <Text className="text-sm font-bold text-gray-700 mb-2">
                    Website URL <Text className="text-gray-500 text-xs">(Optional)</Text>
                  </Text>
                  <TextInput
                    value={vendorFormData.website}
                    onChangeText={(text) =>
                      setVendorFormData({ ...vendorFormData, website: text })
                    }
                    placeholder="https://www.yourcompany.com"
                    keyboardType="url"
                    autoCapitalize="none"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white"
                  />
                </View>

                <View className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <Text className="text-sm text-blue-800 leading-5">
                    <Text className="font-bold">Note:</Text> After submitting your application, our
                    team will review your details and contact you within 2-3 business days.
                  </Text>
                </View>

                <View className="flex-row gap-3 pt-4 mb-10">
                  <TouchableOpacity
                    onPress={() => setShowVendorModal(false)}
                    disabled={isSubmittingVendor}
                    className="flex-1 px-6 py-3 border border-gray-300 rounded-xl items-center"
                    style={{ opacity: isSubmittingVendor ? 0.5 : 1 }}
                  >
                    <Text className="text-gray-700 font-bold">Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleVendorSubmit}
                    disabled={isSubmittingVendor}
                    className="flex-1 px-6 py-3 bg-gray-900 rounded-xl flex-row items-center justify-center"
                    style={{ opacity: isSubmittingVendor ? 0.7 : 1 }}
                  >
                    {isSubmittingVendor ? (
                      <>
                        <ActivityIndicator size="small" color="#ffffff" />
                        <Text className="text-white font-bold ml-2">Submitting...</Text>
                      </>
                    ) : (
                      <>
                        <Send size={20} color="#ffffff" />
                        <Text className="text-white font-bold ml-2">Submit</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScrollView>
  );
}
