const { prisma } = require('../config/database');
const { getWalletSummary, creditWallet, debitWallet, getOrCreateWallet, round2 } = require('../utils/wallet');

const UPI_RE = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;
const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const MIN_WITHDRAWAL = 1; // INR

// Human withdrawal id: WD-YYYY-NNNNNN (best-effort sequence + collision retry).
async function generateWithdrawalId() {
    const year = new Date().getFullYear();
    for (let attempt = 0; attempt < 6; attempt++) {
        let candidate;
        if (attempt === 0) {
            const count = await prisma.walletWithdrawal.count({ where: { withdrawalId: { startsWith: `WD-${year}-` } } });
            candidate = `WD-${year}-${String(count + 1).padStart(6, '0')}`;
        } else {
            candidate = `WD-${year}-${String(Math.floor(Math.random() * 1e6)).padStart(6, '0')}`;
        }
        const exists = await prisma.walletWithdrawal.findUnique({ where: { withdrawalId: candidate } });
        if (!exists) return candidate;
    }
    return `WD-${year}-${Date.now().toString().slice(-6)}`;
}

// ── Customer ────────────────────────────────────────────────────────────────

// GET /api/wallet/mine
const getMyWallet = async (req, res) => {
    try {
        const summary = await getWalletSummary(req.userId, { take: 100 });
        res.json({ success: true, data: summary });
    } catch (error) {
        console.error('Error fetching wallet:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch wallet' });
    }
};

// POST /api/wallet/withdrawals — customer withdraws store credit to bank/UPI.
// Self-service: the wallet is debited immediately and a payout record is created
// (no admin approval). Admin/finance later marks it paid.
const requestWithdrawal = async (req, res) => {
    try {
        const userId = req.userId;
        const method = req.body?.method === 'BANK' ? 'BANK' : 'UPI';
        const amount = round2(Number(req.body?.amount));
        const note = req.body?.note ? String(req.body.note).trim().slice(0, 300) : null;

        if (!(amount >= MIN_WITHDRAWAL)) {
            return res.status(400).json({ success: false, message: `Enter an amount of at least ₹${MIN_WITHDRAWAL}.` });
        }

        // Validate payout destination.
        let payout = {};
        if (method === 'UPI') {
            const upiId = String(req.body?.upiId || '').trim();
            if (!UPI_RE.test(upiId)) return res.status(400).json({ success: false, message: 'Enter a valid UPI ID (e.g. name@bank).' });
            payout = { upiId };
        } else {
            const accountName = String(req.body?.accountName || '').trim();
            const accountNumber = String(req.body?.accountNumber || '').trim();
            const ifsc = String(req.body?.ifsc || '').trim().toUpperCase();
            const bankName = String(req.body?.bankName || '').trim() || null;
            if (!accountName) return res.status(400).json({ success: false, message: 'Enter the account holder name.' });
            if (!/^\d{6,18}$/.test(accountNumber)) return res.status(400).json({ success: false, message: 'Enter a valid account number.' });
            if (!IFSC_RE.test(ifsc)) return res.status(400).json({ success: false, message: 'Enter a valid IFSC code.' });
            payout = { accountName, accountNumber, ifsc, bankName };
        }

        const withdrawalId = await generateWithdrawalId();
        const customerName = req.user?.name || null;

        // Debit + create the payout record atomically. debitWallet throws
        // WALLET_INSUFFICIENT (400) if the balance can't cover it.
        const result = await prisma.$transaction(async (tx) => {
            const { transaction } = await debitWallet({
                customerId: userId, amount, source: 'WITHDRAWAL',
                description: `Withdrawal ${withdrawalId} (${method === 'UPI' ? payout.upiId : `A/C ••••${payout.accountNumber.slice(-4)}`})`,
                actor: { id: userId, name: customerName, type: 'customer' },
            }, tx);
            const wd = await tx.walletWithdrawal.create({
                data: {
                    withdrawalId, customerId: userId, amount, currency: 'INR',
                    method, ...payout, note,
                    status: 'Processing', walletTxnId: transaction.id,
                },
            });
            // Back-reference the withdrawal on the ledger entry.
            await tx.walletTransaction.update({ where: { id: transaction.id }, data: { description: `Withdrawal ${withdrawalId}` } });
            return wd;
        });

        // ── Automated payout via RazorpayX (when configured) ──────────────────
        // If RazorpayX is set up, initiate the payout right away and reflect its
        // status. If it isn't configured, the withdrawal stays "Processing" for
        // manual admin payout (the existing flow).
        let withdrawal = result;
        let message = 'Withdrawal requested. It will reach your account within 3–5 business days.';
        const { getPayoutConfig, createWithdrawalPayout, mapPayoutStatus } = require('../utils/razorpayxPayout');
        if (await getPayoutConfig()) {
            const payoutRes = await createWithdrawalPayout({
                withdrawal: { ...result, ...payout }, // payout holds the raw (unmasked) account fields
                customer: { name: customerName, email: req.user?.email },
            });
            if (payoutRes.created) {
                const mapped = mapPayoutStatus(payoutRes.status);
                const data = { payoutId: payoutRes.payoutId, payoutMode: payoutRes.mode, payoutStatus: payoutRes.status, autoPayout: true, status: mapped };
                if (mapped === 'Failed') {
                    // Gateway rejected it outright — return the money to the wallet.
                    data.failureReason = `Payout ${payoutRes.status}`;
                    try {
                        const rev = await creditWallet({ customerId: userId, amount, source: 'WITHDRAWAL_REVERSAL', description: `Withdrawal ${withdrawalId} failed — amount returned`, actor: { id: userId, name: customerName, type: 'system' } });
                        data.reversalTxnId = rev.transaction.id;
                    } catch (e) { console.warn('[withdrawal] reversal failed:', e?.message); }
                }
                withdrawal = await prisma.walletWithdrawal.update({ where: { id: result.id }, data });
                message = mapped === 'Completed' ? 'Withdrawal paid to your account.'
                    : mapped === 'Failed' ? 'We could not process the payout — the amount has been returned to your wallet.'
                    : 'Withdrawal initiated — it will reach your account shortly.';
            } else {
                // No payout was created (config/auth/validation error) → refund the wallet.
                try {
                    const rev = await creditWallet({ customerId: userId, amount, source: 'WITHDRAWAL_REVERSAL', description: `Withdrawal ${withdrawalId} could not be initiated — amount returned`, actor: { id: userId, name: customerName, type: 'system' } });
                    withdrawal = await prisma.walletWithdrawal.update({ where: { id: result.id }, data: { status: 'Failed', failureReason: payoutRes.error || 'Payout could not be initiated', reversalTxnId: rev.transaction.id } });
                } catch (e) { console.warn('[withdrawal] reversal failed:', e?.message); }
                return res.status(502).json({ success: false, message: 'Could not process your withdrawal right now — the amount is back in your wallet. Please try again later.' });
            }
        }

        res.status(201).json({ success: true, message, data: maskWithdrawal(withdrawal) });
    } catch (error) {
        if (error?.code === 'WALLET_INSUFFICIENT') {
            return res.status(400).json({ success: false, message: 'Your wallet balance is not enough for this withdrawal.' });
        }
        console.error('Error requesting withdrawal:', error);
        res.status(500).json({ success: false, message: 'Failed to request withdrawal' });
    }
};

