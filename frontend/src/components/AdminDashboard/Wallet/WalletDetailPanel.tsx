'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, ArrowDownLeft, ArrowUpRight, Wallet, Plus, Minus } from 'lucide-react';
import { formatPrice } from '@/lib/currency';
import { walletService, WALLET_SOURCE_LABEL, type WalletSummary } from '@/services/walletService';

const inr = (n: number) => formatPrice(n || 0, 'INR');
const fmtDateTime = (d?: string) => d
  ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })
  : '';

export default function WalletDetailPanel({
  customerId, customerName, canAdjust, onClose, onChanged, notifySuccess, notifyError,
}: {
  customerId: string; customerName: string; canAdjust: boolean;
  onClose: () => void; onChanged: () => void;
  notifySuccess: (m: string) => void; notifyError: (m: string) => void;
}) {
  const [data, setData] = useState<WalletSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [showAdjust, setShowAdjust] = useState(false);
  const [type, setType] = useState<'CREDIT' | 'DEBIT'>('CREDIT');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');

  const load = async () => {
    try { const res = await walletService.getWalletByCustomer(customerId); setData(res.data); }
    catch { setData(null); } finally { setLoading(false); }
  };
  useEffect(() => {
    load();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow; document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId]);

  const submitAdjust = async () => {
    const amt = Number(amount);
    if (!(amt > 0)) { notifyError('Enter an amount greater than zero.'); return; }
    if (!reason.trim()) { notifyError('A reason is required.'); return; }
    try {
      setBusy(true);
      await walletService.adjustWallet(customerId, { type, amount: amt, reason: reason.trim() });
      notifySuccess(`Wallet ${type === 'CREDIT' ? 'credited' : 'debited'} by ${inr(amt)}.`);
      setShowAdjust(false); setAmount(''); setReason('');
      await load(); onChanged();
    } catch (e: any) {
      notifyError(e?.response?.data?.message || 'Could not adjust wallet.');
    } finally { setBusy(false); }
  };

  const txns = data?.transactions || [];

  return (
    <div className="fixed inset-0 z-[200] flex justify-end bg-slate-900/50 backdrop-blur-sm" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="flex h-full w-full max-w-xl flex-col bg-slate-50 shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white p-5">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#e01a1b]/10 text-[#e01a1b]"><Wallet className="h-5 w-5" /></span>
            <div>
              <h2 className="text-base font-bold text-slate-900">{customerName}</h2>
              {data?.customer?.email && <p className="text-[12px] text-slate-500">{data.customer.email}</p>}
            </div>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X className="h-5 w-5" /></button>
        </div>

        {loading ? (
          <div className="grid flex-1 place-items-center text-slate-400"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : (
          <>
            <div className="flex-1 space-y-4 overflow-y-auto p-5">
              <div className="rounded-2xl bg-gradient-to-br from-[#e01a1b] to-[#c41617] p-5 text-white">
                <p className="text-[13px] text-white/80">Balance</p>
                <p className="mt-1 text-3xl font-bold">{inr(data?.balance || 0)}</p>
              </div>

              {canAdjust && !showAdjust && (
                <div className="flex gap-2">
                  <button onClick={() => { setType('CREDIT'); setShowAdjust(true); }}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
                    <Plus className="h-4 w-4" /> Add credit
                  </button>
                  <button onClick={() => { setType('DEBIT'); setShowAdjust(true); }}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                    <Minus className="h-4 w-4" /> Deduct
                  </button>
                </div>
              )}

              {showAdjust && (
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="mb-2 text-[13px] font-semibold text-slate-700">{type === 'CREDIT' ? 'Add credit' : 'Deduct'} (₹)</p>
                  <input type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount in INR"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#e01a1b] focus:ring-2 focus:ring-[#e01a1b]/15" />
                  <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} placeholder="Reason (required) — recorded in history"
                    className="mt-2 w-full rounded-lg border border-slate-200 p-2.5 text-sm outline-none focus:border-[#e01a1b] focus:ring-2 focus:ring-[#e01a1b]/15" />
                  <div className="mt-2 flex gap-2">
                    <button onClick={() => { setShowAdjust(false); setAmount(''); setReason(''); }} disabled={busy}
                      className="flex-1 rounded-lg border border-slate-200 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
                    <button onClick={submitAdjust} disabled={busy}
                      className={`flex-1 rounded-lg py-2 text-sm font-semibold text-white disabled:opacity-60 ${type === 'CREDIT' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-slate-800 hover:bg-slate-900'}`}>
                      {busy ? 'Saving…' : type === 'CREDIT' ? 'Add credit' : 'Deduct'}
                    </button>
                  </div>
                </div>
              )}

              <div>
                <p className="mb-2 text-[13px] font-semibold text-slate-700">History</p>
                {txns.length === 0 ? (
                  <p className="py-8 text-center text-sm text-slate-400">No transactions.</p>
                ) : (
                  <div className="space-y-2">
                    {txns.map((t) => {
                      const credit = t.type === 'CREDIT';
                      return (
                        <div key={t.id} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3">
                          <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${credit ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                            {credit ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[13px] font-semibold text-slate-800">{WALLET_SOURCE_LABEL[t.source] || t.source}</p>
                            <p className="truncate text-[12px] text-slate-500">{t.description || t.orderCode || t.returnCode || ''}</p>
                            <p className="text-[11px] text-slate-400">{fmtDateTime(t.createdAt)}{t.createdByName ? ` · ${t.createdByName}` : ''}</p>
                          </div>
                          <div className="text-right">
                            <p className={`text-[13px] font-bold ${credit ? 'text-emerald-600' : 'text-slate-700'}`}>{credit ? '+' : '−'}{inr(t.amount)}</p>
                            <p className="text-[11px] text-slate-400">Bal {inr(t.balanceAfter)}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
