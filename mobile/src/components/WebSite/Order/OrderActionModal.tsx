/**
 * Cancel-order / request-return sheet.
 *
 * Ports the customer actions from frontend OrderDetail.tsx, which mobile had
 * no equivalent for: the order screens could show a cancelled order and a
 * return status, but offered no way to reach either state from the phone.
 *
 * The preset reasons and the "Other reveals a text box" behaviour are the
 * web's, verbatim — so the reasons an admin sees in the queue are the same set
 * regardless of which client the customer used.
 */
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Check, RotateCcw, X, XCircle } from 'lucide-react-native';
import { Fonts, Palette } from '@/constants/theme';

export type OrderAction = 'cancel' | 'return';

/** frontend/src/components/WebSite/Order/OrderDetail.tsx — CANCEL_REASONS */
const CANCEL_REASONS = [
  'Changed my mind',
  'Ordered by mistake',
  'Found a better price elsewhere',
  'Delivery is taking too long',
  'Need to change address or details',
  'Other',
];

/** …and RETURN_REASONS */
const RETURN_REASONS = [
  'Damaged or defective',
  'Wrong item received',
  'Not as described',
  'Size or fit issue',
  'Quality not satisfactory',
  'Other',
];

const COPY = {
  cancel: {
    title: 'Cancel Order',
    blurb: 'Tell us why you are cancelling. Your refund will be initiated once the order is cancelled.',
    confirm: 'Cancel Order',
    busy: 'Cancelling…',
  },
  return: {
    title: 'Request a Return',
    blurb: 'Tell us what went wrong. We will review your request and get back to you.',
    confirm: 'Request Return',
    busy: 'Submitting…',
  },
} as const;

export default function OrderActionModal({
  action,
  submitting,
  onSubmit,
  onClose,
}: {
  /** null closes the sheet. */
  action: OrderAction | null;
  submitting: boolean;
  onSubmit: (reason: string) => void;
  onClose: () => void;
}) {
  const [choice, setChoice] = useState('');
  const [freeText, setFreeText] = useState('');
  const [touched, setTouched] = useState(false);

  // Reset whenever the sheet opens, so a reason picked for a cancel does not
  // reappear pre-selected in a later return.
  useEffect(() => {
    if (action) {
      setChoice('');
      setFreeText('');
      setTouched(false);
    }
  }, [action]);

  if (!action) return null;

  const reasons = action === 'cancel' ? CANCEL_REASONS : RETURN_REASONS;
  const copy = COPY[action];
  const isOther = choice === 'Other';
  const resolved = isOther ? freeText.trim() : choice;

  // A return must carry a reason; the web sends `reason || undefined` for a
  // cancel, so a cancel may go without one.
  const needsReason = action === 'return';
  const invalid = needsReason ? resolved.length === 0 : isOther && resolved.length === 0;

  const handleSubmit = () => {
    setTouched(true);
    if (invalid) return;
    onSubmit(resolved);
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={s.backdrop}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />

        <View style={s.sheet}>
          <View style={s.head}>
            <View style={s.headTitle}>
              {action === 'cancel' ? (
                <XCircle size={18} color={Palette.error} strokeWidth={2.25} />
              ) : (
                <RotateCcw size={18} color={Palette.ink} strokeWidth={2.25} />
              )}
              <Text style={s.title}>{copy.title}</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel="Close">
              <X size={20} color="#9ca3af" strokeWidth={2} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
            <Text style={s.blurb}>{copy.blurb}</Text>

            <View style={{ gap: 8 }}>
              {reasons.map((r) => {
                const active = choice === r;
                return (
                  <Pressable
                    key={r}
                    onPress={() => setChoice(r)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={r}
                    style={[s.option, active && s.optionActive]}
                  >
                    <View style={[s.radio, active && s.radioActive]}>
                      {active ? <Check size={11} color="#ffffff" strokeWidth={3} /> : null}
                    </View>
                    <Text style={[s.optionText, active && s.optionTextActive]}>{r}</Text>
                  </Pressable>
                );
              })}
            </View>

            {isOther ? (
              <TextInput
                value={freeText}
                onChangeText={setFreeText}
                placeholder="Tell us a little more"
                placeholderTextColor="#9ca3af"
                multiline
                numberOfLines={3}
                style={s.input}
                accessibilityLabel="Your reason"
              />
            ) : null}

            {touched && invalid ? (
              <Text style={s.error}>
                {isOther ? 'Please describe your reason.' : 'Please choose a reason.'}
              </Text>
            ) : null}
          </ScrollView>

          <View style={s.foot}>
            <Pressable
              onPress={onClose}
              disabled={submitting}
              accessibilityRole="button"
              accessibilityLabel="Keep order"
              style={[s.btn, s.btnGhost]}
            >
              <Text style={s.btnGhostText}>Keep</Text>
            </Pressable>

            <Pressable
              onPress={handleSubmit}
              disabled={submitting}
              accessibilityRole="button"
              accessibilityLabel={copy.confirm}
              accessibilityState={{ disabled: submitting, busy: submitting }}
              style={[s.btn, action === 'cancel' ? s.btnDanger : s.btnPrimary, submitting && s.btnBusy]}
            >
              {submitting ? <ActivityIndicator size="small" color="#ffffff" /> : null}
              <Text style={s.btnSolidText}>{submitting ? copy.busy : copy.confirm}</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: {
    maxHeight: '88%',
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },

  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  headTitle: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: {
    fontFamily: Fonts.heading,
    fontSize: 17,
    fontWeight: '600',
    color: '#1a1a1a',
    letterSpacing: -0.35,
  },

  body: { padding: 20, gap: 16 },
  blurb: { fontFamily: Fonts.sans, fontSize: 13.5, lineHeight: 20, color: '#5f5550' },

  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
  },
  optionActive: { borderColor: Palette.primary, backgroundColor: '#fff5f5' },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: { backgroundColor: Palette.primary, borderColor: Palette.primary },
  optionText: { fontFamily: Fonts.sans, fontSize: 14, color: '#374151', flex: 1 },
  optionTextActive: { fontFamily: Fonts.sansSemibold, fontWeight: '600', color: '#1a1a1a' },

  input: {
    fontFamily: Fonts.sans,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    color: '#111827',
    minHeight: 88,
    textAlignVertical: 'top',
    backgroundColor: '#f9fafb',
  },
  error: { fontFamily: Fonts.sans, fontSize: 12.5, color: Palette.error },

  foot: {
    flexDirection: 'row',
    gap: 10,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  btn: {
    flex: 1,
    minHeight: 46,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  btnGhost: { borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#ffffff' },
  btnGhostText: { fontFamily: Fonts.sansSemibold, fontSize: 14, fontWeight: '600', color: '#374151' },
  btnDanger: { backgroundColor: Palette.error },
  btnPrimary: { backgroundColor: Palette.ink },
  btnBusy: { opacity: 0.75 },
  btnSolidText: { fontFamily: Fonts.sansBold, fontSize: 14, fontWeight: '700', color: '#ffffff' },
});