// GET /api/wallet/withdrawals/mine
const getMyWithdrawals = async (req, res) => {
    try {
        const rows = await prisma.walletWithdrawal.findMany({ where: { customerId: req.userId }, orderBy: { createdAt: 'desc' } });
        res.json({ success: true, data: rows.map(maskWithdrawal) });
    } catch (error) {
        console.error('Error fetching withdrawals:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch withdrawals' });
    }
};

// Never return a full account number to the client — mask to last 4.
function maskWithdrawal(w) {
    return { ...w, accountNumber: w.accountNumber ? `••••${w.accountNumber.slice(-4)}` : null };
}

// ── Admin ───────────────────────────────────────────────────────────────────

// GET /api/wallet/admin — wallets with a balance, joined to the customer.
const getAllWallets = async (req, res) => {
    try {
        const { search, page = 1, limit = 50 } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [wallets, total, sumRows] = await Promise.all([
            prisma.wallet.findMany({ orderBy: { updatedAt: 'desc' }, skip, take: parseInt(limit) }),
            prisma.wallet.count(),
            prisma.wallet.findMany({ select: { balance: true } }),
        ]);

        // Join customer info (name/email) — orders link by scalar customerId.
        const ids = wallets.map((w) => w.customerId);
        const users = ids.length
            ? await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, email: true } })
            : [];
        const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

        let data = wallets.map((w) => ({
            ...w,
            customerName: userMap[w.customerId]?.name || '—',
            customerEmail: userMap[w.customerId]?.email || '',
        }));

        // Search is applied over the joined customer fields (best-effort, in-JS).
        if (search) {
            const q = String(search).toLowerCase();
            data = data.filter((w) =>
                w.customerName.toLowerCase().includes(q) || w.customerEmail.toLowerCase().includes(q));
        }

        const totalBalance = sumRows.reduce((s, w) => s + (w.balance || 0), 0);

        res.json({
            success: true,
            data,
            totalBalance: Math.round(totalBalance * 100) / 100,
            pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) },
        });
    } catch (error) {
        console.error('Error fetching wallets:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch wallets' });
    }
};

