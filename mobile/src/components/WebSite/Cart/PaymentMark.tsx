/**
 * Payment marks — port of the PaymentMark component inside
 * frontend/src/components/WebSite/Cart/Cart.tsx.
 *
 * None of the official artwork is in this repository, so these are built
 * rather than imported. Mastercard's interlocking discs are exact: two circles
 * at r=7 with centres 10 apart, and the lens between them is the pair of minor
 * arcs joining their intersection points. The rest are wordmarks set in type in
 * the brands' own colours — recognisable at this size, and honest about being
 * type rather than a traced logo.
 *
 * To use the real files instead, drop the SVGs in assets and swap each case for
 * an <Image>. Nothing else here needs to change.
 *
 * The wordmarks deliberately do NOT use the app's brand font. The web sets them
 * in Arial/Helvetica; leaving `fontFamily` unset here gives the platform's own
 * sans (Roboto / SF), which is the same intent — a payment mark should read as
 * itself, not as the storefront's typography.
 */
import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { Landmark } from 'lucide-react-native';

export type PaymentMarkId = 'visa' | 'mastercard' | 'rupay' | 'upi' | 'netbanking';

/** The five the web lists, in its order. */
export const PAYMENT_MARKS: PaymentMarkId[] = [
  'visa',
  'mastercard',
  'rupay',
  'upi',
  'netbanking',
];

/* Arial on Android maps to Roboto anyway; naming Helvetica on iOS gets the
   closest available face. */
const FACE = Platform.select({ ios: 'Helvetica', default: undefined });

/**
 * RuPay and UPI carry the same mark: two leaning chevrons, orange then green,
 * set AFTER the wordmark. Both are NPCI marks, which is why they share it.
 */
function NpciArrow() {
  return (
    <Svg width={10} height={15} viewBox="0 0 16 20">
      <Path d="M1 1 8.6 10 1 19Z" fill="#F58220" />
      <Path d="M7.4 1 15 10 7.4 19Z" fill="#3EA33E" />
    </Svg>
  );
}

export default function PaymentMark({ id }: { id: PaymentMarkId }) {
  if (id === 'visa') {
    return (
      <View style={s.chip} accessibilityRole="image" accessibilityLabel="Visa">
        <Text style={s.visa}>VISA</Text>
      </View>
    );
  }

  if (id === 'mastercard') {
    return (
      <View style={s.chip} accessibilityRole="image" accessibilityLabel="Mastercard">
        <Svg width={28} height={18} viewBox="0 0 40 24">
          <Circle cx="15" cy="12" r="7" fill="#EB001B" />
          <Circle cx="25" cy="12" r="7" fill="#F79E1B" />
          {/* where the two discs overlap */}
          <Path d="M20 7.1A7 7 0 0 1 20 16.9A7 7 0 0 1 20 7.1Z" fill="#FF5F00" />
        </Svg>
      </View>
    );
  }

  if (id === 'rupay') {
    return (
      <View style={s.chip} accessibilityRole="image" accessibilityLabel="RuPay">
        <Text style={[s.word, { color: '#2E3192' }]}>RuPay</Text>
        <NpciArrow />
      </View>
    );
  }

  if (id === 'upi') {
    return (
      <View style={s.chip} accessibilityRole="image" accessibilityLabel="UPI">
        <Text style={[s.word, { color: '#58595B' }]}>UPI</Text>
        <NpciArrow />
      </View>
    );
  }

  return (
    <View style={s.chip} accessibilityRole="image" accessibilityLabel="Netbanking">
      {/* Netbanking has no brand of its own, so it borrows the blue the other
          marks already use — grey on white read as disabled beside four
          coloured neighbours. */}
      <Landmark size={14} color="#1B5E9E" strokeWidth={2.2} />
      <Text style={s.netbanking}>Netbanking</Text>
    </View>
  );
}

const s = StyleSheet.create({
  /* `h-7 items-center gap-1 rounded-md bg-white px-2 ring-1 ring-[#e9ded2]` */
  chip: {
    height: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e9ded2',
  },
  visa: {
    fontFamily: FACE,
    fontSize: 13,
    fontWeight: '900',
    fontStyle: 'italic',
    letterSpacing: -0.4,
    color: '#1A1F71',
  },
  word: {
    fontFamily: FACE,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  netbanking: {
    fontFamily: FACE,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    color: '#0F2E52',
  },
});
