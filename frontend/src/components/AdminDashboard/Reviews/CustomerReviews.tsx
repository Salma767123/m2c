"use client";

import { useState, useEffect, useCallback } from "react";
import { Star, Search, Eye, Trash2, CheckCircle, XCircle, RefreshCw, MessageSquare } from "lucide-react";
import { Card, CardContent } from "../../UI/Card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../UI/Table";
import Dropdown from "../../UI/Dropdown";
import { Breadcrumb } from "../Breadcrumb/Breadcrumb";
import reviewService, { AdminReview } from "@/services/reviewService";

export default function CustomerReviews() {
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [selectedReview, setSelectedReview] = useState<AdminReview | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    approved: 0,
    rejected: 0,
    averageRating: 0,
  });

  const fetchReviews = useCallback(async () => {
    try {
      setLoading(true);
      const response = await reviewService.getAdminReviews({
        search: searchTerm || undefined,
        status: filterStatus !== "all" ? filterStatus : undefined,
      });
      if (response.success) {
        setReviews(response.data);
        setStats(response.stats);
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
      await reviewService.updateReviewStatus(id, true);
      // Update local state
      setReviews(reviews.map(review =>
        review.id === id ? { ...review, isApproved: true } : review
      ));
      setStats(prev => ({
        ...prev,
        approved: prev.approved + 1,
        rejected: Math.max(0, prev.rejected - 1),
      }));
      if (selectedReview?.id === id) {
        setSelectedReview({ ...selectedReview, isApproved: true });
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
      await reviewService.updateReviewStatus(id, false);
      // Update local state
      setReviews(reviews.map(review =>
        review.id === id ? { ...review, isApproved: false } : review
      ));
      setStats(prev => ({
        ...prev,
        rejected: prev.rejected + 1,
        approved: Math.max(0, prev.approved - 1),
      }));
      if (selectedReview?.id === id) {
        setSelectedReview({ ...selectedReview, isApproved: false });
      }
    } catch (error) {
      console.error("Error rejecting review:", error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this review? This action cannot be undone.")) return;
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
    } catch (error) {
      console.error("Error deleting review:", error);
    } finally {
      setActionLoading(null);
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${star <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
              }`}
          />
        ))}
      </div>
    );
  };

  const getStatusBadge = (isApproved: boolean) => {
    return isApproved ? (
      <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
        Approved
      </span>
    ) : (
      <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
        Rejected
      </span>
    );
  };

  return (
    <div className="p-6">
      <Breadcrumb />
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Customer Reviews</h1>
        <p className="text-gray-600 mt-1">Manage and moderate customer product reviews</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-600">Total Reviews</div>
                <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
              </div>
              <MessageSquare className="h-8 w-8 text-blue-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-600">Approved</div>
                <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-600">Rejected</div>
                <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
              </div>
              <XCircle className="h-8 w-8 text-red-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-600">Avg. Rating</div>
                <div className="text-2xl font-bold text-yellow-600 flex items-center gap-1">
                  {stats.averageRating}
                  <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                </div>
              </div>
              <Star className="h-8 w-8 text-yellow-400 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5 z-10" />
              <input
                type="text"
                placeholder="Search by customer name, product, or comment..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#222222] focus:border-transparent"
              />
            </div>
            <div className="w-full md:w-48">
              <Dropdown
                value={filterStatus}
                options={[
                  { value: "all", label: "All Status" },
                  { value: "approved", label: "Approved" },
                  { value: "rejected", label: "Rejected" },
                ]}
                onChange={(val) => setFilterStatus(val as string)}
                placeholder="Filter by status"
              />
            </div>
            <button
              onClick={fetchReviews}
              className="flex items-center gap-2 px-4 py-2 bg-[#222222] text-white rounded-lg hover:bg-[#333333] transition-colors"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Reviews Table */}
      <Card>
        {loading ? (
          <div className="p-12 text-center">
            <RefreshCw className="h-8 w-8 animate-spin text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">Loading reviews...</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
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
              {reviews.length > 0 ? (
                reviews.map((review) => (
                  <TableRow key={review.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium text-gray-900">{review.user?.name || 'Unknown'}</div>
                        <div className="text-xs text-gray-500">{review.user?.email || ''}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {review.product?.images?.[0]?.url && (
                          <img
                            src={review.product.images[0].url}
                            alt={review.product.name}
                            className="w-8 h-8 rounded object-cover"
                          />
                        )}
                        <div className="text-sm text-gray-900 max-w-[150px] truncate">
                          {review.product?.name || 'Unknown Product'}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {renderStars(review.rating)}
                        <span className="text-sm text-gray-600">({review.rating})</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-gray-700 max-w-xs truncate">
                        {review.comment || <span className="text-gray-400 italic">No comment</span>}
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(review.isApproved)}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-gray-900">
                        {new Date(review.createdAt).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setSelectedReview(review)}
                          className="inline-flex items-center gap-1 px-2 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {review.isApproved ? (
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
                        )}
                        <button
                          onClick={() => handleDelete(review.id)}
                          disabled={actionLoading === review.id}
                          className="inline-flex items-center gap-1 px-2 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7}>
                    <div className="p-12 text-center">
                      <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500 font-medium">No reviews found</p>
                      <p className="text-gray-400 text-sm mt-1">
                        {searchTerm || filterStatus !== "all"
                          ? "Try adjusting your search or filter criteria"
                          : "Customer reviews will appear here once submitted"}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Detail Modal */}
      {selectedReview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto bg-white">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Customer Review Details</h2>
                  <p className="text-sm text-gray-500 mt-1">{selectedReview.product?.name || 'Unknown Product'}</p>
                </div>
                <button
                  onClick={() => setSelectedReview(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            </div>

            <CardContent className="p-6 space-y-6">
              {/* Customer Info */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    {selectedReview.user?.image ? (
                      <img
                        src={selectedReview.user.image}
                        alt={selectedReview.user.name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 font-semibold">
                        {(selectedReview.user?.name || 'U').charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <h3 className="font-semibold text-gray-900">{selectedReview.user?.name || 'Unknown'}</h3>
                      <p className="text-sm text-gray-500">{selectedReview.user?.email || ''}</p>
                    </div>
                  </div>
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-medium">
                    Verified Purchase
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-3">
                  {renderStars(selectedReview.rating)}
                  <span className="text-sm text-gray-600">
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
                <label className="text-sm font-semibold text-gray-700 block mb-2">Product</label>
                <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg">
                  {selectedReview.product?.images?.[0]?.url && (
                    <img
                      src={selectedReview.product.images[0].url}
                      alt={selectedReview.product.name}
                      className="w-12 h-12 rounded object-cover"
                    />
                  )}
                  <div>
                    <p className="font-medium text-gray-900">{selectedReview.product?.name || 'Unknown Product'}</p>
                    <p className="text-xs text-gray-500">Order: #{selectedReview.order?.orderId || selectedReview.orderId}</p>
                  </div>
                </div>
              </div>

              {/* Review Comment */}
              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-2">Review Comment</label>
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <p className="text-gray-900">
                    {selectedReview.comment || <span className="text-gray-400 italic">No comment provided</span>}
                  </p>
                </div>
              </div>

              {/* Review Images */}
              {selectedReview.images && selectedReview.images.length > 0 && (
                <div>
                  <label className="text-sm font-semibold text-gray-700 block mb-2">Review Images</label>
                  <div className="flex gap-2 flex-wrap">
                    {selectedReview.images.map((img, idx) => (
                      <img
                        key={idx}
                        src={img}
                        alt={`Review image ${idx + 1}`}
                        className="w-20 h-20 rounded-lg object-cover border border-gray-200"
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Status */}
              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-2">Status</label>
                <div>{getStatusBadge(selectedReview.isApproved)}</div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
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

              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => {
                    handleDelete(selectedReview.id);
                    setSelectedReview(null);
                  }}
                  disabled={actionLoading === selectedReview.id}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
                <button
                  onClick={() => setSelectedReview(null)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
