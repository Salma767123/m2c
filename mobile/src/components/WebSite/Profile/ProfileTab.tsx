import React, { useRef, useEffect } from 'react';
import { View, Text, TextInput, Animated, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import {
  User,
  Info,
  ChevronRight,
  Mail,
  Phone,
  AlertCircle,
  Save,
  X,
  SquarePen,
  MessageCircle,
} from 'lucide-react-native';
import CountryCodeSelect from './CountryCodeSelect';
import type { UserProfile } from './types';
import { Palette, Fonts } from '@/constants/theme';

// Warm palette — 1:1 with the web ProfileTab.tsx so both clients read as one.
const WARM = {
  pageGround: '#faf7f3',
  cardBorder: '#efe4d8',
  rule: '#f2e9df',
  textMuted: '#5f5550',
  textSubtle: '#a89a8d',
  ink: '#1a1a1a',
  red: '#e01a1b',
  redDark: '#7a0f10',
  redLight: '#fdf3f0',
  disabledBg: '#faf7f3',
  disabledBorder: '#eee6dc',
  disabledText: '#5f5550',
} as const;

const TITLE_OPTIONS = ['Mr', 'Mrs', 'Ms', 'Miss', 'Mx', 'Dr'] as const;

interface ProfileTabProps {
  editedProfile: UserProfile;
  setEditedProfile: (profile: UserProfile) => void;
  isEditing: boolean;
  isSaving: boolean;
  errors?: Partial<Record<'firstName' | 'phone', string>>;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  /** Switches the account page to the Saved Addresses screen. */
  onGoToAddresses: () => void;
}

// ── Reusable Section Card ──
function SectionCard({
  title,
  icon: Icon,
  iconColor,
  showEditControls,
  isEditing,
  isSaving,
  onEdit,
  onSave,
  onCancel,
  children,
  delay = 0,
}: {
  title: string;
  icon: any;
  iconColor: string;
  showEditControls: boolean;
  isEditing: boolean;
  isSaving: boolean;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
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
  }, [fadeAnim, slideAnim, delay]);

  return (
    <Animated.View
      style={[
        styles.card,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
          backgroundColor: Palette.surface,
          borderColor: WARM.cardBorder,
          shadowColor: WARM.redDark,
        },
      ]}
    >
      {/* Card header — label + edit controls, just like the web ProfileTab. */}
      <View style={[styles.cardHeader, { borderBottomColor: WARM.rule }]}>
        <View>
          <View style={styles.cardHeaderLabel}>
            <View style={[styles.cardHeaderDot, { backgroundColor: WARM.red }]} />
            <Text style={[styles.cardHeaderLabelText, { color: WARM.textSubtle }]}>Personal information</Text>
          </View>
          <View style={styles.cardHeaderTitleRow}>
            <Icon size={20} color={iconColor} style={{ marginRight: 8 }} />
            <Text style={[styles.cardHeaderTitle, { color: Palette.ink }]}>{title}</Text>
          </View>
        </View>

        {showEditControls ? (
          !isEditing ? (
            <Pressable
              onPress={onEdit}
              accessibilityRole="button"
              accessibilityLabel="Edit profile"
              style={[styles.editBtn, { backgroundColor: WARM.redLight, borderColor: '#e8d2cb' }]}
            >
              <SquarePen size={16} color={WARM.redDark} />
              <Text style={[styles.editBtnText, { color: WARM.redDark }]}>Edit profile</Text>
            </Pressable>
          ) : (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Pressable
                onPress={onSave}
                disabled={isSaving}
                accessibilityRole="button"
                accessibilityLabel="Save changes"
                accessibilityState={{ disabled: isSaving }}
                style={[
                  styles.saveBtn,
                  { backgroundColor: WARM.red },
                  isSaving && { opacity: 0.6 },
                ]}
              >
                {isSaving ? (
                  <ActivityIndicator size={14} color={Palette.onPrimary} />
                ) : (
                  <Save size={16} color={Palette.onPrimary} />
                )}
                <Text style={[styles.saveBtnText, { color: Palette.onPrimary }]}>
                  {isSaving ? 'Saving…' : 'Save'}
                </Text>
              </Pressable>
              <Pressable
                onPress={onCancel}
                disabled={isSaving}
                accessibilityRole="button"
                accessibilityLabel="Cancel editing"
                style={[styles.cancelBtn, { borderColor: WARM.cardBorder }]}
              >
                <X size={16} color={WARM.textMuted} />
                <Text style={[styles.cancelBtnText, { color: WARM.textMuted }]}>Cancel</Text>
              </Pressable>
            </View>
          )
        ) : null}
      </View>

      <View style={styles.cardContent}>{children}</View>
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
  leadingIcon?: any;
  error?: string;
  returnKeyType?: 'next' | 'done';
  onSubmitEditing?: () => void;
  textContentType?:
    | 'none'
    | 'emailAddress'
    | 'telephoneNumber'
    | 'givenName'
    | 'middleName'
    | 'familyName';
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
    leadingIcon: LeadingIcon,
    error,
    returnKeyType,
    onSubmitEditing,
    textContentType,
  },
  ref,
) {
  const canEdit = isEditing;
  const hasError = !!error;

  return (
    <View style={{ marginBottom: isLast ? 0 : 16 }}>
      <Text style={[styles.fieldLabel, { color: canEdit ? WARM.textSubtle : WARM.textMuted }]}>
        {label}
      </Text>

      <View
        style={[
          styles.fieldRow,
          {
            borderColor: hasError ? WARM.red : canEdit ? '#d1d5db' : WARM.disabledBorder,
            backgroundColor: canEdit ? Palette.surface : WARM.disabledBg,
          },
        ]}
      >
        {LeadingIcon ? (
          <LeadingIcon size={16} color={hasError ? WARM.red : WARM.textSubtle} style={{ marginRight: 8 }} />
        ) : null}

        <TextInput
          ref={ref}
          value={value}
          onChangeText={onChangeText}
          editable={canEdit}
          placeholder={placeholder}
          placeholderTextColor={WARM.textSubtle}
          keyboardType={keyboardType || 'default'}
          autoCapitalize={autoCapitalize || 'sentences'}
          accessibilityLabel={accessibilityLabel || label}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          blurOnSubmit={returnKeyType === 'done'}
          textContentType={textContentType}
          style={[
            styles.fieldInput,
            { color: canEdit ? Palette.ink : WARM.disabledText },
          ]}
        />
      </View>

      {hasError ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 5 }}>
          <AlertCircle size={12} color={WARM.red} />
          <Text style={[styles.errorText, { color: WARM.red }]}>{error}</Text>
        </View>
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
      <Text style={[styles.fieldLabel, { color: WARM.textSubtle }]}>Gender</Text>
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
                style={[
                  styles.genderOption,
                  {
                    borderColor: active ? Palette.ink : isEditing ? '#d1d5db' : WARM.disabledBorder,
                    backgroundColor: active ? Palette.ink : isEditing ? Palette.surface : WARM.disabledBg,
                    opacity: !isEditing && !active ? 0.6 : 1,
                  },
                ]}
              >
                <Text style={[styles.genderOptionText, { color: active ? Palette.onPrimary : WARM.disabledText }]}>
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

function TitleSelector({
  value,
  onChange,
  isEditing,
}: {
  value: string;
  onChange: (v: string) => void;
  isEditing: boolean;
}) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={[styles.fieldLabel, { color: isEditing ? WARM.textSubtle : WARM.disabledText }]}>
        Title
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {TITLE_OPTIONS.map((opt) => {
          const active = value === opt;
          return (
            <Pressable
              key={opt}
              onPress={() => { if (isEditing) onChange(active ? '' : opt); }}
              disabled={!isEditing}
              accessibilityRole="radio"
              accessibilityState={{ selected: active, disabled: !isEditing }}
              accessibilityLabel={`Title ${opt}`}
            >
              <View
                style={[
                  styles.titleChip,
                  {
                    borderColor: active ? Palette.ink : isEditing ? '#d1d5db' : WARM.disabledBorder,
                    backgroundColor: active ? Palette.ink : isEditing ? Palette.surface : WARM.disabledBg,
                    opacity: !isEditing && !active ? 0.6 : 1,
                  },
                ]}
              >
                <Text style={[styles.titleChipText, { color: active ? Palette.onPrimary : WARM.disabledText }]}>
                  {opt}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** Renders a label + CountryCodeSelect + number input, matching the web's
 *  phone/WhatsApp field layout (country code on the left, number on the right). */
const PhoneField = React.forwardRef<TextInput, {
  label: string;
  icon: any;
  code: string;
  number: string;
  onCodeChange: (v: string) => void;
  onNumberChange: (v: string) => void;
  isEditing: boolean;
  isLast?: boolean;
  error?: string;
  placeholder: string;
  returnKeyType?: 'next' | 'done';
  onSubmitEditing?: () => void;
}>(function PhoneField(
  {
    label,
    icon: Icon,
    code,
    number,
    onCodeChange,
    onNumberChange,
    isEditing,
    isLast = false,
    error,
    placeholder,
    returnKeyType,
    onSubmitEditing,
  },
  ref,
) {
  const hasError = !!error;
  return (
    <View style={{ marginBottom: isLast ? 0 : 16 }}>
      <Text style={[styles.fieldLabel, { color: hasError ? WARM.red : isEditing ? WARM.textSubtle : WARM.disabledText }]}>
        {label}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'stretch' }}>
        {/* Country code selector — width-fixed, squared left, open right. */}
        <View style={{ width: 96, flexShrink: 0 }}>
          <CountryCodeSelect
            value={code || '+91'}
            onChange={onCodeChange}
            disabled={!isEditing}
          />
        </View>
        {/* Number input — drops left border/radius so the pair reads as one field. */}
        <View
          style={[
            styles.fieldRow,
            {
              borderLeftWidth: 0,
              borderTopLeftRadius: 0,
              borderBottomLeftRadius: 0,
              minWidth: 0,
              flex: 1,
              borderColor: hasError ? WARM.red : isEditing ? '#d1d5db' : WARM.disabledBorder,
              backgroundColor: isEditing ? Palette.surface : WARM.disabledBg,
            },
          ]}
        >
          <Icon size={16} color={hasError ? WARM.red : WARM.textSubtle} style={{ marginRight: 8, marginTop: 2 }} />
          <TextInput
            ref={ref}
            value={number}
            onChangeText={onNumberChange}
            editable={isEditing}
            placeholder={placeholder}
            placeholderTextColor={WARM.textSubtle}
            keyboardType="phone-pad"
            textContentType="telephoneNumber"
            returnKeyType={returnKeyType}
            onSubmitEditing={onSubmitEditing}
            style={[
              styles.fieldInput,
              styles.fieldInputNoBorder,
              { color: isEditing ? Palette.ink : WARM.disabledText, paddingLeft: 0 },
            ]}
          />
        </View>
      </View>
      {hasError ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 5 }}>
          <AlertCircle size={12} color={WARM.red} />
          <Text style={[styles.errorText, { color: WARM.red }]}>{error}</Text>
        </View>
      ) : null}
    </View>
  );
});

