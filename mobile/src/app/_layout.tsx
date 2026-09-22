// ThemeProvider/DefaultTheme come from React Navigation, not expo-router —
// expo-router re-exports neither. Importing them from 'expo-router' makes both
// `undefined`, and <ThemeProvider> then renders a JSX element with an undefined type,
// which crashes NativeWind's JSX wrapper ("Cannot read property 'displayName' of
// undefined" in maybeHijackSafeAreaProvider) before the app draws a single frame.
import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LogBox } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import {
  configureReanimatedLogger,
  ReanimatedLogLevel,
} from 'react-native-reanimated';
import '../../global.css';
import { CartProvider } from '@/context/CartContext';
import { WishlistProvider } from '@/context/WishlistContext';
import { userAuthService } from '@/services/userAuthService';
import axiosInstance from '@/lib/axios';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { FONT_ASSETS } from '@/lib/fonts';
import { setExchangeRate } from '@/lib/currency';
import ToastHost from '@/components/WebSite/Shared/ToastHost';
import { ConfirmHost } from '@/components/WebSite/Shared/ConfirmDialog';
import NotificationBanner from '@/components/General/NotificationBanner';

// Hold the native splash until the fonts are in memory, so the app never paints
// a frame in Roboto and then swaps to Outfit.
SplashScreen.preventAutoHideAsync().catch(() => {});

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
  const router = useRouter();
  const [notification, setNotification] = useState({
    visible: false,
    title: '',
    body: '',
    data: {} as Record<string, string>,
  });

  // "Remember me" gate. This has to settle BEFORE the cart and wishlist
  // providers mount, because they hydrate from the stored token on their first
  // render — start them first and an unremembered session would fetch one last
  // time with a token we are about to throw away. Two AsyncStorage reads, so
  // the held frame is not perceptible.
  const [sessionChecked, setSessionChecked] = useState(false);
  useEffect(() => {
    userAuthService.endSessionIfNotRemembered().finally(() => setSessionChecked(true));
  }, []);

  // `error` matters as much as `loaded`: a font that fails to decode must not
  // hold the splash forever. Either outcome releases it — a missing face falls
  // back to the platform font, which is the old behaviour, not a broken app.
  const [fontsLoaded, fontError] = useFonts(FONT_ASSETS);
  const ready = sessionChecked && (fontsLoaded || !!fontError);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  // Navigate to order details when notification is tapped
  const handleNotificationNav = useCallback(
    (data: Record<string, string>) => {
      if (data.orderId) {
        router.push(`/(tabs)/orders/${data.orderId}` as any);
      }
    },
    [router],
  );

  // Load exchange rate on app startup
  useEffect(() => {
    const loadExchangeRate = async () => {
      try {
        // Through the shared instance, so this inherits the normalised base
        // URL. Building it from the raw env var here meant a base without the
        // `/api` suffix 404'd, and the catch below turned that into a silent
        // fallback to the default rate — i.e. wrong prices, no error anywhere.
        const res = await axiosInstance.get('/exchange-rate');
        const data = res.data;
        if (data?.success && data.data?.rate) {
          setExchangeRate(data.data.rate);
        }
      } catch {
        // Use default rate
      }
    };
    loadExchangeRate();
  }, []);

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

  if (!ready) return null;

  /*
    Always the light theme.

    This followed the system scheme, and React Navigation's DarkTheme paints its
    background near-black (rgb(1,1,1)). Nothing else in the app has a dark mode —
    every screen paints white or linen, the status bar is pinned dark, and the
    palette's dark block goes unread — so on a phone set to dark the navigator
    drew a black frame behind a light app. It showed as black around the tab
    bar's rounded corners and in the strip beneath it.
  */
  return (
    <ThemeProvider value={DefaultTheme}>
      <CartProvider>
        <WishlistProvider>
          {/* Holds the single confirm dialog, so any screen can ask a
              destructive question without carrying its own modal state. */}
          <ConfirmHost>
          <Stack>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="(any)" options={{ headerShown: false }} />
            {/* Deep-link aliases — see src/app/reset-password.tsx */}
            <Stack.Screen name="reset-password" options={{ headerShown: false }} />
            <Stack.Screen name="verify-email" options={{ headerShown: false }} />
          </Stack>
          <NotificationBanner
            visible={notification.visible}
            title={notification.title}
            body={notification.body}
            onPress={() => handleNotificationNav(notification.data)}
            onDismiss={() => setNotification((prev) => ({ ...prev, visible: false }))}
          />
          </ConfirmHost>
          {/* Above the navigator so a toast is never clipped by a screen. */}
          <ToastHost />
        </WishlistProvider>
      </CartProvider>
      <StatusBar style="dark" />
    </ThemeProvider>
  );
}
