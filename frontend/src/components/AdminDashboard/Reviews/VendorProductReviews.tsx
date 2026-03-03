"use client";

import { useState, useEffect, useCallback } from "react";
import { Star, Search, Eye, AlertCircle, RefreshCw, Package } from "lucide-react";
import { Card, CardContent } from "../../UI/Card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../UI/Table";
import Dropdown from "../../UI/Dropdown";
import { Breadcrumb } from "../Breadcrumb/Breadcrumb";
import adminReviewService, { AdminOrderReview } from "@/services/adminReviewService";

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
  quantity: number;
  productImage: string;
}

export default function VendorProductReviews() {
  const [reviews, setReviews] = useState<VendorProductReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [selectedReview, setSelectedReview] = useState<VendorProductReview | null>(null);
  const [stats, setStats] = useState({ total: 0, approved: 0, rejected: 0 });

  const fetchReviews = useCallback(async () => {
    try {
      setLoading(true);
      const response = await adminReviewService.getAllAdminReviews({
        search: searchTerm || undefined,
        status: filterStatus !== "all" ? filterStatus : undefined,
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
  }, [searchTerm, filterStatus]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const filteredReviews = reviews.filter(review => {
    const matchesSearch = review.vendorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      review.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      review.productSKU.toLowerCase().includes(searchTerm.toLowerCase()) ||
      review.orderId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === "all" || review.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const getStatusBadge = (status: string) => {
    const styles = {
      approved: "bg-green-100 text-green-800",
      rejected: "bg-red-100 text-red-800",
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
            className={`h-4 w-4 ${star <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
              }`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="p-6">
      <Breadcrumb />
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Vendor Product Reviews</h1>
        <p className="text-gray-600 mt-1">Quality check reviews given by admin after receiving products from vendors</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-600">Total Reviews</div>
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-600">Approved</div>
            <div className="text-2xl font-bold text-green-600">
              {stats.approved}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-600">Rejected</div>
            <div className="text-2xl font-bold text-red-600">
              {stats.rejected}
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
                placeholder="Search by vendor, product name, order ID, or SKU..."
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
                  { value: "rejected", label: "Rejected" }
                ]}
                onChange={(val) => setFilterStatus(val as string)}
                placeholder="Filter by status"
              />
            </div>
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
              {filteredReviews.length > 0 ? (
                filteredReviews.map((review) => (
                  <TableRow key={review.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {review.productImage ? (
                          <img
                            src={review.productImage}
                            alt={review.productName}
                            className="w-12 h-12 object-cover rounded border border-gray-200"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-gray-100 rounded border border-gray-200 flex items-center justify-center">
                            <Package className="w-6 h-6 text-gray-400" />
                          </div>
                        )}
                        <div>
                          <div className="font-medium text-gray-900">{review.productName}</div>
                          <div className="text-sm text-gray-500">SKU: {review.productSKU}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-gray-900">{review.vendorName}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-mono text-gray-900">{review.orderId}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {renderStars(review.rating)}
                        <span className="text-sm text-gray-600">({review.rating})</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(review.status)}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-gray-900">
                        {new Date(review.reviewedDate).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(review.reviewedDate).toLocaleTimeString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <button
                        onClick={() => setSelectedReview(review)}
                        className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Eye className="h-4 w-4" />
                        View
                      </button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7}>
                    <div className="p-12 text-center">
                      <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500 text-lg font-medium mb-2">No reviews found</p>
                      <p className="text-gray-400 text-sm">
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
        )}
      </Card>

      {/* Detail Modal */}
      {selectedReview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-start">
                <div className="flex items-start gap-4">
                  {selectedReview.productImage ? (
                    <img
                      src={selectedReview.productImage}
                      alt={selectedReview.productName}
                      className="w-24 h-24 object-cover rounded-lg border border-gray-200"
                    />
                  ) : (
                    <div className="w-24 h-24 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center">
                      <Package className="w-10 h-10 text-gray-400" />
                    </div>
                  )}
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{selectedReview.productName}</h2>
                    <p className="text-sm text-gray-500 mt-1">SKU: {selectedReview.productSKU}</p>
                    <p className="text-sm text-gray-500">Order ID: {selectedReview.orderId}</p>
                    <div className="mt-2">{getStatusBadge(selectedReview.status)}</div>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedReview(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Rating */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <label className="text-sm font-semibold text-gray-700 block mb-2">Quality Rating</label>
                <div className="flex items-center gap-3">
                  {renderStars(selectedReview.rating)}
                  <span className="text-lg font-bold text-gray-900">
                    {selectedReview.rating}/5
                  </span>
                </div>
              </div>

              {/* Review Comments */}
              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-2">Review Comments</label>
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <p className="text-gray-900">{selectedReview.reviewComments || "No comments provided"}</p>
                </div>
              </div>

              {/* Quality Check Notes */}
              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-2">Quality Check Notes</label>
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <p className="text-gray-900">{selectedReview.qualityCheckNotes || "No notes provided"}</p>
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
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                <div>
                  <label className="text-sm font-medium text-gray-700">Vendor</label>
                  <p className="text-gray-900 font-medium">{selectedReview.vendorName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Customer</label>
                  <p className="text-gray-900 font-medium">{selectedReview.customerName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Quantity</label>
                  <p className="text-gray-900">{selectedReview.quantity} units</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Amount</label>
                  <p className="text-gray-900 font-medium">₹{selectedReview.totalAmount.toFixed(2)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Order Date</label>
                  <p className="text-gray-900">{new Date(selectedReview.orderDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Reviewed Date</label>
                  <p className="text-gray-900">{new Date(selectedReview.reviewedDate).toLocaleString()}</p>
                </div>
              </div>

              {/* Close Button */}
              <div className="flex justify-end pt-4 border-t border-gray-200">
                <button
                  onClick={() => setSelectedReview(null)}
                  className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
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
