const { prisma } = require('../config/database');
const { uploadDataUriIfBase64 } = require('../config/cloudinary');
const { issueRefundAmount, fetchPaymentMethodLabel } = require('../utils/refund');
const { generateReturnId } = require('../utils/returnIdGenerator');
const { createNotification, createNotificationForRole } = require('./notificationController');
const { sendTemplatedEmail } = require('../utils/emailTemplateRenderer');

// ── Return reasons ──────────────────────────────────────────────────────────
// requiresEvidence drives the mandatory ≥2-photo rule in Step 2.
const REASONS = {
    damaged: { label: 'Damaged or defective', requiresEvidence: true },
    wrong_item: { label: 'Wrong item received', requiresEvidence: true },
    not_as_described: { label: 'Not as described', requiresEvidence: true },
    size_fit: { label: 'Size or fit issue', requiresEvidence: false },
    quality: { label: 'Quality not satisfactory', requiresEvidence: true },
    other: { label: 'Other', requiresEvidence: false },
};

const STATUS = {
    PENDING: 'Pending Review',
    UNDER_REVIEW: 'Under Review',
    APPROVED: 'Approved',
    REJECTED: 'Rejected',
    REFUND_PROCESSING: 'Refund Processing',
    REFUND_COMPLETED: 'Refund Completed',
    REPLACEMENT_APPROVED: 'Replacement Approved',
    REPLACEMENT_PENDING: 'Replacement Pending',
    REPLACEMENT_COMPLETED: 'Replacement Completed',
    CANCELLED: 'Cancelled',
};

const UPI_RE = /^[a-zA-Z0-9._-]{2,256}@[a-zA-Z][a-zA-Z0-9]{1,64}$/;
const publicSite = () => process.env.FRONTEND_URL || 'http://localhost:3000';
// decidedById is an @db.ObjectId column — only persist a genuine 24-hex id.
const asObjectId = (v) => (typeof v === 'string' && /^[a-f\d]{24}$/i.test(v) ? v : null);

// Append an entry to a return's status timeline (stored as a JSON array).
const withHistory = (existing, status, note, by) => {
    const arr = Array.isArray(existing) ? existing : [];
    return [...arr, { status, note: note || '', at: new Date().toISOString(), by: by || 'system' }];
};

// Fire-and-forget customer email for a status change (never blocks the response).
const emailStatus = (rec, statusTitle, statusMessage) => {
    if (!rec?.customerEmail) return;
    sendTemplatedEmail({
        key: 'return_status_update',
        to: rec.customerEmail,
        data: {
            greetingName: rec.customerName || 'Customer',
            returnId: rec.returnId,
            productName: rec.productName,
            orderCode: rec.orderCode,
            statusTitle,
            statusMessage,
            trackUrl: `${publicSite()}/profile?tab=returns`,
        },
    }).catch(() => {});
};

// ════════════════════════════════════════════════════════════════════════════
// CUSTOMER
// ════════════════════════════════════════════════════════════════════════════

