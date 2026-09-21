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
import { LinearGradient } from 'expo-linear-gradient';
import { Mail, Phone, MapPin, Clock, Send, Store, X } from 'lucide-react-native';
import { showSuccessToast, showErrorToast } from '@/lib/toast-utils';
import { enquiryService } from '@/services/enquiryService';
import { contactEnquiryService } from '@/services/contactEnquiryService';
import { HEAR_ABOUT_US_OPTIONS } from '@/lib/enquirySources';

interface ContactFormData {
  name: string;
  email: string;
  subject: string;
  message: string;
  /** Acquisition channel. Required, matching the web's contact form. */
  hearAboutUs: string;
  /** Only sent when hearAboutUs === 'other'. */
  hearAboutUsOther: string;
}

interface VendorFormData {
  name: string;
  companyName: string;
  gstNumber: string;
  email: string;
  phone: string;
  website: string;
}

const inputBaseStyle = { fontSize: 16, minHeight: 48, paddingVertical: 12 };
const inputClass =
  'w-full px-4 border border-warm-lineStrong rounded-xl bg-white text-warm-ink font-sans';
const placeholderColor = '#a89a8d';

export default function Contact() {
  const [formData, setFormData] = useState<ContactFormData>({
    name: '',
    email: '',
    subject: '',
    message: '',
    hearAboutUs: '',
    hearAboutUsOther: '',
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

    // Both checks mirror the web's contact form: the channel is required, and
    // picking "Other" without saying what it was records nothing useful.
    if (!formData.hearAboutUs) {
      showErrorToast('Required Fields', 'Please tell us how you heard about us');
      return;
    }
    if (formData.hearAboutUs === 'other' && !formData.hearAboutUsOther.trim()) {
      showErrorToast('Required Fields', 'Please tell us where you heard about us');
      return;
    }

    setIsSubmitting(true);
    try {
      await contactEnquiryService.submitEnquiry({
        name: formData.name,
        email: formData.email,
        subject: formData.subject,
        message: formData.message,
        hearAboutUs: formData.hearAboutUs || undefined,
        hearAboutUsOther:
          formData.hearAboutUs === 'other' ? formData.hearAboutUsOther.trim() : undefined,
      });
      setFormData({
        name: '',
        email: '',
        subject: '',
        message: '',
        hearAboutUs: '',
        hearAboutUsOther: '',
      });
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
      <View className="bg-warm-ground border-b border-warm-line px-6 py-10">
        <View className="flex-row items-center justify-center gap-2 mb-3">
          <View className="h-px w-6 bg-brand-500" />
          <Text className="font-sans-semibold text-[11px] uppercase tracking-[2px] text-brand-500">
            Customer care
          </Text>
        </View>

        <Text className="font-heading text-[30px] leading-9 text-warm-ink text-center mb-3">
          We&apos;re here to help
        </Text>

        <Text className="font-sans text-sm text-warm-body text-center leading-6">
          Questions about an order, a return, or when something will arrive — reach us whichever
          way suits you.
        </Text>

        {/* The two primary routes, quoted from the same strings the directory
            below prints. */}
        <View className="flex-row flex-wrap justify-center gap-2.5 mt-7">
          <View className="flex-row items-center gap-2 rounded-full border border-warm-lineStrong bg-white px-4 py-2.5">
            <Phone size={15} color="#e01a1b" />
            <Text className="font-sans-semibold text-sm text-warm-ink">+1 (555) 123-4567</Text>
          </View>
          <View className="flex-row items-center gap-2 rounded-full border border-warm-lineStrong bg-white px-4 py-2.5">
            <Mail size={15} color="#e01a1b" />
            <Text className="font-sans-semibold text-sm text-warm-ink">info@heritagetextiles.com</Text>
          </View>
        </View>
      </View>

      {/* Contact Information */}
      <View className="px-6 py-8">
        <Text className="text-2xl font-sans-bold text-warm-ink mb-5">Contact Information</Text>

        <View className="gap-4">
          <View className="flex-row items-start">
            <View className="w-11 h-11 bg-brand-50 rounded-2xl items-center justify-center mr-3 border border-warm-blushLine">
              <Mail size={20} color="#e01a1b" />
            </View>
            <View className="flex-1">
              <Text className="text-base font-sans-bold text-warm-ink mb-1">Email Us</Text>
              <Text className="font-sans text-sm text-warm-body">info@heritagetextiles.com</Text>
              <Text className="font-sans text-sm text-warm-body">support@heritagetextiles.com</Text>
            </View>
          </View>

          <View className="flex-row items-start">
            <View className="w-11 h-11 bg-brand-50 rounded-2xl items-center justify-center mr-3 border border-warm-blushLine">
              <Phone size={20} color="#e01a1b" />
            </View>
            <View className="flex-1">
              <Text className="text-base font-sans-bold text-warm-ink mb-1">Call Us</Text>
              <Text className="font-sans text-sm text-warm-body">+1 (555) 123-4567</Text>
              <Text className="font-sans text-sm text-warm-body">+1 (555) 987-6543</Text>
            </View>
          </View>

          <View className="flex-row items-start">
            <View className="w-11 h-11 bg-brand-50 rounded-2xl items-center justify-center mr-3 border border-warm-blushLine">
              <MapPin size={20} color="#e01a1b" />
            </View>
            <View className="flex-1">
              <Text className="text-base font-sans-bold text-warm-ink mb-1">Visit Us</Text>
              <Text className="font-sans text-sm text-warm-body">123 Heritage Lane</Text>
              <Text className="font-sans text-sm text-warm-body">Artisan District, AD 12345</Text>
              <Text className="font-sans text-sm text-warm-body">United States</Text>
            </View>
          </View>

          <View className="flex-row items-start">
            <View className="w-11 h-11 bg-brand-50 rounded-2xl items-center justify-center mr-3 border border-warm-blushLine">
              <Clock size={20} color="#e01a1b" />
            </View>
            <View className="flex-1">
              <Text className="text-base font-sans-bold text-warm-ink mb-1">Business Hours</Text>
              <Text className="font-sans text-sm text-warm-body">Monday - Friday: 9:00 AM - 6:00 PM</Text>
              <Text className="font-sans text-sm text-warm-body">Saturday: 10:00 AM - 4:00 PM</Text>
              <Text className="font-sans text-sm text-warm-body">Sunday: Closed</Text>
            </View>
          </View>
        </View>

        {/* Additional Info */}
        <View className="mt-6 p-4 bg-warm-ground rounded-xl border border-warm-line">
          <Text className="text-base font-sans-bold text-warm-ink mb-2">For Artisan Partnerships</Text>
          <Text className="font-sans text-sm text-warm-body mb-2 leading-6">
            Are you a skilled artisan interested in joining our marketplace? We&apos;d love to learn
            about your craft and explore partnership opportunities.
          </Text>
          <Text className="font-sans text-sm text-warm-body">
            Email us at: <Text className="font-sans-bold">partnerships@heritagetextiles.com</Text>
          </Text>
        </View>
      </View>

      {/* Contact Form */}
      <View className="px-6 py-8 bg-warm-ground">
        <Text className="text-2xl font-sans-bold text-warm-ink mb-5">Send us a Message</Text>

        <View className="bg-white p-5 rounded-2xl border border-warm-line">
          <View className="mb-4">
            <Text className="text-sm font-sans-semibold text-warm-body mb-2">
              Full Name <Text className="font-sans text-brand-500">*</Text>
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
            <Text className="text-sm font-sans-semibold text-warm-body mb-2">
              Email Address <Text className="font-sans text-brand-500">*</Text>
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
            <Text className="text-sm font-sans-semibold text-warm-body mb-2">
              Subject <Text className="font-sans text-brand-500">*</Text>
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
            <Text className="text-sm font-sans-semibold text-warm-body mb-2">
              Message <Text className="font-sans text-brand-500">*</Text>
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

          {/* How did you hear about us? — chip list rather than the web's
              <select>, which has no good native equivalent here. Same slugs, so
              the admin enquiry views and the source report group these exactly
              as they group web submissions. */}
          <View className="mb-5">
            <Text className="text-sm font-sans-semibold text-warm-body mb-2">
              How did you hear about us? <Text className="font-sans text-brand-500">*</Text>
            </Text>
            <View className="flex-row flex-wrap" style={{ gap: 8 }}>
              {HEAR_ABOUT_US_OPTIONS.map((opt) => {
                const active = formData.hearAboutUs === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    onPress={() =>
                      setFormData((prev) => ({
                        ...prev,
                        hearAboutUs: opt.value,
                        // Drop stale free text when moving away from "Other".
                        hearAboutUsOther:
                          opt.value === 'other' ? prev.hearAboutUsOther : '',
                      }))
                    }
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={opt.label}
                    className={`px-3.5 rounded-xl border ${
                      active
                        ? 'bg-brand-500 border-brand-500'
                        : 'bg-white border-warm-lineStrong'
                    }`}
                    style={({ pressed }) => [
                      { minHeight: 40, justifyContent: 'center' },
                      pressed && { opacity: 0.7 },
                    ]}
                  >
                    <Text
                      className={`text-xs font-sans-semibold ${
                        active ? 'text-white' : 'text-warm-body'
                      }`}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {formData.hearAboutUs === 'other' ? (
              <TextInput
                value={formData.hearAboutUsOther}
                onChangeText={(text) =>
                  setFormData({ ...formData, hearAboutUsOther: text })
                }
                placeholder="e.g. Saw your stall at a local market"
                placeholderTextColor={placeholderColor}
                accessibilityLabel="Where did you hear about us"
                style={[inputBaseStyle, { marginTop: 10 }]}
                className={inputClass}
              />
            ) : null}
          </View>

          <Pressable
            onPress={handleSubmit}
            disabled={isSubmitting}
            accessibilityLabel="Send message"
            accessibilityRole="button"
            accessibilityState={{ disabled: isSubmitting }}
            android_ripple={{ color: 'rgba(255,255,255,0.15)' }}
            style={{ opacity: isSubmitting ? 0.7 : 1 }}
            className="bg-brand-500 py-4 rounded-xl flex-row items-center justify-center"
          >
            {isSubmitting ? (
              <>
                <ActivityIndicator size="small" color="#ffffff" />
                <Text className="text-white font-sans-bold text-base ml-2">Sending...</Text>
              </>
            ) : (
              <>
                <Send size={20} color="#ffffff" />
                <Text className="text-white font-sans-bold text-base ml-2">Send Message</Text>
              </>
            )}
          </Pressable>
        </View>
      </View>

      {/* Vendor Invitation Section
          Was a near-black slab with white copy — the one dark band on an
          otherwise warm page. The web gives this section a blush gradient
          (VENDOR_GROUND: #fdf7f5 -> #f7e5e0 -> #fdf8f6, ruled top and bottom),
          so the invitation reads as part of the page rather than an ad break. */}
      <LinearGradient
        colors={['#fdf7f5', '#f7e5e0', '#fdf8f6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{ borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#eedad4' }}
      >
        <View className="px-6 py-10">
          <View className="items-center">
            <View className="w-16 h-16 bg-brand-500 rounded-2xl items-center justify-center mb-5">
              <Store size={30} color="#ffffff" />
            </View>
            <Text className="font-heading text-2xl text-warm-ink mb-3 text-center">
              Become a Vendor Partner
            </Text>
            <Text className="font-sans text-sm text-warm-body text-center leading-6 mb-6">
              Join our marketplace and showcase your products to thousands of customers. We&apos;re
              looking for quality vendors who share our commitment to excellence.
            </Text>

            <View className="w-full mb-6 flex-row gap-3">
              <View className="flex-1 bg-white/70 border border-warm-blushLine p-4 rounded-xl items-center">
                <Text className="font-sans-bold text-2xl text-warm-ink">10K+</Text>
                <Text className="font-sans text-xs text-warm-soft mt-1 text-center">Customers</Text>
              </View>
              <View className="flex-1 bg-white/70 border border-warm-blushLine p-4 rounded-xl items-center">
                <Text className="font-sans-bold text-2xl text-warm-ink">500+</Text>
                <Text className="font-sans text-xs text-warm-soft mt-1 text-center">Vendors</Text>
              </View>
              <View className="flex-1 bg-white/70 border border-warm-blushLine p-4 rounded-xl items-center">
                <Text className="font-sans-bold text-2xl text-warm-ink">24/7</Text>
                <Text className="font-sans text-xs text-warm-soft mt-1 text-center">Support</Text>
              </View>
            </View>

            <Pressable
              onPress={() => setShowVendorModal(true)}
              accessibilityLabel="Open vendor application form"
              accessibilityRole="button"
              android_ripple={{ color: 'rgba(255,255,255,0.18)' }}
              className="bg-brand-500 px-8 py-4 rounded-xl flex-row items-center overflow-hidden"
            >
              <Store size={20} color="#ffffff" />
              <Text className="text-white font-sans-bold text-base ml-2">Join Us as a Vendor</Text>
            </Pressable>
          </View>
        </View>
      </LinearGradient>

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
            <View className="flex-row items-center justify-between p-5 border-b border-warm-line bg-warm-ground">
              <View className="flex-row items-center flex-1">
                <View className="w-10 h-10 bg-brand-500 rounded-full items-center justify-center mr-3">
                  <Store size={20} color="#ffffff" />
                </View>
                <View className="flex-1">
                  <Text className="text-lg font-sans-bold text-warm-ink">Vendor Application</Text>
                  <Text className="font-sans text-xs text-warm-body">Fill in your details to join</Text>
                </View>
              </View>
              <Pressable
                onPress={() => setShowVendorModal(false)}
                accessibilityLabel="Close application form"
                accessibilityRole="button"
                hitSlop={4}
                android_ripple={{ color: 'rgba(0,0,0,0.06)', borderless: true, radius: 22 }}
              >
                <View style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
                  <X size={22} color="#6b7280" />
                </View>
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
                  <Text className="text-sm font-sans-semibold text-warm-body mb-2">
                    Full Name <Text className="font-sans text-brand-500">*</Text>
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
                  <Text className="text-sm font-sans-semibold text-warm-body mb-2">
                    Company Name <Text className="font-sans text-brand-500">*</Text>
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
                  <Text className="text-sm font-sans-semibold text-warm-body mb-2">
                    GST Number <Text className="font-sans text-brand-500">*</Text>
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
                    <Text className="font-sans text-xs text-red-600 mt-1">{gstError}</Text>
                  ) : null}
                </View>

                <View>
                  <Text className="text-sm font-sans-semibold text-warm-body mb-2">
                    Email Address <Text className="font-sans text-brand-500">*</Text>
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
                  <Text className="text-sm font-sans-semibold text-warm-body mb-2">
                    Phone Number <Text className="font-sans text-brand-500">*</Text>
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
                  <Text className="text-sm font-sans-semibold text-warm-body mb-2">
                    Website URL <Text className="font-sans text-warm-muted text-xs">(Optional)</Text>
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

                <View className="bg-warm-blush border border-warm-blushLine rounded-xl p-4">
                  <Text className="font-sans text-xs text-warm-body leading-5">
                    <Text className="font-sans-bold">Note:</Text> After submitting your application, our
                    team will review your details and contact you within 2-3 business days.
                  </Text>
                </View>

                <View className="flex-row gap-3 pt-2 mb-6">
                  <Pressable
                    onPress={() => setShowVendorModal(false)}
                    disabled={isSubmittingVendor}
                    accessibilityLabel="Cancel"
                    accessibilityRole="button"
                    android_ripple={{ color: 'rgba(0,0,0,0.06)' }}
                    style={{ opacity: isSubmittingVendor ? 0.5 : 1 }}
                    className="flex-1 px-6 py-3.5 border border-warm-lineStrong rounded-xl items-center justify-center"
                  >
                    <Text className="text-warm-body font-sans-bold">Cancel</Text>
                  </Pressable>
                  <Pressable
                    onPress={handleVendorSubmit}
                    disabled={isSubmittingVendor}
                    accessibilityLabel="Submit application"
                    accessibilityRole="button"
                    accessibilityState={{ disabled: isSubmittingVendor }}
                    android_ripple={{ color: 'rgba(255,255,255,0.15)' }}
                    style={{ opacity: isSubmittingVendor ? 0.7 : 1 }}
                    className="flex-1 px-6 py-3.5 bg-brand-500 rounded-xl flex-row items-center justify-center"
                  >
                    {isSubmittingVendor ? (
                      <>
                        <ActivityIndicator size="small" color="#ffffff" />
                        <Text className="text-white font-sans-bold ml-2">Submitting...</Text>
                      </>
                    ) : (
                      <>
                        <Send size={18} color="#ffffff" />
                        <Text className="text-white font-sans-bold ml-2">Submit</Text>
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
