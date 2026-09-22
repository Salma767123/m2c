import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Animated,
  Pressable,
  Modal,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Mail,
  Phone,
  MessageCircle,
  MapPin,
  AlertCircle,
  Save,
  X,
  SquarePen,
  ChevronDown,
  Check,
} from 'lucide-react-native';
import CountryCodeSelect from './CountryCodeSelect';
import type { UserProfile } from './types';
import { Palette, Fonts } from '@/constants/theme';

// Warm palette — 1:1 with the web ProfileTab.tsx so both clients read as one.
const WARM = {
  cardBorder: '#efe4d8',
  rule: '#f2e9df',
  /** Field borders and the resting outline, warm rather than slate. */
  line: '#e6dcd0',
  textMuted: '#5f5550',
  textSubtle: '#a89a8d',
  ink: '#1a1a1a',
  red: '#e01a1b',
  redDeep: '#c41617',
  redDark: '#7a0f10',
  redLight: '#fdf3f0',
  disabledBg: '#faf7f3',
  disabledBorder: '#eee6dc',
  disabledText: '#5f5550',
} as const;

type Option = { value: string; label: string };

const TITLE_OPTIONS: Option[] = [
  { value: 'Mr', label: 'Mr' },
  { value: 'Mrs', label: 'Mrs' },
  { value: 'Ms', label: 'Ms' },
  { value: 'Miss', label: 'Miss' },
  { value: 'Dr', label: 'Dr' },
  { value: 'Mx', label: 'Mx' },
];

const GENDER_OPTIONS: Option[] = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
];

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

/**
 * The card header, matching the web's.
 *
 * The web lays the heading and the Edit control out with `flex-wrap
 * justify-between`, so at a phone's width the control drops onto its own line
 * beneath the heading. A phone is never anything but that width, so the two
 * are simply stacked here — the wrapped result is the layout, not a fallback.
 *
 * The eyebrow is a rule and a word in brand red, not a dot in grey: `h-px w-5
 * bg-[#c41617]` followed by `text-[#c41617]`.
 */
