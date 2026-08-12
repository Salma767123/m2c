import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Palette } from '@/constants/theme';

/**
 * Deep-link entry point for `m2c://reset-password?token=…`.
 *
 * Route groups are stripped from Expo Router URLs, so the screen itself lives at
 * `/ResetPassword`. This alias exists so the path matches the web route the
 * backend already puts in its emails (`/reset-password?token=…`) — one link
 * shape for both clients, no change needed server-side.
 */
export default function ResetPasswordDeepLink() {
  const { token } = useLocalSearchParams<{ token?: string }>();

  useEffect(() => {
    router.replace({ pathname: '/(auth)/ResetPassword', params: token ? { token } : {} } as any);
  }, [token]);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#000' }}>
      <ActivityIndicator size="large" color={Palette.primary} />
    </View>
  );
}
