// QC checker "reset password" — sets a new password from a reset token.
//
// Port of the web portal's /checker/reset-password page. Same rules, same
// endpoint, same success state, so a checker gets an identical experience on
// either client.
//
// Reaching it: the reset email is built by the backend from FRONTEND_URL, so
// its link opens the WEB page, not this screen. Two routes therefore lead here
// without needing a backend change:
//   1. the deep link  mobile://reset-password?token=…  (see app/reset-password.tsx)
//   2. pasting the token by hand, offered from the Forgot Password screen —
//      the fallback for a checker who only has the email on another device.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, TextInput, Pressable, Image, StatusBar } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle2, Shield, KeyRound } from 'lucide-react-native';
import qcCheckerService from '../../services/qcCheckerService';
import { showSuccessToast, showErrorToast } from '@/lib/toast-utils';
import { AppText, Card, Button } from '@/components/UI';
import { brand, colors, fonts, space, elevation, danger, slate, success } from '@/constants/design';

/**
 * Password policy — character-for-character the web's validatePassword, so a
 * password accepted on one client is never rejected on the other.
 */
function validatePassword(password: string): string | null {
  if (password.length < 8) return 'Password must be at least 8 characters long';
  if (!/(?=.*[a-z])/.test(password)) return 'Password must contain at least one lowercase letter';
  if (!/(?=.*[A-Z])/.test(password)) return 'Password must contain at least one uppercase letter';
  if (!/(?=.*\d)/.test(password)) return 'Password must contain at least one number';
  if (!/(?=.*[@$!%*?&])/.test(password)) return 'Password must contain at least one special character (@$!%*?&)';
  return null;
}

