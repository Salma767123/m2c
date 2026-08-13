import React, { useCallback, useState } from 'react';
import {
  Alert,
  TextInput,
  Pressable,
  View,
  Image,
  StatusBar,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { User, Lock, LogIn, Shield, Eye, EyeOff } from 'lucide-react-native';
import { qcCheckerService } from '../../services/qcCheckerService';
import { AppText, Card, Button } from '@/components/UI';
import { brand, colors, fonts, space, elevation, danger } from '@/constants/design';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const [checkerId, setCheckerId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [checkerIdError, setCheckerIdError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [focusedField, setFocusedField] = useState<'id' | 'password' | null>(null);
  const currentYear = new Date().getFullYear();

  const validateCheckerId = useCallback((value: string) => {
    if (!value) {
      setCheckerIdError('Checker ID is required');
      return false;
    }
    setCheckerIdError('');
    return true;
  }, []);

  const validatePassword = useCallback((value: string) => {
    if (!value) {
      setPasswordError('Password is required');
      return false;
    }
    setPasswordError('');
    return true;
  }, []);

  const handleSubmit = useCallback(async () => {
    const normalizedId = checkerId.trim().toUpperCase();
    const trimmedPassword = password.trim();

    const isIdValid = validateCheckerId(normalizedId);
    const isPasswordValid = validatePassword(trimmedPassword);

    if (!isIdValid || !isPasswordValid) {
      return;
    }

    try {
      setSubmitting(true);
      const result = await qcCheckerService.login({
        checkerId: normalizedId,
        password: trimmedPassword,
      });

      if (result.success && result.data) {
        await qcCheckerService.storeCheckerAuth(result.data.token, result.data.checker);

        // Register for push notifications (optional, don't block login)
        try {
          const notificationService = await import('@/services/notificationService');
          notificationService.registerForPushNotifications().catch(console.error);
        } catch {
          console.log('Push notification registration skipped');
        }

        router.replace('/(tabs)');
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Invalid credentials. Please check your Checker ID and password.';
      Alert.alert('Login Failed', errorMessage);
    } finally {
      setSubmitting(false);
    }
  }, [checkerId, password, validateCheckerId, validatePassword]);

  // Input border colour: error → danger, focused → brand red, else slate.
  const fieldBorder = (isError: boolean, isFocused: boolean) =>
    isError ? 'border-red-400' : isFocused ? 'border-brand-500' : 'border-slate-200';

  return (
    // Brand-red backdrop, matching the web portal's checker login rebrand. Web
    // uses a from-brand-600/to-brand-700 gradient; those two reds are close
    // enough that a solid brand-600 reads the same without pulling in a
    // gradient dependency for one screen.
    <View className="flex-1" style={{ backgroundColor: brand[600], paddingTop: insets.top }}>
      <StatusBar barStyle="light-content" />
      <KeyboardAwareScrollView
        contentContainerStyle={{ paddingBottom: 20, flexGrow: 1, justifyContent: 'center' }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        enableOnAndroid={true}
        enableAutomaticScroll={true}
        extraScrollHeight={80}
      >
        <View className="px-6 py-8">
          {/* Logo Section */}
          <View className="items-center mb-8 mt-4" style={{ gap: 16 }}>
            <View
              className="bg-white rounded-full items-center justify-center overflow-hidden"
              style={[{ width: 160, height: 160 }, elevation.raised]}
            >
              <Image
                source={require('../../../assets/images/m2c-logo.png')}
                style={{ width: 132, height: 132 }}
                resizeMode="contain"
              />
            </View>
            <View className="items-center" style={{ gap: 4 }}>
              <AppText variant="headlineLg" color={colors.white}>QC Checker</AppText>
              <AppText variant="bodySm" color="rgba(255,255,255,0.9)">
                Quality Control Portal
              </AppText>
            </View>
          </View>

          {/* Login Card */}
          <Card style={{ padding: 24, gap: 20 }}>
            <View className="flex-row items-center" style={{ gap: 12 }}>
              <View
                className="w-10 h-10 rounded-full items-center justify-center"
                style={{ backgroundColor: brand[500] }}
              >
                <Shield size={20} color={colors.white} strokeWidth={2} />
              </View>
              <View style={{ gap: 2 }}>
                <AppText variant="titleLg">Sign In</AppText>
                <AppText variant="bodySm" color={colors.textMuted}>Access your dashboard</AppText>
              </View>
            </View>

            {/* Checker ID Input */}
            <View style={{ gap: 8 }}>
              <AppText variant="labelLg" color={colors.textSecondary}>
                Checker ID
              </AppText>
              <View
                className={`flex-row items-center bg-slate-50 rounded-xl px-3 py-3 border ${fieldBorder(
                  !!checkerIdError,
                  focusedField === 'id'
                )}`}
                style={{ borderCurve: 'continuous', gap: 12 }}
              >
                <User
                  size={18}
                  color={focusedField === 'id' ? brand[500] : colors.textMuted}
                  strokeWidth={2}
                />
                <TextInput
                  value={checkerId}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  onChangeText={(value) => {
                    setCheckerId(value.toUpperCase());
                    if (checkerIdError) setCheckerIdError('');
                  }}
                  onFocus={() => setFocusedField('id')}
                  onBlur={() => {
                    setFocusedField(null);
                    validateCheckerId(checkerId);
                  }}
                  placeholder="e.g. QC-001"
                  placeholderTextColor={colors.textFaint}
                  className="flex-1"
                  style={{ fontFamily: fonts.regular, fontSize: 15, color: colors.text }}
                  editable={!submitting}
                />
              </View>
              {!!checkerIdError && (
                <AppText variant="bodySm" color={danger[500]}>{checkerIdError}</AppText>
              )}
            </View>

            {/* Password Input */}
            <View style={{ gap: 8 }}>
              <AppText variant="labelLg" color={colors.textSecondary}>
                Password
              </AppText>
              <View
                className={`flex-row items-center bg-slate-50 rounded-xl px-3 py-3 border ${fieldBorder(
                  !!passwordError,
                  focusedField === 'password'
                )}`}
                style={{ borderCurve: 'continuous', gap: 12 }}
              >
                <Lock
                  size={18}
                  color={focusedField === 'password' ? brand[500] : colors.textMuted}
                  strokeWidth={2}
                />
                <TextInput
                  value={password}
                  secureTextEntry={!showPassword}
                  onChangeText={(value) => {
                    setPassword(value);
                    if (passwordError) setPasswordError('');
                  }}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => {
                    setFocusedField(null);
                    validatePassword(password);
                  }}
                  placeholder="Enter your password"
                  placeholderTextColor={colors.textFaint}
                  className="flex-1"
                  style={{ fontFamily: fonts.regular, fontSize: 15, color: colors.text }}
                  editable={!submitting}
                />
                <Pressable
                  onPress={() => setShowPassword(!showPassword)}
                  disabled={submitting}
                  hitSlop={8}
                >
                  {showPassword ? (
                    <EyeOff size={18} color={colors.textMuted} />
                  ) : (
                    <Eye size={18} color={colors.textMuted} />
                  )}
                </Pressable>
              </View>
              {!!passwordError && (
                <AppText variant="bodySm" color={danger[500]}>{passwordError}</AppText>
              )}
            </View>

            {/* Forgot password */}
            <Pressable
              onPress={() => router.push('/(auth)/ForgotPassword' as any)}
              disabled={submitting}
              hitSlop={8}
              accessibilityRole="link"
              style={{ alignSelf: 'flex-end', marginTop: -8 }}
            >
              <AppText variant="labelLg" color={brand[600]}>Forgot password?</AppText>
            </Pressable>

            {/* Sign In Button */}
            <Button
              label={submitting ? 'Signing in...' : 'Sign In'}
              variant="primary"
              size="lg"
              icon={submitting ? undefined : LogIn}
              loading={submitting}
              disabled={submitting}
              onPress={handleSubmit}
              fullWidth
              style={{ marginTop: space.sm }}
            />
          </Card>

          {/* Footer */}
          <View className="mt-6 items-center">
            <AppText variant="bodySm" color="rgba(255,255,255,0.75)">
              © {currentYear} QC Checker. All rights reserved.
            </AppText>
          </View>
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
}
