import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Shield, CreditCard, Wallet, AlertTriangle } from 'lucide-react-native';
import { CheckoutFormData } from '../Checkout';
import { PublicPaymentSettings } from '@/services/paymentSettingsService';

interface PaymentFormProps {
  formData: CheckoutFormData;
  updateFormData: (field: keyof CheckoutFormData, value: string | boolean) => void;
  paymentSettings: PublicPaymentSettings | null;
  disabled?: boolean;
}

export default function PaymentForm({
  formData,
  updateFormData,
  paymentSettings,
  disabled,
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
        <Text className="text-sm font-medium text-[#4a423c] mb-4">Payment Method</Text>
        <View className="gap-3">
          {availablePaymentMethods.map((method) => {
            const Icon = method.icon;
            const isSelected = formData.paymentMethod === method.id;
            return (
              <TouchableOpacity
                key={method.id}
                onPress={() => updateFormData('paymentMethod', method.id as any)}
                activeOpacity={0.75}
                disabled={disabled}
                accessibilityRole="radio"
                accessibilityState={{ selected: isSelected, disabled: disabled ?? false }}
                accessibilityLabel={`${method.name}: ${method.description}${isSelected ? ', selected' : ''}`}
                className={`flex-row items-center p-4 border-2 rounded-2xl gap-3 ${
                  isSelected
                    ? 'border-[#e01a1b] bg-[#fef2f2]'
                    : 'border-[#e5dbd0] bg-white'
                }`}
              >
                {/* Radio */}
                <View
                  className={`w-6 h-6 rounded-full border-2 items-center justify-center ${
                    isSelected ? 'border-[#e01a1b]' : 'border-[#d1c7bb]'
                  }`}
                >
                  {isSelected && (
                    <View className="w-3 h-3 rounded-full bg-[#e01a1b]" />
                  )}
                </View>

                {/* Icon */}
                <View
                  className={`w-10 h-10 rounded-xl items-center justify-center ${
                    isSelected ? 'bg-[#e01a1b]' : 'bg-[#f0e8de]'
                  }`}
                >
                  <Icon size={18} color={isSelected ? '#ffffff' : '#6b625b'} />
                </View>

                {/* Label */}
                <View className="flex-1">
                  <Text className={`font-bold text-sm ${isSelected ? 'text-[#e01a1b]' : 'text-[#1a1a1a]'}`}>
                    {method.name}
                  </Text>
                  <Text className="text-xs text-[#6b625b] mt-0.5">{method.description}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Gateway-specific info */}
      {formData.paymentMethod === 'razorpay' && (
        <View className="border-l-2 border-[#e01a1b] bg-[#fdf6f4] rounded-2xl p-4 ring-1 ring-[#f4e2de]">
          <Text className="text-sm font-semibold text-[#1a1a1a] mb-1">Razorpay Payment</Text>
          <Text className="text-sm text-[#5a524b] leading-5">
            You will be redirected to Razorpay&apos;s secure payment gateway to complete your payment using cards, UPI, net banking, or wallets.
          </Text>
        </View>
      )}

      {formData.paymentMethod === 'payu' && (
        <View className="bg-purple-50 border border-purple-200 rounded-2xl p-4">
          <Text className="text-sm font-medium text-purple-900 mb-1">PayU Payment</Text>
          <Text className="text-xs text-purple-700 leading-5">
            You will be redirected to PayU&apos;s secure payment gateway to complete your payment using cards, UPI, net banking, or wallets.
          </Text>
        </View>
      )}

      {/* Security note */}
      <View className="bg-green-50 border border-green-200 rounded-2xl p-4 flex-row items-center gap-3">
        <View className="w-10 h-10 rounded-xl bg-green-100 items-center justify-center">
          <Shield size={18} color="#16a34a" />
        </View>
        <View className="flex-1">
          <Text className="text-sm font-bold text-green-900">Secure Payment</Text>
          <Text className="text-xs text-green-700 mt-0.5">
            Your payment information is encrypted and secure
          </Text>
        </View>
      </View>
    </View>
  );
}