export default function ResetPasswordScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ token?: string }>();

  // The token may arrive from a deep link or be typed in. Held in state so the
  // manual-entry path can fill it.
  const [token, setToken] = useState(params.token ?? '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState<{ token?: string; password?: string; confirmPassword?: string }>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [focused, setFocused] = useState<'token' | 'password' | 'confirm' | null>(null);

  const passwordRef = useRef<TextInput>(null);

  // A deep-linked token means the checker is ready to type — focus the field.
  // Web does the same on mount.
  useEffect(() => {
    if (params.token) {
      setToken(params.token);
      const t = setTimeout(() => passwordRef.current?.focus(), 350);
      return () => clearTimeout(t);
    }
  }, [params.token]);

  const handleSubmit = useCallback(async () => {
    if (submitting) return;
    const next: typeof errors = {};
    if (!token.trim()) next.token = 'Paste the reset code from your email';
    const pwErr = validatePassword(password);
    if (pwErr) next.password = pwErr;
    if (password !== confirmPassword) next.confirmPassword = 'Passwords do not match';
    if (Object.keys(next).length > 0) {
      setErrors(next);
      return;
    }

    setSubmitting(true);
    setErrors({});
    try {
      const res = await qcCheckerService.resetPassword(token.trim(), password);
      if (res?.success === false) throw new Error(res.error || 'Failed to reset password');
      setDone(true);
      showSuccessToast('Password Reset Successful', 'Your password has been updated successfully');
    } catch (err: any) {
      // Web only toasts this. Mobile also pins it to the token field: an expired
      // or already-used token is the usual cause, and that is the one input the
      // checker has to go back and replace.
      const message = err?.message || 'Failed to reset password';
      setErrors({ token: message });
      showErrorToast('Reset Failed', message);
    } finally {
      setSubmitting(false);
    }
  }, [submitting, token, password, confirmPassword]);

  const border = (hasError: boolean, isFocused: boolean) =>
    hasError ? 'border-red-400' : isFocused ? 'border-brand-500' : 'border-slate-200';

  const goToLogin = () => router.replace('/(auth)/Login' as any);

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
              <AppText variant="headlineLg" color={colors.white}>QC Checker Portal</AppText>
              <AppText variant="bodySm" color="rgba(255,255,255,0.9)">
                {done ? 'Password Reset Complete' : 'Choose a new password'}
              </AppText>
            </View>
          </View>

          <Card style={{ padding: 24, gap: 20 }}>
            {done ? (
              // ── Success ────────────────────────────────────────────────
              <View style={{ gap: 16 }}>
                <View className="items-center" style={{ gap: 12 }}>
                  <View
                    className="w-14 h-14 rounded-full items-center justify-center"
                    style={{ backgroundColor: success[100] }}
                  >
                    <CheckCircle2 size={28} color={success[600]} strokeWidth={2} />
                  </View>
                  <AppText variant="titleLg">Password Reset Successful</AppText>
                  <AppText variant="bodySm" color={colors.textMuted} style={{ textAlign: 'center' }}>
                    Your password has been successfully reset. You can now log in
                    with your new password.
                  </AppText>
                </View>
                <Button
                  label="Continue to Login"
                  variant="primary"
                  size="lg"
                  icon={Shield}
                  onPress={goToLogin}
                  fullWidth
                />
              </View>
            ) : (
              <>
                <View className="flex-row items-center" style={{ gap: 12 }}>
                  <View
                    className="w-10 h-10 rounded-full items-center justify-center"
                    style={{ backgroundColor: brand[500] }}
                  >
                    <Lock size={20} color={colors.white} strokeWidth={2} />
                  </View>
                  <View style={{ gap: 2, flex: 1 }}>
                    <AppText variant="titleLg">Reset Your Password</AppText>
                    <AppText variant="bodySm" color={colors.textMuted}>Enter your new password below</AppText>
                  </View>
                </View>

                {/* Reset code — hidden when a deep link already supplied it, since
                    there is nothing useful for the checker to do with it. */}
                {!params.token && (
                  <View style={{ gap: 8 }}>
                    <AppText variant="labelLg" color={colors.textSecondary}>Reset Code</AppText>
                    <View
                      className={`flex-row items-center bg-slate-50 rounded-xl px-3 py-3 border ${border(!!errors.token, focused === 'token')}`}
                      style={{ borderCurve: 'continuous', gap: 12 }}
                    >
                      <KeyRound size={18} color={errors.token ? danger[500] : slate[400]} />
                      <TextInput
                        value={token}
                        onChangeText={(t) => { setToken(t); if (errors.token) setErrors((p) => ({ ...p, token: undefined })); }}
                        onFocus={() => setFocused('token')}
                        onBlur={() => setFocused(null)}
                        placeholder="Paste the code from your email"
                        placeholderTextColor={slate[400]}
                        autoCapitalize="none"
                        autoCorrect={false}
                        editable={!submitting}
                        style={{ flex: 1, fontFamily: fonts.regular, fontSize: 15, color: colors.text }}
                      />
                    </View>
                    <AppText variant="bodySm" color={colors.textMuted}>
                      The reset email contains a link ending in{' '}
                      <AppText variant="bodySm" color={colors.textSecondary}>?token=…</AppText> — paste
                      everything after it.
                    </AppText>
                  </View>
                )}
                {!!errors.token && (
                  <View className="flex-row items-center" style={{ gap: 6, marginTop: -8 }}>
                    <AlertCircle size={14} color={danger[500]} />
                    <AppText variant="bodySm" color={danger[500]} style={{ flex: 1 }}>{errors.token}</AppText>
                  </View>
                )}

                {/* New password */}
                <View style={{ gap: 8 }}>
                  <AppText variant="labelLg" color={colors.textSecondary}>New Password</AppText>
                  <View
                    className={`flex-row items-center bg-slate-50 rounded-xl px-3 py-3 border ${border(!!errors.password, focused === 'password')}`}
                    style={{ borderCurve: 'continuous', gap: 12 }}
                  >
                    <Lock size={18} color={errors.password ? danger[500] : slate[400]} />
                    <TextInput
                      ref={passwordRef}
                      value={password}
                      onChangeText={(t) => { setPassword(t); if (errors.password) setErrors((p) => ({ ...p, password: undefined })); }}
                      onFocus={() => setFocused('password')}
                      onBlur={() => setFocused(null)}
                      placeholder="Enter your new password"
                      placeholderTextColor={slate[400]}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                      editable={!submitting}
                      style={{ flex: 1, fontFamily: fonts.regular, fontSize: 15, color: colors.text }}
                    />
                    <Pressable onPress={() => setShowPassword((s) => !s)} hitSlop={8} accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}>
                      {showPassword ? <EyeOff size={18} color={slate[400]} /> : <Eye size={18} color={slate[400]} />}
                    </Pressable>
                  </View>
                  {!!errors.password && (
                    <View className="flex-row items-center" style={{ gap: 6 }}>
                      <AlertCircle size={14} color={danger[500]} />
                      <AppText variant="bodySm" color={danger[500]} style={{ flex: 1 }}>{errors.password}</AppText>
                    </View>
                  )}
                </View>

                {/* Confirm */}
                <View style={{ gap: 8 }}>
                  <AppText variant="labelLg" color={colors.textSecondary}>Confirm New Password</AppText>
                  <View
                    className={`flex-row items-center bg-slate-50 rounded-xl px-3 py-3 border ${border(!!errors.confirmPassword, focused === 'confirm')}`}
                    style={{ borderCurve: 'continuous', gap: 12 }}
                  >
                    <Lock size={18} color={errors.confirmPassword ? danger[500] : slate[400]} />
                    <TextInput
                      value={confirmPassword}
                      onChangeText={(t) => { setConfirmPassword(t); if (errors.confirmPassword) setErrors((p) => ({ ...p, confirmPassword: undefined })); }}
                      onFocus={() => setFocused('confirm')}
                      onBlur={() => setFocused(null)}
                      onSubmitEditing={handleSubmit}
                      placeholder="Confirm your new password"
                      placeholderTextColor={slate[400]}
                      secureTextEntry={!showConfirm}
                      autoCapitalize="none"
                      autoCorrect={false}
                      returnKeyType="done"
                      editable={!submitting}
                      style={{ flex: 1, fontFamily: fonts.regular, fontSize: 15, color: colors.text }}
                    />
                    <Pressable onPress={() => setShowConfirm((s) => !s)} hitSlop={8} accessibilityLabel={showConfirm ? 'Hide password' : 'Show password'}>
                      {showConfirm ? <EyeOff size={18} color={slate[400]} /> : <Eye size={18} color={slate[400]} />}
                    </Pressable>
                  </View>
                  {!!errors.confirmPassword && (
                    <View className="flex-row items-center" style={{ gap: 6 }}>
                      <AlertCircle size={14} color={danger[500]} />
                      <AppText variant="bodySm" color={danger[500]} style={{ flex: 1 }}>{errors.confirmPassword}</AppText>
                    </View>
                  )}
                </View>

                <Button
                  label={submitting ? 'Resetting Password...' : 'Reset Password'}
                  variant="primary"
                  size="lg"
                  icon={submitting ? undefined : Shield}
                  loading={submitting}
                  disabled={submitting}
                  onPress={handleSubmit}
                  fullWidth
                  style={{ marginTop: space.sm }}
                />

                <Pressable
                  onPress={goToLogin}
                  disabled={submitting}
                  hitSlop={8}
                  accessibilityRole="link"
                  style={{ alignSelf: 'center' }}
                >
                  <AppText variant="labelLg" color={colors.textSecondary}>Back to Sign In</AppText>
                </Pressable>
              </>
            )}
          </Card>
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
}
