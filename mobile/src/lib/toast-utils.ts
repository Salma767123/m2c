/**
 * App-wide transient messages.
 *
 * These used to hand the message to the platform: `ToastAndroid` on Android and
 * — far worse — `Alert.alert` on iOS, which turned every passing confirmation
 * ("Removed: Item removed from cart") into a modal system box the customer had
 * to tap to dismiss. A toast that blocks is not a toast, and neither platform's
 * looked anything like the app.
 *
 * The three exported functions keep their exact signatures, so all ~149 call
 * sites are unchanged. What changed is where the message goes: they now publish
 * to <ToastHost>, which draws it in the app's own type and colours and dismisses
 * itself.
 */

export type ToastTone = 'success' | 'error' | 'info';

export type ToastPayload = {
  id: number;
  tone: ToastTone;
  title: string;
  message: string;
  /** Milliseconds on screen. Errors linger; the rest pass quickly. */
  duration: number;
};

type Listener = (toast: ToastPayload) => void;

const listeners = new Set<Listener>();
let nextId = 1;

/** Subscribe the host. Returns the unsubscribe. */
export function subscribeToToasts(fn: Listener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

function publish(tone: ToastTone, title: string, message: string, duration: number) {
  const toast: ToastPayload = { id: nextId++, tone, title, message, duration };
  // If no host is mounted the message is dropped rather than thrown — a toast
  // is never important enough to break the screen that raised it.
  listeners.forEach((fn) => fn(toast));
}

export const showSuccessToast = (title: string, message: string) => {
  publish('success', title, message, 2600);
};

export const showErrorToast = (title: string, message: string) => {
  publish('error', title, message, 4200);
};

export const showInfoToast = (title: string, message: string) => {
  publish('info', title, message, 2600);
};
