"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { Star, Loader2, MessageSquare, CheckCircle2, XCircle, Package, ChevronLeft, ChevronRight } from "lucide-react";
import { orderService } from "@/services/orderService";
import { showErrorToast } from "@/lib/toast-utils";

type ReviewsPayload = Awaited<ReturnType<typeof orderService.getVendorReviews>>["data"];
type Pagination = Awaited<ReturnType<typeof orderService.getVendorReviews>>["pagination"];

const PAGE_SIZE = 20;

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
    } catch (err: any) {
      if (controller.signal.aborted) return;
      showErrorToast(err.message || "Failed to load reviews");
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
    return <div className="p-8 text-center text-gray-500">Reviews unavailable right now.</div>;
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
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reviews & Ratings</h1>
        <p className="text-sm text-gray-600 mt-1">
          Feedback from the admin hub on every delivery you&apos;ve made.
        </p>
      </div>

      {/* Overall Rating Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1 flex flex-col items-center justify-center text-center border-b md:border-b-0 md:border-r border-gray-200 pb-6 md:pb-0 md:pr-6">
            {hasRating ? (
              <>
                <div className="text-5xl font-bold text-gray-900 mb-2">
                  {overall.rating?.toFixed(1)}
                </div>
                <div className="flex items-center gap-0.5 mb-2">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star
                      key={n}
                      className={`h-5 w-5 ${
                        n <= Math.round(overall.rating ?? 0)
                          ? "text-yellow-400 fill-yellow-400"
                          : "text-gray-300"
                      }`}
                    />
                  ))}
                </div>
                <p className="text-sm text-gray-500">
                  Based on {overall.ratingCount} rated review{overall.ratingCount === 1 ? "" : "s"}
                </p>
              </>
            ) : (
              <>
                <Star className="h-10 w-10 text-gray-300 mb-3" />
                <p className="text-sm font-semibold text-gray-700">No rating yet</p>
                <p className="text-xs text-gray-500 mt-1">
                  Your rating will appear here once the admin hub reviews a delivery.
                </p>
              </>
            )}
          </div>

          <div className="md:col-span-2">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Rating distribution</h3>
            <div className="space-y-2">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = overall.distribution[String(star) as "1" | "2" | "3" | "4" | "5"] || 0;
                const total = overall.ratingCount || 0;
                const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                return (
                  <div key={star} className="flex items-center gap-3 text-sm">
                    <span className="w-8 text-right font-medium text-gray-700">{star}★</span>
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-yellow-400 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-12 text-right text-xs text-gray-500">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Filter + List */}
      <div className={`bg-white rounded-xl shadow-sm border border-gray-200 ${pageLoading ? "opacity-60 pointer-events-none" : ""}`}>
        <div className="p-4 border-b border-gray-200 flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-lg font-semibold text-gray-900">
            {overall.totalReviews} review{overall.totalReviews === 1 ? "" : "s"}
          </h2>
          <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden text-sm">
            {(["all", "approved", "rejected"] as const).map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setFilter(opt)}
                className={`px-4 py-1.5 font-medium capitalize ${
                  filter === opt
                    ? "bg-gray-900 text-white"
                    : "bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        {filteredReviews.length === 0 ? (
          <div className="p-12 text-center">
            <MessageSquare className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">
              {filter === "all"
                ? "No reviews yet. Feedback will appear here after the admin hub reviews a delivery."
                : `No ${filter} reviews.`}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {filteredReviews.map((r) => {
              const firstItem = r.order.items[0];
              const extra = r.order.items.length > 1 ? ` +${r.order.items.length - 1} more` : "";
              return (
                <li key={r.id} className="p-5">
                  <div className="flex items-start justify-between gap-4 flex-wrap mb-3">
                    <div className="flex items-center gap-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full ${
                          r.approved
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
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
                                  : "text-gray-300"
                              }`}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-gray-500">
                      {r.reviewedAt
                        ? new Date(r.reviewedAt).toLocaleString("en-IN")
                        : new Date(r.createdAt).toLocaleString("en-IN")}
                    </div>
                  </div>

                  <Link
                    href={`/vendor/dashboard/orders/view/${r.shipment?.id ?? r.order.id}`}
                    className="text-sm text-gray-700 hover:underline flex items-center gap-1.5 mb-2"
                  >
                    <Package className="h-4 w-4 text-gray-500" />
                    <span className="font-semibold">{r.order.orderId}</span>
                    <span className="text-gray-500">
                      &middot; {firstItem?.productName || "Order"}{extra}
                    </span>
                  </Link>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {r.reviewComments && (
                      <div>
                        <p className="text-xs font-semibold text-gray-600 mb-0.5">Review</p>
                        <p className="text-sm text-gray-800 whitespace-pre-wrap">{r.reviewComments}</p>
                      </div>
                    )}
                    {r.qualityCheckNotes && (
                      <div>
                        <p className="text-xs font-semibold text-gray-600 mb-0.5">Quality Notes</p>
                        <p className="text-sm text-gray-800 whitespace-pre-wrap">{r.qualityCheckNotes}</p>
                      </div>
                    )}
                    {!r.approved && r.rejectionReason && (
                      <div className="md:col-span-2 bg-red-50 border border-red-200 rounded-md p-3">
                        <p className="text-xs font-semibold text-red-800 mb-0.5">Reason for rejection</p>
                        <p className="text-sm text-red-800 whitespace-pre-wrap">{r.rejectionReason}</p>
                        {r.returnToVendor && (
                          <p className="text-xs text-red-700 italic mt-1">Order will be returned to you.</p>
                        )}
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              Page {pagination.page} of {pagination.totalPages}
            </p>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => goToPage(page - 1)}
                className="p-1.5 rounded-md text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Previous page"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                disabled={page >= pagination.totalPages}
                onClick={() => goToPage(page + 1)}
                className="p-1.5 rounded-md text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Next page"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
