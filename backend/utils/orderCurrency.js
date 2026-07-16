/**
 * Order currency normalisation.
 *
 * Order money (totalAmount, tax, OrderItem.totalPrice, ...) is stored in the currency
 * the buyer was charged: a .com order holds USD numbers, a .in order INR. That makes
 * every cross-order aggregate meaningless — SUM over a mixed set adds ₹500 to $10 and
 * returns 510.
 *
 * The fix is a denormalised INR twin for each aggregated money field, computed once at
 * write time and frozen. Reports then aggregate the *INR twin* and stay correct, while
 * the original field remains the source of truth for what the customer actually paid.
 *
 * Why denormalise instead of converting at read time:
 *   - Prisma's _sum/_avg/groupBy cannot express "multiply by a per-row rate", so a
 *     read-time fix would mean loading every order into memory to reduce() it. That
 *     breaks at scale and makes orderBy on a money sum impossible.
 *   - OrderItem has no currency column at all, so nine of the contaminated aggregates
 *     could not even be filtered by currency without a join.
 *   - Converting at read time with today's rate would rewrite history: last year's
 *     revenue would change every time an admin edits the rate.
 */

// Mirrors FALLBACK_RATE in frontend/src/lib/currency.ts. Used only when the admin has
// never set an ExchangeRate row — without it, a USD order would get a null rate, its
// INR twins would be null, and it would drop silently out of every revenue total.
// A slightly stale rate is recoverable; a silently undercounted revenue figure is not.
const FALLBACK_USD_RATE = 83.5;

/**
 * Resolve INR-per-USD for a new order. Returns the admin-configured rate when present,
 * else the fallback (and says so, so the gap is visible in logs rather than silent).
 */
async function resolveUsdRate(prisma) {
    const row = await prisma.exchangeRate.findUnique({ where: { currency: 'USD' } });
    if (row?.rate > 0) return row.rate;
    console.warn(
        `[orderCurrency] No ExchangeRate row for USD — falling back to ${FALLBACK_USD_RATE}. ` +
        `Set the rate in Admin → Exchange Rate so order conversions use a real figure.`
    );
    return FALLBACK_USD_RATE;
}

/**
 * Convert an order-currency amount to INR using the order's own rate snapshot.
 * INR orders pass through unchanged (rate is irrelevant). Returns null only when a USD
 * amount has no usable rate — callers must treat null as "unknown", never as zero.
 */
function toINR(amount, currency, rate) {
    if (amount === null || amount === undefined) return null;
    if (currency !== 'USD') return amount;
    if (!rate || rate <= 0) return null;
    return amount * rate;
}

const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

/**
 * Resolve the price to charge for one unit, in the order's currency.
 *
 * This MUST mirror getRegionalPrice() in frontend/src/lib/currency.ts. The shopper is
 * quoted the frontend's number on the product page, in the cart and at checkout; if
 * this chain disagrees, the order is written at a price the customer never saw.
 *
 * The INR chain is the source of truth. USD is derived from it:
 *   - priceUSD when the admin has set/recalculated one (exchangeRateController
 *     backfills it on every rate edit), else
 *   - the INR price converted with the order's rate SNAPSHOT.
 *
 * Never fall through to an INR field for a USD order: that bills a ₹350 product as
 * $350. Falling back to the live-converted figure keeps the number in the right
 * order of magnitude even when priceUSD is missing.
 *
 * `== null` not `||` throughout: a legitimately-zero price must not be treated as
 * "unset" and silently replaced by the next candidate.
 *
 * @param {object} p       Product or ProductVariant. Products carry `basePrice`,
 *                         variants carry `price` — both are the vendor's own price.
 * @param {string} currency Order currency ('USD' | 'INR').
 * @param {number|null} rate The order's INR-per-USD snapshot (from resolveUsdRate).
 * @returns {number} Unit price in `currency`, rounded to 2dp.
 */
function resolveUnitPrice(p, currency, rate) {
    const inrPrice = firstSet(p.priceINR, p.adminFixedPrice, p.basePrice, p.price) ?? 0;

    if (currency !== 'USD') return round2(inrPrice);

    if (p.priceUSD != null) return round2(p.priceUSD);
    if (inrPrice <= 0) return 0;
    if (!rate || rate <= 0) {
        // resolveUsdRate never returns a bad rate, so this is unreachable in the order
        // path. Guard anyway: charging the INR number as USD is the bug this exists
        // to prevent, and silently returning 0 would give the goods away free.
        throw new Error(
            `[orderCurrency] Cannot price in USD: no exchange rate and no priceUSD set.`
        );
    }
    return round2(inrPrice / rate);
}

/**
 * Derive a USD price from an INR one. The INR price is the source of truth; USD is
 * always a function of it and the rate, so it is never entered by hand.
 * Returns null for an unset INR price — null means "no USD price", and
 * resolveUnitPrice() converts live rather than treating null as zero.
 */
function usdFromINR(inrPrice, rate) {
    if (inrPrice == null || !rate || rate <= 0) return null;
    return round2(inrPrice / rate);
}

/** First candidate that is actually set (0 counts as set; null/undefined do not). */
function firstSet(...values) {
    for (const v of values) {
        if (v != null) return v;
    }
    return null;
}

module.exports = { FALLBACK_USD_RATE, resolveUsdRate, toINR, resolveUnitPrice, usdFromINR };
