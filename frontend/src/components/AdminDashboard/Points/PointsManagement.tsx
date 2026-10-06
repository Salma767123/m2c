'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/UI/Card';
import { Button } from '@/components/UI/Button';
import { Sparkles, Search, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import { hasPermission } from '@/lib/auth';
import { showSuccessToast, showErrorToast } from '@/lib/toast-utils';
import creditPointsService, { type PointsAccountRow } from '@/services/creditPointsService';
import PointsDetailPanel from './PointsDetailPanel';

const pts = (n: number) => `${(n || 0).toLocaleString('en-IN')} pts`;
const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '';

export default function PointsManagement() {
  const [rows, setRows] = useState<PointsAccountRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalPoints, setTotalPoints] = useState(0);
  const [total, setTotal] = useState(0);
  const [detailCustomer, setDetailCustomer] = useState<{ id: string; name: string } | null>(null);

  const canAdjust = hasPermission('points:adjust');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await creditPointsService.getAllAccounts({ page, limit: 20, search: search || undefined });
      setRows(res.data?.accounts || []);
      setTotalPages(res.data?.pagination?.totalPages || 1);
      setTotalPoints(res.data?.totalPoints || 0);
      setTotal(res.data?.pagination?.totalItems || 0);
    } catch { setRows([]); }
    finally { setLoading(false); }
  }, [page, search]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search]);

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#e01a1b]/10 text-[#e01a1b]">
            <Sparkles className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Customer Credit Points</h1>
            <p className="text-sm text-slate-500">Loyalty point balances, history and manual adjustments.</p>
          </div>
        </div>
        <div className="flex gap-3">
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-center">
            <div className="text-lg font-bold text-slate-900">{total}</div>
            <div className="text-[11px] text-slate-400">Accounts</div>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-center">
            <div className="text-lg font-bold text-emerald-700">{pts(totalPoints)}</div>
            <div className="text-[11px] text-emerald-600/70">Outstanding points</div>
          </div>
        </div>
      </div>

      <div className="mb-4 relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search customer name or email…"
          className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-[#e01a1b] focus:ring-2 focus:ring-[#e01a1b]/15" />
      </div>

      {loading ? (
        <div className="py-20 text-center text-slate-400">Loading…</div>
      ) : rows.length === 0 ? (
        <Card><CardContent className="py-16 text-center">
          <Sparkles className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 font-semibold text-slate-700">No point accounts yet</p>
          <p className="text-sm text-slate-500">Accounts are created when a customer earns loyalty points.</p>
        </CardContent></Card>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="hidden gap-3 border-b border-slate-100 bg-slate-50 px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-slate-500 lg:grid lg:grid-cols-[2fr_1.2fr_1fr_0.8fr]">
            <div>Customer</div>
            <div>Balance</div>
            <div>Updated</div>
            <div className="text-right">Action</div>
          </div>
          {rows.map((a) => (
            <div key={a.customerId} className="grid grid-cols-1 gap-2 border-b border-slate-50 px-4 py-3 last:border-0 hover:bg-slate-50/60 lg:grid-cols-[2fr_1.2fr_1fr_0.8fr] lg:items-center">
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold text-slate-800">{a.name}</p>
                <p className="truncate text-[12px] text-slate-400">{a.email}</p>
              </div>
              <div className="text-sm font-bold text-emerald-700">{pts(a.balance)}</div>
              <div className="text-[12px] text-slate-500">{fmtDate(a.updatedAt)}</div>
              <div className="flex lg:justify-end">
                <button onClick={() => setDetailCustomer({ id: a.customerId, name: a.name })}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[12px] font-semibold text-slate-700 hover:bg-white">
                  <Eye className="h-3.5 w-3.5" /> View
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
          <span className="text-sm text-slate-500">Page {page} of {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      )}

      {detailCustomer && (
        <PointsDetailPanel
          customerId={detailCustomer.id}
          customerName={detailCustomer.name}
          canAdjust={canAdjust}
          onClose={() => setDetailCustomer(null)}
          onChanged={load}
          notifySuccess={(m) => showSuccessToast('Points updated', m)}
          notifyError={(m) => showErrorToast('Failed', m)}
        />
      )}
    </div>
  );
}
