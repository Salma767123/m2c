const { prisma } = require('../config/database');

const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

/**
 * Attach the vendor line items to each settlement.
 *
 * A settlement is one vendor's payout for one order, so its lines are exactly that
 * order's OrderItems for that vendor. Each line carries the payout figures FROZEN at
 * order time (vendorUnitPrice / vendorLineBase / vendorLineTax) — all INR, all the
 * vendor's own price, never M2C's selling price.
 *
 * `lineItemsAvailable` tells the client whether the frozen snapshot exists: items
 * created before that snapshot leave these columns null, and the UI shows a "detail
 * unavailable" note instead of inventing per-line numbers. The settlement's own
 * baseAmount/taxAmount/amount are always correct regardless.
 *
 * One grouped query for all orders in the batch, then map in memory — no N+1.
 */
async function attachSettlementLineItems(settlements) {
    const list = Array.isArray(settlements) ? settlements : [settlements];
    if (list.length === 0) return settlements;

    const orderIds = [...new Set(list.map(s => s.orderId).filter(Boolean))];
    const items = orderIds.length
        ? await prisma.orderItem.findMany({
            where: { orderId: { in: orderIds } },
            select: {
                id: true, orderId: true, vendorId: true,
                productName: true, productImage: true, sku: true,
                size: true, color: true, quantity: true,
                vendorUnitPrice: true, vendorLineBase: true,
                vendorLineTax: true, vendorGstRate: true,
            },
        })
        : [];

    // Key by orderId + vendorId — a multi-vendor order yields several settlements, and
    // each must see only its own lines.
    const byKey = new Map();
    for (const it of items) {
        const key = `${it.orderId}:${it.vendorId}`;
        if (!byKey.has(key)) byKey.set(key, []);
        byKey.get(key).push(it);
    }

    const decorated = list.map(s => {
        const lines = byKey.get(`${s.orderId}:${s.vendorId}`) || [];
        const lineItems = lines.map(l => ({
            id: l.id,
            productName: l.productName,
            productImage: l.productImage,
            sku: l.sku,
            size: l.size,
            color: l.color,
            quantity: l.quantity,
            unitPrice: l.vendorUnitPrice,
            taxableValue: l.vendorLineBase,
            gstRate: l.vendorGstRate,
            gstAmount: l.vendorLineTax,
            lineTotal: l.vendorLineBase != null
                ? round2((l.vendorLineBase || 0) + (l.vendorLineTax || 0))
                : null,
        }));
        // The snapshot is available only if every line has the frozen base recorded.
        const lineItemsAvailable = lineItems.length > 0 && lineItems.every(l => l.taxableValue != null);
        return { ...s, lineItems: lineItemsAvailable ? lineItems : [], lineItemsAvailable };
    });

    return Array.isArray(settlements) ? decorated : decorated[0];
}

// Admin: Get all settlements
const getAllSettlements = async (req, res) => {
    try {
        const settlements = await prisma.settlement.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                vendor: { include: { bankDetails: { select: { id: true, bankName: true } } } },
                order: { select: { status: true, orderId: true } }
            }
        });

        res.status(200).json({
            success: true,
            data: settlements
        });
    } catch (error) {
        console.error('Error fetching settlements:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch settlements'
        });
    }
};

// Admin: Get a single settlement by ID
const getSettlementById = async (req, res) => {
    try {
        const { id } = req.params;

        const settlement = await prisma.settlement.findUnique({
            where: { id },
            include: {
                vendor: true,
                order: true
            }
        });

        if (!settlement) {
            return res.status(404).json({
                success: false,
                error: 'Settlement not found'
            });
        }

        res.status(200).json({
            success: true,
            data: await attachSettlementLineItems(settlement)
        });
    } catch (error) {
        console.error('Error fetching settlement:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch settlement'
        });
    }
};

