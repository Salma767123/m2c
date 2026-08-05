"use client";

import { useState, useEffect, useCallback } from "react";
import { Star, Search, Eye, AlertCircle, RefreshCw, Package, ChevronLeft, ChevronRight, MessageSquare, CheckCircle, XCircle, Percent } from "lucide-react";
import { Card, CardContent } from "../../UI/Card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../UI/Table";
import Dropdown from "../../UI/Dropdown";
import DateRangeCalendar, { fmtDate } from "@/components/Shared/DateRangeCalendar";
import adminReviewService, { AdminOrderReview } from "@/services/adminReviewService";
import { hasPermission } from "@/lib/auth";
import { formatOrderAmount } from "@/lib/currency";

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

interface VendorProductReview {
  id: string;
  orderId: string;
  vendorName: string;
  productName: string;
  productSKU: string;
  reviewedDate: string;
  status: "approved" | "rejected";
  rating: number;
  reviewComments: string;
  qualityCheckNotes: string;
  rejectionReason?: string;
  customerName: string;
  orderDate: string;
  totalAmount: number;
  // Carried from the parent Order: order items are priced in whatever currency the
  // buyer was charged, so the amount cannot be rendered as ₹ unconditionally.
  currency?: 'INR' | 'USD';
  exchangeRate?: number | null;
  quantity: number;
  productImage: string;
}

