import React, { useRef, useEffect } from 'react';
import { View, Text, TextInput, Animated, Pressable } from 'react-native';
import { router } from 'expo-router';
import { User, Info, ChevronRight } from 'lucide-react-native';
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
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, delay, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 400, delay, useNativeDriver: true }),
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
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        shadowColor: '#0f172a',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
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
          borderBottomColor: '#f3f4f6',
        }}
      >
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            backgroundColor: '#f3f4f6',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 10,
          }}
        >
          <Icon size={16} color={iconColor} />
        </View>
        <Text style={{ fontSize: 16, fontWeight: '800', color: '#111827' }}>{title}</Text>
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
  accessibilityLabel,
  isLast = false,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  isEditing: boolean;
  placeholder: string;
  keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'numeric';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  accessibilityLabel?: string;
  isLast?: boolean;
}) {
  return (
    <View style={{ marginBottom: isLast ? 0 : 16 }}>
      <Text
        style={{
          fontSize: 12,
          fontWeight: '700',
          color: '#6b7280',
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
        placeholderTextColor="#9ca3af"
        keyboardType={keyboardType || 'default'}
        autoCapitalize={autoCapitalize || 'sentences'}
        accessibilityLabel={accessibilityLabel || label}
        style={{
          width: '100%',
          paddingHorizontal: 14,
          paddingVertical: 13,
          minHeight: 48,
          borderRadius: 12,
          fontSize: 14,
          fontWeight: '600',
          color: isEditing ? '#111827' : '#4b5563',
          backgroundColor: isEditing ? '#ffffff' : '#f9fafb',
          borderWidth: 1.5,
          borderColor: isEditing ? '#d1d5db' : '#f3f4f6',
        }}
      />
    </View>
  );
}

// ── Gender Selector (3-option segmented) ──
function GenderSelector({
  value,
  onChange,
  isEditing,
}: {
  value: string;
  onChange: (v: 'male' | 'female' | 'other') => void;
  isEditing: boolean;
}) {
  const options: { value: 'male' | 'female' | 'other'; label: string }[] = [
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' },
    { value: 'other', label: 'Other' },
  ];
  return (
    <View>
      <Text
        style={{
          fontSize: 12,
          fontWeight: '700',
          color: '#6b7280',
          marginBottom: 6,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        }}
      >
        Gender
      </Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {options.map((opt) => {
          const active = value === opt.value;
          return (
            <Pressable
              key={opt.value}
              onPress={() => { if (isEditing) onChange(opt.value); }}
              disabled={!isEditing}
              accessibilityRole="radio"
              accessibilityState={{ selected: active, disabled: !isEditing }}
              accessibilityLabel={`Gender ${opt.label}`}
              style={{ flex: 1 }}
            >
              <View
                style={{
                  minHeight: 48,
                  borderRadius: 12,
                  borderWidth: 1.5,
                  borderColor: active ? '#111827' : isEditing ? '#d1d5db' : '#f3f4f6',
                  backgroundColor: active ? '#111827' : isEditing ? '#fff' : '#f9fafb',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: !isEditing && !active ? 0.6 : 1,
                }}
              >
                <Text style={{ fontSize: 14, fontWeight: '700', color: active ? '#fff' : '#4b5563' }}>
                  {opt.label}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function ProfileTab({
  editedProfile,
  setEditedProfile,
  isEditing,
}: ProfileTabProps) {
  const handleInputChange = (field: keyof UserProfile, value: string) => {
    setEditedProfile({ ...editedProfile, [field]: value });
  };

  return (
    <View>
      {/* ── Personal Information ── */}
      <SectionCard title="Personal Information" icon={User} iconColor="#111827" delay={100}>
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
        />
        <GenderSelector
          value={editedProfile.gender}
          onChange={(v) => handleInputChange('gender', v)}
          isEditing={isEditing}
        />
      </SectionCard>

      {/* ── Saved Addresses info box (matches web) ── */}
      <Pressable
        onPress={() => router.push('/(any)/saved-addresses' as any)}
        accessibilityRole="button"
        accessibilityLabel="Manage saved addresses"
      >
        <View
          style={{
            marginHorizontal: 16,
            marginTop: 16,
            backgroundColor: '#eff6ff',
            borderWidth: 1,
            borderColor: '#bfdbfe',
            borderRadius: 16,
            padding: 14,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#dbeafe', alignItems: 'center', justifyContent: 'center' }}>
            <Info size={18} color="#2563eb" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#1e40af' }}>
              Looking for your shipping addresses?
            </Text>
            <Text style={{ fontSize: 12, color: '#3b82f6', marginTop: 1 }}>
              Manage your saved addresses here.
            </Text>
          </View>
          <ChevronRight size={18} color="#3b82f6" />
        </View>
      </Pressable>
    </View>
  );
}
