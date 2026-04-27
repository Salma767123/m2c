import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LogBox } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'expo-router';
import {
  configureReanimatedLogger,
  ReanimatedLogLevel,
} from 'react-native-reanimated';
import '../../global.css';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { CartProvider } from '@/context/CartContext';
import { WishlistProvider } from '@/context/WishlistContext';
import NotificationBanner from '@/components/General/NotificationBanner';

// Conditionally import Firebase messaging — fails gracefully in Expo Go
let setupBackgroundHandler: (() => void) | null = null;
let setupForegroundMessageListener: ((cb: any) => () => void) | null = null;
let setupTokenRefreshListener: (() => () => void) | null = null;
let setupNotificationOpenedListener: ((cb: any) => () => void) | null = null;
let checkInitialNotification: (() => Promise<any>) | null = null;

try {
  const ns = require('@/services/notificationService');
  setupBackgroundHandler = ns.setupBackgroundHandler;
  setupForegroundMessageListener = ns.setupForegroundMessageListener;
  setupTokenRefreshListener = ns.setupTokenRefreshListener;
  setupNotificationOpenedListener = ns.setupNotificationOpenedListener;
  checkInitialNotification = ns.checkInitialNotification;
  // Call background handler at top-level (required by Firebase)
  setupBackgroundHandler?.();
} catch {
  // Firebase not available (Expo Go) — notifications disabled
}

// Suppress expo-router's internal SafeAreaView deprecation warning
LogBox.ignoreLogs(['SafeAreaView has been deprecated']);
const _warn = console.warn;
console.warn = (...args: any[]) => {
  if (typeof args[0] === 'string' && args[0].includes('SafeAreaView has been deprecated')) return;
  _warn(...args);
};

configureReanimatedLogger({
  level: ReanimatedLogLevel.warn,
  strict: false,
});

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const [notification, setNotification] = useState({
    visible: false,
    title: '',
    body: '',
    data: {} as Record<string, string>,
  });

  // Navigate to order details when notification is tapped
  const handleNotificationNav = useCallback(
    (data: Record<string, string>) => {
      if (data.orderId) {
        router.push(`/(tabs)/orders/${data.orderId}` as any);
      }
    },
    [router],
  );

  useEffect(() => {
    // Skip if Firebase not available (Expo Go)
    if (!setupForegroundMessageListener) return;

    // Foreground: show in-app banner
    const unsub1 = setupForegroundMessageListener((title: string, body: string, data: Record<string, string>) => {
      setNotification({ visible: true, title, body, data });
    });

    // Token rotation
    const unsub2 = setupTokenRefreshListener?.() ?? (() => {});

    // Background notification tap
    const unsub3 = setupNotificationOpenedListener?.((data: Record<string, string>) => {
      handleNotificationNav(data);
    }) ?? (() => {});

    // Cold start notification tap
    checkInitialNotification?.().then((data) => {
      if (data) handleNotificationNav(data);
    });

    return () => {
      unsub1();
      unsub2();
      unsub3();
    };
  }, [handleNotificationNav]);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <CartProvider>
        <WishlistProvider>
          <Stack>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="(any)" options={{ headerShown: false }} />
          </Stack>
          <NotificationBanner
            visible={notification.visible}
            title={notification.title}
            body={notification.body}
            onPress={() => handleNotificationNav(notification.data)}
            onDismiss={() => setNotification((prev) => ({ ...prev, visible: false }))}
          />
        </WishlistProvider>
      </CartProvider>
      <StatusBar style="dark" backgroundColor="transparent" translucent={true} />
    </ThemeProvider>
  );
}