// GET /api/wallet/admin/:customerId
const getWalletByCustomer = async (req, res) => {
    try {
        const { customerId } = req.params;
        const [summary, user] = await Promise.all([
            getWalletSummary(customerId, { take: 200 }),
            prisma.user.findUnique({ where: { id: customerId }, select: { name: true, email: true, phoneNumber: true } }),
        ]);
        res.json({ success: true, data: { ...summary, customer: user } });
    } catch (error) {
        console.error('Error fetching customer wallet:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch wallet' });
    }
};

// POST /api/wallet/admin/:customerId/adjust — manual credit/debit with a reason.
const adjustWallet = async (req, res) => {
    try {
        const { customerId } = req.params;
        const { type, amount, reason } = req.body;
        const amt = Number(amount);
        if (!['CREDIT', 'DEBIT'].includes(type)) return res.status(400).json({ success: false, message: 'type must be CREDIT or DEBIT' });
        if (!(amt > 0)) return res.status(400).json({ success: false, message: 'Amount must be greater than zero' });
        if (!reason || !String(reason).trim()) return res.status(400).json({ success: false, message: 'A reason is required' });

        const actor = { id: req.user?.id, name: req.user?.name || req.user?.email || 'Admin', type: 'admin' };
        const args = {
            customerId, amount: amt, source: 'ADMIN_ADJUSTMENT',
            description: String(reason).trim(), actor,
        };
        const result = type === 'CREDIT' ? await creditWallet(args) : await debitWallet(args);
        res.json({ success: true, message: `Wallet ${type === 'CREDIT' ? 'credited' : 'debited'} successfully`, data: result.wallet });
    } catch (error) {
        if (error?.code === 'WALLET_INSUFFICIENT') {
            return res.status(400).json({ success: false, message: 'Insufficient wallet balance for this debit.' });
        }
        console.error('Error adjusting wallet:', error);
        res.status(500).json({ success: false, message: 'Failed to adjust wallet' });
    }
};

// GET /api/wallet/admin/withdrawals — payout queue (admin/finance fulfilment).
const getAllWithdrawals = async (req, res) => {
    try {
        const { status, search, page = 1, limit = 50 } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const where = {};
        if (status && status !== 'all') where.status = status;
        if (search) {
            where.OR = [
                { withdrawalId: { contains: search, mode: 'insensitive' } },
                { upiId: { contains: search, mode: 'insensitive' } },
                { accountName: { contains: search, mode: 'insensitive' } },
            ];
        }
        const [rows, total] = await Promise.all([
            prisma.walletWithdrawal.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: parseInt(limit) }),
            prisma.walletWithdrawal.count({ where }),
        ]);
        // Join customer name/email.
        const ids = [...new Set(rows.map((r) => r.customerId))];
        const users = ids.length ? await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, email: true } }) : [];
        const uMap = Object.fromEntries(users.map((u) => [u.id, u]));
        const data = rows.map((r) => ({ ...r, customerName: uMap[r.customerId]?.name || '—', customerEmail: uMap[r.customerId]?.email || '' }));
        const pendingTotal = rows.filter((r) => r.status === 'Processing').reduce((s, r) => s + (r.amount || 0), 0);
        res.json({
            success: true, data,
            pendingTotal: Math.round(pendingTotal * 100) / 100,
            pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) },
        });
    } catch (error) {
        console.error('Error fetching withdrawals (admin):', error);
        res.status(500).json({ success: false, message: 'Failed to fetch withdrawals' });
    }
};

