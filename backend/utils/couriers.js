// ─── Courier Partner Catalog ────────────────────────────────────────────────
// A curated, code-owned reference list of courier partners — the same role a
// country list plays: fixed real-world entities, not admin-entered catalogue data.
// Mirrored on the frontend at lib/couriers.ts; keep the two in sync (same ids).
//
// Each courier is tagged with a region (IN = domestic / .in, US = international /
// .com) and the transport modes it serves (AIR / SHIP). The storefront lists the
// couriers matching the shopper's region and the transport they picked; the order
// then freezes the chosen id so fulfilment/admin dispatches with that carrier.

const COURIERS = [
  // ── Domestic (India, .in) ────────────────────────────────────────────────
  { id: 'blue-dart', name: 'Blue Dart',  code: 'BD',   color: '#0B4DA2', region: 'IN', modes: ['AIR'] },
  { id: 'delhivery', name: 'Delhivery',  code: 'DL',   color: '#C8102E', region: 'IN', modes: ['AIR', 'SHIP'] },
  { id: 'dtdc',      name: 'DTDC',        code: 'DT',   color: '#E4032E', region: 'IN', modes: ['AIR', 'SHIP'] },
  { id: 'gati',      name: 'Gati',        code: 'GT',   color: '#1D4E8F', region: 'IN', modes: ['SHIP'] },
  // ── International (.com) ──────────────────────────────────────────────────
  { id: 'dhl',       name: 'DHL Express', code: 'DHL',  color: '#D40511', region: 'US', modes: ['AIR'] },
  { id: 'fedex',     name: 'FedEx',       code: 'FX',   color: '#4D148C', region: 'US', modes: ['AIR'] },
  { id: 'ups',       name: 'UPS',         code: 'UPS',  color: '#4E2A1E', region: 'US', modes: ['AIR'] },
  { id: 'maersk',    name: 'Maersk',      code: 'MK',   color: '#0091DA', region: 'US', modes: ['SHIP'] },
  { id: 'dhl-ocean', name: 'DHL Ocean',   code: 'DHL',  color: '#D40511', region: 'US', modes: ['SHIP'] },
];

// Accepts region ('IN'/'US') or currency ('INR'/'USD'); returns 'IN' | 'US' | null.
function normalizeCourierRegion(value) {
  if (!value) return null;
  const v = String(value).toUpperCase();
  if (v === 'IN' || v === 'INR') return 'IN';
  if (v === 'US' || v === 'USD') return 'US';
  return null;
}

// Couriers available for a given region + transport mode.
function getCouriers(region, mode) {
  const r = normalizeCourierRegion(region);
  const m = mode ? String(mode).toUpperCase() : null;
  return COURIERS.filter(
    (c) => (!r || c.region === r) && (!m || c.modes.includes(m))
  );
}

// True when `id` is a real courier that serves this region + mode.
// NOTE: validates against the STATIC list only — kept for legacy slug ids.
function isValidCourier(id, region, mode) {
  if (!id) return false;
  return getCouriers(region, mode).some((c) => c.id === id);
}

// DB-aware courier validation — the admin-managed `Courier` table is the source of
// truth for the storefront picker, so an order's courier must be validated against
// it, not the static list above. Courier ids are Mongo ObjectIds; legacy lines that
// still reference the old slug ids fall back to the static catalogue.
async function isCourierAvailable(id, region, mode) {
  if (!id) return false;
  const r = normalizeCourierRegion(region);
  const m = mode ? String(mode).toUpperCase() : null;

  if (/^[0-9a-fA-F]{24}$/.test(String(id))) {
    try {
      // Lazy require to avoid loading the DB client in contexts that only need the
      // static helpers (and to sidestep any require cycle at module load).
      const { prisma } = require('../config/database');
      const courier = await prisma.courier.findFirst({
        where: {
          id: String(id),
          isActive: true,
          ...(r ? { region: r } : {}),
          ...(m ? { modes: { has: m } } : {}),
        },
        select: { id: true },
      });
      return !!courier;
    } catch {
      return false;
    }
  }

  // Non-ObjectId → legacy slug id from the pre-DB hardcoded catalogue.
  return isValidCourier(id, r, m);
}

// Human-readable name for an id ("blue-dart" -> "Blue Dart"); falls back to the id.
function courierName(id) {
  const c = COURIERS.find((x) => x.id === id);
  return c ? c.name : (id || null);
}

module.exports = { COURIERS, normalizeCourierRegion, getCouriers, isValidCourier, isCourierAvailable, courierName };
