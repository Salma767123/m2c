/**
 * Offer celebration — port of
 * frontend/src/components/WebSite/Shared/OfferCelebration.tsx.
 *
 * Fires when an AUTOMATIC offer applies (coupons have their own popup). Two
 * shapes: `bogo` announces the free units a buy-X-get-Y deal just unlocked,
 * `savings` announces an amount taken off.
 *
 * The web throws a full-page confetti rain behind the card. That is a lot of
 * simultaneously animating nodes, and on a phone it would be forty-odd views
 * animating over a screen the customer is trying to read, so this keeps the
 * part that carries the message — the card springing in with a burst ring
 * behind its medallion — and drops the rain.
 *
 * Confetti positions on the web are deterministic, not Math.random, because
 * that repo forbids impure calls at render. The same rule is kept here for the
 * burst ray angles.
 */
import React, { useEffect } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Gift, PartyPopper, Sparkles } from 'lucide-react-native';
import { Fonts } from '@/constants/theme';

export interface OfferCelebrationProps {
  open: boolean;
  onClose: () => void;
  variant: 'bogo' | 'savings';
  /** bogo: how many units are free right now (e.g. 1). */
  freeUnits?: number;
  /** bogo: the deal in words, e.g. "Buy 2 Get 1 Free". */
  dealLabel?: string;
  /** savings: preformatted amount, e.g. "₹124.00". */
  amountLabel?: string;
  /** The applied offer's name, e.g. "Diwali Big Save". */
  offerTitle?: string;
  /** The applied offer's description / fine print. */
  offerDescription?: string;
  /** Auto-dismiss delay in ms (0 disables). Default 6000. */
  autoCloseMs?: number;
}

/** Fixed ray angles — deterministic, as the web's confetti is. */
const RAYS = [0, 45, 90, 135, 180, 225, 270, 315];

export default function OfferCelebration({
  open,
  onClose,
  variant,
  freeUnits,
  dealLabel,
  amountLabel,
  offerTitle,
  offerDescription,
  autoCloseMs = 6000,
}: OfferCelebrationProps) {
  if (!open) return null;
  return (
    <CelebrationBody
      onClose={onClose}
      variant={variant}
      freeUnits={freeUnits}
      dealLabel={dealLabel}
      amountLabel={amountLabel}
      offerTitle={offerTitle}
      offerDescription={offerDescription}
      autoCloseMs={autoCloseMs}
    />
  );
}

function CelebrationBody({
  onClose,
  variant,
  freeUnits,
  dealLabel,
  amountLabel,
  offerTitle,
  offerDescription,
  autoCloseMs,
}: Omit<OfferCelebrationProps, 'open'>) {
  const scrim = useSharedValue(0);
  const lift = useSharedValue(30);
  const scale = useSharedValue(0.9);
  const burst = useSharedValue(0);

  useEffect(() => {
    scrim.value = withTiming(1, { duration: 180, easing: Easing.out(Easing.quad) });
    lift.value = withSpring(0, { damping: 17, stiffness: 210, mass: 0.7 });
    scale.value = withSpring(1, { damping: 15, stiffness: 230, mass: 0.7 });
    burst.value = withDelay(
      120,
      withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) }),
    );

    if (!autoCloseMs) return;
    const t = setTimeout(onClose, autoCloseMs);
    return () => clearTimeout(t);
    // Shared values are stable; this is a mount-only entrance.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scrimStyle = useAnimatedStyle(() => ({ opacity: scrim.value }));
  const cardStyle = useAnimatedStyle(() => ({
    opacity: scrim.value,
    transform: [{ translateY: lift.value }, { scale: scale.value }],
  }));
  const burstStyle = useAnimatedStyle(() => ({
    opacity: (1 - burst.value) * 0.9,
    transform: [{ scale: 0.6 + burst.value * 1.5 }],
  }));

  const isBogo = variant === 'bogo';
  const headline = isBogo
    ? `${freeUnits ?? 1} Free`
    : amountLabel || '';

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View style={s.wrap}>
        <Animated.View style={[StyleSheet.absoluteFill, s.scrim, scrimStyle]} />
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Dismiss" />

        <Animated.View style={[s.card, cardStyle]} accessibilityViewIsModal>
          <View style={s.medallionWrap}>
            {/* Rays fan out from behind the medallion and fade — the part of the
                web's confetti burst that reads at this size. */}
            <Animated.View style={[StyleSheet.absoluteFill, s.rays, burstStyle]} pointerEvents="none">
              {RAYS.map((deg) => (
                <View
                  key={deg}
                  style={[s.ray, { transform: [{ rotate: `${deg}deg` }, { translateY: -34 }] }]}
                />
              ))}
            </Animated.View>

            <LinearGradient
              colors={isBogo ? ['#157f4a', '#0f5f38'] : ['#e01a1b', '#c41617']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={s.medallion}
            >
              {isBogo ? (
                <Gift size={28} color="#ffffff" />
              ) : (
                <PartyPopper size={28} color="#ffffff" />
              )}
            </LinearGradient>
          </View>

          <View style={s.eyebrow}>
            <Sparkles size={12} color="#b45309" />
            <Text style={s.eyebrowText}>Offer unlocked!</Text>
          </View>

          <Text style={s.headline}>{headline}</Text>
          {!isBogo ? <Text style={s.savedLabel}>You saved</Text> : null}
          {isBogo && dealLabel ? <Text style={s.savedLabel}>{dealLabel}</Text> : null}

          {offerTitle ? <Text style={s.offerTitle}>{offerTitle}</Text> : null}
          {offerDescription ? (
            <Text style={s.offerDesc} numberOfLines={3}>
              {offerDescription}
            </Text>
          ) : null}

          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Continue"
            style={s.cta}
          >
            <Text style={s.ctaText}>Continue</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
  scrim: { backgroundColor: 'rgba(15,23,42,0.55)' },

  card: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 20,
    alignItems: 'center',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.28,
    shadowRadius: 34,
    // Android paints elevation only.
    elevation: 14,
  },

  medallionWrap: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  rays: { alignItems: 'center', justifyContent: 'center' },
  ray: {
    position: 'absolute',
    width: 3,
    height: 14,
    borderRadius: 2,
    backgroundColor: '#fbbf24',
  },
  medallion: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },

  eyebrow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#fffbeb',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  eyebrowText: {
    fontFamily: Fonts.sansBold,
    fontSize: 11,
    // Outfit is static: the weight must name the loaded file (Outfit_700Bold).
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: '#b45309',
  },

  headline: {
    fontFamily: Fonts.heading,
    fontSize: 32,
    // Poppins_600SemiBold is the loaded file.
    fontWeight: '600',
    letterSpacing: -0.8,
    color: '#1a1a1a',
    marginTop: 10,
  },
  savedLabel: { fontFamily: Fonts.sansMedium, fontSize: 13, fontWeight: '500', color: '#7a6d62' },

  offerTitle: {
    fontFamily: Fonts.sansSemibold,
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    textAlign: 'center',
    marginTop: 12,
  },
  offerDesc: {
    fontFamily: Fonts.sans,
    fontSize: 12.5,
    lineHeight: 18,
    color: '#5f5550',
    textAlign: 'center',
    marginTop: 4,
  },

  cta: {
    alignSelf: 'stretch',
    marginTop: 20,
    minHeight: 46,
    borderRadius: 999,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    fontFamily: Fonts.sansBold,
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
});
