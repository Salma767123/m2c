"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { Star, Loader2, MessageSquare, CheckCircle2, XCircle, Package, ChevronLeft, ChevronRight } from "lucide-react";
import { orderService } from "@/services/orderService";
import { showErrorToast } from "@/lib/toast-utils";

type ReviewsPayload = Awaited<ReturnType<typeof orderService.getVendorReviews>>["data"];
type Pagination = Awaited<ReturnType<typeof orderService.getVendorReviews>>["pagination"];

const PAGE_SIZE = 10;

function getPageRange(current: number, total: number): Array<number | '…'> {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: Array<number | '…'> = [1];
  if (current > 4) pages.push('…');
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let p = start; p <= end; p++) pages.push(p);
  if (current < total - 3) pages.push('…');
  pages.push(total);
  return pages;
}

export default function VendorReviewsPage() {
  const [data, setData] = useState<ReviewsPayload | null>(null);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageLoading, setPageLoading] = useState(false);
  const [filter, setFilter] = useState<"all" | "approved" | "rejected">("all");
  const [page, setPage] = useState(1);
  const abortRef = useRef<AbortController | null>(null);

  const fetchReviews = useCallback(async (p: number, silent = false) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      if (!silent) setLoading(true);
      else setPageLoading(true);
      const res = await orderService.getVendorReviews({ page: p, limit: PAGE_SIZE });
      if (controller.signal.aborted) return;
      if (res.success) {
        setData(res.data);
        setPagination(res.pagination);
      }
    } catch (err) {
      if (controller.signal.aborted) return;
      showErrorToast(err instanceof Error ? err.message : "Failed to load reviews");
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
        setPageLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchReviews(page, page > 1);
    return () => abortRef.current?.abort();
  }, [page, fetchReviews]);

  const goToPage = (p: number) => setPage(p);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!data) {
    return <div className="p-8 text-center text-slate-500">Reviews unavailable right now.</div>;
  }

  const { overall, reviews } = data;
  const hasRating = typeof overall.rating === "number" && overall.ratingCount > 0;

  const filteredReviews =
    filter === "all"
      ? reviews
      : filter === "approved"
      ? reviews.filter((r) => r.approved)
      : reviews.filter((r) => !r.approved);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h1 className="text-xl font-bold text-slate-900">Reviews & Ratings</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Feedback from the admin hub on every delivery you&apos;ve made.
        </p>
      </div>

      {/* Overall Rating Card */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1 flex flex-col items-center justify-center text-center border-b md:border-b-0 md:border-r border-slate-200 pb-6 md:pb-0 md:pr-6">
            {hasRating ? (
              <>
                <div className="text-5xl font-bold text-slate-900 mb-2">
                  {overall.rating?.toFixed(1)}
                </div>
                <div className="flex items-center gap-0.5 mb-2">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star
                      key={n}
                      className={`h-5 w-5 ${
                        n <= Math.round(overall.rating ?? 0)
                          ? "text-yellow-400 fill-yellow-400"
                          : "text-slate-300"
                      }`}
                    />
                  ))}
                </div>
                <p className="text-sm text-slate-500">
                  Based on {overall.ratingCount} rated review{overall.ratingCount === 1 ? "" : "s"}
                </p>
              </>
            ) : (
              <>
                <Star className="h-10 w-10 text-slate-300 mb-3" />
                <p className="text-sm font-semibold text-slate-700">No rating yet</p>
                <p className="text-xs text-slate-500 mt-1">
                  Your rating will appear here once the admin hub reviews a delivery.
                </p>
              </>
            )}
          </div>

          <div className="md:col-span-2">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Rating distribution</h3>
            <div className="space-y-2">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = overall.distribution[String(star) as "1" | "2" | "3" | "4" | "5"] || 0;
                const total = overall.ratingCount || 0;
                const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                return (
                  <div key={star} className="flex items-center gap-3 text-sm">
                    <span className="w-8 text-right font-medium text-slate-700">{star}★</span>
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-yellow-400 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-12 text-right text-xs text-slate-500">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Results summary */}
      {pagination && pagination.total > 0 && (
        <div className="flex items-center justify-between gap-4 flex-wrap text-sm text-slate-600">
          <span>
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, pagination.total)} of {pagination.total} review{pagination.total === 1 ? '' : 's'}
          </span>
        </div>
      )}

      {/* Filter + List */}
      <div className={`bg-white rounded-xl shadow-sm border border-slate-200 ${pageLoading ? "opacity-60 pointer-events-none" : ""}`}>
        <div className="p-4 border-b border-slate-200 flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-lg font-semibold text-slate-900">
            {overall.totalReviews} review{overall.totalReviews === 1 ? "" : "s"}
          </h2>
          <div className="inline-flex rounded-lg border border-slate-200 overflow-hidden text-sm">
            {(["all", "approved", "rejected"] as const).map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setFilter(opt)}
                className={`px-4 py-1.5 font-medium capitalize ${
                  filter === opt
                    ? "bg-brand-500 text-white"
                    : "bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        {filteredReviews.length === 0 ? (
          <div className="p-12 text-center">
            <MessageSquare className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500">
              {filter === "all"
                ? "No reviews yet. Feedback will appear here after the admin hub reviews a delivery."
                : `No ${filter} reviews.`}
            </p>
          </div>
        ) : (
          <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
            {filteredReviews.map((r) => {
              const firstItem = r.order.items[0];
              const extra = r.order.items.length > 1 ? ` +${r.order.items.length - 1} more` : "";
              return (
                <div key={r.id} className={`rounded-xl border p-4 transition-colors ${
                  r.approved ? 'border-slate-200 bg-slate-50/50 hover:border-slate-300' : 'border-red-200 bg-red-50/30 hover:border-red-300'
                }`}>
                  {/* Top row: status + stars + date */}
                  <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full border ${
                          r.approved
                            ? "bg-green-50 text-green-700 border-green-200"
                            : "bg-red-50 text-red-700 border-red-200"
                        }`}
                      >
                        {r.approved ? (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        ) : (
                          <XCircle className="h-3.5 w-3.5" />
                        )}
                        {r.approved ? "Approved" : "Rejected"}
                      </span>
                      {typeof r.rating === "number" && r.rating > 0 && (
                        <div className="flex items-center gap-0.5" aria-label={`${r.rating} out of 5 stars`}>
                          {[1, 2, 3, 4, 5].map((n) => (
                            <Star
                              key={n}
                              className={`h-4 w-4 ${
                                n <= (r.rating ?? 0)
                                  ? "text-yellow-400 fill-yellow-400"
                                  : "text-slate-300"
                              }`}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                    <span className="text-xs text-slate-400">
                      {new Date(r.reviewedAt || r.createdAt).toLocaleString("en-IN", {
                        day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}
                    </span>
                  </div>

                  {/* Order link */}
                  <Link
                    href={`/vendor/dashboard/orders/view/${r.shipment?.id ?? r.order.id}`}
                    className="inline-flex items-center gap-1.5 text-sm text-slate-700 hover:text-slate-900 transition-colors mb-3 group"
                  >
                    <Package className="h-3.5 w-3.5 text-slate-400 group-hover:text-slate-600" />
                    <span className="font-semibold group-hover:underline">{r.order.orderId}</span>
                    <span className="text-slate-500 text-xs">
                      &middot; {firstItem?.productName || "Order"}{extra}
                    </span>
                  </Link>

                  {/* Review content */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {r.reviewComments && (
                      <div className="bg-white rounded-lg p-3 border border-slate-100">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Review</p>
                        <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">{r.reviewComments}</p>
                      </div>
                    )}
                    {r.qualityCheckNotes && (
                      <div className="bg-white rounded-lg p-3 border border-slate-100">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Quality Notes</p>
                        <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">{r.qualityCheckNotes}</p>
                      </div>
                    )}
                    {!r.approved && r.rejectionReason && (
                      <div className="md:col-span-2 bg-red-50 border border-red-200 rounded-lg p-3">
                        <p className="text-xs font-semibold text-red-700 uppercase tracking-wide mb-1">Rejection Reason</p>
                        <p className="text-sm text-red-800 whitespace-pre-wrap leading-relaxed">{r.rejectionReason}</p>
                        {r.returnToVendor ? (
                          <p className="text-xs text-red-600 italic mt-2 flex items-center gap-1">
                            <XCircle className="h-3 w-3" />
                            Order will be returned to you.
                          </p>
                        ) : null}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-end gap-3 text-sm px-5 py-3 border-t border-slate-200">
            <div className="flex items-center gap-1">
              <button onClick={() => goToPage(page - 1)} disabled={page <= 1} className="p-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed" aria-label="Previous page"><ChevronLeft className="w-4 h-4" /></button>
              {getPageRange(page, pagination.totalPages).map((p, i) => p === '…' ? (<span key={`e-${i}`} className="px-2 text-slate-400">…</span>) : (<button key={`p-${p}`} onClick={() => goToPage(p as number)} aria-current={p === page ? 'page' : undefined} className={`min-w-9 h-9 px-2 rounded-lg text-sm font-medium transition-colors ${p === page ? 'bg-brand-500 text-white' : 'text-slate-700 hover:bg-slate-100'}`}>{p}</button>))}
              <button onClick={() => goToPage(page + 1)} disabled={page >= pagination.totalPages} className="p-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed" aria-label="Next page"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
