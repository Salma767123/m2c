/**
 * The app's confirmation dialog, and the `useConfirm()` hook that opens it.
 *
 * Every destructive confirmation went through `Alert.alert`, which hands the
 * question to the operating system: a grey system box in the OS font, with the
 * OS button order, looking nothing like the rest of the app and different again
 * between Android and iOS. Removing a cart item and deleting an address — the
 * two moments a customer most needs to feel sure about — looked the least like
 * the product they were happening in.
 *
 * This replaces it with a dialog the app actually owns. What makes it read as
 * deliberate rather than merely styled:
 *
 *  - the medallion emits a halo that expands and fades once on open, so the eye
 *    lands on the icon before the words;
 *  - the card springs up rather than appearing, which reads as a thing being
 *    handed to you rather than a system interruption;
 *  - destructive and neutral questions are different colours throughout — halo,
 *    medallion and confirm button — so the weight of the answer is legible
 *    before the text is read;
 *  - a destructive prompt fires a warning haptic as it opens.
 *
 * Usage — `confirm()` resolves true/false, so a call site reads like a question:
 *
 *   const confirm = useConfirm();
 *   if (await confirm({ title: 'Delete address?', tone: 'danger' })) remove();
 *
 * Mount <ConfirmHost /> once, at the app root, above everything it must cover.
 */
import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { AlertTriangle, LogOut, Trash2 } from 'lucide-react-native';
import { Fonts } from '@/constants/theme';

/* lucide-react-native declares its prop type internally but does not export
   it as a type, so the icon prop is typed structurally. */
type IconComponent = React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;

export type ConfirmTone = 'danger' | 'brand';

export type ConfirmOptions = {
  title: string;
  message?: string;
  /** Defaults to "Confirm". */
  confirmLabel?: string;
  /** Defaults to "Cancel". */
  cancelLabel?: string;
  /** `danger` for anything that destroys or signs out. Defaults to `danger`. */
  tone?: ConfirmTone;
  /** Defaults to Trash2 for danger, AlertTriangle for brand. */
  icon?: IconComponent;
};

const TONES = {
  danger: { key: '#e11d48', soft: 'rgba(225,29,72,0.10)', ring: 'rgba(225,29,72,0.35)' },
  brand: { key: '#e01a1b', soft: 'rgba(224,26,27,0.10)', ring: 'rgba(224,26,27,0.35)' },
} as const;

// ─── Context ──────────────────────────────────────────────────────────────────

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

/** Ask the question. Resolves true if confirmed, false if cancelled or dismissed. */
export function useConfirm(): ConfirmFn {
  const fn = useContext(ConfirmContext);
  if (!fn) throw new Error('useConfirm must be used inside <ConfirmHost>');
  return fn;
}

/**
 * Mount once at the app root. Holds the single dialog instance so any screen
 * can ask a question without each one carrying its own modal state.
 */
