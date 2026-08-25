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

module.exports = { issueRefund };
