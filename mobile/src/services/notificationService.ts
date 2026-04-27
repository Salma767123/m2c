/**
 * Push Notification Service for M2C Customer Mobile App
 * ─────────────────────────────────────────────────────────
 * Uses @react-native-firebase/messaging (v22 modular API).
 * Follows docs/NOTIFICATIONS.md architecture.
 *
 * Prerequisites:
 *   npx expo install @react-native-firebase/app @react-native-firebase/messaging expo-dev-client
 *   Download google-services.json from Firebase Console → save to mobile/google-services.json
 *   Build with: eas build --platform android --profile development
 */
// @ts-nocheck
// Install with: npx expo install @react-native-firebase/app @react-native-firebase/messaging
// Then rebuild: eas build --platform android --profile development
import {
  getMessaging,
  getToken,
  onMessage,
  onTokenRefresh,
  setBackgroundMessageHandler,
  getInitialNotification,
  onNotificationOpenedApp,
  requestPermission,
  AuthorizationStatus,
} from '@react-native-firebase/messaging';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from '@/lib/axios';

const TOKEN_STORAGE_KEY = 'fcm_device_token';

// ── Permission ───────────────────────────────────────────────────────────────
export async function requestNotificationPermission(): Promise<boolean> {
  const messaging = getMessaging();
  const authStatus = await requestPermission(messaging);
  return (
    authStatus === AuthorizationStatus.AUTHORIZED ||
    authStatus === AuthorizationStatus.PROVISIONAL
  );
}

// ── Register token with backend ──────────────────────────────────────────────
export async function registerForPushNotifications(): Promise<string | null> {
  try {
    const permitted = await requestNotificationPermission();
    if (!permitted) return null;

    const messaging = getMessaging();
    const token = await getToken(messaging);
    if (!token) return null;

    // Only re-register if token changed
    const storedToken = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
    if (storedToken !== token) {
      await axios.post('/notifications/register-token', {
        token,
        platform: Platform.OS,
      });
      await AsyncStorage.setItem(TOKEN_STORAGE_KEY, token);
    }

    return token;
  } catch (error) {
    if (__DEV__) console.warn('Failed to register push notifications:', error);
    return null;
  }
}

// ── Unregister on logout ─────────────────────────────────────────────────────
export async function unregisterPushNotifications(): Promise<void> {
  try {
    const token = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
    if (token) {
      await axios.delete('/notifications/remove-token', { data: { token } });
      await AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  } catch {
    // Non-critical — token will expire naturally
  }
}

// ── Foreground messages ──────────────────────────────────────────────────────
export function setupForegroundMessageListener(
  callback: (title: string, body: string, data: Record<string, string>) => void,
): () => void {
  const messaging = getMessaging();
  return onMessage(messaging, async (remoteMessage) => {
    const title = remoteMessage.notification?.title || 'Notification';
    const body = remoteMessage.notification?.body || '';
    const data = (remoteMessage.data as Record<string, string>) || {};
    callback(title, body, data);
  });
}

// ── Background handler (call at top-level, outside components) ───────────────
export function setupBackgroundHandler(): void {
  const messaging = getMessaging();
  setBackgroundMessageHandler(messaging, async (_remoteMessage) => {
    // System tray notification is shown automatically by Android/iOS.
    // No additional handling needed.
  });
}

// ── Token refresh listener ───────────────────────────────────────────────────
export function setupTokenRefreshListener(): () => void {
  const messaging = getMessaging();
  return onTokenRefresh(messaging, async (newToken) => {
    try {
      await axios.post('/notifications/register-token', {
        token: newToken,
        platform: Platform.OS,
      });
      await AsyncStorage.setItem(TOKEN_STORAGE_KEY, newToken);
    } catch {
      // Will retry on next app launch
    }
  });
}

// ── Cold start notification (app killed → user tapped notification) ──────────
export async function checkInitialNotification(): Promise<Record<string, string> | null> {
  const messaging = getMessaging();
  const remoteMessage = await getInitialNotification(messaging);
  if (remoteMessage?.data) {
    return remoteMessage.data as Record<string, string>;
  }
  return null;
}

// ── Background notification tap (app in background → user tapped) ────────────
export function setupNotificationOpenedListener(
  callback: (data: Record<string, string>) => void,
): () => void {
  const messaging = getMessaging();
  return onNotificationOpenedApp(messaging, (remoteMessage) => {
    if (remoteMessage.data) {
      callback(remoteMessage.data as Record<string, string>);
    }
  });
}
