import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Palette } from '@/constants/theme';

/**
 * Deep-link entry point for `m2c://verify-email?token=…`.
 * See reset-password.tsx for why this alias exists.
 */
export default function VerifyEmailDeepLink() {
  const { token } = useLocalSearchParams<{ token?: string }>();

  useEffect(() => {
    router.replace({ pathname: '/(auth)/VerifyEmail', params: token ? { token } : {} } as any);
  }, [token]);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#000' }}>
      <ActivityIndicator size="large" color={Palette.primary} />
    </View>
  );
}
