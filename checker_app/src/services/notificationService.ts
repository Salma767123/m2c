// Push-notification + in-app notification feed for the QC checker app.
//
// `@react-native-firebase/messaging` is loaded LAZILY via require() inside a
// try/catch — its module body constructs `RNFBNativeEventEmitter` which
// crashes when the native module isn't registered (e.g. Expo Go, or a build
// that didn't link Firebase). Loading it eagerly via `import` would take the
// whole app down before any handler can intercept the error.
//
// When messaging isn't available, every FCM-dependent helper here becomes a
// safe no-op so the in-app notification feed (fetch/mark-read/bell badge) and
// the rest of the app keep working.

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from '../lib/axios';

// Type-only import — erased at runtime, doesn't trigger the native bridge.
type FBMessaging = typeof import('@react-native-firebase/messaging');

const TOKEN_STORAGE_KEY = 'fcm_device_token';

let _fbm: FBMessaging | null = null;
let _fbmAttempted = false;

/** Returns the firebase messaging module, or null when the native module
 *  isn't present. Cached after the first attempt. */
function getFbMessaging(): FBMessaging | null {
  if (_fbmAttempted) return _fbm;
  _fbmAttempted = true;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    _fbm = require('@react-native-firebase/messaging') as FBMessaging;
  } catch {
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.warn(
        '[notificationService] Firebase messaging native module not available — push notifications disabled.',
      );
    }
    _fbm = null;
  }
  return _fbm;
}

const NOOP_UNSUB = () => {};

// ─── Push notifications (FCM) ───────────────────────────────────────────────

/**
 * Request notification permission (iOS requires explicit ask; Android 13+ too).
 * Returns false when firebase isn't available.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  const fbm = getFbMessaging();
  if (!fbm) return false;
  try {
    const messaging = fbm.getMessaging();
    const status = await fbm.requestPermission(messaging);
    return (
      status === fbm.AuthorizationStatus.AUTHORIZED ||
      status === fbm.AuthorizationStatus.PROVISIONAL
    );
  } catch (error) {
    console.error('Permission request failed:', error);
    return false;
  }
}

/**
 * Get the FCM device token and register it with the backend. Call after login.
 * Returns null when firebase isn't available or permission is denied.
 */
export async function registerForPushNotifications(): Promise<string | null> {
  const fbm = getFbMessaging();
  if (!fbm) return null;
  try {
    const permitted = await requestNotificationPermission();
    if (!permitted) {
      console.log('Push notification permission denied');
      return null;
    }

    const messaging = fbm.getMessaging();
    const token = await fbm.getToken(messaging);
    if (!token) return null;

    // Only re-register if token changed
    const storedToken = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
    if (storedToken !== token) {
      await axios.post('/notifications/register-token', {
        token,
        platform: Platform.OS,
      });
      await AsyncStorage.setItem(TOKEN_STORAGE_KEY, token);
      console.log('FCM token registered:', token.slice(0, 20) + '...');
    }

    return token;
  } catch (error) {
    console.error('Failed to register push notifications:', error);
    return null;
  }
}

