import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TextInput, ScrollView, Pressable, Modal, ActivityIndicator } from 'react-native';
import { X, Home, Briefcase, MapPin, ChevronDown, Check, Search } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CountrySelect from '../CheckOut/CheckoutProcess/CountrySelect';
import {
  NAME_REGEX,
  DEFAULT_COUNTRY_ISO,
  getCountry,
  getStates,
  getPostalRule,
  validatePostalCode,
  validatePhone,
  formatPhoneAsYouType,
  getPhoneExample,
  normalizeCountryToIso,
  toE164,
} from '../CheckOut/CheckoutProcess/constants';
import type { SavedAddress, AddressPayload, AddressType } from '@/services/addressService';
import { Fonts } from '@/constants/theme';

/**
 * Warm palette and brand faces, matching the rest of the account screens.
 *
 * Every string in this form was set with a bare `fontSize` and no
 * `fontFamily`, so on Android the whole sheet rendered in Roboto while the
 * screen that opened it rendered in Outfit. The colours were slate — #111827,
 * #374151, #e2e8f0, #f8fafc — against a storefront that is linen and oxblood.
 */
const WARM = {
  ink: '#1a1a1a',
  body: '#5f5550',
  subtle: '#a89a8d',
  line: '#e6dcd0',
  lineSoft: '#eee6dc',
  ground: '#faf7f3',
  red: '#e01a1b',
} as const;

interface AddressFormModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: AddressPayload) => Promise<void>;
  editing?: SavedAddress | null;
  hasNoAddressesYet: boolean;
}

type FormState = {
  type: AddressType;
  name: string;
  phone: string;
  /** Optional extra contacts the backend has always stored — the web collects
   *  both (Profile/AddressFormModal.tsx); mobile did not, so a courier calling
   *  ahead only ever had the one number. */
  phone2: string;
  landline: string;
  address: string;
  addressLine2: string;
  country: string;
  city: string;
  state: string;
  zipCode: string;
  isDefault: boolean;
};

type Touched = Partial<Record<keyof FormState, boolean>>;

const TYPE_OPTIONS: { value: AddressType; label: string; icon: typeof Home }[] = [
  { value: 'home', label: 'Home', icon: Home },
  { value: 'work', label: 'Work', icon: Briefcase },
  { value: 'other', label: 'Other', icon: MapPin },
];

const emptyForm: FormState = {
  type: 'home',
  name: '',
  phone: '',
  phone2: '',
  landline: '',
  address: '',
  addressLine2: '',
  country: DEFAULT_COUNTRY_ISO,
  city: '',
  state: '',
  zipCode: '',
  isDefault: false,
};

