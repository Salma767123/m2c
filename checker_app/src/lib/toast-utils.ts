import { Alert, ToastAndroid, Platform } from 'react-native';

// Dedupe window. An identical toast fired again inside this many ms is dropped.
//
// Web added the same guard (frontend/src/hooks/use-toast.ts) for React StrictMode
// double-invoking effects. That specific cause does not apply here, but the same
// duplicates do: an effect re-running on a dependency change, or a retry path that
// reports the same failure twice. On iOS it matters more than on the web — each
// duplicate is an Alert the checker has to dismiss by hand.
const DEDUPE_MS = 3000;

let lastKey = '';
let lastAt = 0;

function isDuplicate(kind: string, title: string, message: string): boolean {
  const key = `${kind}|${title}|${message}`;
  const now = Date.now();
  if (key === lastKey && now - lastAt < DEDUPE_MS) return true;
  lastKey = key;
  lastAt = now;
  return false;
}

const show = (kind: string, title: string, message: string, duration: number) => {
  if (isDuplicate(kind, title, message)) return;
  if (Platform.OS === 'android') {
    ToastAndroid.show(`${title}: ${message}`, duration);
  } else {
    Alert.alert(title, message);
  }
};

export const showSuccessToast = (title: string, message: string) =>
  show('success', title, message, ToastAndroid.SHORT);

export const showErrorToast = (title: string, message: string) =>
  show('error', title, message, ToastAndroid.LONG);

export const showInfoToast = (title: string, message: string) =>
  show('info', title, message, ToastAndroid.SHORT);
