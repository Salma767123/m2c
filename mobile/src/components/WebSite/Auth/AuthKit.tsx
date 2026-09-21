/**
 * Shared chrome for the auth screens (Login / Register / Forgot / Reset / Verify).
 *
 * This is a port of the web's auth page at phone width — frontend
 * LoginRegister/LoginRegister.tsx plus LoginForm.tsx and RegisterForm.tsx —
 * not a mobile-specific design. Mobile had diverged from the site in four
 * structural ways:
 *
 *   ground    black canvas with a logo plate → the web is a light #f7f7f5 page
 *   toggle    two separate screens → the web puts a Sign In / Create Account
 *             pill above the card and switches in place
 *   fields    icon-prefixed inset rows → the web is a plain labelled input
 *   buttons   rounded-xl rectangles → the web's are full pills
 *
 * The web's left-hand hero panel is `hidden lg:flex`, so a phone never sees it
 * and it is deliberately not ported — the right-hand column IS the phone page.
 *
 * The toggle switches by navigating between the two routes rather than
 * swapping state in one screen. Both routes are linked from all over the app
 * and from deep links, so collapsing them into one would break those entry
 * points to gain nothing visible.
 */
import React, { forwardRef, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Check, Eye, EyeOff } from 'lucide-react-native';
import { companyInfoService } from '@/services/companyInfoService';
import { Fonts, Palette } from '@/constants/theme';

const STATIC_LOGO = require('../../../../assets/images/logo4.png');

/* ── Palette, taken from the web's auth page ──────────────────────────────── */
const GROUND = '#f7f7f5';
const BRAND = '#e01a1b';
const INK = '#1a1a1a';
const LABEL = '#374151'; // gray-700
const MUTED = '#4b5563'; // gray-600
const BORDER = '#e5e7eb'; // gray-200
const ERROR = '#dc2626'; // red-600

export type AuthMode = 'login' | 'register';