// POST /api/returns  — create a return request for a delivered order item.
const createReturnRequest = async (req, res) => {
    try {
        const userId = req.userId;
        const {
            orderId, orderItemId, reason, reasonNote,
            evidenceImages = [], resolution, refundMethod, upiId, confirmed,
        } = req.body;

        if (!orderId) return res.status(400).json({ success: false, message: 'Order is required' });
        if (!REASONS[reason]) return res.status(400).json({ success: false, message: 'Please select a valid return reason' });
        if (!['REFUND', 'REPLACEMENT'].includes(resolution)) {
            return res.status(400).json({ success: false, message: 'Please choose refund or replacement' });
        }

        // Resolve the order (accept Mongo id or human ORD- code) + ownership.
        const isObjectId = /^[a-f\d]{24}$/i.test(orderId);
        const order = await prisma.order.findFirst({
            where: { ...(isObjectId ? { id: orderId } : { orderId }), customerId: userId },
            include: { items: true },
        });
        if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
        if (order.status !== 'DELIVERED') {
            return res.status(400).json({ success: false, message: 'Returns can only be requested for delivered orders' });
        }

        // Which item is being returned.
        let item = null;
        if (orderItemId) item = order.items.find((i) => i.id === orderItemId);
        else if (order.items.length === 1) item = order.items[0];
        if (!item) return res.status(400).json({ success: false, message: 'Please select the item you want to return' });

        // Block a second active return for the same item.
        const TERMINAL = [STATUS.REJECTED, STATUS.CANCELLED, STATUS.REFUND_COMPLETED, STATUS.REPLACEMENT_COMPLETED];
        const existingActive = await prisma.returnRequest.findFirst({
            where: { orderId: order.id, orderItemId: item.id },
            orderBy: { createdAt: 'desc' },
        });
        if (existingActive && !TERMINAL.includes(existingActive.status)) {
            return res.status(409).json({ success: false, message: 'A return request for this item is already in progress.' });
        }

        // Evidence rules.
        const requiresEvidence = REASONS[reason].requiresEvidence;
        const imgs = Array.isArray(evidenceImages) ? evidenceImages.filter(Boolean) : [];
        if (requiresEvidence && imgs.length < 2) {
            return res.status(400).json({ success: false, message: 'Please upload at least 2 clear photos for this reason.' });
        }

        // Refund preference validation.
        let cleanUpi = null;
        if (resolution === 'REFUND') {
            if (!['ORIGINAL', 'UPI'].includes(refundMethod)) {
                return res.status(400).json({ success: false, message: 'Please choose a refund method' });
            }
            if (refundMethod === 'UPI') {
                cleanUpi = String(upiId || '').trim();
                if (!UPI_RE.test(cleanUpi)) {
                    return res.status(400).json({ success: false, message: 'Please enter a valid UPI ID (e.g. name@bank)' });
                }
            }
        }

        // Upload evidence (base64 data URIs → Cloudinary), cap at 2.
        const uploaded = [];
        for (const img of imgs.slice(0, 2)) {
            try { uploaded.push(await uploadDataUriIfBase64(img, { folder: 'returns' })); }
            catch (e) { console.warn('[return] evidence upload failed:', e.message); }
        }
        if (requiresEvidence && uploaded.length < 2) {
            return res.status(400).json({ success: false, message: 'We could not save your photos. Please try again.' });
        }

        const itemAmount = Number(item.totalPrice) || 0;
        const itemAmountINR = item.totalPriceINR != null ? Number(item.totalPriceINR) : null;
        const returnId = await generateReturnId();

        const record = await prisma.returnRequest.create({
            data: {
                returnId,
                orderId: order.id,
                orderCode: order.orderId,
                orderItemId: item.id,
                customerId: userId,
                customerName: order.customerName,
                customerEmail: order.customerEmail,
                customerPhone: order.customerPhone,
                productId: item.productId || null,
                productName: item.productName,
                productImage: item.productImage || null,
                variantId: item.variantId || null,
                size: item.size || null,
                color: item.color || null,
                quantity: item.quantity || 1,
                currency: order.currency || 'INR',
                itemAmount,
                itemAmountINR,
                reason,
                reasonNote: reasonNote ? String(reasonNote).trim() : null,
                evidenceImages: uploaded,
                resolution,
                refundMethod: resolution === 'REFUND' ? refundMethod : null,
                upiId: cleanUpi,
                refundAmount: resolution === 'REFUND' ? itemAmount : null,
                replacementValue: resolution === 'REPLACEMENT' ? itemAmount : null,
                status: STATUS.PENDING,
                statusHistory: withHistory([], STATUS.PENDING, 'Return request submitted', 'customer'),
                customerConfirmed: !!confirmed,
            },
        });

        // Notify admins in-app.
        createNotificationForRole({
            role: 'ADMIN', type: 'RETURN_REQUESTED',
            title: 'New Return Request',
            message: `${order.customerName || 'A customer'} requested a ${resolution === 'REFUND' ? 'refund' : 'replacement'} for ${item.productName}.`,
            data: { returnRequestId: record.id, returnId },
        }).catch(() => {});

        // Confirmation email to the customer.
        if (record.customerEmail) {
            sendTemplatedEmail({
                key: 'return_requested',
                to: record.customerEmail,
                data: {
                    greetingName: record.customerName || 'Customer',
                    returnId: record.returnId,
                    productName: record.productName,
                    orderCode: record.orderCode,
                    reasonLabel: REASONS[reason].label,
                    resolutionLabel: resolution === 'REFUND' ? 'Refund' : 'Replacement',
                    trackUrl: `${publicSite()}/profile?tab=returns`,
                },
            }).catch(() => {});
        }

        res.status(201).json({ success: true, message: 'Return request submitted', data: record });
    } catch (error) {
        console.error('Error creating return request:', error);
        res.status(500).json({ success: false, message: 'Failed to submit return request' });
    }
};

