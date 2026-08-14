import React, { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { Mail, KeyRound, MailCheck, Send } from 'lucide-react-native';
import { userAuthService } from '@/services/userAuthService';
import { showErrorToast } from '@/lib/toast-utils';
import { Palette } from '@/constants/theme';
import { AuthShell, AuthField, AuthButton, AuthSwitch, EMAIL_RE } from '@/components/WebSite/Auth/AuthKit';

/**
 * Request a password-reset email.
 *
 * The success state deliberately does NOT confirm whether the address exists —
 * the backend responds the same either way, and echoing "no such account" here
 * would turn this screen into an account-enumeration oracle.
 */
export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const validate = useCallback((value: string) => {
    if (!value) {
      setEmailError('Please enter your email address');
      return false;
    }
    if (!EMAIL_RE.test(value)) {
      setEmailError('Please enter a valid email address');
      return false;
    }
    setEmailError('');
    return true;
  }, []);

  const handleSubmit = useCallback(async () => {
    const normalized = email.trim().toLowerCase();
    if (!validate(normalized)) return;

    try {
      setSubmitting(true);
      await userAuthService.forgotPassword(normalized);
      setSent(true);
    } catch (error: any) {
      showErrorToast('Request Failed', error?.message || 'Could not send the reset email.');
    } finally {
      setSubmitting(false);
    }
  }, [email, validate]);

  if (sent) {
    return (
      <AuthShell
        title="Check Your Email"
        subtitle="Reset instructions sent"
        icon={<MailCheck size={20} color="#FFFFFF" />}
        footer={
          <AuthSwitch
            prompt="Remembered it?"
            action="Back to Sign In"
            onPress={() => router.replace('/(auth)/Login')}
          />
        }
      >
        <View className="items-center py-2">
          <View className="w-16 h-16 rounded-full bg-brand-50 items-center justify-center mb-4">
            <MailCheck size={30} color={Palette.primary} strokeWidth={2} />
          </View>
          <Text className="text-sm text-gray-700 text-center leading-5 mb-1">
            If an account exists for
          </Text>
          <Text className="text-sm font-bold text-black text-center mb-3">
            {email.trim().toLowerCase()}
          </Text>
          <Text className="text-xs text-gray-500 text-center leading-4 mb-5">
            we&apos;ve sent a link to reset your password. The link expires in a
            short while — check your spam folder if it doesn&apos;t arrive.
          </Text>
        </View>

        <AuthButton
          label="Resend Email"
          busyLabel="Sending..."
          busy={submitting}
          onPress={handleSubmit}
          icon={<Send size={18} color="#FFFFFF" strokeWidth={2.5} />}
        />
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Forgot Password"
      subtitle="We'll email you a reset link"
      icon={<KeyRound size={20} color="#FFFFFF" />}
      footer={
        <AuthSwitch
          prompt="Remembered it?"
          action="Back to Sign In"
          onPress={() => router.replace('/(auth)/Login')}
        />
      }
    >
      <Text className="text-xs text-gray-600 leading-4 mb-4">
        Enter the email address on your account and we&apos;ll send you a link to
        set a new password.
      </Text>

      <AuthField
        label="Email Address"
        icon={<Mail size={18} color={Palette.textMuted} strokeWidth={2} />}
        value={email}
        onChangeText={(v) => {
          setEmail(v.toLowerCase());
          if (emailError) setEmailError('');
        }}
        onBlur={() => validate(email.trim().toLowerCase())}
        placeholder="Enter your email"
        error={emailError}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        textContentType="emailAddress"
      />

      <AuthButton
        label="Send Reset Link"
        busyLabel="Sending..."
        busy={submitting}
        onPress={handleSubmit}
        icon={<Send size={18} color="#FFFFFF" strokeWidth={2.5} />}
      />
    </AuthShell>
  );
}
