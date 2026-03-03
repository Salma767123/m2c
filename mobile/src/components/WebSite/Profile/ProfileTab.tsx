import React, { useRef, useEffect } from 'react';
import { View, Text, TextInput, Animated } from 'react-native';
import { User, Mail, Phone, MapPin } from 'lucide-react-native';
import type { UserProfile } from './types';

interface ProfileTabProps {
  editedProfile: UserProfile;
  setEditedProfile: (profile: UserProfile) => void;
  isEditing: boolean;
}

// ── Reusable Section Card ──
function SectionCard({
  title,
  icon: Icon,
  iconColor,
  children,
  delay = 0,
}: {
  title: string;
  icon: any;
  iconColor: string;
  children: React.ReactNode;
  delay?: number;
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }],
        marginHorizontal: 16,
        marginTop: 16,
        backgroundColor: '#ffffff',
        borderRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 3,
        overflow: 'hidden',
      }}
    >
      {/* Section Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingVertical: 14,
          borderBottomWidth: 1,
          borderBottomColor: '#f1f5f9',
        }}
      >
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 10,
            backgroundColor: `${iconColor}15`,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 10,
          }}
        >
          <Icon size={16} color={iconColor} />
        </View>
        <Text style={{ fontSize: 15, fontWeight: '700', color: '#1e293b' }}>
          {title}
        </Text>
      </View>

      {/* Section Content */}
      <View style={{ padding: 16 }}>{children}</View>
    </Animated.View>
  );
}

// ── Reusable Form Field ──
function FormField({
  label,
  value,
  onChangeText,
  isEditing,
  placeholder,
  keyboardType,
  autoCapitalize,
  isLast = false,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  isEditing: boolean;
  placeholder: string;
  keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'numeric';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  isLast?: boolean;
}) {
  return (
    <View style={{ marginBottom: isLast ? 0 : 14 }}>
      <Text
        style={{
          fontSize: 12,
          fontWeight: '600',
          color: '#94a3b8',
          marginBottom: 6,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        }}
      >
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        editable={isEditing}
        placeholder={placeholder}
        placeholderTextColor="#cbd5e1"
        keyboardType={keyboardType || 'default'}
        autoCapitalize={autoCapitalize || 'sentences'}
        style={{
          width: '100%',
          paddingHorizontal: 14,
          paddingVertical: 12,
          borderRadius: 12,
          fontSize: 14,
          fontWeight: '500',
          color: isEditing ? '#1e293b' : '#475569',
          backgroundColor: isEditing ? '#ffffff' : '#f8fafc',
          borderWidth: 1,
          borderColor: isEditing ? '#e2e8f0' : '#f1f5f9',
        }}
      />
    </View>
  );
}

export default function ProfileTab({
  editedProfile,
  setEditedProfile,
  isEditing,
}: ProfileTabProps) {
  const handleInputChange = (field: string, value: string) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setEditedProfile({
        ...editedProfile,
        [parent]: {
          ...(editedProfile as any)[parent],
          [child]: value,
        },
      });
    } else {
      setEditedProfile({
        ...editedProfile,
        [field]: value,
      });
    }
  };

  return (
    <View>
      {/* ── Personal Information ── */}
      <SectionCard title="Personal Information" icon={User} iconColor="#3b82f6" delay={100}>
        <FormField
          label="First Name"
          value={editedProfile.firstName}
          onChangeText={(v) => handleInputChange('firstName', v)}
          isEditing={isEditing}
          placeholder="Enter your first name"
        />
        <FormField
          label="Last Name"
          value={editedProfile.lastName}
          onChangeText={(v) => handleInputChange('lastName', v)}
          isEditing={isEditing}
          placeholder="Enter your last name"
        />
        <FormField
          label="Email Address"
          value={editedProfile.email}
          onChangeText={(v) => handleInputChange('email', v)}
          isEditing={isEditing}
          placeholder="Enter your email address"
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <FormField
          label="Phone Number"
          value={editedProfile.phone}
          onChangeText={(v) => handleInputChange('phone', v)}
          isEditing={isEditing}
          placeholder="Enter your phone number"
          keyboardType="phone-pad"
          isLast
        />
      </SectionCard>

      {/* ── Address Information ── */}
      <SectionCard title="Address" icon={MapPin} iconColor="#8b5cf6" delay={200}>
        <FormField
          label="Street Address"
          value={editedProfile.address.addressLine1}
          onChangeText={(v) => handleInputChange('address.addressLine1', v)}
          isEditing={isEditing}
          placeholder="Enter your street address"
        />
        <FormField
          label="City"
          value={editedProfile.address.city}
          onChangeText={(v) => handleInputChange('address.city', v)}
          isEditing={isEditing}
          placeholder="Enter your city"
        />

        {/* State & Zip side by side */}
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 14 }}>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 12,
                fontWeight: '600',
                color: '#94a3b8',
                marginBottom: 6,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
              }}
            >
              State
            </Text>
            <TextInput
              value={editedProfile.address.state}
              onChangeText={(v) => handleInputChange('address.state', v)}
              editable={isEditing}
              placeholder="State"
              placeholderTextColor="#cbd5e1"
              style={{
                width: '100%',
                paddingHorizontal: 14,
                paddingVertical: 12,
                borderRadius: 12,
                fontSize: 14,
                fontWeight: '500',
                color: isEditing ? '#1e293b' : '#475569',
                backgroundColor: isEditing ? '#ffffff' : '#f8fafc',
                borderWidth: 1,
                borderColor: isEditing ? '#e2e8f0' : '#f1f5f9',
              }}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 12,
                fontWeight: '600',
                color: '#94a3b8',
                marginBottom: 6,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
              }}
            >
              Zip Code
            </Text>
            <TextInput
              value={editedProfile.address.zipCode}
              onChangeText={(v) => handleInputChange('address.zipCode', v)}
              editable={isEditing}
              placeholder="Zip"
              placeholderTextColor="#cbd5e1"
              keyboardType="numeric"
              style={{
                width: '100%',
                paddingHorizontal: 14,
                paddingVertical: 12,
                borderRadius: 12,
                fontSize: 14,
                fontWeight: '500',
                color: isEditing ? '#1e293b' : '#475569',
                backgroundColor: isEditing ? '#ffffff' : '#f8fafc',
                borderWidth: 1,
                borderColor: isEditing ? '#e2e8f0' : '#f1f5f9',
              }}
            />
          </View>
        </View>

        <FormField
          label="Country"
          value={editedProfile.address.country}
          onChangeText={(v) => handleInputChange('address.country', v)}
          isEditing={isEditing}
          placeholder="Enter your country"
          isLast
        />
      </SectionCard>
    </View>
  );
}
