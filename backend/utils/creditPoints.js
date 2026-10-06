const { prisma } = require('../config/database');

/**
 * Credit Points (loyalty rewards) helpers — mirrors utils/wallet.js.
 *
 * CreditPointsAccount holds the running points balance; CreditPointsTransaction is
 * the immutable ledger. EARN rows double as FIFO lots (`remaining` + `expiresAt`),
 * so redemption and expiry consume the oldest points first. All mutations run in a
 * transaction so balance and ledger never drift.
 *
 * Points are an INR-denominated tender: value = points × redeemValuePerPointInr.
 */

const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

// ── Settings (singleton) ─────────────────────────────────────────────────────
async function getSettings() {
    let s = await prisma.creditPointsSettings.findFirst();
    if (!s) s = await prisma.creditPointsSettings.create({ data: {} });
    return s;
}

/** Is the program active for this order currency/region? */
function isActiveForRegion(settings, currencyOrRegion) {
    if (!settings?.enabled) return false;
    // Maker-checker: unapproved settings changes don't take effect.
    if (settings.approvalStatus && settings.approvalStatus !== 'APPROVED') return false;
    const r = String(currencyOrRegion || '').toUpperCase();
    const region = r === 'USD' || r === 'US' ? 'US' : r === 'INR' || r === 'IN' ? 'IN' : null;
    if (settings.region === 'IN_ONLY') return region === 'IN';
    if (settings.region === 'COM_ONLY') return region === 'US';
    return true; // BOTH
}

/** Points earned for a given eligible INR amount, per the settings. Floored to whole points. */
function computeEarnedPoints(eligibleInr, settings) {
    if (!settings?.enabled) return 0;
    if (settings.approvalStatus && settings.approvalStatus !== 'APPROVED') return 0;
    const unit = Number(settings.earnUnitInr) || 0;
    const per = Number(settings.earnPointsPerUnit) || 0;
    if (unit <= 0 || per <= 0) return 0;
    if (Number(eligibleInr) < Number(settings.minOrderAmountToEarnInr || 0)) return 0;
    return Math.floor((Number(eligibleInr) / unit) * per);
}

// ── Account ──────────────────────────────────────────────────────────────────
async function getOrCreateAccount(customerId, tx = prisma) {
    let acct = await tx.creditPointsAccount.findUnique({ where: { customerId } });
    if (!acct) acct = await tx.creditPointsAccount.create({ data: { customerId, balance: 0 } });
    return acct;
}

async function getBalance(customerId) {
    const acct = await prisma.creditPointsAccount.findUnique({ where: { customerId } });
    return acct ? acct.balance : 0;
}

// ── Earn ─────────────────────────────────────────────────────────────────────
/**
 * Credit earned points as a new FIFO lot. Returns { account, transaction } or null
 * when nothing to credit. `expiresAt` is derived from settings when expiry is on.
 */
async function earnPoints({ customerId, points, source = 'ORDER_EARN', valueInr, description, refs = {}, actor = {}, expiresAt }) {
    const pts = Math.floor(Number(points) || 0);
    if (!customerId || pts <= 0) return null;

    return prisma.$transaction(async (tx) => {
        const acct = await getOrCreateAccount(customerId, tx);
        const balanceAfter = acct.balance + pts;
        const updated = await tx.creditPointsAccount.update({ where: { id: acct.id }, data: { balance: balanceAfter } });
        const transaction = await tx.creditPointsTransaction.create({
            data: {
                accountId: acct.id,
                customerId,
                type: 'EARN',
                points: pts,
                balanceAfter,
                source,
                valueInr: valueInr != null ? round2(valueInr) : null,
                remaining: pts,
                expiresAt: expiresAt || null,
                description: description || null,
                orderId: refs.orderId || null,
                orderCode: refs.orderCode || null,
                createdById: actor.id || null,
                createdByName: actor.name || null,
                createdByType: actor.type || 'system',
            },
        });
        return { account: updated, transaction };
    });
}

