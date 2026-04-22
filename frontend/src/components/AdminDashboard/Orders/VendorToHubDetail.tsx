"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Package, CreditCard, Building2, Truck, Star, X, MapPin } from "lucide-react";
import { useRouter } from "next/navigation";
import Dropdown from "@/components/UI/Dropdown";
import { showSuccessToast, showErrorToast } from "@/lib/toast-utils";
import { orderService, Order } from "@/services/orderService";
import adminReviewService from "@/services/adminReviewService";

interface VendorToHubDetailProps {
  orderId: string;
}

import { hubService, Hub } from "@/services/hubService";

export default function VendorToHubDetail({ orderId }: VendorToHubDetailProps) {
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [showHubModal, setShowHubModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedHub, setSelectedHub] = useState("");

  // Review form state
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [review, setReview] = useState("");
  const [notice, setNotice] = useState("");

  const [hubs, setHubs] = useState<Hub[]>([]);

  useEffect(() => {
    fetchOrderDetails();
    fetchHubs();
  }, [orderId]);

  const fetchHubs = async () => {
    try {
      const res = await hubService.getHubs();
      if (res.success) {
        setHubs(res.data.filter(h => h.isActive));
      }
    } catch (error) {
      console.error("Failed to fetch hubs", error);
    }
  };

  const fetchOrderDetails = async () => {
    try {
      setIsLoading(true);
      const res = await orderService.getAdminOrderById(orderId);
      if (res.success) {
        setOrder(res.data);
      }
    } catch (error: any) {
      showErrorToast(error.message || "Failed to fetch order details");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateStatus = async (newStatus: string, assignedHubId?: string) => {
    try {
      const res = await orderService.updateAdminOrderStatus(orderId, newStatus, assignedHubId);
      if (res.success) {
        showSuccessToast(`Order marked as ${newStatus.replace(/_/g, " ")}`);
        setOrder(res.data);
      }
    } catch (error: any) {
      showErrorToast(error.message || "Failed to update order status");
    }
  };

  const handleProceed = () => {
    setShowHubModal(true);
  };

  const handleConfirmHub = () => {
    if (!selectedHub) {
      showErrorToast("Please select a hub");
      return;
    }

    setShowHubModal(false);
    handleUpdateStatus("VENDOR_PROCESSING", selectedHub);
  };

  const handleMarkAsReceived = () => {
    handleUpdateStatus("RECEIVED_AT_ADMIN_HUB");
  };

  const handleSubmitReview = async () => {
    if (rating === 0) {
      showErrorToast("Please provide a rating");
      return;
    }
    if (!review.trim()) {
      showErrorToast("Please provide a review");
      return;
    }

    try {
      // Save the admin review to the database
      await adminReviewService.createOrUpdateAdminReview(order!.id, {
        rating,
        reviewComments: review.trim(),
        qualityCheckNotes: notice.trim() || undefined,
        approved: true,
      });

      // Update order status
      await handleUpdateStatus("APPROVED_BY_ADMIN_HUB");
      setShowReviewModal(false);
      showSuccessToast("Review submitted successfully");

      // Redirect to Hub to Customer orders after a short delay
      setTimeout(() => {
        router.push("/admin/dashboard/orders/hub-to-customer");
      }, 1500);
    } catch (error: any) {
      showErrorToast(error.message || "Failed to submit review");
    }
  };

  if (isLoading) {
    return <div className="p-6 text-center text-gray-500">Loading order details...</div>;
  }

  if (!order) {
    return <div className="p-6 text-center text-red-500">Order not found</div>;
  }

  const assignedHub = order.assignedHubId
    ? (order.hub?.name || hubs.find(h => h.id === order.assignedHubId)?.name || "Assigned Hub")
    : "Not Assigned";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Vendor to Hub Order</h1>
            <p className="text-sm text-gray-600 mt-1">Order ID: {order.orderId}</p>
          </div>
        </div>
        <div className="flex gap-3">
          {order.status === "ORDER_CREATED" && (
            <button
              onClick={handleProceed}
              className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium"
            >
              Assign Hub / Proceed
            </button>
          )}
          {order.status === "IN_TRANSIT_TO_ADMIN_HUB" && (
            <button
              onClick={handleMarkAsReceived}
              className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium"
            >
              Mark as Received at Hub
            </button>
          )}
          {order.status === "RECEIVED_AT_ADMIN_HUB" && (
            <button
              onClick={() => setShowReviewModal(true)}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Review Delivery & Approve
            </button>
          )}
        </div>
      </div>

      {/* Order Details */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center gap-2 mb-4">
          <Package className="h-5 w-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">Order Information</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-gray-600">Order Date</p>
            <p className="text-base font-medium text-gray-900 mt-1">
              {new Date(order.createdAt).toLocaleDateString()}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Status</p>
            <p className={`text-base font-medium mt-1 ${order.status === "ORDER_CREATED" ? "text-yellow-600" :
              order.status === "VENDOR_PROCESSING" ? "text-blue-600" :
                order.status === "PACKED_BY_VENDOR" ? "text-purple-600" :
                  order.status === "IN_TRANSIT_TO_ADMIN_HUB" ? "text-indigo-600" :
                    ["RECEIVED_AT_ADMIN_HUB", "APPROVED_BY_ADMIN_HUB", "DELIVERED", "SHIPPED_TO_CUSTOMER"].includes(order.status) ? "text-green-600" :
                      "text-gray-600"
              }`}>
              {order.status.replace(/_/g, " ")}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Assigned Hub</p>
            <p className={`text-base font-medium mt-1 ${assignedHub === "Not Assigned" ? "text-red-600" : "text-gray-900"
              }`}>
              {assignedHub}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Tracking Ref</p>
            <p className="text-base font-medium text-gray-900 mt-1">
              {order.trackingReference || "N/A"}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6 pt-4 border-t border-gray-200">
          <div>
            <p className="text-sm text-gray-600">Subtotal</p>
            <p className="text-base font-medium text-gray-900 mt-1">
              ₹{order.subtotal?.toLocaleString() || 0}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Tax</p>
            <p className="text-base font-medium text-gray-900 mt-1">
              ₹{order.tax?.toLocaleString() || 0}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Shipping</p>
            <p className="text-base font-medium text-gray-900 mt-1">
              ₹{order.shippingCost?.toLocaleString() || 0}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Discount</p>
            <p className="text-base font-medium text-green-600 mt-1">
              -₹{order.discount?.toLocaleString() || 0}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Total Amount</p>
            <p className="text-lg font-bold text-gray-900 mt-1">
              ₹{order.totalAmount?.toLocaleString() || 0}
            </p>
          </div>
        </div>
      </div>

      {/* Customer Details */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center gap-2 mb-4">
          <MapPin className="h-5 w-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">Customer Details</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-2">Customer Info</h3>
            <p className="text-sm text-gray-600">{order.customerName}</p>
            <p className="text-sm text-gray-600">{order.customerEmail}</p>
            <p className="text-sm text-gray-600">{order.customerPhone}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-2">Shipping Address</h3>
            <p className="text-sm text-gray-600">
              {order.shippingAddress ? (
                <>
                  {order.shippingAddress.address || order.shippingAddress.street}<br />
                  {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zipCode}<br />
                  {order.shippingAddress.country}
                </>
              ) : "N/A"}
            </p>
          </div>
        </div>
      </div>

      {/* Product Details */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Product Details</h2>
        <div className="space-y-4">
          {order.items?.map((item: any) => (
            <div key={item.id} className="flex gap-4 p-4 border border-gray-100 rounded-lg">
              <img
                src={item.productImage || "/assets/images/placeholder.jpg"}
                alt={item.productName}
                className="w-24 h-24 object-cover rounded-lg border border-gray-200"
              />
              <div className="flex-1">
                <h3 className="text-base font-semibold text-gray-900">{item.productName}</h3>
                <p className="text-sm text-gray-600 mt-1">SKU: {item.sku}</p>
                {(item.size || item.color) && (
                  <div className="flex items-center gap-2 mt-1">
                    {item.size && <p className="text-sm text-gray-600">Size: {item.size}</p>}
                    {item.size && item.color && <span className="text-gray-300">|</span>}
                    {item.color && (
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm text-gray-600">Color:</p>
                        <div 
                          className="w-4 h-4 rounded-full border border-gray-300 shadow-sm"
                          style={{ backgroundColor: item.colorHex || item.color }}
                          title={item.color}
                        />
                        <span className="text-xs text-gray-500 capitalize">{item.color}</span>
                      </div>
                    )}
                  </div>
                )}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                  <div>
                    <p className="text-sm text-gray-600">Quantity</p>
                    <p className="text-base font-medium text-gray-900">{item.quantity}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Unit Price</p>
                    <p className="text-base font-medium text-gray-900">
                      ₹{item.unitPrice?.toLocaleString() || 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Price</p>
                    <p className="text-base font-medium text-gray-900">
                      ₹{item.totalPrice?.toLocaleString() || (item.unitPrice * item.quantity).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Payment Method */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center gap-2 mb-4">
          <CreditCard className="h-5 w-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">Payment Information</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-gray-600">Payment Method</p>
            <p className="text-base font-medium text-gray-900 mt-1">{order.paymentMethod || "N/A"}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Transaction ID</p>
            <p className="text-base font-medium text-gray-900 mt-1">{order.paymentId || "N/A"}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Payment Status</p>
            <p className="text-base font-medium text-green-600 mt-1">{order.paymentStatus || "PENDING"}</p>
          </div>
        </div>
      </div>

      {/* Vendor Details */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center gap-2 mb-4">
          <Building2 className="h-5 w-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">Vendor Information</h2>
        </div>
        {/* We can grab vendor info from the first item since order processing from VendorToHub implies items from same vendor */}
        {(() => {
          const vendorName = order.items?.[0]?.vendorName || "Unknown Vendor";
          return (
            <div className="grid grid-cols-1 gap-4">
              <div>
                <p className="text-sm text-gray-600">Vendor Name</p>
                <p className="text-base font-medium text-gray-900 mt-1">{vendorName}</p>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Vendor Shipping Details - Not fully tracked in basic status atm but mocked visualization */}
      {(["IN_TRANSIT_TO_ADMIN_HUB", "RECEIVED_AT_ADMIN_HUB", "APPROVED_BY_ADMIN_HUB", "SHIPPED_TO_CUSTOMER", "DELIVERED"].includes(order.status)) && (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center gap-2 mb-4">
            <Truck className="h-5 w-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">Vendor Shipping Details</h2>
          </div>
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-4">
            <p className="text-sm text-blue-800">
              Shipping information currently tracked manually or via integrated system.
            </p>
          </div>
        </div>
      )}

      {/* Hub Selection Modal */}
      {showHubModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Assign to Hub</h2>
              <p className="text-sm text-gray-600 mt-1">Select a hub to assign this order</p>
            </div>

            <div className="p-6 space-y-6">
              {/* Product Info Summary */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Product Summary</h3>
                <p className="text-sm text-gray-600">
                  Total Items: {order.items.length}
                </p>
              </div>

              {/* Hub Selection */}
              <div>
                <Dropdown
                  label="Select Hub"
                  value={selectedHub}
                  options={hubs.map((hub) => ({
                    value: hub.id,
                    label: `${hub.name} - ${hub.city}, ${hub.state}`,
                  }))}
                  onChange={(value) => setSelectedHub(value as string)}
                  placeholder="Choose a hub"
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowHubModal(false)}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmHub}
                className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Review Vendor Delivery</h2>
                <p className="text-sm text-gray-600 mt-1">Provide feedback on the received order</p>
              </div>
              <button
                onClick={() => setShowReviewModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-600" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Order Info */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Reviewing Delivery From Vendor</h3>
                <p className="text-sm text-gray-600">Order ID: {order.orderId}</p>
                <p className="text-sm text-gray-600">Vendor: {order.items?.[0]?.vendorName || "Unknown"}</p>
              </div>

              {/* Rating */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rating <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoveredRating(star)}
                      onMouseLeave={() => setHoveredRating(0)}
                      className="focus:outline-none transition-transform hover:scale-110"
                    >
                      <Star
                        className={`h-8 w-8 ${star <= (hoveredRating || rating)
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-gray-300"
                          }`}
                      />
                    </button>
                  ))}
                  {rating > 0 && (
                    <span className="ml-2 text-sm text-gray-600 self-center">
                      {rating} out of 5
                    </span>
                  )}
                </div>
              </div>

              {/* Review */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Review <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={review}
                  onChange={(e) => setReview(e.target.value)}
                  placeholder="Describe the quality of the product received, packaging, condition, etc."
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent resize-none"
                />
              </div>

              {/* Notice */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notice (Optional)
                </label>
                <textarea
                  value={notice}
                  onChange={(e) => setNotice(e.target.value)}
                  placeholder="Any additional notes or issues to communicate to the vendor"
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent resize-none"
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowReviewModal(false)}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitReview}
                className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium"
              >
                Submit Review
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
