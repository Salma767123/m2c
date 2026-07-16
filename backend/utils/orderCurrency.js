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

module.exports = { FALLBACK_USD_RATE, resolveUsdRate, toINR };
