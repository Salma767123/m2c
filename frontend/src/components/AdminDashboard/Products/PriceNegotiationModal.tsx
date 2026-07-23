'use client';

import { useEffect, useState } from 'react';
import { X, Loader2, IndianRupee, Handshake, FileText, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/UI/Button';
import Dropdown from '@/components/UI/Dropdown';
import NegotiationTimeline from '@/components/Shared/NegotiationTimeline';
import priceNegotiationService, {
  NEGOTIATION_REASONS,
  type NegotiationTimeline as Timeline,
} from '@/services/priceNegotiationService';
import { showSuccessToast, showErrorToast } from '@/lib/toast-utils';

/**
 * Admin "Review & Negotiate" modal — the stage between QC approval and final
 * pricing. Shows everything the admin needs to judge a price in one place
 * (product, variants, QC report link, full negotiation history) and lets them
 * accept the vendor's price, counter it, or decline.
 *
 * Setting the selling price / margin is deliberately NOT here: that happens in
 * ApproveProductModal after a price is agreed, so the two decisions stay
 * separate (what we pay the vendor vs. what we charge the customer).
 */
export default function PriceNegotiationModal({
  productId,
  productName,
  onClose,
  onChanged,
  onOpenQcReport,
}: {
  productId: string;
  productName?: string;
  onClose: () => void;
  /** Called after any successful action so the parent list can refresh. */
  onChanged?: () => void;
  onOpenQcReport?: () => void;
}) {
  const [data, setData] = useState<Timeline | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Counter-offer form
  const [price, setPrice] = useState('');
  const [reasonCode, setReasonCode] = useState('');
  const [message, setMessage] = useState('');

  // Decline is two-step: type a reason, then confirm — never a direct reject.
  const [rejectStage, setRejectStage] = useState<'idle' | 'reason' | 'confirm'>('idle');
  const [rejectReason, setRejectReason] = useState('');

  // Once a price is agreed the primary action is "Approve & Set Price", not a
  // new offer — re-opening the negotiation is a deliberate secondary step.
  const [renegotiate, setRenegotiate] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const t = await priceNegotiationService.getProductTimeline(productId);
      setData(t);
      setError('');
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Failed to load negotiation');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [productId]);

  const money = (n?: number | null) =>
    n == null ? '—' : `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const product = data?.product;
  const openOffer = data?.openOffer ?? null;
  // The admin can only respond when the vendor is the one waiting on them.
  const awaitingAdmin = data?.awaiting === 'ADMIN';
  const awaitingVendor = data?.awaiting === 'VENDOR';
  const roundsLeft = data ? data.maxRounds - data.roundsUsed : 0;
  const askPrice = product?.basePriceOriginal ?? product?.basePrice ?? null;
  // A price is settled: there's an agreed figure and no offer is on the table.
  const isAgreed = !!product?.agreedPrice && !openOffer;

  const act = async (fn: () => Promise<any>, successMsg: string) => {
    setSubmitting(true);
    setError('');
    try {
      await fn();
      showSuccessToast('Done', successMsg);
      await load();
      onChanged?.();
    } catch (e: any) {
      const msg = e?.response?.data?.error || e?.message || 'Action failed';
      setError(msg);
      showErrorToast('Failed', msg);
    } finally {
      setSubmitting(false);
    }
  };

  const sendOffer = () => {
    const p = parseFloat(price);
    if (!p || p <= 0) { setError('Enter a valid price'); return; }
    if (!reasonCode && !message.trim()) { setError('Pick a reason or write a message'); return; }

    // Opening a negotiation vs. countering the vendor's offer are different
    // endpoints; which one applies depends on who is waiting.
    if (awaitingAdmin) {
      return act(
        () => priceNegotiationService.adminRespond(productId, {
          action: 'COUNTER', counterPrice: p, reasonCode: reasonCode || undefined, message: message.trim() || undefined,
        }),
        'Counter offer sent to vendor',
      ).then(() => { setPrice(''); setMessage(''); setReasonCode(''); });
    }
    return act(
      () => priceNegotiationService.adminPropose(productId, {
        proposedPrice: p, reasonCode: reasonCode || undefined, message: message.trim() || undefined,
      }),
      'Offer sent to vendor',
    ).then(() => { setPrice(''); setMessage(''); setReasonCode(''); });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4 rounded-t-2xl">
          <div>
            <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
              <Handshake className="h-5 w-5 text-brand-500" />
              Review &amp; Negotiate Price
            </h3>
            <p className="text-sm text-slate-500">{productName || product?.name}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
          </div>
        ) : (
          <div className="space-y-6 p-6">
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
            )}

            {/* ── Pricing summary ─────────────────────────────────────── */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-100">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Vendor asked</p>
                <p className="text-lg font-bold text-slate-900">{money(askPrice)}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-100">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Current price</p>
                <p className="text-lg font-bold text-slate-900">{money(product?.basePrice)}</p>
              </div>
              <div className={`rounded-xl p-3 ring-1 ${product?.agreedPrice ? 'bg-green-50 ring-green-200' : 'bg-slate-50 ring-slate-100'}`}>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Agreed</p>
                <p className={`text-lg font-bold ${product?.agreedPrice ? 'text-green-700' : 'text-slate-400'}`}>
                  {product?.agreedPrice ? money(product.agreedPrice) : 'Not yet'}
                </p>
              </div>
            </div>

            {onOpenQcReport && (
              <button
                onClick={onOpenQcReport}
                className="inline-flex items-center gap-2 text-sm font-medium text-brand-600 hover:text-brand-700"
              >
                <FileText className="h-4 w-4" /> View QC inspection report
              </button>
            )}

            {/* ── Variants ────────────────────────────────────────────── */}
            {product?.hasVariants && !!product.variants?.length && (
              <div>
                <p className="mb-2 text-sm font-semibold text-slate-800">Variant prices (vendor)</p>
                <div className="overflow-hidden rounded-xl ring-1 ring-slate-200">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-3 py-2">Variant</th>
                        <th className="px-3 py-2">SKU</th>
                        <th className="px-3 py-2 text-right">Price</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {product.variants.map((v) => (
                        <tr key={v.id}>
                          <td className="px-3 py-2 text-slate-800">{[v.size, v.color].filter(Boolean).join(' / ') || '—'}</td>
                          <td className="px-3 py-2 font-mono text-xs text-slate-500">{v.sku}</td>
                          <td className="px-3 py-2 text-right font-semibold text-slate-900">{money(v.price)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-1.5 text-xs text-slate-500">
                  Variants scale proportionally when a price is agreed — the negotiated figure is the product-level price the vendor is paid.
                </p>
              </div>
            )}

            {/* ── Timeline ────────────────────────────────────────────── */}
            <div>
              <p className="mb-3 text-sm font-semibold text-slate-800">Negotiation history</p>
              <NegotiationTimeline
                rounds={data?.rounds || []}
                originalPrice={askPrice}
                agreedPrice={product?.agreedPrice}
                emptyHint="No offer yet. Accept the vendor's price below, or send a counter offer."
              />
            </div>

            {/* ── Actions ─────────────────────────────────────────────── */}
            <div className="rounded-xl border border-slate-200 p-4">
              {awaitingVendor ? (
                <p className="text-sm text-amber-700">
                  Waiting for the vendor to respond to your offer of <strong>{money(openOffer?.proposedPrice)}</strong>.
                  You can’t send another offer until they reply.
                </p>
              ) : (
                <>
                  <p className="mb-3 text-sm font-semibold text-slate-800">
                    {awaitingAdmin ? 'Respond to the vendor’s offer' : isAgreed ? 'Price agreed' : 'Negotiate the vendor’s price'}
                  </p>

                  {awaitingAdmin && rejectStage === 'idle' && (
                    <div className="mb-4 flex flex-wrap gap-2">
                      <Button
                        onClick={() => act(
                          () => priceNegotiationService.adminRespond(productId, { action: 'ACCEPT' }),
                          `Price agreed at ${money(openOffer?.proposedPrice)}`,
                        )}
                        disabled={submitting}
                        className="bg-green-600 text-white hover:bg-green-700"
                      >
                        Accept {money(openOffer?.proposedPrice)}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => { setError(''); setRejectStage('reason'); }}
                        disabled={submitting}
                        className="border-red-300 text-red-600 hover:bg-red-50"
                      >
                        Decline
                      </Button>
                    </div>
                  )}

                  {/* Decline step 1 — reason (required) */}
                  {awaitingAdmin && rejectStage === 'reason' && (
                    <div className="mb-4 space-y-3">
                      <p className="text-sm font-semibold text-slate-800">Why are you declining the vendor’s offer?</p>
                      <textarea
                        rows={3} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} autoFocus
                        placeholder="Give the vendor a reason — this closes the negotiation."
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-red-400 focus:ring-2 focus:ring-red-200"
                      />
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => { setRejectStage('idle'); setRejectReason(''); }}>Cancel</Button>
                        <Button
                          onClick={() => {
                            if (!rejectReason.trim()) { setError('A reason is required to decline.'); return; }
                            setError(''); setRejectStage('confirm');
                          }}
                          className="bg-red-600 text-white hover:bg-red-700"
                        >
                          Continue
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Decline step 2 — confirmation */}
                  {awaitingAdmin && rejectStage === 'confirm' && (
                    <div className="mb-4 space-y-3">
                      <div className="flex items-start gap-3 rounded-lg bg-red-50 p-3 ring-1 ring-red-200">
                        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
                        <div className="text-sm text-red-800">
                          <p className="font-semibold">Decline this offer?</p>
                          <p className="mt-0.5 text-red-700">
                            The negotiation ends without an agreed price. You can then approve at the current price or reject the product.
                          </p>
                          <p className="mt-2 rounded bg-white/60 px-2 py-1 text-red-700">“{rejectReason.trim()}”</p>
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setRejectStage('reason')} disabled={submitting}>Back</Button>
                        <Button
                          onClick={() => act(
                            () => priceNegotiationService.adminRespond(productId, { action: 'REJECT', message: rejectReason.trim() }),
                            'Offer declined',
                          ).then(() => { setRejectStage('idle'); setRejectReason(''); })}
                          disabled={submitting}
                          className="bg-red-600 text-white hover:bg-red-700"
                        >
                          {submitting ? 'Declining…' : 'Yes, decline offer'}
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Hide the counter form while the decline flow is active. */}
                  {rejectStage !== 'idle' ? null : isAgreed && !renegotiate ? (
                    // Price is settled — steer the admin to final approval and
                    // keep re-negotiation as an explicit, secondary choice.
                    <div className="text-sm text-slate-600">
                      A price of <strong className="text-slate-900">{money(product?.agreedPrice)}</strong> is agreed.
                      Close this and use <strong>Approve &amp; Set Price</strong> to publish, or{' '}
                      {roundsLeft > 0 ? (
                        <button
                          type="button"
                          onClick={() => setRenegotiate(true)}
                          className="font-medium text-brand-600 underline hover:text-brand-700"
                        >
                          re-open the negotiation
                        </button>
                      ) : (
                        <span className="text-slate-400">the negotiation limit is reached</span>
                      )}
                      .
                    </div>
                  ) : roundsLeft <= 0 ? (
                    <p className="text-sm text-amber-700">
                      Negotiation limit reached. Approve at the current price or reject the product.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                          {awaitingAdmin ? 'Counter price' : 'Proposed price'} (₹) <span className="text-brand-500">*</span>
                        </label>
                        <div className="relative">
                          <IndianRupee className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                          <input
                            type="number" min="0" step="0.01" value={price}
                            onChange={(e) => setPrice(e.target.value)}
                            placeholder={askPrice ? String(askPrice) : '0.00'}
                            className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">Reason</label>
                        {/* Shared Dropdown (same control as the rest of the app) —
                            a native <select> renders the OS menu, which ignores
                            the brand theme. */}
                        <Dropdown
                          id="negotiation-reason"
                          value={reasonCode}
                          options={NEGOTIATION_REASONS.map((r) => ({ value: r.code, label: r.label }))}
                          placeholder="Select a reason…"
                          onChange={(val) => setReasonCode(val as string)}
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">Message to vendor</label>
                        <textarea
                          rows={2} value={message} onChange={(e) => setMessage(e.target.value)}
                          placeholder="e.g. Current market demand is low. Can you reduce to this price?"
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30"
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-500">{roundsLeft} of {data?.maxRounds} rounds left</span>
                        <Button onClick={sendOffer} disabled={submitting} className="bg-brand-500 text-white hover:bg-brand-600">
                          {submitting ? 'Sending…' : awaitingAdmin ? 'Send Counter Offer' : 'Send Offer'}
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Accepting the vendor's price outright — no negotiation needed. */}
            {!openOffer && !product?.agreedPrice && (
              <p className="text-center text-xs text-slate-500">
                Happy with {money(product?.basePrice)}? Close this and use <strong>Approve &amp; Set Price</strong> to publish directly.
              </p>
            )}
            {product?.agreedPrice && (
              <div className="rounded-xl bg-green-50 px-4 py-3 text-center text-sm text-green-800 ring-1 ring-green-200">
                Price agreed. Close this and use <strong>Approve &amp; Set Price</strong> to set the margin and publish.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
