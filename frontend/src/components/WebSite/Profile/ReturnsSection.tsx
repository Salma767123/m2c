'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  RotateCcw, Package, CreditCard, Clock, X, AlertCircle, Loader2, ShieldCheck, RefreshCw,
} from 'lucide-react';
import { formatPrice } from '@/lib/currency';
import { openDoc } from '@/lib/docViewerBus';
import { showErrorToast, showSuccessToast } from '@/lib/toast-utils';
import {
  returnService, reasonLabel, returnStatusStyle,
  type ReturnRequest,
} from '@/services/returnService';

const money = (n: number, currency?: string) => formatPrice(n || 0, currency === 'USD' ? 'USD' : 'INR');
const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
const fmtDateTime = (d?: string) => d
  ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })
  : '';

export default function ReturnsSection() {
  const [returns, setReturns] = useState<ReturnRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailId, setDetailId] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      const res = await returnService.getMyReturns();
      setReturns(res.data || []);
    } catch {
      setReturns([]);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  // Deep-link: /profile?tab=returns&return=<id|RET-…> opens that request directly
  // (e.g. from the return status pill on the Orders page). window.location avoids
  // a Suspense boundary that useSearchParams would require here.
  useEffect(() => {
    const rid = new URLSearchParams(window.location.search).get('return');
    if (rid) setDetailId(rid);
  }, []);

  return (
    <div>
      <div className="mb-5 flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-full bg-[#e01a1b]/10 text-[#e01a1b]">
          <RotateCcw className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-lg font-bold text-slate-900">Returns &amp; Replacements</h2>
          <p className="text-[13px] text-slate-500">Track your return, refund and replacement requests.</p>
        </div>
      </div>

      {loading ? (
        <div className="grid place-items-center py-16 text-slate-400"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : returns.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 py-16 text-center">
          <Package className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 font-semibold text-slate-700">No returns yet</p>
          <p className="mt-1 text-sm text-slate-500">When you request a return, it will appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {returns.map((r) => {
            const st = returnStatusStyle(r.status);
            return (
              <div key={r.id} className="rounded-2xl border border-slate-200 p-4 transition-shadow hover:shadow-sm">
                <div className="flex items-start gap-3">
                  <img src={r.productImage || '/assets/images/placeholder.png'} alt="" className="h-16 w-16 shrink-0 rounded-xl object-cover" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[12px] font-bold text-slate-900">{r.returnId}</span>
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${st.bg} ${st.text}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />{r.status}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-sm font-semibold text-slate-800">{r.productName}</p>
                    <p className="text-xs text-slate-500">Order #{r.orderCode} · Qty {r.quantity}</p>
                    <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[12.5px] text-slate-500">
                      <span>Reason: <span className="font-medium text-slate-700">{reasonLabel(r.reason)}</span></span>
                      <span>Resolution: <span className="font-medium text-slate-700">{r.resolution === 'REFUND' ? 'Refund' : 'Replacement'}</span></span>
                      <span>
                        {r.resolution === 'REFUND' ? 'Refund' : 'Replacement value'}:{' '}
                        <span className="font-semibold text-slate-800">{money(r.resolution === 'REFUND' ? (r.refundAmount ?? r.itemAmount) : (r.replacementValue ?? r.itemAmount), r.currency)}</span>
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                  <span className="text-[12px] text-slate-400">Requested on {fmtDate(r.createdAt)}</span>
                  <button onClick={() => setDetailId(r.id)} className="rounded-full border border-slate-200 px-4 py-1.5 text-[13px] font-semibold text-slate-700 transition-colors hover:bg-slate-50">
                    View Details
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {detailId && <ReturnDetailModal returnId={detailId} onClose={() => setDetailId(null)} onChanged={load} />}
    </div>
  );
}

function ReturnDetailModal({ returnId, onClose, onChanged }: { returnId: string; onClose: () => void; onChanged: () => void }) {
  const [rec, setRec] = useState<ReturnRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await returnService.getMyReturn(returnId);
        setRec(res.data);
      } catch { setRec(null); }
      finally { setLoading(false); }
    })();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [returnId, onClose]);

  const cancel = async () => {
    if (!rec) return;
    try {
      setCancelling(true);
      await returnService.cancelMyReturn(rec.id);
      showSuccessToast('Return cancelled', 'Your request has been cancelled.');
      onChanged();
      onClose();
    } catch (e: any) {
      showErrorToast('Failed', e?.response?.data?.message || 'Could not cancel.');
    } finally {
      setCancelling(false);
    }
  };

  const st = rec ? returnStatusStyle(rec.status) : null;
  const canCancel = rec && ['Pending Review', 'Under Review'].includes(rec.status);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-end justify-center bg-slate-900/50 p-0 backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 bg-gradient-to-br from-[#faf7f3] to-white p-5">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#e01a1b]/10 text-[#e01a1b]"><RotateCcw className="h-5 w-5" /></span>
            <div>
              <h3 className="text-base font-bold text-slate-900">{rec?.returnId || 'Return details'}</h3>
              <div className="mt-0.5 flex items-center gap-2">
                {rec && <p className="text-[12px] text-slate-500">Order #{rec.orderCode}</p>}
                {st && rec && <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${st.bg} ${st.text}`}><span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />{rec.status}</span>}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="-mr-1 -mt-1 rounded-full p-2 text-slate-400 hover:bg-white hover:text-slate-700"><X className="h-5 w-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="grid place-items-center py-16 text-slate-400"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : !rec ? (
            <p className="py-10 text-center text-sm text-slate-500">Could not load this return.</p>
          ) : (
            <>
              <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
                <img src={rec.productImage || '/assets/images/placeholder.png'} alt="" className="h-14 w-14 rounded-lg object-cover" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-800">{rec.productName}</p>
                  <p className="text-xs text-slate-500">Qty {rec.quantity} · {money(rec.itemAmount, rec.currency)}</p>
                </div>
              </div>

              <dl className="mt-4 space-y-2.5 text-sm">
                <Row label="Requested on" value={fmtDateTime(rec.createdAt)} />
                <Row label="Last updated" value={fmtDateTime(rec.updatedAt)} />
                <Row label="Order" value={`#${rec.orderCode}`} />
                <Row label="Reason" value={reasonLabel(rec.reason)} />
                {rec.reasonNote && <Row label="Note" value={rec.reasonNote} />}
                <Row label="Resolution" value={rec.resolution === 'REFUND' ? 'Refund' : 'Replacement'} />
                {rec.resolution === 'REFUND' && (
                  <>
                    <Row label="Refund method" value={rec.refundMethod === 'UPI'
                      ? `UPI · ${rec.upiId}`
                      : rec.paymentMethodLabel ? `Original · ${rec.paymentMethodLabel}` : 'Original payment method'} />
                    <Row label="Refund amount" value={money(rec.refundAmount ?? rec.itemAmount, rec.currency)} strong />
                    {rec.paymentReference && <Row label="Payment reference" value={rec.paymentReference} />}
                  </>
                )}
                {rec.resolution === 'REPLACEMENT' && (
                  <Row label="Replacement value" value={money(rec.replacementValue ?? rec.itemAmount, rec.currency)} strong />
                )}
                {rec.rejectionReason && <Row label="Reason for decision" value={rec.rejectionReason} />}
              </dl>

              {rec.evidenceImages?.length > 0 && (
                <div className="mt-4">
                  <p className="mb-2 text-[13px] font-semibold text-slate-700">Evidence</p>
                  <div className="flex flex-wrap gap-2">
                    {rec.evidenceImages.map((src, i) => (
                      <button key={i} type="button" onClick={() => openDoc(src, `Evidence ${i + 1}`, true)}
                        className="overflow-hidden rounded-lg border border-slate-200 transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[#e01a1b]/40">
                        <img src={src} alt={`Evidence ${i + 1}`} className="h-16 w-16 object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {rec.resolution === 'REPLACEMENT' && ['Replacement Approved', 'Replacement Pending', 'Replacement Completed'].includes(rec.status) && (
                <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50/60 p-3 text-[13px] text-emerald-900/80">
                  <p className="flex items-center gap-1.5 font-semibold text-emerald-800"><ShieldCheck className="h-4 w-4" /> Replacement entitlement active</p>
                  <p className="mt-1">Worth {money(rec.replacementValue ?? rec.itemAmount, rec.currency)} — usable on a future eligible order per M2C replacement rules.</p>
                </div>
              )}

              {/* Timeline */}
              <div className="mt-5">
                <p className="mb-3 text-[13px] font-semibold text-slate-700">Activity</p>
                <ol className="relative space-y-4 border-l border-slate-200 pl-5">
                  {(rec.statusHistory || []).map((h, i) => {
                    const hs = returnStatusStyle(h.status);
                    return (
                      <li key={i} className="relative">
                        <span className={`absolute -left-[23px] top-1 h-3 w-3 rounded-full ring-4 ring-white ${hs.dot}`} />
                        <p className="text-[12px] text-slate-400">{fmtDateTime(h.at)}</p>
                        <p className={`text-sm font-semibold ${hs.text}`}>{h.status}</p>
                        {h.note && <p className="text-[12.5px] text-slate-500">{h.note}</p>}
                      </li>
                    );
                  })}
                </ol>
              </div>
            </>
          )}
        </div>

        {canCancel && (
          <div className="shrink-0 border-t border-slate-100 p-4">
            <button onClick={cancel} disabled={cancelling}
              className="w-full rounded-full border border-red-200 py-2.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50">
              {cancelling ? 'Cancelling…' : 'Cancel this request'}
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="text-slate-500">{label}</dt>
      <dd className={`text-right ${strong ? 'text-base font-bold text-slate-900' : 'font-medium text-slate-800'}`}>{value}</dd>
    </div>
  );
}
