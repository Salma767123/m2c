const { prisma } = require('../config/database');
const { uploadDataUriIfBase64 } = require('../config/cloudinary');
const { issueRefundAmount, fetchPaymentMethodLabel } = require('../utils/refund');
const { restoreStockForOrder } = require('../utils/restoreStock');
const { creditWallet } = require('../utils/wallet');
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

const publicSite = () => process.env.FRONTEND_URL || 'http://localhost:3000';
// decidedById is an @db.ObjectId column — only persist a genuine 24-hex id.
const asObjectId = (v) => (typeof v === 'string' && /^[a-f\d]{24}$/i.test(v) ? v : null);

// Damaged/defective items are written off by default (not returned to sellable
// stock); everything else defaults to being restocked. Admin can override.
const defaultRestock = (reason) => !['damaged', 'quality'].includes(reason);

/**
 * Dispose of the returned physical item when a return is approved:
 *  • restock=true  → put units back into sellable inventory (+ stock history)
 *  • restock=false → log them in the DamagedStock ledger (full audit; not sellable)
 * Returns { restocked, dispositionNote, historyNote } for the caller to persist.
 */
async function applyDisposition(rec, { restock, note, adminName, adminId }) {
    const doRestock = typeof restock === 'boolean' ? restock : defaultRestock(rec.reason);
    const cleanNote = note ? String(note).trim().slice(0, 500) : null;

    if (doRestock) {
        try {
            const pseudoOrder = {
                orderId: rec.orderCode,
                items: [{ productId: rec.productId, variantId: rec.variantId, quantity: rec.quantity }],
            };
            const rows = await prisma.$transaction((tx) => restoreStockForOrder(tx, pseudoOrder, {
                reason: `Return restocked: ${rec.returnId}`,
                changedBy: asObjectId(adminId), changedByType: 'admin', changedByName: adminName,
            }));
            if (rows.length) await prisma.stockChangeHistory.createMany({ data: rows }).catch(() => {});
        } catch (e) {
            console.warn('[return] restock failed:', e?.message || e);
        }
        return { restocked: true, dispositionNote: cleanNote, historyNote: `Item restocked to inventory${cleanNote ? ` — ${cleanNote}` : ''}` };
    }

    // Not restocked → permanent Damaged Items ledger entry (the tracked audit).
    try {
        await prisma.damagedStock.create({
            data: {
                productId: rec.productId || null,
                productName: rec.productName,
                productImage: rec.productImage || null,
                variantId: rec.variantId || null,
                size: rec.size || null,
                color: rec.color || null,
                quantity: rec.quantity,
                reason: REASONS[rec.reason]?.label || rec.reason,
                note: cleanNote,
                sourceType: 'return',
                returnRequestId: rec.id,
                returnCode: rec.returnId,
                orderId: rec.orderId,
                orderCode: rec.orderCode,
                customerName: rec.customerName,
                recordedById: asObjectId(adminId),
                recordedByName: adminName,
            },
        });
    } catch (e) {
        console.warn('[return] damaged record failed:', e?.message || e);
    }
    return { restocked: false, dispositionNote: cleanNote, historyNote: `Item marked damaged — not restocked${cleanNote ? ` — ${cleanNote}` : ''}` };
}

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
            evidenceImages = [], resolution, refundMethod, replacementMethod, confirmed,
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

        // Resolution preference validation.
        //  REFUND      → 'ORIGINAL' (back to bank/source) | 'WALLET' (instant store credit)
        //  REPLACEMENT → 'CREDIT'  (wallet store credit)   | 'ITEM'   (ship with next order)
        if (resolution === 'REFUND') {
            if (!['ORIGINAL', 'WALLET'].includes(refundMethod)) {
                return res.status(400).json({ success: false, message: 'Please choose how to receive your refund' });
            }
        } else if (resolution === 'REPLACEMENT') {
            if (!['CREDIT', 'ITEM'].includes(replacementMethod)) {
                return res.status(400).json({ success: false, message: 'Please choose how to receive your replacement' });
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
                replacementMethod: resolution === 'REPLACEMENT' ? replacementMethod : null,
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
        const { action, rejectionReason, adminNote, restock, dispositionNote } = req.body;
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

            // Dispose of the physical item: restock to inventory, or log as damaged.
            const disp = await applyDisposition(rec, {
                restock, note: dispositionNote, adminName, adminId: req.user?.id,
            });

            // Wallet credit amount is always in INR (wallet base currency).
            const creditInr = rec.itemAmountINR != null ? rec.itemAmountINR : rec.itemAmount;
            const walletActor = { id: asObjectId(req.user?.id), name: adminName, type: 'admin' };
            const walletRefs = { orderId: rec.orderId, orderCode: rec.orderCode, returnRequestId: rec.id, returnCode: rec.returnId };
            const baseDecision = { adminNote: adminNote || rec.adminNote, restocked: disp.restocked, dispositionNote: disp.dispositionNote, decidedByName: adminName, decidedById: asObjectId(req.user?.id), decidedAt: new Date() };

            // ── REFUND ──
            if (rec.resolution === 'REFUND') {
                // WALLET → instant store credit, no gateway wait.
                if (rec.refundMethod === 'WALLET') {
                    await creditWallet({ customerId: rec.customerId, amount: creditInr, source: 'REFUND', description: `Refund for return ${rec.returnId}`, refs: walletRefs, actor: walletActor }).catch((e) => console.warn('[return] wallet credit failed:', e?.message));
                    let history = withHistory(rec.statusHistory, STATUS.APPROVED, 'Return approved', adminName);
                    history = withHistory(history, STATUS.APPROVED, disp.historyNote, adminName);
                    history = withHistory(history, STATUS.REFUND_COMPLETED, `Refunded ₹${creditInr.toFixed(2)} to wallet`, adminName);
                    const updated = await prisma.returnRequest.update({
                        where: { id },
                        data: { ...baseDecision, status: STATUS.REFUND_COMPLETED, refundStatus: 'WALLET', refundAmount: rec.refundAmount ?? rec.itemAmount, statusHistory: history },
                    });
                    notifyCustomer(rec, 'REFUND_COMPLETED', 'Refund added to wallet', `₹${creditInr.toFixed(2)} was added to your wallet for ${rec.returnId}.`);
                    emailStatus(rec, 'Your refund was added to your wallet', `We've added ₹${creditInr.toFixed(2)} to your M2C wallet for return ${rec.returnId}. You can use it on your next purchase.`);
                    return res.json({ success: true, message: 'Refund credited to wallet', data: updated });
                }

                // ORIGINAL (bank) → gateway refund → Refund Processing.
                const order = await prisma.order.findUnique({ where: { id: rec.orderId } }).catch(() => null);
                let refundStatus = 'MANUAL', refundId = null, paymentMethodLabel = rec.paymentMethodLabel || null;
                if (order) {
                    const r = await issueRefundAmount(order, creditInr);
                    refundStatus = r.refundStatus; refundId = r.refundId;
                    const label = await fetchPaymentMethodLabel(order);
                    if (label) paymentMethodLabel = label;
                }
                let history = withHistory(rec.statusHistory, STATUS.APPROVED, 'Return approved', adminName);
                history = withHistory(history, STATUS.APPROVED, disp.historyNote, adminName);
                history = withHistory(history, STATUS.REFUND_PROCESSING,
                    refundStatus === 'MANUAL' ? 'Refund to be processed manually' : 'Refund initiated with payment provider', adminName);
                const updated = await prisma.returnRequest.update({
                    where: { id },
                    data: { ...baseDecision, status: STATUS.REFUND_PROCESSING, refundId, refundStatus, paymentMethodLabel, paymentReference: refundId || null, statusHistory: history },
                });
                notifyCustomer(rec, 'RETURN_APPROVED', 'Return approved', `Your refund for ${rec.returnId} is being processed.`);
                emailStatus(rec, 'Your refund is being processed', `Good news — return ${rec.returnId} was approved and your refund of ${rec.currency === 'INR' ? '₹' : '$'}${(rec.refundAmount || rec.itemAmount).toFixed(2)} is being processed to your original payment method.`);
                return res.json({ success: true, message: 'Return approved, refund processing', data: updated });
            }

            // ── REPLACEMENT ──
            // CREDIT → put the item value into the wallet as store credit.
            if (rec.replacementMethod === 'CREDIT') {
                await creditWallet({ customerId: rec.customerId, amount: creditInr, source: 'REPLACEMENT', description: `Replacement credit for return ${rec.returnId}`, refs: walletRefs, actor: walletActor }).catch((e) => console.warn('[return] wallet credit failed:', e?.message));
                let history = withHistory(rec.statusHistory, STATUS.REPLACEMENT_APPROVED, 'Replacement approved', adminName);
                history = withHistory(history, STATUS.REPLACEMENT_APPROVED, disp.historyNote, adminName);
                history = withHistory(history, STATUS.REPLACEMENT_COMPLETED, `Replacement credited ₹${creditInr.toFixed(2)} to wallet`, adminName);
                const updated = await prisma.returnRequest.update({
                    where: { id },
                    data: { ...baseDecision, status: STATUS.REPLACEMENT_COMPLETED, statusHistory: history },
                });
                notifyCustomer(rec, 'REPLACEMENT_COMPLETED', 'Replacement added to wallet', `₹${creditInr.toFixed(2)} was added to your wallet for ${rec.returnId}.`);
                emailStatus(rec, 'Your replacement credit was added to your wallet', `We've added ₹${creditInr.toFixed(2)} to your M2C wallet for return ${rec.returnId}. Use it on your next purchase.`);
                return res.json({ success: true, message: 'Replacement credited to wallet', data: updated });
            }

            // ITEM → record an entitlement to ship with the customer's next order.
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
            history = withHistory(history, STATUS.REPLACEMENT_APPROVED, disp.historyNote, adminName);
            history = withHistory(history, STATUS.REPLACEMENT_PENDING, 'Replacement item entitlement added — ships with your next order', adminName);
            const updated = await prisma.returnRequest.update({
                where: { id },
                data: { ...baseDecision, status: STATUS.REPLACEMENT_PENDING, replacementEntitlementId: entitlement.id, statusHistory: history },
            });
            notifyCustomer(rec, 'RETURN_APPROVED', 'Replacement approved', `Your replacement for ${rec.returnId} was approved.`);
            emailStatus(rec, 'Your replacement was approved', `Return ${rec.returnId} was approved. Your replacement item will ship with your next eligible order per M2C replacement rules.`);
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

// GET /api/returns/admin/damaged — the Damaged Items ledger (admin).
const getDamagedStock = async (req, res) => {
    try {
        const { search, page = 1, limit = 50 } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const where = {};
        if (search) {
            where.OR = [
                { productName: { contains: search, mode: 'insensitive' } },
                { returnCode: { contains: search, mode: 'insensitive' } },
                { orderCode: { contains: search, mode: 'insensitive' } },
                { sku: { contains: search, mode: 'insensitive' } },
                { customerName: { contains: search, mode: 'insensitive' } },
            ];
        }
        const [rows, total, totalUnitsAgg] = await Promise.all([
            prisma.damagedStock.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: parseInt(limit) }),
            prisma.damagedStock.count({ where }),
            prisma.damagedStock.findMany({ where, select: { quantity: true } }),
        ]);
        const totalUnits = totalUnitsAgg.reduce((s, r) => s + (r.quantity || 0), 0);
        res.json({
            success: true,
            data: rows,
            totalUnits,
            pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) },
        });
    } catch (error) {
        console.error('Error fetching damaged stock:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch damaged items' });
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
    getDamagedStock,
    handleRefundWebhook,
};
