import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, ScrollView, Pressable, Modal, type TextInputProps } from 'react-native';
import { ChevronDown, Check, Search, X } from 'lucide-react-native';
import { CheckoutFormData } from '../Checkout';
import {
  US_STATES,
  EMAIL_REGEX,
  ZIP_REGEX,
  NAME_REGEX,
  formatUSPhone,
  validateUSPhone,
  formatZipCode,
} from './constants';

interface ShippingFormProps {
  formData: CheckoutFormData;
  updateFormData: <K extends keyof CheckoutFormData>(field: K, value: CheckoutFormData[K]) => void;
  onValidityChange?: (isValid: boolean) => void;
  showAllErrors?: boolean;
  submitAttempt?: number;
}

type Errors = Partial<Record<keyof CheckoutFormData, string>>;
type Touched = Partial<Record<keyof CheckoutFormData, boolean>>;

const ALL_SHIPPING_FIELDS: (keyof CheckoutFormData)[] = [
  'firstName', 'lastName', 'email', 'phone', 'address', 'addressLine2', 'city', 'state', 'zipCode',
];

export default function ShippingForm({ formData, updateFormData, onValidityChange, showAllErrors, submitAttempt = 0 }: ShippingFormProps) {
  const [errors, setErrors] = useState<Errors>({});
  const [touched, setTouched] = useState<Touched>({});
  const [statePickerVisible, setStatePickerVisible] = useState(false);
  const [stateSearch, setStateSearch] = useState('');

  // When parent signals submit attempt (user tapped Continue), mark all fields touched to show errors
  useEffect(() => {
    if (submitAttempt > 0) {
      const allTouched: Touched = {};
      for (const f of ALL_SHIPPING_FIELDS) allTouched[f] = true;
      setTouched(allTouched);
    }
  }, [submitAttempt]);

  const preFilledFields: string[] = [];
  if (formData.firstName || formData.lastName) preFilledFields.push('name');
  if (formData.email) preFilledFields.push('email');
  if (formData.phone) preFilledFields.push('phone');
  if (formData.address) preFilledFields.push('address');
  if (formData.addressLine2) preFilledFields.push('address line 2');
  if (formData.city) preFilledFields.push('city');
  if (formData.state) preFilledFields.push('state');
  if (formData.zipCode) preFilledFields.push('ZIP');
  const isPreFilled = preFilledFields.length > 0;

  const validate = useCallback((data: CheckoutFormData): Errors => {
    const e: Errors = {};
    if (!data.firstName.trim()) e.firstName = 'First name is required';
    else if (data.firstName.trim().length < 2 || data.firstName.trim().length > 50) e.firstName = 'Must be 2-50 characters';
    else if (!NAME_REGEX.test(data.firstName)) e.firstName = 'Letters, spaces, hyphens only';

    if (!data.lastName.trim()) e.lastName = 'Last name is required';
    else if (data.lastName.trim().length < 2 || data.lastName.trim().length > 50) e.lastName = 'Must be 2-50 characters';
    else if (!NAME_REGEX.test(data.lastName)) e.lastName = 'Letters, spaces, hyphens only';

    if (!data.email.trim()) e.email = 'Email is required';
    else if (!EMAIL_REGEX.test(data.email.trim())) e.email = 'Enter a valid email';

    if (!data.phone.trim()) e.phone = 'Phone number is required';
    else if (!validateUSPhone(data.phone)) e.phone = 'Enter a valid US phone number';

    if (!data.address.trim()) e.address = 'Address is required';
    else if (data.address.trim().length < 3 || data.address.trim().length > 100) e.address = 'Must be 3-100 characters';

    if (data.addressLine2 && data.addressLine2.trim().length > 100) e.addressLine2 = 'Must be 100 characters or less';

    if (!data.city.trim()) e.city = 'City is required';
    else if (data.city.trim().length < 2 || data.city.trim().length > 50) e.city = 'Must be 2-50 characters';

    if (!data.state) e.state = 'Select a state';

    if (!data.zipCode.trim()) e.zipCode = 'ZIP Code is required';
    else if (!ZIP_REGEX.test(data.zipCode.trim())) e.zipCode = 'Enter a valid ZIP (12345 or 12345-6789)';

    return e;
  }, []);

  useEffect(() => {
    const currentErrors = validate(formData);
    setErrors(currentErrors);
    if (onValidityChange) {
      onValidityChange(Object.keys(currentErrors).length === 0);
    }
  }, [formData, validate, onValidityChange]);

  const handleBlur = (field: keyof CheckoutFormData) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const val = formData[field];
    if (typeof val === 'string') {
      if (field === 'email') updateFormData(field, val.trim().toLowerCase() as any);
      else if (field === 'state') updateFormData(field, val.trim().toUpperCase() as any);
      else updateFormData(field, val.trim() as any);
    }
  };

  const handleChange = (field: keyof CheckoutFormData, value: string) => {
    if (field === 'phone') updateFormData(field, formatUSPhone(value) as any);
    else if (field === 'zipCode') updateFormData(field, formatZipCode(value) as any);
    else updateFormData(field, value as any);
  };

  const selectedStateName = US_STATES.find((s) => s.code === formData.state)?.name || '';
  const filteredStates = stateSearch
    ? US_STATES.filter((s) => s.name.toLowerCase().includes(stateSearch.toLowerCase()) || s.code.toLowerCase().includes(stateSearch.toLowerCase()))
    : US_STATES;

  return (
    <View style={{ gap: 20 }}>
      {/* Pre-filled banner */}
      {isPreFilled ? (
        <View style={{ backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe', borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#3b82f6', marginTop: 5 }} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#1e40af' }}>Address auto-filled from your profile</Text>
            <Text style={{ fontSize: 11, color: '#3b82f6', marginTop: 2 }}>
              Filled: {preFilledFields.join(', ')}. Edit any field if needed.
            </Text>
          </View>
        </View>
      ) : null}

      {/* Country banner */}
      <View style={{ backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ fontSize: 13, fontWeight: '600', color: '#64748b' }}>Shipping to:</Text>
        <Text style={{ fontSize: 13, fontWeight: '700', color: '#0f172a' }}>United States</Text>
      </View>

      {/* First Name + Last Name */}
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <FieldLabel label="First Name" required />
          <FormInput
            value={formData.firstName}
            onChangeText={(t) => handleChange('firstName', t)}
            onBlur={() => handleBlur('firstName')}
            placeholder="John"
            placeholderTextColor="#9ca3af"
            autoCapitalize="words"
            autoComplete="given-name"
            accessibilityLabel="First name, required"
            hasError={touched.firstName && !!errors.firstName}
          />
          <ErrorText text={touched.firstName ? errors.firstName : undefined} />
        </View>
        <View style={{ flex: 1 }}>
          <FieldLabel label="Last Name" required />
          <FormInput
            value={formData.lastName}
            onChangeText={(t) => handleChange('lastName', t)}
            onBlur={() => handleBlur('lastName')}
            placeholder="Doe"
            placeholderTextColor="#9ca3af"
            autoCapitalize="words"
            autoComplete="family-name"
            accessibilityLabel="Last name, required"
            hasError={touched.lastName && !!errors.lastName}
          />
          <ErrorText text={touched.lastName ? errors.lastName : undefined} />
        </View>
      </View>

      {/* Email */}
      <View>
        <FieldLabel label="Email Address" required />
        <FormInput
          value={formData.email}
          onChangeText={(t) => handleChange('email', t)}
          onBlur={() => handleBlur('email')}
          placeholder="john.doe@example.com"
          placeholderTextColor="#9ca3af"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          accessibilityLabel="Email address, required"
          hasError={touched.email && !!errors.email}
        />
        <ErrorText text={touched.email ? errors.email : undefined} />
      </View>

      {/* Phone */}
      <View>
        <FieldLabel label="Phone Number" required />
        <FormInput
          value={formData.phone}
          onChangeText={(t) => handleChange('phone', t)}
          onBlur={() => handleBlur('phone')}
          placeholder="(555) 123-4567"
          placeholderTextColor="#9ca3af"
          keyboardType="phone-pad"
          autoComplete="tel"
          accessibilityLabel="Phone number, required"
          hasError={touched.phone && !!errors.phone}
        />
        <ErrorText text={touched.phone ? errors.phone : undefined} />
      </View>

      {/* Address Line 1 */}
      <View>
        <FieldLabel label="Address Line 1" required />
        <FormInput
          value={formData.address}
          onChangeText={(t) => handleChange('address', t)}
          onBlur={() => handleBlur('address')}
          placeholder="123 Main Street"
          placeholderTextColor="#9ca3af"
          autoComplete="street-address"
          accessibilityLabel="Street address, required"
          hasError={touched.address && !!errors.address}
        />
        <ErrorText text={touched.address ? errors.address : undefined} />
      </View>

      {/* Address Line 2 */}
      <View>
        <FieldLabel label="Address Line 2 (Optional)" />
        <FormInput
          value={formData.addressLine2}
          onChangeText={(t) => handleChange('addressLine2', t)}
          onBlur={() => handleBlur('addressLine2')}
          placeholder="Apt, Suite, Unit, etc."
          placeholderTextColor="#9ca3af"
          accessibilityLabel="Address line 2, optional"
          hasError={touched.addressLine2 && !!errors.addressLine2}
        />
        <ErrorText text={touched.addressLine2 ? errors.addressLine2 : undefined} />
      </View>

      {/* City + State + ZIP */}
      <View style={{ gap: 12 }}>
        {/* City */}
        <View>
          <FieldLabel label="City" required />
          <FormInput
            value={formData.city}
            onChangeText={(t) => handleChange('city', t)}
            onBlur={() => handleBlur('city')}
            placeholder="New York"
            placeholderTextColor="#9ca3af"
            autoComplete="postal-address-locality"
            accessibilityLabel="City, required"
            hasError={touched.city && !!errors.city}
          />
          <ErrorText text={touched.city ? errors.city : undefined} />
        </View>

        {/* State + ZIP row */}
        <View style={{ flexDirection: 'row', gap: 12 }}>
          {/* State Picker */}
          <View style={{ flex: 1 }}>
            <FieldLabel label="State" required />
            <Pressable
              onPress={() => { setStatePickerVisible(true); setStateSearch(''); }}
              accessibilityRole="button"
              accessibilityLabel="Select state"
            >
              <View style={[
                pickerStyle,
                touched.state && errors.state ? { borderColor: '#ef4444' } : {},
              ]}>
                <Text style={{ flex: 1, fontSize: 14, color: formData.state ? '#111827' : '#9ca3af', fontWeight: formData.state ? '600' : '400' }}>
                  {formData.state ? `${selectedStateName} (${formData.state})` : 'Select State'}
                </Text>
                <ChevronDown size={16} color="#6b7280" />
              </View>
            </Pressable>
            <ErrorText text={touched.state ? errors.state : undefined} />
          </View>

          {/* ZIP */}
          <View style={{ flex: 1 }}>
            <FieldLabel label="ZIP Code" required />
            <FormInput
              value={formData.zipCode}
              onChangeText={(t) => handleChange('zipCode', t)}
              onBlur={() => handleBlur('zipCode')}
              placeholder="10001"
              placeholderTextColor="#9ca3af"
              keyboardType="number-pad"
              maxLength={10}
              autoComplete="postal-code"
              accessibilityLabel="ZIP code, required"
              hasError={touched.zipCode && !!errors.zipCode}
            />
            <ErrorText text={touched.zipCode ? errors.zipCode : undefined} />
          </View>
        </View>
      </View>

      {/* State Picker Modal */}
      <Modal visible={statePickerVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={{ flex: 1, backgroundColor: '#fff' }}>
          {/* Modal Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' }}>
            <Text style={{ fontSize: 17, fontWeight: '700', color: '#111827' }}>Select State</Text>
            <Pressable onPress={() => setStatePickerVisible(false)} accessibilityRole="button" accessibilityLabel="Close state picker" hitSlop={4}>
              <View style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
                <X size={20} color="#6b7280" />
              </View>
            </Pressable>
          </View>

          {/* Search */}
          <View style={{ paddingHorizontal: 16, paddingVertical: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#f3f4f6', borderRadius: 12, paddingHorizontal: 12, height: 44, gap: 8 }}>
              <Search size={16} color="#9ca3af" />
              <TextInput
                value={stateSearch}
                onChangeText={setStateSearch}
                placeholder="Search states..."
                placeholderTextColor="#9ca3af"
                autoFocus
                style={{ flex: 1, fontSize: 14, color: '#111827' }}
              />
            </View>
          </View>

          {/* State List */}
          <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
            {filteredStates.map((state) => {
              const isSelected = formData.state === state.code;
              return (
                <Pressable
                  key={state.code}
                  onPress={() => {
                    updateFormData('state', state.code as any);
                    setTouched((prev) => ({ ...prev, state: true }));
                    setStatePickerVisible(false);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`${state.name} (${state.code})`}
                  accessibilityState={{ selected: isSelected }}
                >
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingHorizontal: 20,
                    paddingVertical: 14,
                    backgroundColor: isSelected ? '#f0f9ff' : '#fff',
                    borderBottomWidth: 1,
                    borderBottomColor: '#f3f4f6',
                  }}>
                    <View>
                      <Text style={{ fontSize: 15, fontWeight: isSelected ? '700' : '500', color: isSelected ? '#0369a1' : '#111827' }}>
                        {state.name}
                      </Text>
                      <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 1 }}>{state.code}</Text>
                    </View>
                    {isSelected ? <Check size={18} color="#0369a1" strokeWidth={2.5} /> : null}
                  </View>
                </Pressable>
              );
            })}
            {filteredStates.length === 0 ? (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <Text style={{ fontSize: 14, color: '#6b7280' }}>No states found</Text>
              </View>
            ) : null}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

// ─── Shared sub-components ──────────────────────────────────────────────────
function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  return (
    <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 }}>
      {label}{required ? <Text style={{ color: '#ef4444' }}> *</Text> : null}
    </Text>
  );
}

