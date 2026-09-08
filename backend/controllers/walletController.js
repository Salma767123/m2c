const { prisma } = require('../config/database');
const { getWalletSummary, creditWallet, debitWallet, getOrCreateWallet } = require('../utils/wallet');

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

module.exports = { getMyWallet, getAllWallets, getWalletByCustomer, adjustWallet };