// Admin: Update settlement status (e.g. to Paid) 
const updateSettlementStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, transactionId } = req.body;

        const settlement = await prisma.settlement.findUnique({
            where: { id },
            include: { order: { select: { status: true, orderId: true } } }
        });

        if (!settlement) {
            return res.status(404).json({
                success: false,
                error: 'Settlement not found'
            });
        }

        // Only allow payment confirmation when order is delivered
        if (status === 'Paid') {
            const orderStatus = settlement.order?.status?.toUpperCase();
            if (orderStatus !== 'DELIVERED' && orderStatus !== 'COMPLETED') {
                return res.status(400).json({
                    success: false,
                    error: `Cannot settle payment — order ${settlement.order?.orderId || ''} is not yet delivered. Current status: ${settlement.order?.status?.replace(/_/g, ' ') || 'Unknown'}`
                });
            }

            // Check vendor has bank details
            const bankDetails = await prisma.vendorBankDetails.findUnique({
                where: { vendorId: settlement.vendorId }
            });
            if (!bankDetails) {
                return res.status(400).json({
                    success: false,
                    error: `Cannot settle payment — vendor "${settlement.vendorName}" has not added bank details yet.`
                });
            }
        }

        const updateData = { status };

        if (status === 'Paid') {
            updateData.paymentDate = new Date();
            if (transactionId) {
                updateData.transactionId = transactionId;
            }
        }

        const updatedSettlement = await prisma.settlement.update({
            where: { id },
            data: updateData
        });

        // Notify vendor when payment is confirmed
        if (status === 'Paid') {
            const { createNotification } = require('./notificationController');
            createNotification({
                userId: settlement.vendorId, role: 'VENDOR', type: 'PAYMENT_RECEIVED',
                title: 'Payment Received',
                message: `Payment of ₹${settlement.amount.toLocaleString('en-IN')} for settlement ${settlement.settlementNumber} has been processed.`,
                data: { settlementId: settlement.id }
            }).catch(() => {});
        }

        res.status(200).json({
            success: true,
            message: `Settlement marked as ${status}`,
            data: updatedSettlement
        });

    } catch (error) {
        console.error('Error updating settlement:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update settlement'
        });
    }
};

// Vendor: Get own settlements
const getVendorSettlements = async (req, res) => {
    try {
        const vendorId = req.user.id;

        // `order` is whitelisted, not included wholesale: the Order row holds the
        // customer's totals at M2C's marked-up selling price plus customer PII, and the
        // vendor is entitled to neither. Settlement money (amount/baseAmount/taxAmount)
        // is already the vendor's own, in INR.
        const settlements = await prisma.settlement.findMany({
            where: { vendorId },
            orderBy: { createdAt: 'desc' },
            include: {
                order: {
                    select: {
                        id: true,
                        orderId: true,
                        status: true,
                        orderDate: true,
                        createdAt: true,
                        invoiceNo: true,
                    },
                },
            },
        });

        const withLines = await attachSettlementLineItems(settlements);

        res.status(200).json({
            success: true,
            data: withLines
        });
    } catch (error) {
        console.error('Error fetching vendor settlements:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch vendor settlements'
        });
    }
};

// Admin: Set or update settlement due date
const updateSettlementDueDate = async (req, res) => {
    try {
        const { id } = req.params;
        const { dueDate } = req.body;

        if (!dueDate) {
            return res.status(400).json({ success: false, error: 'Due date is required' });
        }

        const settlement = await prisma.settlement.findUnique({ where: { id } });
        if (!settlement) {
            return res.status(404).json({ success: false, error: 'Settlement not found' });
        }

        if (settlement.status === 'Paid') {
            return res.status(400).json({ success: false, error: 'Cannot update due date — settlement is already paid' });
        }

        const updatedSettlement = await prisma.settlement.update({
            where: { id },
            data: { dueDate: new Date(dueDate) }
        });

        res.status(200).json({
            success: true,
            message: 'Due date updated successfully',
            data: updatedSettlement
        });
    } catch (error) {
        console.error('Error updating settlement due date:', error);
        res.status(500).json({ success: false, error: 'Failed to update due date' });
    }
};

module.exports = {
    getAllSettlements,
    getSettlementById,
    updateSettlementStatus,
    updateSettlementDueDate,
    getVendorSettlements
};
