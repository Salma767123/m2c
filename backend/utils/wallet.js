const { prisma } = require('../config/database');

/**
 * Customer store-credit wallet helpers. Balance is always in INR.
 *
 * The Wallet row holds the running balance; WalletTransaction is the immutable
 * ledger (every movement, with balance-after + full attribution). Credit/debit
 * run in a transaction so balance and ledger never drift.
 */

const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

async function getOrCreateWallet(customerId, tx = prisma) {
    let wallet = await tx.wallet.findUnique({ where: { customerId } });
    if (!wallet) {
        wallet = await tx.wallet.create({ data: { customerId, balance: 0, currency: 'INR' } });
    }
    return wallet;
}

/**
 * Add credit to a customer's wallet (INR). Returns { wallet, transaction }.
 * @param {object} p
 * @param {string} p.customerId
 * @param {number} p.amount        INR, positive
 * @param {string} p.source        REFUND | REPLACEMENT | ORDER_REVERSAL | ADMIN_ADJUSTMENT
 * @param {string} [p.description]
 * @param {object} [p.refs]        { orderId, orderCode, returnRequestId, returnCode }
 * @param {object} [p.actor]       { id, name, type }
 */
async function creditWallet({ customerId, amount, source, description, refs = {}, actor = {} }) {
    const amt = round2(amount);
    if (!customerId || !(amt > 0)) throw new Error('creditWallet: invalid customerId/amount');

    return prisma.$transaction(async (tx) => {
        const wallet = await getOrCreateWallet(customerId, tx);
        const balanceAfter = round2(wallet.balance + amt);
        const updated = await tx.wallet.update({ where: { id: wallet.id }, data: { balance: balanceAfter } });
        const transaction = await tx.walletTransaction.create({
            data: {
                walletId: wallet.id,
                customerId,
                type: 'CREDIT',
                amount: amt,
                balanceAfter,
                source,
                description: description || null,
                orderId: refs.orderId || null,
                orderCode: refs.orderCode || null,
                returnRequestId: refs.returnRequestId || null,
                returnCode: refs.returnCode || null,
                createdById: actor.id || null,
                createdByName: actor.name || null,
                createdByType: actor.type || 'system',
            },
        });
        return { wallet: updated, transaction };
    });
}

/**
 * Debit a customer's wallet (INR) — e.g. redeemed at checkout. Throws if the
 * balance is insufficient. Returns { wallet, transaction }.
 */
async function debitWallet({ customerId, amount, source, description, refs = {}, actor = {} }, tx = null) {
    const amt = round2(amount);
    if (!customerId || !(amt > 0)) throw new Error('debitWallet: invalid customerId/amount');

    const run = async (db) => {
        const wallet = await getOrCreateWallet(customerId, db);
        if (wallet.balance + 1e-6 < amt) {
            throw Object.assign(new Error('Insufficient wallet balance'), { statusCode: 400, code: 'WALLET_INSUFFICIENT' });
        }
        const balanceAfter = round2(wallet.balance - amt);
        const updated = await db.wallet.update({ where: { id: wallet.id }, data: { balance: balanceAfter } });
        const transaction = await db.walletTransaction.create({
            data: {
                walletId: wallet.id,
                customerId,
                type: 'DEBIT',
                amount: amt,
                balanceAfter,
                source,
                description: description || null,
                orderId: refs.orderId || null,
                orderCode: refs.orderCode || null,
                returnRequestId: refs.returnRequestId || null,
                returnCode: refs.returnCode || null,
                createdById: actor.id || null,
                createdByName: actor.name || null,
                createdByType: actor.type || 'system',
            },
        });
        return { wallet: updated, transaction };
    };

    // Allow running inside an existing transaction (e.g. order creation) so the
    // debit commits atomically with the order; otherwise open our own.
    return tx ? run(tx) : prisma.$transaction(run);
}

async function getBalance(customerId) {
    const wallet = await prisma.wallet.findUnique({ where: { customerId } });
    return wallet ? round2(wallet.balance) : 0;
}

async function getWalletSummary(customerId, { take = 50 } = {}) {
    const wallet = await getOrCreateWallet(customerId);
    const transactions = await prisma.walletTransaction.findMany({
        where: { customerId },
        orderBy: { createdAt: 'desc' },
        take,
    });
    return { balance: round2(wallet.balance), currency: wallet.currency, transactions };
}

module.exports = { getOrCreateWallet, creditWallet, debitWallet, getBalance, getWalletSummary, round2 };