// GET /api/returns/mine
const getMyReturns = async (req, res) => {
    try {
        const returns = await prisma.returnRequest.findMany({
            where: { customerId: req.userId },
            orderBy: { createdAt: 'desc' },
        });
        res.json({ success: true, data: returns });
    } catch (error) {
        console.error('Error fetching returns:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch returns' });
    }
};

// GET /api/returns/mine/:id  (id = ObjectId or returnId)
const getMyReturnById = async (req, res) => {
    try {
        const { id } = req.params;
        const isObjectId = /^[a-f\d]{24}$/i.test(id);
        const rec = await prisma.returnRequest.findFirst({
            where: { ...(isObjectId ? { id } : { returnId: id }), customerId: req.userId },
        });
        if (!rec) return res.status(404).json({ success: false, message: 'Return not found' });
        res.json({ success: true, data: rec });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch return' });
    }
};

// POST /api/returns/mine/:id/cancel  — customer withdraws a request still under review.
const cancelMyReturn = async (req, res) => {
    try {
        const { id } = req.params;
        const rec = await prisma.returnRequest.findFirst({ where: { id, customerId: req.userId } });
        if (!rec) return res.status(404).json({ success: false, message: 'Return not found' });
        if (![STATUS.PENDING, STATUS.UNDER_REVIEW].includes(rec.status)) {
            return res.status(400).json({ success: false, message: 'This request can no longer be cancelled.' });
        }
        const updated = await prisma.returnRequest.update({
            where: { id: rec.id },
            data: {
                status: STATUS.CANCELLED,
                statusHistory: withHistory(rec.statusHistory, STATUS.CANCELLED, 'Cancelled by customer', 'customer'),
            },
        });
        res.json({ success: true, message: 'Return request cancelled', data: updated });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to cancel return' });
    }
};

// ════════════════════════════════════════════════════════════════════════════
// ADMIN
// ════════════════════════════════════════════════════════════════════════════

// GET /api/returns/admin  — list with filter/search/pagination.
const getAllReturns = async (req, res) => {
    try {
        const { status, resolution, search, page = 1, limit = 50 } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const where = {};
        if (status && status !== 'all') where.status = status;
        if (resolution && resolution !== 'all') where.resolution = resolution;
        if (search) {
            where.OR = [
                { returnId: { contains: search, mode: 'insensitive' } },
                { orderCode: { contains: search, mode: 'insensitive' } },
                { customerName: { contains: search, mode: 'insensitive' } },
                { customerEmail: { contains: search, mode: 'insensitive' } },
                { productName: { contains: search, mode: 'insensitive' } },
            ];
        }

        const [returns, total] = await Promise.all([
            prisma.returnRequest.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: parseInt(limit) }),
            prisma.returnRequest.count({ where }),
        ]);

        // Per-customer history count for the list (how many returns each has raised).
        const ids = [...new Set(returns.map((r) => r.customerId))];
        const counts = {};
        await Promise.all(ids.map(async (cid) => {
            counts[cid] = await prisma.returnRequest.count({ where: { customerId: cid } });
        }));
        const data = returns.map((r) => ({ ...r, customerReturnCount: counts[r.customerId] || 1 }));

        res.json({
            success: true,
            data,
            pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) },
        });
    } catch (error) {
        console.error('Error fetching returns (admin):', error);
        res.status(500).json({ success: false, message: 'Failed to fetch returns' });
    }
};

