import React, { useRef, useEffect } from 'react';
import { View, Text, TextInput, Animated, Pressable } from 'react-native';
import { router } from 'expo-router';
import {
  User,
  Info,
  ChevronRight,
  Mail,
  Phone,
  Lock,
  AlertCircle,
} from 'lucide-react-native';
import type { UserProfile } from './types';

interface ProfileTabProps {
  editedProfile: UserProfile;
  setEditedProfile: (profile: UserProfile) => void;
  isEditing: boolean;
  errors?: Partial<Record<'firstName' | 'phone', string>>;
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
const FormField = React.forwardRef<TextInput, {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  isEditing: boolean;
  placeholder: string;
  keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'numeric';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  accessibilityLabel?: string;
  isLast?: boolean;
  /** Never editable, regardless of isEditing — e.g. account email. */
  readOnly?: boolean;
  readOnlyHint?: string;
  leadingIcon?: any;
  error?: string;
  returnKeyType?: 'next' | 'done';
  onSubmitEditing?: () => void;
  textContentType?: 'none' | 'emailAddress' | 'telephoneNumber' | 'givenName' | 'familyName';
}>(function FormField(
  {
    label,
    value,
    onChangeText,
    isEditing,
    placeholder,
    keyboardType,
    autoCapitalize,
    accessibilityLabel,
    isLast = false,
    readOnly = false,
    readOnlyHint,
    leadingIcon: LeadingIcon,
    error,
    returnKeyType,
    onSubmitEditing,
    textContentType,
  },
  ref,
) {
  const canEdit = isEditing && !readOnly;
  const hasError = !!error;

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

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          minHeight: 50,
          borderRadius: 12,
          borderWidth: 1.5,
          borderColor: hasError
            ? '#ef4444'
            : canEdit
              ? '#d1d5db'
              : '#f3f4f6',
          backgroundColor: canEdit ? '#ffffff' : '#f9fafb',
          paddingHorizontal: 12,
        }}
      >
        {LeadingIcon ? (
          <LeadingIcon size={16} color={hasError ? '#ef4444' : '#9ca3af'} style={{ marginRight: 8 }} />
        ) : null}

        <TextInput
          ref={ref}
          value={value}
          onChangeText={onChangeText}
          editable={canEdit}
          placeholder={placeholder}
          placeholderTextColor="#9ca3af"
          keyboardType={keyboardType || 'default'}
          autoCapitalize={autoCapitalize || 'sentences'}
          accessibilityLabel={accessibilityLabel || label}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          blurOnSubmit={returnKeyType === 'done'}
          textContentType={textContentType}
          style={{
            flex: 1,
            paddingVertical: 13,
            fontSize: 14,
            fontWeight: '600',
            color: canEdit ? '#111827' : '#4b5563',
          }}
        />

        {readOnly ? <Lock size={14} color="#9ca3af" /> : null}
      </View>

      {/* Inline error OR read-only hint */}
      {hasError ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 5 }}>
          <AlertCircle size={12} color="#ef4444" />
          <Text style={{ fontSize: 11, color: '#ef4444', fontWeight: '600', flex: 1 }}>{error}</Text>
        </View>
      ) : readOnly && readOnlyHint ? (
        <Text style={{ fontSize: 11, color: '#9ca3af', marginTop: 5 }}>{readOnlyHint}</Text>
      ) : null}
    </View>
  );
});

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
                  minHeight: 50,
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
  errors = {},
}: ProfileTabProps) {
  // Refs for "next field" keyboard chaining
  const firstNameRef = useRef<TextInput>(null);
  const lastNameRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);

  const handleInputChange = (field: keyof UserProfile, value: string) => {
    setEditedProfile({ ...editedProfile, [field]: value });
  };

  return (
    <View>
      {/* ── Personal Information ── */}
      <SectionCard title="Personal Information" icon={User} iconColor="#111827" delay={100}>
        <FormField
          ref={firstNameRef}
          label="First Name"
          value={editedProfile.firstName}
          onChangeText={(v) => handleInputChange('firstName', v)}
          isEditing={isEditing}
          placeholder="Enter your first name"
          autoCapitalize="words"
          textContentType="givenName"
          error={errors.firstName}
          returnKeyType="next"
          onSubmitEditing={() => lastNameRef.current?.focus()}
        />
        <FormField
          ref={lastNameRef}
          label="Last Name"
          value={editedProfile.lastName}
          onChangeText={(v) => handleInputChange('lastName', v)}
          isEditing={isEditing}
          placeholder="Enter your last name"
          autoCapitalize="words"
          textContentType="familyName"
          returnKeyType="next"
          onSubmitEditing={() => phoneRef.current?.focus()}
        />
        <FormField
          label="Email Address"
          value={editedProfile.email}
          onChangeText={(v) => handleInputChange('email', v)}
          isEditing={isEditing}
          placeholder="Enter your email address"
          keyboardType="email-address"
          autoCapitalize="none"
          leadingIcon={Mail}
          readOnly
          readOnlyHint="Your email is used to sign in and can't be changed here."
        />
        <FormField
          ref={phoneRef}
          label="Phone Number"
          value={editedProfile.phone}
          onChangeText={(v) => handleInputChange('phone', v)}
          isEditing={isEditing}
          placeholder="Enter your phone number"
          keyboardType="phone-pad"
          leadingIcon={Phone}
          textContentType="telephoneNumber"
          error={errors.phone}
          returnKeyType="done"
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
