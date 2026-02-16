"use client";

import { useState } from "react";
import { ArrowLeft, Package, MapPin, Truck, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { showSuccessToast, showErrorToast } from "@/lib/toast-utils";
import Dropdown from "@/components/UI/Dropdown";

interface OrderDetailProps {
  orderId: string;
}

const carriers = [
  "Blue Dart",
  "DTDC",
  "Delhivery",
  "FedEx",
  "DHL",
  "India Post",
  "Ecom Express",
  "Shadowfax",
  "XpressBees",
];

export default function VendorOrderDetail({ orderId }: OrderDetailProps) {
  const router = useRouter();
  const [status, setStatus] = useState("Packed");
  const [showShippingModal, setShowShippingModal] = useState(false);
  const [selectedCarrier, setSelectedCarrier] = useState("");
  const [trackingId, setTrackingId] = useState("");

  // Mock order data (NO customer details)
  const order = {
    orderId: "ORD-2024-002",
    orderDate: "2024-02-11",
    status: status,
    product: {
      name: "Silk Saree",
      sku: "SS-045",
      quantity: 1,
      price: 5000,
      image: "/assets/images/categories/cs2.jpg",
    },
    hub: {
      name: "Mumbai Hub",
      address: "123, Industrial Area, Mumbai, Maharashtra - 400001",
      contact: "+91 98765 00000",
    },
  };

  const handleMarkAsPacked = () => {
    setStatus("Packed");
    showSuccessToast("Order marked as packed");
  };

  const handleOpenShippingModal = () => {
    setShowShippingModal(true);
  };

  const handleConfirmShipping = () => {
    if (!selectedCarrier) {
      showErrorToast("Please select a carrier");
      return;
    }
    if (!trackingId.trim()) {
      showErrorToast("Please enter tracking ID");
      return;
    }

    setStatus("Shipped");
    showSuccessToast(`Order shipped via ${selectedCarrier}`);
    setShowShippingModal(false);
    
    // Redirect back to orders list
    setTimeout(() => {
      router.push("/vendor/dashboard/orders");
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
            <h1 className="text-2xl font-bold text-gray-900">Order Details</h1>
            <p className="text-sm text-gray-600 mt-1">Order ID: {order.orderId}</p>
          </div>
        </div>
        <div className="flex gap-3">
          {status === "Assigned" && (
            <button
              onClick={handleMarkAsPacked}
              className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
            >
              Mark as Packed
            </button>
          )}
          {status === "Packed" && (
            <button
              onClick={handleOpenShippingModal}
              className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium"
            >
              Ship to Hub
            </button>
          )}
          {status === "Delivered" && (
            <div className="px-6 py-2 bg-green-100 text-green-800 rounded-lg font-medium border border-green-300">
              Order Completed
            </div>
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
              status === "Assigned" ? "text-blue-600" :
              status === "Packed" ? "text-purple-600" :
              status === "Shipped" ? "text-indigo-600" :
              "text-green-600"
            }`}>
              {status}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Total Amount</p>
            <p className="text-base font-medium text-gray-900 mt-1">
              ₹{(order.product.price * order.product.quantity).toLocaleString()}
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
                <p className="text-sm text-gray-600">Price per Unit</p>
                <p className="text-base font-medium text-gray-900">
                  ₹{order.product.price.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Hub Details */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center gap-2 mb-4">
          <MapPin className="h-5 w-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">Delivery Hub</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">Hub Name</p>
            <p className="text-base font-medium text-gray-900 mt-1">{order.hub.name}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Contact</p>
            <p className="text-base font-medium text-gray-900 mt-1">{order.hub.contact}</p>
          </div>
          <div className="md:col-span-2">
            <p className="text-sm text-gray-600">Address</p>
            <p className="text-base font-medium text-gray-900 mt-1">{order.hub.address}</p>
          </div>
        </div>
      </div>

      {/* Processing Instructions */}
      {status !== "Delivered" && (
        <div className="bg-blue-50 border border-blue-200 p-6 rounded-lg">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">Processing Instructions</h3>
          <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
            <li>Ensure product quality before packing</li>
            <li>Use appropriate packaging materials</li>
            <li>Include invoice and product details</li>
            <li>Ship to the designated hub within 24 hours of packing</li>
            <li>Update tracking information if available</li>
          </ul>
        </div>
      )}

      {/* Order Completed Message */}
      {status === "Delivered" && (
        <div className="bg-green-50 border border-green-200 p-6 rounded-lg">
          <h3 className="text-sm font-semibold text-green-900 mb-2">Order Completed</h3>
          <p className="text-sm text-green-800">
            This order has been successfully delivered to the hub and received by the admin. Your role in this order is now complete. Thank you for your service!
          </p>
        </div>
      )}

      {/* Shipping Modal */}
      {showShippingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Ship to Hub</h2>
                <p className="text-sm text-gray-600 mt-1">Enter shipping details</p>
              </div>
              <button
                onClick={() => setShowShippingModal(false)}
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
                    <p className="text-sm text-gray-600">SKU: {order.product.sku}</p>
                  </div>
                </div>
              </div>

              {/* Hub Info */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="h-4 w-4 text-gray-600" />
                  <h3 className="text-sm font-semibold text-gray-900">Destination Hub</h3>
                </div>
                <p className="text-sm font-medium text-gray-900">{order.hub.name}</p>
                <p className="text-sm text-gray-600 mt-1">{order.hub.address}</p>
              </div>

              {/* Carrier Selection */}
              <div>
                <Dropdown
                  label="Select Carrier"
                  value={selectedCarrier}
                  options={carriers}
                  onChange={(value) => setSelectedCarrier(value as string)}
                  placeholder="Choose a carrier"
                />
              </div>

              {/* Tracking ID */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tracking ID
                </label>
                <div className="relative">
                  <Truck className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <input
                    type="text"
                    value={trackingId}
                    onChange={(e) => setTrackingId(e.target.value)}
                    placeholder="Enter tracking ID"
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowShippingModal(false)}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmShipping}
                className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium"
              >
                Confirm Shipping
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