export default function ProfileTab({
  editedProfile,
  setEditedProfile,
  isEditing,
  isSaving,
  errors = {},
  onEdit,
  onSave,
  onCancel,
  onGoToAddresses,
}: ProfileTabProps) {
  // Refs for "next field" keyboard chaining
  const firstNameRef = useRef<TextInput>(null);
  const middleNameRef = useRef<TextInput>(null);
  const lastNameRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);
  const whatsappRef = useRef<TextInput>(null);

  const handleInputChange = (field: keyof UserProfile, value: string) => {
    setEditedProfile({ ...editedProfile, [field]: value });
  };

  return (
    <View>
      {/* ── Personal Information card — Edit/Save/Cancel on the header, like web */}
      <SectionCard
        title="Profile Information"
        icon={User}
        iconColor={Palette.primary}
        showEditControls
        isEditing={isEditing}
        isSaving={isSaving}
        onEdit={onEdit}
        onSave={onSave}
        onCancel={onCancel}
      >
        <TitleSelector
          value={editedProfile.title}
          onChange={(v) => handleInputChange('title', v)}
          isEditing={isEditing}
        />
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
          onSubmitEditing={() => middleNameRef.current?.focus()}
        />
        <FormField
          ref={middleNameRef}
          label="Middle Name"
          value={editedProfile.middleName}
          onChangeText={(v) => handleInputChange('middleName', v)}
          isEditing={isEditing}
          placeholder="Enter your middle name"
          autoCapitalize="words"
          textContentType="middleName"
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
          textContentType="emailAddress"
        />
        <PhoneField
          label="Phone Number"
          icon={Phone}
          code={editedProfile.phoneCode || '+91'}
          number={editedProfile.phone}
          onCodeChange={(v) => handleInputChange('phoneCode', v)}
          onNumberChange={(v) => handleInputChange('phone', v)}
          isEditing={isEditing}
          error={errors.phone}
          placeholder="Phone number"
          returnKeyType="next"
          onSubmitEditing={() => whatsappRef.current?.focus()}
        />
        <PhoneField
          ref={whatsappRef}
          label="WhatsApp Number"
          icon={MessageCircle}
          code={editedProfile.whatsappCode || '+91'}
          number={editedProfile.whatsapp || ''}
          onCodeChange={(v) => handleInputChange('whatsappCode', v)}
          onNumberChange={(v) => handleInputChange('whatsapp', v)}
          isEditing={isEditing}
          placeholder="WhatsApp number"
          returnKeyType="done"
        />
        <GenderSelector
          value={editedProfile.gender}
          onChange={(v) => handleInputChange('gender', v)}
          isEditing={isEditing}
        />
      </SectionCard>

      {/* ── Saved Addresses info box (matches web footnote) ── */}
      <Pressable
        onPress={onGoToAddresses}
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
            <Text style={{ fontFamily: Fonts.sansBold, fontSize: 13, fontWeight: '700', color: '#1e40af' }}>
              Looking for your shipping addresses?
            </Text>
            <Text style={{ fontFamily: Fonts.sans, fontSize: 12, color: '#3b82f6', marginTop: 1 }}>
              Manage your saved addresses here.
            </Text>
          </View>
          <ChevronRight size={18} color="#3b82f6" />
        </View>
      </Pressable>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 24,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 30,
    elevation: 2,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  cardHeaderLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  cardHeaderDot: {
    width: 5,
    height: 5,
    borderRadius: 4,
  },
  cardHeaderLabelText: {
    fontFamily: Fonts.sansBold,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  cardHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardHeaderTitle: {
    fontFamily: Fonts.sansBold,
    fontSize: 18,
    fontWeight: '700',
  },
  cardContent: {
    padding: 20,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingLeft: 16,
    paddingRight: 16,
    borderRadius: 24,
    borderWidth: 1,
  },
  editBtnText: {
    fontFamily: Fonts.sansSemibold,
    fontSize: 12,
    fontWeight: '600',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingLeft: 16,
    paddingRight: 16,
    borderRadius: 24,
  },
  saveBtnText: {
    fontFamily: Fonts.sansSemibold,
    fontSize: 12,
    fontWeight: '600',
  },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 10,
    paddingLeft: 16,
    paddingRight: 16,
    borderRadius: 24,
    borderWidth: 1,
  },
  cancelBtnText: {
    fontFamily: Fonts.sansSemibold,
    fontSize: 12,
    fontWeight: '600',
  },
  fieldLabel: {
    fontFamily: Fonts.sansBold,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 50,
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 12,
  },
  fieldInput: {
    flex: 1,
    paddingVertical: 13,
    fontFamily: Fonts.sansSemibold,
    fontSize: 14,
    fontWeight: '600',
  },
  fieldInputNoBorder: {
    borderWidth: 0,
    paddingHorizontal: 0,
    minHeight: '100%',
  },
  errorText: {
    fontFamily: Fonts.sansSemibold,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 5,
    flex: 1,
  },
  genderOption: {
    minHeight: 50,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  genderOptionText: {
    fontFamily: Fonts.sansBold,
    fontSize: 14,
    fontWeight: '700',
  },
  titleChip: {
    minHeight: 40,
    paddingHorizontal: 16,
    borderRadius: 24,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleChipText: {
    fontFamily: Fonts.sansBold,
    fontSize: 14,
    fontWeight: '700',
  },
});
