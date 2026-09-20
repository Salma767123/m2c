'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/UI/Card';
import { Button } from '@/components/UI/Button';
import {
  Search, ChevronLeft, ChevronRight, PackageX, AlertTriangle, Truck, PackageCheck,
  CheckCircle2, X,
} from 'lucide-react';
import { openDoc } from '@/lib/docViewerBus';
import { showSuccessToast, showErrorToast } from '@/lib/toast-utils';
import { returnService, type DamagedStock, type RtvStatus } from '@/services/returnService';

const PER_PAGE = 20;
const fmtDateTime = (d?: string | null) => d
  ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })
  : '—';

type VendorStatus = 'SENT_TO_VENDOR' | 'RECEIVED_BY_VENDOR' | 'CLOSED';

const RTV: Record<VendorStatus, { label: string; badge: string; dot: string }> = {
  SENT_TO_VENDOR: { label: 'In Transit to You', badge: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500' },
  RECEIVED_BY_VENDOR: { label: 'Received', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  CLOSED: { label: 'Closed', badge: 'bg-slate-100 text-slate-600 border-slate-200', dot: 'bg-slate-400' },
};

const statusOf = (r: DamagedStock): VendorStatus => (r.vendorReturnStatus as VendorStatus) || 'SENT_TO_VENDOR';

export default function DefectiveReturns() {
  const [rows, setRows] = useState<DamagedStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | VendorStatus>('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUnits, setTotalUnits] = useState(0);
  const [counts, setCounts] = useState({ ALL: 0, SENT_TO_VENDOR: 0, RECEIVED_BY_VENDOR: 0, CLOSED: 0 });
  const [busyId, setBusyId] = useState<string | null>(null);
  // Acknowledge modal.
  const [ackRow, setAckRow] = useState<DamagedStock | null>(null);
  const [ackNote, setAckNote] = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await returnService.getVendorDefectiveReturns({
        page, limit: PER_PAGE,
        search: search || undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
      });
      setRows(res.data || []);
      setTotalPages(res.pagination?.totalPages || 1);
      setTotalUnits(res.totalUnits || 0);
      if (res.statusCounts) setCounts(res.statusCounts as any);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search, statusFilter]);

  const submitAck = async () => {
    if (!ackRow) return;
    try {
      setBusyId(ackRow.id);
      await returnService.acknowledgeDefectiveReturn(ackRow.id, ackNote.trim() || undefined);
      showSuccessToast('Receipt confirmed', `Marked ${ackRow.productName} as received.`);
      setAckRow(null);
      setAckNote('');
      load();
    } catch (e: any) {
      showErrorToast('Failed', e?.message || e?.response?.data?.message || 'Could not update.');
    } finally {
      setBusyId(null);
    }
  };

  const metricCards: { key: 'ALL' | VendorStatus; label: string; value: number; Icon: any; iconBg: string; iconColor: string; active: string }[] = [
    { key: 'ALL', label: 'All', value: counts.ALL, Icon: PackageX, iconBg: 'bg-slate-100', iconColor: 'text-slate-600', active: 'border-slate-400 bg-slate-50/60' },
    { key: 'SENT_TO_VENDOR', label: 'Awaiting Receipt', value: counts.SENT_TO_VENDOR, Icon: Truck, iconBg: 'bg-blue-50', iconColor: 'text-blue-600', active: 'border-blue-400 bg-blue-50/60' },
    { key: 'RECEIVED_BY_VENDOR', label: 'Received', value: counts.RECEIVED_BY_VENDOR, Icon: PackageCheck, iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600', active: 'border-emerald-400 bg-emerald-50/60' },
    { key: 'CLOSED', label: 'Closed', value: counts.CLOSED, Icon: CheckCircle2, iconBg: 'bg-slate-100', iconColor: 'text-slate-500', active: 'border-slate-400 bg-slate-50/60' },
  ];

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-amber-100 text-amber-600">
            <PackageX className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Defective Returns</h1>
            <p className="text-sm text-slate-500">Defective items the M2C hub has shipped back to you. Confirm receipt when they arrive.</p>
          </div>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-center">
          <div className="text-lg font-bold text-amber-700">{totalUnits}</div>
          <div className="text-[11px] text-amber-600/70">Units returned</div>
        </div>
      </div>

      {/* Status metric cards — click to filter */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {metricCards.map(({ key, label, value, Icon, iconBg, iconColor, active }) => {
          const isActive = statusFilter === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setStatusFilter(key)}
              className={`group rounded-2xl border bg-white text-left shadow-xs transition-all duration-200 hover:shadow-sm ${isActive ? active : 'border-slate-200/80 hover:border-slate-300'}`}
            >
              <div className="flex items-center justify-between px-3.5 pt-3">
                <span className="text-[13px] font-medium text-slate-500">{label}</span>
                <span className={`rounded-lg p-1.5 ${iconBg} transition-transform group-hover:scale-110`}>
                  <Icon className={`h-4 w-4 ${iconColor}`} />
                </span>
              </div>
              <div className="px-3.5 pb-3 pt-1 text-xl font-bold text-slate-900">{value}</div>
            </button>
          );
        })}
      </div>

      <div className="mb-4 relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search product, return, order, SKU, tracking…"
          className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-[#e01a1b] focus:ring-2 focus:ring-[#e01a1b]/15" />
      </div>

      {loading ? (
        <div className="py-20 text-center text-slate-400">Loading…</div>
      ) : rows.length === 0 ? (
        <Card><CardContent className="py-16 text-center">
          <AlertTriangle className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 font-semibold text-slate-700">No defective returns</p>
          <p className="text-sm text-slate-500">Items the hub sends back to you will appear here.</p>
        </CardContent></Card>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="hidden gap-3 border-b border-slate-100 bg-slate-50 px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-slate-500 lg:grid lg:grid-cols-[2fr_0.5fr_1.2fr_1.5fr_1.3fr_1.2fr]">
            <div>Product</div>
            <div>Qty</div>
            <div>Reason</div>
            <div>Dispatch</div>
            <div>Status</div>
            <div>Action</div>
          </div>
          {rows.map((r) => {
            const status = statusOf(r);
            const meta = RTV[status];
            const busy = busyId === r.id;
            return (
              <div key={r.id}
                className="grid grid-cols-1 gap-3 border-b border-slate-50 px-4 py-3 last:border-0 hover:bg-slate-50/60 lg:grid-cols-[2fr_0.5fr_1.2fr_1.5fr_1.3fr_1.2fr] lg:items-center">
                {/* Product */}
                <div className="flex items-center gap-3">
                  {r.productImage
                    ? <img src={r.productImage} alt="" className="h-10 w-10 shrink-0 cursor-zoom-in rounded-lg object-cover" onClick={() => openDoc(r.productImage!, r.productName, true)} />
                    : <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-400"><PackageX className="h-4 w-4" /></span>}
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold text-slate-800">{r.productName}</p>
                    <p className="text-[11px] text-slate-400">{[r.size, r.color, r.sku].filter(Boolean).join(' · ') || '—'}</p>
                  </div>
                </div>
                {/* Qty */}
                <div className="text-[13px] font-bold text-amber-700">{r.quantity}</div>
                {/* Reason */}
                <div className="text-[13px] text-slate-600">
                  {r.reason}
                  {r.returnCode && <span className="mt-0.5 block text-[11px] text-slate-400">{r.returnCode}{r.orderCode ? ` · #${r.orderCode}` : ''}</span>}
                </div>
                {/* Dispatch */}
                <div className="text-[12px] text-slate-500">
                  {r.courier && <span className="block font-medium text-slate-700">{r.courier}</span>}
                  {r.trackingNumber && <span className="block">{r.trackingNumber}</span>}
                  <span className="block text-slate-400">Sent {fmtDateTime(r.sentToVendorAt)}</span>
                </div>
                {/* Status */}
                <div className="text-[12px]">
                  <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${meta.badge}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} /> {meta.label}
                  </span>
                  {status !== 'SENT_TO_VENDOR' && r.vendorReceivedAt && (
                    <div className="mt-1 text-[11px] text-slate-400">Received {fmtDateTime(r.vendorReceivedAt)}</div>
                  )}
                </div>
                {/* Action */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {status === 'SENT_TO_VENDOR' ? (
                    <button disabled={busy} onClick={() => { setAckNote(''); setAckRow(r); }}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-[12px] font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50">
                      <PackageCheck className="h-3.5 w-3.5" /> Confirm Receipt
                    </button>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[12px] font-medium text-emerald-600"><CheckCircle2 className="h-3.5 w-3.5" /> {status === 'CLOSED' ? 'Closed' : 'Received'}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
          <span className="text-sm text-slate-500">Page {page} of {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      )}

      {/* Acknowledge modal */}
      {ackRow && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/50 p-4" onClick={() => !busyId && setAckRow(null)}>
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
              <div className="flex items-center gap-2">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-50 text-emerald-600"><PackageCheck className="h-4 w-4" /></span>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Confirm Receipt</h3>
                  <p className="text-xs text-slate-500">Mark this defective item as received</p>
                </div>
              </div>
              <button onClick={() => !busyId && setAckRow(null)} className="grid h-8 w-8 place-items-center rounded-full text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-4 px-5 py-4">
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                <div className="flex items-center gap-2 text-[13px] font-semibold text-slate-800">
                  <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-bold text-amber-700">{ackRow.quantity}×</span>
                  <span className="truncate">{ackRow.productName}</span>
                </div>
                <p className="mt-1 text-xs text-slate-500">{ackRow.reason}{ackRow.returnCode ? ` · ${ackRow.returnCode}` : ''}</p>
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Note <span className="font-normal normal-case text-slate-400">(optional)</span></label>
                <textarea value={ackNote} onChange={(e) => setAckNote(e.target.value.slice(0, 500))} rows={3} placeholder="Condition on arrival, any remarks…"
                  className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#e01a1b] focus:ring-2 focus:ring-[#e01a1b]/15" />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-5 py-3">
              <button onClick={() => !busyId && setAckRow(null)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
              <button onClick={submitAck} disabled={!!busyId}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">
                {busyId ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : <PackageCheck className="h-4 w-4" />}
                Confirm Received
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
