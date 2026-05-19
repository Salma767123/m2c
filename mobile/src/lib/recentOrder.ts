/**
 * One-shot AsyncStorage handoff for a just-created order.
 *
 * The checkout screen receives the full Order back from `POST /orders`.
 * Without this handoff, the order-confirmation screen would re-fetch the
 * same data via `GET /orders/:id` — a wasted ~500ms–1.5s round trip that
 * the user sees as a loading spinner after a successful payment.
 *
 * Design notes
 *  - Keyed by orderId so the confirmation screen can confirm the stash
 *    belongs to the order it was navigated to.
 *  - One-shot: cleared on first read so a manual navigation back to this
 *    screen falls through to the live fetch (right behavior — if the user
 *    re-opens this screen later, they want fresh data).
 *  - TTL-guarded against indefinitely stale snapshots.
 *  - All AsyncStorage access is wrapped in try/catch — storage errors must
 *    never break the checkout flow.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Order } from '@/services/orderService';

const KEY_PREFIX = 'm2c_recent_order_';
const TTL_MS = 10 * 60 * 1000; // 10 minutes

interface Stash {
  data: Order;
  savedAt: number;
}

/** Stash a freshly-created order so the confirmation screen can pick it up without re-fetching. */
export async function stashRecentOrder(order: Order): Promise<void> {
  if (!order?.id) return;
  try {
    const payload: Stash = { data: order, savedAt: Date.now() };
    await AsyncStorage.setItem(KEY_PREFIX + order.id, JSON.stringify(payload));
  } catch {
    // Storage error — silently degrade to the refetch path.
  }
}

/** Pop the order by id (one-shot read). Returns null if absent, stale, malformed, or for a different id. */
export async function popRecentOrder(orderId: string): Promise<Order | null> {
  if (!orderId) return null;
  const key = KEY_PREFIX + orderId;
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    // Always clear, even on parse failure, to avoid leaving bad data behind.
    await AsyncStorage.removeItem(key);
    const parsed = JSON.parse(raw) as Stash;
    if (!parsed?.data?.id || parsed.data.id !== orderId) return null;
    if (typeof parsed.savedAt !== 'number' || Date.now() - parsed.savedAt > TTL_MS) return null;
    return parsed.data;
  } catch {
    return null;
  }
}
