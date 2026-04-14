import React from 'react';
import { View, Text, TextInput } from 'react-native';
import { CheckoutFormData } from '../Checkout';

interface ShippingFormProps {
  formData: CheckoutFormData;
  updateFormData: (field: keyof CheckoutFormData, value: string | boolean) => void;
}

function FormField({
  label,
  value,
  onChange,
  placeholder,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  className = '',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  keyboardType?: any;
  autoCapitalize?: any;
  className?: string;
}) {
  return (
    <View className={className}>
      <Text className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        placeholderTextColor="#9ca3af"
        className="w-full px-4 py-3.5 border border-gray-200 rounded-2xl bg-gray-50 text-gray-900 text-sm font-semibold"
      />
    </View>
  );
}

export default function ShippingForm({ formData, updateFormData }: ShippingFormProps) {
  const isPreFilled = formData.firstName || formData.email || formData.address;

  return (
    <View className="gap-5">
      {isPreFilled && (
        <View className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex-row items-center gap-3">
          <View className="w-2 h-2 rounded-full bg-blue-500" />
          <View className="flex-1">
            <Text className="text-sm font-bold text-blue-800">
              Auto-filled from your profile
            </Text>
            <Text className="text-xs text-blue-600 mt-0.5">
              Review and edit any field if needed
            </Text>
          </View>
        </View>
      )}

      {/* Name row */}
      <View className="flex-row gap-3">
        <FormField
          className="flex-1"
          label="First Name"
          value={formData.firstName}
          onChange={(t) => updateFormData('firstName', t)}
          placeholder="John"
        />
        <FormField
          className="flex-1"
          label="Last Name"
          value={formData.lastName}
          onChange={(t) => updateFormData('lastName', t)}
          placeholder="Doe"
        />
      </View>

      <FormField
        label="Email Address"
        value={formData.email}
        onChange={(t) => updateFormData('email', t)}
        placeholder="john.doe@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <FormField
        label="Phone Number"
        value={formData.phone}
        onChange={(t) => updateFormData('phone', t)}
        placeholder="+91 98765 43210"
        keyboardType="phone-pad"
        autoCapitalize="none"
      />

      <FormField
        label="Street Address"
        value={formData.address}
        onChange={(t) => updateFormData('address', t)}
        placeholder="123 Main Street, Apt 4B"
      />

      {/* City + State row */}
      <View className="flex-row gap-3">
        <FormField
          className="flex-1"
          label="City"
          value={formData.city}
          onChange={(t) => updateFormData('city', t)}
          placeholder="Mumbai"
        />
        <FormField
          className="flex-1"
          label="State"
          value={formData.state}
          onChange={(t) => updateFormData('state', t)}
          placeholder="MH"
        />
      </View>

      <FormField
        label="PIN / ZIP Code"
        value={formData.zipCode}
        onChange={(t) => updateFormData('zipCode', t)}
        placeholder="400001"
        keyboardType="numeric"
        autoCapitalize="none"
      />
    </View>
  );
}
