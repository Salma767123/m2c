import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Shield, CreditCard, Wallet, AlertTriangle } from 'lucide-react-native';
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
  const availablePaymentMethods: { id: string; name: string; description: string; icon: any }[] = [];

  if (paymentSettings?.razorpayEnabled) {
    availablePaymentMethods.push({
      id: 'razorpay',
      name: 'Razorpay',
      description: 'Cards · UPI · Net Banking · Wallets',
      icon: CreditCard,
    });
  }

  if (paymentSettings?.payuEnabled) {
    availablePaymentMethods.push({
      id: 'payu',
      name: 'PayU',
      description: 'Cards · UPI · Net Banking · Wallets',
      icon: Wallet,
    });
  }

  if (availablePaymentMethods.length === 0) {
    return (
      <View className="bg-red-50 border border-red-200 rounded-2xl p-5">
        <View className="flex-row items-center gap-3 mb-3">
          <View className="w-9 h-9 rounded-xl bg-red-100 items-center justify-center">
            <AlertTriangle size={18} color="#dc2626" />
          </View>
          <Text className="text-sm font-bold text-red-900">Payment Gateway Unavailable</Text>
        </View>
        <Text className="text-sm text-red-700 leading-5">
          No payment gateway is configured. Please contact support to complete your order.
        </Text>
      </View>
    );
  }

  return (
    <View className="gap-5">
      {/* Method selector */}
      <View>
        <Text className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
          Select Payment Method
        </Text>
        <View className="gap-3">
          {availablePaymentMethods.map((method) => {
            const Icon = method.icon;
            const isSelected = formData.paymentMethod === method.id;
            return (
              <TouchableOpacity
                key={method.id}
                onPress={() => updateFormData('paymentMethod', method.id as any)}
                activeOpacity={0.75}
                accessibilityRole="radio"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={`${method.name}: ${method.description}${isSelected ? ', selected' : ''}`}
                className={`flex-row items-center p-4 border-2 rounded-2xl gap-3 ${
                  isSelected
                    ? 'border-[#1a1a2e] bg-[#1a1a2e]/5'
                    : 'border-gray-200 bg-white'
                }`}
              >
                {/* Radio */}
                <View
                  className={`w-6 h-6 rounded-full border-2 items-center justify-center ${
                    isSelected ? 'border-[#1a1a2e]' : 'border-gray-300'
                  }`}
                >
                  {isSelected && (
                    <View className="w-3 h-3 rounded-full bg-[#1a1a2e]" />
                  )}
                </View>

                {/* Icon */}
                <View
                  className={`w-10 h-10 rounded-xl items-center justify-center ${
                    isSelected ? 'bg-[#1a1a2e]' : 'bg-gray-100'
                  }`}
                >
                  <Icon size={18} color={isSelected ? '#f59e0b' : '#6b7280'} />
                </View>

                {/* Label */}
                <View className="flex-1">
                  <Text className={`font-bold text-sm ${isSelected ? 'text-[#1a1a2e]' : 'text-gray-800'}`}>
                    {method.name}
                  </Text>
                  <Text className="text-xs text-gray-400 mt-0.5">{method.description}</Text>
                </View>

                {isSelected && (
                  <View className="bg-amber-400 rounded-lg px-2 py-1">
                    <Text className="text-xs font-bold text-[#1a1a2e]">Selected</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Gateway-specific info */}
      {formData.paymentMethod === 'razorpay' && (
        <View className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
          <Text className="text-sm font-bold text-blue-900 mb-1">Razorpay Secure Gateway</Text>
          <Text className="text-xs text-blue-700 leading-5">
            You'll be redirected to Razorpay's secure page to complete payment via card, UPI, net banking, or wallet.
          </Text>
        </View>
      )}

      {formData.paymentMethod === 'payu' && (
        <View className="bg-purple-50 border border-purple-200 rounded-2xl p-4">
          <Text className="text-sm font-bold text-purple-900 mb-1">PayU Secure Gateway</Text>
          <Text className="text-xs text-purple-700 leading-5">
            You'll be redirected to PayU's secure page to complete payment via card, UPI, net banking, or wallet.
          </Text>
        </View>
      )}

      {/* Security note */}
      <View className="bg-green-50 border border-green-200 rounded-2xl p-4 flex-row items-center gap-3">
        <View className="w-10 h-10 rounded-xl bg-green-100 items-center justify-center">
          <Shield size={18} color="#16a34a" />
        </View>
        <View className="flex-1">
          <Text className="text-sm font-bold text-green-900">256-bit SSL Encrypted</Text>
          <Text className="text-xs text-green-700 mt-0.5">
            Your payment info is fully encrypted and secure
          </Text>
        </View>
      </View>
    </View>
  );
}
