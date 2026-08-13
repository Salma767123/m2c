import React, { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Lock, ShieldCheck, CircleAlert } from 'lucide-react-native';
import { userAuthService } from '@/services/userAuthService';
import { showSuccessToast, showErrorToast } from '@/lib/toast-utils';
import { Palette } from '@/constants/theme';
import {
  AuthShell,
  AuthField,
  AuthButton,
  AuthSwitch,
  StrengthMeter,
} from '@/components/WebSite/Auth/AuthKit';

/**
 * Set a new password from an emailed reset link.
 *
 * The token arrives as a deep-link param (`m2c://reset-password?token=…`, or the
 * https equivalent once App/Universal Links are configured). Without a token
 * there is nothing this screen can do, so it renders an explanatory dead-end
 * rather than a form that would fail on submit.
 */
export default function ResetPasswordScreen() {
  const { token } = useLocalSearchParams<{ token?: string }>();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmError, setConfirmError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = useCallback(async () => {
    let ok = true;

    if (!password) {
      setPasswordError('Please create a password');
      ok = false;
    } else if (password.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      ok = false;
    } else {
      setPasswordError('');
    }

    if (!confirmPassword) {
      setConfirmError('Please confirm your password');
      ok = false;
    } else if (confirmPassword !== password) {
      setConfirmError('Passwords do not match');
      ok = false;
    } else {
      setConfirmError('');
    }

    if (!ok || !token) return;

    try {
      setSubmitting(true);
      const response = await userAuthService.resetPassword(token, password);
      if (response.success) {
        showSuccessToast('Password Updated', 'Sign in with your new password.');
        router.replace('/(auth)/Login');
      } else {
        showErrorToast('Reset Failed', response.message || 'Could not reset your password.');
      }
    } catch (error: any) {
      showErrorToast(
        'Reset Failed',
        error?.message || 'This link may have expired. Request a new one.',
      );
    } finally {
      setSubmitting(false);
    }
  }, [password, confirmPassword, token]);

  if (!token) {
    return (
      <AuthShell
        title="Link Not Valid"
        subtitle="This reset link is missing or expired"
        icon={<CircleAlert size={20} color="#FFFFFF" />}
        footer={
          <AuthSwitch
            prompt="Need a new link?"
            action="Request Reset"
            onPress={() => router.replace('/(auth)/ForgotPassword')}
          />
        }
      >
        <View className="items-center py-2">
          <View className="w-16 h-16 rounded-full bg-error-50 items-center justify-center mb-4">
            <CircleAlert size={30} color={Palette.error} strokeWidth={2} />
          </View>
          <Text className="text-xs text-gray-600 text-center leading-4 mb-5">
            Open the reset link from your email on this device, or request a new
            one — reset links expire for your security.
          </Text>
        </View>

        <AuthButton
          label="Request a New Link"
          onPress={() => router.replace('/(auth)/ForgotPassword')}
          icon={<Lock size={18} color="#FFFFFF" strokeWidth={2.5} />}
        />
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Set New Password"
      subtitle="Choose something you'll remember"
      icon={<ShieldCheck size={20} color="#FFFFFF" />}
      footer={
        <AuthSwitch
          prompt="Changed your mind?"
          action="Back to Sign In"
          onPress={() => router.replace('/(auth)/Login')}
        />
      }
    >
      <View>
        <AuthField
          label="New Password"
          icon={<Lock size={18} color={Palette.textMuted} strokeWidth={2} />}
          value={password}
          onChangeText={(v) => {
            setPassword(v);
            if (passwordError) setPasswordError('');
          }}
          placeholder="Create a password"
          error={passwordError}
          secure
          autoCapitalize="none"
          textContentType="newPassword"
        />
        {!passwordError ? (
          <View className="-mt-2 mb-3">
            <StrengthMeter value={password} />
          </View>
        ) : null}
      </View>

      <AuthField
        label="Confirm New Password"
        icon={<Lock size={18} color={Palette.textMuted} strokeWidth={2} />}
        value={confirmPassword}
        onChangeText={(v) => {
          setConfirmPassword(v);
          if (confirmError) setConfirmError('');
        }}
        placeholder="Confirm your password"
        error={confirmError}
        secure
        autoCapitalize="none"
        textContentType="newPassword"
      />

      <AuthButton
        label="Update Password"
        busyLabel="Updating..."
        busy={submitting}
        onPress={handleSubmit}
        icon={<ShieldCheck size={18} color="#FFFFFF" strokeWidth={2.5} />}
      />
    </AuthShell>
  );
}
