'use client';

import { useEffect, useState } from 'react';
import { Gift, ArrowDownLeft, ArrowUpRight, Loader2, Info, Clock } from 'lucide-react';
import { formatPrice } from '@/lib/currency';
import creditPointsService, {
  POINTS_SOURCE_LABEL, POINTS_TYPE_SIGN,
  type CreditPointsSummary,
} from '@/services/creditPointsService';

const inr = (n: number) => formatPrice(n || 0, 'INR');
const fmtDateTime = (d?: string) => d
  ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })
  : '';
const fmtDate = (d?: string) => d
  ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  : '';

export default function PointsSection() {
  const [data, setData] = useState<CreditPointsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const res = await creditPointsService.getMyPoints();
      setData(res.data);
    } catch {
      setData({ balance: 0, transactions: [] });
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  if (loading) {
    return <div className="grid place-items-center py-16 text-slate-400"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  const enabled = data?.settings?.enabled !== false;
  const balance = data?.balance || 0;
  const txns = data?.transactions || [];
  const valuePerPoint = data?.settings?.redeemValuePerPointInr ?? 0;
  const pointsValue = balance * valuePerPoint;
  const nextExpiring = data?.nextExpiring;

  const Header = (
    <div className="mb-5 flex items-center gap-3">
      <span className="grid h-10 w-10 place-items-center rounded-full bg-[#e01a1b]/10 text-[#e01a1b]">
        <Gift className="h-5 w-5" />
      </span>
      <div>
        <h2 className="text-lg font-bold text-slate-900">Credit Points</h2>
        <p className="text-[13px] text-slate-500">Earn points on your orders and redeem them at checkout.</p>
      </div>
    </div>
  );

  // Program turned off — simple empty state.
  if (!enabled) {
    return (
      <div>
        {Header}
        <div className="rounded-2xl border border-dashed border-slate-200 py-12 text-center">
          <Gift className="mx-auto h-9 w-9 text-slate-300" />
          <p className="mt-2 text-sm font-semibold text-slate-600">Points aren't available right now</p>
          <p className="text-[13px] text-slate-400">The rewards program is currently turned off.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {Header}

      {/* Balance card */}
      <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-[#e01a1b] to-[#c41617] p-5 text-white shadow-lg">
        <p className="text-[13px] font-medium text-white/80">Available points</p>
        <p className="mt-1 text-3xl font-bold tracking-tight">{balance.toLocaleString('en-IN')}</p>
        {valuePerPoint > 0 && (
          <p className="mt-1 text-[13px] font-medium text-white/85">
            {balance.toLocaleString('en-IN')} points = {inr(pointsValue)}
          </p>
        )}
        <p className="mt-3 flex items-center gap-1.5 text-[12px] text-white/75">
          <Info className="h-3.5 w-3.5" /> Redeem your points at checkout.
        </p>
      </div>

      {/* Expiry nudge */}
      {nextExpiring && nextExpiring.remaining > 0 && (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[13px] text-amber-800">
          <Clock className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          <span>
            <strong>{nextExpiring.remaining.toLocaleString('en-IN')}</strong> point(s) expiring on{' '}
            <strong>{fmtDate(nextExpiring.expiresAt)}</strong>. Use them before they're gone.
          </span>
        </div>
      )}

      {/* Ledger */}
      <div className="mt-6">
        <p className="mb-3 text-sm font-semibold text-slate-800">Points history</p>
        {txns.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 py-12 text-center">
            <Gift className="mx-auto h-9 w-9 text-slate-300" />
            <p className="mt-2 text-sm font-semibold text-slate-600">No points activity yet</p>
            <p className="text-[13px] text-slate-400">Points you earn or redeem will show up here.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {txns.map((t) => {
              const sign = POINTS_TYPE_SIGN[t.type] ?? 1;
              const credit = sign > 0;
              return (
                <div key={t.id} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3">
                  <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${credit ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                    {credit ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-800">{POINTS_SOURCE_LABEL[t.source] || t.source}</p>
                    <p className="truncate text-[12px] text-slate-500">
                      {t.description || (t.orderCode ? `Order #${t.orderCode}` : '')}
                    </p>
                    <p className="text-[11px] text-slate-400">{fmtDateTime(t.createdAt)}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold ${credit ? 'text-emerald-600' : 'text-slate-700'}`}>
                      {credit ? '+' : '−'}{Math.abs(t.points).toLocaleString('en-IN')}
                    </p>
                    <p className="text-[11px] text-slate-400">Bal {t.balanceAfter.toLocaleString('en-IN')}</p>
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
