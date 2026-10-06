const { prisma } = require('../config/database');
const creditPoints = require('../utils/creditPoints');

// Public-safe view of the settings (everything here is fine for customers to see,
// since it's what drives the earn/redeem UI).
function publicSettings(s) {
    if (!s) return { enabled: false };
    return {
        enabled: s.enabled,
        earnPointsPerUnit: s.earnPointsPerUnit,
        earnUnitInr: s.earnUnitInr,
        minOrderAmountToEarnInr: s.minOrderAmountToEarnInr,
        earnOn: s.earnOn,
        redeemValuePerPointInr: s.redeemValuePerPointInr,
        minPointsToRedeem: s.minPointsToRedeem,
        maxRedeemPercent: s.maxRedeemPercent,
        expiryDays: s.expiryDays,
        region: s.region,
    };
}

// ── Customer ─────────────────────────────────────────────────────────────────
// GET /api/credit-points/mine
const getMyPoints = async (req, res) => {
    try {
        const customerId = req.userId;
        const [summary, settings] = await Promise.all([
            creditPoints.getSummary(customerId, { take: 100 }),
            creditPoints.getSettings(),
        ]);
        res.json({ success: true, data: { ...summary, settings: publicSettings(settings) } });
    } catch (error) {
        console.error('getMyPoints error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch points' });
    }
};

// GET /api/credit-points/settings/public — lightweight settings for checkout.
const getPublicSettings = async (req, res) => {
    try {
        const settings = await creditPoints.getSettings();
        const balance = await creditPoints.getBalance(req.userId);
        res.json({ success: true, data: { settings: publicSettings(settings), balance } });
    } catch (error) {
        console.error('getPublicSettings error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch points settings' });
    }
};

// ── Admin: settings ──────────────────────────────────────────────────────────
// GET /api/credit-points/admin/settings
const getSettings = async (req, res) => {
    try {
        const settings = await creditPoints.getSettings();
        res.json({ success: true, data: settings });
    } catch (error) {
        console.error('getSettings error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch settings' });
    }
};

// PUT /api/credit-points/admin/settings
const updateSettings = async (req, res) => {
    try {
        const b = req.body || {};
        const num = (v) => (v === '' || v === null || v === undefined ? undefined : Number(v));
        const data = {};
        if (b.enabled !== undefined) data.enabled = !!b.enabled;
        if (num(b.earnPointsPerUnit) !== undefined) data.earnPointsPerUnit = Math.max(0, num(b.earnPointsPerUnit));
        if (num(b.earnUnitInr) !== undefined) data.earnUnitInr = Math.max(1, num(b.earnUnitInr));
        if (num(b.minOrderAmountToEarnInr) !== undefined) data.minOrderAmountToEarnInr = Math.max(0, num(b.minOrderAmountToEarnInr));
        if (b.earnOn !== undefined) data.earnOn = ['DELIVERED', 'PLACED'].includes(b.earnOn) ? b.earnOn : 'DELIVERED';
        if (num(b.redeemValuePerPointInr) !== undefined) data.redeemValuePerPointInr = Math.max(0, num(b.redeemValuePerPointInr));
        if (num(b.minPointsToRedeem) !== undefined) data.minPointsToRedeem = Math.max(0, Math.floor(num(b.minPointsToRedeem)));
        if (num(b.maxRedeemPercent) !== undefined) data.maxRedeemPercent = Math.min(100, Math.max(0, num(b.maxRedeemPercent)));
        if (num(b.expiryDays) !== undefined) data.expiryDays = Math.max(0, Math.floor(num(b.expiryDays)));
        if (b.region !== undefined) data.region = ['BOTH', 'IN_ONLY', 'COM_ONLY'].includes(b.region) ? b.region : 'BOTH';
        data.updatedBy = req.userId || null;

        // Maker-checker: a settings change is held PENDING and the program does not
        // run on the new settings until an authorised person approves it.
        Object.assign(data, require('../utils/approvals').submissionData({ id: req.userId, name: req.user?.name || req.user?.email }));

        const existing = await creditPoints.getSettings();
        const settings = await prisma.creditPointsSettings.update({ where: { id: existing.id }, data });

        // Ping the authorised approver(s) that the settings change needs approval.
        require('../utils/approvals').notifyApprovers({ module: 'credit_points', entityLabel: 'Program settings', submittedByName: req.user?.name || req.user?.email });

        res.json({ success: true, data: settings, message: 'Credit points settings updated — awaiting approval before it takes effect.' });
    } catch (error) {
        console.error('updateSettings error:', error);
        res.status(500).json({ success: false, error: 'Failed to update settings' });
    }
};

