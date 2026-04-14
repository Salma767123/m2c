import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Mail, Phone, MapPin, Clock, Send, Store, X } from 'lucide-react-native';
import { showSuccessToast, showErrorToast } from '@/lib/toast-utils';
import { enquiryService } from '@/services/enquiryService';
import { contactEnquiryService } from '@/services/contactEnquiryService';

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

const inputBaseStyle = { fontSize: 16 };
const inputClass =
  'w-full px-4 py-3 border border-gray-300 rounded-xl bg-white text-gray-900';
const placeholderColor = '#9ca3af';

const pressablePrimary = ({ pressed }: { pressed: boolean }) => ({
  opacity: pressed ? 0.8 : 1,
});
const pressableSecondary = ({ pressed }: { pressed: boolean }) => ({
  opacity: pressed ? 0.7 : 1,
});

export default function Contact() {
  const [formData, setFormData] = useState<ContactFormData>({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [showVendorModal, setShowVendorModal] = useState(false);
  const [vendorFormData, setVendorFormData] = useState<VendorFormData>({
    name: '',
    companyName: '',
    gstNumber: '',
    email: '',
    phone: '',
    website: '',
  });
  const [gstError, setGstError] = useState('');
  const [isSubmittingVendor, setIsSubmittingVendor] = useState(false);

  const handleSubmit = async () => {
    if (!formData.name || !formData.email || !formData.subject || !formData.message) {
      showErrorToast('Required Fields', 'Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      await contactEnquiryService.submitEnquiry({
        name: formData.name,
        email: formData.email,
        subject: formData.subject,
        message: formData.message,
      });
      setFormData({ name: '', email: '', subject: '', message: '' });
      showSuccessToast('Message Sent!', 'Thank you for your message! We will get back to you soon.');
    } catch (error: any) {
      showErrorToast(
        'Send Failed',
        error?.response?.data?.message || error?.message || 'Unable to send message. Please try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGstChange = (text: string) => {
    const upper = text.toUpperCase();
    setVendorFormData({ ...vendorFormData, gstNumber: upper });
    if (upper && !/^[A-Z0-9]{15}$/i.test(upper)) {
      setGstError('GST Number must be exactly 15 alphanumeric characters');
    } else {
      setGstError('');
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
      setVendorFormData({
        name: '',
        companyName: '',
        gstNumber: '',
        email: '',
        phone: '',
        website: '',
      });
      setGstError('');
      setShowVendorModal(false);
      showSuccessToast(
        'Application Submitted!',
        'Thank you for your interest! We will review your application and get back to you soon.',
      );
    } catch (error: any) {
      showErrorToast(
        'Submission Failed',
        error?.message || 'Unable to submit application. Please try again.',
      );
    } finally {
      setIsSubmittingVendor(false);
    }
  };

  return (
    <View className="bg-white">
      {/* Hero Section */}
      <View className="bg-gray-900 px-6 py-10">
        <Text className="text-3xl font-bold text-white mb-3 text-center">Get in Touch</Text>
        <Text className="text-sm text-gray-300 text-center leading-6">
          Have questions about our products or want to learn more about our artisans? We'd love to
          hear from you.
        </Text>
      </View>

      {/* Contact Information */}
      <View className="px-6 py-8">
        <Text className="text-2xl font-bold text-gray-900 mb-5">Contact Information</Text>

        <View className="gap-4">
          <View className="flex-row items-start">
            <View className="w-11 h-11 bg-gray-700 rounded-full items-center justify-center mr-3">
              <Mail size={20} color="#ffffff" />
            </View>
            <View className="flex-1">
              <Text className="text-base font-bold text-gray-900 mb-1">Email Us</Text>
              <Text className="text-sm text-gray-600">info@heritagetextiles.com</Text>
              <Text className="text-sm text-gray-600">support@heritagetextiles.com</Text>
            </View>
          </View>

          <View className="flex-row items-start">
            <View className="w-11 h-11 bg-gray-700 rounded-full items-center justify-center mr-3">
              <Phone size={20} color="#ffffff" />
            </View>
            <View className="flex-1">
              <Text className="text-base font-bold text-gray-900 mb-1">Call Us</Text>
              <Text className="text-sm text-gray-600">+1 (555) 123-4567</Text>
              <Text className="text-sm text-gray-600">+1 (555) 987-6543</Text>
            </View>
          </View>

          <View className="flex-row items-start">
            <View className="w-11 h-11 bg-gray-700 rounded-full items-center justify-center mr-3">
              <MapPin size={20} color="#ffffff" />
            </View>
            <View className="flex-1">
              <Text className="text-base font-bold text-gray-900 mb-1">Visit Us</Text>
              <Text className="text-sm text-gray-600">123 Heritage Lane</Text>
              <Text className="text-sm text-gray-600">Artisan District, AD 12345</Text>
              <Text className="text-sm text-gray-600">United States</Text>
            </View>
          </View>

          <View className="flex-row items-start">
            <View className="w-11 h-11 bg-gray-700 rounded-full items-center justify-center mr-3">
              <Clock size={20} color="#ffffff" />
            </View>
            <View className="flex-1">
              <Text className="text-base font-bold text-gray-900 mb-1">Business Hours</Text>
              <Text className="text-sm text-gray-600">Monday - Friday: 9:00 AM - 6:00 PM</Text>
              <Text className="text-sm text-gray-600">Saturday: 10:00 AM - 4:00 PM</Text>
              <Text className="text-sm text-gray-600">Sunday: Closed</Text>
            </View>
          </View>
        </View>

        {/* Additional Info */}
        <View className="mt-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
          <Text className="text-base font-bold text-gray-900 mb-2">For Artisan Partnerships</Text>
          <Text className="text-sm text-gray-600 mb-2 leading-6">
            Are you a skilled artisan interested in joining our marketplace? We'd love to learn
            about your craft and explore partnership opportunities.
          </Text>
          <Text className="text-sm text-gray-600">
            Email us at: <Text className="font-bold">partnerships@heritagetextiles.com</Text>
          </Text>
        </View>
      </View>

      {/* Contact Form */}
      <View className="px-6 py-8 bg-gray-50">
        <Text className="text-2xl font-bold text-gray-900 mb-5">Send us a Message</Text>

        <View className="bg-white p-5 rounded-2xl border border-gray-200">
          <View className="mb-4">
            <Text className="text-sm font-semibold text-gray-700 mb-2">
              Full Name <Text className="text-red-500">*</Text>
            </Text>
            <TextInput
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
              placeholder="Your full name"
              placeholderTextColor={placeholderColor}
              accessibilityLabel="Full name"
              style={inputBaseStyle}
              className={inputClass}
            />
          </View>

          <View className="mb-4">
            <Text className="text-sm font-semibold text-gray-700 mb-2">
              Email Address <Text className="text-red-500">*</Text>
            </Text>
            <TextInput
              value={formData.email}
              onChangeText={(text) => setFormData({ ...formData, email: text })}
              placeholder="your.email@example.com"
              placeholderTextColor={placeholderColor}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              accessibilityLabel="Email address"
              style={inputBaseStyle}
              className={inputClass}
            />
          </View>

          <View className="mb-4">
            <Text className="text-sm font-semibold text-gray-700 mb-2">
              Subject <Text className="text-red-500">*</Text>
            </Text>
            <TextInput
              value={formData.subject}
              onChangeText={(text) => setFormData({ ...formData, subject: text })}
              placeholder="What is this regarding?"
              placeholderTextColor={placeholderColor}
              accessibilityLabel="Subject"
              style={inputBaseStyle}
              className={inputClass}
            />
          </View>

          <View className="mb-5">
            <Text className="text-sm font-semibold text-gray-700 mb-2">
              Message <Text className="text-red-500">*</Text>
            </Text>
            <TextInput
              value={formData.message}
              onChangeText={(text) => setFormData({ ...formData, message: text })}
              placeholder="Tell us more about your inquiry..."
              placeholderTextColor={placeholderColor}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              accessibilityLabel="Message"
              style={[inputBaseStyle, { minHeight: 120 }]}
              className={inputClass}
            />
          </View>

          <Pressable
            onPress={handleSubmit}
            disabled={isSubmitting}
            accessibilityLabel="Send message"
            accessibilityRole="button"
            style={({ pressed }) => ({ opacity: isSubmitting ? 0.7 : pressed ? 0.85 : 1 })}
            className="bg-gray-900 py-4 rounded-xl flex-row items-center justify-center"
          >
            {isSubmitting ? (
              <>
                <ActivityIndicator size="small" color="#ffffff" />
                <Text className="text-white font-bold text-base ml-2">Sending...</Text>
              </>
            ) : (
              <>
                <Send size={20} color="#ffffff" />
                <Text className="text-white font-bold text-base ml-2">Send Message</Text>
              </>
            )}
          </Pressable>
        </View>
      </View>

      {/* Vendor Invitation Section */}
      <View className="bg-gray-900 px-6 py-10">
        <View className="items-center">
          <View className="w-16 h-16 bg-white rounded-full items-center justify-center mb-5">
            <Store size={30} color="#111827" />
          </View>
          <Text className="text-2xl font-bold text-white mb-3 text-center">
            Become a Vendor Partner
          </Text>
          <Text className="text-sm text-gray-300 text-center leading-6 mb-6">
            Join our marketplace and showcase your products to thousands of customers. We're looking
            for quality vendors who share our commitment to excellence.
          </Text>

          <View className="w-full mb-6 flex-row gap-3">
            <View className="flex-1 bg-white/10 p-4 rounded-xl items-center">
              <Text className="text-2xl font-bold text-white">10K+</Text>
              <Text className="text-xs text-gray-300 mt-1 text-center">Customers</Text>
            </View>
            <View className="flex-1 bg-white/10 p-4 rounded-xl items-center">
              <Text className="text-2xl font-bold text-white">500+</Text>
              <Text className="text-xs text-gray-300 mt-1 text-center">Vendors</Text>
            </View>
            <View className="flex-1 bg-white/10 p-4 rounded-xl items-center">
              <Text className="text-2xl font-bold text-white">24/7</Text>
              <Text className="text-xs text-gray-300 mt-1 text-center">Support</Text>
            </View>
          </View>

          <Pressable
            onPress={() => setShowVendorModal(true)}
            accessibilityLabel="Open vendor application form"
            accessibilityRole="button"
            style={pressablePrimary}
            className="bg-white px-8 py-4 rounded-xl flex-row items-center"
          >
            <Store size={20} color="#111827" />
            <Text className="text-gray-900 font-bold text-base ml-2">Join Us as a Vendor</Text>
          </Pressable>
        </View>
      </View>

      {/* Vendor Application Modal */}
      <Modal
        visible={showVendorModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowVendorModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1 bg-black/50 justify-center p-4"
        >
          <View className="bg-white rounded-2xl max-h-[90%] overflow-hidden">
            {/* Modal Header */}
            <View className="flex-row items-center justify-between p-5 border-b border-gray-200 bg-gray-50">
              <View className="flex-row items-center flex-1">
                <View className="w-10 h-10 bg-gray-900 rounded-full items-center justify-center mr-3">
                  <Store size={20} color="#ffffff" />
                </View>
                <View className="flex-1">
                  <Text className="text-lg font-bold text-gray-900">Vendor Application</Text>
                  <Text className="text-xs text-gray-600">Fill in your details to join</Text>
                </View>
              </View>
              <Pressable
                onPress={() => setShowVendorModal(false)}
                accessibilityLabel="Close application form"
                accessibilityRole="button"
                hitSlop={8}
                style={pressableSecondary}
                className="p-2"
              >
                <X size={24} color="#6b7280" />
              </Pressable>
            </View>

            {/* Modal Body */}
            <ScrollView
              className="p-5"
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View className="gap-4">
                <View>
                  <Text className="text-sm font-semibold text-gray-700 mb-2">
                    Full Name <Text className="text-red-500">*</Text>
                  </Text>
                  <TextInput
                    value={vendorFormData.name}
                    onChangeText={(text) => setVendorFormData({ ...vendorFormData, name: text })}
                    placeholder="Enter your full name"
                    placeholderTextColor={placeholderColor}
                    accessibilityLabel="Full name"
                    style={inputBaseStyle}
                    className={inputClass}
                  />
                </View>

                <View>
                  <Text className="text-sm font-semibold text-gray-700 mb-2">
                    Company Name <Text className="text-red-500">*</Text>
                  </Text>
                  <TextInput
                    value={vendorFormData.companyName}
                    onChangeText={(text) =>
                      setVendorFormData({ ...vendorFormData, companyName: text })
                    }
                    placeholder="Your company name"
                    placeholderTextColor={placeholderColor}
                    accessibilityLabel="Company name"
                    style={inputBaseStyle}
                    className={inputClass}
                  />
                </View>

                <View>
                  <Text className="text-sm font-semibold text-gray-700 mb-2">
                    GST Number <Text className="text-red-500">*</Text>
                  </Text>
                  <TextInput
                    value={vendorFormData.gstNumber}
                    onChangeText={handleGstChange}
                    placeholder="e.g., 29ABCDE1234F1Z5"
                    placeholderTextColor={placeholderColor}
                    autoCapitalize="characters"
                    maxLength={15}
                    accessibilityLabel="GST number"
                    style={inputBaseStyle}
                    className={`${inputClass} ${gstError ? 'border-red-500' : ''}`}
                  />
                  {gstError ? (
                    <Text className="text-xs text-red-600 mt-1">{gstError}</Text>
                  ) : null}
                </View>

                <View>
                  <Text className="text-sm font-semibold text-gray-700 mb-2">
                    Email Address <Text className="text-red-500">*</Text>
                  </Text>
                  <TextInput
                    value={vendorFormData.email}
                    onChangeText={(text) => setVendorFormData({ ...vendorFormData, email: text })}
                    placeholder="your.email@company.com"
                    placeholderTextColor={placeholderColor}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    accessibilityLabel="Email address"
                    style={inputBaseStyle}
                    className={inputClass}
                  />
                </View>

                <View>
                  <Text className="text-sm font-semibold text-gray-700 mb-2">
                    Phone Number <Text className="text-red-500">*</Text>
                  </Text>
                  <TextInput
                    value={vendorFormData.phone}
                    onChangeText={(text) => setVendorFormData({ ...vendorFormData, phone: text })}
                    placeholder="+1 (555) 123-4567"
                    placeholderTextColor={placeholderColor}
                    keyboardType="phone-pad"
                    accessibilityLabel="Phone number"
                    style={inputBaseStyle}
                    className={inputClass}
                  />
                </View>

                <View>
                  <Text className="text-sm font-semibold text-gray-700 mb-2">
                    Website URL <Text className="text-gray-500 text-xs">(Optional)</Text>
                  </Text>
                  <TextInput
                    value={vendorFormData.website}
                    onChangeText={(text) =>
                      setVendorFormData({ ...vendorFormData, website: text })
                    }
                    placeholder="https://www.yourcompany.com"
                    placeholderTextColor={placeholderColor}
                    keyboardType="url"
                    autoCapitalize="none"
                    accessibilityLabel="Website URL"
                    style={inputBaseStyle}
                    className={inputClass}
                  />
                </View>

                <View className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <Text className="text-xs text-blue-800 leading-5">
                    <Text className="font-bold">Note:</Text> After submitting your application, our
                    team will review your details and contact you within 2-3 business days.
                  </Text>
                </View>

                <View className="flex-row gap-3 pt-2 mb-6">
                  <Pressable
                    onPress={() => setShowVendorModal(false)}
                    disabled={isSubmittingVendor}
                    accessibilityLabel="Cancel"
                    accessibilityRole="button"
                    style={({ pressed }) => ({
                      opacity: isSubmittingVendor ? 0.5 : pressed ? 0.7 : 1,
                    })}
                    className="flex-1 px-6 py-3 border border-gray-300 rounded-xl items-center"
                  >
                    <Text className="text-gray-700 font-bold">Cancel</Text>
                  </Pressable>
                  <Pressable
                    onPress={handleVendorSubmit}
                    disabled={isSubmittingVendor}
                    accessibilityLabel="Submit application"
                    accessibilityRole="button"
                    style={({ pressed }) => ({
                      opacity: isSubmittingVendor ? 0.7 : pressed ? 0.85 : 1,
                    })}
                    className="flex-1 px-6 py-3 bg-gray-900 rounded-xl flex-row items-center justify-center"
                  >
                    {isSubmittingVendor ? (
                      <>
                        <ActivityIndicator size="small" color="#ffffff" />
                        <Text className="text-white font-bold ml-2">Submitting...</Text>
                      </>
                    ) : (
                      <>
                        <Send size={18} color="#ffffff" />
                        <Text className="text-white font-bold ml-2">Submit</Text>
                      </>
                    )}
                  </Pressable>
                </View>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