// POST /api/wallet/admin/withdrawals/:id/status — mark a payout Completed or Failed.
// This is fulfilment, not approval: the amount was already debited on request. A
// Failed payout credits the amount back to the customer's wallet.
const updateWithdrawalStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, note } = req.body;
        if (!['Completed', 'Failed'].includes(status)) {
            return res.status(400).json({ success: false, message: 'status must be Completed or Failed' });
        }
        const wd = await prisma.walletWithdrawal.findUnique({ where: { id } });
        if (!wd) return res.status(404).json({ success: false, message: 'Withdrawal not found' });
        if (wd.status !== 'Processing') {
            return res.status(400).json({ success: false, message: `This withdrawal is already ${wd.status}.` });
        }

        const adminName = req.user?.name || req.user?.email || 'Admin';
        const data = {
            status,
            note: note ? String(note).trim().slice(0, 300) : wd.note,
            processedById: /^[a-f\d]{24}$/i.test(req.user?.id || '') ? req.user.id : null,
            processedByName: adminName,
            processedAt: new Date(),
        };

        if (status === 'Failed') {
            // Payout couldn't be made — return the money to the customer's wallet.
            data.failureReason = note ? String(note).trim().slice(0, 300) : 'Payout failed';
            try {
                const { transaction } = await creditWallet({
                    customerId: wd.customerId, amount: wd.amount, source: 'WITHDRAWAL_REVERSAL',
                    description: `Withdrawal ${wd.withdrawalId} failed — amount returned`,
                    actor: { id: data.processedById, name: adminName, type: 'admin' },
                });
                data.reversalTxnId = transaction.id;
            } catch (e) { console.warn('[withdrawal] reversal credit failed:', e?.message); }
        }

        const updated = await prisma.walletWithdrawal.update({ where: { id }, data });

        // Notify the customer of the outcome (best-effort).
        try {
            const { createNotification } = require('./notificationController');
            createNotification({
                userId: wd.customerId, role: 'USER', type: status === 'Completed' ? 'WITHDRAWAL_COMPLETED' : 'WITHDRAWAL_FAILED',
                title: status === 'Completed' ? 'Withdrawal paid' : 'Withdrawal failed',
                message: status === 'Completed'
                    ? `₹${wd.amount.toFixed(2)} withdrawal ${wd.withdrawalId} has been paid to your account.`
                    : `Withdrawal ${wd.withdrawalId} could not be processed — ₹${wd.amount.toFixed(2)} was returned to your wallet.`,
                data: { withdrawalId: wd.withdrawalId },
            }).catch(() => {});
        } catch { /* best-effort */ }

        res.json({ success: true, message: `Withdrawal marked ${status.toLowerCase()}`, data: maskWithdrawal(updated) });
    } catch (error) {
        console.error('Error updating withdrawal:', error);
        res.status(500).json({ success: false, message: 'Failed to update withdrawal' });
    }
};

/**
 * Called by the Razorpay webhook when a RazorpayX payout changes state. Advances
 * the matching withdrawal: processed → Completed; failed/reversed → Failed +
 * return the amount to the wallet. Idempotent — a repeated event is a no-op.
 * @param {string} payoutId  pout_… id
 * @param {string} gatewayStatus  raw payout status
 */
async function handlePayoutWebhook(payoutId, gatewayStatus) {
    if (!payoutId) return;
    const wd = await prisma.walletWithdrawal.findFirst({ where: { payoutId } });
    if (!wd) return;

    const { mapPayoutStatus } = require('../utils/razorpayxPayout');
    const mapped = mapPayoutStatus(gatewayStatus);
    if (wd.status !== 'Processing') { // already resolved
        // Keep the raw gateway status fresh but don't double-process money.
        if (wd.payoutStatus !== gatewayStatus) {
            await prisma.walletWithdrawal.update({ where: { id: wd.id }, data: { payoutStatus: gatewayStatus } }).catch(() => {});
        }
        return;
    }
    if (mapped === 'Processing') {
        await prisma.walletWithdrawal.update({ where: { id: wd.id }, data: { payoutStatus: gatewayStatus } }).catch(() => {});
        return;
    }

    const data = { status: mapped, payoutStatus: gatewayStatus, processedAt: new Date(), processedByName: 'RazorpayX' };
    if (mapped === 'Failed') {
        data.failureReason = `Payout ${gatewayStatus}`;
        try {
            const rev = await creditWallet({
                customerId: wd.customerId, amount: wd.amount, source: 'WITHDRAWAL_REVERSAL',
                description: `Withdrawal ${wd.withdrawalId} ${gatewayStatus} — amount returned`,
                actor: { type: 'system', name: 'RazorpayX' },
            });
            data.reversalTxnId = rev.transaction.id;
        } catch (e) { console.warn('[payout webhook] reversal failed:', e?.message); }
    }
    await prisma.walletWithdrawal.update({ where: { id: wd.id }, data });

    try {
        const { createNotification } = require('./notificationController');
        createNotification({
            userId: wd.customerId, role: 'USER',
            type: mapped === 'Completed' ? 'WITHDRAWAL_COMPLETED' : 'WITHDRAWAL_FAILED',
            title: mapped === 'Completed' ? 'Withdrawal paid' : 'Withdrawal failed',
            message: mapped === 'Completed'
                ? `₹${wd.amount.toFixed(2)} withdrawal ${wd.withdrawalId} has been paid to your account.`
                : `Withdrawal ${wd.withdrawalId} could not be processed — ₹${wd.amount.toFixed(2)} was returned to your wallet.`,
            data: { withdrawalId: wd.withdrawalId },
        }).catch(() => {});
    } catch { /* best-effort */ }
}

module.exports = { getMyWallet, requestWithdrawal, getMyWithdrawals, getAllWallets, getWalletByCustomer, adjustWallet, getAllWithdrawals, updateWithdrawalStatus, handlePayoutWebhook };
