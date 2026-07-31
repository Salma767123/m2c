'use client';

import { useEffect, useState } from 'react';
import { X, Loader2, IndianRupee, Handshake, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/UI/Button';
import NegotiationTimeline from '@/components/Shared/NegotiationTimeline';
import priceNegotiationService, {
  type NegotiationTimeline as Timeline,
} from '@/services/priceNegotiationService';
import { showSuccessToast, showErrorToast } from '@/lib/toast-utils';

/**
 * Vendor price-negotiation modal, opened from a product row (mirrors how the
 * admin opens its negotiation modal from the request row). Not a standalone
 * module — it lives inside the vendor Products list.
 *
 * Reject is deliberately two-step: the vendor must type a reason, then confirm
 * in a dialog, before the offer is declined. Declining ends the negotiation, so
 * it must be a considered action rather than a stray click.
 */
const money = (n?: number | null) =>
  n == null ? '—' : `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function VendorNegotiationModal({
  productId,
  productName,
  onClose,
  onChanged,
}: {
  productId: string;
  productName?: string;
  onClose: () => void;
  onChanged?: () => void;
}) {
  const [data, setData] = useState<Timeline | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [counterPrice, setCounterPrice] = useState('');
  const [counterMsg, setCounterMsg] = useState('');

  // Reject is a small guided flow: idle → collect reason → confirm.
  const [rejectStage, setRejectStage] = useState<'idle' | 'reason' | 'confirm'>('idle');
  const [rejectReason, setRejectReason] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      setData(await priceNegotiationService.getProductTimeline(productId));
      setError('');
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Failed to load negotiation');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [productId]);

  const product = data?.product;
  const openOffer = data?.openOffer ?? null;
  const awaitingMe = data?.awaiting === 'VENDOR';
  const roundsLeft = data ? data.maxRounds - data.roundsUsed : 0;
  const askPrice = product?.basePriceOriginal ?? product?.basePrice ?? null;
  // Once the product is approved/rejected the negotiation is frozen — show the
  // history read-only rather than hiding it.
  const isFinalised = product?.approvalStatus === 'APPROVED' || product?.approvalStatus === 'REJECTED';

  const act = async (fn: () => Promise<any>, msg: string) => {
    setSubmitting(true);
    setError('');
    try {
      await fn();
      showSuccessToast('Done', msg);
      await load();
      onChanged?.();
      // Reset the reject flow after any action.
      setRejectStage('idle');
      setRejectReason('');
      setCounterPrice('');
      setCounterMsg('');
    } catch (e: any) {
      const m = e?.response?.data?.error || e?.message || 'Action failed';
      setError(m);
      showErrorToast('Failed', m);
    } finally {
      setSubmitting(false);
    }
  };

  const doAccept = () =>
    act(
      () => priceNegotiationService.vendorRespond(productId, { action: 'ACCEPT' }),
      `You accepted ${money(openOffer?.proposedPrice)}`,
    );

  const doReject = () =>
    act(
      () => priceNegotiationService.vendorRespond(productId, { action: 'REJECT', message: rejectReason.trim() }),
      'Offer declined',
    );

  const doCounter = () => {
    const p = parseFloat(counterPrice);
    if (!p || p <= 0) { setError('Enter a valid counter price'); return; }
    act(
      () => priceNegotiationService.vendorRespond(productId, {
        action: 'COUNTER', counterPrice: p, message: counterMsg.trim() || undefined,
      }),
      'Counter offer sent to admin',
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4 rounded-t-2xl">
          <div>
            <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
              <Handshake className="h-5 w-5 text-brand-500" />
              {isFinalised ? 'Negotiation History' : 'Price Negotiation'}
            </h3>
            <p className="text-sm text-slate-500">{productName || product?.name}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-brand-500" /></div>
        ) : (
          <div className="space-y-5 p-6">
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
            )}

            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-100">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">You asked</p>
                <p className="text-lg font-bold text-slate-900">{money(askPrice)}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-100">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Latest offer</p>
                <p className="text-lg font-bold text-slate-900">{money(openOffer?.proposedPrice ?? product?.basePrice)}</p>
              </div>
              <div className={`rounded-xl p-3 ring-1 ${product?.agreedPrice ? 'bg-green-50 ring-green-200' : 'bg-slate-50 ring-slate-100'}`}>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Agreed</p>
                <p className={`text-lg font-bold ${product?.agreedPrice ? 'text-green-700' : 'text-slate-400'}`}>
                  {product?.agreedPrice ? money(product.agreedPrice) : 'Not yet'}
                </p>
              </div>
            </div>

            <div>
              <p className="mb-3 text-sm font-semibold text-slate-800">History</p>
              <NegotiationTimeline
                rounds={data?.rounds || []}
                originalPrice={askPrice}
                agreedPrice={product?.agreedPrice}
              />
            </div>

            {/* ── Response controls ─────────────────────────────────────── */}
            {isFinalised ? (
              <p className={`rounded-xl px-4 py-3 text-sm ring-1 ${product?.approvalStatus === 'APPROVED' ? 'bg-green-50 text-green-800 ring-green-200' : 'bg-red-50 text-red-800 ring-red-200'}`}>
                This product is <strong>{product?.approvalStatus === 'APPROVED' ? 'approved' : 'rejected'}</strong>
                {product?.agreedPrice != null && <> at an agreed price of <strong>{money(product.agreedPrice)}</strong></>}.
                The negotiation is closed — this history is kept for your reference.
              </p>
            ) : awaitingMe && openOffer ? (
              <div className="rounded-xl border border-slate-200 p-4">
                {rejectStage === 'idle' && (
                  <>
                    <p className="mb-3 text-sm font-semibold text-slate-800">
                      Respond to the admin’s offer of {money(openOffer.proposedPrice)}
                    </p>
                    <div className="mb-4 flex flex-wrap gap-2">
                      <Button onClick={doAccept} disabled={submitting} className="bg-green-600 text-white hover:bg-green-700">
                        Accept {money(openOffer.proposedPrice)}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => { setError(''); setRejectStage('reason'); }}
                        disabled={submitting}
                        className="border-red-300 text-red-600 hover:bg-red-50"
                      >
                        Reject
                      </Button>
                    </div>

                    {roundsLeft > 0 ? (
                      <div className="space-y-3">
                        <p className="text-sm font-medium text-slate-700">…or send a counter offer</p>
                        <div className="relative">
                          <IndianRupee className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                          <input
                            type="number" min="0" step="0.01" value={counterPrice}
                            onChange={(e) => setCounterPrice(e.target.value)}
                            placeholder="Your price"
                            className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30"
                          />
                        </div>
                        <textarea
                          rows={2} value={counterMsg} onChange={(e) => setCounterMsg(e.target.value)}
                          placeholder="e.g. Cotton cost has increased — this is my minimum."
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30"
                        />
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slate-500">{roundsLeft} of {data?.maxRounds} rounds left</span>
                          <Button onClick={doCounter} disabled={submitting} className="bg-brand-500 text-white hover:bg-brand-600">
                            {submitting ? 'Sending…' : 'Send Counter Offer'}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-amber-700">Negotiation limit reached — you can accept or reject.</p>
                    )}
                  </>
                )}

                {/* Reject step 1 — reason (required) */}
                {rejectStage === 'reason' && (
                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-slate-800">Why are you declining this offer?</p>
                    <textarea
                      rows={3} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}
                      autoFocus
                      placeholder="Give the admin a reason — e.g. the offered price is below our cost."
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-red-400 focus:ring-2 focus:ring-red-200"
                    />
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => { setRejectStage('idle'); setRejectReason(''); }}>
                        Cancel
                      </Button>
                      <Button
                        onClick={() => {
                          if (!rejectReason.trim()) { setError('A reason is required to reject.'); return; }
                          setError('');
                          setRejectStage('confirm');
                        }}
                        className="bg-red-600 text-white hover:bg-red-700"
                      >
                        Continue
                      </Button>
                    </div>
                  </div>
                )}

                {/* Reject step 2 — confirmation */}
                {rejectStage === 'confirm' && (
                  <div className="space-y-3">
                    <div className="flex items-start gap-3 rounded-lg bg-red-50 p-3 ring-1 ring-red-200">
                      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
                      <div className="text-sm text-red-800">
                        <p className="font-semibold">Reject this price offer?</p>
                        <p className="mt-0.5 text-red-700">
                          The negotiation will end without an agreed price. The admin can then approve at the
                          current price or reject the product.
                        </p>
                        <p className="mt-2 rounded bg-white/60 px-2 py-1 text-red-700">“{rejectReason.trim()}”</p>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setRejectStage('reason')} disabled={submitting}>
                        Back
                      </Button>
                      <Button onClick={doReject} disabled={submitting} className="bg-red-600 text-white hover:bg-red-700">
                        {submitting ? 'Rejecting…' : 'Yes, reject offer'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : product?.agreedPrice != null ? (
              <p className="rounded-xl bg-green-50 px-4 py-3 text-sm text-green-800 ring-1 ring-green-200">
                Price agreed at <strong>{money(product.agreedPrice)}</strong>. The admin will now set the selling price and publish your product.
              </p>
            ) : data?.awaiting === 'ADMIN' ? (
              <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-amber-200">
                Your offer of <strong>{money(openOffer?.proposedPrice)}</strong> is with the admin. We’ll notify you when they respond.
              </p>
            ) : (
              <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600 ring-1 ring-slate-200">
                No open offer right now.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