/** Light page + Sign In / Create Account toggle + white card. */
export function AuthShell({
  mode,
  title,
  subtitle,
  children,
  footer,
}: {
  /** Shows the toggle. Omit on Forgot / Reset / Verify, which the web has as
   *  their own pages without it. */
  mode?: AuthMode;
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  /**
   * Brand mark above the form.
   *
   * The web does not put a logo on the auth page itself — it does not need to,
   * because the site header sits above it carrying the mark. These screens have
   * no header at all, so without this the app's sign-in is the one place the
   * brand never appears.
   *
   * No white plate behind it, unlike the old dark canvas: logo4.png is black
   * line art on transparent, and the page ground is now light, so it simply
   * sits on the page.
   */
  const [companyLogo, setCompanyLogo] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    companyInfoService
      .getCachedCompanyInfo()
      .then((info) => alive && info.companyLogo && setCompanyLogo(info.companyLogo))
      .catch(() => {});
    companyInfoService
      .getPublicCompanyInfo()
      .then((info) => alive && info.companyLogo && setCompanyLogo(info.companyLogo))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  /**
   * The web caps this column — `max-w-md sm:max-w-lg lg:max-w-xl` — so the
   * form never stretches across a wide viewport. Mobile had no cap, so on a
   * tablet or a large phone in landscape the card ran edge to edge and the
   * fields became absurdly wide for the two words they hold.
   *
   * 448 is Tailwind's max-w-md; the two larger steps are for the breakpoints
   * where the web widens it too.
   */
  const maxWidth = width >= 1024 ? 576 : width >= 640 ? 512 : 448;
  // Give a large screen more breathing room at the edges than a 360pt phone.
  const gutter = width >= 640 ? 32 : 16;
  // The mark scales with the column rather than sitting at a fixed size, so it
  // is not a postage stamp on a tablet nor overbearing on a small phone.
  // 0.62 is logo4.png's aspect ratio (900 × 560).
  const logoW = Math.min(width - gutter * 2, maxWidth) * 0.46;

  return (
    <View style={{ flex: 1, backgroundColor: GROUND, paddingTop: insets.top }}>
      <StatusBar barStyle="dark-content" backgroundColor={GROUND} />
      <KeyboardAwareScrollView
        contentContainerStyle={{
          paddingHorizontal: gutter,
          paddingTop: 24,
          paddingBottom: 32,
          // Centres the column once the screen is wider than the cap.
          width: '100%',
          maxWidth: maxWidth + gutter * 2,
          alignSelf: 'center',
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        enableOnAndroid
        enableAutomaticScroll
        extraScrollHeight={20}
      >
        {/* Logo, then the form — on every auth screen, not just the two with
            a toggle, so the flow keeps one masthead throughout. */}
        <View style={{ alignItems: 'center', marginBottom: 20 }}>
          <Image
            source={companyLogo ? { uri: companyLogo } : STATIC_LOGO}
            style={{ width: logoW, height: logoW * 0.62 }}
            resizeMode="contain"
            accessible
            accessibilityRole="image"
            accessibilityLabel="M2C MarkDowns"
          />
        </View>

        {mode ? <AuthToggle mode={mode} /> : null}

        {/* Card: rounded-2xl, ring-1 ring-black/5, shadow-[0_18px_40px_rgba(0,0,0,0.08)] */}
        <View
          style={{
            backgroundColor: '#ffffff',
            borderRadius: 16,
            borderWidth: 1,
            borderColor: 'rgba(0,0,0,0.05)',
            paddingHorizontal: width >= 640 ? 32 : 16,
            paddingTop: 24,
            paddingBottom: 24,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 18 },
            shadowOpacity: 0.08,
            shadowRadius: 20,
            elevation: 4,
          }}
        >
          {/* Eyebrow — a rule on BOTH sides, unlike the home rails' single one. */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 12 }}>
            <View style={{ height: 1, width: 24, backgroundColor: BRAND }} />
            <Text
              style={{
                fontFamily: Fonts.sansSemibold,
                fontSize: 11,
                fontWeight: '600',
                textTransform: 'uppercase',
                letterSpacing: 1.98, // 0.18em
                color: BRAND,
              }}
            >
              Your Account
            </Text>
            <View style={{ height: 1, width: 24, backgroundColor: BRAND }} />
          </View>

          <Text
            style={{
              fontFamily: Fonts.heading,
              fontSize: 24, // text-2xl
              fontWeight: '600',
              letterSpacing: -0.6, // tracking-tight
              color: INK,
              textAlign: 'center',
              marginBottom: 8,
            }}
          >
            {title}
          </Text>
          <Text
            style={{
              fontFamily: Fonts.sans,
              fontSize: 12, // text-xs
              lineHeight: 19.5,
              color: MUTED,
              textAlign: 'center',
              marginBottom: 20,
            }}
          >
            {subtitle}
          </Text>

          {children}
        </View>

        {footer}
      </KeyboardAwareScrollView>
    </View>
  );
}

/**
 * The Sign In / Create Account pill.
 *
 * `replace`, not `push`: toggling back and forth otherwise stacks a new screen
 * each time and the hardware back button walks through every switch.
 */
function AuthToggle({ mode }: { mode: AuthMode }) {
  const go = (next: AuthMode) => {
    if (next === mode) return;
    router.replace(next === 'login' ? '/(auth)/Login' : '/(auth)/Register');
  };

  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: '#f3f4f6',
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
        borderRadius: 999,
        padding: 4,
        marginBottom: 16,
      }}
    >
      {(['login', 'register'] as AuthMode[]).map((m) => {
        const active = m === mode;
        return (
          <Pressable
            key={m}
            onPress={() => go(m)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={m === 'login' ? 'Sign In' : 'Create Account'}
            style={[
              {
                flex: 1,
                paddingVertical: 8,
                paddingHorizontal: 12,
                borderRadius: 999,
                alignItems: 'center',
              },
              active && {
                backgroundColor: BRAND,
                shadowColor: BRAND,
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.3,
                shadowRadius: 10,
                elevation: 3,
              },
            ]}
          >
            <Text
              style={{
                fontFamily: Fonts.sansSemibold,
                fontSize: 12,
                fontWeight: '600',
                color: active ? '#ffffff' : MUTED,
              }}
            >
              {m === 'login' ? 'Sign In' : 'Create Account'}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/* ── Fields ─────────────────────────────────────────────────────────────── */

type AuthFieldProps = {
  label: string;
  error?: string;
  secure?: boolean;
  value: string;
  onChangeText: (v: string) => void;
  /** Half width, for the first/last name row. */
  compact?: boolean;
} & Omit<React.ComponentProps<typeof TextInput>, 'value' | 'onChangeText'>;

/**
 * Labelled input.
 *
 * No leading icon: the web's auth inputs are plain (`w-full px-3 py-2 border
 * rounded-xl`), and mobile's icon-prefixed rows were a mobile invention that
 * also ate roughly 30px of an already narrow field.
 *
 * Forwards its ref so a form can chain the keyboard's "next" key through the
 * fields instead of making the user tap each one.
 */
export const AuthField = forwardRef<TextInput, AuthFieldProps>(function AuthField(
  { label, error, secure, value, onChangeText, compact, ...rest },
  ref,
) {
  const [reveal, setReveal] = useState(false);
  const [focused, setFocused] = useState(false);
  // An errored field keeps its ring too, so the one that failed stays the most
  // prominent thing on the form even after focus moves on.
  const ring = focused || !!error;

  return (
    <View style={{ marginBottom: 16, flex: compact ? 1 : undefined }}>
      <Text
        style={{
          fontFamily: Fonts.sansSemibold,
          fontSize: 12,
          fontWeight: '600',
          color: LABEL,
          marginBottom: 6,
        }}
      >
        {label}
      </Text>

      <View style={{ position: 'relative', justifyContent: 'center' }}>
        <TextInput
          ref={ref}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secure && !reveal}
          placeholderTextColor="#6b7280"
          style={[
            {
              fontFamily: Fonts.sans,
              width: '100%',
              fontSize: 15,
              color: '#111827',
              backgroundColor: '#ffffff',
              borderRadius: 12, // rounded-xl
              borderColor: error ? ERROR : focused ? BRAND : BORDER,
            },
            /* The web's focus cue is `focus:ring-2` — a 2px ring. That was a
               shadow here, which Android ignores entirely: it renders only
               `elevation`, and elevation is a neutral drop shadow, not a
               coloured ring. So on Android the only focus cue was a 1px colour
               change, which is easy to miss.

               A real 2px border works on both platforms. The padding drops by
               the same 1pt it gains in border, so the field does not resize and
               the form does not shift when focus moves. */
            ring
              ? { borderWidth: 2, paddingHorizontal: 11, paddingVertical: 13 }
              : { borderWidth: 1, paddingHorizontal: 12, paddingVertical: 14 },
            { paddingRight: secure ? 48 : undefined },
          ]}
          {...rest}
          onFocus={(e) => {
            setFocused(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            rest.onBlur?.(e);
          }}
        />

        {secure ? (
          /* A 44×44 target rather than a bare 18pt icon with a little hitSlop.
             This is the control people hit repeatedly while typing a password
             wrong, and it sat at roughly 34pt. */
          <TouchableOpacity
            onPress={() => setReveal((r) => !r)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityState={{ checked: reveal }}
            accessibilityLabel={reveal ? 'Hide password' : 'Show password'}
            style={{
              position: 'absolute',
              right: 2,
              width: 44,
              height: 44,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {reveal ? (
              <EyeOff size={19} color={focused ? BRAND : '#9ca3af'} strokeWidth={2} />
            ) : (
              <Eye size={19} color={focused ? BRAND : '#9ca3af'} strokeWidth={2} />
            )}
          </TouchableOpacity>
        ) : null}
      </View>

      {!!error && (
        <Text
          style={{
            fontFamily: Fonts.sans,
            fontSize: 12,
            color: ERROR,
            marginTop: 6,
          }}
        >
          {error}
        </Text>
      )}
    </View>
  );
});

/** Puts two <AuthField compact> side by side. */
export function AuthRow({ children }: { children: React.ReactNode }) {
  return <View style={{ flexDirection: 'row', gap: 12 }}>{children}</View>;
}

/* ── Controls ───────────────────────────────────────────────────────────── */

/** Full-width brand pill — the web's `rounded-full` submit. */
export function AuthButton({
  label,
  busyLabel,
  busy,
  onPress,
  disabled,
}: {
  label: string;
  busyLabel?: string;
  busy?: boolean;
  onPress: () => void;
  disabled?: boolean;
}) {
  const blocked = !!(busy || disabled);
  return (
    <TouchableOpacity
      disabled={blocked}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: blocked, busy: !!busy }}
      style={[s.solidBtn, blocked ? s.solidBtnBlocked : s.solidBtnBrand]}
    >
      {busy ? <ActivityIndicator size="small" color="#ffffff" /> : null}
      <Text style={s.solidBtnLabel}>{busy ? busyLabel || 'Please wait...' : label}</Text>
    </TouchableOpacity>
  );
}

/** Checkbox + label, for "Remember me" and the terms row. */
export function AuthCheckbox({
  checked,
  onToggle,
  label,
  children,
  align = 'center',
}: {
  checked: boolean;
  onToggle: () => void;
  label: string;
  children?: React.ReactNode;
  align?: 'center' | 'start';
}) {
  return (
    /* The whole row is the target, and the box sits inside a 44pt square.
       It was a 16pt box with hitSlop 6 — a 28pt target for the control that
       gates the entire Create Account button. Negative margins keep the box
       visually where it was while the tappable area around it grows. */
    <TouchableOpacity
      onPress={onToggle}
      activeOpacity={0.7}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={label}
      style={{
        flexDirection: 'row',
        alignItems: align === 'start' ? 'flex-start' : 'center',
        marginVertical: -10,
        paddingVertical: 10,
      }}
    >
      <View
        style={{
          width: 44,
          height: 44,
          marginLeft: -12,
          marginRight: -4,
          marginTop: align === 'start' ? -12 : 0,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <View
          style={{
            width: 20,
            height: 20,
            borderRadius: 5,
            borderWidth: checked ? 0 : 1.5,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: checked ? BRAND : '#ffffff',
            borderColor: '#d1d5db',
          }}
        >
          {checked ? <Check size={13} color="#ffffff" strokeWidth={3} /> : null}
        </View>
      </View>
      {children ?? (
        <Text style={{ fontFamily: Fonts.sans, fontSize: 13, color: LABEL }}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

/** Rule — label — rule. The web's reads "Or continue with". */
export function AuthDivider({ label }: { label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 }}>
      <View style={{ flex: 1, height: 1, backgroundColor: '#d1d5db' }} />
      <Text style={{ fontFamily: Fonts.sans, fontSize: 12, color: '#6b7280' }}>{label}</Text>
      <View style={{ flex: 1, height: 1, backgroundColor: '#d1d5db' }} />
    </View>
  );
}

/** The card-foot switch link ("Don't have an account? Create one"). */
export function AuthSwitch({
  prompt,
  action,
  onPress,
}: {
  prompt: string;
  action: string;
  onPress: () => void;
}) {
  return (
    <View style={{ marginTop: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ fontFamily: Fonts.sans, fontSize: 14, color: MUTED }}>{prompt} </Text>
      <TouchableOpacity onPress={onPress} activeOpacity={0.7} hitSlop={8} accessibilityRole="link">
        <Text style={{ fontFamily: Fonts.sansSemibold, fontSize: 14, fontWeight: '600', color: BRAND }}>
          {action}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

/* ── Google ─────────────────────────────────────────────────────────────── */

/**
 * The Google "G", drawn locally — the same four paths the web inlines as SVG
 * in LoginForm.tsx. Mobile had been fetching this mark from
 * developers.google.com at runtime, which is a third-party request from a
 * sign-in screen and an empty gap whenever the device is offline.
 */
export function GoogleMark({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <Path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <Path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <Path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </Svg>
  );
}

/** Outline pill with the Google mark — the web's "Continue with Google". */
export function GoogleButton({
  onPress,
  busy,
  label = 'Continue with Google',
  compact,
}: {
  onPress: () => void;
  busy?: boolean;
  label?: string;
  compact?: boolean;
}) {
  return (
    <TouchableOpacity
      disabled={busy}
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!busy, busy: !!busy }}
      style={[s.ghostBtn, compact && s.ghostBtnCompact, busy && s.ghostBtnBusy]}
    >
      {busy ? (
        <ActivityIndicator size="small" color="#4285F4" />
      ) : (
        <GoogleMark size={compact ? 15 : 18} />
      )}
      <Text style={[s.ghostBtnLabel, compact && s.ghostBtnLabelCompact]}>
        {busy ? 'Signing in...' : label}
      </Text>
    </TouchableOpacity>
  );
}

/* ── Validation shared with the web forms ─────────────────────────────────── */

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type PasswordStrength = 'weak' | 'medium' | 'strong';

/** Same thresholds as frontend LoginRegister/RegisterForm.tsx. */
export function passwordStrength(value: string): PasswordStrength {
  if (value.length >= 12 && /[A-Z]/.test(value) && /[0-9]/.test(value) && /[!@#$%^&*]/.test(value)) {
    return 'strong';
  }
  if (value.length >= 10 && /[A-Z]/.test(value) && /[0-9]/.test(value)) {
    return 'medium';
  }
  return 'weak';
}

export function StrengthMeter({ value }: { value: string }) {
  if (!value) return null;
  const strength = passwordStrength(value);
  const fill = strength === 'strong' ? '#16a34a' : strength === 'medium' ? '#d97706' : ERROR;
  const width = strength === 'strong' ? '100%' : strength === 'medium' ? '66%' : '33%';
  const label = strength.charAt(0).toUpperCase() + strength.slice(1);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
      <View style={{ flex: 1, height: 5, borderRadius: 999, backgroundColor: '#e5e7eb', overflow: 'hidden' }}>
        <View style={{ height: 5, borderRadius: 999, backgroundColor: fill, width: width as any }} />
      </View>
      <Text style={{ fontFamily: Fonts.sansSemibold, fontSize: 10, fontWeight: '600', color: fill }}>
        {label}
      </Text>
    </View>
  );
}

/** Re-exported so screens can tint icons without importing the theme too. */
export const AUTH_COLORS = { GROUND, BRAND, INK, LABEL, MUTED, BORDER, ERROR, PALETTE: Palette };

/* ── Styles ───────────────────────────────────────────────────────────────
   The two buttons are TouchableOpacity with plain StyleSheet entries, the
   same construction every other control on this screen uses. They were
   Pressables taking a `style` function; the submit button rendered as an
   invisible white label on the white card, which is what a dropped background
   looks like. Using the pattern that demonstrably works here removes the
   variable rather than betting on a diagnosis. */
const s = StyleSheet.create({
  solidBtn: {
    width: '100%',
    minHeight: 48,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 20,
  },
  solidBtnBrand: {
    backgroundColor: BRAND,
    shadowColor: BRAND,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 3,
  },
  solidBtnBlocked: { backgroundColor: '#9ca3af' },
  solidBtnLabel: {
    fontFamily: Fonts.sansSemibold,
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
  },

  ghostBtn: {
    width: '100%',
    minHeight: 48,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#ffffff',
  },
  ghostBtnCompact: { minHeight: 38 },
  ghostBtnBusy: { backgroundColor: '#f9fafb' },
  ghostBtnLabel: {
    fontFamily: Fonts.sansSemibold,
    fontSize: 15,
    fontWeight: '600',
    color: LABEL,
  },
  ghostBtnLabelCompact: { fontSize: 12.5 },
});
