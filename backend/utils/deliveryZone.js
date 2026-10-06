// Destination-based delivery availability + flat fee.
//
// A DeliveryZone decides whether M2C ships to an address and the flat fee added
// on top of the weight-based rate. Matching is dataset-free (zones store both
// ISO and name for each state), hierarchical, and most-specific-wins:
//   city-specific  >  state-specific (all cities)  >  all states (country-wide)
// Shipping GST % is a single dynamic setting (InvoiceSettings.shippingGstPercentage).

const { prisma } = require('../config/database');

const norm = (s) => String(s == null ? '' : s).trim().toLowerCase();
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

// Score how well a zone matches an address. -1 = no match; higher = more specific.
function scoreZone(zone, addr) {
    if (!zone || zone.isActive === false) return -1;

    // Country must match (by ISO or name).
    const c = norm(addr.country);
    if (c !== norm(zone.countryIso) && c !== norm(zone.countryName)) return -1;

    // State: all states, or the address state matches one selected (iso or name).
    const states = Array.isArray(zone.states) ? zone.states : [];
    const stateOk = zone.allStates || states.some((st) => {
        const iso = norm(st?.iso); const name = norm(st?.name);
        const a = norm(addr.state);
        return a && (a === iso || a === name);
    });
    if (!stateOk) return -1;

    // City: all cities, or the address city matches one selected (case-insensitive).
    const cities = Array.isArray(zone.cities) ? zone.cities : [];
    const cityOk = zone.allCities || cities.some((cy) => norm(cy) === norm(addr.city));
    if (!cityOk) return -1;

    // Specificity: an explicit city beats an explicit state beats country-wide.
    let score = 0;
    if (!zone.allCities) score += 2;
    if (!zone.allStates) score += 1;
    return score;
}

// Resolve the best-matching active zone for an address, or null when unserviceable.
async function resolveDeliveryZone(addr) {
    if (!addr) return null;
    const zones = await prisma.deliveryZone.findMany({ where: { isActive: true } });
    let best = null; let bestScore = -1;
    for (const z of zones) {
        const s = scoreZone(z, addr);
        if (s < 0) continue;
        // Zones never overlap (enforced on create/update), so the most specific
        // match is unambiguous; first match wins on the (impossible) tie.
        if (s > bestScore) { best = z; bestScore = s; }
    }
    return best;
}

// The dynamic shipping GST %, from invoice settings (0 when unset).
async function getShippingGstPct() {
    try {
        const s = await prisma.invoiceSettings.findFirst({ select: { shippingGstPercentage: true } });
        const pct = Number(s?.shippingGstPercentage);
        return Number.isFinite(pct) && pct > 0 ? pct : 0;
    } catch {
        return 0;
    }
}

// Combine the weight-based rate with the zone fee and compute shipping GST (all INR).
// `freeShipping` waives the whole shipping base (and therefore its tax).
function combineShipping({ weightShippingInr, zoneFlatFee, shippingGstPct, freeShipping }) {
    const weight = round2(weightShippingInr);
    const fee = round2(zoneFlatFee);
    const baseInr = freeShipping ? 0 : round2(weight + fee);
    const taxInr = round2(baseInr * (Number(shippingGstPct) || 0) / 100);
    return { weightInr: weight, flatFeeInr: fee, shippingBaseInr: baseInr, shippingTaxInr: taxInr };
}

// Does `candidate` overlap any of `existing` zones? Zones must cover disjoint
// locations. Returns a human reason string on overlap, or null when it's clear.
// Country-level: whole-country or whole-state coverage conflicts broadly; specific
// cities conflict by name within a shared state.
function findOverlap(candidate, existing) {
    const sameCountry = (existing || []).filter((z) => norm(z.countryIso) === norm(candidate.countryIso));
    for (const z of sameCountry) {
        // Either side covering the whole country overlaps everything in it.
        if (candidate.allStates || z.allStates) {
            return `"${z.name}" already covers this country` + (z.allStates ? '' : ' partially');
        }
        const candStates = (candidate.states || []).map((s) => norm(s.iso));
        const zStates = (z.states || []).map((s) => norm(s.iso));
        const shared = candStates.filter((s) => zStates.includes(s));
        if (shared.length === 0) continue;
        const sharedNames = (z.states || []).filter((s) => shared.includes(norm(s.iso))).map((s) => s.name);
        // Whole-state coverage on either side conflicts for a shared state.
        if (candidate.allCities || z.allCities) {
            return `"${z.name}" already covers all of ${sharedNames.join(', ')}`;
        }
        // Both specific cities → conflict only if a city name is shared.
        const candCities = (candidate.cities || []).map(norm);
        const zCities = (z.cities || []).map(norm);
        const dup = candCities.find((c) => zCities.includes(c));
        if (dup) return `"${z.name}" already covers the city "${dup}"`;
    }
    return null;
}

module.exports = { resolveDeliveryZone, scoreZone, getShippingGstPct, combineShipping, findOverlap };
