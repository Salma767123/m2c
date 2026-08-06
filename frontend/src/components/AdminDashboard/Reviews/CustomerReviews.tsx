"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { Star, Search, Eye, Trash2, CheckCircle, XCircle, RefreshCw, MessageSquare, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import DeleteConfirmModal from "../../UI/DeleteConfirmModal";
import { Card, CardContent } from "../../UI/Card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../UI/Table";
import Dropdown from "../../UI/Dropdown";
import DateRangeCalendar, { fmtDate } from "@/components/Shared/DateRangeCalendar";
import reviewService, { AdminReview } from "@/services/reviewService";
import { hasPermission } from "@/lib/auth";

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

export default function CustomerReviews() {
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedReview, setSelectedReview] = useState<AdminReview | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    averageRating: 0,
  });
  const [deleteModal, setDeleteModal] = useState<{ show: boolean; review: AdminReview | null }>({ show: false, review: null });

  const fetchReviews = useCallback(async () => {
    try {
      setCurrentPage(1);
      setLoading(true);
      const response = await reviewService.getAdminReviews({
        search: searchTerm || undefined,
        status: filterStatus !== "all" ? filterStatus : undefined,
      });
      if (response.success) {
        setReviews(response.data);
        setStats({
          ...response.stats,
          pending: response.stats.total - response.stats.approved - response.stats.rejected,
        });
      }
    } catch (error) {
      console.error("Error fetching reviews:", error);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, filterStatus]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const handleApprove = async (id: string) => {
    try {
      setActionLoading(id);
      const currentReview = reviews.find(r => r.id === id);
      const wasPending = currentReview?.status === 'PENDING';
      await reviewService.updateReviewStatus(id, true);
      setReviews(reviews.map(review =>
        review.id === id ? { ...review, isApproved: true, status: 'APPROVED' as const } : review
      ));
      setStats(prev => ({
        ...prev,
        approved: prev.approved + 1,
        pending: wasPending ? Math.max(0, prev.pending - 1) : prev.pending,
        rejected: !wasPending ? Math.max(0, prev.rejected - 1) : prev.rejected,
      }));
      if (selectedReview?.id === id) {
        setSelectedReview({ ...selectedReview, isApproved: true, status: 'APPROVED' as const });
      }
    } catch (error) {
      console.error("Error approving review:", error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id: string) => {
    try {
      setActionLoading(id);
      const currentReview = reviews.find(r => r.id === id);
      const wasPending = currentReview?.status === 'PENDING';
      await reviewService.updateReviewStatus(id, false);
      setReviews(reviews.map(review =>
        review.id === id ? { ...review, isApproved: false, status: 'REJECTED' as const } : review
      ));
      setStats(prev => ({
        ...prev,
        rejected: prev.rejected + 1,
        pending: wasPending ? Math.max(0, prev.pending - 1) : prev.pending,
        approved: !wasPending ? Math.max(0, prev.approved - 1) : prev.approved,
      }));
      if (selectedReview?.id === id) {
        setSelectedReview({ ...selectedReview, isApproved: false, status: 'REJECTED' as const });
      }
    } catch (error) {
      console.error("Error rejecting review:", error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteClick = (review: AdminReview) => {
    setDeleteModal({ show: true, review });
  };

  const confirmDelete = async () => {
    if (!deleteModal.review) return;
    const id = deleteModal.review.id;
    try {
      setActionLoading(id);
      await reviewService.deleteReview(id);
      setReviews(reviews.filter(review => review.id !== id));
      setStats(prev => ({
        ...prev,
        total: prev.total - 1,
        approved: reviews.find(r => r.id === id)?.isApproved ? prev.approved - 1 : prev.approved,
        rejected: !reviews.find(r => r.id === id)?.isApproved ? prev.rejected - 1 : prev.rejected,
      }));
      if (selectedReview?.id === id) {
        setSelectedReview(null);
      }
      setDeleteModal({ show: false, review: null });
    } catch (error) {
      console.error("Error deleting review:", error);
    } finally {
      setActionLoading(null);
    }
  };

  // Client-side review-date range filter (status/search are handled server-side).
  const displayedReviews = reviews.filter((review) => {
    if (!dateFrom && !dateTo) return true;
    const rd = review.createdAt ? fmtDate(new Date(review.createdAt)) : "";
    if (!rd) return false;
    if (dateFrom && rd < dateFrom) return false;
    if (dateTo && rd > dateTo) return false;
    return true;
  });

  // Reset to first page when the date range changes.
  useEffect(() => {
    setCurrentPage(1);
  }, [dateFrom, dateTo]);

  const applyStatus = (key: string) => setFilterStatus((prev) => (prev === key ? "all" : key));

  // Metric cards — styled like the Vendor Product Requests module. The first
  // four filter the table; Avg. Rating is a read-only derived metric.
  const metricCards = [
    { key: "all",      label: "Total Reviews", subtitle: "All reviews",           value: stats.total,    Icon: MessageSquare, iconBg: "bg-brand-50",   iconColor: "text-brand-500",   countColor: "text-slate-900",  activeClass: "border-brand-400 bg-brand-50/50" },
    { key: "pending",  label: "Pending",       subtitle: "Awaiting moderation",   value: stats.pending,  Icon: Clock,         iconBg: "bg-amber-50",   iconColor: "text-amber-500",   countColor: "text-amber-700",  activeClass: "border-amber-400 bg-amber-50/60" },
    { key: "approved", label: "Approved",      subtitle: "Published",             value: stats.approved, Icon: CheckCircle,   iconBg: "bg-emerald-50", iconColor: "text-emerald-500", countColor: "text-emerald-700", activeClass: "border-emerald-400 bg-emerald-50/60" },
    { key: "rejected", label: "Rejected",      subtitle: "Hidden",                value: stats.rejected, Icon: XCircle,       iconBg: "bg-red-50",     iconColor: "text-red-500",     countColor: "text-red-700",    activeClass: "border-red-400 bg-red-50/60" },
    { key: null,       label: "Avg. Rating",   subtitle: "Out of 5",              value: stats.averageRating ? Number(stats.averageRating).toFixed(1) : "0.0", Icon: Star, iconBg: "bg-amber-50", iconColor: "text-amber-500", countColor: "text-amber-700", activeClass: "" },
  ];

  const totalPages = Math.max(1, Math.ceil(displayedReviews.length / PAGE_SIZE));
  const paginatedReviews = displayedReviews.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-0.5">
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

  const getStatusBadge = (review: AdminReview) => {
    const s = review.status || (review.isApproved ? 'APPROVED' : 'REJECTED');
    switch (s) {
      case 'APPROVED':
        return <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">Approved</span>;
      case 'REJECTED':
        return <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">Rejected</span>;
      case 'PENDING':
      default:
        return <span className="px-2 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">Pending</span>;
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900">Customer Reviews</h1>
        <p className="text-sm text-slate-500">Manage and moderate customer product reviews</p>
      </div>

      {/* Stats */}
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
                placeholder="Search by customer name, product, or comment..."
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
                  { value: "pending", label: "Pending" },
                  { value: "approved", label: "Approved" },
                  { value: "rejected", label: "Rejected" },
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
                placeholder="Review Date"
              />
            </div>
            <button
              onClick={fetchReviews}
              className="flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
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
                <TableHead>Customer</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Comment</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedReviews.length > 0 ? (
                paginatedReviews.map((review) => (
                  <TableRow key={review.id} className="hover:bg-slate-50/60 transition-colors duration-150 border-b border-slate-100 last:border-0">
                    <TableCell>
                      <div>
                        <div className="font-medium text-slate-900">{review.user?.name || 'Unknown'}</div>
                        <div className="text-xs text-slate-500">{review.user?.email || ''}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {review.product?.images?.[0]?.url && (
                          <Image
                            src={review.product.images[0].url}
                            alt={review.product.name}
                            width={32}
                            height={32}
                            className="w-8 h-8 rounded object-cover"
                          />
                        )}
                        <div className="text-sm text-slate-900 max-w-[150px] truncate">
                          {review.product?.name || 'Unknown Product'}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {renderStars(review.rating)}
                        <span className="text-sm text-slate-600">({review.rating})</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-slate-700 max-w-xs truncate">
                        {review.comment || <span className="text-slate-400 italic">No comment</span>}
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(review)}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-slate-900">
                        {new Date(review.createdAt).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {hasPermission('customer_reviews:view') && (
                          <button
                            onClick={() => setSelectedReview(review)}
                            className="inline-flex items-center gap-1 px-2 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        )}
                        {hasPermission('customer_reviews:approve') && (
                          review.isApproved ? (
                            <button
                              onClick={() => handleReject(review.id)}
                              disabled={actionLoading === review.id}
                              className="inline-flex items-center gap-1 px-2 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                              title="Reject"
                            >
                              <XCircle className="h-4 w-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleApprove(review.id)}
                              disabled={actionLoading === review.id}
                              className="inline-flex items-center gap-1 px-2 py-1.5 text-sm font-medium text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                              title="Approve"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </button>
                          )
                        )}
                        {hasPermission('customer_reviews:delete') && (
                          <button
                            onClick={() => handleDeleteClick(review)}
                            disabled={actionLoading === review.id}
                            className="inline-flex items-center gap-1 px-2 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7}>
                    <div className="p-12 text-center">
                      <MessageSquare className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                      <p className="text-slate-500 font-medium">No reviews found</p>
                      <p className="text-slate-400 text-sm mt-1">
                        {searchTerm || filterStatus !== "all" || dateFrom || dateTo
                          ? "Try adjusting your search or filter criteria"
                          : "Customer reviews will appear here once submitted"}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          </div>
        )}

      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-3 text-sm px-4 py-3 border-t border-slate-100">
          <div className="flex items-center gap-1">
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage <= 1} className="p-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed" aria-label="Previous page"><ChevronLeft className="w-4 h-4" /></button>
            {getPageRange(currentPage, totalPages).map((p, i) => p === '…' ? (<span key={`e-${i}`} className="px-2 text-slate-400">…</span>) : (<button key={`p-${p}`} onClick={() => setCurrentPage(p as number)} aria-current={p === currentPage ? 'page' : undefined} className={`min-w-9 h-9 px-2 rounded-lg text-sm font-medium transition-colors ${p === currentPage ? 'bg-brand-500 text-white shadow-xs shadow-brand-500/20' : 'text-slate-700 hover:bg-slate-100'}`}>{p}</button>))}
            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages} className="p-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed" aria-label="Next page"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
      )}
      </div>

      {/* Detail Modal */}
      {selectedReview && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto bg-white">
            <div className="p-6 border-b border-slate-200">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Customer Review Details</h2>
                  <p className="text-sm text-slate-500 mt-1">{selectedReview.product?.name || 'Unknown Product'}</p>
                </div>
                <button
                  onClick={() => setSelectedReview(null)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              </div>
            </div>

            <CardContent className="p-6 space-y-6">
              {/* Customer Info */}
              <div className="bg-slate-50 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    {selectedReview.user?.image ? (
                      <img
                        src={selectedReview.user.image}
                        alt={selectedReview.user.name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-slate-300 flex items-center justify-center text-slate-600 font-semibold">
                        {(selectedReview.user?.name || 'U').charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <h3 className="font-semibold text-slate-900">{selectedReview.user?.name || 'Unknown'}</h3>
                      <p className="text-sm text-slate-500">{selectedReview.user?.email || ''}</p>
                    </div>
                  </div>
                  <span className="px-2 py-1 bg-blue-50 text-blue-700 border border-blue-200 text-xs rounded-full font-medium">
                    Verified Purchase
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-3">
                  {renderStars(selectedReview.rating)}
                  <span className="text-sm text-slate-600">
                    {new Date(selectedReview.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </span>
                </div>
              </div>

              {/* Product Info */}
              <div>
                <label className="text-sm font-semibold text-slate-700 block mb-2">Product</label>
                <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-lg">
                  {selectedReview.product?.images?.[0]?.url && (
                    <Image
                      src={selectedReview.product.images[0].url}
                      alt={selectedReview.product.name}
                      width={48}
                      height={48}
                      className="w-12 h-12 rounded object-cover"
                    />
                  )}
                  <div>
                    <p className="font-medium text-slate-900">{selectedReview.product?.name || 'Unknown Product'}</p>
                    <p className="text-xs text-slate-500">Order: #{selectedReview.order?.orderId || selectedReview.orderId}</p>
                  </div>
                </div>
              </div>

              {/* Review Comment */}
              <div>
                <label className="text-sm font-semibold text-slate-700 block mb-2">Review Comment</label>
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <p className="text-slate-900">
                    {selectedReview.comment || <span className="text-slate-400 italic">No comment provided</span>}
                  </p>
                </div>
              </div>

              {/* Review Images */}
              {selectedReview.images && selectedReview.images.length > 0 && (
                <div>
                  <label className="text-sm font-semibold text-slate-700 block mb-2">Review Images</label>
                  <div className="flex gap-2 flex-wrap">
                    {selectedReview.images.map((img, idx) => (
                      <Image
                        key={idx}
                        src={img}
                        alt={`Review image ${idx + 1}`}
                        width={80}
                        height={80}
                        className="w-20 h-20 rounded-lg object-cover border border-slate-200"
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Status */}
              <div>
                <label className="text-sm font-semibold text-slate-700 block mb-2">Status</label>
                <div>{getStatusBadge(selectedReview)}</div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-slate-200">
                {selectedReview.isApproved ? (
                  <button
                    onClick={() => {
                      handleReject(selectedReview.id);
                    }}
                    disabled={actionLoading === selectedReview.id}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                  >
                    <XCircle className="h-4 w-4" />
                    Reject
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      handleApprove(selectedReview.id);
                    }}
                    disabled={actionLoading === selectedReview.id}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Approve
                  </button>
                )}
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-200">
                <button
                  onClick={() => handleDeleteClick(selectedReview)}
                  disabled={actionLoading === selectedReview.id}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
                <button
                  onClick={() => setSelectedReview(null)}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Close
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        show={deleteModal.show && !!deleteModal.review}
        title="Delete Review"
        itemName={deleteModal.review?.user?.name || 'Unknown User'}
        itemDetail={deleteModal.review?.product?.name || 'Unknown Product'}
        loading={!!deleteModal.review && actionLoading === deleteModal.review.id}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteModal({ show: false, review: null })}
      />
    </div>
  );
}
