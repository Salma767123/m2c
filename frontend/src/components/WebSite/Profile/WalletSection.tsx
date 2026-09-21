'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Wallet, ArrowDownLeft, ArrowUpRight, Loader2, Info, ArrowUpFromLine, X, Smartphone, Landmark, Check } from 'lucide-react';
import { formatPrice } from '@/lib/currency';
import { showSuccessToast, showErrorToast } from '@/lib/toast-utils';
import {
  walletService, WALLET_SOURCE_LABEL, WITHDRAWAL_STATUS_STYLE,
  type WalletSummary, type WalletWithdrawal,
} from '@/services/walletService';

const inr = (n: number) => formatPrice(n || 0, 'INR');
const fmtDateTime = (d?: string) => d
  ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })
  : '';
const UPI_RE = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;
const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/;

export default function WalletSection() {
  const [data, setData] = useState<WalletSummary | null>(null);
  const [withdrawals, setWithdrawals] = useState<WalletWithdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWithdraw, setShowWithdraw] = useState(false);

  const load = async () => {
    try {
      const [w, wd] = await Promise.all([walletService.getMyWallet(), walletService.getMyWithdrawals()]);
      setData(w.data);
      setWithdrawals(wd.data || []);
    } catch {
      setData({ balance: 0, currency: 'INR', transactions: [] });
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  if (loading) {
    return <div className="grid place-items-center py-16 text-slate-400"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  const balance = data?.balance || 0;
  const txns = data?.transactions || [];

  return (
    <div>
      <div className="mb-5 flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-full bg-[#e01a1b]/10 text-[#e01a1b]">
          <Wallet className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-lg font-bold text-slate-900">My Wallet</h2>
          <p className="text-[13px] text-slate-500">Store credit from refunds &amp; replacements — spend it at checkout or withdraw it.</p>
        </div>
      </div>

      {/* Balance card */}
      <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-[#e01a1b] to-[#c41617] p-5 text-white shadow-lg">
        <p className="text-[13px] font-medium text-white/80">Available balance</p>
        <p className="mt-1 text-3xl font-bold tracking-tight">{inr(balance)}</p>
        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="flex items-center gap-1.5 text-[12px] text-white/75"><Info className="h-3.5 w-3.5" /> Applied at checkout — or withdraw to your bank/UPI.</p>
          <button
            type="button"
            onClick={() => setShowWithdraw(true)}
            disabled={balance <= 0}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white px-4 py-2 text-[13px] font-bold text-[#c41617] shadow-sm transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <ArrowUpFromLine className="h-4 w-4" /> Withdraw
          </button>
        </div>
      </div>

      {/* Withdrawals */}
      {withdrawals.length > 0 && (
        <div className="mt-6">
          <p className="mb-3 text-sm font-semibold text-slate-800">Withdrawals</p>
          <div className="space-y-2">
            {withdrawals.map((w) => {
              const st = WITHDRAWAL_STATUS_STYLE[w.status] || WITHDRAWAL_STATUS_STYLE.Processing;
              return (
                <div key={w.id} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-500">
                    {w.method === 'UPI' ? <Smartphone className="h-4 w-4" /> : <Landmark className="h-4 w-4" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-800">
                      {w.method === 'UPI' ? `UPI · ${w.upiId}` : `Bank · ${w.accountNumber}`}
                    </p>
                    <p className="text-[11px] text-slate-400">{w.withdrawalId} · {fmtDateTime(w.createdAt)}</p>
                    {w.status === 'Failed' && w.failureReason && <p className="text-[11px] text-red-500">{w.failureReason}</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-slate-700">−{inr(w.amount)}</p>
                    <span className={`mt-0.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${st.bg} ${st.text}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />{w.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Ledger */}
      <div className="mt-6">
        <p className="mb-3 text-sm font-semibold text-slate-800">Transaction history</p>
        {txns.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 py-12 text-center">
            <Wallet className="mx-auto h-9 w-9 text-slate-300" />
            <p className="mt-2 text-sm font-semibold text-slate-600">No transactions yet</p>
            <p className="text-[13px] text-slate-400">Refunds or replacement credits will show up here.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {txns.map((t) => {
              const credit = t.type === 'CREDIT';
              return (
                <div key={t.id} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3">
                  <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${credit ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                    {credit ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-800">{WALLET_SOURCE_LABEL[t.source] || t.source}</p>
                    <p className="truncate text-[12px] text-slate-500">
                      {t.description || (t.orderCode ? `Order #${t.orderCode}` : t.returnCode ? t.returnCode : '')}
                    </p>
                    <p className="text-[11px] text-slate-400">{fmtDateTime(t.createdAt)}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold ${credit ? 'text-emerald-600' : 'text-slate-700'}`}>{credit ? '+' : '−'}{inr(t.amount)}</p>
                    <p className="text-[11px] text-slate-400">Bal {inr(t.balanceAfter)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showWithdraw && (
        <WithdrawModal
          balance={balance}
          onClose={() => setShowWithdraw(false)}
          onDone={() => { setShowWithdraw(false); setLoading(true); load(); }}
        />
      )}
    </div>
  );
}

function WithdrawModal({ balance, onClose, onDone }: { balance: number; onClose: () => void; onDone: () => void }) {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<'UPI' | 'BANK'>('UPI');
  const [upiId, setUpiId] = useState('');
  const [accountName, setAccountName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [bankName, setBankName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const validate = (): string | null => {
    const amt = Number(amount);
    if (!(amt >= 1)) return 'Enter an amount of at least ₹1.';
    if (amt > balance) return `You can withdraw up to ${inr(balance)}.`;
    if (method === 'UPI') {
      if (!UPI_RE.test(upiId.trim())) return 'Enter a valid UPI ID (e.g. name@bank).';
    } else {
      if (!accountName.trim()) return 'Enter the account holder name.';
      if (!/^\d{6,18}$/.test(accountNumber.trim())) return 'Enter a valid account number.';
      if (!IFSC_RE.test(ifsc.trim().toUpperCase())) return 'Enter a valid IFSC code.';
    }
    return null;
  };

  const submit = async () => {
    const err = validate();
    if (err) { setError(err); return; }
    setSubmitting(true);
    setError('');
    try {
      const res = await walletService.requestWithdrawal({
        amount: Number(amount),
        method,
        ...(method === 'UPI'
          ? { upiId: upiId.trim() }
          : { accountName: accountName.trim(), accountNumber: accountNumber.trim(), ifsc: ifsc.trim().toUpperCase(), bankName: bankName.trim() || undefined }),
      });
      showSuccessToast('Withdrawal requested', res.message || 'Your withdrawal is being processed.');
      onDone();
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Could not request the withdrawal.');
    } finally {
      setSubmitting(false);
    }
  };

  if (typeof document === 'undefined') return null;
  const field = 'w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#e01a1b] focus:ring-2 focus:ring-[#e01a1b]/15';

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-end justify-center bg-slate-900/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onMouseDown={(e) => { if (e.target === e.currentTarget && !submitting) onClose(); }}>
      <div className="flex max-h-[94vh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 p-5">
          <div>
            <h3 className="text-base font-bold text-slate-900">Withdraw from wallet</h3>
            <p className="text-[12px] text-slate-500">Available {inr(balance)}</p>
          </div>
          <button onClick={onClose} disabled={submitting} className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X className="h-5 w-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <label className="mb-1 block text-[13px] font-semibold text-slate-700">Amount</label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">₹</span>
            <input type="number" min={1} max={balance} value={amount}
              onChange={(e) => { setAmount(e.target.value); if (error) setError(''); }}
              placeholder="0" className={`${field} pl-7`} />
          </div>
          <button type="button" onClick={() => setAmount(String(balance))} className="mt-1.5 text-[12px] font-semibold text-[#e01a1b] hover:underline">Withdraw all ({inr(balance)})</button>

          <p className="mb-2 mt-4 text-[13px] font-semibold text-slate-700">Send to</p>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setMethod('UPI')}
              className={`flex items-center justify-center gap-2 rounded-lg border py-2.5 text-sm font-semibold transition-colors ${method === 'UPI' ? 'border-[#e01a1b] bg-red-50/40 text-[#c41617]' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
              <Smartphone className="h-4 w-4" /> UPI
            </button>
            <button type="button" onClick={() => setMethod('BANK')}
              className={`flex items-center justify-center gap-2 rounded-lg border py-2.5 text-sm font-semibold transition-colors ${method === 'BANK' ? 'border-[#e01a1b] bg-red-50/40 text-[#c41617]' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
              <Landmark className="h-4 w-4" /> Bank
            </button>
          </div>

          {method === 'UPI' ? (
            <div className="mt-3">
              <label className="mb-1 block text-[13px] font-semibold text-slate-700">UPI ID</label>
              <input value={upiId} onChange={(e) => { setUpiId(e.target.value); if (error) setError(''); }} placeholder="name@bank" className={field} />
            </div>
          ) : (
            <div className="mt-3 space-y-3">
              <div>
                <label className="mb-1 block text-[13px] font-semibold text-slate-700">Account holder name</label>
                <input value={accountName} onChange={(e) => { setAccountName(e.target.value); if (error) setError(''); }} placeholder="As per bank records" className={field} />
              </div>
              <div>
                <label className="mb-1 block text-[13px] font-semibold text-slate-700">Account number</label>
                <input value={accountNumber} onChange={(e) => { setAccountNumber(e.target.value.replace(/\D/g, '')); if (error) setError(''); }} inputMode="numeric" placeholder="Account number" className={field} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-[13px] font-semibold text-slate-700">IFSC</label>
                  <input value={ifsc} onChange={(e) => { setIfsc(e.target.value.toUpperCase()); if (error) setError(''); }} placeholder="HDFC0001234" className={field} />
                </div>
                <div>
                  <label className="mb-1 block text-[13px] font-semibold text-slate-700">Bank <span className="font-normal text-slate-400">(optional)</span></label>
                  <input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="Bank name" className={field} />
                </div>
              </div>
            </div>
          )}

          <p className="mt-4 flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-[12px] text-slate-500">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
            The amount is deducted from your wallet now and paid to your {method === 'UPI' ? 'UPI' : 'bank account'} within 3–5 business days. If a payout fails, the amount returns to your wallet.
          </p>

          {error && <p className="mt-3 flex items-center gap-1.5 text-[13px] text-red-600"><X className="h-4 w-4" />{error}</p>}
        </div>

        <div className="shrink-0 border-t border-slate-100 p-4">
          <div className="flex gap-2">
            <button onClick={onClose} disabled={submitting} className="flex-1 rounded-full border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50">Cancel</button>
            <button onClick={submit} disabled={submitting}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-[#e01a1b] py-2.5 text-sm font-semibold text-white hover:bg-[#c41617] disabled:opacity-60">
              {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Requesting…</> : <><Check className="h-4 w-4" /> Withdraw {amount ? inr(Number(amount)) : ''}</>}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
