const { prisma } = require('../config/database');

/**
 * Issue a refund for an order back to its original payment method.
 *
 * Prepaid (Razorpay) orders are refunded in full via the gateway; COD or orders
 * with no gateway payment id are flagged for manual processing. Returns a status
 * the caller persists on the order — it never throws, so a gateway hiccup can't
 * roll back the cancel/return the customer already sees.
 *
 * @returns {Promise<{ refundStatus: string, refundId: string|null }>}
 *   refundStatus: 'INITIATED' | 'MANUAL' | 'FAILED' | 'NONE'
 */
async function issueRefund(order) {
    // Nothing was captured through the gateway — settle by hand (COD, unpaid, etc.).
    if (!order.paymentId || order.paymentMethod === 'COD' || order.paymentStatus !== 'PAID') {
        return { refundStatus: 'MANUAL', refundId: null };
    }

    try {
        const settings = await prisma.paymentSettings.findFirst({
            select: { razorpayKeyId: true, razorpayKeySecret: true },
        });
        if (!settings || !settings.razorpayKeyId || !settings.razorpayKeySecret) {
            console.warn('[Refund] Razorpay keys not configured — marking refund MANUAL');
            return { refundStatus: 'MANUAL', refundId: null };
        }

        const Razorpay = require('razorpay');
        const rzp = new Razorpay({ key_id: settings.razorpayKeyId, key_secret: settings.razorpayKeySecret });
        // Full refund (no amount) — avoids currency-unit mistakes and matches a
        // whole-order cancel/return. Partial refunds would pass { amount } in paise.
        const refund = await rzp.payments.refund(order.paymentId, { speed: 'normal' });
        return { refundStatus: 'INITIATED', refundId: refund?.id || null };
    } catch (error) {
        console.error('[Refund] Gateway refund failed:', error?.message || error);
        return { refundStatus: 'FAILED', refundId: null };
    }
}

/**
 * Issue a PARTIAL refund of a specific INR amount against an order's original
 * payment. Used for per-item returns, where only one line of a multi-item order
 * is being refunded. Mirrors issueRefund's never-throw contract.
 *
 * @param {object} order          the parent order (needs paymentId/method/status)
 * @param {number} amountInrMajor refund amount in INR rupees (major unit)
 * @returns {Promise<{ refundStatus: string, refundId: string|null }>}
 */
async function issueRefundAmount(order, amountInrMajor) {
    if (!order.paymentId || order.paymentMethod === 'COD' || order.paymentStatus !== 'PAID') {
        return { refundStatus: 'MANUAL', refundId: null };
    }
    const paise = Math.round(Number(amountInrMajor || 0) * 100);
    if (!paise || paise < 100) {
        // Nothing meaningful to refund through the gateway — settle by hand.
        return { refundStatus: 'MANUAL', refundId: null };
    }
    try {
        const settings = await prisma.paymentSettings.findFirst({
            select: { razorpayKeyId: true, razorpayKeySecret: true },
        });
        if (!settings || !settings.razorpayKeyId || !settings.razorpayKeySecret) {
            console.warn('[Refund] Razorpay keys not configured — marking refund MANUAL');
            return { refundStatus: 'MANUAL', refundId: null };
        }
        const Razorpay = require('razorpay');
        const rzp = new Razorpay({ key_id: settings.razorpayKeyId, key_secret: settings.razorpayKeySecret });
        const refund = await rzp.payments.refund(order.paymentId, { amount: paise, speed: 'normal' });
        return { refundStatus: 'INITIATED', refundId: refund?.id || null };
    } catch (error) {
        console.error('[Refund] Gateway partial refund failed:', error?.message || error);
        return { refundStatus: 'FAILED', refundId: null };
    }
}

/**
 * Fetch a human-readable label of the instrument an order was actually paid with
 * (card •••• / UPI / netbanking / wallet), by querying the captured payment.
 * Returns null for COD/unpaid/errors — never throws.
 */
async function fetchPaymentMethodLabel(order) {
    if (!order?.paymentId || order.paymentMethod === 'COD' || order.paymentStatus !== 'PAID') return null;
    try {
        const settings = await prisma.paymentSettings.findFirst({
            select: { razorpayKeyId: true, razorpayKeySecret: true },
        });
        if (!settings?.razorpayKeyId || !settings?.razorpayKeySecret) return null;
        const Razorpay = require('razorpay');
        const rzp = new Razorpay({ key_id: settings.razorpayKeyId, key_secret: settings.razorpayKeySecret });
        const p = await rzp.payments.fetch(order.paymentId);
        switch (p?.method) {
            case 'card': return p.card?.last4 ? `Card •••• ${p.card.last4}` : 'Card';
            case 'upi': return p.vpa ? `UPI · ${p.vpa}` : 'UPI';
            case 'netbanking': return p.bank ? `Netbanking · ${p.bank}` : 'Netbanking';
            case 'wallet': return p.wallet ? `Wallet · ${p.wallet}` : 'Wallet';
            case 'emi': return 'EMI';
            default: return p?.method || null;
        }
    } catch (e) {
        console.warn('[Refund] could not fetch payment method:', e?.message || e);
        return null;
    }
}

module.exports = { issueRefund, issueRefundAmount, fetchPaymentMethodLabel };
