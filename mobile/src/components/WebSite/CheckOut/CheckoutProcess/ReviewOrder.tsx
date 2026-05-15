import React from 'react';
import { View, Text } from 'react-native';
import { MapPin, CreditCard, Wallet, CalendarDays, Mail, Phone } from 'lucide-react-native';
import { CheckoutFormData } from '../Checkout';

interface ReviewOrderProps {
  formData: CheckoutFormData;
}

function InfoCard({
  title,
  icon: Icon,
  iconColor,
  iconBg,
  accessibilityLabel,
  children,
}: {
  title: string;
  icon: any;
  iconColor: string;
  iconBg: string;
  accessibilityLabel: string;
  children: React.ReactNode;
}) {
  return (
    <View
      accessible
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="summary"
      style={{
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#f3f4f6',
        borderRadius: 16,
        overflow: 'hidden',
      }}
    >
      {/* Card header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderBottomColor: '#f3f4f6',
          backgroundColor: '#f9fafb',
        }}
      >
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            backgroundColor: iconBg,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon size={16} color={iconColor} />
        </View>
        <Text style={{ fontSize: 14, fontWeight: '700', color: '#111827' }}>{title}</Text>
      </View>
      {/* Card body */}
      <View style={{ padding: 16 }}>{children}</View>
    </View>
  );
}

export default function ReviewOrder({ formData }: ReviewOrderProps) {
  const paymentIcon = formData.paymentMethod === 'razorpay' ? CreditCard : Wallet;
  const paymentName = formData.paymentMethod === 'razorpay' ? 'Razorpay' : 'PayU';

  const fullAddress = [
    formData.address,
    formData.addressLine2,
    `${formData.city}, ${formData.state} ${formData.zipCode}`,
    formData.country,
  ].filter(Boolean).join('\n');

  return (
    <View style={{ gap: 14 }}>
      {/* Shipping summary */}
      <InfoCard
        title="Shipping To"
        icon={MapPin}
        iconColor="#3b82f6"
        iconBg="#eff6ff"
        accessibilityLabel={`Shipping to ${formData.firstName} ${formData.lastName}, ${formData.address}, ${formData.city}, ${formData.state}`}
      >
        {/* Name */}
        <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 6 }}>
          {formData.firstName} {formData.lastName}
        </Text>

        {/* Address block */}
        <View style={{ backgroundColor: '#f8fafc', borderRadius: 10, padding: 12, marginBottom: 12 }}>
          <Text style={{ fontSize: 13, color: '#374151', lineHeight: 20 }}>
            {formData.address}
          </Text>
          {formData.addressLine2 ? (
            <Text style={{ fontSize: 13, color: '#374151', lineHeight: 20 }}>
              {formData.addressLine2}
            </Text>
          ) : null}
          <Text style={{ fontSize: 13, color: '#374151', lineHeight: 20 }}>
            {formData.city}, {formData.state} {formData.zipCode}
          </Text>
          <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 4, fontWeight: '600' }}>
            {formData.country}
          </Text>
        </View>

        {/* Contact details — labeled */}
        <View style={{ gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' }}>
              <Mail size={14} color="#6b7280" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 10, fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5 }}>Email</Text>
              <Text style={{ fontSize: 13, color: '#374151', fontWeight: '500' }}>{formData.email}</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' }}>
              <Phone size={14} color="#6b7280" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 10, fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5 }}>Phone</Text>
              <Text style={{ fontSize: 13, color: '#374151', fontWeight: '500' }}>{formData.phone}</Text>
            </View>
          </View>
        </View>
      </InfoCard>

      {/* Payment method */}
      <InfoCard
        title="Payment Method"
        icon={paymentIcon}
        iconColor="#8b5cf6"
        iconBg="#faf5ff"
        accessibilityLabel={`Payment method: ${paymentName}`}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View>
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#111827' }}>{paymentName}</Text>
            <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>Cards, UPI, Net Banking, Wallets</Text>
          </View>
          <View style={{ backgroundColor: '#f3f4f6', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: '#374151' }}>Secure</Text>
          </View>
        </View>
      </InfoCard>

      {/* Delivery estimate */}
      <View
        accessible
        accessibilityLabel="Estimated delivery: 5 to 7 business days"
        style={{
          backgroundColor: '#eff6ff',
          borderWidth: 1,
          borderColor: '#bfdbfe',
          borderRadius: 16,
          padding: 16,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: '#dbeafe', alignItems: 'center', justifyContent: 'center' }}>
          <CalendarDays size={20} color="#2563eb" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: '#1e40af' }}>Estimated Delivery</Text>
          <Text style={{ fontSize: 13, color: '#3b82f6', marginTop: 2 }}>5 – 7 business days</Text>
        </View>
      </View>

      {/* Confirmation note */}
      <View
        accessible
        accessibilityLabel="By placing this order you agree to our Terms of Service and Privacy Policy"
        style={{
          backgroundColor: '#fffbeb',
          borderWidth: 1,
          borderColor: '#fde68a',
          borderRadius: 14,
          padding: 14,
        }}
      >
        <Text style={{ fontSize: 12, fontWeight: '600', color: '#92400e', textAlign: 'center', lineHeight: 18 }}>
          By placing this order you agree to our Terms of Service and Privacy Policy
        </Text>
      </View>
    </View>
  );
}