// GET /api/returns/admin/:id  — full detail + order + customer history.
const getReturnByIdAdmin = async (req, res) => {
    try {
        const { id } = req.params;
        const isObjectId = /^[a-f\d]{24}$/i.test(id);
        const rec = await prisma.returnRequest.findFirst({
            where: isObjectId ? { id } : { returnId: id },
        });
        if (!rec) return res.status(404).json({ success: false, message: 'Return not found' });

        const [order, historyCount, customerHistory] = await Promise.all([
            prisma.order.findUnique({ where: { id: rec.orderId }, include: { items: true } }).catch(() => null),
            prisma.returnRequest.count({ where: { customerId: rec.customerId } }),
            prisma.returnRequest.findMany({
                where: { customerId: rec.customerId, NOT: { id: rec.id } },
                orderBy: { createdAt: 'desc' }, take: 10,
                select: { id: true, returnId: true, productName: true, resolution: true, status: true, createdAt: true },
            }),
        ]);

        res.json({ success: true, data: { ...rec, order, customerReturnCount: historyCount, customerHistory } });
    } catch (error) {
        console.error('Error fetching return detail (admin):', error);
        res.status(500).json({ success: false, message: 'Failed to fetch return' });
    }
};

// POST /api/returns/admin/:id/decision  — approve | reject | under_review.
const decideReturn = async (req, res) => {
    try {
        const { id } = req.params;
        const { action, rejectionReason, adminNote } = req.body;
        const adminName = req.user?.name || req.user?.email || 'Admin';

        const rec = await prisma.returnRequest.findUnique({ where: { id } });
        if (!rec) return res.status(404).json({ success: false, message: 'Return not found' });

        const DECIDABLE = [STATUS.PENDING, STATUS.UNDER_REVIEW];

        // ── Mark under review ──
        if (action === 'under_review') {
            if (rec.status !== STATUS.PENDING) {
                return res.status(400).json({ success: false, message: 'Only pending requests can be marked under review.' });
            }
            const updated = await prisma.returnRequest.update({
                where: { id },
                data: {
                    status: STATUS.UNDER_REVIEW,
                    adminNote: adminNote || rec.adminNote,
                    statusHistory: withHistory(rec.statusHistory, STATUS.UNDER_REVIEW, 'Marked under review', adminName),
                },
            });
            notifyCustomer(rec, 'RETURN_UNDER_REVIEW', 'Return under review', `Your return ${rec.returnId} is being reviewed.`);
            emailStatus(rec, 'Your return is under review', `We're reviewing your return request ${rec.returnId} for ${rec.productName}.`);
            return res.json({ success: true, message: 'Marked under review', data: updated });
        }

        // ── Reject ──
        if (action === 'reject') {
            if (!DECIDABLE.includes(rec.status)) {
                return res.status(400).json({ success: false, message: `Cannot reject a request that is ${rec.status}.` });
            }
            if (!rejectionReason || !String(rejectionReason).trim()) {
                return res.status(400).json({ success: false, message: 'A rejection reason is required.' });
            }
            const updated = await prisma.returnRequest.update({
                where: { id },
                data: {
                    status: STATUS.REJECTED,
                    rejectionReason: String(rejectionReason).trim(),
                    adminNote: adminNote || rec.adminNote,
                    decidedByName: adminName,
                    decidedById: asObjectId(req.user?.id),
                    decidedAt: new Date(),
                    statusHistory: withHistory(rec.statusHistory, STATUS.REJECTED, `Rejected: ${String(rejectionReason).trim()}`, adminName),
                },
            });
            notifyCustomer(rec, 'RETURN_REJECTED', 'Return rejected', `Your return ${rec.returnId} was not approved.`);
            emailStatus(rec, 'Your return request was not approved', `After review, we were unable to approve return ${rec.returnId}. Reason: ${String(rejectionReason).trim()}`);
            return res.json({ success: true, message: 'Return rejected', data: updated });
        }

        // ── Approve ──
        if (action === 'approve') {
            if (!DECIDABLE.includes(rec.status)) {
                return res.status(400).json({ success: false, message: `Cannot approve a request that is ${rec.status}.` });
            }

            if (rec.resolution === 'REFUND') {
                // Approve → kick off the gateway refund → Refund Processing.
                const order = await prisma.order.findUnique({ where: { id: rec.orderId } }).catch(() => null);
                let refundStatus = 'MANUAL', refundId = null, paymentMethodLabel = rec.paymentMethodLabel || null;
                if (order) {
                    const amt = rec.itemAmountINR != null ? rec.itemAmountINR : rec.itemAmount;
                    // Refund to original instrument only when the customer chose ORIGINAL.
                    // For a UPI-payout choice the gateway API differs; leave to manual for now.
                    const r = await issueRefundAmount(order, amt);
                    refundStatus = r.refundStatus; refundId = r.refundId;
                    // Best-effort: capture the real instrument so the UI can show it.
                    if (rec.refundMethod !== 'UPI') {
                        const label = await fetchPaymentMethodLabel(order);
                        if (label) paymentMethodLabel = label;
                    }
                }
                let history = withHistory(rec.statusHistory, STATUS.APPROVED, 'Return approved', adminName);
                history = withHistory(history, STATUS.REFUND_PROCESSING,
                    refundStatus === 'MANUAL' ? 'Refund to be processed manually' : 'Refund initiated with payment provider', adminName);
                const updated = await prisma.returnRequest.update({
                    where: { id },
                    data: {
                        status: STATUS.REFUND_PROCESSING,
                        adminNote: adminNote || rec.adminNote,
                        refundId, refundStatus, paymentMethodLabel,
                        paymentReference: refundId || null,
                        decidedByName: adminName, decidedById: asObjectId(req.user?.id), decidedAt: new Date(),
                        statusHistory: history,
                    },
                });
                notifyCustomer(rec, 'RETURN_APPROVED', 'Return approved', `Your refund for ${rec.returnId} is being processed.`);
                emailStatus(rec, 'Your refund is being processed', `Good news — return ${rec.returnId} was approved and your refund of ${rec.currency === 'INR' ? '₹' : '$'}${(rec.refundAmount || rec.itemAmount).toFixed(2)} is being processed to your ${rec.refundMethod === 'UPI' ? 'UPI' : 'original payment method'}.`);
                return res.json({ success: true, message: 'Return approved, refund processing', data: updated });
            }

            // REPLACEMENT: record an entitlement in the customer's account.
            const entitlement = await prisma.replacementEntitlement.create({
                data: {
                    customerId: rec.customerId,
                    returnRequestId: rec.id,
                    returnCode: rec.returnId,
                    productName: rec.productName,
                    productImage: rec.productImage || null,
                    value: rec.replacementValue || rec.itemAmount,
                    currency: rec.currency,
                    status: 'Available',
                },
            });
            let history = withHistory(rec.statusHistory, STATUS.REPLACEMENT_APPROVED, 'Replacement approved', adminName);
            history = withHistory(history, STATUS.REPLACEMENT_PENDING, 'Replacement entitlement added to your M2C account', adminName);
            const updated = await prisma.returnRequest.update({
                where: { id },
                data: {
                    status: STATUS.REPLACEMENT_PENDING,
                    adminNote: adminNote || rec.adminNote,
                    replacementEntitlementId: entitlement.id,
                    decidedByName: adminName, decidedById: asObjectId(req.user?.id), decidedAt: new Date(),
                    statusHistory: history,
                },
            });
            notifyCustomer(rec, 'RETURN_APPROVED', 'Replacement approved', `Your replacement for ${rec.returnId} was approved.`);
            emailStatus(rec, 'Your replacement was approved', `Return ${rec.returnId} was approved. A replacement entitlement worth ${rec.currency === 'INR' ? '₹' : '$'}${(rec.replacementValue || rec.itemAmount).toFixed(2)} has been added to your M2C account and can be used on a future eligible order.`);
            return res.json({ success: true, message: 'Replacement approved', data: updated });
        }

        return res.status(400).json({ success: false, message: 'Unknown action' });
    } catch (error) {
        console.error('Error deciding return:', error);
        res.status(500).json({ success: false, message: 'Failed to update return' });
    }
};

