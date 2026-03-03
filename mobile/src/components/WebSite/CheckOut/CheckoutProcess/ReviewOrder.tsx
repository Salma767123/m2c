import React from 'react';
import { View, Text } from 'react-native';
import { Calendar } from 'lucide-react-native';
import { CheckoutFormData } from '../Checkout';

interface ReviewOrderProps {
  formData: CheckoutFormData;
}

export default function ReviewOrder({ formData }: ReviewOrderProps) {
  return (
    <View className="space-y-6 gap-6">
      <View className="bg-gray-50 rounded-xl p-6 border border-gray-200">
        <Text className="font-bold text-gray-900 mb-4">Shipping Information</Text>
        <View className="space-y-1 gap-1">
          <Text className="font-bold text-gray-900">
            {formData.firstName} {formData.lastName}
          </Text>
          <Text className="text-sm text-gray-600">{formData.address}</Text>
          <Text className="text-sm text-gray-600">
            {formData.city}, {formData.state} {formData.zipCode}
          </Text>
          <Text className="text-sm text-gray-600">{formData.country}</Text>
          <View className="mt-2 pt-2 border-t border-gray-200">
            <Text className="text-sm text-gray-600">{formData.email}</Text>
            <Text className="text-sm text-gray-600">{formData.phone}</Text>
          </View>
        </View>
      </View>

      <View className="bg-gray-50 rounded-xl p-6 border border-gray-200">
        <Text className="font-bold text-gray-900 mb-4">Payment Method</Text>
        <View>
          {formData.paymentMethod === 'razorpay' && (
            <>
              <Text className="font-bold text-gray-900">Razorpay</Text>
              <Text className="text-sm text-gray-600">Cards, UPI, Wallets</Text>
            </>
          )}
          {formData.paymentMethod === 'payu' && (
            <>
              <Text className="font-bold text-gray-900">PayU</Text>
              <Text className="text-sm text-gray-600">Cards, UPI, Wallets</Text>
            </>
          )}
        </View>
      </View>

      <View className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <View className="flex-row items-center">
          <Calendar size={20} color="#2563eb" />
          <View className="ml-3 flex-1">
            <Text className="font-bold text-blue-900">Estimated Delivery</Text>
            <Text className="text-sm text-blue-700">5-7 business days</Text>
          </View>
        </View>
      </View>
    </View>
  );
}