// ── Admin: accounts ──────────────────────────────────────────────────────────
// GET /api/credit-points/admin?page&limit&search
const getAllAccounts = async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(100, parseInt(req.query.limit) || 20);
        const search = String(req.query.search || '').trim().toLowerCase();

        const accounts = await prisma.creditPointsAccount.findMany({ orderBy: { balance: 'desc' } });
        const ids = accounts.map((a) => a.customerId);
        const users = await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, email: true } });
        const byId = new Map(users.map((u) => [u.id, u]));

        let rows = accounts.map((a) => ({
            customerId: a.customerId,
            balance: a.balance,
            name: byId.get(a.customerId)?.name || '—',
            email: byId.get(a.customerId)?.email || '—',
            updatedAt: a.updatedAt,
        }));
        if (search) rows = rows.filter((r) => r.name.toLowerCase().includes(search) || r.email.toLowerCase().includes(search));

        const total = rows.length;
        const totalPoints = rows.reduce((s, r) => s + (r.balance || 0), 0);
        const start = (page - 1) * limit;
        res.json({
            success: true,
            data: {
                accounts: rows.slice(start, start + limit),
                totalPoints,
                pagination: { currentPage: page, totalPages: Math.ceil(total / limit) || 1, totalItems: total, limit },
            },
        });
    } catch (error) {
        console.error('getAllAccounts error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch points accounts' });
    }
};

// GET /api/credit-points/admin/:customerId
const getAccountByCustomer = async (req, res) => {
    try {
        const { customerId } = req.params;
        const [summary, user] = await Promise.all([
            creditPoints.getSummary(customerId, { take: 200 }),
            prisma.user.findUnique({ where: { id: customerId }, select: { id: true, name: true, email: true } }),
        ]);
        res.json({ success: true, data: { ...summary, customer: user } });
    } catch (error) {
        console.error('getAccountByCustomer error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch points account' });
    }
};

// POST /api/credit-points/admin/:customerId/adjust  { direction: 'ADD'|'DEDUCT', points, reason }
const adjustAccount = async (req, res) => {
    try {
        const { customerId } = req.params;
        const { direction, points, reason } = req.body || {};
        if (!['ADD', 'DEDUCT'].includes(direction)) return res.status(400).json({ success: false, error: 'direction must be ADD or DEDUCT' });
        const pts = Math.floor(Number(points) || 0);
        if (pts <= 0) return res.status(400).json({ success: false, error: 'points must be a positive number' });
        if (!String(reason || '').trim()) return res.status(400).json({ success: false, error: 'A reason is required' });

        const actor = { id: req.userId || null, name: req.user?.name || 'Admin', type: 'admin' };
        const result = await creditPoints.adjustPoints({ customerId, points: pts, direction, description: String(reason).trim(), actor });
        res.json({ success: true, data: result, message: `Points ${direction === 'ADD' ? 'added' : 'deducted'}` });
    } catch (error) {
        console.error('adjustAccount error:', error);
        res.status(error.statusCode || 500).json({ success: false, error: error.message || 'Failed to adjust points' });
    }
};

module.exports = {
    getMyPoints,
    getPublicSettings,
    getSettings,
    updateSettings,
    getAllAccounts,
    getAccountByCustomer,
    adjustAccount,
};
