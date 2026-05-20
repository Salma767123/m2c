/**
 * Tiny event bus for auth state changes.
 *
 * Before this existed, the Home page and Header polled localStorage every
 * 1 second to detect login/logout — pulling localStorage on the main thread
 * 60 times a minute on every page in the site and triggering React state
 * updates each tick. That was the largest single source of site-wide
 * sluggishness.
 *
 * Pattern
 *  - Every site that mutates auth state (login form, logout button, OAuth
 *    callback, axios 401 interceptor, …) calls dispatchAuthChange() right
 *    after the localStorage / sessionStorage write.
 *  - Consumers (Header, Home page, anything that gates UI on auth) call
 *    subscribeToAuthChange(cb) once in a useEffect. The callback fires:
 *      • when this tab dispatches the event (same-tab login/logout)
 *      • when ANOTHER tab writes the auth keys (native `storage` event)
 *
 * That covers every real way auth state can change without polling.
 */

const AUTH_CHANGE_EVENT = 'm2c:auth-change';

/** Auth keys we care about; cross-tab `storage` events are filtered to these. */
const AUTH_STORAGE_KEYS = new Set([
  'userToken',
  'userData',
  'adminToken',
  'adminUser',
  'vendorToken',
  'vendorData',
]);

/** Fire from anywhere that just mutated auth state (login, logout, refresh, OAuth callback). */
export function dispatchAuthChange(): void {
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
  } catch {
    // Older environments without Event constructor — silently ignore;
    // the cross-tab storage listener still catches the change.
  }
}

/**
 * Subscribe a callback to auth state changes. Returns an unsubscribe function
 * (so consumers can return it directly from a useEffect).
 *
 * Listens to two channels:
 *  - Same-tab: our custom event dispatched by login/logout sites.
 *  - Cross-tab: native `storage` event, filtered to auth-relevant keys.
 */
export function subscribeToAuthChange(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const sameTab = () => callback();
  const crossTab = (e: StorageEvent) => {
    // e.key is null on `storage.clear()` — treat as auth change to be safe.
    if (e.key === null || AUTH_STORAGE_KEYS.has(e.key)) callback();
  };
  window.addEventListener(AUTH_CHANGE_EVENT, sameTab);
  window.addEventListener('storage', crossTab);
  return () => {
    window.removeEventListener(AUTH_CHANGE_EVENT, sameTab);
    window.removeEventListener('storage', crossTab);
  };
}