function ErrorText({ text }: { text?: string }) {
  if (!text) return null;
  return <Text style={{ fontSize: 11, color: '#ef4444', marginTop: 4, fontWeight: '600' }}>{text}</Text>;
}

function FormInput({ hasError, style, onFocus, onBlur, ...rest }: TextInputProps & { hasError?: boolean }) {
  const [focused, setFocused] = useState(false);
  return (
    <TextInput
      {...rest}
      onFocus={(e) => { setFocused(true); onFocus?.(e); }}
      onBlur={(e) => { setFocused(false); onBlur?.(e); }}
      style={[
        {
          width: '100%',
          paddingHorizontal: 14,
          paddingVertical: 14,
          minHeight: 48,
          borderWidth: 1.5,
          borderColor: hasError ? '#ef4444' : focused ? '#111827' : '#e2e8f0',
          borderRadius: 12,
          backgroundColor: focused ? '#fff' : '#f8fafc',
          fontSize: 14,
          color: '#111827',
          fontWeight: '500',
        },
        style,
      ]}
    />
  );
}

const pickerStyle = {
  width: '100%' as const,
  paddingHorizontal: 14,
  paddingVertical: 14,
  borderWidth: 1.5,
  borderColor: '#e2e8f0',
  borderRadius: 12,
  backgroundColor: '#f8fafc',
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  minHeight: 48,
};
