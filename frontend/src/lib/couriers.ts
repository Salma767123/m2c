// ─── Courier Partner Catalog ────────────────────────────────────────────────
// Curated, code-owned reference list of courier partners. Mirrors the backend at
// utils/couriers.js — keep the two in sync (same ids). Region: IN = domestic (.in),
// US = international (.com). Each courier serves one or more transport modes.

export type CourierRegion = 'IN' | 'US';
export type TransportMode = 'AIR' | 'SHIP';

export interface Courier {
  id: string;
  name: string;
  /** Short badge text used as the courier "icon". */
  code: string;
  /** Brand-ish colour for the badge background. */
  color: string;
  region: CourierRegion;
  modes: TransportMode[];
}

export const COURIERS: Courier[] = [
  // Domestic (India, .in)
  { id: 'blue-dart', name: 'Blue Dart',  code: 'BD',  color: '#0B4DA2', region: 'IN', modes: ['AIR'] },
  { id: 'delhivery', name: 'Delhivery',  code: 'DL',  color: '#C8102E', region: 'IN', modes: ['AIR', 'SHIP'] },
  { id: 'dtdc',      name: 'DTDC',        code: 'DT',  color: '#E4032E', region: 'IN', modes: ['AIR', 'SHIP'] },
  { id: 'gati',      name: 'Gati',        code: 'GT',  color: '#1D4E8F', region: 'IN', modes: ['SHIP'] },
  // International (.com)
  { id: 'dhl',       name: 'DHL Express', code: 'DHL', color: '#D40511', region: 'US', modes: ['AIR'] },
  { id: 'fedex',     name: 'FedEx',       code: 'FX',  color: '#4D148C', region: 'US', modes: ['AIR'] },
  { id: 'ups',       name: 'UPS',         code: 'UPS', color: '#4E2A1E', region: 'US', modes: ['AIR'] },
  { id: 'maersk',    name: 'Maersk',      code: 'MK',  color: '#0091DA', region: 'US', modes: ['SHIP'] },
  { id: 'dhl-ocean', name: 'DHL Ocean',   code: 'DHL', color: '#D40511', region: 'US', modes: ['SHIP'] },
];

function normalizeRegion(value?: string | null): CourierRegion | null {
  if (!value) return null;
  const v = String(value).toUpperCase();
  if (v === 'IN' || v === 'INR') return 'IN';
  if (v === 'US' || v === 'USD') return 'US';
  return null;
}

/** Couriers available for a given region + transport mode. */
export function getCouriers(region?: string | null, mode?: TransportMode | null): Courier[] {
  const r = normalizeRegion(region);
  return COURIERS.filter((c) => (!r || c.region === r) && (!mode || c.modes.includes(mode)));
}

/** Look up a courier by id. */
export function courierById(id?: string | null): Courier | undefined {
  if (!id) return undefined;
  return COURIERS.find((c) => c.id === id);
}

/** Human-readable name for an id; falls back to the id itself. */
export function courierName(id?: string | null): string {
  return courierById(id)?.name || id || '';
}