// POST /api/returns/admin/:id/status  — advance refund/replacement completion.
const advanceReturnStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, note } = req.body;
        const adminName = req.user?.name || req.user?.email || 'Admin';

        const rec = await prisma.returnRequest.findUnique({ where: { id } });
        if (!rec) return res.status(404).json({ success: false, message: 'Return not found' });

        // Allowed forward transitions.
        const ALLOWED = {
            [STATUS.REFUND_PROCESSING]: [STATUS.REFUND_COMPLETED],
            [STATUS.REPLACEMENT_PENDING]: [STATUS.REPLACEMENT_COMPLETED],
        };
        if (!ALLOWED[rec.status] || !ALLOWED[rec.status].includes(status)) {
            return res.status(400).json({ success: false, message: `Cannot move from ${rec.status} to ${status}.` });
        }

        const data = {
            status,
            statusHistory: withHistory(rec.statusHistory, status, note || '', adminName),
        };
        if (status === STATUS.REFUND_COMPLETED) data.refundStatus = 'PROCESSED';

        const updated = await prisma.returnRequest.update({ where: { id }, data });

        // Mark the linked entitlement redeemed when a replacement completes.
        if (status === STATUS.REPLACEMENT_COMPLETED && rec.replacementEntitlementId) {
            await prisma.replacementEntitlement.update({
                where: { id: rec.replacementEntitlementId },
                data: { status: 'Redeemed' },
            }).catch(() => {});
        }

        if (status === STATUS.REFUND_COMPLETED) {
            notifyCustomer(rec, 'REFUND_COMPLETED', 'Refund completed', `Your refund for ${rec.returnId} is complete.`);
            emailStatus(rec, 'Your refund is complete', `Your refund of ${rec.currency === 'INR' ? '₹' : '$'}${(rec.refundAmount || rec.itemAmount).toFixed(2)} for return ${rec.returnId} has been completed.`);
        } else if (status === STATUS.REPLACEMENT_COMPLETED) {
            notifyCustomer(rec, 'REPLACEMENT_COMPLETED', 'Replacement completed', `Your replacement for ${rec.returnId} is complete.`);
            emailStatus(rec, 'Your replacement is complete', `Your replacement for return ${rec.returnId} has been completed.`);
        }

        res.json({ success: true, message: 'Status updated', data: updated });
    } catch (error) {
        console.error('Error advancing return status:', error);
        res.status(500).json({ success: false, message: 'Failed to update status' });
    }
};

