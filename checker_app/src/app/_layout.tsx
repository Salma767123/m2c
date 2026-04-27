import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LogBox } from 'react-native';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';
import '../../global.css';

import { useColorScheme } from '@/hooks/use-color-scheme';
import NotificationBanner from '@/components/General/NotificationBanner';
import {
  setupBackgroundHandler,
  setupForegroundMessageListener,
  setupTokenRefreshListener,
  setupNotificationOpenedListener,
  checkInitialNotification,
} from '@/services/notificationService';


// Must be called at top-level, outside components
setupBackgroundHandler();

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [notification, setNotification] = useState<{
    visible: boolean;
    title: string;
    body: string;
  }>({ visible: false, title: '', body: '' });

  useEffect(() => {
    // Foreground notifications — show styled banner
    const unsubForeground = setupForegroundMessageListener((title, body) => {
      setNotification({ visible: true, title, body });
    });

    // Token refresh listener
    const unsubTokenRefresh = setupTokenRefreshListener();

    // Notification tap while app is in background
    const unsubOpened = setupNotificationOpenedListener((data) => {
      console.log('Notification tapped (background):', data);
    });

    // Cold start — app opened from a killed-state notification tap
    checkInitialNotification().then((data) => {
      if (data) console.log('Notification tapped (cold start):', data);
    });

    return () => {
      unsubForeground();
      unsubTokenRefresh();
      unsubOpened();
    };
  }, []);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="vendors/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="products/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="vendors/[id]/inspection" options={{ headerShown: false }} />
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
