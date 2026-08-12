/**
 * Courier partners — admin-managed, DB-backed (see courierService + the admin Couriers
 * module). This file keeps the transport-mode helpers plus a runtime registry so
 * courierName()/courierById() can resolve ids synchronously anywhere (cart, orders)
 * after courierService has fetched the list. COURIERS below is the static fallback,
 * matching backend utils/couriers.js (used for legacy slug ids like 'blue-dart' and
 * before the DB list loads). Keep its ids in sync with backend utils/couriers.js.
 */

export interface Courier {
  id: string;
  name: string;
  code: string;
  color: string;
  region: 'IN' | 'US';
  modes: ('AIR' | 'SHIP')[];
  /** Optional uploaded logo image URL — shown instead of the code/colour badge. */
  logo?: string | null;
  isActive?: boolean;
  sortOrder?: number;
}

export const COURIERS: Courier[] = [
  // ── Domestic (India, .in) ────────────────────────────────────────────────
  { id: 'blue-dart', name: 'Blue Dart',   code: 'BD',  color: '#0B4DA2', region: 'IN', modes: ['AIR'] },
  { id: 'delhivery', name: 'Delhivery',   code: 'DL',  color: '#C8102E', region: 'IN', modes: ['AIR', 'SHIP'] },
  { id: 'dtdc',      name: 'DTDC',        code: 'DT',  color: '#E4032E', region: 'IN', modes: ['AIR', 'SHIP'] },
  { id: 'gati',      name: 'Gati',        code: 'GT',  color: '#1D4E8F', region: 'IN', modes: ['SHIP'] },
  
  // ── International (.com) ──────────────────────────────────────────────────
  { id: 'dhl',       name: 'DHL Express', code: 'DHL', color: '#D40511', region: 'US', modes: ['AIR'] },
  { id: 'fedex',     name: 'FedEx',       code: 'FX',  color: '#4D148C', region: 'US', modes: ['AIR'] },
  { id: 'ups',       name: 'UPS',         code: 'UPS', color: '#4E2A1E', region: 'US', modes: ['AIR'] },
  { id: 'maersk',    name: 'Maersk',      code: 'MK',  color: '#0091DA', region: 'US', modes: ['SHIP'] },
  { id: 'dhl-ocean', name: 'DHL Ocean',   code: 'DHL', color: '#D40511', region: 'US', modes: ['SHIP'] },
];

// Runtime registry, keyed by id, populated by courierService.getActiveCouriers().
// Falls back to the static list below until (or when) the DB list loads.
let RUNTIME: Record<string, Courier> = {};
export function registerCouriers(list: Courier[]) {
  const map: Record<string, Courier> = { ...RUNTIME };
  for (const c of list) map[c.id] = c;
  RUNTIME = map;
}

function allCouriers(): Courier[] {
  const runtime = Object.values(RUNTIME);
  return runtime.length > 0 ? runtime : COURIERS;
}

/**
 * Normalize region string to standard format
 * Handles: 'IN', 'INR', 'in', 'inr', 'US', 'USD', 'us', 'usd', etc.
 */
function normalizeCourierRegion(value?: string | null): 'IN' | 'US' | null {
  if (!value) return null;
  const v = String(value).toUpperCase();
  if (v === 'IN' || v === 'INR' || v === 'IN_ONLY') return 'IN';
  if (v === 'US' || v === 'USD' || v === 'COM_ONLY') return 'US';
  return null;
}

/**
 * Get list of couriers available for a region + transport mode
 * 
 * @param region - 'IN', 'INR', 'US', 'USD', or any case variant
 * @param mode - 'AIR' or 'SHIP'
 * @returns Courier[] filtered by region and mode
 */
export function getCouriers(region?: string | null, mode?: string | null): Courier[] {
  const r = normalizeCourierRegion(region);
  const m = mode ? String(mode).toUpperCase() : null;
  return allCouriers().filter((c) => (!r || c.region === r) && (!m || c.modes.includes(m as any)));
}

/**
 * Validate if a courier ID is valid for a given region + mode
 * Backend uses this to reject invalid selections
 * 
 * @param id - courier ID (e.g., 'blue-dart', 'dhl')
 * @param region - region code
 * @param mode - 'AIR' or 'SHIP'
 * @returns true if courier exists and supports the mode in that region
 */
export function isValidCourier(id?: string | null, region?: string | null, mode?: string | null): boolean {
  if (!id) return false;
  return getCouriers(region, mode).some((c) => c.id === id);
}

/**
 * Get human-readable name for a courier ID
 * Falls back to raw ID if not found
 * 
 * Used in Cart.tsx to display selected courier in cart item UI
 */
export function courierName(id?: string | null): string {
  if (!id) return '';
  return getCourierById(id)?.name || id;
}

/**
 * Get courier object by ID — runtime registry first, then the static fallback.
 */
export function getCourierById(id?: string | null): Courier | undefined {
  if (!id) return undefined;
  return RUNTIME[id] || COURIERS.find((c) => c.id === id);
}

/**
 * Region-aware transport-mode label. The two stored modes are AIR and SHIP, but their
 * meaning differs by market:
 *   - International (.com): AIR = Air Freight, SHIP = Sea Freight (ocean).
 *   - Domestic India (.in): AIR = Air (domestic express), SHIP = Surface / Road — there
 *     is no sea freight within India, goods move by road/rail.
 * Mirrors frontend/src/lib/couriers.ts `transportModeLabel`.
 */
export function transportModeLabel(mode: 'AIR' | 'SHIP', region?: string | null): string {
  const r = String(region || '').toUpperCase();
  const isIn = r === 'IN' || r === 'INR' || r === 'IN_ONLY';
  if (mode === 'AIR') return isIn ? 'Air' : 'Air Freight';
  if (isIn) return 'Surface / Road';
  return 'Sea Freight';
}

/** True when SHIP means domestic surface/road (India) — callers pick a truck icon. */
export function isSurfaceRegion(region?: string | null): boolean {
  const r = String(region || '').toUpperCase();
  return r === 'IN' || r === 'INR' || r === 'IN_ONLY';
}