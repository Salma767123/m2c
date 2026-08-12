/**
 * Shared chrome for the auth screens (Login / Register / Forgot / Reset / Verify).
 *
 * Login.tsx established the visual language — dark canvas, company logo, a white
 * card holding the form — before there were any sibling screens. These pieces
 * extract that language so the four screens added alongside it stay identical
 * without copy-pasting the layout five times.
 */
import React, { useEffect, useState } from 'react';
import { Text, TextInput, TouchableOpacity, View, Image, StatusBar } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Eye, EyeOff } from 'lucide-react-native';
import { companyInfoService } from '@/services/companyInfoService';
import { Palette } from '@/constants/theme';

const STATIC_LOGO = require('../../../../assets/images/logo4.png');

/** Dark canvas + logo header + white card. Wraps every auth screen. */
export function AuthShell({
  title,
  subtitle,
  icon,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const [companyLogo, setCompanyLogo] = useState<string | null>(null);
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    companyInfoService.getCachedCompanyInfo().then((info) => {
      if (info.companyLogo) setCompanyLogo(info.companyLogo);
    });
    companyInfoService
      .getPublicCompanyInfo()
      .then((info) => {
        if (info.companyLogo) setCompanyLogo(info.companyLogo);
      })
      .catch(() => {});
  }, []);

  return (
    <View className="flex-1 bg-black" style={{ paddingTop: insets.top }}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" translucent={false} />
      <KeyboardAwareScrollView
        contentContainerStyle={{ paddingBottom: 20 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        enableOnAndroid
        enableAutomaticScroll
        extraScrollHeight={20}
      >
        <View className="px-6 py-8">
          <View className="items-center mb-8 mt-4">
            {/* White plate behind the mark. logo4.png is black line art on a
                transparent background, so it vanishes on this dark canvas without
                one — the splash screen solves it the same way. */}
            <View className="mb-4 bg-white rounded-3xl px-5 py-3">
              <Image
                source={companyLogo ? { uri: companyLogo } : STATIC_LOGO}
                className="w-44 h-28"
                resizeMode="contain"
              />
            </View>
            <Text className="text-2xl font-bold text-white mb-1">M2C Store</Text>
            <Text className="text-sm text-gray-400 text-center">Your Shopping Destination</Text>
          </View>

          <View className="bg-white rounded-2xl p-5 shadow-2xl">
            <View className="flex-row items-center mb-5">
              <View className="bg-brand-500 rounded-full p-2 mr-3">{icon}</View>
              <View className="flex-1">
                <Text className="text-lg font-bold text-black">{title}</Text>
                <Text className="text-xs text-gray-600">{subtitle}</Text>
              </View>
            </View>
            {children}
          </View>

          {footer}

          <View className="mt-5 items-center pb-2">
            <Text className="text-xs text-gray-600">
              {'©'} {currentYear} M2C Store. All rights reserved.
            </Text>
          </View>
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
}

/** Labelled text field with a leading icon and inline error, matching Login.tsx. */
export function AuthField({
  label,
  icon,
  error,
  secure,
  value,
  onChangeText,
  ...rest
}: {
  label: string;
  icon: React.ReactNode;
  error?: string;
  secure?: boolean;
  value: string;
  onChangeText: (v: string) => void;
} & Omit<React.ComponentProps<typeof TextInput>, 'value' | 'onChangeText'>) {
  const [reveal, setReveal] = useState(false);

  return (
    <View className="mb-4">
      <Text className="text-xs font-semibold text-gray-800 mb-2">{label}</Text>
      <View
        className={`flex-row items-center bg-gray-50 rounded-xl px-3 py-3 border ${
          error ? 'border-error-500' : 'border-gray-300'
        }`}
      >
        {icon}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secure && !reveal}
          placeholderTextColor="#9ca3af"
          className="flex-1 ml-3 text-sm text-black"
          {...rest}
        />
        {secure ? (
          <TouchableOpacity onPress={() => setReveal((r) => !r)} className="ml-2" activeOpacity={0.7}>
            {reveal ? (
              <EyeOff size={18} color={Palette.textMuted} strokeWidth={2} />
            ) : (
              <Eye size={18} color={Palette.textMuted} strokeWidth={2} />
            )}
          </TouchableOpacity>
        ) : null}
      </View>
      {!!error && (
        <View className="flex-row items-center mt-1.5">
          <View className="bg-error-500 rounded-full w-1 h-1 mr-2" />
          <Text className="text-xs text-error-500">{error}</Text>
        </View>
      )}
    </View>
  );
}

/** Full-width brand CTA with a busy state. */
export function AuthButton({
  label,
  busyLabel,
  busy,
  onPress,
  icon,
  disabled,
}: {
  label: string;
  busyLabel?: string;
  busy?: boolean;
  onPress: () => void;
  icon?: React.ReactNode;
  disabled?: boolean;
}) {
  const blocked = busy || disabled;
  return (
    <TouchableOpacity
      disabled={blocked}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!blocked, busy: !!busy }}
      className={`rounded-xl py-3.5 items-center justify-center flex-row shadow-lg ${
        blocked ? 'bg-gray-400' : 'bg-brand-500'
      }`}
    >
      {icon}
      <Text className="font-bold text-sm ml-2 text-white">
        {busy ? busyLabel || 'Please wait...' : label}
      </Text>
    </TouchableOpacity>
  );
}

/** "Already have an account? Sign in" style link row under the card. */
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
    <View className="mt-5 flex-row items-center justify-center">
      <Text className="text-xs text-gray-400">{prompt} </Text>
      <TouchableOpacity onPress={onPress} activeOpacity={0.7} accessibilityRole="link">
        <Text className="text-xs font-bold text-brand-400">{action}</Text>
      </TouchableOpacity>
    </View>
  );
}

/* ── Validation shared with the web forms ─────────────────────────────────── */

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type PasswordStrength = 'weak' | 'medium' | 'strong';

/** Same thresholds as frontend/src/components/WebSite/LoginRegister/RegisterForm.tsx. */
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
  const fill =
    strength === 'strong' ? 'bg-success-500' : strength === 'medium' ? 'bg-warning-500' : 'bg-error-500';
  const width = strength === 'strong' ? 'w-full' : strength === 'medium' ? 'w-2/3' : 'w-1/3';
  const label = strength.charAt(0).toUpperCase() + strength.slice(1);

  return (
    <View className="flex-row items-center mt-2">
      <View className="flex-1 h-1 rounded-full bg-gray-200 overflow-hidden">
        <View className={`h-1 rounded-full ${fill} ${width}`} />
      </View>
      <Text className="text-[10px] font-semibold text-gray-600 ml-2">{label}</Text>
    </View>
  );
}
