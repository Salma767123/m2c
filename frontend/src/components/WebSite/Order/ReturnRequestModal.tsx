'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X, Check, Loader2, Camera, Trash2, RefreshCw, Package,
  ShieldCheck, CreditCard, Smartphone, RotateCcw, AlertCircle, ChevronLeft,
} from 'lucide-react';
import { formatPrice } from '@/lib/currency';
import {
  RETURN_REASONS, returnService,
  type ReturnResolution, type RefundMethod,
} from '@/services/returnService';

interface ModalItem {
  id: string;
  name: string;
  image?: string;
  quantity: number;
  price: number;
  size?: string;
  color?: string;
}
interface ModalOrder {
  id: string;
  orderNumber: string;
  currency?: 'INR' | 'USD';
  items: ModalItem[];
  paymentStatus?: string;
}

const UPI_RE = /^[a-zA-Z0-9._-]{2,256}@[a-zA-Z][a-zA-Z0-9]{1,64}$/;
const MAX_PHOTOS = 2;

type StepId = 'reason' | 'evidence' | 'resolution' | 'refund' | 'review';

export default function ReturnRequestModal({
  open, order, onClose, onSubmitted,
}: {
  open: boolean;
  order: ModalOrder | null;
  onClose: () => void;
  onSubmitted?: (returnId: string) => void;
}) {
  const [stepIdx, setStepIdx] = useState(0);
  const [itemId, setItemId] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [reasonNote, setReasonNote] = useState('');
  const [photos, setPhotos] = useState<{ id: string; dataUri: string }[]>([]);
  const [resolution, setResolution] = useState<ReturnResolution | ''>('');
  const [refundMethod, setRefundMethod] = useState<RefundMethod | ''>('');
  const [upiId, setUpiId] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<{ returnId: string } | null>(null);
  const [error, setError] = useState('');

  const panelRef = useRef<HTMLDivElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const money = (n: number) => formatPrice(n, order?.currency === 'USD' ? 'USD' : 'INR');

  // Reset everything ONLY when the modal transitions closed → open. Keying this
  // off `order` identity too was the bug: after a successful submit, onSubmitted
  // refetches the order list, the parent re-renders with a new `order` object
  // (OrderHistory passes an inline object), the effect re-fired, and it wiped
  // `submitted` back to null + step back to 1 — so the form reappeared instead
  // of the success screen. A ref tracks the open edge so re-renders can't reset.
  const wasOpenRef = useRef(false);
  useEffect(() => {
    if (open && !wasOpenRef.current) {
      wasOpenRef.current = true;
      setStepIdx(0);
      setItemId(order && order.items.length === 1 ? order.items[0].id : '');
      setReason(''); setReasonNote(''); setPhotos([]); setResolution('');
      setRefundMethod(''); setUpiId(''); setConfirmed(false);
      setSubmitting(false); setSubmitted(null); setError('');
    } else if (!open) {
      wasOpenRef.current = false;
    }
  }, [open, order]);

  // Scroll lock + Escape close.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !submitting) onClose(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [open, submitting, onClose]);

  const selectedItem = useMemo(
    () => order?.items.find((i) => i.id === itemId) || null,
    [order, itemId],
  );
  const reasonMeta = RETURN_REASONS.find((r) => r.code === reason);
  const evidenceRequired = !!reasonMeta?.requiresEvidence;

  // Steps are dynamic — the refund-details step only exists for refunds.
  const steps: { id: StepId; label: string }[] = useMemo(() => {
    const base: { id: StepId; label: string }[] = [
      { id: 'reason', label: 'Reason' },
      { id: 'evidence', label: 'Evidence' },
      { id: 'resolution', label: 'Resolution' },
    ];
    if (resolution === 'REFUND') base.push({ id: 'refund', label: 'Refund Details' });
    base.push({ id: 'review', label: 'Review' });
    return base;
  }, [resolution]);

  const currentStep = steps[Math.min(stepIdx, steps.length - 1)]?.id;

  // ── Photo handling (File → base64 data URI) ──
  const addFiles = (files: FileList | null) => {
    if (!files) return;
    setError('');
    const room = MAX_PHOTOS - photos.length;
    Array.from(files).slice(0, room).forEach((file) => {
      if (!file.type.startsWith('image/')) return;
      if (file.size > 8 * 1024 * 1024) { setError('Each photo must be under 8 MB.'); return; }
      const reader = new FileReader();
      reader.onload = () => {
        const dataUri = String(reader.result || '');
        if (dataUri) setPhotos((p) => (p.length >= MAX_PHOTOS ? p : [...p, { id: `${Date.now()}-${Math.round(Math.random() * 1e6)}`, dataUri }]));
      };
      reader.readAsDataURL(file);
    });
  };
  const removePhoto = (id: string) => setPhotos((p) => p.filter((x) => x.id !== id));

  // ── Per-step validation ──
  const canContinue = (): string | null => {
    if (currentStep === 'reason') {
      if (!itemId) return 'Please select the item you want to return.';
      if (!reason) return 'Please select a return reason.';
      if (reason === 'other' && !reasonNote.trim()) return 'Please describe your reason.';
      return null;
    }
    if (currentStep === 'evidence') {
      if (evidenceRequired && photos.length < 2) return 'Please upload at least 2 clear photos.';
      return null;
    }
    if (currentStep === 'resolution') {
      if (!resolution) return 'Please choose refund or replacement.';
      return null;
    }
    if (currentStep === 'refund') {
      if (!refundMethod) return 'Please choose a refund method.';
      if (refundMethod === 'UPI' && !UPI_RE.test(upiId.trim())) return 'Please enter a valid UPI ID (e.g. name@bank).';
      return null;
    }
    if (currentStep === 'review') {
      if (!confirmed) return 'Please confirm the information is accurate.';
      return null;
    }
    return null;
  };

  const next = () => {
    const err = canContinue();
    if (err) { setError(err); return; }
    setError('');
    setStepIdx((i) => Math.min(i + 1, steps.length - 1));
  };
  const back = () => { setError(''); setStepIdx((i) => Math.max(i - 1, 0)); };

  const submit = async () => {
    const err = canContinue();
    if (err) { setError(err); return; }
    if (!order) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await returnService.createReturn({
        orderId: order.id,
        orderItemId: itemId,
        reason,
        reasonNote: reasonNote.trim() || undefined,
        evidenceImages: photos.map((p) => p.dataUri),
        resolution: resolution as ReturnResolution,
        refundMethod: resolution === 'REFUND' ? (refundMethod as RefundMethod) : undefined,
        upiId: resolution === 'REFUND' && refundMethod === 'UPI' ? upiId.trim() : undefined,
        confirmed,
      });
      setSubmitted({ returnId: res.data.returnId });
      onSubmitted?.(res.data.returnId);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Could not submit your request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!open || typeof document === 'undefined' || !order) return null;

  const brand = '#e01a1b';

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-end justify-center bg-slate-900/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onMouseDown={(e) => { if (e.target === e.currentTarget && !submitting) onClose(); }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        className="flex max-h-[94vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:max-h-[90vh] sm:rounded-2xl"
      >
        {/* Header */}
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 p-5 sm:p-6">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-white" style={{ backgroundColor: brand }}>
              <RotateCcw className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h2 className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
                {submitted ? 'Return request submitted' : 'Request a return'}
              </h2>
              <p className="mt-0.5 truncate text-[13px] text-slate-500">Order #{order.orderNumber}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} disabled={submitting} aria-label="Close"
            className="-mr-1 -mt-1 shrink-0 rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Progress */}
        {!submitted && (
          <div className="shrink-0 border-b border-slate-100 px-5 pb-4 pt-4 sm:px-6">
            <div className="flex items-center">
              {steps.map((s, i) => {
                const done = i < stepIdx;
                const active = i === stepIdx;
                return (
                  <div key={s.id} className="flex flex-1 items-center last:flex-none">
                    <div className="flex flex-col items-center gap-1.5">
                      <span
                        className={`grid h-7 w-7 place-items-center rounded-full text-[12px] font-bold transition-colors ${
                          done ? 'text-white' : active ? 'text-white' : 'bg-slate-100 text-slate-400'
                        }`}
                        style={done || active ? { backgroundColor: brand } : undefined}
                      >
                        {done ? <Check className="h-4 w-4" strokeWidth={3} /> : i + 1}
                      </span>
                      <span className={`hidden text-[11px] font-medium sm:block ${active ? 'text-slate-900' : 'text-slate-400'}`}>{s.label}</span>
                    </div>
                    {i < steps.length - 1 && (
                      <div className={`mx-1.5 h-0.5 flex-1 rounded-full ${i < stepIdx ? '' : 'bg-slate-100'}`} style={i < stepIdx ? { backgroundColor: brand } : undefined} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6">
          {submitted ? (
            <SuccessView returnId={submitted.returnId} onClose={onClose} />
          ) : (
            <>
              {/* STEP 1 — Item + Reason */}
              {currentStep === 'reason' && (
                <div>
                  {order.items.length > 1 && (
                    <div className="mb-5">
                      <p className="mb-2 text-sm font-semibold text-slate-800">Which item are you returning?</p>
                      <div className="space-y-2">
                        {order.items.map((it) => (
                          <button key={it.id} type="button" onClick={() => setItemId(it.id)}
                            className={`flex w-full items-center gap-3 rounded-xl border p-2.5 text-left transition-all ${
                              itemId === it.id ? 'border-[#e01a1b] bg-red-50/40 ring-1 ring-[#e01a1b]/20' : 'border-slate-200 hover:border-slate-300'
                            }`}>
                            <img src={it.image || '/assets/images/placeholder.png'} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-semibold text-slate-800">{it.name}</span>
                              <span className="block text-xs text-slate-500">Qty {it.quantity} · {money(it.price)}</span>
                            </span>
                            <span className={`h-4 w-4 shrink-0 rounded-full border-2 ${itemId === it.id ? 'border-[#e01a1b] bg-[#e01a1b]' : 'border-slate-300'}`} />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {selectedItem && order.items.length === 1 && (
                    <div className="mb-5 flex items-center gap-3 rounded-xl bg-slate-50 p-3">
                      <img src={selectedItem.image || '/assets/images/placeholder.png'} alt="" className="h-12 w-12 rounded-lg object-cover" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-800">{selectedItem.name}</p>
                        <p className="text-xs text-slate-500">Qty {selectedItem.quantity} · {money(selectedItem.price)}</p>
                      </div>
                    </div>
                  )}

                  <p className="mb-2 text-sm font-semibold text-slate-800">Reason for return <span style={{ color: brand }}>*</span></p>
                  <div className="space-y-2">
                    {RETURN_REASONS.map((r) => (
                      <button key={r.code} type="button" onClick={() => setReason(r.code)}
                        className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-all ${
                          reason === r.code ? 'border-[#e01a1b] bg-red-50/40 ring-1 ring-[#e01a1b]/20' : 'border-slate-200 hover:border-slate-300'
                        }`}>
                        <span className={`grid h-4 w-4 shrink-0 place-items-center rounded-full border-2 ${reason === r.code ? 'border-[#e01a1b]' : 'border-slate-300'}`}>
                          {reason === r.code && <span className="h-2 w-2 rounded-full" style={{ backgroundColor: brand }} />}
                        </span>
                        <span className="font-medium text-slate-800">{r.label}</span>
                        {r.requiresEvidence && <span className="ml-auto text-[11px] font-medium text-slate-400">Photos needed</span>}
                      </button>
                    ))}
                  </div>
                  {reason === 'other' && (
                    <textarea value={reasonNote} onChange={(e) => setReasonNote(e.target.value)} rows={3}
                      className="mt-3 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-[#e01a1b] focus:ring-2 focus:ring-[#e01a1b]/15"
                      placeholder="Tell us what went wrong…" />
                  )}
                  {reason && reason !== 'other' && (
                    <textarea value={reasonNote} onChange={(e) => setReasonNote(e.target.value)} rows={2}
                      className="mt-3 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-[#e01a1b] focus:ring-2 focus:ring-[#e01a1b]/15"
                      placeholder="Add a note (optional)" />
                  )}
                </div>
              )}

              {/* STEP 2 — Evidence */}
              {currentStep === 'evidence' && (
                <div>
                  <p className="text-sm font-semibold text-slate-800">Upload evidence {evidenceRequired && <span style={{ color: brand }}>*</span>}</p>
                  <p className="mt-1 text-[13px] text-slate-500">
                    {evidenceRequired
                      ? 'Please upload at least 2 clear photos so we can review your request.'
                      : 'Clear photos help us review your request faster. (Optional)'}
                  </p>

                  <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4">
                    {photos.map((p, idx) => (
                      <div key={p.id} className="group relative aspect-square overflow-hidden rounded-xl border border-slate-200">
                        <img src={p.dataUri} alt={`Evidence ${idx + 1}`} className="h-full w-full object-cover" />
                        <span className="absolute left-1 top-1 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold text-white">Photo {idx + 1} ✓</span>
                        <button type="button" onClick={() => removePhoto(p.id)}
                          className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-white/90 text-red-600 shadow transition-transform hover:scale-110">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                    {photos.length < MAX_PHOTOS && (
                      <button type="button" onClick={() => fileRef.current?.click()}
                        className="grid aspect-square place-items-center rounded-xl border-2 border-dashed border-slate-300 text-slate-400 transition-colors hover:border-[#e01a1b] hover:text-[#e01a1b]">
                        <span className="flex flex-col items-center gap-1">
                          <Camera className="h-5 w-5" />
                          <span className="text-[11px] font-medium">Add photo</span>
                        </span>
                      </button>
                    )}
                  </div>
                  <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />

                  <p className="mt-3 text-[12px] text-slate-400">
                    {evidenceRequired
                      ? `${photos.length} of ${MAX_PHOTOS} photos added (2 required)`
                      : `${photos.length} of ${MAX_PHOTOS} photos added (optional)`}
                  </p>
                </div>
              )}

              {/* STEP 3 — Resolution */}
              {currentStep === 'resolution' && (
                <div>
                  <p className="text-sm font-semibold text-slate-800">How would you like us to resolve this?</p>
                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <ResolutionCard
                      active={resolution === 'REFUND'} onClick={() => setResolution('REFUND')}
                      icon={<CreditCard className="h-5 w-5" />} title="Refund"
                      desc="Get your eligible amount back." amount={selectedItem ? money(selectedItem.price) : undefined} brand={brand} />
                    <ResolutionCard
                      active={resolution === 'REPLACEMENT'} onClick={() => setResolution('REPLACEMENT')}
                      icon={<Package className="h-5 w-5" />} title="Replacement"
                      desc="Request a replacement for the item." amount={selectedItem ? money(selectedItem.price) : undefined} brand={brand} />
                  </div>

                  {resolution === 'REPLACEMENT' && selectedItem && (
                    <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50/60 p-4">
                      <p className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
                        <ShieldCheck className="h-4 w-4" /> Replacement selected
                      </p>
                      <p className="mt-1.5 text-[13px] leading-relaxed text-emerald-900/80">
                        We&rsquo;ll review your return request first. Once approved, your replacement entitlement will be recorded in your M2C account. When you make your next eligible purchase, this replacement can be added to that order according to M2C replacement rules.
                      </p>
                      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-[13px]">
                        <span className="text-emerald-900/70">Replacement value: <span className="font-semibold text-emerald-900">{money(selectedItem.price)}</span></span>
                        <span className="text-emerald-900/70">Status: <span className="font-semibold text-emerald-900">Pending approval</span></span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 4 — Refund details */}
              {currentStep === 'refund' && (
                <div>
                  <p className="text-sm font-semibold text-slate-800">Where should we send your refund?</p>
                  <p className="mt-1 text-[13px] text-slate-500">This refund will be processed securely through our payment provider.</p>

                  <div className="mt-4 space-y-3">
                    <button type="button" onClick={() => setRefundMethod('ORIGINAL')}
                      className={`flex w-full items-start gap-3 rounded-xl border p-4 text-left transition-all ${
                        refundMethod === 'ORIGINAL' ? 'border-[#e01a1b] bg-red-50/40 ring-1 ring-[#e01a1b]/20' : 'border-slate-200 hover:border-slate-300'
                      }`}>
                      <CreditCard className="mt-0.5 h-5 w-5 shrink-0 text-slate-500" />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-slate-800">Refund to original payment method</span>
                        <span className="mt-0.5 block text-[12.5px] text-slate-500">Securely refunded to the account you paid with.</span>
                      </span>
                      <span className={`mt-1 h-4 w-4 shrink-0 rounded-full border-2 ${refundMethod === 'ORIGINAL' ? 'border-[#e01a1b] bg-[#e01a1b]' : 'border-slate-300'}`} />
                    </button>

                    <button type="button" onClick={() => setRefundMethod('UPI')}
                      className={`flex w-full items-start gap-3 rounded-xl border p-4 text-left transition-all ${
                        refundMethod === 'UPI' ? 'border-[#e01a1b] bg-red-50/40 ring-1 ring-[#e01a1b]/20' : 'border-slate-200 hover:border-slate-300'
                      }`}>
                      <Smartphone className="mt-0.5 h-5 w-5 shrink-0 text-slate-500" />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-slate-800">Refund to UPI</span>
                        <span className="mt-0.5 block text-[12.5px] text-slate-500">Get the amount to any UPI ID.</span>
                      </span>
                      <span className={`mt-1 h-4 w-4 shrink-0 rounded-full border-2 ${refundMethod === 'UPI' ? 'border-[#e01a1b] bg-[#e01a1b]' : 'border-slate-300'}`} />
                    </button>

                    {refundMethod === 'UPI' && (
                      <div className="rounded-xl bg-slate-50 p-3">
                        <label className="mb-1 block text-[12.5px] font-semibold text-slate-700">UPI ID</label>
                        <input value={upiId} onChange={(e) => setUpiId(e.target.value)}
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#e01a1b] focus:ring-2 focus:ring-[#e01a1b]/15"
                          placeholder="example@upi" />
                      </div>
                    )}
                  </div>

                  <p className="mt-4 flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-[12px] text-slate-500">
                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    For your security we never ask for your full card number, CVV or expiry. Refunds are handled entirely by our payment provider.
                  </p>
                </div>
              )}

              {/* STEP 5 — Review */}
              {currentStep === 'review' && selectedItem && (
                <div>
                  <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
                    <img src={selectedItem.image || '/assets/images/placeholder.png'} alt="" className="h-12 w-12 rounded-lg object-cover" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-800">{selectedItem.name}</p>
                      <p className="text-xs text-slate-500">Qty {selectedItem.quantity} · {money(selectedItem.price)}</p>
                    </div>
                  </div>

                  <dl className="mt-4 space-y-3 text-sm">
                    <ReviewRow label="Return reason" value={reasonMeta?.label || ''} />
                    {reasonNote.trim() && <ReviewRow label="Note" value={reasonNote.trim()} />}
                    <ReviewRow label="Evidence" value={photos.length ? `${photos.length} photo${photos.length === 1 ? '' : 's'} attached` : 'None'} />
                    <ReviewRow label="Resolution" value={resolution === 'REFUND' ? 'Refund' : 'Replacement'} />
                    {resolution === 'REFUND' && (
                      <>
                        <ReviewRow label="Refund method" value={refundMethod === 'UPI' ? `UPI · ${upiId.trim()}` : 'Original payment method'} />
                        <ReviewRow label="Refund amount" value={money(selectedItem.price)} strong />
                      </>
                    )}
                    {resolution === 'REPLACEMENT' && (
                      <ReviewRow label="Replacement value" value={money(selectedItem.price)} strong />
                    )}
                  </dl>

                  {photos.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {photos.map((p, i) => (
                        <img key={p.id} src={p.dataUri} alt={`Evidence ${i + 1}`} className="h-14 w-14 rounded-lg border border-slate-200 object-cover" />
                      ))}
                    </div>
                  )}

                  <label className="mt-4 flex cursor-pointer items-start gap-2.5 rounded-xl border border-slate-200 p-3">
                    <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)}
                      className="mt-0.5 h-4 w-4 shrink-0 accent-[#e01a1b]" />
                    <span className="text-[13px] text-slate-600">I confirm that the information provided is accurate.</span>
                  </label>
                </div>
              )}

              {error && (
                <p className="mt-4 flex items-center gap-1.5 text-[13px] text-red-600"><AlertCircle className="h-4 w-4" />{error}</p>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!submitted && (
          <div className="shrink-0 border-t border-slate-100 p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              {stepIdx > 0 ? (
                <button type="button" onClick={back} disabled={submitting}
                  className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50">
                  <ChevronLeft className="h-4 w-4" /> Back
                </button>
              ) : (
                <button type="button" onClick={onClose} disabled={submitting}
                  className="rounded-full border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50">
                  Keep Order
                </button>
              )}

              {currentStep === 'review' ? (
                <button type="button" onClick={submit} disabled={submitting}
                  className="inline-flex items-center justify-center gap-2 rounded-full px-7 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70"
                  style={{ backgroundColor: brand }}>
                  {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Submitting…</> : <>Submit Return Request</>}
                </button>
              ) : (
                <button type="button" onClick={next}
                  className="inline-flex items-center justify-center gap-2 rounded-full px-7 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5"
                  style={{ backgroundColor: brand }}>
                  Continue
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

function ResolutionCard({ active, onClick, icon, title, desc, amount, brand }: {
  active: boolean; onClick: () => void; icon: React.ReactNode; title: string; desc: string; amount?: string; brand: string;
}) {
  return (
    <button type="button" onClick={onClick}
      className={`flex flex-col items-start gap-2 rounded-2xl border p-4 text-left transition-all ${
        active ? 'border-[#e01a1b] bg-red-50/40 ring-1 ring-[#e01a1b]/20' : 'border-slate-200 hover:border-slate-300'
      }`}>
      <span className="grid h-10 w-10 place-items-center rounded-full" style={{ backgroundColor: active ? brand : '#f1f5f9', color: active ? '#fff' : '#64748b' }}>
        {icon}
      </span>
      <span className="text-sm font-bold text-slate-900">{title}</span>
      <span className="text-[12.5px] text-slate-500">{desc}</span>
      {amount && <span className="mt-0.5 text-[12.5px] font-semibold text-slate-700">{amount}</span>}
    </button>
  );
}

function ReviewRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="text-slate-500">{label}</dt>
      <dd className={`text-right ${strong ? 'text-base font-bold text-slate-900' : 'font-medium text-slate-800'}`}>{value}</dd>
    </div>
  );
}

function SuccessView({ returnId, onClose }: { returnId: string; onClose: () => void }) {
  return (
    <div className="py-4 text-center">
      <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-50 text-emerald-600">
        <Check className="h-8 w-8" strokeWidth={3} />
      </span>
      <h3 className="mt-4 text-lg font-bold text-slate-900">Return request submitted</h3>
      <div className="mx-auto mt-3 max-w-xs space-y-1.5 rounded-xl bg-slate-50 p-4 text-sm">
        <div className="flex items-center justify-between"><span className="text-slate-500">Request ID</span><span className="font-bold text-slate-900">{returnId}</span></div>
        <div className="flex items-center justify-between"><span className="text-slate-500">Status</span><span className="font-semibold text-amber-700">Pending review</span></div>
      </div>
      <p className="mx-auto mt-3 max-w-sm text-[13px] text-slate-500">We&rsquo;ll review your request and update you once a decision is made.</p>
      <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-center sm:gap-3">
        <a href="/profile?tab=returns"
          className="rounded-full border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50">
          View Return Details
        </a>
        <button type="button" onClick={onClose}
          className="rounded-full px-6 py-2.5 text-sm font-semibold text-white" style={{ backgroundColor: '#e01a1b' }}>
          Back to Orders
        </button>
      </div>
    </div>
  );
}
