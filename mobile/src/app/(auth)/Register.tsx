import React, { useCallback, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { User, Mail, Phone, Lock, UserPlus, Check } from 'lucide-react-native';
import { userAuthService } from '@/services/userAuthService';
import { showSuccessToast, showErrorToast } from '@/lib/toast-utils';
import { Palette } from '@/constants/theme';
import {
  AuthShell,
  AuthField,
  AuthButton,
  AuthSwitch,
  StrengthMeter,
  EMAIL_RE,
} from '@/components/WebSite/Auth/AuthKit';

/**
 * Account creation. Mirrors the web RegisterForm field-for-field (first/last
 * name, email, phone, password + confirm, terms) and posts the same payload —
 * `name` is the two name fields joined, which is what the backend expects.
 *
 * On success the backend emails a verification link; the user cannot sign in
 * until they follow it, so we route back to Login with that message rather than
 * storing a token here.
 */
export default function RegisterScreen() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const setError = (key: string, message: string) =>
    setErrors((prev) => ({ ...prev, [key]: message }));

  const clearError = (key: string) =>
    setErrors((prev) => (prev[key] ? { ...prev, [key]: '' } : prev));

  const validate = useCallback(() => {
    const next: Record<string, string> = {};

    if (!firstName.trim()) next.firstName = 'Please enter your first name';
    if (!lastName.trim()) next.lastName = 'Please enter your last name';

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) next.email = 'Please enter your email address';
    else if (!EMAIL_RE.test(normalizedEmail)) next.email = 'Please enter a valid email address';

    // Digits only, 10–15 — wide enough for international numbers without
    // pulling libphonenumber into this screen.
    const digits = phone.replace(/\D/g, '');
    if (!digits) next.phone = 'Please enter your phone number';
    else if (digits.length < 10 || digits.length > 15) next.phone = 'Please enter a valid phone number';

    if (!password) next.password = 'Please create a password';
    else if (password.length < 8) next.password = 'Password must be at least 8 characters';

    if (!confirmPassword) next.confirmPassword = 'Please confirm your password';
    else if (confirmPassword !== password) next.confirmPassword = 'Passwords do not match';

    setErrors(next);
    return Object.keys(next).length === 0;
  }, [firstName, lastName, email, phone, password, confirmPassword]);

  const handleSubmit = useCallback(async () => {
    if (!validate()) {
      showErrorToast('Check your details', 'Please fix the highlighted fields and try again.');
      return;
    }
    if (!agreed) {
      showErrorToast('Terms Required', 'Please agree to the terms and conditions.');
      return;
    }

    try {
      setSubmitting(true);
      const response = await userAuthService.register({
        email: email.trim().toLowerCase(),
        password,
        name: `${firstName.trim()} ${lastName.trim()}`.trim(),
        phoneNumber: phone.trim(),
      });

      if (response.success) {
        showSuccessToast(
          'Account Created',
          'Check your email to verify your account, then sign in.',
        );
        router.replace('/(auth)/Login');
      } else {
        showErrorToast('Registration Failed', response.message || 'Something went wrong.');
      }
    } catch (error: any) {
      showErrorToast(
        'Registration Failed',
        error?.message || 'Something went wrong. Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  }, [validate, agreed, email, password, firstName, lastName, phone]);

  return (
    <AuthShell
      title="Create Account"
      subtitle="Join M2C in a few seconds"
      icon={<UserPlus size={20} color="#FFFFFF" />}
      footer={
        <AuthSwitch
          prompt="Already have an account?"
          action="Sign In"
          onPress={() => router.replace('/(auth)/Login')}
        />
      }
    >
      <AuthField
        label="First Name"
        icon={<User size={18} color={Palette.textMuted} strokeWidth={2} />}
        value={firstName}
        onChangeText={(v) => {
          setFirstName(v);
          clearError('firstName');
        }}
        onBlur={() => !firstName.trim() && setError('firstName', 'Please enter your first name')}
        placeholder="First name"
        error={errors.firstName}
        autoCapitalize="words"
        textContentType="givenName"
      />

      <AuthField
        label="Last Name"
        icon={<User size={18} color={Palette.textMuted} strokeWidth={2} />}
        value={lastName}
        onChangeText={(v) => {
          setLastName(v);
          clearError('lastName');
        }}
        onBlur={() => !lastName.trim() && setError('lastName', 'Please enter your last name')}
        placeholder="Last name"
        error={errors.lastName}
        autoCapitalize="words"
        textContentType="familyName"
      />

      <AuthField
        label="Email Address"
        icon={<Mail size={18} color={Palette.textMuted} strokeWidth={2} />}
        value={email}
        onChangeText={(v) => {
          setEmail(v.toLowerCase());
          clearError('email');
        }}
        placeholder="Enter your email"
        error={errors.email}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        textContentType="emailAddress"
      />

      <AuthField
        label="Phone Number"
        icon={<Phone size={18} color={Palette.textMuted} strokeWidth={2} />}
        value={phone}
        onChangeText={(v) => {
          setPhone(v);
          clearError('phone');
        }}
        placeholder="Enter your phone number"
        error={errors.phone}
        keyboardType="phone-pad"
        textContentType="telephoneNumber"
      />

      <View>
        <AuthField
          label="Password"
          icon={<Lock size={18} color={Palette.textMuted} strokeWidth={2} />}
          value={password}
          onChangeText={(v) => {
            setPassword(v);
            clearError('password');
          }}
          placeholder="Create a password"
          error={errors.password}
          secure
          autoCapitalize="none"
          textContentType="newPassword"
        />
        {!errors.password ? (
          <View className="-mt-2 mb-3">
            <StrengthMeter value={password} />
          </View>
        ) : null}
      </View>

      <AuthField
        label="Confirm Password"
        icon={<Lock size={18} color={Palette.textMuted} strokeWidth={2} />}
        value={confirmPassword}
        onChangeText={(v) => {
          setConfirmPassword(v);
          clearError('confirmPassword');
        }}
        placeholder="Confirm your password"
        error={errors.confirmPassword}
        secure
        autoCapitalize="none"
        textContentType="newPassword"
      />

      {/* Terms */}
      <TouchableOpacity
        onPress={() => setAgreed((a) => !a)}
        className="flex-row items-start mb-5"
        activeOpacity={0.7}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: agreed }}
        accessibilityLabel="Agree to terms and conditions"
      >
        <View
          className={`w-5 h-5 rounded-md items-center justify-center mr-3 mt-0.5 border ${
            agreed ? 'bg-brand-500 border-brand-500' : 'bg-white border-gray-300'
          }`}
        >
          {agreed ? <Check size={13} color="#FFFFFF" strokeWidth={3} /> : null}
        </View>
        <Text className="flex-1 text-xs text-gray-600 leading-4">
          I agree to the{' '}
          <Text
            className="font-semibold text-brand-500"
            onPress={() => router.push('/(any)/terms')}
          >
            Terms of Service
          </Text>{' '}
          and{' '}
          <Text
            className="font-semibold text-brand-500"
            onPress={() => router.push('/(any)/privacy')}
          >
            Privacy Policy
          </Text>
          .
        </Text>
      </TouchableOpacity>

      <AuthButton
        label="Create Account"
        busyLabel="Creating account..."
        busy={submitting}
        onPress={handleSubmit}
        icon={<UserPlus size={18} color="#FFFFFF" strokeWidth={2.5} />}
      />
    </AuthShell>
  );
}