export default function AddressFormModal({
  open,
  onClose,
  onSubmit,
  editing,
  hasNoAddressesYet,
}: AddressFormModalProps) {
  const insets = useSafeAreaInsets();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [touched, setTouched] = useState<Touched>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [statePickerVisible, setStatePickerVisible] = useState(false);
  const [stateSearch, setStateSearch] = useState('');

  // ── Country-derived values ───────────────────────────────────────────────
  const countryIso = (form.country || DEFAULT_COUNTRY_ISO).toUpperCase();
  const country = useMemo(() => getCountry(countryIso), [countryIso]);
  const states = useMemo(() => getStates(countryIso), [countryIso]);
  const hasStateList = states.length > 0;
  const postalRule = useMemo(() => getPostalRule(countryIso), [countryIso]);
  const phoneExample = useMemo(() => getPhoneExample(countryIso), [countryIso]);

  useEffect(() => {
    if (!open) return;
    setTouched({});
    setSubmitError(null);
    if (editing) {
      const iso = normalizeCountryToIso(editing.country);
      setForm({
        type: editing.type,
        name: editing.name || '',
        phone: editing.phone ? formatPhoneAsYouType(editing.phone, iso) : '',
        phone2: editing.phone2 ? formatPhoneAsYouType(editing.phone2, iso) : '',
        landline: editing.landline || '',
        address: editing.address || '',
        addressLine2: editing.addressLine2 || '',
        country: iso,
        city: editing.city || '',
        state: editing.state || '',
        zipCode: editing.zipCode || '',
        isDefault: editing.isDefault,
      });
    } else {
      setForm({ ...emptyForm, isDefault: hasNoAddressesYet });
    }
  }, [open, editing, hasNoAddressesYet]);

  // When country changes, clear a state that's no longer valid for the new country
  useEffect(() => {
    if (!form.state) return;
    if (hasStateList && !states.some((s) => s.isoCode === form.state)) {
      setForm((prev) => ({ ...prev, state: '' }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countryIso]);

  // ── Validation ──
  const errors: Partial<Record<keyof FormState, string>> = {};
  if (!form.name.trim()) errors.name = 'Full name is required';
  else if (form.name.trim().length < 2 || form.name.trim().length > 80) errors.name = 'Name must be 2-80 characters';
  else if (!NAME_REGEX.test(form.name.trim())) errors.name = 'Letters, spaces, hyphens only';

  if (!form.phone.trim()) errors.phone = 'Phone number is required';
  else if (!validatePhone(form.phone, countryIso)) {
    errors.phone = `Enter a valid phone number for ${country?.name ?? 'the selected country'}`;
  }

  // Both optional: empty is always valid, but a value that IS entered has to be
  // usable — a half-typed alternate number is worse than none, because a courier
  // would try it.
  if (form.phone2.trim() && !validatePhone(form.phone2, countryIso)) {
    errors.phone2 = `Enter a valid phone number for ${country?.name ?? 'the selected country'}`;
  }

  // Landline stays free-form (digits, spaces, hyphens, brackets, optional +) to
  // match the backend's own description of the column — national landline
  // formats vary too much for libphonenumber to be helpful here.
  if (form.landline.trim() && !/^\+?[\d\s\-()]{6,20}$/.test(form.landline.trim())) {
    errors.landline = 'Enter a valid landline number';
  }

  if (!form.address.trim()) errors.address = 'Address is required';
  else if (form.address.trim().length < 3 || form.address.trim().length > 100) errors.address = 'Address must be 3-100 characters';

  if (form.addressLine2 && form.addressLine2.length > 100) errors.addressLine2 = 'Must be 100 characters or less';

  if (!form.country) errors.country = 'Select a country';

  if (!form.city.trim()) errors.city = 'City is required';
  else if (form.city.trim().length < 2 || form.city.trim().length > 50) errors.city = 'City must be 2-50 characters';

  if (hasStateList) {
    if (!form.state) errors.state = 'Select a state / province';
  } else if (!form.state.trim()) {
    errors.state = 'State / region is required';
  }

  if (!form.zipCode.trim()) errors.zipCode = `${postalRule.label} is required`;
  else if (!validatePostalCode(form.zipCode, countryIso)) {
    errors.zipCode = `Enter a valid ${postalRule.label.toLowerCase()} (e.g. ${postalRule.placeholder})`;
  }

  const isValid = Object.keys(errors).length === 0;

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleBlur = (field: keyof FormState) => {
    setTouched((t) => ({ ...t, [field]: true }));
    const v = form[field];
    if (typeof v === 'string') {
      setField(field, v.trim() as any);
    }
  };

  const handleSubmit = async () => {
    const allTouched: Touched = {};
    (Object.keys(form) as (keyof FormState)[]).forEach((k) => { allTouched[k] = true; });
    setTouched(allTouched);
    if (!isValid || submitting) return;

    try {
      setSubmitting(true);
      setSubmitError(null);
      await onSubmit({
        type: form.type,
        name: form.name.trim(),
        phone: toE164(form.phone, form.country),
        // Omitted rather than sent empty, so clearing a field actually clears it
        // instead of storing "".
        phone2: form.phone2.trim() ? toE164(form.phone2, form.country) : undefined,
        landline: form.landline.trim() || undefined,
        address: form.address.trim(),
        addressLine2: form.addressLine2.trim() || undefined,
        city: form.city.trim(),
        state: form.state.trim(),
        zipCode: form.zipCode.trim(),
        country: form.country,
        isDefault: form.isDefault,
      });
    } catch (err: any) {
      setSubmitError(err?.message || 'Failed to save address');
    } finally {
      setSubmitting(false);
    }
  };

  const fieldError = (k: keyof FormState) => (touched[k] && errors[k] ? errors[k] : undefined);

  const editingCurrentDefault = !!editing && editing.isDefault;
  const lockedDefault = hasNoAddressesYet || editingCurrentDefault;

  const selectedStateName = states.find((s) => s.isoCode === form.state)?.name || '';
  const filteredStates = stateSearch
    ? states.filter(
        (s) =>
          s.name.toLowerCase().includes(stateSearch.toLowerCase()) ||
          s.isoCode.toLowerCase().includes(stateSearch.toLowerCase()),
      )
    : states;

  return (
    <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: '#fff' }}>
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 16,
            paddingTop: insets.top + 8,
            paddingBottom: 14,
            borderBottomWidth: 1,
            borderBottomColor: '#e5e7eb',
            backgroundColor: '#f9fafb',
          }}
        >
          <Text style={{ fontFamily: Fonts.heading, fontSize: 20, fontWeight: '600', letterSpacing: -0.4, color: WARM.ink }}>
            {editing ? 'Edit Address' : 'Add New Address'}
          </Text>
          <Pressable onPress={onClose} disabled={submitting} accessibilityRole="button" accessibilityLabel="Close" hitSlop={4}>
            <View style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
              <X size={20} color="#6b7280" />
            </View>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 18 }} showsVerticalScrollIndicator={false}>
          {/* Address Type */}
          <View>
            <FieldLabel label="Address Type" required />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {TYPE_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const active = form.type === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    onPress={() => setField('type', opt.value)}
                    disabled={submitting}
                    accessibilityRole="button"
                    accessibilityLabel={`${opt.label} address type`}
                    accessibilityState={{ selected: active }}
                    style={{ flex: 1 }}
                  >
                    {/* `border-[#e01a1b] bg-red-50/40 text-[#c41617]` when
                        selected — the same selected-chip the wallet's payout
                        method toggle uses. It was a 2px near-black outline on
                        a near-white fill, which reads as disabled rather than
                        chosen. */}
                    <View style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      paddingVertical: 13,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: active ? WARM.red : WARM.line,
                      backgroundColor: active ? '#fdf3f0' : '#ffffff',
                    }}>
                      <Icon size={16} color={active ? '#7a0f10' : WARM.subtle} />
                      <Text style={{ fontFamily: Fonts.sansSemibold, fontSize: 13, fontWeight: '600', color: active ? '#7a0f10' : WARM.body }}>{opt.label}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Country */}
          <View>
            <FieldLabel label="Country" required />
            <CountrySelect
              value={countryIso}
              onChange={(iso) => { setField('country', iso); setTouched((t) => ({ ...t, country: true })); }}
              onBlur={() => setTouched((t) => ({ ...t, country: true }))}
              invalid={!!fieldError('country')}
              disabled={submitting}
              accessibilityLabel="Country, required"
            />
            <ErrorText text={fieldError('country')} />
          </View>

          {/* Full Name */}
          <View>
            <FieldLabel label="Full Name" required />
            <FormInput
              value={form.name}
              onChangeText={(t) => setField('name', t)}
              onBlur={() => handleBlur('name')}
              placeholder="John Doe"
              autoCapitalize="words"
              accessibilityLabel="Full name, required"
              hasError={!!fieldError('name')}
            />
            <ErrorText text={fieldError('name')} />
          </View>

          {/* Phone */}
          <View>
            <FieldLabel label="Phone" required />
            <FormInput
              value={form.phone}
              onChangeText={(t) => setField('phone', formatPhoneAsYouType(t, countryIso))}
              onBlur={() => handleBlur('phone')}
              placeholder={phoneExample || 'Phone number'}
              keyboardType="phone-pad"
              accessibilityLabel="Phone number, required"
              hasError={!!fieldError('phone')}
            />
            <ErrorText text={fieldError('phone')} />
          </View>

          {/* Secondary phone — optional, same country rules as the primary. */}
          <View>
            <FieldLabel label="Secondary Phone (Optional)" />
            <FormInput
              value={form.phone2}
              onChangeText={(t) => setField('phone2', formatPhoneAsYouType(t, countryIso))}
              onBlur={() => handleBlur('phone2')}
              placeholder={phoneExample || 'Alternate number'}
              keyboardType="phone-pad"
              accessibilityLabel="Secondary phone number, optional"
              hasError={!!fieldError('phone2')}
            />
            <ErrorText text={fieldError('phone2')} />
          </View>

          {/* Landline — optional, free-form. */}
          <View>
            <FieldLabel label="Landline (Optional)" />
            <FormInput
              value={form.landline}
              onChangeText={(t) => setField('landline', t)}
              onBlur={() => handleBlur('landline')}
              placeholder="e.g. 044 2345 6789"
              keyboardType="phone-pad"
              accessibilityLabel="Landline number, optional"
              hasError={!!fieldError('landline')}
            />
            <ErrorText text={fieldError('phone')} />
          </View>

          {/* Address Line 1 */}
          <View>
            <FieldLabel label="Address Line 1" required />
            <FormInput
              value={form.address}
              onChangeText={(t) => setField('address', t)}
              onBlur={() => handleBlur('address')}
              placeholder="123 Main Street"
              accessibilityLabel="Address line 1, required"
              hasError={!!fieldError('address')}
            />
            <ErrorText text={fieldError('address')} />
          </View>

          {/* Address Line 2 */}
          <View>
            <FieldLabel label="Address Line 2 (Optional)" />
            <FormInput
              value={form.addressLine2}
              onChangeText={(t) => setField('addressLine2', t)}
              onBlur={() => handleBlur('addressLine2')}
              placeholder="Apt, Suite, Unit, etc."
              accessibilityLabel="Address line 2, optional"
              hasError={!!fieldError('addressLine2')}
            />
            <ErrorText text={fieldError('addressLine2')} />
          </View>

          {/* City */}
          <View>
            <FieldLabel label="City" required />
            <FormInput
              value={form.city}
              onChangeText={(t) => setField('city', t)}
              onBlur={() => handleBlur('city')}
              placeholder="City"
              accessibilityLabel="City, required"
              hasError={!!fieldError('city')}
            />
            <ErrorText text={fieldError('city')} />
          </View>

          {/* State + Postal */}
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <FieldLabel label={hasStateList ? 'State / Province' : 'State / Region'} required />
              {hasStateList ? (
                <Pressable
                  onPress={() => { setStatePickerVisible(true); setStateSearch(''); }}
                  accessibilityRole="button"
                  accessibilityLabel="Select state or province"
                >
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 14,
                    paddingVertical: 14,
                    minHeight: 48,
                    borderWidth: 1.5,
                    borderColor: fieldError('state') ? '#E01A1B' : '#e2e8f0',
                    borderRadius: 12,
                    backgroundColor: '#f8fafc',
                  }}>
                    <Text style={{ flex: 1, fontFamily: Fonts.sans, fontSize: 15, color: form.state ? WARM.ink : WARM.subtle }}>
                      {form.state ? selectedStateName || form.state : 'Select State'}
                    </Text>
                    <ChevronDown size={16} color="#6b7280" />
                  </View>
                </Pressable>
              ) : (
                <FormInput
                  value={form.state}
                  onChangeText={(t) => setField('state', t)}
                  onBlur={() => handleBlur('state')}
                  placeholder="State / Region"
                  accessibilityLabel="State or region, required"
                  hasError={!!fieldError('state')}
                />
              )}
              <ErrorText text={fieldError('state')} />
            </View>
            <View style={{ flex: 1 }}>
              <FieldLabel label={postalRule.label} required />
              <FormInput
                value={form.zipCode}
                onChangeText={(t) => setField('zipCode', t)}
                onBlur={() => handleBlur('zipCode')}
                placeholder={postalRule.placeholder}
                autoCapitalize="characters"
                maxLength={12}
                accessibilityLabel={`${postalRule.label}, required`}
                hasError={!!fieldError('zipCode')}
              />
              <ErrorText text={fieldError('zipCode')} />
            </View>
          </View>

          {/* Default toggle */}
          <Pressable
            onPress={() => { if (!lockedDefault) setField('isDefault', !form.isDefault); }}
            disabled={submitting || lockedDefault}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: lockedDefault ? true : form.isDefault }}
            accessibilityLabel="Set as default shipping address"
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 }}>
              <View style={{
                width: 22, height: 22, borderRadius: 6,
                borderWidth: 2,
                borderColor: (lockedDefault || form.isDefault) ? '#111827' : '#cbd5e1',
                backgroundColor: (lockedDefault || form.isDefault) ? '#111827' : '#fff',
                alignItems: 'center', justifyContent: 'center',
                opacity: lockedDefault ? 0.6 : 1,
              }}>
                {(lockedDefault || form.isDefault) ? <Check size={14} color="#fff" strokeWidth={3} /> : null}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: Fonts.sansMedium, fontSize: 14, fontWeight: '500', color: WARM.ink }}>Set as default shipping address</Text>
                {hasNoAddressesYet ? (
                  <Text style={{ fontFamily: Fonts.sans, fontSize: 11.5, lineHeight: 16, color: WARM.subtle, marginTop: 3 }}>Your first address is always the default.</Text>
                ) : editingCurrentDefault ? (
                  <Text style={{ fontFamily: Fonts.sans, fontSize: 11.5, lineHeight: 16, color: WARM.subtle, marginTop: 3 }}>This is your current default. Set another address as default to change it.</Text>
                ) : null}
              </View>
            </View>
          </Pressable>

          {/* Submit error */}
          {submitError ? (
            <View style={{ backgroundColor: '#E01A1B', borderWidth: 1, borderColor: '#E01A1B', borderRadius: 12, padding: 12 }}>
              <Text style={{ fontFamily: Fonts.sansSemibold, fontSize: 13, fontWeight: '600', color: WARM.red }}>{submitError}</Text>
            </View>
          ) : null}
        </ScrollView>

        {/* Footer */}
        <View
          style={{
            flexDirection: 'row',
            gap: 12,
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: Math.max(insets.bottom, 16),
            borderTopWidth: 1,
            borderTopColor: '#e5e7eb',
            backgroundColor: '#fff',
          }}
        >
          <Pressable onPress={onClose} disabled={submitting} accessibilityRole="button" accessibilityLabel="Cancel" style={{ flex: 1 }}>
            <View style={{ height: 52, borderRadius: 14, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', opacity: submitting ? 0.5 : 1 }}>
              <Text style={{ fontFamily: Fonts.sansSemibold, fontSize: 15, fontWeight: '600', color: WARM.body }}>Cancel</Text>
            </View>
          </Pressable>
          <Pressable onPress={handleSubmit} disabled={submitting} accessibilityRole="button" accessibilityLabel={editing ? 'Save changes' : 'Add address'} style={{ flex: 1.5 }}>
            <View style={{ height: 52, borderRadius: 14, backgroundColor: submitting ? '#9ca3af' : '#111827', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              {submitting ? <ActivityIndicator size="small" color="#fff" /> : null}
              <Text style={{ fontFamily: Fonts.sansSemibold, fontSize: 15, fontWeight: '600', color: '#ffffff' }}>
                {editing ? 'Save Changes' : 'Add Address'}
              </Text>
            </View>
          </Pressable>
        </View>

        {/* State Picker Modal */}
        <Modal visible={statePickerVisible} animationType="slide" presentationStyle="pageSheet">
          <View style={{ flex: 1, backgroundColor: '#fff' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: insets.top + 8, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' }}>
              <Text style={{ fontFamily: Fonts.heading, fontSize: 17, fontWeight: '600', letterSpacing: -0.3, color: WARM.ink }}>
                Select State {country ? `· ${country.name}` : ''}
              </Text>
              <Pressable onPress={() => setStatePickerVisible(false)} accessibilityRole="button" accessibilityLabel="Close state picker" hitSlop={4}>
                <View style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
                  <X size={20} color="#6b7280" />
                </View>
              </Pressable>
            </View>
            <View style={{ paddingHorizontal: 16, paddingVertical: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#f3f4f6', borderRadius: 12, paddingHorizontal: 12, height: 44, gap: 8 }}>
                <Search size={16} color="#9ca3af" />
                <TextInput
                  value={stateSearch}
                  onChangeText={setStateSearch}
                  placeholder="Search states..."
                  placeholderTextColor="#9ca3af"
                  autoFocus
                  style={{ flex: 1, fontFamily: Fonts.sans, fontSize: 15, color: WARM.ink }}
                />
              </View>
            </View>
            <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
              {filteredStates.map((state) => {
                const isSelected = form.state === state.isoCode;
                return (
                  <Pressable
                    key={state.isoCode}
                    onPress={() => {
                      setField('state', state.isoCode);
                      setTouched((t) => ({ ...t, state: true }));
                      setStatePickerVisible(false);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`${state.name} (${state.isoCode})`}
                    accessibilityState={{ selected: isSelected }}
                  >
                    <View style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingHorizontal: 20,
                      paddingVertical: 14,
                      backgroundColor: isSelected ? '#f0f9ff' : '#fff',
                      borderBottomWidth: 1,
                      borderBottomColor: '#f3f4f6',
                    }}>
                      <View>
                        <Text style={{ fontFamily: isSelected ? Fonts.sansSemibold : Fonts.sansMedium, fontSize: 15, fontWeight: isSelected ? '600' : '500', color: isSelected ? '#7a0f10' : WARM.ink }}>{state.name}</Text>
                        <Text style={{ fontFamily: Fonts.sans, fontSize: 12, color: WARM.subtle, marginTop: 2 }}>{state.isoCode}</Text>
                      </View>
                      {isSelected ? <Check size={18} color="#0369a1" strokeWidth={2.5} /> : null}
                    </View>
                  </Pressable>
                );
              })}
              {filteredStates.length === 0 ? (
                <View style={{ padding: 40, alignItems: 'center' }}>
                  <Text style={{ fontFamily: Fonts.sans, fontSize: 14, color: WARM.body }}>No states found</Text>
                </View>
              ) : null}
            </ScrollView>
          </View>
        </Modal>
      </View>
    </Modal>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────
function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  return (
    <Text
      style={{
        fontFamily: Fonts.sansSemibold,
        fontSize: 13,
        fontWeight: '600',
        color: WARM.body,
        marginBottom: 8,
      }}
    >
      {label}{required ? <Text style={{ color: WARM.red }}> *</Text> : null}
    </Text>
  );
}

function ErrorText({ text }: { text?: string }) {
  if (!text) return null;
  return (
    <Text
      style={{
        fontFamily: Fonts.sansSemibold,
        fontSize: 12,
        fontWeight: '600',
        color: WARM.red,
        marginTop: 5,
      }}
    >
      {text}
    </Text>
  );
}

function FormInput({ hasError, onFocus, onBlur, ...rest }: React.ComponentProps<typeof TextInput> & { hasError?: boolean }) {
  const [focused, setFocused] = useState(false);
  return (
    <TextInput
      {...rest}
      placeholderTextColor={WARM.subtle}
      onFocus={(e) => { setFocused(true); onFocus?.(e); }}
      onBlur={(e) => { setFocused(false); onBlur?.(e); }}
      /* One field definition, matching ProfileTab: 1px warm line, 12pt radius,
         15pt type. The focus ring is brand red rather than near-black — black
         on cream read as "disabled and selected" at the same time. */
      style={{
        width: '100%',
        paddingHorizontal: 16,
        paddingVertical: 13,
        minHeight: 50,
        borderWidth: 1,
        borderColor: hasError ? WARM.red : focused ? WARM.red : WARM.line,
        borderRadius: 12,
        backgroundColor: focused ? '#ffffff' : WARM.ground,
        fontFamily: Fonts.sans,
        fontSize: 15,
        color: WARM.ink,
      }}
    />
  );
}
