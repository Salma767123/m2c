"use client";

import { useEffect, useState } from "react";
import { X, Star, CheckCircle2, Clock, MessageSquare } from "lucide-react";
import { settlementService, SettlementReviewContext } from "@/services/settlementService";
import { adminReviewService } from "@/services/adminReviewService";
import { showSuccessToast, showErrorToast } from "@/lib/toast-utils";

interface Props {
  open: boolean;
  settlementId: string | null;
  onClose: () => void;
  onSubmitted?: () => void;
}

// "20 Sep 2026, 10:20 AM" — or null-safe dash.
const fmtDateTime = (iso?: string | null): string => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    day: "numeric", month: "short", year: "numeric",
    hour: "numeric", minute: "2-digit", hour12: true,
  });
};

const fmtMins = (mins?: number | null): string => {
  if (mins == null || !isFinite(mins)) return "";
  if (mins < 1) return "under a minute";
  const total = Math.round(mins);
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} hr` : `${h} hr ${m} min`;
};

/**
 * The vendor-delivery review, shown when a settlement is settled. Surfaces the
 * customer's feedback for the order and the vendor's order-acceptance time so the
 * admin can rate the vendor with full context. Reusable — opened right after a
 * settlement is marked Paid, or re-opened from the settlement row.
 */
export default function VendorDeliveryReviewModal({ open, settlementId, onClose, onSubmitted }: Props) {
  const [ctx, setCtx] = useState<SettlementReviewContext | null>(null);
  const [loading, setLoading] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [review, setReview] = useState("");
  const [qcNotes, setQcNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !settlementId) return;
    let cancelled = false;
    setLoading(true);
    setCtx(null);
    setRating(0); setReview(""); setQcNotes("");
    settlementService.getReviewContext(settlementId)
      .then((res) => {
        if (cancelled) return;
        setCtx(res.data);
        // Prefill from an existing review, if one was already given.
        if (res.data.existingReview) {
          setRating(res.data.existingReview.rating || 0);
          setReview(res.data.existingReview.reviewComments || "");
          setQcNotes(res.data.existingReview.qualityCheckNotes || "");
        }
      })
      .catch((e: any) => { if (!cancelled) showErrorToast(e?.error || e?.message || "Failed to load review details"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open, settlementId]);

  if (!open) return null;

  const shipmentId = ctx?.shipmentId || null;
  const alreadyReviewed = !!ctx?.existingReview?.reviewedAt;

  const handleSubmit = async () => {
    if (!shipmentId) { showErrorToast("No vendor shipment is linked to this settlement."); return; }
    if (rating === 0) { showErrorToast("Please provide a rating"); return; }
    if (!review.trim()) { showErrorToast("Please provide a review"); return; }
    setSubmitting(true);
    try {
      await adminReviewService.createOrUpdateShipmentReview(shipmentId, {
        rating,
        reviewComments: review.trim(),
        qualityCheckNotes: qcNotes.trim() || undefined,
        approved: true,
      });
      showSuccessToast("Vendor review saved");
      onSubmitted?.();
      onClose();
    } catch (e: any) {
      showErrorToast(e?.message || "Failed to save review");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Review Vendor Delivery</h2>
            <p className="text-sm text-slate-600 mt-1">Settlement complete — rate the vendor for this order</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <X className="h-5 w-5 text-slate-600" />
          </button>
        </div>

        {loading ? (
          <div className="p-10 text-center text-slate-500">Loading review details…</div>
        ) : !ctx ? (
          <div className="p-10 text-center text-red-500">Could not load review details.</div>
        ) : (
          <>
            <div className="p-6 space-y-6">
              {/* Order / vendor + acceptance time */}
              <div className="bg-slate-50 p-4 rounded-lg space-y-1.5">
                <h3 className="text-sm font-semibold text-slate-900 mb-1">Reviewing Delivery From Vendor</h3>
                <p className="text-sm text-slate-600">Order ID: {ctx.settlement.orderDisplayId}</p>
                <p className="text-sm text-slate-600">Vendor: {ctx.settlement.vendorName}</p>
                <p className="text-sm text-slate-600 flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-slate-400" />
                  Order accepted: <span className="font-medium text-slate-800">{fmtDateTime(ctx.vendorAcceptedAt)}</span>
                  {ctx.acceptanceMins != null && (
                    <span className="text-slate-400">({fmtMins(ctx.acceptanceMins)} after order)</span>
                  )}
                </p>
              </div>

              {/* Customer feedback for this order */}
              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 mb-2">
                  <MessageSquare className="h-4 w-4 text-slate-400" /> Customer Feedback for this Order
                </label>
                {ctx.customerReviews.length === 0 ? (
                  <p className="text-sm text-slate-400 italic bg-slate-50 rounded-lg p-3">
                    The customer has not left a review for this order yet.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {ctx.customerReviews.map((cr) => (
                      <div key={cr.id} className="rounded-lg border border-slate-200 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold text-slate-800 truncate">{cr.productName}</span>
                          <span className="flex items-center gap-0.5 shrink-0">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star key={s} className={`h-3.5 w-3.5 ${s <= cr.rating ? "fill-yellow-400 text-yellow-400" : "text-slate-300"}`} />
                            ))}
                          </span>
                        </div>
                        {cr.comment && <p className="mt-1 text-sm text-slate-600">{cr.comment}</p>}
                        {cr.images?.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {cr.images.map((img, i) => (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img key={i} src={img} alt="" className="h-14 w-14 rounded-lg object-cover border border-slate-200" />
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {alreadyReviewed && (
                <p className="flex items-center gap-1.5 text-sm text-emerald-700 bg-emerald-50 rounded-lg p-3">
                  <CheckCircle2 className="h-4 w-4" /> You already reviewed this vendor on {fmtDateTime(ctx.existingReview?.reviewedAt)}. Submitting will update it.
                </p>
              )}

              {/* Vendor rating */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Your Rating for the Vendor <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button key={star} type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoveredRating(star)}
                      onMouseLeave={() => setHoveredRating(0)}
                      className="focus:outline-none transition-transform hover:scale-110">
                      <Star className={`h-8 w-8 ${star <= (hoveredRating || rating) ? "fill-yellow-400 text-yellow-400" : "text-slate-300"}`} />
                    </button>
                  ))}
                  {rating > 0 && <span className="ml-2 text-sm text-slate-600 self-center">{rating} out of 5</span>}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Review <span className="text-red-500">*</span>
                </label>
                <textarea value={review} onChange={(e) => setReview(e.target.value)} rows={4}
                  placeholder="Describe the quality of the product received, packaging, condition, timeliness, etc."
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500/40 focus:border-transparent resize-none" />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Quality Check Notes (Optional)</label>
                <textarea value={qcNotes} onChange={(e) => setQcNotes(e.target.value)} rows={3}
                  placeholder="Any additional notes or issues to communicate to the vendor"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500/40 focus:border-transparent resize-none" />
              </div>
            </div>

            <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
              <button onClick={onClose}
                className="px-6 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium">
                {alreadyReviewed ? "Close" : "Skip for now"}
              </button>
              <button onClick={handleSubmit} disabled={submitting || !shipmentId}
                className="px-6 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors font-medium disabled:opacity-60 disabled:cursor-not-allowed">
                {submitting ? "Saving…" : alreadyReviewed ? "Update Review" : "Submit Review"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
