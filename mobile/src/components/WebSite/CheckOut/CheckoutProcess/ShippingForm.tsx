import React from 'react';
import { View, Text, TextInput } from 'react-native';
import { CheckoutFormData } from '../Checkout';

interface ShippingFormProps {
  formData: CheckoutFormData;
  updateFormData: (field: keyof CheckoutFormData, value: string | boolean) => void;
}

export default function ShippingForm({ formData, updateFormData }: ShippingFormProps) {
  const isPreFilled = formData.firstName || formData.email || formData.address;

  return (
    <View className="space-y-4 gap-4">
      {isPreFilled && (
        <View className="bg-blue-50 border border-blue-200 rounded-xl p-3">
          <Text className="text-sm font-bold text-blue-800">Address auto-filled from your profile</Text>
          <Text className="text-xs text-blue-600 mt-1">You can edit any field if needed</Text>
        </View>
      )}

      <View className="flex-row gap-4">
        <View className="flex-1">
          <Text className="text-sm font-bold text-gray-700 mb-2">First Name</Text>
          <TextInput
            value={formData.firstName}
            onChangeText={(text) => updateFormData('firstName', text)}
            placeholder="John"
            className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white"
          />
        </View>
        <View className="flex-1">
          <Text className="text-sm font-bold text-gray-700 mb-2">Last Name</Text>
          <TextInput
            value={formData.lastName}
            onChangeText={(text) => updateFormData('lastName', text)}
            placeholder="Doe"
            className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white"
          />
        </View>
      </View>

      <View>
        <Text className="text-sm font-bold text-gray-700 mb-2">Email Address</Text>
        <TextInput
          value={formData.email}
          onChangeText={(text) => updateFormData('email', text)}
          placeholder="john.doe@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white"
        />
      </View>

      <View>
        <Text className="text-sm font-bold text-gray-700 mb-2">Phone Number</Text>
        <TextInput
          value={formData.phone}
          onChangeText={(text) => updateFormData('phone', text)}
          placeholder="+1 (555) 123-4567"
          keyboardType="phone-pad"
          className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white"
        />
      </View>

      <View>
        <Text className="text-sm font-bold text-gray-700 mb-2">Address</Text>
        <TextInput
          value={formData.address}
          onChangeText={(text) => updateFormData('address', text)}
          placeholder="123 Main Street"
          className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white"
        />
      </View>

      <View className="flex-row gap-4">
        <View className="flex-1">
          <Text className="text-sm font-bold text-gray-700 mb-2">City</Text>
          <TextInput
            value={formData.city}
            onChangeText={(text) => updateFormData('city', text)}
            placeholder="New York"
            className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white"
          />
        </View>
        <View className="flex-1">
          <Text className="text-sm font-bold text-gray-700 mb-2">State</Text>
          <TextInput
            value={formData.state}
            onChangeText={(text) => updateFormData('state', text)}
            placeholder="NY"
            className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white"
          />
        </View>
      </View>

      <View>
        <Text className="text-sm font-bold text-gray-700 mb-2">ZIP Code</Text>
        <TextInput
          value={formData.zipCode}
          onChangeText={(text) => updateFormData('zipCode', text)}
          placeholder="10001"
          keyboardType="numeric"
          className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white"
        />
      </View>
    </View>
  );
}
