'use client';

import { useState, useEffect } from 'react';
import {
  X, Loader2, User, ShoppingBag, RotateCcw, CreditCard, Package,
  CheckCircle, XCircle, Clock, ShieldCheck, AlertCircle, History,
} from 'lucide-react';
import { formatPrice } from '@/lib/currency';
import { openDoc } from '@/lib/docViewerBus';
import { returnService, reasonLabel, returnStatusStyle, type ReturnRequest } from '@/services/returnService';

const money = (n: number, c?: string) => formatPrice(n || 0, c === 'USD' ? 'USD' : 'INR');
const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const fmtDateTime = (d?: string) => d
  ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })
  : '—';

export default function ReturnDetailPanel({
  id, canManage, onClose, onChanged, notifySuccess, notifyError,
}: {
  id: string;
  canManage: boolean;
  onClose: () => void;
  onChanged: () => void;
  notifySuccess: (m: string) => void;
  notifyError: (m: string) => void;
}) {
  const [rec, setRec] = useState<ReturnRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  const load = async () => {
    try {
      const res = await returnService.getReturnAdmin(id);
      setRec(res.data);
    } catch { setRec(null); }
    finally { setLoading(false); }
  };
  useEffect(() => {
    load();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const act = async (fn: () => Promise<any>, successMsg: string) => {
    try {
      setBusy(true);
      await fn();
      notifySuccess(successMsg);
      await load();
      onChanged();
    } catch (e: any) {
      notifyError(e?.response?.data?.message || 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const approve = () => act(() => returnService.decideReturn(rec!.id, 'approve'), 'Return approved');
  const markUnderReview = () => act(() => returnService.decideReturn(rec!.id, 'under_review'), 'Marked under review');
  const doReject = () => {
    if (!rejectionReason.trim()) { notifyError('A rejection reason is required.'); return; }
    act(() => returnService.decideReturn(rec!.id, 'reject', { rejectionReason: rejectionReason.trim() }), 'Return rejected')
      .then(() => { setShowReject(false); setRejectionReason(''); });
  };
  const complete = (status: string) => act(() => returnService.advanceStatus(rec!.id, status), 'Status updated');

  const st = rec ? returnStatusStyle(rec.status) : null;

  // Which actions are available for the current status.
  const decidable = rec && ['Pending Review', 'Under Review'].includes(rec.status);
  const canRefundComplete = rec && rec.status === 'Refund Processing';
  const canReplacementComplete = rec && rec.status === 'Replacement Pending';

  return (
    <div className="fixed inset-0 z-[200] flex justify-end bg-slate-900/50 backdrop-blur-sm" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="flex h-full w-full max-w-2xl flex-col bg-slate-50 shadow-2xl">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white p-5">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#e01a1b]/10 text-[#e01a1b]"><RotateCcw className="h-5 w-5" /></span>
            <div>
              <h2 className="text-base font-bold text-slate-900">{rec?.returnId || 'Return'}</h2>
              {rec && st && (
                <span className={`mt-0.5 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${st.bg} ${st.text}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />{rec.status}
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X className="h-5 w-5" /></button>
        </div>

        {loading ? (
          <div className="grid flex-1 place-items-center text-slate-400"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : !rec ? (
          <div className="grid flex-1 place-items-center text-sm text-slate-500">Could not load this return.</div>
        ) : (
          <>
            <div className="flex-1 space-y-4 overflow-y-auto p-5">
              {/* Product */}
              <Section title="Return request" icon={<RotateCcw className="h-4 w-4" />}>
                <div className="flex items-center gap-3">
                  <img src={rec.productImage || '/assets/images/placeholder.png'} alt="" className="h-16 w-16 rounded-lg object-cover" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-800">{rec.productName}</p>
                    <p className="text-xs text-slate-500">Qty {rec.quantity} · {money(rec.itemAmount, rec.currency)}{rec.size ? ` · ${rec.size}` : ''}{rec.color ? ` · ${rec.color}` : ''}</p>
                  </div>
                </div>
                <dl className="mt-3 space-y-2 text-sm">
                  <Row label="Requested on" value={fmtDateTime(rec.createdAt)} />
                  <Row label="Last updated" value={fmtDateTime(rec.updatedAt)} />
                  <Row label="Reason" value={reasonLabel(rec.reason)} />
                  {rec.reasonNote && <Row label="Customer note" value={rec.reasonNote} />}
                  <Row label="Resolution" value={rec.resolution === 'REFUND' ? 'Refund' : 'Replacement'} />
                </dl>
                {rec.evidenceImages?.length > 0 && (
                  <div className="mt-3">
                    <p className="mb-2 text-[12px] font-semibold text-slate-600">Evidence ({rec.evidenceImages.length})</p>
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
              </Section>

              {/* Customer */}
              <Section title="Customer information" icon={<User className="h-4 w-4" />}>
                <dl className="space-y-2 text-sm">
                  <Row label="Name" value={rec.customerName || '—'} />
                  <Row label="Email" value={rec.customerEmail || '—'} />
                  <Row label="Phone" value={rec.customerPhone || '—'} />
                  <Row label="Customer ID" value={rec.customerId} mono />
                  <Row label="Total returns" value={String(rec.customerReturnCount ?? 1)} />
                </dl>
                {rec.customerHistory && rec.customerHistory.length > 0 && (
                  <div className="mt-3 rounded-lg bg-slate-50 p-3">
                    <p className="mb-1.5 text-[12px] font-semibold text-slate-600">Previous returns</p>
                    <ul className="space-y-1">
                      {rec.customerHistory.map((h) => (
                        <li key={h.id} className="flex items-center justify-between text-[12.5px] text-slate-600">
                          <span className="truncate">{h.returnId} · {h.productName}</span>
                          <span className="ml-2 shrink-0 text-slate-400">{h.status}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </Section>

              {/* Order */}
              <Section title="Order information" icon={<ShoppingBag className="h-4 w-4" />}>
                <dl className="space-y-2 text-sm">
                  <Row label="Order ID" value={rec.orderCode} />
                  <Row label="Order date" value={fmtDate(rec.order?.createdAt)} />
                  <Row label="Delivered on" value={fmtDate(rec.order?.actualDelivery)} />
                  <Row label="Payment" value={`${rec.order?.paymentMethod || '—'} · ${rec.order?.paymentStatus || '—'}`} />
                  <Row label="Order total" value={rec.order ? money(rec.order.totalAmount, rec.currency) : '—'} />
                </dl>
              </Section>

              {/* Refund / Replacement info */}
              {rec.resolution === 'REFUND' ? (
                <Section title="Refund information" icon={<CreditCard className="h-4 w-4" />}>
                  <dl className="space-y-2 text-sm">
                    <Row label="Refund amount" value={money(rec.refundAmount ?? rec.itemAmount, rec.currency)} strong />
                    <Row label="Method" value={rec.refundMethod === 'UPI'
                      ? `UPI · ${rec.upiId}`
                      : rec.paymentMethodLabel ? `Original · ${rec.paymentMethodLabel}` : 'Original payment method'} />
                    <Row label="Gateway status" value={rec.refundStatus || '—'} />
                    {rec.paymentReference && <Row label="Payment reference" value={rec.paymentReference} mono />}
                  </dl>
                </Section>
              ) : (
                <Section title="Replacement information" icon={<Package className="h-4 w-4" />}>
                  <dl className="space-y-2 text-sm">
                    <Row label="Replacement value" value={money(rec.replacementValue ?? rec.itemAmount, rec.currency)} strong />
                    <Row label="Entitlement" value={rec.replacementEntitlementId ? 'Recorded in customer account' : 'Not yet created'} />
                  </dl>
                </Section>
              )}

              {rec.rejectionReason && (
                <div className="rounded-xl border border-red-100 bg-red-50/60 p-3 text-[13px] text-red-700">
                  <p className="font-semibold">Rejection reason</p>
                  <p className="mt-0.5">{rec.rejectionReason}</p>
                </div>
              )}

              {/* Timeline */}
              <Section title="Activity timeline" icon={<History className="h-4 w-4" />}>
                <ol className="relative space-y-4 border-l border-slate-200 pl-5">
                  {(rec.statusHistory || []).map((h, i) => {
                    const hs = returnStatusStyle(h.status);
                    return (
                      <li key={i} className="relative">
                        <span className={`absolute -left-[23px] top-1 h-3 w-3 rounded-full ring-4 ring-slate-50 ${hs.dot}`} />
                        <p className="text-[12px] text-slate-400">{fmtDateTime(h.at)}{h.by ? ` · ${h.by}` : ''}</p>
                        <p className={`text-sm font-semibold ${hs.text}`}>{h.status}</p>
                        {h.note && <p className="text-[12.5px] text-slate-500">{h.note}</p>}
                      </li>
                    );
                  })}
                </ol>
              </Section>
            </div>

            {/* Actions */}
            {canManage && (decidable || canRefundComplete || canReplacementComplete) && (
              <div className="shrink-0 border-t border-slate-200 bg-white p-4">
                {showReject ? (
                  <div>
                    <label className="mb-1 block text-[13px] font-semibold text-slate-700">Rejection reason <span className="text-red-500">*</span></label>
                    <textarea value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} rows={2}
                      placeholder="e.g. Evidence does not support the requested return."
                      className="w-full rounded-lg border border-slate-200 p-2.5 text-sm outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100" />
                    <div className="mt-2 flex gap-2">
                      <button onClick={() => { setShowReject(false); setRejectionReason(''); }} disabled={busy}
                        className="flex-1 rounded-lg border border-slate-200 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
                      <button onClick={doReject} disabled={busy}
                        className="flex-1 rounded-lg bg-red-600 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60">
                        {busy ? 'Rejecting…' : 'Confirm Rejection'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-2">
                    {decidable && (
                      <>
                        <button onClick={approve} disabled={busy}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
                          <CheckCircle className="h-4 w-4" /> Approve
                        </button>
                        <button onClick={() => setShowReject(true)} disabled={busy}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60">
                          <XCircle className="h-4 w-4" /> Reject
                        </button>
                        {rec.status === 'Pending Review' && (
                          <button onClick={markUnderReview} disabled={busy}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60">
                            <Clock className="h-4 w-4" /> Mark Under Review
                          </button>
                        )}
                      </>
                    )}
                    {canRefundComplete && (
                      <button onClick={() => complete('Refund Completed')} disabled={busy}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
                        <CheckCircle className="h-4 w-4" /> Mark Refund Completed
                      </button>
                    )}
                    {canReplacementComplete && (
                      <button onClick={() => complete('Replacement Completed')} disabled={busy}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
                        <ShieldCheck className="h-4 w-4" /> Mark Replacement Completed
                      </button>
                    )}
                  </div>
                )}
                {rec.refundStatus === 'MANUAL' && canRefundComplete && (
                  <p className="mt-2 flex items-center gap-1.5 text-[12px] text-amber-600"><AlertCircle className="h-3.5 w-3.5" /> This refund needs manual processing (COD/unpaid or gateway unavailable).</p>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="mb-3 flex items-center gap-2 text-[13px] font-bold uppercase tracking-wide text-slate-500">
        <span className="text-slate-400">{icon}</span>{title}
      </p>
      {children}
    </div>
  );
}

function Row({ label, value, strong, mono }: { label: string; value: string; strong?: boolean; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="shrink-0 text-slate-500">{label}</dt>
      <dd className={`text-right ${strong ? 'text-base font-bold text-slate-900' : 'font-medium text-slate-800'} ${mono ? 'font-mono text-[12px]' : ''} break-all`}>{value}</dd>
    </div>
  );
}
