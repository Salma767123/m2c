"use client";

import { useState } from "react";
import { ArrowLeft, Package, CreditCard, Building2, Truck, Star, X } from "lucide-react";
import { useRouter } from "next/navigation";
import Dropdown from "@/components/UI/Dropdown";
import { showSuccessToast, showErrorToast } from "@/lib/toast-utils";

interface VendorToHubDetailProps {
  orderId: string;
}

interface Hub {
  id: string;
  name: string;
  location: string;
}

const mockHubs: Hub[] = [
  { id: "1", name: "Mumbai Hub", location: "Mumbai, Maharashtra" },
  { id: "2", name: "Delhi Hub", location: "New Delhi, Delhi" },
  { id: "3", name: "Bangalore Hub", location: "Bangalore, Karnataka" },
  { id: "4", name: "Chennai Hub", location: "Chennai, Tamil Nadu" },
  { id: "5", name: "Kolkata Hub", location: "Kolkata, West Bengal" },
];

export default function VendorToHubDetail({ orderId }: VendorToHubDetailProps) {
  const router = useRouter();
  const [showHubModal, setShowHubModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedHub, setSelectedHub] = useState("");
  const [orderStatus, setOrderStatus] = useState("Shipped");
  
  // Review form state
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [review, setReview] = useState("");
  const [notice, setNotice] = useState("");

  // Mock order data
  const order = {
    orderId: "ORD-2024-001",
    orderDate: "2024-02-10",
    status: orderStatus,
    assignedHub: "Mumbai Hub",
    product: {
      name: "Cotton Bedsheet Set",
      sku: "CBS-001",
      quantity: 2,
      price: 1250,
      image: "/assets/images/categories/cs1.jpg",
    },
    payment: {
      method: "Razorpay",
      transactionId: "TXN-2024-001",
      amount: 2500,
      status: "Completed",
    },
    vendor: {
      name: "Textile Traders",
      email: "vendor@textiletraders.com",
      phone: "+91 98765 43210",
      address: "456, Textile Market, Surat, Gujarat - 395003",
      gst: "27AABCT1234F1Z5",
    },
    shipping: {
      carrier: "Blue Dart",
      trackingId: "BD123456789IN",
      shippedDate: "2024-02-12",
    },
  };

  const handleProceed = () => {
    setShowHubModal(true);
  };

  const handleConfirmHub = () => {
    if (!selectedHub) {
      showErrorToast("Please select a hub");
      return;
    }

    const hubName = mockHubs.find((h) => h.id === selectedHub)?.name;
    showSuccessToast(`Order assigned to ${hubName}`);
    setShowHubModal(false);
    setOrderStatus("Assigned");
  };

  const handleMarkAsReceived = () => {
    setShowReviewModal(true);
  };

  const handleSubmitReview = () => {
    if (rating === 0) {
      showErrorToast("Please provide a rating");
      return;
    }
    if (!review.trim()) {
      showErrorToast("Please provide a review");
      return;
    }

    showSuccessToast("Review submitted successfully. Vendor order marked as delivered.");
    setShowReviewModal(false);
    
    // Redirect to Hub to Customer orders
    setTimeout(() => {
      router.push("/admin/dashboard/orders/hub-to-customer");
    }, 1500);
  };

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
          {order.status === "Pending" && (
            <button
              onClick={handleProceed}
              className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium"
            >
              Proceed
            </button>
          )}
          {order.status === "Shipped" && (
            <button
              onClick={handleMarkAsReceived}
              className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium"
            >
              Mark as Received at Hub
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-gray-600">Order Date</p>
            <p className="text-base font-medium text-gray-900 mt-1">
              {new Date(order.orderDate).toLocaleDateString()}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Status</p>
            <p className={`text-base font-medium mt-1 ${
              order.status === "Pending" ? "text-yellow-600" :
              order.status === "Assigned" ? "text-blue-600" :
              order.status === "Packed" ? "text-purple-600" :
              "text-indigo-600"
            }`}>
              {order.status}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Total Amount</p>
            <p className="text-base font-medium text-gray-900 mt-1">
              ₹{order.payment.amount.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Product Details */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Product Details</h2>
        <div className="flex gap-4">
          <img
            src={order.product.image}
            alt={order.product.name}
            className="w-24 h-24 object-cover rounded-lg border border-gray-200"
          />
          <div className="flex-1">
            <h3 className="text-base font-semibold text-gray-900">{order.product.name}</h3>
            <p className="text-sm text-gray-600 mt-1">SKU: {order.product.sku}</p>
            <div className="flex gap-6 mt-2">
              <div>
                <p className="text-sm text-gray-600">Quantity</p>
                <p className="text-base font-medium text-gray-900">{order.product.quantity}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Price</p>
                <p className="text-base font-medium text-gray-900">
                  ₹{order.product.price.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
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
            <p className="text-base font-medium text-gray-900 mt-1">{order.payment.method}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Transaction ID</p>
            <p className="text-base font-medium text-gray-900 mt-1">{order.payment.transactionId}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Payment Status</p>
            <p className="text-base font-medium text-green-600 mt-1">{order.payment.status}</p>
          </div>
        </div>
      </div>

      {/* Vendor Details */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center gap-2 mb-4">
          <Building2 className="h-5 w-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">Vendor Details</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">Vendor Name</p>
            <p className="text-base font-medium text-gray-900 mt-1">{order.vendor.name}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Email</p>
            <p className="text-base font-medium text-gray-900 mt-1">{order.vendor.email}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Phone</p>
            <p className="text-base font-medium text-gray-900 mt-1">{order.vendor.phone}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">GST Number</p>
            <p className="text-base font-medium text-gray-900 mt-1">{order.vendor.gst}</p>
          </div>
          <div className="md:col-span-2">
            <p className="text-sm text-gray-600">Address</p>
            <p className="text-base font-medium text-gray-900 mt-1">{order.vendor.address}</p>
          </div>
        </div>
      </div>

      {/* Vendor Shipping Details */}
      {(order.status === "Shipped") && order.shipping && (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center gap-2 mb-4">
            <Truck className="h-5 w-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">Vendor Shipping Details</h2>
          </div>
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-4">
            <p className="text-sm text-blue-800">
              Shipping information provided by vendor when order was shipped to {order.assignedHub}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-600">Carrier Service</p>
              <p className="text-base font-medium text-gray-900 mt-1">{order.shipping.carrier}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Tracking ID</p>
              <p className="text-base font-medium text-gray-900 mt-1 font-mono">{order.shipping.trackingId}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Shipped Date</p>
              <p className="text-base font-medium text-gray-900 mt-1">
                {new Date(order.shipping.shippedDate).toLocaleDateString()}
              </p>
            </div>
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
              {/* Product Info */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Product Information</h3>
                <div className="flex gap-4">
                  <img
                    src={order.product.image}
                    alt={order.product.name}
                    className="w-20 h-20 object-cover rounded-lg border border-gray-200"
                  />
                  <div>
                    <p className="font-medium text-gray-900">{order.product.name}</p>
                    <p className="text-sm text-gray-600 mt-1">SKU: {order.product.sku}</p>
                    <p className="text-sm text-gray-600">Quantity: {order.product.quantity}</p>
                  </div>
                </div>
              </div>

              {/* Vendor Info */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Vendor Information</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-gray-600">Vendor Name</p>
                    <p className="text-sm font-medium text-gray-900">{order.vendor.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Phone</p>
                    <p className="text-sm font-medium text-gray-900">{order.vendor.phone}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Email</p>
                    <p className="text-sm font-medium text-gray-900">{order.vendor.email}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">GST Number</p>
                    <p className="text-sm font-medium text-gray-900">{order.vendor.gst}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-gray-600">Address</p>
                    <p className="text-sm font-medium text-gray-900">{order.vendor.address}</p>
                  </div>
                </div>
              </div>

              {/* Hub Selection */}
              <div>
                <Dropdown
                  label="Select Hub"
                  value={selectedHub}
                  options={mockHubs.map((hub) => ({
                    value: hub.id,
                    label: `${hub.name} - ${hub.location}`,
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
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Order Information</h3>
                <div className="flex gap-4">
                  <img
                    src={order.product.image}
                    alt={order.product.name}
                    className="w-20 h-20 object-cover rounded-lg border border-gray-200"
                  />
                  <div>
                    <p className="font-medium text-gray-900">{order.product.name}</p>
                    <p className="text-sm text-gray-600 mt-1">Order ID: {order.orderId}</p>
                    <p className="text-sm text-gray-600">Vendor: {order.vendor.name}</p>
                  </div>
                </div>
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
                        className={`h-8 w-8 ${
                          star <= (hoveredRating || rating)
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
