"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Package, CreditCard, Building2, Truck, Star, X, Copy, MapPin } from "lucide-react";
import { useRouter } from "next/navigation";
import Dropdown from "@/components/UI/Dropdown";
import { showSuccessToast, showErrorToast } from "@/lib/toast-utils";
import { orderService, VendorShipment } from "@/services/orderService";
import adminReviewService from "@/services/adminReviewService";
import { hasPermission } from "@/lib/auth";

interface VendorToHubDetailProps {
  orderId: string;
}

import { hubService, Hub } from "@/services/hubService";

export default function VendorToHubDetail({ orderId }: VendorToHubDetailProps) {
  const router = useRouter();
  const [shipment, setShipment] = useState<VendorShipment | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [showHubModal, setShowHubModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedHub, setSelectedHub] = useState("");

  // Review form state
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [review, setReview] = useState("");
  const [notice, setNotice] = useState("");
  const [isApproved, setIsApproved] = useState(true);
  const [rejectionReason, setRejectionReason] = useState("");
  const [returnToVendor, setReturnToVendor] = useState(false);

  const [hubs, setHubs] = useState<Hub[]>([]);

  useEffect(() => {
    fetchShipmentDetails();
    fetchHubs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const fetchShipmentDetails = async () => {
    try {
      setIsLoading(true);
      const res = await orderService.getAdminShipmentById(orderId);
      if (res.success) {
        setShipment(res.data);
      }
    } catch (error: any) {
      showErrorToast(error.message || "Failed to fetch shipment details");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateStatus = async (newStatus: string, assignedHubId?: string) => {
    if (!shipment) return;
    try {
      const res = await orderService.updateAdminShipmentStatus(shipment.id, newStatus, assignedHubId);
      if (res.success) {
        showSuccessToast(`Shipment marked as ${newStatus.replace(/_/g, " ")}`);
        // Re-fetch to get full data including order reference
        await fetchShipmentDetails();
      }
    } catch (error: any) {
      showErrorToast(error.message || "Failed to update shipment status");
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
    if (!shipment) return;
    if (rating === 0) {
      showErrorToast("Please provide a rating");
      return;
    }
    if (!review.trim()) {
      showErrorToast("Please provide a review");
      return;
    }
    if (!isApproved && !rejectionReason.trim()) {
      showErrorToast("Please provide a rejection reason");
      return;
    }

    try {
      await adminReviewService.createOrUpdateShipmentReview(shipment.id, {
        rating,
        reviewComments: review.trim(),
        qualityCheckNotes: notice.trim() || undefined,
        approved: isApproved,
        rejectionReason: !isApproved ? rejectionReason.trim() : undefined,
        returnToVendor: !isApproved ? returnToVendor : undefined,
      });

      const nextStatus = isApproved ? "APPROVED_BY_ADMIN_HUB" : "REJECTED_BY_ADMIN_HUB";
      await handleUpdateStatus(nextStatus);
      setShowReviewModal(false);
      showSuccessToast(isApproved ? "Shipment approved" : "Shipment rejected");

      if (isApproved) {
        setTimeout(() => {
          router.push("/admin/dashboard/orders/hub-to-customer");
        }, 1500);
      }
    } catch (error: any) {
      showErrorToast(error.message || "Failed to submit review");
    }
  };

  if (isLoading) {
    return <div className="p-6 text-center text-gray-500">Loading shipment details...</div>;
  }

  if (!shipment) {
    return <div className="p-6 text-center text-red-500">Shipment not found</div>;
  }

  const assignedHub = shipment.assignedHubId
    ? (shipment.hub?.name || hubs.find(h => h.id === shipment.assignedHubId)?.name || "Assigned Hub")
    : "Not Assigned";

  const shipmentAmount = shipment.items?.reduce((acc, item) => acc + item.totalPrice, 0) || 0;
  const order = shipment.order;

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
            <p className="text-sm text-gray-600 mt-1">
              Order ID: {shipment.order?.orderId || shipment.shipmentId}
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          {shipment.status === "ORDER_CREATED" && hasPermission('edit_orders') && (
            <button
              onClick={handleProceed}
              className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium"
            >
              Assign Hub / Proceed
            </button>
          )}
          {shipment.status === "IN_TRANSIT_TO_ADMIN_HUB" && hasPermission('edit_orders') && (
            <button
              onClick={handleMarkAsReceived}
              className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium"
            >
              Mark as Received at Hub
            </button>
          )}
          {shipment.status === "RECEIVED_AT_ADMIN_HUB" && hasPermission('edit_orders') && (
            <button
              onClick={() => setShowReviewModal(true)}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Review Delivery & Approve
            </button>
          )}
        </div>
      </div>

      {/* Order Information */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center gap-2 mb-4">
          <Package className="h-5 w-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">Order Information</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-gray-600">Order Date</p>
            <p className="text-base font-medium text-gray-900 mt-1">
              {new Date(shipment.order?.createdAt || shipment.createdAt).toLocaleDateString("en-IN")}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Status</p>
            <p className={`text-base font-medium mt-1 ${shipment.status === "ORDER_CREATED" ? "text-yellow-600" :
              shipment.status === "VENDOR_PROCESSING" ? "text-blue-600" :
                shipment.status === "PACKED_BY_VENDOR" ? "text-purple-600" :
                  shipment.status === "IN_TRANSIT_TO_ADMIN_HUB" ? "text-indigo-600" :
                    ["RECEIVED_AT_ADMIN_HUB", "APPROVED_BY_ADMIN_HUB", "DELIVERED", "SHIPPED_TO_CUSTOMER"].includes(shipment.status) ? "text-green-600" :
                      "text-gray-600"
              }`}>
              {shipment.status.replace(/_/g, " ")}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Assigned Hub</p>
            <p className={`text-base font-medium mt-1 ${assignedHub === "Not Assigned" ? "text-red-600" : "text-gray-900"}`}>
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
            <div className="text-sm text-gray-600">
              {order.shippingAddress ? (
                <>
                  <p>{order.shippingAddress.address || order.shippingAddress.street}</p>
                  {order.shippingAddress.addressLine2 && <p>{order.shippingAddress.addressLine2}</p>}
                  <p>{order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zipCode}</p>
                  <p>{order.shippingAddress.country}</p>
                </>
              ) : "N/A"}
            </div>
          </div>
        </div>
      </div>

      {/* Product Details */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Product Details</h2>
        <div className="space-y-4">
          {shipment.items?.map((item) => (
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
        <div className="grid grid-cols-1 gap-4">
          <div>
            <p className="text-sm text-gray-600">Vendor Name</p>
            <p className="text-base font-medium text-gray-900 mt-1">{shipment.vendorName}</p>
          </div>
        </div>
      </div>

      {/* Vendor Shipping Details */}
      {(["IN_TRANSIT_TO_ADMIN_HUB", "RECEIVED_AT_ADMIN_HUB", "APPROVED_BY_ADMIN_HUB", "SHIPPED_TO_CUSTOMER", "DELIVERED"].includes(shipment.status)) && (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center gap-2 mb-4">
            <Truck className="h-5 w-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">Vendor Shipping Details</h2>
          </div>
          {shipment.vendorCarrier && shipment.vendorTrackingId ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-600">Carrier</p>
                <p className="text-base font-medium text-gray-900 mt-1">{shipment.vendorCarrier}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Tracking ID</p>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-base font-mono font-medium text-gray-900 break-all">
                    {shipment.vendorTrackingId}
                  </p>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(shipment.vendorTrackingId || "");
                        showSuccessToast("Tracking ID copied");
                      } catch {
                        showErrorToast("Copy failed");
                      }
                    }}
                    className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors shrink-0"
                    title="Copy tracking ID"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              </div>
              {shipment.vendorShippedAt && (
                <div>
                  <p className="text-sm text-gray-600">Shipped On</p>
                  <p className="text-base font-medium text-gray-900 mt-1">
                    {new Date(shipment.vendorShippedAt).toLocaleString("en-IN")}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
              <p className="text-sm text-yellow-800">
                Shipping details not recorded for this shipment. (Legacy order shipped before tracking was captured.)
              </p>
            </div>
          )}
        </div>
      )}

      {/* Hub Selection Modal */}
      {showHubModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Assign to Hub</h2>
              <p className="text-sm text-gray-600 mt-1">Select a hub to assign this shipment</p>
            </div>

            <div className="p-6 space-y-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Shipment Summary</h3>
                <p className="text-sm text-gray-600">Vendor: {shipment.vendorName}</p>
                <p className="text-sm text-gray-600">Items: {shipment.items.length}</p>
              </div>

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
                <p className="text-sm text-gray-600 mt-1">Provide feedback on the received shipment</p>
              </div>
              <button
                onClick={() => setShowReviewModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-600" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Reviewing Delivery From Vendor</h3>
                <p className="text-sm text-gray-600">Order ID: {shipment.order?.orderId || shipment.shipmentId}</p>
                <p className="text-sm text-gray-600">Vendor: {shipment.vendorName}</p>
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
                  Quality Check Notes (Optional)
                </label>
                <textarea
                  value={notice}
                  onChange={(e) => setNotice(e.target.value)}
                  placeholder="Any additional notes or issues to communicate to the vendor"
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent resize-none"
                />
              </div>

              {/* Approval Decision */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Decision</label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsApproved(true)}
                    className={`flex-1 py-2.5 px-4 rounded-lg border-2 text-sm font-medium transition-colors ${isApproved
                      ? "border-green-500 bg-green-50 text-green-800"
                      : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                    }`}
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsApproved(false)}
                    className={`flex-1 py-2.5 px-4 rounded-lg border-2 text-sm font-medium transition-colors ${!isApproved
                      ? "border-red-500 bg-red-50 text-red-800"
                      : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                    }`}
                  >
                    Reject
                  </button>
                </div>
              </div>

              {/* Rejection fields — shown only when rejecting */}
              {!isApproved && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Rejection Reason <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="Explain why the shipment is being rejected..."
                      rows={3}
                      className="w-full px-4 py-2 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                    />
                  </div>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={returnToVendor}
                      onChange={(e) => setReturnToVendor(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                    />
                    <span className="text-sm text-gray-700">Return items to vendor</span>
                  </label>
                </>
              )}
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
                className={`px-6 py-2 rounded-lg transition-colors font-medium ${isApproved
                  ? "bg-green-600 text-white hover:bg-green-700"
                  : "bg-red-600 text-white hover:bg-red-700"
                }`}
              >
                {isApproved ? "Approve Shipment" : "Reject Shipment"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
