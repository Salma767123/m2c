/**
 * Lightweight, client-only browsing history kept in localStorage:
 *   · recently viewed product ids  — populated from the product detail page
 *   · recent search terms          — populated from the header search
 *
 * Used to personalise the empty-cart page (Suggested for You / Recently Viewed).
 * Best-effort: every accessor swallows storage errors and returns a safe empty
 * value so a disabled/full localStorage never breaks a render.
 */

const RECENTLY_VIEWED_KEY = 'm2c_recently_viewed';
const RECENT_SEARCHES_KEY = 'm2c_recent_searches';
const MAX_VIEWED = 12;
const MAX_SEARCHES = 8;

function read(key: string): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

function write(key: string, list: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(list));
  } catch {
    /* storage disabled/full — non-fatal */
  }
}

/** Record a product the user just viewed (most recent first, de-duplicated). */
export function recordRecentlyViewed(productId: string): void {
  if (!productId) return;
  const list = read(RECENTLY_VIEWED_KEY).filter((id) => id !== productId);
  list.unshift(productId);
  write(RECENTLY_VIEWED_KEY, list.slice(0, MAX_VIEWED));
}

/** Product ids the user viewed, most recent first. */
export function getRecentlyViewed(): string[] {
  return read(RECENTLY_VIEWED_KEY);
}

/** Record a search term the user just ran (most recent first, case-insensitive dedupe). */
export function recordSearch(term: string): void {
  const t = (term || '').trim();
  if (!t) return;
  const list = read(RECENT_SEARCHES_KEY).filter((s) => s.toLowerCase() !== t.toLowerCase());
  list.unshift(t);
  write(RECENT_SEARCHES_KEY, list.slice(0, MAX_SEARCHES));
}

/** Search terms the user ran, most recent first. */
export function getRecentSearches(): string[] {
  return read(RECENT_SEARCHES_KEY);
}