// Draw `points` down across the oldest live EARN lots (FIFO). Mutates lot.remaining.
async function consumeLots(db, customerId, points) {
    let toConsume = points;
    const now = new Date();
    const lots = await db.creditPointsTransaction.findMany({
        where: {
            customerId, type: 'EARN', remaining: { gt: 0 },
            OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
        orderBy: { createdAt: 'asc' },
    });
    for (const lot of lots) {
        if (toConsume <= 0) break;
        const take = Math.min(lot.remaining, toConsume);
        await db.creditPointsTransaction.update({ where: { id: lot.id }, data: { remaining: lot.remaining - take } });
        toConsume -= take;
    }
    return points - toConsume; // actually consumed
}

// ── Redeem ───────────────────────────────────────────────────────────────────
/**
 * Spend points (e.g. redeemed at checkout). Consumes FIFO lots + records a REDEEM
 * entry. Accepts an external `tx` so it commits atomically with order creation.
 * Throws POINTS_INSUFFICIENT when the balance can't cover it.
 */
async function redeemPoints({ customerId, points, source = 'ORDER_REDEMPTION', valueInr, description, refs = {}, actor = {} }, tx = null) {
    const pts = Math.floor(Number(points) || 0);
    if (!customerId || pts <= 0) throw new Error('redeemPoints: invalid customerId/points');

    const run = async (db) => {
        const acct = await getOrCreateAccount(customerId, db);
        if (acct.balance < pts) {
            throw Object.assign(new Error('Insufficient points balance'), { statusCode: 400, code: 'POINTS_INSUFFICIENT' });
        }
        await consumeLots(db, customerId, pts);
        const balanceAfter = acct.balance - pts;
        const updated = await db.creditPointsAccount.update({ where: { id: acct.id }, data: { balance: balanceAfter } });
        const transaction = await db.creditPointsTransaction.create({
            data: {
                accountId: acct.id, customerId, type: 'REDEEM', points: pts, balanceAfter, source,
                valueInr: valueInr != null ? round2(valueInr) : null,
                description: description || null,
                orderId: refs.orderId || null, orderCode: refs.orderCode || null,
                createdById: actor.id || null, createdByName: actor.name || null, createdByType: actor.type || 'customer',
            },
        });
        return { account: updated, transaction };
    };
    return tx ? run(tx) : prisma.$transaction(run);
}

// ── Reverse (cancel / return) ────────────────────────────────────────────────
/**
 * Undo an order's points movements:
 *   • refund points the customer REDEEMED on it (credit them back as a fresh lot), and
 *   • claw back points EARNED on it that are still unspent (consume the earned lot's
 *     remaining; already-spent earned points are not pursued into negative).
 * Idempotent-ish: pass the order's own pointsRedeemed/pointsEarned figures.
 */
async function reverseOrderPoints({ customerId, orderId, orderCode, redeemedPoints = 0, earnedPoints = 0, actor = {} }) {
    const redeem = Math.floor(Number(redeemedPoints) || 0);
    const earned = Math.floor(Number(earnedPoints) || 0);
    if (!customerId || (redeem <= 0 && earned <= 0)) return null;

    return prisma.$transaction(async (tx) => {
        const acct = await getOrCreateAccount(customerId, tx);
        let balance = acct.balance;
        const out = {};

        // 1) Refund redeemed points → new lot (so the customer regains them).
        if (redeem > 0) {
            const settings = await getSettings();
            const expiresAt = settings.expiryDays > 0 ? new Date(Date.now() + settings.expiryDays * 86400000) : null;
            balance += redeem;
            await tx.creditPointsTransaction.create({
                data: {
                    accountId: acct.id, customerId, type: 'EARN', points: redeem, balanceAfter: balance,
                    source: 'ORDER_REVERSAL', remaining: redeem, expiresAt,
                    description: `Refund of points redeemed on order ${orderCode || ''}`.trim(),
                    orderId: orderId || null, orderCode: orderCode || null,
                    createdById: actor.id || null, createdByName: actor.name || null, createdByType: actor.type || 'system',
                },
            });
            out.refunded = redeem;
        }

        // 2) Claw back earned points still unspent (consume this order's earn lots first).
        if (earned > 0) {
            const now = new Date();
            const lots = await tx.creditPointsTransaction.findMany({
                where: { customerId, type: 'EARN', source: 'ORDER_EARN', orderId: orderId || undefined, remaining: { gt: 0 } },
                orderBy: { createdAt: 'asc' },
            });
            let reclaim = Math.min(earned, lots.reduce((s, l) => s + l.remaining, 0), balance);
            const reclaimed = reclaim;
            for (const lot of lots) {
                if (reclaim <= 0) break;
                const take = Math.min(lot.remaining, reclaim);
                await tx.creditPointsTransaction.update({ where: { id: lot.id }, data: { remaining: lot.remaining - take } });
                reclaim -= take;
            }
            if (reclaimed > 0) {
                balance -= reclaimed;
                await tx.creditPointsTransaction.create({
                    data: {
                        accountId: acct.id, customerId, type: 'REVERSE', points: reclaimed, balanceAfter: balance,
                        source: 'ORDER_REVERSAL',
                        description: `Reversal of points earned on order ${orderCode || ''}`.trim(),
                        orderId: orderId || null, orderCode: orderCode || null,
                        createdById: actor.id || null, createdByName: actor.name || null, createdByType: actor.type || 'system',
                    },
                });
                out.reclaimed = reclaimed;
            }
        }

        await tx.creditPointsAccount.update({ where: { id: acct.id }, data: { balance } });
        return out;
    });
}

// ── Admin manual adjustment ──────────────────────────────────────────────────
async function adjustPoints({ customerId, points, direction, description, actor = {} }) {
    const pts = Math.floor(Number(points) || 0);
    if (!customerId || pts <= 0) throw new Error('adjustPoints: invalid customerId/points');
    if (direction === 'ADD') {
        const settings = await getSettings();
        const expiresAt = settings.expiryDays > 0 ? new Date(Date.now() + settings.expiryDays * 86400000) : null;
        return earnPoints({ customerId, points: pts, source: 'ADMIN_ADJUSTMENT', description, actor: { ...actor, type: 'admin' }, expiresAt });
    }
    // DEDUCT — clamp to balance, consume lots.
    return prisma.$transaction(async (tx) => {
        const acct = await getOrCreateAccount(customerId, tx);
        const take = Math.min(pts, acct.balance);
        if (take <= 0) return { account: acct, transaction: null };
        await consumeLots(tx, customerId, take);
        const balanceAfter = acct.balance - take;
        const updated = await tx.creditPointsAccount.update({ where: { id: acct.id }, data: { balance: balanceAfter } });
        const transaction = await tx.creditPointsTransaction.create({
            data: {
                accountId: acct.id, customerId, type: 'ADJUST', points: take, balanceAfter, source: 'ADMIN_ADJUSTMENT',
                description: description || null,
                createdById: actor.id || null, createdByName: actor.name || null, createdByType: 'admin',
            },
        });
        return { account: updated, transaction };
    });
}

// ── Expiry sweep ─────────────────────────────────────────────────────────────
/** Expire all lots past expiresAt with points remaining. Returns { expiredLots, expiredPoints }. */
async function expirePoints() {
    const now = new Date();
    const lots = await prisma.creditPointsTransaction.findMany({
        where: { type: 'EARN', remaining: { gt: 0 }, expiresAt: { not: null, lt: now } },
        orderBy: { createdAt: 'asc' },
    });
    let expiredPoints = 0;
    // Group by customer so each account updates once per customer.
    const byCustomer = new Map();
    for (const lot of lots) {
        if (!byCustomer.has(lot.customerId)) byCustomer.set(lot.customerId, []);
        byCustomer.get(lot.customerId).push(lot);
    }
    for (const [customerId, custLots] of byCustomer) {
        await prisma.$transaction(async (tx) => {
            const acct = await getOrCreateAccount(customerId, tx);
            let balance = acct.balance;
            for (const lot of custLots) {
                const amt = Math.min(lot.remaining, balance);
                await tx.creditPointsTransaction.update({ where: { id: lot.id }, data: { remaining: 0 } });
                if (amt > 0) {
                    balance -= amt;
                    expiredPoints += amt;
                    await tx.creditPointsTransaction.create({
                        data: {
                            accountId: acct.id, customerId, type: 'EXPIRE', points: amt, balanceAfter: balance,
                            source: 'EXPIRY', description: 'Points expired', createdByType: 'system',
                        },
                    });
                }
            }
            await tx.creditPointsAccount.update({ where: { id: acct.id }, data: { balance } });
        });
    }
    return { expiredLots: lots.length, expiredPoints };
}

// ── Summary (customer / admin views) ─────────────────────────────────────────
async function getSummary(customerId, { take = 50 } = {}) {
    const acct = await getOrCreateAccount(customerId);
    const transactions = await prisma.creditPointsTransaction.findMany({
        where: { customerId },
        orderBy: { createdAt: 'desc' },
        take,
    });
    // Next expiring lot (for a "X points expiring on <date>" nudge).
    const now = new Date();
    const nextExpiring = await prisma.creditPointsTransaction.findFirst({
        where: { customerId, type: 'EARN', remaining: { gt: 0 }, expiresAt: { not: null, gt: now } },
        orderBy: { expiresAt: 'asc' },
        select: { remaining: true, expiresAt: true },
    });
    return { balance: acct.balance, transactions, nextExpiring };
}

module.exports = {
    round2,
    getSettings,
    isActiveForRegion,
    computeEarnedPoints,
    getOrCreateAccount,
    getBalance,
    earnPoints,
    redeemPoints,
    reverseOrderPoints,
    adjustPoints,
    expirePoints,
    getSummary,
};
