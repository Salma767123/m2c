// QC checker "forgot password" — requests a reset email.
//
// Mirrors the web portal's /checker/forgot-password page step for step: same
// endpoint, same userType, same "Check your email / next steps" confirmation.
//
// One thing web does not need: the reset LINK is built by the backend from
// FRONTEND_URL, so it opens the web reset page in a browser rather than
// deep-linking back into the app. The confirmation therefore also offers
// "I have a reset code", which carries the token to the in-app reset screen.

import React, { useCallback, useState } from 'react';
import { View, TextInput, Pressable, Image, StatusBar } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Mail, ArrowLeft, Send, CheckCircle2, KeyRound, AlertCircle } from 'lucide-react-native';
import qcCheckerService from '../../services/qcCheckerService';
import { showSuccessToast, showErrorToast } from '@/lib/toast-utils';
import { AppText, Card, Button } from '@/components/UI';
import { brand, colors, fonts, space, elevation, danger, slate, success, info } from '@/constants/design';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordScreen() {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [focused, setFocused] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const validate = useCallback((value: string) => {
    const v = value.trim();
    if (!v) {
      setEmailError('Email is required');
      return false;
    }
    if (!EMAIL_RE.test(v)) {
      setEmailError('Enter a valid email address');
      return false;
    }
    setEmailError('');
    return true;
  }, []);

  const handleSubmit = async () => {
    if (submitting || !validate(email)) return;
    setSubmitting(true);
    setEmailError('');
    try {
      await qcCheckerService.forgotPassword(email);
      setSent(true);
      showSuccessToast('Password Reset Email Sent', 'Check your email for reset instructions');
    } catch (err: any) {
      // Same split as web: bad input is reported inline on the field, a failed
      // request is reported as a toast. The backend deliberately does not
      // confirm whether an address exists, so anything that comes back here is
      // a real failure worth surfacing.
      showErrorToast('Reset Failed', err?.message || 'Failed to send reset email');
    } finally {
      setSubmitting(false);
    }
  };

  const fieldBorder = emailError
    ? 'border-red-400'
    : focused
      ? 'border-brand-500'
      : 'border-slate-200';

  return (
    <View className="flex-1" style={{ backgroundColor: brand[600] }}>
      <StatusBar barStyle="light-content" />
      <KeyboardAwareScrollView
        contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top, paddingBottom: insets.bottom + 24 }}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid
        showsVerticalScrollIndicator={false}
      >
        <View className="px-6 py-8">
          {/* Back to sign in */}
          <Pressable
            onPress={() => router.back()}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Back to sign in"
            className="w-10 h-10 rounded-full items-center justify-center"
            style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
          >
            <ArrowLeft size={20} color={colors.white} />
          </Pressable>

          {/* Logo */}
          <View className="items-center mb-8 mt-4" style={{ gap: 16 }}>
            <View
              className="bg-white rounded-full items-center justify-center overflow-hidden"
              style={[{ width: 132, height: 132 }, elevation.raised]}
            >
              <Image
                source={require('../../../assets/images/m2c-logo.png')}
                style={{ width: 108, height: 108 }}
                resizeMode="contain"
              />
            </View>
            <View className="items-center" style={{ gap: 4 }}>
              <AppText variant="headlineLg" color={colors.white}>Reset Password</AppText>
              <AppText variant="bodySm" color="rgba(255,255,255,0.9)">Quality Control Portal</AppText>
            </View>
          </View>

          <Card style={{ padding: 24, gap: 20 }}>
            {sent ? (
              // ── Confirmation ───────────────────────────────────────────
              <View style={{ gap: 16 }}>
                <View className="items-center" style={{ gap: 12 }}>
                  <View
                    className="w-14 h-14 rounded-full items-center justify-center"
                    style={{ backgroundColor: success[100] }}
                  >
                    <CheckCircle2 size={28} color={success[600]} strokeWidth={2} />
                  </View>
                  <AppText variant="titleLg">Check Your Email</AppText>
                </View>

                {/* The address it went to — same reassurance web gives, and the
                    only way to catch a typo before waiting on a mail that
                    will never arrive. */}
                <View style={{ gap: 8 }}>
                  <AppText variant="bodySm" color={colors.textMuted} style={{ textAlign: 'center' }}>
                    We&apos;ve sent a password reset link to:
                  </AppText>
                  <View className="rounded-xl px-4 py-3" style={{ backgroundColor: slate[50] }}>
                    <AppText variant="labelLg" style={{ textAlign: 'center' }}>{email}</AppText>
                  </View>
                </View>

                {/* Next steps — web's blue info panel. */}
                <View
                  className="rounded-xl px-4 py-3 border"
                  style={{ backgroundColor: info[50], borderColor: info[100], gap: 8 }}
                >
                  <View className="flex-row items-center" style={{ gap: 8 }}>
                    <Mail size={16} color={info[600]} />
                    <AppText variant="labelLg" color={info[600]}>Next steps</AppText>
                  </View>
                  <View style={{ gap: 4, paddingLeft: 24 }}>
                    <AppText variant="bodySm" color={info[600]}>• Check your email inbox</AppText>
                    <AppText variant="bodySm" color={info[600]}>• Open the reset link in the email</AppText>
                    <AppText variant="bodySm" color={info[600]}>• Create your new password</AppText>
                  </View>
                </View>

                {/* Mobile-only bridge: the emailed link opens the web page, so a
                    checker who wants to finish inside the app pastes the token. */}
                <Button
                  label="I have a reset code"
                  variant="primary"
                  size="lg"
                  icon={KeyRound}
                  onPress={() => router.push('/(auth)/ResetPassword' as any)}
                  fullWidth
                />
                <Button
                  label="Send Another Email"
                  variant="secondary"
                  size="lg"
                  icon={Send}
                  onPress={() => { setSent(false); setEmailError(''); }}
                  fullWidth
                />
                <Pressable
                  onPress={() => router.back()}
                  hitSlop={8}
                  accessibilityRole="link"
                  style={{ alignSelf: 'center' }}
                >
                  <AppText variant="labelLg" color={colors.textSecondary}>Back to Sign In</AppText>
                </Pressable>
              </View>
            ) : (
              // ── Request form ───────────────────────────────────────────
              <>
                <View className="flex-row items-center" style={{ gap: 12 }}>
                  <View
                    className="w-10 h-10 rounded-full items-center justify-center"
                    style={{ backgroundColor: brand[500] }}
                  >
                    <KeyRound size={20} color={colors.white} strokeWidth={2} />
                  </View>
                  <View style={{ gap: 2, flex: 1 }}>
                    <AppText variant="titleLg">Forgot password?</AppText>
                    <AppText variant="bodySm" color={colors.textMuted}>
                      We&apos;ll email you a reset link
                    </AppText>
                  </View>
                </View>

                <View style={{ gap: 8 }}>
                  <AppText variant="labelLg" color={colors.textSecondary}>
                    Registered Email
                  </AppText>
                  <View
                    className={`flex-row items-center bg-slate-50 rounded-xl px-3 py-3 border ${fieldBorder}`}
                    style={{ borderCurve: 'continuous', gap: 12 }}
                  >
                    <Mail size={18} color={emailError ? danger[500] : slate[400]} />
                    <TextInput
                      value={email}
                      onChangeText={(t) => { setEmail(t); if (emailError) setEmailError(''); }}
                      onFocus={() => setFocused(true)}
                      onBlur={() => { setFocused(false); if (email) validate(email); }}
                      onSubmitEditing={handleSubmit}
                      placeholder="you@company.com"
                      placeholderTextColor={slate[400]}
                      autoCapitalize="none"
                      autoCorrect={false}
                      keyboardType="email-address"
                      returnKeyType="send"
                      editable={!submitting}
                      style={{ flex: 1, fontFamily: fonts.regular, fontSize: 15, color: colors.text }}
                    />
                  </View>
                  {!!emailError && (
                    <View className="flex-row items-center" style={{ gap: 6 }}>
                      <AlertCircle size={14} color={danger[500]} />
                      <AppText variant="bodySm" color={danger[500]} style={{ flex: 1 }}>{emailError}</AppText>
                    </View>
                  )}
                </View>

                <Button
                  label={submitting ? 'Sending...' : 'Send Reset Link'}
                  variant="primary"
                  size="lg"
                  icon={submitting ? undefined : Send}
                  loading={submitting}
                  disabled={submitting}
                  onPress={handleSubmit}
                  fullWidth
                  style={{ marginTop: space.sm }}
                />

                <Pressable
                  onPress={() => router.back()}
                  disabled={submitting}
                  hitSlop={8}
                  accessibilityRole="link"
                  style={{ alignSelf: 'center' }}
                >
                  <AppText variant="labelLg" color={colors.textSecondary}>
                    Back to Sign In
                  </AppText>
                </Pressable>
              </>
            )}
          </Card>
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
}
