// ─── Courier Partners ───────────────────────────────────────────────────────
// Couriers are admin-managed (DB-backed) — see courierService + the admin Couriers
// module. This file keeps the transport-mode helpers, plus a runtime registry so
// courierName()/courierById() can resolve ids synchronously anywhere (cart, orders)
// after courierService has fetched the list. STATIC_COURIERS is a fallback used for
// the very first render and for legacy slug ids stored on old orders.

export type CourierRegion = 'IN' | 'US';
export type TransportMode = 'AIR' | 'SHIP';

export interface Courier {
  id: string;
  name: string;
  /** Short badge text used as the courier "icon". */
  code: string;
  /** Brand-ish colour for the badge background (fallback when no logo). */
  color: string;
  /** Optional uploaded logo image URL — shown instead of the code/colour badge. */
  logo?: string | null;
  region: CourierRegion;
  modes: TransportMode[];
  isActive?: boolean;
  sortOrder?: number;
}

// Fallback catalogue (matches the seed) — used before the DB list loads and to resolve
// legacy slug ids ('dhl', 'blue-dart', …) saved on pre-existing orders.
export const STATIC_COURIERS: Courier[] = [
  { id: 'blue-dart', name: 'Blue Dart',  code: 'BD',  color: '#0B4DA2', region: 'IN', modes: ['AIR'] },
  { id: 'delhivery', name: 'Delhivery',  code: 'DL',  color: '#C8102E', region: 'IN', modes: ['AIR', 'SHIP'] },
  { id: 'dtdc',      name: 'DTDC',        code: 'DT',  color: '#E4032E', region: 'IN', modes: ['AIR', 'SHIP'] },
  { id: 'gati',      name: 'Gati',        code: 'GT',  color: '#1D4E8F', region: 'IN', modes: ['SHIP'] },
  { id: 'dhl',       name: 'DHL Express', code: 'DHL', color: '#D40511', region: 'US', modes: ['AIR'] },
  { id: 'fedex',     name: 'FedEx',       code: 'FX',  color: '#4D148C', region: 'US', modes: ['AIR'] },
  { id: 'ups',       name: 'UPS',         code: 'UPS', color: '#4E2A1E', region: 'US', modes: ['AIR'] },
  { id: 'maersk',    name: 'Maersk',      code: 'MK',  color: '#0091DA', region: 'US', modes: ['SHIP'] },
  { id: 'dhl-ocean', name: 'DHL Ocean',   code: 'DHL', color: '#D40511', region: 'US', modes: ['SHIP'] },
];

// Runtime registry, keyed by id, populated by courierService.getActiveCouriers().
let RUNTIME: Record<string, Courier> = {};
export function registerCouriers(list: Courier[]) {
  const map: Record<string, Courier> = { ...RUNTIME };
  for (const c of list) map[c.id] = c;
  RUNTIME = map;
}

function normalizeRegion(value?: string | null): CourierRegion | null {
  if (!value) return null;
  const v = String(value).toUpperCase();
  if (v === 'IN' || v === 'INR' || v === 'IN_ONLY') return 'IN';
  if (v === 'US' || v === 'USD' || v === 'COM_ONLY') return 'US';
  return null;
}

// Accepts a region ('IN'/'US'), currency ('INR'/'USD') OR a product priceVisibility
// ('IN_ONLY'/'COM_ONLY'/'BOTH'). 'BOTH' resolves to 'BOTH' (a product sold on both
// storefronts), everything else maps to IN / US / null.
function toScope(value?: string | null): CourierRegion | 'BOTH' | null {
  if (value && String(value).toUpperCase() === 'BOTH') return 'BOTH';
  return normalizeRegion(value);
}

/**
 * Region-aware transport-mode label. The two stored modes are AIR and SHIP, but their
 * meaning differs by market:
 *   - International (.com): AIR = Air Freight, SHIP = Sea Freight (ocean).
 *   - Domestic India (.in): AIR = Air (domestic express), SHIP = Surface / Road — there
 *     is no sea freight within India, goods move by road/rail.
 * For a BOTH product (admin, before a storefront is chosen) SHIP reads "Sea / Surface".
 */
export function transportModeLabel(mode: TransportMode, region?: string | null): string {
  const r = toScope(region);
  if (mode === 'AIR') return r === 'IN' ? 'Air' : 'Air Freight';
  if (r === 'IN') return 'Surface / Road';
  if (r === 'BOTH') return 'Sea / Surface';
  return 'Sea Freight';
}

/** True when SHIP means domestic surface/road (India) — callers pick a truck icon. */
export function isSurfaceRegion(region?: string | null): boolean {
  return toScope(region) === 'IN';
}

/** All known couriers (runtime registry if loaded, else the static fallback). */
function allCouriers(): Courier[] {
  const runtime = Object.values(RUNTIME);
  return runtime.length > 0 ? runtime : STATIC_COURIERS;
}

/**
 * Couriers available for a region + transport mode, from the loaded registry (falls back
 * to the static list). Prefer courierService.getActiveCouriers() in components that can
 * fetch; this sync helper is for convenience/fallback.
 */
export function getCouriers(region?: string | null, mode?: TransportMode | null): Courier[] {
  const r = normalizeRegion(region);
  return allCouriers().filter((c) => (!r || c.region === r) && (!mode || c.modes.includes(mode)));
}

/** Look up a courier by id — runtime registry first, then the static fallback. */
export function courierById(id?: string | null): Courier | undefined {
  if (!id) return undefined;
  return RUNTIME[id] || STATIC_COURIERS.find((c) => c.id === id);
}

/** Human-readable name for an id; falls back to the id itself. */
export function courierName(id?: string | null): string {
  return courierById(id)?.name || id || '';
}