// Small helper — in-app customer notification (fire and forget).
function notifyCustomer(rec, type, title, message) {
    createNotification({
        userId: rec.customerId, role: 'USER', type, title, message,
        data: { returnRequestId: rec.id, returnId: rec.returnId },
    }).catch(() => {});
}

/**
 * Called by the Razorpay webhook (paymentController.handleRazorpayWebhook) when a
 * refund settles or fails at the gateway. Matches the ReturnRequest by refundId
 * and advances "Refund Processing" → "Refund Completed" automatically, so no admin
 * has to mark it by hand. Idempotent — a repeated webhook is a no-op.
 *
 * @param {string} refundId       Razorpay refund id (rfnd_…)
 * @param {'processed'|'failed'} gatewayStatus
 */
async function handleRefundWebhook(refundId, gatewayStatus) {
    if (!refundId) return;
    const rec = await prisma.returnRequest.findFirst({ where: { refundId } });
    if (!rec) return;

    if (gatewayStatus === 'processed') {
        if (rec.status === STATUS.REFUND_COMPLETED) return; // already done
        await prisma.returnRequest.update({
            where: { id: rec.id },
            data: {
                status: STATUS.REFUND_COMPLETED,
                refundStatus: 'PROCESSED',
                statusHistory: withHistory(rec.statusHistory, STATUS.REFUND_COMPLETED, 'Refund settled by payment provider', 'system'),
            },
        });
        notifyCustomer(rec, 'REFUND_COMPLETED', 'Refund completed', `Your refund for ${rec.returnId} is complete.`);
        emailStatus(rec, 'Your refund is complete', `Your refund of ${rec.currency === 'INR' ? '₹' : '$'}${(rec.refundAmount || rec.itemAmount).toFixed(2)} for return ${rec.returnId} has been completed and sent to your original payment method.`);
    } else if (gatewayStatus === 'failed') {
        await prisma.returnRequest.update({
            where: { id: rec.id },
            data: {
                refundStatus: 'FAILED',
                statusHistory: withHistory(rec.statusHistory, rec.status, 'Refund failed at payment provider — needs attention', 'system'),
            },
        });
    }
}

module.exports = {
    REASONS,
    createReturnRequest,
    getMyReturns,
    getMyReturnById,
    cancelMyReturn,
    getAllReturns,
    getReturnByIdAdmin,
    decideReturn,
    advanceReturnStatus,
    handleRefundWebhook,
};
