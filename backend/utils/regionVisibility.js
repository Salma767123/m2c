/**
 * Region-based product visibility — the server-side authority.
 *
 * A product/variant carries priceVisibility = IN_ONLY | COM_ONLY | BOTH. The .in and
 * .com storefronts are separate deployments sharing one backend, so the backend can't
 * infer region from its own host — the request must carry it (a `region` query param
 * on public reads, or the order `currency` on cart/checkout, which maps 1:1).
 *
 * This MUST mirror isVisibleInRegion() in frontend/src/lib/currency.ts. The client
 * filter is cosmetic; this is what actually gates data and purchases.
 */

// Normalise whatever the request carries into 'IN' | 'US' | null.
// Accepts a region string ('IN'/'US') or a currency ('INR'/'USD').
function normalizeRegion(value) {
    if (!value) return null;
    const v = String(value).toUpperCase();
    if (v === 'IN' || v === 'INR') return 'IN';
    if (v === 'US' || v === 'USD') return 'US';
    return null;
}

// The Prisma `where` fragment for a region, or {} when region is unknown (no filter —
// fail open on reads so a missing param never blank-screens the whole catalogue).
function visibilityWhere(region) {
    const r = normalizeRegion(region);
    if (r === 'IN') return { priceVisibility: { in: ['IN_ONLY', 'BOTH'] } };
    if (r === 'US') return { priceVisibility: { in: ['COM_ONLY', 'BOTH'] } };
    return {};
}

// Is a single priceVisibility value visible in this region? Used to gate the detail
// endpoint, cart adds, and order lines. Unknown region => treat as visible (fail open);
// the purchase paths pass a concrete currency, so region is always known there.
function isVisibleInRegion(priceVisibility, region) {
    if (!priceVisibility || priceVisibility === 'BOTH') return true;
    const r = normalizeRegion(region);
    if (!r) return true;
    if (r === 'IN') return priceVisibility === 'IN_ONLY';
    return priceVisibility === 'COM_ONLY';
}

module.exports = { normalizeRegion, visibilityWhere, isVisibleInRegion };
