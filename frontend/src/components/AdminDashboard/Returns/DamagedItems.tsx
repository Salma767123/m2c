'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/UI/Card';
import { Button } from '@/components/UI/Button';
import { Search, ChevronLeft, ChevronRight, PackageX, AlertTriangle } from 'lucide-react';
import { openDoc } from '@/lib/docViewerBus';
import { hasPermission } from '@/lib/auth';
import { showSuccessToast, showErrorToast } from '@/lib/toast-utils';
import { returnService, type DamagedStock } from '@/services/returnService';
import ReturnDetailPanel from './ReturnDetailPanel';

const PER_PAGE = 20;
const fmtDateTime = (d?: string) => d
  ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })
  : '—';

export default function DamagedItems() {
  const [rows, setRows] = useState<DamagedStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUnits, setTotalUnits] = useState(0);
  const [total, setTotal] = useState(0);
  const [detailReturnId, setDetailReturnId] = useState<string | null>(null);
  const canManage = hasPermission('returns:manage');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await returnService.getDamagedStock({ page, limit: PER_PAGE, search: search || undefined });
      setRows(res.data || []);
      setTotalPages(res.pagination?.totalPages || 1);
      setTotalUnits(res.totalUnits || 0);
      setTotal(res.pagination?.total || 0);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search]);

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-amber-100 text-amber-600">
            <PackageX className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Damaged Items</h1>
            <p className="text-sm text-slate-500">Returned items written off (not restocked). Full audit of what, why, when and by whom.</p>
          </div>
        </div>
        <div className="flex gap-3">
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-center">
            <div className="text-lg font-bold text-slate-900">{total}</div>
            <div className="text-[11px] text-slate-400">Records</div>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-center">
            <div className="text-lg font-bold text-amber-700">{totalUnits}</div>
            <div className="text-[11px] text-amber-600/70">Units damaged</div>
          </div>
        </div>
      </div>

      <div className="mb-4 relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search product, return, order, SKU, customer…"
          className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-[#e01a1b] focus:ring-2 focus:ring-[#e01a1b]/15" />
      </div>

      {loading ? (
        <div className="py-20 text-center text-slate-400">Loading…</div>
      ) : rows.length === 0 ? (
        <Card><CardContent className="py-16 text-center">
          <AlertTriangle className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 font-semibold text-slate-700">No damaged items</p>
          <p className="text-sm text-slate-500">Items marked damaged on a return approval will appear here.</p>
        </CardContent></Card>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="hidden gap-3 border-b border-slate-100 bg-slate-50 px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-slate-500 lg:grid lg:grid-cols-[2fr_0.6fr_1.3fr_1.5fr_1.2fr_1.1fr]">
            <div>Product</div>
            <div>Qty</div>
            <div>Reason</div>
            <div>Note</div>
            <div>Source</div>
            <div>Recorded</div>
          </div>
          {rows.map((r) => (
            <div key={r.id}
              onClick={() => r.returnRequestId && setDetailReturnId(r.returnRequestId)}
              className={`grid grid-cols-1 gap-3 border-b border-slate-50 px-4 py-3 last:border-0 hover:bg-slate-50/60 lg:grid-cols-[2fr_0.6fr_1.3fr_1.5fr_1.2fr_1.1fr] lg:items-center ${r.returnRequestId ? 'cursor-pointer' : ''}`}
              title={r.returnRequestId ? 'View full details' : undefined}>
              <div className="flex items-center gap-3">
                {r.productImage
                  ? <img src={r.productImage} alt="" className="h-10 w-10 shrink-0 cursor-zoom-in rounded-lg object-cover" onClick={(e) => { e.stopPropagation(); openDoc(r.productImage!, r.productName, true); }} />
                  : <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-400"><PackageX className="h-4 w-4" /></span>}
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold text-slate-800">{r.productName}</p>
                  <p className="text-[11px] text-slate-400">{[r.size, r.color, r.sku].filter(Boolean).join(' · ') || '—'}</p>
                </div>
              </div>
              <div className="text-[13px] font-bold text-amber-700">{r.quantity}</div>
              <div className="text-[13px] text-slate-600">{r.reason}</div>
              <div className="text-[12.5px] text-slate-500">{r.note || <span className="text-slate-300">—</span>}</div>
              <div className="text-[12px] text-slate-500">
                {r.returnCode && <span className="block font-medium text-slate-700">{r.returnCode}</span>}
                {r.orderCode && <span className="block">#{r.orderCode}</span>}
                {r.customerName && <span className="block text-slate-400">{r.customerName}</span>}
              </div>
              <div className="text-[12px] text-slate-500">
                <span className="block">{fmtDateTime(r.createdAt)}</span>
                {r.recordedByName && <span className="block text-slate-400">by {r.recordedByName}</span>}
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

      {/* Full return context for a damaged item — order, customer, product, evidence & timeline. */}
      {detailReturnId && (
        <ReturnDetailPanel
          id={detailReturnId}
          canManage={canManage}
          onClose={() => setDetailReturnId(null)}
          onChanged={load}
          notifySuccess={(m) => showSuccessToast('Updated', m)}
          notifyError={(m) => showErrorToast('Failed', m)}
        />
      )}
    </div>
  );
}