/** Remove the FCM token from the backend (call on logout). */
export async function unregisterPushNotifications(): Promise<void> {
  try {
    const token = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
    if (token) {
      await axios.delete('/notifications/remove-token', { data: { token } });
      await AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  } catch (error) {
    console.error('Failed to unregister push notifications:', error);
  }
}

/**
 * Listen for incoming messages while the app is in the foreground.
 * Returns a no-op unsubscribe when firebase isn't available.
 */
export function setupForegroundMessageListener(
  callback: (title: string, body: string, data: Record<string, string>) => void,
): () => void {
  const fbm = getFbMessaging();
  if (!fbm) return NOOP_UNSUB;
  try {
    const messaging = fbm.getMessaging();
    return fbm.onMessage(messaging, async (remoteMessage) => {
      const title = remoteMessage.notification?.title || 'Notification';
      const body = remoteMessage.notification?.body || '';
      const data = (remoteMessage.data as Record<string, string>) || {};
      callback(title, body, data);
    });
  } catch (error) {
    console.error('setupForegroundMessageListener failed:', error);
    return NOOP_UNSUB;
  }
}

/** Set up the background message handler. Must be called at module top-level. */
export function setupBackgroundHandler(): void {
  const fbm = getFbMessaging();
  if (!fbm) return;
  try {
    const messaging = fbm.getMessaging();
    fbm.setBackgroundMessageHandler(messaging, async (remoteMessage) => {
      console.log('Background message:', remoteMessage.notification?.title);
    });
  } catch (error) {
    console.error('setupBackgroundHandler failed:', error);
  }
}

/** Listen for token refresh (FCM may rotate tokens). */
export function setupTokenRefreshListener(): () => void {
  const fbm = getFbMessaging();
  if (!fbm) return NOOP_UNSUB;
  try {
    const messaging = fbm.getMessaging();
    return fbm.onTokenRefresh(messaging, async (newToken) => {
      try {
        await axios.post('/notifications/register-token', {
          token: newToken,
          platform: Platform.OS,
        });
        await AsyncStorage.setItem(TOKEN_STORAGE_KEY, newToken);
        console.log('FCM token refreshed:', newToken.slice(0, 20) + '...');
      } catch (error) {
        console.error('Failed to update refreshed token:', error);
      }
    });
  } catch (error) {
    console.error('setupTokenRefreshListener failed:', error);
    return NOOP_UNSUB;
  }
}

/** Was the app opened from a notification tap on a cold start? */
export async function checkInitialNotification(): Promise<Record<string, string> | null> {
  const fbm = getFbMessaging();
  if (!fbm) return null;
  try {
    const messaging = fbm.getMessaging();
    const remoteMessage = await fbm.getInitialNotification(messaging);
    if (remoteMessage?.data) return remoteMessage.data as Record<string, string>;
    return null;
  } catch (error) {
    console.error('checkInitialNotification failed:', error);
    return null;
  }
}

/** Listen for notification taps while the app is backgrounded (not killed). */
export function setupNotificationOpenedListener(
  callback: (data: Record<string, string>) => void,
): () => void {
  const fbm = getFbMessaging();
  if (!fbm) return NOOP_UNSUB;
  try {
    const messaging = fbm.getMessaging();
    return fbm.onNotificationOpenedApp(messaging, (remoteMessage) => {
      if (remoteMessage.data) {
        callback(remoteMessage.data as Record<string, string>);
      }
    });
  } catch (error) {
    console.error('setupNotificationOpenedListener failed:', error);
    return NOOP_UNSUB;
  }
}

// ─── In-app notification feed (persisted history) ───────────────────────────
// These don't depend on firebase — they work via the regular backend API.

export interface AppNotification {
  id: string;
  userId: string;
  role: string;
  type: string;
  title: string;
  message: string;
  data: Record<string, string> | null;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationListResult {
  notifications: AppNotification[];
  unreadCount: number;
}

/** Fetch the checker's persisted notification feed. */
export async function fetchNotifications(
  page = 1,
  limit = 50,
): Promise<NotificationListResult> {
  try {
    const res = await axios.get('/notifications', { params: { page, limit } });
    return {
      notifications: res.data?.data ?? [],
      unreadCount: res.data?.unreadCount ?? 0,
    };
  } catch (error) {
    console.error('Failed to fetch notifications:', error);
    return { notifications: [], unreadCount: 0 };
  }
}

/** Lightweight unread-count fetch — used for the bell badge. */
export async function fetchUnreadCount(): Promise<number> {
  try {
    const res = await axios.get('/notifications/unread-count');
    return res.data?.count ?? 0;
  } catch {
    return 0;
  }
}

/** Mark a single notification as read. */
export async function markNotificationRead(id: string): Promise<void> {
  try {
    await axios.put(`/notifications/${id}/read`);
  } catch (error) {
    console.error('Failed to mark notification read:', error);
  }
}

/** Mark every notification as read. */
export async function markAllNotificationsRead(): Promise<void> {
  try {
    await axios.put('/notifications/read-all');
  } catch (error) {
    console.error('Failed to mark all notifications read:', error);
  }
}

// ─── Lightweight pub/sub: lets the bell badge refresh the instant a push
//     arrives in the foreground, instead of waiting for the next poll. ────────

type NotificationListener = () => void;
const notificationListeners = new Set<NotificationListener>();

/** Subscribe to "a notification just arrived" events. Returns an unsubscribe fn. */
export function onNotificationReceived(listener: NotificationListener): () => void {
  notificationListeners.add(listener);
  return () => notificationListeners.delete(listener);
}

/** Emit a "notification received" event — call this from the foreground handler. */
export function emitNotificationReceived(): void {
  notificationListeners.forEach((l) => {
    try {
      l();
    } catch {
      // ignore listener errors
    }
  });
}
