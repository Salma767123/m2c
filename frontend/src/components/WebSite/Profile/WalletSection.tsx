'use client';

import { useEffect, useState } from 'react';
import { Wallet, ArrowDownLeft, ArrowUpRight, Loader2, Info } from 'lucide-react';
import { formatPrice } from '@/lib/currency';
import { walletService, WALLET_SOURCE_LABEL, type WalletSummary } from '@/services/walletService';

const inr = (n: number) => formatPrice(n || 0, 'INR');
const fmtDateTime = (d?: string) => d
  ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })
  : '';

export default function WalletSection() {
  const [data, setData] = useState<WalletSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await walletService.getMyWallet();
        setData(res.data);
      } catch { setData({ balance: 0, currency: 'INR', transactions: [] }); }
      finally { setLoading(false); }
    })();
  }, []);

  if (loading) {
    return <div className="grid place-items-center py-16 text-slate-400"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  const txns = data?.transactions || [];

  return (
    <div>
      <div className="mb-5 flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-full bg-[#e01a1b]/10 text-[#e01a1b]">
          <Wallet className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-lg font-bold text-slate-900">My Wallet</h2>
          <p className="text-[13px] text-slate-500">Store credit from refunds &amp; replacements — spend it at checkout.</p>
        </div>
      </div>

      {/* Balance card */}
      <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-[#e01a1b] to-[#c41617] p-5 text-white shadow-lg">
        <p className="text-[13px] font-medium text-white/80">Available balance</p>
        <p className="mt-1 text-3xl font-bold tracking-tight">{inr(data?.balance || 0)}</p>
        <p className="mt-2 flex items-center gap-1.5 text-[12px] text-white/75"><Info className="h-3.5 w-3.5" /> Applied automatically at checkout — you choose how much to use.</p>
      </div>

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
    </div>
  );
}
