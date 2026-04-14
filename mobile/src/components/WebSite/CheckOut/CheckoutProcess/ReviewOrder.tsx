import React from 'react';
import { View, Text } from 'react-native';
import { MapPin, CreditCard, Wallet, CalendarDays } from 'lucide-react-native';
import { CheckoutFormData } from '../Checkout';

interface ReviewOrderProps {
  formData: CheckoutFormData;
}

function InfoCard({
  title,
  icon: Icon,
  iconColor,
  iconBg,
  children,
}: {
  title: string;
  icon: any;
  iconColor: string;
  iconBg: string;
  children: React.ReactNode;
}) {
  return (
    <View className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
      {/* Card header */}
      <View className="flex-row items-center gap-3 px-4 py-3 border-b border-gray-100 bg-gray-50">
        <View
          className="w-8 h-8 rounded-xl items-center justify-center"
          style={{ backgroundColor: iconBg }}
        >
          <Icon size={16} color={iconColor} />
        </View>
        <Text className="text-sm font-bold text-gray-800">{title}</Text>
      </View>
      {/* Card body */}
      <View className="px-4 py-4">{children}</View>
    </View>
  );
}

export default function ReviewOrder({ formData }: ReviewOrderProps) {
  const paymentIcon = formData.paymentMethod === 'razorpay' ? CreditCard : Wallet;
  const paymentName = formData.paymentMethod === 'razorpay' ? 'Razorpay' : 'PayU';

  return (
    <View className="gap-4">
      {/* Shipping summary */}
      <InfoCard title="Shipping To" icon={MapPin} iconColor="#3b82f6" iconBg="#eff6ff">
        <Text className="text-base font-bold text-gray-900 mb-1">
          {formData.firstName} {formData.lastName}
        </Text>
        <Text className="text-sm text-gray-500 leading-5">{formData.address}</Text>
        <Text className="text-sm text-gray-500">
          {formData.city}, {formData.state} {formData.zipCode}
        </Text>
        <Text className="text-sm text-gray-500">{formData.country}</Text>
        <View className="mt-3 pt-3 border-t border-gray-100 gap-1">
          <Text className="text-sm text-gray-500">{formData.email}</Text>
          <Text className="text-sm text-gray-500">{formData.phone}</Text>
        </View>
      </InfoCard>

      {/* Payment method */}
      <InfoCard title="Payment Method" icon={paymentIcon} iconColor="#8b5cf6" iconBg="#faf5ff">
        <Text className="text-base font-bold text-gray-900">{paymentName}</Text>
        <Text className="text-sm text-gray-500 mt-0.5">Cards, UPI, Net Banking, Wallets</Text>
      </InfoCard>

      {/* Delivery estimate */}
      <View className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex-row items-center gap-3">
        <View className="w-10 h-10 rounded-xl bg-blue-100 items-center justify-center">
          <CalendarDays size={20} color="#2563eb" />
        </View>
        <View className="flex-1">
          <Text className="text-sm font-bold text-blue-900">Estimated Delivery</Text>
          <Text className="text-sm text-blue-700 mt-0.5">5 – 7 business days</Text>
        </View>
      </View>

      {/* Confirmation note */}
      <View className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
        <Text className="text-xs font-bold text-amber-800 text-center">
          By placing this order you agree to our Terms of Service and Privacy Policy
        </Text>
      </View>
    </View>
  );
}
