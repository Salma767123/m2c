/**
 * Coupon validation + discount math — the single source of truth.
 *
 * Extracted from couponController.applyCoupon so the SAME rules run in two places:
 *   1. POST /coupons/apply — the shopper previewing a code in the cart
 *   2. orderController.createOrder — the authoritative recomputation at purchase
 *
 * Before this existed, only (1) validated anything and the order simply stored
 * whatever `discount` the browser posted (it came from localStorage, so it was
 * fully attacker-controlled). Any divergence between the two paths would be a
 * money bug, which is why they must not be two implementations.
 *
 * Pure-ish: it reads the DB but never touches req/res, so it is callable from a
 * controller, a job, or a test.
 */
const { prisma } = require('../config/database');

const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

const getOrdinalSuffix = (n) => {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return s[(v - 20) % 10] || s[v] || s[0];
};

/**
 * @param {object}  args
 * @param {string}  args.code       Coupon code as typed.
 * @param {number}  args.cartTotal  Goods subtotal in `currency` — pass the SERVER's
 *                                  computed subtotal at order time, never the client's.
 * @param {string}  [args.userId]   Required for per-user limit / Nth-order rules.
 * @param {string}  [args.currency] 'INR' | 'USD'.
 * @returns {Promise<{ok: boolean, message?: string, code?: string, discountAmount?: number,
 *                     freeShipping?: boolean, discountType?: string, discountValue?: number}>}
 */
async function evaluateCoupon({ code, cartTotal, userId, currency: rawCurrency }) {
    const currency = (rawCurrency || 'INR').toUpperCase() === 'USD' ? 'USD' : 'INR';
    const symbol = currency === 'USD' ? '$' : '₹';

    if (!code) return { ok: false, message: 'Coupon code is required' };

    let exchangeRate = 1;
    if (currency === 'USD') {
        const { getCurrentExchangeRate } = require('../controllers/exchangeRateController');
        exchangeRate = await getCurrentExchangeRate();
    }

    const coupon = await prisma.coupon.findUnique({ where: { code } });
    if (!coupon) return { ok: false, message: 'Invalid coupon code' };
    if (!coupon.isActive) return { ok: false, message: 'This coupon is no longer active' };

    const now = new Date();
    if (now < coupon.startDate || now > coupon.expiryDate) {
        return { ok: false, message: 'This coupon has expired or is not yet valid' };
    }

    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
        return { ok: false, message: 'This coupon has reached its usage limit' };
    }

    const minPurchase = currency === 'USD' && coupon.minPurchaseAmount
        ? round2(coupon.minPurchaseAmount / exchangeRate)
        : coupon.minPurchaseAmount;
    if (minPurchase && cartTotal < minPurchase) {
        return { ok: false, message: `Minimum purchase amount of ${symbol}${minPurchase} required` };
    }

    if (userId && coupon.perUserLimit > 0) {
        const used = await prisma.order.count({
            where: { customerId: userId, couponCode: coupon.code },
        });
        if (used >= coupon.perUserLimit) {
            return {
                ok: false,
                message: `You've already used this coupon${coupon.perUserLimit === 1 ? '' : ` ${coupon.perUserLimit} times`}`,
            };
        }
    }

    if (coupon.freeShipping && coupon.freeShippingOrderNumbers?.length > 0 && userId) {
        const orderCount = await prisma.order.count({ where: { customerId: userId } });
        const nextOrderNumber = orderCount + 1;
        if (!coupon.freeShippingOrderNumbers.includes(nextOrderNumber)) {
            const orderList = coupon.freeShippingOrderNumbers
                .map((n) => `${n}${getOrdinalSuffix(n)}`)
                .join(', ');
            return {
                ok: false,
                message: `This coupon gives free shipping on your ${orderList} order(s). Your next order is #${nextOrderNumber}.`,
            };
        }
    }

    let discountAmount = 0;
    if (coupon.discountType === 'PERCENTAGE') {
        discountAmount = (cartTotal * coupon.discountValue) / 100;
        const maxCap = currency === 'USD' && coupon.maxDiscountAmount
            ? round2(coupon.maxDiscountAmount / exchangeRate)
            : coupon.maxDiscountAmount;
        if (maxCap && discountAmount > maxCap) discountAmount = maxCap;
    } else {
        discountAmount = currency === 'USD'
            ? round2(coupon.discountValue / exchangeRate)
            : coupon.discountValue;
    }
    // Never let a discount exceed the goods value — that would invert the order.
    if (discountAmount > cartTotal) discountAmount = cartTotal;

    return {
        ok: true,
        code: coupon.code,
        discountAmount: round2(discountAmount),
        freeShipping: Boolean(coupon.freeShipping),
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
    };
}

module.exports = { evaluateCoupon, getOrdinalSuffix };
