"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Package, MapPin, Truck, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { showSuccessToast, showErrorToast } from "@/lib/toast-utils";
import Dropdown from "@/components/UI/Dropdown";
import { orderService, Order } from "@/services/orderService";

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
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [showShippingModal, setShowShippingModal] = useState(false);
  const [selectedCarrier, setSelectedCarrier] = useState("");
  const [trackingId, setTrackingId] = useState("");

  useEffect(() => {
    fetchOrderDetails();
  }, [orderId]);

  const fetchOrderDetails = async () => {
    try {
      setIsLoading(true);
      const res = await orderService.getVendorOrderById(orderId);
      if (res.success) {
        setOrder(res.data);
      }
    } catch (error: any) {
      showErrorToast(error.message || "Failed to load order details");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    try {
      const res = await orderService.updateVendorOrderStatus(orderId, newStatus);
      if (res.success) {
        showSuccessToast(`Order marked as ${newStatus.replace(/_/g, " ")}`);
        setOrder(res.data);
      }
    } catch (error: any) {
      showErrorToast(error.message || "Failed to update status");
    }
  };

  const handleMarkAsPacked = () => {
    handleUpdateStatus("PACKED_BY_VENDOR");
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

    handleUpdateStatus("IN_TRANSIT_TO_ADMIN_HUB");
    setShowShippingModal(false);

    // Redirect back to orders list
    setTimeout(() => {
      router.push("/vendor/dashboard/orders");
    }, 1500);
  };

  if (isLoading) {
    return <div className="p-6 text-center text-gray-500">Loading order details...</div>;
  }

  if (!order) {
    return <div className="p-6 text-center text-red-500">Order not found</div>;
  }

  const status = order.status;

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
          {(status === "ORDER_CREATED" || status === "VENDOR_PROCESSING") && (
            <button
              onClick={handleMarkAsPacked}
              disabled={!order.assignedHubId}
              className={`px-6 py-2 rounded-lg transition-colors font-medium ${order.assignedHubId
                  ? "bg-purple-600 text-white hover:bg-purple-700"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
                }`}
              title={!order.assignedHubId ? "Wait for admin to assign a hub" : ""}
            >
              Mark as Packed
            </button>
          )}
          {status === "PACKED_BY_VENDOR" && (
            <button
              onClick={handleOpenShippingModal}
              disabled={!order.assignedHubId}
              className={`px-6 py-2 rounded-lg transition-colors font-medium ${order.assignedHubId
                  ? "bg-gray-900 text-white hover:bg-gray-800"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
                }`}
              title={!order.assignedHubId ? "Wait for admin to assign a hub" : ""}
            >
              Ship to Hub
            </button>
          )}
          {status === "IN_TRANSIT_TO_ADMIN_HUB" && (
            <div className="px-6 py-2 bg-blue-100 text-blue-800 rounded-lg font-medium border border-blue-300">
              In Transit to Hub
            </div>
          )}
          {["RECEIVED_AT_ADMIN_HUB", "APPROVED_BY_ADMIN_HUB", "SHIPPED_TO_CUSTOMER", "DELIVERED"].includes(status) && (
            <div className="px-6 py-2 bg-green-100 text-green-800 rounded-lg font-medium border border-green-300">
              Handled by Admin Hub ({status.replace(/_/g, " ")})
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
              {new Date(order.createdAt).toLocaleDateString()}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Status</p>
            <p className={`text-base font-medium mt-1 ${status === "VENDOR_PROCESSING" ? "text-blue-600" :
              status === "PACKED_BY_VENDOR" ? "text-purple-600" :
                status === "IN_TRANSIT_TO_ADMIN_HUB" ? "text-indigo-600" :
                  "text-green-600"
              }`}>
              {status.replace(/_/g, " ")}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Total Amount</p>
            <p className="text-base font-medium text-gray-900 mt-1">
              ₹{order.items.reduce((acc: number, item: any) => acc + item.totalPrice, 0).toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Product Details */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Product Details</h2>
        <div className="space-y-4">
          {order.items.map((item: any) => (
            <div key={item.id} className="flex gap-4 p-4 border border-gray-100 rounded-lg">
              <img
                src={item.productImage || "/assets/images/placeholder.jpg"}
                alt={item.productName}
                className="w-24 h-24 object-cover rounded-lg border border-gray-200"
              />
              <div className="flex-1">
                <h3 className="text-base font-semibold text-gray-900">{item.productName}</h3>
                <p className="text-sm text-gray-600 mt-1">SKU: {item.sku}</p>
                {item.variantId && (
                  <p className="text-sm text-gray-600 mt-1">Size: {item.size} | Color: {item.color}</p>
                )}
                <div className="flex gap-6 mt-2">
                  <div>
                    <p className="text-sm text-gray-600">Quantity</p>
                    <p className="text-base font-medium text-gray-900">{item.quantity}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Price per Unit</p>
                    <p className="text-base font-medium text-gray-900">
                      ₹{item.unitPrice.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Hub Details */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center gap-2 mb-4">
          <MapPin className="h-5 w-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">Delivery Hub</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {order.assignedHubId ? (
            <>
              <div>
                <p className="text-sm text-gray-600">Hub Name</p>
                <p className="text-base font-medium text-gray-900 mt-1">
                  {order.hub?.name || "Admin Central Hub"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Contact</p>
                <p className="text-base font-medium text-gray-900 mt-1">
                  {order.hub?.phone || order.hub?.email || "System Generated"}
                </p>
              </div>
              <div className="md:col-span-2">
                <p className="text-sm text-gray-600">Address</p>
                <p className="text-base font-medium text-gray-900 mt-1 leading-relaxed">
                  {order.hub ? (
                    <>
                      {order.hub.address}
                      <br />
                      {order.hub.city}, {order.hub.state} {order.hub.zipCode}
                    </>
                  ) : (
                    "Please ship to the designated M2C administrative hub."
                  )}
                </p>
              </div>
            </>
          ) : (
            <div className="md:col-span-2 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800 font-medium">Awaiting Admin Hub Assignment</p>
              <p className="text-xs text-yellow-700 mt-1">
                You will be able to pack and ship this order once an admin assigns a hub to it.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Processing Instructions */}
      {!["RECEIVED_AT_ADMIN_HUB", "APPROVED_BY_ADMIN_HUB", "SHIPPED_TO_CUSTOMER", "DELIVERED"].includes(status) && (
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
      {["RECEIVED_AT_ADMIN_HUB", "APPROVED_BY_ADMIN_HUB", "SHIPPED_TO_CUSTOMER", "DELIVERED"].includes(status) && (
        <div className="bg-green-50 border border-green-200 p-6 rounded-lg">
          <h3 className="text-sm font-semibold text-green-900 mb-2">Order Handled by Hub</h3>
          <p className="text-sm text-green-800">
            This order has been received at the hub. Your role in this order is now complete. Thank you for your service!
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