function CardHeader({
  isEditing,
  isSaving,
  onEdit,
  onSave,
  onCancel,
}: {
  isEditing: boolean;
  isSaving: boolean;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <View style={styles.cardHeader}>
      <View style={styles.eyebrowRow}>
        <View style={styles.eyebrowRule} />
        <Text style={styles.eyebrowText}>Personal information</Text>
      </View>

      {/* No icon beside the heading. The web sets the section with type alone,
          and an icon here would make this card the only one on the account
          page announcing itself twice. */}
      <Text style={styles.cardTitle}>Profile Information</Text>

      {!isEditing ? (
        <Pressable
          onPress={onEdit}
          accessibilityRole="button"
          accessibilityLabel="Edit profile"
          android_ripple={{ color: 'rgba(224,26,27,0.1)' }}
          style={styles.editBtn}
        >
          <SquarePen size={16} color={WARM.redDark} />
          <Text style={styles.editBtnText}>Edit profile</Text>
        </Pressable>
      ) : (
        <View style={styles.headerActions}>
          {/* Brand red, not green — green reads as a status colour here. */}
          <Pressable
            onPress={onSave}
            disabled={isSaving}
            accessibilityRole="button"
            accessibilityLabel="Save changes"
            accessibilityState={{ disabled: isSaving }}
            android_ripple={{ color: 'rgba(255,255,255,0.18)' }}
            style={[styles.saveBtn, isSaving && { opacity: 0.6 }]}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Save size={16} color="#ffffff" />
            )}
            <Text style={styles.saveBtnText}>{isSaving ? 'Saving…' : 'Save changes'}</Text>
          </Pressable>
          <Pressable
            onPress={onCancel}
            disabled={isSaving}
            accessibilityRole="button"
            accessibilityLabel="Cancel editing"
            android_ripple={{ color: 'rgba(15,23,42,0.06)' }}
            style={[styles.cancelBtn, isSaving && { opacity: 0.6 }]}
          >
            <X size={16} color={WARM.textMuted} />
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

// ── The card itself ──
function SectionCard({
  isEditing,
  isSaving,
  onEdit,
  onSave,
  onCancel,
  children,
  delay = 0,
}: {
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
      style={[styles.card, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
    >
      <CardHeader
        isEditing={isEditing}
        isSaving={isSaving}
        onEdit={onEdit}
        onSave={onSave}
        onCancel={onCancel}
      />
      <View style={styles.cardContent}>{children}</View>
    </Animated.View>
  );
}

/** One label for every control, so a dropdown and an input announce
 *  themselves identically: 13px semibold `#5f5550`, sentence case. */
function FieldLabel({ text, icon: Icon }: { text: string; icon?: any }) {
  return (
    <View style={styles.labelRow}>
      {Icon ? <Icon size={16} color={WARM.textSubtle} /> : null}
      <Text style={styles.labelText}>{text}</Text>
    </View>
  );
}

function FieldError({ message }: { message: string }) {
  return (
    <View style={styles.errorRow}>
      <AlertCircle size={13} color={WARM.red} />
      <Text style={styles.errorText}>{message}</Text>
    </View>
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
    leadingIcon: LeadingIcon,
    error,
    returnKeyType,
    onSubmitEditing,
    textContentType,
  },
  ref,
) {
  const hasError = !!error;

  return (
    <View>
      <FieldLabel text={label} icon={LeadingIcon} />

      <View
        style={[
          styles.fieldBox,
          !isEditing && styles.fieldBoxDisabled,
          hasError && { borderColor: WARM.red },
        ]}
      >
        <TextInput
          ref={ref}
          value={value}
          onChangeText={onChangeText}
          editable={isEditing}
          placeholder={placeholder}
          placeholderTextColor={WARM.textSubtle}
          keyboardType={keyboardType || 'default'}
          autoCapitalize={autoCapitalize || 'sentences'}
          accessibilityLabel={accessibilityLabel || label}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          blurOnSubmit={returnKeyType === 'done'}
          textContentType={textContentType}
          style={[styles.fieldInput, !isEditing && { color: WARM.disabledText }]}
        />
      </View>

      {hasError ? <FieldError message={error!} /> : null}
    </View>
  );
});

/**
 * A select that looks exactly like the inputs beside it.
 *
 * The web uses its Dropdown here and mobile used chips and a segmented
 * control — which meant Title took six chips and a whole row of its own, and
 * Gender three more, where the web spends one field-height each. Chips also
 * made a locked form look interactive: six outlined pills read as buttons even
 * when nothing can be pressed.
 *
 * The options open in a sheet rather than an anchored menu, because that is
 * how a phone picks from a list — and it keeps the choices clear of the
 * keyboard, which an inline menu under a field would not.
 */
function SelectField({
  label,
  value,
  options,
  onChange,
  isEditing,
  placeholder,
}: {
  label: string;
  value: string;
  options: Option[];
  onChange: (v: string) => void;
  isEditing: boolean;
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const insets = useSafeAreaInsets();

  const selected = options.find((o) => o.value === value);

  return (
    <View>
      <FieldLabel text={label} />

      <Pressable
        onPress={() => { if (isEditing) setOpen(true); }}
        disabled={!isEditing}
        accessibilityRole="button"
        accessibilityLabel={`${label}${selected ? `, ${selected.label}` : ''}`}
        accessibilityState={{ expanded: open, disabled: !isEditing }}
        android_ripple={isEditing ? { color: 'rgba(15,23,42,0.05)' } : undefined}
        style={[styles.fieldBox, styles.selectBox, !isEditing && styles.fieldBoxDisabled]}
      >
        <Text
          style={[
            styles.fieldInput,
            !selected && { color: WARM.textSubtle },
            !isEditing && selected && { color: WARM.disabledText },
          ]}
          numberOfLines={1}
        >
          {selected ? selected.label : placeholder}
        </Text>
        <ChevronDown size={18} color={isEditing ? WARM.textMuted : WARM.textSubtle} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable
          style={styles.sheetBackdrop}
          accessibilityRole="button"
          accessibilityLabel="Close"
          onPress={() => setOpen(false)}
        />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 12 }]}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>{label}</Text>

          <ScrollView bounces={false} style={{ maxHeight: 340 }}>
            {options.map((opt) => {
              const active = opt.value === value;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={opt.label}
                  android_ripple={{ color: 'rgba(224,26,27,0.08)' }}
                  style={[styles.sheetRow, active && { backgroundColor: WARM.redLight }]}
                >
                  <Text style={[styles.sheetRowText, active && { color: WARM.redDark }]}>
                    {opt.label}
                  </Text>
                  {active ? <Check size={18} color={WARM.red} strokeWidth={2.4} /> : null}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

/** Label + CountryCodeSelect + number, drawn as one field: the code sits
 *  inside the same box as the digits rather than in a box of its own. */
const PhoneField = React.forwardRef<TextInput, {
  label: string;
  icon: any;
  code: string;
  number: string;
  onCodeChange: (v: string) => void;
  onNumberChange: (v: string) => void;
  isEditing: boolean;
  error?: string;
  placeholder: string;
  returnKeyType?: 'next' | 'done';
  onSubmitEditing?: () => void;
}>(function PhoneField(
  {
    label,
    icon,
    code,
    number,
    onCodeChange,
    onNumberChange,
    isEditing,
    error,
    placeholder,
    returnKeyType,
    onSubmitEditing,
  },
  ref,
) {
  const hasError = !!error;
  return (
    <View>
      <FieldLabel text={label} icon={icon} />

      <View
        style={[
          styles.fieldBox,
          styles.phoneWrap,
          !isEditing && styles.fieldBoxDisabled,
          hasError && { borderColor: WARM.red },
        ]}
      >
        {/* Bare: the wrapper above already draws the border and the radius. */}
        <CountryCodeSelect value={code || '+91'} onChange={onCodeChange} disabled={!isEditing} bare />

        <View
          style={[
            styles.phoneDivider,
            { backgroundColor: hasError ? WARM.red : isEditing ? WARM.line : WARM.disabledBorder },
          ]}
        />

        {/* The dial code already says this is a phone number, so the glyph that
            used to sit here is gone — on a 360dp screen it was taking width off
            the digits, which are the part that has to be readable. */}
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
          style={[styles.phoneInput, !isEditing && { color: WARM.disabledText }]}
          accessibilityLabel={label}
        />
      </View>

      {hasError ? <FieldError message={error!} /> : null}
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
  const emailRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);
  const whatsappRef = useRef<TextInput>(null);

  const handleInputChange = (field: keyof UserProfile, value: string) => {
    setEditedProfile({ ...editedProfile, [field]: value });
  };

  return (
    <View>
      <SectionCard
        isEditing={isEditing}
        isSaving={isSaving}
        onEdit={onEdit}
        onSave={onSave}
        onCancel={onCancel}
      >
        {/* Field order follows the web exactly: the two dropdowns bracket the
            three names, then the contact details. Gender used to sit last,
            after the phone numbers, which split the name group in two. */}
        <SelectField
          label="Title"
          value={editedProfile.title || ''}
          options={TITLE_OPTIONS}
          onChange={(v) => handleInputChange('title', v)}
          isEditing={isEditing}
          placeholder="Title"
        />
        <FormField
          ref={firstNameRef}
          label="First name"
          value={editedProfile.firstName}
          onChangeText={(v) => handleInputChange('firstName', v)}
          isEditing={isEditing}
          placeholder="First name"
          autoCapitalize="words"
          textContentType="givenName"
          error={errors.firstName}
          returnKeyType="next"
          onSubmitEditing={() => middleNameRef.current?.focus()}
        />
        <FormField
          ref={middleNameRef}
          label="Middle name"
          value={editedProfile.middleName}
          onChangeText={(v) => handleInputChange('middleName', v)}
          isEditing={isEditing}
          placeholder="Middle name"
          autoCapitalize="words"
          textContentType="middleName"
          returnKeyType="next"
          onSubmitEditing={() => lastNameRef.current?.focus()}
        />
        <FormField
          ref={lastNameRef}
          label="Last name"
          value={editedProfile.lastName}
          onChangeText={(v) => handleInputChange('lastName', v)}
          isEditing={isEditing}
          placeholder="Last name"
          autoCapitalize="words"
          textContentType="familyName"
          returnKeyType="next"
          onSubmitEditing={() => emailRef.current?.focus()}
        />
        <SelectField
          label="Gender"
          value={editedProfile.gender}
          options={GENDER_OPTIONS}
          onChange={(v) => handleInputChange('gender', v)}
          isEditing={isEditing}
          placeholder="Select gender"
        />
        <FormField
          ref={emailRef}
          label="Email address"
          value={editedProfile.email}
          onChangeText={(v) => handleInputChange('email', v)}
          isEditing={isEditing}
          placeholder="Enter your email address"
          keyboardType="email-address"
          autoCapitalize="none"
          leadingIcon={Mail}
          textContentType="emailAddress"
          returnKeyType="next"
          onSubmitEditing={() => phoneRef.current?.focus()}
        />
        <PhoneField
          ref={phoneRef}
          label="Phone number"
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
          label="WhatsApp number"
          icon={MessageCircle}
          code={editedProfile.whatsappCode || '+91'}
          number={editedProfile.whatsapp || ''}
          onCodeChange={(v) => handleInputChange('whatsappCode', v)}
          onNumberChange={(v) => handleInputChange('whatsapp', v)}
          isEditing={isEditing}
          placeholder="WhatsApp number"
          returnKeyType="done"
        />
      </SectionCard>

      {/* ── Footnote ──
          On the page ground, outside the card, as the web has it. It was a
          bootstrap-blue alert box — the only blue on the page — which gave a
          pointer to another screen more weight than it earns and made it look
          like something you had to read before saving. */}
      <View style={styles.footnote}>
        <MapPin size={14} color={WARM.textSubtle} style={{ marginTop: 2 }} />
        <View style={{ flex: 1 }}>
          <Text style={styles.footnoteTitle}>Looking for your shipping addresses?</Text>
          <Text style={styles.footnoteBody}>
            Manage your saved addresses in the{' '}
            <Text
              style={styles.footnoteLink}
              accessibilityRole="button"
              accessibilityLabel="Go to Saved Addresses"
              onPress={onGoToAddresses}
            >
              Saved Addresses
            </Text>{' '}
            tab.
          </Text>
        </View>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: WARM.cardBorder,
    backgroundColor: Palette.surface,
    shadowColor: '#4a3226',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 30,
    // Android paints elevation only.
    elevation: 2,
  },

  cardHeader: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: WARM.rule,
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  /* `h-px w-5 bg-[#c41617]` */
  eyebrowRule: {
    width: 20,
    height: 1,
    backgroundColor: WARM.redDeep,
  },
  eyebrowText: {
    fontFamily: Fonts.sansSemibold,
    fontSize: 11,
    fontWeight: '600',
    // 0.18em at 11px.
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: WARM.redDeep,
  },
  cardTitle: {
    fontFamily: Fonts.heading,
    fontSize: 22,
    // Poppins_600SemiBold is the loaded file — the weight must name it.
    fontWeight: '600',
    letterSpacing: -0.5,
    color: WARM.ink,
  },

  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
  },
  editBtn: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#e8d2cb',
    backgroundColor: WARM.redLight,
    overflow: 'hidden',
  },
  editBtnText: {
    fontFamily: Fonts.sansSemibold,
    fontSize: 13,
    fontWeight: '600',
    color: WARM.redDark,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: WARM.red,
    overflow: 'hidden',
    shadowColor: WARM.red,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 3,
  },
  saveBtnText: {
    fontFamily: Fonts.sansSemibold,
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
  },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: WARM.line,
    backgroundColor: Palette.surface,
    overflow: 'hidden',
  },
  cancelBtnText: {
    fontFamily: Fonts.sansSemibold,
    fontSize: 13,
    fontWeight: '600',
    color: WARM.textMuted,
  },

  /* `gap-5` between fields. */
  cardContent: {
    padding: 16,
    gap: 20,
  },

  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  labelText: {
    fontFamily: Fonts.sansSemibold,
    fontSize: 13,
    fontWeight: '600',
    color: WARM.textMuted,
  },

  /* `rounded-xl border border-[#e6dcd0] bg-white px-4 py-3 text-[15px]` */
  fieldBox: {
    minHeight: 50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: WARM.line,
    backgroundColor: Palette.surface,
    paddingHorizontal: 16,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  fieldBoxDisabled: {
    borderColor: WARM.disabledBorder,
    backgroundColor: WARM.disabledBg,
  },
  fieldInput: {
    flex: 1,
    paddingVertical: 12,
    fontFamily: Fonts.sans,
    fontSize: 15,
    color: WARM.ink,
  },
  selectBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  phoneWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 0,
  },
  phoneDivider: { width: 1, alignSelf: 'stretch', marginVertical: 8 },
  phoneInput: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: Fonts.sans,
    fontSize: 15,
    color: WARM.ink,
    // The digits are the point of this field; letting them track a little
    // makes a 10-digit number scannable rather than a run of glyphs.
    letterSpacing: 0.3,
  },

  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 6,
  },
  errorText: {
    fontFamily: Fonts.sansSemibold,
    fontSize: 12,
    fontWeight: '600',
    color: WARM.red,
    flex: 1,
  },

  sheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(26,20,22,0.45)',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Palette.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#e2d8cc',
    marginBottom: 14,
  },
  sheetTitle: {
    fontFamily: Fonts.heading,
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.3,
    color: WARM.ink,
    marginBottom: 10,
  },
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 52,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  sheetRowText: {
    fontFamily: Fonts.sansMedium,
    fontSize: 15,
    fontWeight: '500',
    color: WARM.ink,
  },

  footnote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginHorizontal: 20,
    marginTop: 12,
  },
  footnoteTitle: {
    fontFamily: Fonts.sansSemibold,
    fontSize: 13,
    fontWeight: '600',
    color: WARM.ink,
  },
  footnoteBody: {
    fontFamily: Fonts.sans,
    fontSize: 13,
    lineHeight: 20,
    color: '#7a6d62',
  },
  footnoteLink: {
    fontFamily: Fonts.sansSemibold,
    fontWeight: '600',
    color: WARM.redDark,
    textDecorationLine: 'underline',
  },
});
