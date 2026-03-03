import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Shield, CreditCard, Wallet } from 'lucide-react-native';
import { CheckoutFormData } from '../Checkout';
import { PublicPaymentSettings } from '@/services/paymentSettingsService';

interface PaymentFormProps {
  formData: CheckoutFormData;
  updateFormData: (field: keyof CheckoutFormData, value: string | boolean) => void;
  paymentSettings: PublicPaymentSettings | null;
}

export default function PaymentForm({
  formData,
  updateFormData,
  paymentSettings,
}: PaymentFormProps) {
  const availablePaymentMethods = [];

  if (paymentSettings?.razorpayEnabled) {
    availablePaymentMethods.push({
      id: 'razorpay',
      name: 'Razorpay',
      description: 'Cards, UPI, Wallets',
      icon: CreditCard,
    });
  }

  if (paymentSettings?.payuEnabled) {
    availablePaymentMethods.push({
      id: 'payu',
      name: 'PayU',
      description: 'Cards, UPI, Wallets',
      icon: Wallet,
    });
  }

  if (availablePaymentMethods.length === 0) {
    return (
      <View className="space-y-6 gap-6">
        <View className="p-4 bg-red-50 rounded-xl border border-red-200">
          <Text className="font-bold text-red-900 mb-2">No Payment Gateway Available</Text>
          <Text className="text-sm text-red-700 leading-5">
            Payment gateway is not configured. Please contact support to complete your order.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View className="space-y-6 gap-6">
      <View>
        <Text className="text-sm font-bold text-gray-700 mb-4">Payment Method</Text>
        <View className="space-y-4 gap-4">
          {availablePaymentMethods.map((method) => {
            const Icon = method.icon;
            const isSelected = formData.paymentMethod === method.id;
            return (
              <TouchableOpacity
                key={method.id}
                onPress={() => updateFormData('paymentMethod', method.id as any)}
                className={`flex-row items-center p-4 border-2 rounded-xl ${
                  isSelected ? 'border-gray-800 bg-gray-50' : 'border-gray-300 bg-white'
                }`}
              >
                <View
                  className={`w-5 h-5 rounded-full border-2 mr-3 items-center justify-center ${
                    isSelected ? 'border-gray-800' : 'border-gray-300'
                  }`}
                >
                  {isSelected && <View className="w-3 h-3 rounded-full bg-gray-800" />}
                </View>
                <Icon size={20} color="#6b7280" />
                <View className="flex-1 ml-3">
                  <Text className="font-bold text-gray-900">{method.name}</Text>
                  <Text className="text-xs text-gray-600">{method.description}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {formData.paymentMethod === 'razorpay' && (
        <View className="p-4 bg-blue-50 rounded-xl border border-blue-200">
          <Text className="font-bold text-blue-900 mb-2">Razorpay Payment</Text>
          <Text className="text-sm text-blue-700 leading-5">
            You will be redirected to Razorpay's secure payment gateway to complete your payment
            using cards, UPI, net banking, or wallets.
          </Text>
        </View>
      )}

      {formData.paymentMethod === 'payu' && (
        <View className="p-4 bg-purple-50 rounded-xl border border-purple-200">
          <Text className="font-bold text-purple-900 mb-2">PayU Payment</Text>
          <Text className="text-sm text-purple-700 leading-5">
            You will be redirected to PayU's secure payment gateway to complete your payment using
            cards, UPI, net banking, or wallets.
          </Text>
        </View>
      )}

      <View className="bg-green-50 border border-green-200 rounded-xl p-4">
        <View className="flex-row items-center">
          <Shield size={20} color="#16a34a" />
          <View className="ml-3 flex-1">
            <Text className="font-bold text-green-900">Secure Payment</Text>
            <Text className="text-sm text-green-700">
              Your payment information is encrypted and secure
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}
