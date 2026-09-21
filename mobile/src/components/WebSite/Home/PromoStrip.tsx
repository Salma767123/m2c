import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
  Easing,
  AccessibilityInfo,
  useWindowDimensions,
} from 'react-native';
import { ArrowRight } from 'lucide-react-native';
import { router } from 'expo-router';
import { couponService, type FirstOrderCoupon } from '@/services/couponService';
import { Fonts } from '@/constants/theme';

/**
 * The offer band between the hero and the notice board — the mobile counterpart
 * of frontend/src/components/WebSite/PromoStrip/PromoStrip.tsx.
 *
 * Data-driven exactly like the web: it shows the admin's active "first order"
 * coupon and renders NOTHING when no such coupon is running. Nothing is
 * hardcoded, and a failed request lands on the same quiet null as "no campaign",
 * so a backend hiccup never leaves a broken band on the home screen.
 *
 * Copy note: the web shows a long description on tablet and up, and a short
 * "Extra <offer> with code" at phone width. A phone is the only width this
 * component ever renders at, so it uses the short form — the same string the
 * web would show on the same screen.
 */

const OXBLOOD = '#7a0f10'; // band ground — matches the web exactly
const GOLD = '#e0a83d'; // "First order?" eyebrow
const TEXT_SCALE_CAP = 1.4;

export default function PromoStrip() {
  const [coupon, setCoupon] = useState<FirstOrderCoupon | null>(null);
  const [reduceMotion, setReduceMotion] = useState(true);
  const { width } = useWindowDimensions();
  const sheen = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let cancelled = false;
    couponService
      .getFirstOrderCoupon()
      .then((c) => {
        if (!cancelled) setCoupon(c);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Start pessimistic (motion off) and only animate once the OS confirms the
  // user has not asked for reduced motion — the reverse would flash a moving
  // highlight at exactly the people who switched it off.
  useEffect(() => {
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled().then((on) => {
      if (!cancelled) setReduceMotion(on);
    });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (on) =>
      setReduceMotion(on),
    );
    return () => {
      cancelled = true;
      sub?.remove?.();
    };
  }, []);

  useEffect(() => {
    if (reduceMotion || !coupon) return;
    // 7s cycle with a long tail, matching the web's m2cStripSheen timing: the
    // highlight crosses in the first 60% and rests off-screen for the rest.
    const loop = Animated.loop(
      Animated.timing(sheen, {
        toValue: 1,
        duration: 7000,
        easing: Easing.bezier(0.4, 0, 0.2, 1),
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => {
      loop.stop();
      sheen.setValue(0);
    };
  }, [reduceMotion, coupon, sheen]);

  // No active first-order coupon → the strip does not render.
  if (!coupon) return null;

  const translateX = sheen.interpolate({
    inputRange: [0, 0.6, 1],
    outputRange: [-width * 0.4, width * 1.2, width * 1.2],
  });

  return (
    <View style={s.band} accessibilityRole="summary" accessibilityLabel="Current offer">
      {!reduceMotion && (
        <Animated.View
          pointerEvents="none"
          style={[s.sheen, { width: width * 0.2, transform: [{ translateX }, { skewX: '-18deg' }] }]}
        />
      )}

      <View style={s.row}>
        <Text style={s.eyebrow} maxFontSizeMultiplier={TEXT_SCALE_CAP}>
          First order?
        </Text>

        <Text style={s.body} maxFontSizeMultiplier={TEXT_SCALE_CAP}>
          Extra {coupon.offer} with code
        </Text>

        <View style={s.codeChip}>
          <Text style={s.codeText} maxFontSizeMultiplier={TEXT_SCALE_CAP}>
            {coupon.code}
          </Text>
        </View>

        <Pressable
          onPress={() => router.push('/(any)/offers')}
          accessibilityRole="button"
          accessibilityLabel="See all offers"
          hitSlop={8}
          style={s.link}
        >
          <Text style={s.linkText} maxFontSizeMultiplier={TEXT_SCALE_CAP}>
            See all offers
          </Text>
          <ArrowRight size={13} color="#ffffff" />
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  band: {
    width: '100%',
    backgroundColor: OXBLOOD,
    overflow: 'hidden',
  },
  sheen: {
    ...StyleSheet.absoluteFillObject,
    left: undefined,
    right: undefined,
    backgroundColor: 'rgba(255,255,255,0.13)',
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    columnGap: 8,
    rowGap: 4,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  eyebrow: {
    fontFamily: Fonts.sansBold,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.3, // ≈ 0.12em at 11px
    textTransform: 'uppercase',
    color: GOLD,
  },
  body: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
  },
  codeChip: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.45)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  codeText: {
    fontFamily: Fonts.sansBold,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.7,
    color: '#ffffff',
  },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  linkText: {
    fontFamily: Fonts.sansSemibold,
    fontSize: 11.5,
    fontWeight: '600',
    color: '#ffffff',
  },
});