export function ConfirmHost({ children }: { children: React.ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  // Held in a ref so resolving does not depend on a re-render landing first.
  const resolver = useRef<((v: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((opts) => {
    setOptions(opts);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const settle = useCallback((value: boolean) => {
    setOptions(null);
    resolver.current?.(value);
    resolver.current = null;
  }, []);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <ConfirmDialog options={options} onSettle={settle} />
    </ConfirmContext.Provider>
  );
}

// ─── Dialog ───────────────────────────────────────────────────────────────────

function ConfirmDialog({
  options,
  onSettle,
}: {
  options: ConfirmOptions | null;
  onSettle: (value: boolean) => void;
}) {
  if (!options) return null;
  // Keyed on the title so every new question remounts and replays its entrance
  // from the start, rather than reusing the previous dialog's finished values.
  return <ConfirmBody key={options.title} options={options} onSettle={onSettle} />;
}

function ConfirmBody({
  options,
  onSettle,
}: {
  options: ConfirmOptions;
  onSettle: (value: boolean) => void;
}) {
  const tone = TONES[options.tone ?? 'danger'];
  const Icon: IconComponent =
    options.icon ?? (options.tone === 'brand' ? AlertTriangle : Trash2);

  const scrim = useSharedValue(0);
  const lift = useSharedValue(28);
  const scale = useSharedValue(0.92);
  const halo = useSharedValue(0);

  React.useEffect(() => {
    if ((options.tone ?? 'danger') === 'danger') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    }
    scrim.value = withTiming(1, { duration: 180, easing: Easing.out(Easing.quad) });
    lift.value = withSpring(0, { damping: 18, stiffness: 220, mass: 0.7 });
    scale.value = withSpring(1, { damping: 16, stiffness: 240, mass: 0.7 });
    // The halo runs once, just behind the card settling.
    halo.value = withDelay(
      120,
      withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) }),
    );
    // Shared values are stable; this is a mount-only entrance.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scrimStyle = useAnimatedStyle(() => ({ opacity: scrim.value }));
  const cardStyle = useAnimatedStyle(() => ({
    opacity: scrim.value,
    transform: [{ translateY: lift.value }, { scale: scale.value }],
  }));
  // Expands past the medallion and fades as it goes.
  const haloStyle = useAnimatedStyle(() => ({
    opacity: (1 - halo.value) * 0.9,
    transform: [{ scale: 1 + halo.value * 1.5 }],
  }));

  const answer = (value: boolean) => {
    if (value) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }
    onSettle(value);
  };

  return (
    <Modal
      visible
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={() => answer(false)}
    >
      <View style={s.wrap}>
        <Animated.View style={[StyleSheet.absoluteFill, s.scrim, scrimStyle]} />
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => answer(false)}
          accessibilityLabel="Dismiss"
        />

        <Animated.View style={[s.card, cardStyle]} accessibilityViewIsModal>
          <View style={s.medallionWrap}>
            <Animated.View
              pointerEvents="none"
              style={[s.halo, { borderColor: tone.ring }, haloStyle]}
            />
            <View style={[s.medallion, { backgroundColor: tone.soft }]}>
              <Icon size={26} color={tone.key} strokeWidth={2} />
            </View>
          </View>

          <Text style={s.title}>{options.title}</Text>
          {options.message ? <Text style={s.message}>{options.message}</Text> : null}

          <View style={s.actions}>
            <Pressable
              onPress={() => answer(false)}
              accessibilityRole="button"
              accessibilityLabel={options.cancelLabel ?? 'Cancel'}
              /* A style FUNCTION would drop these styles — the failure this app
                 has hit repeatedly. Feedback comes from android_ripple. */
              style={[s.btn, s.btnGhost]}
              android_ripple={{ color: 'rgba(15,23,42,0.08)' }}
            >
              <Text style={s.btnGhostText}>{options.cancelLabel ?? 'Cancel'}</Text>
            </Pressable>

            <Pressable
              onPress={() => answer(true)}
              accessibilityRole="button"
              accessibilityLabel={options.confirmLabel ?? 'Confirm'}
              style={[s.btn, { backgroundColor: tone.key }]}
              android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
            >
              <Text style={s.btnSolidText}>{options.confirmLabel ?? 'Confirm'}</Text>
            </Pressable>
          </View>
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
    maxWidth: 360,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 26,
    paddingBottom: 18,
    alignItems: 'center',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.28,
    shadowRadius: 34,
    // Android paints elevation only; the shadow* props above are iOS.
    elevation: 14,
  },

  medallionWrap: { alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  halo: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
  },
  medallion: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },

  title: {
    fontFamily: Fonts.heading,
    fontSize: 19,
    // Poppins is a static family: the weight must name the loaded file
    // (Poppins_600SemiBold) or Android fakes a bold over it.
    fontWeight: '600',
    letterSpacing: -0.4,
    color: '#1a1a1a',
    textAlign: 'center',
  },
  message: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    lineHeight: 20,
    color: '#5f5550',
    textAlign: 'center',
    marginTop: 8,
  },

  actions: { flexDirection: 'row', gap: 10, marginTop: 22, width: '100%' },
  btn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  btnGhost: { backgroundColor: '#f1f5f9' },
  btnGhostText: {
    fontFamily: Fonts.sansSemibold,
    fontSize: 14.5,
    fontWeight: '600',
    color: '#475569',
  },
  btnSolidText: {
    fontFamily: Fonts.sansBold,
    fontSize: 14.5,
    fontWeight: '700',
    color: '#ffffff',
  },
});

/** Re-exported so call sites can pass a matching glyph without a second import. */
export { LogOut, Trash2, AlertTriangle };

/** Kept for the rare caller that wants the platform sheet. */
export const isIOS = Platform.OS === 'ios';
