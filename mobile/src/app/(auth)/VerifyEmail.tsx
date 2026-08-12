import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { MailCheck, CircleAlert, LogIn } from 'lucide-react-native';
import { userAuthService } from '@/services/userAuthService';
import { Palette } from '@/constants/theme';
import { AuthShell, AuthButton, AuthSwitch } from '@/components/WebSite/Auth/AuthKit';

type Phase = 'verifying' | 'success' | 'failed';

/**
 * Consumes the emailed verification link (`m2c://verify-email?token=…`).
 *
 * Verification runs once on mount and is guarded by a ref: React 19 Strict Mode
 * double-invokes effects in development, and the backend rejects a token the
 * second time it is presented — without the guard the happy path would render
 * as a failure on every dev run.
 */
export default function VerifyEmailScreen() {
  const { token } = useLocalSearchParams<{ token?: string }>();
  const [phase, setPhase] = useState<Phase>(token ? 'verifying' : 'failed');
  const [message, setMessage] = useState(
    token ? '' : 'This verification link is missing its token.',
  );
  const attempted = useRef(false);

  const verify = useCallback(async (value: string) => {
    try {
      const response = await userAuthService.verifyEmail(value);
      if (response.success) {
        setPhase('success');
        setMessage(response.message || 'Your email address is verified.');
      } else {
        setPhase('failed');
        setMessage(response.message || 'We could not verify this link.');
      }
    } catch (error: any) {
      setPhase('failed');
      setMessage(error?.message || 'This link may have expired or already been used.');
    }
  }, []);

  useEffect(() => {
    if (!token || attempted.current) return;
    attempted.current = true;
    verify(token);
  }, [token, verify]);

  if (phase === 'verifying') {
    return (
      <AuthShell
        title="Verifying Email"
        subtitle="This will only take a moment"
        icon={<MailCheck size={20} color="#FFFFFF" />}
      >
        <View className="items-center py-8">
          <ActivityIndicator size="large" color={Palette.primary} />
          <Text className="text-xs text-gray-500 mt-4">Confirming your email address...</Text>
        </View>
      </AuthShell>
    );
  }

  const ok = phase === 'success';

  return (
    <AuthShell
      title={ok ? 'Email Verified' : 'Verification Failed'}
      subtitle={ok ? 'Your account is ready' : 'This link did not work'}
      icon={ok ? <MailCheck size={20} color="#FFFFFF" /> : <CircleAlert size={20} color="#FFFFFF" />}
      footer={
        ok ? undefined : (
          <AuthSwitch
            prompt="Need an account?"
            action="Create One"
            onPress={() => router.replace('/(auth)/Register')}
          />
        )
      }
    >
      <View className="items-center py-2">
        <View
          className={`w-16 h-16 rounded-full items-center justify-center mb-4 ${
            ok ? 'bg-success-50' : 'bg-error-50'
          }`}
        >
          {ok ? (
            <MailCheck size={30} color={Palette.secondary} strokeWidth={2} />
          ) : (
            <CircleAlert size={30} color={Palette.error} strokeWidth={2} />
          )}
        </View>
        <Text className="text-xs text-gray-600 text-center leading-4 mb-5">{message}</Text>
      </View>

      <AuthButton
        label={ok ? 'Continue to Sign In' : 'Back to Sign In'}
        onPress={() => router.replace('/(auth)/Login')}
        icon={<LogIn size={18} color="#FFFFFF" strokeWidth={2.5} />}
      />
    </AuthShell>
  );
}
