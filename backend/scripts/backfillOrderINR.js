/**
 * Backfill the INR twins (Order.totalAmountINR & friends, OrderItem.totalPriceINR)
 * for orders written before those columns existed.
 *
 * Run:  node scripts/backfillOrderINR.js          (dry run — reports, writes nothing)
 *       node scripts/backfillOrderINR.js --apply  (writes)
 *
 * INR orders are exact: the twin equals the original, no rate needed.
 *
 * USD orders are NOT exact. A pre-snapshot order has no exchangeRate, and the true
 * rate at its purchase moment is unrecoverable — ExchangeRate keeps a single mutable
 * row with no history. This script stamps such orders with the current rate (or the
 * documented fallback) and marks them by writing that rate to Order.exchangeRate, so
 * the approximation is at least visible and reproducible rather than hidden. Orders
 * that already carry a rate keep it and are converted with it.
 *
 * Idempotent: rows whose twins are already set are skipped.
 */
const { prisma } = require('../config/database');
const { FALLBACK_USD_RATE, toINR } = require('../utils/orderCurrency');

const APPLY = process.argv.includes('--apply');

(async () => {
    const rateRow = await prisma.exchangeRate.findUnique({ where: { currency: 'USD' } });
    const liveRate = rateRow?.rate > 0 ? rateRow.rate : FALLBACK_USD_RATE;
    if (!rateRow?.rate) {
        console.warn(`! No ExchangeRate row for USD — approximating with fallback ${FALLBACK_USD_RATE}\n`);
    }

    const orders = await prisma.order.findMany({
        select: {
            id: true, orderId: true, currency: true, exchangeRate: true, totalAmountINR: true,
            totalAmount: true, tax: true, shippingCost: true, discount: true, bagTypePrice: true,
            items: { select: { id: true, totalPrice: true, totalPriceINR: true } },
        },
    });

    let done = 0, skipped = 0, approximated = 0;

    for (const o of orders) {
        if (o.totalAmountINR !== null && o.totalAmountINR !== undefined) { skipped++; continue; }

        const isUSD = o.currency === 'USD';
        // Reuse the order's own snapshot when it has one; only invent a rate if it doesn't.
        const rate = isUSD ? (o.exchangeRate ?? liveRate) : null;
        const approx = isUSD && !o.exchangeRate;
        if (approx) approximated++;

        const data = {
            totalAmountINR: toINR(o.totalAmount, o.currency, rate),
            taxINR: toINR(o.tax, o.currency, rate),
            shippingCostINR: toINR(o.shippingCost, o.currency, rate),
            discountINR: toINR(o.discount, o.currency, rate),
            bagTypePriceINR: toINR(o.bagTypePrice, o.currency, rate),
        };
        // Persist the rate we actually used, so the conversion is auditable later.
        if (approx) data.exchangeRate = rate;

        console.log(
            `${o.orderId}  ${o.currency}  total=${o.totalAmount}  ` +
            `rate=${rate ?? '-'}${approx ? ' (APPROX)' : ''}  -> INR ${data.totalAmountINR?.toFixed(2) ?? 'null'}`
        );

        if (APPLY) {
            await prisma.order.update({ where: { id: o.id }, data });
            for (const it of o.items) {
                if (it.totalPriceINR !== null && it.totalPriceINR !== undefined) continue;
                await prisma.orderItem.update({
                    where: { id: it.id },
                    data: { totalPriceINR: toINR(it.totalPrice, o.currency, rate) },
                });
            }
        }
        done++;
    }

    console.log(
        `\n${APPLY ? 'Updated' : 'Would update'}: ${done}   Skipped (already set): ${skipped}   ` +
        `Approximated USD (no original rate): ${approximated}`
    );
    if (!APPLY) console.log('Dry run — re-run with --apply to write.');
    await prisma.$disconnect();
})().catch(e => { console.error('ERR:', e.message); process.exit(1); });
