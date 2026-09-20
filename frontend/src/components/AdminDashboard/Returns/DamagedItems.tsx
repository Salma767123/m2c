'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/UI/Card';
import { Button } from '@/components/UI/Button';
import {
  Search, ChevronLeft, ChevronRight, PackageX, AlertTriangle, Truck, PackageCheck,
  CheckCircle2, RotateCcw, Store, X, Warehouse, Send,
} from 'lucide-react';
import { openDoc } from '@/lib/docViewerBus';
import { hasPermission } from '@/lib/auth';
import { showSuccessToast, showErrorToast } from '@/lib/toast-utils';
import { returnService, type DamagedStock, type RtvStatus, type DamagedStatusCounts } from '@/services/returnService';
import ReturnDetailPanel from './ReturnDetailPanel';

const PER_PAGE = 20;
const fmtDateTime = (d?: string | null) => d
  ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })
  : '—';

// RTV status presentation.
const RTV: Record<RtvStatus, { label: string; badge: string; dot: string }> = {
  AT_HUB: { label: 'At Hub', badge: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
  SENT_TO_VENDOR: { label: 'Sent to Vendor', badge: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500' },
  RECEIVED_BY_VENDOR: { label: 'Received by Vendor', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  CLOSED: { label: 'Closed', badge: 'bg-slate-100 text-slate-600 border-slate-200', dot: 'bg-slate-400' },
};

const rtvOf = (r: DamagedStock): RtvStatus => (r.vendorReturnStatus as RtvStatus) || 'AT_HUB';

export default function DamagedItems() {
  const [rows, setRows] = useState<DamagedStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | RtvStatus>('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUnits, setTotalUnits] = useState(0);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState<DamagedStatusCounts>({ ALL: 0, AT_HUB: 0, SENT_TO_VENDOR: 0, RECEIVED_BY_VENDOR: 0, CLOSED: 0 });
  const [detailReturnId, setDetailReturnId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  // Send-to-vendor modal.
  const [sendModal, setSendModal] = useState<DamagedStock | null>(null);
  const [courier, setCourier] = useState('');
  const [tracking, setTracking] = useState('');
  const [note, setNote] = useState('');

  const canManage = hasPermission('returns:manage');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await returnService.getDamagedStock({
        page, limit: PER_PAGE,
        search: search || undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
      });
      setRows(res.data || []);
      setTotalPages(res.pagination?.totalPages || 1);
      setTotalUnits(res.totalUnits || 0);
      setTotal(res.pagination?.total || 0);
      if (res.statusCounts) setCounts(res.statusCounts);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search, statusFilter]);

  const openSend = (r: DamagedStock) => {
    setCourier(''); setTracking(''); setNote('');
    setSendModal(r);
  };

  const submitSend = async () => {
    if (!sendModal) return;
    try {
      setBusyId(sendModal.id);
      await returnService.updateVendorReturn(sendModal.id, {
        action: 'send',
        courier: courier.trim() || undefined,
        trackingNumber: tracking.trim() || undefined,
        note: note.trim() || undefined,
      });
      showSuccessToast('Sent to vendor', `${sendModal.productName} is on its way back to ${sendModal.vendorName || 'the vendor'}.`);
      setSendModal(null);
      load();
    } catch (e: any) {
      showErrorToast('Failed', e?.message || e?.response?.data?.message || 'Could not update.');
    } finally {
      setBusyId(null);
    }
  };

  const runAction = async (r: DamagedStock, action: 'receive' | 'close' | 'reset') => {
    try {
      setBusyId(r.id);
      await returnService.updateVendorReturn(r.id, { action });
      const msg = action === 'receive' ? 'Marked as received by vendor.' : action === 'close' ? 'Marked as closed.' : 'Reset to At Hub.';
      showSuccessToast('Updated', msg);
      load();
    } catch (e: any) {
      showErrorToast('Failed', e?.message || e?.response?.data?.message || 'Could not update.');
    } finally {
      setBusyId(null);
    }
  };

  const metricCards: { key: 'ALL' | RtvStatus; label: string; value: number; Icon: any; iconBg: string; iconColor: string; active: string }[] = [
    { key: 'ALL', label: 'All Records', value: counts.ALL, Icon: PackageX, iconBg: 'bg-slate-100', iconColor: 'text-slate-600', active: 'border-slate-400 bg-slate-50/60' },
    { key: 'AT_HUB', label: 'At Hub', value: counts.AT_HUB, Icon: Warehouse, iconBg: 'bg-amber-50', iconColor: 'text-amber-600', active: 'border-amber-400 bg-amber-50/60' },
    { key: 'SENT_TO_VENDOR', label: 'Sent to Vendor', value: counts.SENT_TO_VENDOR, Icon: Truck, iconBg: 'bg-blue-50', iconColor: 'text-blue-600', active: 'border-blue-400 bg-blue-50/60' },
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
            <h1 className="text-xl font-bold text-slate-900">Damaged Items</h1>
            <p className="text-sm text-slate-500">Defective returns received at the hub — tracked back to the vendor who supplied them.</p>
          </div>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-center">
          <div className="text-lg font-bold text-amber-700">{totalUnits}</div>
          <div className="text-[11px] text-amber-600/70">Units damaged</div>
        </div>
      </div>

      {/* Status metric cards — click to filter */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
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
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search product, vendor, return, order, SKU, customer…"
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
          <div className="hidden gap-3 border-b border-slate-100 bg-slate-50 px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-slate-500 lg:grid lg:grid-cols-[1.9fr_0.5fr_1.1fr_1.3fr_1.5fr_1.2fr_1.3fr]">
            <div>Product</div>
            <div>Qty</div>
            <div>Reason</div>
            <div>Vendor</div>
            <div>Return to Vendor</div>
            <div>Source</div>
            <div>Actions</div>
          </div>
          {rows.map((r) => {
            const status = rtvOf(r);
            const meta = RTV[status];
            const busy = busyId === r.id;
            return (
              <div key={r.id}
                onClick={() => r.returnRequestId && setDetailReturnId(r.returnRequestId)}
                className={`grid grid-cols-1 gap-3 border-b border-slate-50 px-4 py-3 last:border-0 hover:bg-slate-50/60 lg:grid-cols-[1.9fr_0.5fr_1.1fr_1.3fr_1.5fr_1.2fr_1.3fr] lg:items-center ${r.returnRequestId ? 'cursor-pointer' : ''}`}
                title={r.returnRequestId ? 'View full details' : undefined}>
                {/* Product */}
                <div className="flex items-center gap-3">
                  {r.productImage
                    ? <img src={r.productImage} alt="" className="h-10 w-10 shrink-0 cursor-zoom-in rounded-lg object-cover" onClick={(e) => { e.stopPropagation(); openDoc(r.productImage!, r.productName, true); }} />
                    : <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-400"><PackageX className="h-4 w-4" /></span>}
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold text-slate-800">{r.productName}</p>
                    <p className="text-[11px] text-slate-400">{[r.size, r.color, r.sku].filter(Boolean).join(' · ') || '—'}</p>
                  </div>
                </div>
                {/* Qty */}
                <div className="text-[13px] font-bold text-amber-700">{r.quantity}</div>
                {/* Reason */}
                <div className="text-[13px] text-slate-600">{r.reason}</div>
                {/* Vendor */}
                <div className="min-w-0 text-[12.5px]">
                  {r.vendorName ? (
                    <span className="flex items-center gap-1.5 text-slate-700">
                      <Store className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{r.vendorName}</span>
                        {r.vendorCode && <span className="block text-[11px] text-slate-400">{r.vendorCode}</span>}
                      </span>
                    </span>
                  ) : <span className="text-slate-300">No vendor linked</span>}
                </div>
                {/* RTV status */}
                <div className="text-[12px]">
                  <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${meta.badge}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} /> {meta.label}
                  </span>
                  {status === 'SENT_TO_VENDOR' && (
                    <div className="mt-1 text-[11px] text-slate-400">
                      {r.courier && <span>{r.courier}</span>}{r.courier && r.trackingNumber && ' · '}{r.trackingNumber && <span>{r.trackingNumber}</span>}
                      <span className="block">Sent {fmtDateTime(r.sentToVendorAt)}</span>
                    </div>
                  )}
                  {status === 'RECEIVED_BY_VENDOR' && (
                    <div className="mt-1 text-[11px] text-slate-400">Received {fmtDateTime(r.vendorReceivedAt)}</div>
                  )}
                </div>
                {/* Source */}
                <div className="text-[12px] text-slate-500">
                  {r.returnCode && <span className="block font-medium text-slate-700">{r.returnCode}</span>}
                  {r.orderCode && <span className="block">#{r.orderCode}</span>}
                  {r.customerName && <span className="block text-slate-400">{r.customerName}</span>}
                </div>
                {/* Actions */}
                <div className="flex flex-wrap items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                  {!canManage ? (
                    <span className="text-[11px] text-slate-300">—</span>
                  ) : !r.vendorId ? (
                    <span className="text-[11px] text-slate-400">No vendor</span>
                  ) : status === 'AT_HUB' ? (
                    <button disabled={busy} onClick={() => openSend(r)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#e01a1b] px-2.5 py-1.5 text-[12px] font-semibold text-white transition-colors hover:bg-[#c41617] disabled:opacity-50">
                      <Truck className="h-3.5 w-3.5" /> Send to Vendor
                    </button>
                  ) : status === 'SENT_TO_VENDOR' ? (
                    <>
                      <button disabled={busy} onClick={() => runAction(r, 'receive')}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-[12px] font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50">
                        <PackageCheck className="h-3.5 w-3.5" /> Mark Received
                      </button>
                      <button disabled={busy} onClick={() => runAction(r, 'reset')} title="Undo dispatch"
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1.5 text-[12px] font-medium text-slate-500 hover:bg-slate-50 disabled:opacity-50">
                        <RotateCcw className="h-3.5 w-3.5" />
                      </button>
                    </>
                  ) : status === 'RECEIVED_BY_VENDOR' ? (
                    <button disabled={busy} onClick={() => runAction(r, 'close')}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[12px] font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Close
                    </button>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[12px] font-medium text-slate-400"><CheckCircle2 className="h-3.5 w-3.5" /> Closed</span>
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

      {/* Send-to-vendor modal */}
      {sendModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/50 p-4" onClick={() => !busyId && setSendModal(null)}>
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
              <div className="flex items-center gap-2">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#e01a1b]/10 text-[#e01a1b]"><Truck className="h-4 w-4" /></span>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Send to Vendor</h3>
                  <p className="text-xs text-slate-500">Ship this defective item back to the supplier</p>
                </div>
              </div>
              <button onClick={() => !busyId && setSendModal(null)} className="grid h-8 w-8 place-items-center rounded-full text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-4 px-5 py-4">
              {/* item + vendor recap */}
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                <div className="flex items-center gap-2 text-[13px] font-semibold text-slate-800">
                  <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-bold text-amber-700">{sendModal.quantity}×</span>
                  <span className="truncate">{sendModal.productName}</span>
                </div>
                <div className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-500">
                  <Store className="h-3.5 w-3.5 text-slate-400" />
                  {sendModal.vendorName || 'Vendor'}{sendModal.vendorCode ? ` · ${sendModal.vendorCode}` : ''}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Courier</label>
                  <input value={courier} onChange={(e) => setCourier(e.target.value)} placeholder="e.g. Delhivery"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#e01a1b] focus:ring-2 focus:ring-[#e01a1b]/15" />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Tracking No.</label>
                  <input value={tracking} onChange={(e) => setTracking(e.target.value)} placeholder="AWB / tracking"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#e01a1b] focus:ring-2 focus:ring-[#e01a1b]/15" />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Note <span className="font-normal normal-case text-slate-400">(optional)</span></label>
                <textarea value={note} onChange={(e) => setNote(e.target.value.slice(0, 500))} rows={2} placeholder="Any dispatch details for the vendor…"
                  className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#e01a1b] focus:ring-2 focus:ring-[#e01a1b]/15" />
              </div>
              <p className="text-[11px] text-slate-400">The vendor will be notified that this item is on its way back to them.</p>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-5 py-3">
              <button onClick={() => !busyId && setSendModal(null)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
              <button onClick={submitSend} disabled={!!busyId}
                className="inline-flex items-center gap-2 rounded-lg bg-[#e01a1b] px-4 py-2 text-sm font-semibold text-white hover:bg-[#c41617] disabled:opacity-50">
                {busyId ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : <Send className="h-4 w-4" />}
                Confirm & Send
              </button>
            </div>
          </div>
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
