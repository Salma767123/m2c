import React from 'react';
import { View, Text } from 'react-native';
import { MapPin, CreditCard, Wallet, CalendarDays, Mail, Phone } from 'lucide-react-native';
import { CheckoutFormData } from '../Checkout';
import { getCountryName, getCountryFlag, getStateName, formatPhoneForDisplay } from './constants';

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
        backgroundColor: '#fffdfbf',
        borderWidth: 1,
        borderColor: '#e5dbd0',
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
          borderBottomColor: '#e5dbd0',
          backgroundColor: '#faf6f2',
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
        <Text style={{ fontSize: 14, fontWeight: '700', color: '#1a1a1a' }}>{title}</Text>
      </View>
      {/* Card body */}
      <View style={{ padding: 16 }}>{children}</View>
    </View>
  );
}

export default function ReviewOrder({ formData }: ReviewOrderProps) {
  const paymentIcon = formData.paymentMethod === 'razorpay' ? CreditCard : Wallet;
  const paymentName = formData.paymentMethod === 'razorpay' ? 'Razorpay' : 'PayU';

  return (
    <View style={{ gap: 14 }}>
      {/* Shipping summary */}
       <InfoCard
         title="Shipping To"
         icon={MapPin}
         iconColor="#c41617"
         iconBg="#fdf6f4"
         accessibilityLabel={`Shipping to ${formData.firstName} ${formData.lastName}, ${formData.address}, ${formData.city}, ${formData.state}`}
       >
         {/* Name */}
         <Text style={{ fontSize: 16, fontWeight: '700', color: '#1a1a1a', marginBottom: 6 }}>
           {formData.firstName} {formData.lastName}
         </Text>

         {/* Address block */}
         <View style={{ backgroundColor: '#faf6f2', borderRadius: 10, padding: 12, marginBottom: 12 }}>
           <Text style={{ fontSize: 13, color: '#6b625b', lineHeight: 20 }}>
             {formData.address}
           </Text>
           {formData.addressLine2 ? (
             <Text style={{ fontSize: 13, color: '#6b625b', lineHeight: 20 }}>
               {formData.addressLine2}
             </Text>
           ) : null}
           <Text style={{ fontSize: 13, color: '#6b625b', lineHeight: 20 }}>
             {[formData.city, getStateName(formData.state, formData.country), formData.zipCode]
               .filter(Boolean)
               .join(', ')}
           </Text>
           <Text style={{ fontSize: 12, color: '#9ca3af', marginTop: 4, fontWeight: '600' }}>
             {getCountryName(formData.country)} {getCountryFlag(formData.country)}
           </Text>
         </View>

         {/* Contact details — labeled */}
         <View style={{ gap: 10 }}>
           <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
             <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: '#f0e8de', alignItems: 'center', justifyContent: 'center' }}>
               <Mail size={14} color="#9ca3af" />
             </View>
             <View style={{ flex: 1 }}>
               <Text style={{ fontSize: 10, fontWeight: '700', color: '#a2968b', textTransform: 'uppercase', letterSpacing: 0.5 }}>Email</Text>
               <Text style={{ fontSize: 13, color: '#6b625b', fontWeight: '500' }}>{formData.email}</Text>
             </View>
           </View>
           <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
             <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: '#f0e8de', alignItems: 'center', justifyContent: 'center' }}>
               <Phone size={14} color="#9ca3af" />
             </View>
             <View style={{ flex: 1 }}>
               <Text style={{ fontSize: 10, fontWeight: '700', color: '#a2968b', textTransform: 'uppercase', letterSpacing: 0.5 }}>Phone</Text>
               <Text style={{ fontSize: 13, color: '#6b625b', fontWeight: '500' }}>
                 {formatPhoneForDisplay(formData.phone, formData.country)}
               </Text>
             </View>
           </View>
         </View>
      </InfoCard>

      {/* Payment method */}
       <InfoCard
         title="Payment Method"
         icon={paymentIcon}
         iconColor="#c41617"
         iconBg="#fdf6f4"
         accessibilityLabel={`Payment method: ${paymentName}`}
       >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View>
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#1a1a1a' }}>{paymentName}</Text>
            <Text style={{ fontSize: 12, color: '#6b625b', marginTop: 2 }}>Cards, UPI, Net Banking, Wallets</Text>
          </View>
          <View style={{ backgroundColor: '#f0e8de', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: '#6b625b' }}>Secure</Text>
          </View>
        </View>
      </InfoCard>

      {/* Delivery estimate */}
      <View
        accessible
        accessibilityLabel="Estimated delivery: 5 to 7 business days"
        style={{
          backgroundColor: '#fdf6f4',
          borderWidth: 1,
          borderColor: '#f4e2de',
          borderRadius: 16,
          padding: 16,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: '#f4e2de', alignItems: 'center', justifyContent: 'center' }}>
          <CalendarDays size={20} color="#e01a1b" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: '#1a1a1a' }}>Estimated Delivery</Text>
          <Text style={{ fontSize: 13, color: '#5a524b', marginTop: 2 }}>5 – 7 business days</Text>
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
