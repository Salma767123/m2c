import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LogBox } from 'react-native';
import { useCallback, useEffect, useState } from 'react';
import 'react-native-reanimated';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
} from '@expo-google-fonts/outfit';
import '../../global.css';

import { useColorScheme } from '@/hooks/use-color-scheme';
import NotificationBanner from '@/components/General/NotificationBanner';
import {
  setupBackgroundHandler,
  setupForegroundMessageListener,
  setupTokenRefreshListener,
  setupNotificationOpenedListener,
  checkInitialNotification,
  emitNotificationReceived,
} from '@/services/notificationService';


// Must be called at top-level, outside components
setupBackgroundHandler();

// Keep the native splash up until the Outfit fonts are ready so the UI
// never flashes in the system fallback font first.
SplashScreen.preventAutoHideAsync().catch(() => {});

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [fontsLoaded] = useFonts({
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded]);
  const [notification, setNotification] = useState<{
    visible: boolean;
    title: string;
    body: string;
  }>({ visible: false, title: '', body: '' });

  // Route a tapped notification to the relevant screen.
  // Backend checker payloads carry a `screen` hint ('products' | 'vendors').
  const handleNotificationNav = useCallback((data: Record<string, string>) => {
    switch (data?.screen) {
      case 'products':
        router.push('/(tabs)/products');
        break;
      case 'vendors':
        router.push('/(tabs)/vendors');
        break;
      case 'report':
        router.push('/(tabs)/report');
        break;
      default:
        router.push('/(tabs)');
    }
  }, []);

  useEffect(() => {
    // Foreground notifications — show styled banner + refresh the bell badge
    const unsubForeground = setupForegroundMessageListener((title, body) => {
      setNotification({ visible: true, title, body });
      emitNotificationReceived();
    });

    // Token refresh listener
    const unsubTokenRefresh = setupTokenRefreshListener();

    // Notification tap while app is in background
    const unsubOpened = setupNotificationOpenedListener((data) => {
      handleNotificationNav(data);
    });

    // Cold start — app opened from a killed-state notification tap
    checkInitialNotification().then((data) => {
      if (data) handleNotificationNav(data);
    });

    return () => {
      unsubForeground();
      unsubTokenRefresh();
      unsubOpened();
    };
  }, [handleNotificationNav]);

  if (!fontsLoaded) return null;

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="vendors/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="products/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="vendors/[id]/inspection" options={{ headerShown: false }} />
        <Stack.Screen name="factory-report/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="product-report/[id]" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style="auto" />
      <NotificationBanner
        visible={notification.visible}
        title={notification.title}
        body={notification.body}
        onDismiss={() => setNotification((prev) => ({ ...prev, visible: false }))}
      />
    </ThemeProvider>
  );
}
