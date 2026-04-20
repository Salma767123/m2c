"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Package, CreditCard, User, MapPin, Truck, Star } from "lucide-react";
import { useRouter } from "next/navigation";
import { showSuccessToast, showErrorToast } from "@/lib/toast-utils";
import { orderService, Order } from "@/services/orderService";
import { hasPermission } from "@/lib/auth";

interface HubToCustomerDetailProps {
  orderId: string;
}

export default function HubToCustomerDetail({ orderId }: HubToCustomerDetailProps) {
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchOrderDetails();
  }, [orderId]);

  const fetchOrderDetails = async () => {
    try {
      setIsLoading(true);
      const res = await orderService.getAdminOrderById(orderId);
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
      const res = await orderService.updateAdminOrderStatus(orderId, newStatus);
      if (res.success) {
        showSuccessToast(`Order marked as ${newStatus.replace(/_/g, " ")}`);
        setOrder(res.data);
        if (newStatus === "DELIVERED") {
          setTimeout(() => {
            router.push("/admin/dashboard/orders/hub-to-customer");
          }, 1500);
        }
      }
    } catch (error: any) {
      showErrorToast(error.message || "Failed to update order status");
    }
  };

  const handleMarkOutForDelivery = () => {
    handleUpdateStatus("SHIPPED_TO_CUSTOMER");
  };

  const handleMarkAsDelivered = () => {
    handleUpdateStatus("DELIVERED");
  };

  if (isLoading) {
    return <div className="p-6 text-center text-gray-500">Loading order details...</div>;
  }

  if (!order) {
    return <div className="p-6 text-center text-red-500">Order not found</div>;
  }

  const { status } = order;

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
            <h1 className="text-2xl font-bold text-gray-900">Hub to Customer Order</h1>
            <p className="text-sm text-gray-600 mt-1">Order ID: {order.orderId}</p>
          </div>
        </div>
        <div className="flex gap-3">
          {["RECEIVED_AT_ADMIN_HUB", "APPROVED_BY_ADMIN_HUB"].includes(status) && hasPermission('edit_orders') && (
            <button
              onClick={handleMarkOutForDelivery}
              className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium"
            >
              Mark Out for Delivery
            </button>
          )}
          {status === "SHIPPED_TO_CUSTOMER" && hasPermission('edit_orders') && (
            <button
              onClick={handleMarkAsDelivered}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
            >
              Mark as Delivered
            </button>
          )}
          {status === "DELIVERED" && (
            <div className="px-6 py-2 bg-green-100 text-green-800 rounded-lg font-medium border border-green-300">
              Order Delivered
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-gray-600">Order Date</p>
            <p className="text-base font-medium text-gray-900 mt-1">
              {new Date(order.createdAt).toLocaleDateString()}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Status</p>
            <p className={`text-base font-medium mt-1 ${["RECEIVED_AT_ADMIN_HUB", "APPROVED_BY_ADMIN_HUB"].includes(status) ? "text-teal-600" :
              status === "SHIPPED_TO_CUSTOMER" ? "text-orange-600" :
                status === "DELIVERED" ? "text-green-600" : "text-gray-600"
              }`}>
              {status.replace(/_/g, " ")}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Total Amount</p>
            <p className="text-base font-medium text-gray-900 mt-1">
              ₹{order.totalAmount?.toLocaleString()}
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
                {item.variantId && (
                  <p className="text-sm text-gray-600 mt-1">Size: {item.size} | Color: {item.color}</p>
                )}
                <div className="flex gap-6 mt-2">
                  <div>
                    <p className="text-sm text-gray-600">Quantity</p>
                    <p className="text-base font-medium text-gray-900">{item.quantity}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Price</p>
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

      {/* Payment Method */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center gap-2 mb-4">
          <CreditCard className="h-5 w-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">Payment Information</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-gray-600">Payment Method</p>
            <p className="text-base font-medium text-gray-900 mt-1">{order.paymentMethod}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Transaction ID</p>
            <p className="text-base font-medium text-gray-900 mt-1">{order.paymentId || "N/A"}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Payment Status</p>
            <p className="text-base font-medium text-green-600 mt-1">{order.paymentStatus}</p>
          </div>
        </div>
      </div>

      {/* Customer Details */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center gap-2 mb-4">
          <User className="h-5 w-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">Customer Details</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">Customer Name</p>
            <p className="text-base font-medium text-gray-900 mt-1">{order.customerName}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Email</p>
            <p className="text-base font-medium text-gray-900 mt-1">{order.customerEmail}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Phone</p>
            <p className="text-base font-medium text-gray-900 mt-1">{order.customerPhone || "N/A"}</p>
          </div>
          <div className="md:col-span-2">
            <p className="text-sm text-gray-600">Delivery Address</p>
            <p className="text-base font-medium text-gray-900 mt-1">
              {order.shippingAddress?.addressLine1} {order.shippingAddress?.addressLine2 && `, ${order.shippingAddress?.addressLine2}`}
              <br />
              {order.shippingAddress?.city}, {order.shippingAddress?.state} - {order.shippingAddress?.postalCode}
            </p>
          </div>
        </div>
      </div>

      {/* Hub Location */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center gap-2 mb-4">
          <MapPin className="h-5 w-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">Hub Information</h2>
        </div>
        <div className="bg-teal-50 border border-teal-200 p-4 rounded-lg">
          <p className="text-sm text-teal-800">
            Order processing from <span className="font-semibold">{order.hub?.name || "Admin Central Hub"}</span>
          </p>
        </div>
      </div>

      {/* Delivery Instructions */}
      {status !== "DELIVERED" && (
        <div className="bg-blue-50 border border-blue-200 p-6 rounded-lg">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">Delivery Instructions</h3>
          <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
            <li>Verify customer identity before delivery</li>
            <li>Ensure product is in good condition</li>
            <li>Get customer signature or confirmation</li>
            <li>Update delivery status immediately after handover</li>
            <li>Contact customer if delivery address is unclear</li>
          </ul>
        </div>
      )}

      {/* Delivery Completed Message */}
      {status === "DELIVERED" && (
        <div className="bg-green-50 border border-green-200 p-6 rounded-lg">
          <h3 className="text-sm font-semibold text-green-900 mb-2">Order Delivered Successfully</h3>
          <p className="text-sm text-green-800">
            This order has been successfully delivered to the customer. The order lifecycle is now complete.
          </p>
        </div>
      )}
    </div>
  );
}
