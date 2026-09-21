const { prisma } = require('../config/database');

/**
 * RazorpayX automated payouts for wallet withdrawals.
 *
 * Uses the RazorpayX REST API (Contacts → Fund Accounts → Payouts) with Basic
 * auth from the same Razorpay key id/secret stored in PaymentSettings, plus the
 * RazorpayX source account number (razorpayxAccountNumber). The standard `razorpay`
 * npm SDK does NOT cover RazorpayX, so we call the API directly.
 *
 * Requires the account to have RazorpayX activated and the keys to carry payout
 * access. When not configured, callers fall back to manual admin payout.
 */

const RZPX_BASE = 'https://api.razorpay.com/v1';

async function getPayoutConfig() {
    const s = await prisma.paymentSettings.findFirst({
        select: { razorpayKeyId: true, razorpayKeySecret: true, razorpayxAccountNumber: true },
    });
    if (!s?.razorpayKeyId || !s?.razorpayKeySecret || !s?.razorpayxAccountNumber) return null;
    return s;
}

const authHeader = (s) => 'Basic ' + Buffer.from(`${s.razorpayKeyId}:${s.razorpayKeySecret}`).toString('base64');

async function rzpxPost(path, body, s, idempotencyKey) {
    const headers = { 'Content-Type': 'application/json', Authorization: authHeader(s) };
    if (idempotencyKey) headers['X-Payout-Idempotency'] = idempotencyKey;
    const resp = await fetch(`${RZPX_BASE}${path}`, { method: 'POST', headers, body: JSON.stringify(body) });
    const json = await resp.json().catch(() => ({}));
    if (!resp.ok) {
        const msg = json?.error?.description || `RazorpayX ${path} failed (${resp.status})`;
        const err = new Error(msg);
        err.rzpx = json?.error || null;
        err.httpStatus = resp.status;
        throw err;
    }
    return json;
}

// Narration must be ≤30 chars, alphanumerics + spaces only.
const cleanNarration = (s) => String(s || 'M2C Wallet Payout').replace(/[^a-zA-Z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 30) || 'M2C Wallet Payout';

/**
 * Create a RazorpayX payout for a withdrawal.
 * @returns {Promise<{ created: boolean, payoutId?: string, status?: string, mode?: string, error?: string }>}
 *   created=false means NO payout was created (safe for the caller to reverse the
 *   wallet debit). created=true means a payout exists — track it via `status`.
 */
async function createWithdrawalPayout({ withdrawal, customer }) {
    const s = await getPayoutConfig();
    if (!s) return { created: false, error: 'RazorpayX not configured' };

    try {
        // 1) Contact
        const contact = await rzpxPost('/contacts', {
            name: (customer?.name || 'M2C Customer').slice(0, 50),
            email: customer?.email || undefined,
            type: 'customer',
            reference_id: `cust_${withdrawal.customerId}`.slice(0, 40),
        }, s);

        // 2) Fund account (UPI vpa or bank account)
        const faBody = withdrawal.method === 'UPI'
            ? { contact_id: contact.id, account_type: 'vpa', vpa: { address: withdrawal.upiId } }
            : {
                contact_id: contact.id, account_type: 'bank_account',
                bank_account: { name: withdrawal.accountName, ifsc: withdrawal.ifsc, account_number: withdrawal.accountNumber },
            };
        const fundAccount = await rzpxPost('/fund_accounts', faBody, s);

        // 3) Payout (amount in paise). IMPS for bank, UPI for vpa.
        const mode = withdrawal.method === 'UPI' ? 'UPI' : 'IMPS';
        const payout = await rzpxPost('/payouts', {
            account_number: s.razorpayxAccountNumber,
            fund_account_id: fundAccount.id,
            amount: Math.round(Number(withdrawal.amount) * 100),
            currency: 'INR',
            mode,
            purpose: 'refund',
            queue_if_low_balance: true,
            reference_id: withdrawal.withdrawalId.slice(0, 40),
            narration: cleanNarration(`M2C ${withdrawal.withdrawalId}`),
        }, s, withdrawal.withdrawalId); // idempotency key → no double payout on retry

        return { created: true, payoutId: payout.id, status: payout.status, mode };
    } catch (e) {
        // A 4xx before the payout was created (bad config, invalid account, auth) →
        // nothing was sent, safe to reverse. Network/5xx are ambiguous, but no payout
        // id was returned, so we still treat it as not-created and let the caller
        // reverse; a stray payout would surface via webhook/manual reconciliation.
        console.error('[razorpayx] payout failed:', e?.message || e);
        return { created: false, error: e?.message || 'Payout failed' };
    }
}

// Map a RazorpayX payout status to our withdrawal status.
//   queued|pending|scheduled|processing|created → Processing
//   processed                                   → Completed
//   reversed|failed|cancelled|rejected          → Failed
function mapPayoutStatus(status) {
    const s = String(status || '').toLowerCase();
    if (s === 'processed') return 'Completed';
    if (['reversed', 'failed', 'cancelled', 'rejected'].includes(s)) return 'Failed';
    return 'Processing';
}

module.exports = { getPayoutConfig, createWithdrawalPayout, mapPayoutStatus };
