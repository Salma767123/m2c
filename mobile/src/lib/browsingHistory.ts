/**
 * Lightweight browsing history — port of frontend/src/lib/browsingHistory.ts.
 *
 *   · recently viewed product ids — populated from the product detail screen
 *   · recent search terms         — populated from the search bar
 *
 * The web keeps this in localStorage, which is synchronous. AsyncStorage is
 * not, so every accessor here returns a Promise and an in-memory cache backs
 * the reads: a screen that wants the list on first paint would otherwise have
 * to render empty and then fill in.
 *
 * Best-effort throughout: every accessor swallows storage errors and returns a
 * safe empty value, so disabled or full storage never breaks a render.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const RECENTLY_VIEWED_KEY = 'm2c_recently_viewed';
const RECENT_SEARCHES_KEY = 'm2c_recent_searches';
const MAX_VIEWED = 12;
const MAX_SEARCHES = 8;

/** Last known value per key, so a read can answer immediately after the first. */
const cache: Record<string, string[]> = {};

async function read(key: string): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    const list = Array.isArray(parsed) ? parsed.filter((v) => typeof v === 'string') : [];
    cache[key] = list;
    return list;
  } catch {
    return cache[key] ?? [];
  }
}

async function write(key: string, list: string[]): Promise<void> {
  cache[key] = list;
  try {
    await AsyncStorage.setItem(key, JSON.stringify(list));
  } catch {
    /* storage disabled/full — non-fatal */
  }
}

/** Record a product the user just viewed (most recent first, de-duplicated). */
export async function recordRecentlyViewed(productId: string): Promise<void> {
  if (!productId) return;
  const list = (await read(RECENTLY_VIEWED_KEY)).filter((id) => id !== productId);
  list.unshift(productId);
  await write(RECENTLY_VIEWED_KEY, list.slice(0, MAX_VIEWED));
}

/** Product ids the user viewed, most recent first. */
export async function getRecentlyViewed(): Promise<string[]> {
  return read(RECENTLY_VIEWED_KEY);
}

/** Record a search term the user just ran (most recent first, case-insensitive dedupe). */
export async function recordSearch(term: string): Promise<void> {
  const t = (term || '').trim();
  if (!t) return;
  const list = (await read(RECENT_SEARCHES_KEY)).filter(
    (s) => s.toLowerCase() !== t.toLowerCase(),
  );
  list.unshift(t);
  await write(RECENT_SEARCHES_KEY, list.slice(0, MAX_SEARCHES));
}

/** Search terms the user ran, most recent first. */
export async function getRecentSearches(): Promise<string[]> {
  return read(RECENT_SEARCHES_KEY);
}

/** Remove one recent search term (case-insensitive). */
export async function removeRecentSearch(term: string): Promise<void> {
  const t = (term || '').trim().toLowerCase();
  const list = (await read(RECENT_SEARCHES_KEY)).filter((s) => s.toLowerCase() !== t);
  await write(RECENT_SEARCHES_KEY, list);
}
