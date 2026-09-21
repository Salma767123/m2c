/**
 * Draws the messages raised by lib/toast-utils.
 *
 * One at a time, newest wins: a toast that arrives while another is showing
 * replaces it rather than queueing, because these report what just happened and
 * a stale one is worse than a missed one.
 *
 * The bar drops from under the status bar on a spring, carries a tone-coloured
 * medallion, and drains a hairline rail along its bottom edge so the remaining
 * time is visible rather than guessed. Tapping it dismisses early.
 *
 * Mount once at the app root, above the navigator.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AlertTriangle, CheckCircle2, Info } from 'lucide-react-native';
import { subscribeToToasts, type ToastPayload, type ToastTone } from '@/lib/toast-utils';
import { Fonts } from '@/constants/theme';

const TONES: Record<ToastTone, { key: string; soft: string; icon: any }> = {
  success: { key: '#0f9d58', soft: 'rgba(15,157,88,0.12)', icon: CheckCircle2 },
  error: { key: '#e11d48', soft: 'rgba(225,29,72,0.12)', icon: AlertTriangle },
  info: { key: '#e01a1b', soft: 'rgba(224,26,27,0.12)', icon: Info },
};

export default function ToastHost() {
  const [toast, setToast] = useState<ToastPayload | null>(null);

  useEffect(() => subscribeToToasts(setToast), []);

  const clear = useCallback(() => setToast(null), []);

  if (!toast) return null;
  // Keyed on id so each message replays the entrance from the start instead of
  // inheriting the previous one's finished animation values.
  return <ToastBar key={toast.id} toast={toast} onDone={clear} />;
}

function ToastBar({ toast, onDone }: { toast: ToastPayload; onDone: () => void }) {
  const insets = useSafeAreaInsets();
  const tone = TONES[toast.tone];
  const Icon = tone.icon;

  const drop = useSharedValue(-120);
  const fade = useSharedValue(0);
  const rail = useSharedValue(1);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    drop.value = withSpring(0, { damping: 17, stiffness: 190, mass: 0.7 });
    fade.value = withTiming(1, { duration: 160 });
    rail.value = withTiming(0, { duration: toast.duration, easing: Easing.linear });

    timer.current = setTimeout(onDone, toast.duration);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // Shared values are stable and the bar is keyed per message.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const barStyle = useAnimatedStyle(() => ({
    opacity: fade.value,
    transform: [{ translateY: drop.value }],
  }));
  const railStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: Math.max(rail.value, 0) }],
  }));

  return (
    <Animated.View
      style={[s.wrap, { top: insets.top + 8 }, barStyle]}
      pointerEvents="box-none"
    >
      <Pressable
        onPress={onDone}
        accessibilityRole="alert"
        accessibilityLabel={`${toast.title}. ${toast.message}`}
        /* A style FUNCTION would drop the card's fill and shadow — the failure
           this app has hit repeatedly. */
        style={s.card}
      >
        <View style={s.row}>
          <View style={[s.medallion, { backgroundColor: tone.soft }]}>
            <Icon size={19} color={tone.key} strokeWidth={2.2} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={s.title} numberOfLines={1}>
              {toast.title}
            </Text>
            <Text style={s.message} numberOfLines={2}>
              {toast.message}
            </Text>
          </View>
        </View>

        {/* Drains left to right for the life of the toast. */}
        <View style={s.railTrack}>
          <Animated.View style={[s.rail, { backgroundColor: tone.key }, railStyle]} />
        </View>
      </Pressable>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 12,
    right: 12,
    // Above the navigator and any modal backdrop drawn in-tree.
    zIndex: 9999,
    elevation: 24,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingTop: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#eef1f4',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 22,
    // Android paints elevation only.
    elevation: 10,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14 },
  medallion: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: Fonts.sansBold,
    fontSize: 14,
    // Outfit is static: the weight must name the loaded file (Outfit_700Bold).
    fontWeight: '700',
    color: '#0f172a',
  },
  message: {
    fontFamily: Fonts.sans,
    fontSize: 12.5,
    lineHeight: 17,
    color: '#5f6b7a',
    marginTop: 1,
  },
  railTrack: { height: 3, marginTop: 12, backgroundColor: '#f1f5f9', overflow: 'hidden' },
  // Scales from the left edge, so the bar shortens rather than shrinking
  // towards its centre.
  rail: { height: 3, width: '100%', transformOrigin: 'left' },
});