export default function VendorProductReviews() {
  const [reviews, setReviews] = useState<VendorProductReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedReview, setSelectedReview] = useState<VendorProductReview | null>(null);
  const [stats, setStats] = useState({ total: 0, approved: 0, rejected: 0, averageRating: 0 });
  const [currentPage, setCurrentPage] = useState(1);

  // Fetch the FULL review set (no status/search params) so the metric cards
  // reflect global totals. Search + status + date filtering is applied
  // client-side below, so clicking a card never shrinks the other counts.
  const fetchReviews = useCallback(async () => {
    try {
      setLoading(true);
      const response = await adminReviewService.getAllAdminReviews({
        limit: 100,
      });

      if (response.success) {
        // Transform API data to match our display format (one entry per order item)
        const transformed: VendorProductReview[] = [];

        response.data.forEach((adminReview: AdminOrderReview) => {
          const order = adminReview.order;
          if (!order) return;

          order.items.forEach((item) => {
            transformed.push({
              id: `${adminReview.id}_${item.id}`,
              orderId: order.orderId,
              vendorName: item.vendorName,
              productName: item.productName,
              productSKU: item.sku,
              reviewedDate: adminReview.reviewedAt || adminReview.createdAt,
              status: adminReview.approved ? "approved" : "rejected",
              rating: adminReview.rating || 0,
              reviewComments: adminReview.reviewComments || "",
              qualityCheckNotes: adminReview.qualityCheckNotes || "",
              rejectionReason: adminReview.rejectionReason || undefined,
              customerName: order.customerName,
              orderDate: order.orderDate,
              totalAmount: item.totalPrice,
              currency: order.currency,
              exchangeRate: order.exchangeRate,
              quantity: item.quantity,
              productImage: item.productImage || "",
            });
          });
        });

        setReviews(transformed);
        setStats(response.stats);
      }
    } catch (error) {
      console.error("Error fetching admin reviews:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const filteredReviews = reviews.filter(review => {
    const matchesSearch = review.vendorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      review.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      review.productSKU.toLowerCase().includes(searchTerm.toLowerCase()) ||
      review.orderId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === "all" || review.status === filterStatus;

    // Reviewed-date range filter (YYYY-MM-DD strings compare lexicographically)
    let matchesDate = true;
    if (dateFrom || dateTo) {
      const rd = review.reviewedDate ? fmtDate(new Date(review.reviewedDate)) : "";
      if (!rd) matchesDate = false;
      else if (dateFrom && rd < dateFrom) matchesDate = false;
      else if (dateTo && rd > dateTo) matchesDate = false;
    }

    return matchesSearch && matchesFilter && matchesDate;
  });

  const applyStatus = (key: string) => setFilterStatus((prev) => (prev === key ? "all" : key));

  // Metric cards — styled like the Vendor Product Requests module. The first
  // three filter the table; the last two are read-only derived metrics.
  const approvalRate = stats.total > 0 ? Math.round((stats.approved / stats.total) * 100) : 0;
  const metricCards = [
    { key: "all",      label: "Total Reviews", subtitle: "All reviews",   value: stats.total,    Icon: MessageSquare, iconBg: "bg-brand-50",   iconColor: "text-brand-500",   countColor: "text-slate-900",  activeClass: "border-brand-400 bg-brand-50/50" },
    { key: "approved", label: "Approved",      subtitle: "Passed QC",     value: stats.approved, Icon: CheckCircle,   iconBg: "bg-emerald-50", iconColor: "text-emerald-500", countColor: "text-emerald-700", activeClass: "border-emerald-400 bg-emerald-50/60" },
    { key: "rejected", label: "Rejected",      subtitle: "Failed QC",     value: stats.rejected, Icon: XCircle,       iconBg: "bg-red-50",     iconColor: "text-red-500",     countColor: "text-red-700",    activeClass: "border-red-400 bg-red-50/60" },
    { key: null,       label: "Approval Rate", subtitle: "Of all reviews", value: `${approvalRate}%`, Icon: Percent, iconBg: "bg-blue-50",    iconColor: "text-blue-500",    countColor: "text-blue-700",   activeClass: "" },
    { key: null,       label: "Avg. Rating",   subtitle: "Out of 5",      value: stats.averageRating ? stats.averageRating.toFixed(1) : "0.0", Icon: Star, iconBg: "bg-amber-50", iconColor: "text-amber-500", countColor: "text-amber-700", activeClass: "" },
  ];

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus, dateFrom, dateTo]);

  // Pagination
  const totalPages = Math.ceil(filteredReviews.length / PAGE_SIZE);
  const paginatedReviews = filteredReviews.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const getStatusBadge = (status: string) => {
    const styles = {
      approved: "bg-green-50 text-green-700 border border-green-200",
      rejected: "bg-red-50 text-red-700 border border-red-200",
    };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${star <= rating ? "fill-yellow-400 text-yellow-400" : "text-slate-300"
              }`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900">Vendor Product Reviews</h1>
        <p className="text-sm text-slate-500">Quality check reviews given by admin after receiving products from vendors</p>
      </div>

      {/* Stats — click the first three cards to filter the table below */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        {metricCards.map(({ key, label, subtitle, value, Icon, iconBg, iconColor, countColor, activeClass }) => {
          const clickable = key !== null;
          const isActive = clickable && filterStatus === key;
          const body = (
            <>
              <div className="flex flex-row items-center justify-between px-3.5 pt-3 pb-1">
                <span className="text-[13px] font-medium text-slate-500">{label}</span>
                <div className={`p-1.5 rounded-lg ${isActive ? iconBg.replace("50", "100") : iconBg} transition-transform duration-150 ${clickable ? "group-hover:scale-110" : ""}`}>
                  <Icon className={`h-4 w-4 ${iconColor}`} />
                </div>
              </div>
              <div className="px-3.5 pb-3">
                <div className={`text-xl font-bold ${countColor}`}>{value}</div>
                <p className="text-[11px] text-slate-400 mt-0.5">{subtitle}</p>
              </div>
            </>
          );
          return clickable ? (
            <button
              key={label}
              type="button"
              onClick={() => applyStatus(key)}
              className={`text-left bg-white border rounded-2xl shadow-xs transition-all duration-200 hover:shadow-sm group ${isActive ? activeClass : "border-slate-200/80 hover:border-slate-300"}`}
            >
              {body}
            </button>
          ) : (
            <div key={label} className="bg-white border border-slate-200/80 rounded-2xl shadow-xs">
              {body}
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-5 w-5 z-10" />
              <input
                type="text"
                placeholder="Search by vendor, product name, order ID, or SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500/40 focus:border-transparent"
              />
            </div>
            <div className="w-full md:w-48">
              <Dropdown
                value={filterStatus}
                options={[
                  { value: "all", label: "All Status" },
                  { value: "approved", label: "Approved" },
                  { value: "rejected", label: "Rejected" }
                ]}
                onChange={(val) => setFilterStatus(val as string)}
                placeholder="Filter by status"
              />
            </div>
            <div className="shrink-0">
              <DateRangeCalendar
                from={dateFrom}
                to={dateTo}
                onChange={(from, to) => { setDateFrom(from); setDateTo(to); }}
                placeholder="Reviewed Date"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reviews Table */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <RefreshCw className="h-8 w-8 animate-spin text-slate-400 mx-auto mb-3" />
            <p className="text-slate-500">Loading reviews...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
          <Table>
            <TableHeader className="!bg-brand-500/[0.06] !border-0 [&_tr]:border-b [&_tr]:border-brand-100/50 [&_th]:!text-brand-500/60 [&_th]:font-bold [&_th]:text-[10px] [&_th]:uppercase [&_th]:tracking-wider [&_th]:h-11 [&_th]:px-4">
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Order ID</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Reviewed Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedReviews.length > 0 ? (
                paginatedReviews.map((review) => (
                  <TableRow key={review.id} className="hover:bg-slate-50/60 transition-colors duration-150 border-b border-slate-100 last:border-0">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {review.productImage ? (
                          <img
                            src={review.productImage}
                            alt={review.productName}
                            className="w-12 h-12 object-cover rounded border border-slate-200"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-slate-100 rounded border border-slate-200 flex items-center justify-center">
                            <Package className="w-6 h-6 text-slate-400" />
                          </div>
                        )}
                        <div>
                          <div className="font-medium text-slate-900">{review.productName}</div>
                          <div className="text-sm text-slate-500">SKU: {review.productSKU}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-slate-900">{review.vendorName}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-mono text-slate-900">{review.orderId}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {renderStars(review.rating)}
                        <span className="text-sm text-slate-600">({review.rating})</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(review.status)}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-slate-900">
                        {new Date(review.reviewedDate).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-slate-500">
                        {new Date(review.reviewedDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                      </div>
                    </TableCell>
                    <TableCell>
                      {hasPermission('vendor_product_reviews:view') && (
                        <button
                          onClick={() => setSelectedReview(review)}
                          className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Eye className="h-4 w-4" />
                          View
                        </button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7}>
                    <div className="p-12 text-center">
                      <AlertCircle className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                      <p className="text-slate-500 text-lg font-medium mb-2">No reviews found</p>
                      <p className="text-slate-400 text-sm">
                        {reviews.length === 0
                          ? "Admin reviews will appear here after quality checks are completed during order processing."
                          : "Try adjusting your search or filter criteria."}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          </div>
        )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-3 text-sm px-4 py-3 border-t border-slate-100">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="p-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {getPageRange(currentPage, totalPages).map((p, i) =>
              p === '…' ? (
                <span key={`e-${i}`} className="px-2 text-slate-400">…</span>
              ) : (
                <button
                  key={`p-${p}`}
                  onClick={() => setCurrentPage(p as number)}
                  aria-current={p === currentPage ? 'page' : undefined}
                  className={`min-w-9 h-9 px-2 rounded-lg text-sm font-medium transition-colors ${p === currentPage ? 'bg-brand-500 text-white shadow-xs shadow-brand-500/20' : 'text-slate-700 hover:bg-slate-100'}`}
                >
                  {p}
                </button>
              )
            )}
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="p-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Next page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
      </div>

      {/* Detail Modal */}
      {selectedReview && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200">
              <div className="flex justify-between items-start">
                <div className="flex items-start gap-4">
                  {selectedReview.productImage ? (
                    <img
                      src={selectedReview.productImage}
                      alt={selectedReview.productName}
                      className="w-24 h-24 object-cover rounded-lg border border-slate-200"
                    />
                  ) : (
                    <div className="w-24 h-24 bg-slate-100 rounded-lg border border-slate-200 flex items-center justify-center">
                      <Package className="w-10 h-10 text-slate-400" />
                    </div>
                  )}
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">{selectedReview.productName}</h2>
                    <p className="text-sm text-slate-500 mt-1">SKU: {selectedReview.productSKU}</p>
                    <p className="text-sm text-slate-500">Order ID: {selectedReview.orderId}</p>
                    <div className="mt-2">{getStatusBadge(selectedReview.status)}</div>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedReview(null)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Rating */}
              <div className="bg-slate-50 p-4 rounded-lg">
                <label className="text-sm font-semibold text-slate-700 block mb-2">Quality Rating</label>
                <div className="flex items-center gap-3">
                  {renderStars(selectedReview.rating)}
                  <span className="text-lg font-bold text-slate-900">
                    {selectedReview.rating}/5
                  </span>
                </div>
              </div>

              {/* Review Comments */}
              <div>
                <label className="text-sm font-semibold text-slate-700 block mb-2">Review Comments</label>
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <p className="text-slate-900">{selectedReview.reviewComments || "No comments provided"}</p>
                </div>
              </div>

              {/* Quality Check Notes */}
              <div>
                <label className="text-sm font-semibold text-slate-700 block mb-2">Quality Check Notes</label>
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <p className="text-slate-900">{selectedReview.qualityCheckNotes || "No notes provided"}</p>
                </div>
              </div>

              {/* Rejection Reason */}
              {selectedReview.rejectionReason && (
                <div>
                  <label className="text-sm font-semibold text-red-700 block mb-2">Rejection Reason</label>
                  <div className="bg-red-50 p-4 rounded-lg border border-red-300">
                    <p className="text-red-900 font-medium">{selectedReview.rejectionReason}</p>
                  </div>
                </div>
              )}

              {/* Order & Vendor Details */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200">
                <div>
                  <label className="text-sm font-medium text-slate-700">Vendor</label>
                  <p className="text-slate-900 font-medium">{selectedReview.vendorName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Customer</label>
                  <p className="text-slate-900 font-medium">{selectedReview.customerName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Quantity</label>
                  <p className="text-slate-900">{selectedReview.quantity} units</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Amount</label>
                  <p className="text-slate-900 font-medium">
                    {(() => {
                      const { charged, inrEquivalent } = formatOrderAmount(
                        selectedReview.totalAmount, selectedReview.currency, selectedReview.exchangeRate);
                      return (<>{charged}{inrEquivalent && (
                        <span className="block text-xs font-normal text-slate-500">≈ {inrEquivalent}</span>
                      )}</>);
                    })()}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Order Date</label>
                  <p className="text-slate-900">{new Date(selectedReview.orderDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Reviewed Date</label>
                  <p className="text-slate-900">{new Date(selectedReview.reviewedDate).toLocaleString()}</p>
                </div>
              </div>

              {/* Close Button */}
              <div className="flex justify-end pt-4 border-t border-slate-200">
                <button
                  onClick={() => setSelectedReview(null)}
                  className="px-6 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
