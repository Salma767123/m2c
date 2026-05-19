/**
 * One-shot sessionStorage handoff for a just-created order.
 *
 * The checkout page already receives the full Order object back from the
 * `POST /orders` response. Without this handoff, the order-confirmation page
 * would re-fetch the same data via `GET /orders/:id` — a wasted ~500ms–1.5s
 * round trip the user sees as a loading spinner after a successful payment.
 *
 * Design notes
 *  - Keyed by orderId so the confirmation page can confirm the stash belongs
 *    to the order it was navigated to (avoids accidentally using a stale
 *    stash if the user opens two checkout tabs).
 *  - One-shot: cleared on first read so a manual refresh of the page falls
 *    through to the live fetch (which is the right behavior — if the user
 *    refreshes, they want fresh data, not a cached snapshot).
 *  - TTL-guarded so an aborted navigation or browser quirk can't leave an
 *    indefinitely stale snapshot in sessionStorage.
 *  - Every sessionStorage access is wrapped in try/catch — Safari private
 *    mode and storage-quota errors should never break the checkout flow.
 *  - SSR-safe: silently no-ops when `window` is undefined.
 */

import type { Order } from '@/services/orderService';

const KEY_PREFIX = 'm2c_recent_order_';
const TTL_MS = 10 * 60 * 1000; // 10 minutes

interface Stash {
  data: Order;
  savedAt: number;
}

const isBrowser = () => typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';

/** Stash a freshly-created order so the confirmation page can pick it up without re-fetching. */
export function stashRecentOrder(order: Order): void {
  if (!isBrowser() || !order?.id) return;
  try {
    const payload: Stash = { data: order, savedAt: Date.now() };
    window.sessionStorage.setItem(KEY_PREFIX + order.id, JSON.stringify(payload));
  } catch {
    // Quota exceeded, private mode, etc. — silently degrade to the
    // refetch path; the confirmation page still works.
  }
}

/** Pop the order by id (one-shot read). Returns null if absent, stale, malformed, or for a different id. */
export function popRecentOrder(orderId: string): Order | null {
  if (!isBrowser() || !orderId) return null;
  const key = KEY_PREFIX + orderId;
  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return null;
    // Always clear, even on parse failure, to avoid leaving bad data behind.
    window.sessionStorage.removeItem(key);
    const parsed = JSON.parse(raw) as Stash;
    if (!parsed?.data?.id || parsed.data.id !== orderId) return null;
    if (typeof parsed.savedAt !== 'number' || Date.now() - parsed.savedAt > TTL_MS) return null;
    return parsed.data;
  } catch {
    return null;
  }
}
