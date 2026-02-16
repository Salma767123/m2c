"use client";

import { useState } from "react";
import { ArrowLeft, Package, CreditCard, User, MapPin, Truck, Star } from "lucide-react";
import { useRouter } from "next/navigation";
import { showSuccessToast } from "@/lib/toast-utils";

interface HubToCustomerDetailProps {
  orderId: string;
}

export default function HubToCustomerDetail({ orderId }: HubToCustomerDetailProps) {
  const router = useRouter();
  const [orderStatus, setOrderStatus] = useState("At Hub");

  // Mock order data
  const order = {
    orderId: "ORD-2024-005",
    orderDate: "2024-02-14",
    receivedAtHubDate: "2024-02-15",
    status: orderStatus,
    hub: "Mumbai Hub",
    product: {
      name: "Linen Curtains",
      sku: "LC-089",
      quantity: 1,
      price: 4000,
      image: "/assets/images/categories/cs3.jpg",
    },
    payment: {
      method: "Razorpay",
      transactionId: "TXN-2024-005",
      amount: 4000,
      status: "Completed",
    },
    vendor: {
      name: "Home Decor Textiles",
      email: "vendor@homedecor.com",
      phone: "+91 98765 11111",
      address: "789, Textile Hub, Panipat, Haryana - 132103",
      gst: "06AABCT5678F1Z9",
      rating: 4,
      review: "Product received in excellent condition. Packaging was secure and professional. Quality meets expectations.",
      notice: "Slight delay in shipping but overall good service.",
    },
    customer: {
      name: "David Brown",
      email: "david.brown@example.com",
      phone: "+91 98765 99999",
      address: "456, Marine Drive, Mumbai, Maharashtra - 400002",
    },
    shipping: {
      carrier: "Blue Dart",
      trackingId: "BD987654321IN",
      shippedDate: "2024-02-13",
    },
  };

  const handleMarkOutForDelivery = () => {
    setOrderStatus("Out for Delivery");
    showSuccessToast("Order marked as out for delivery");
  };

  const handleMarkAsDelivered = () => {
    setOrderStatus("Delivered");
    showSuccessToast("Order marked as delivered to customer");
    
    // Redirect back to hub to customer list
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
            <h1 className="text-2xl font-bold text-gray-900">Hub to Customer Order</h1>
            <p className="text-sm text-gray-600 mt-1">Order ID: {order.orderId}</p>
          </div>
        </div>
        <div className="flex gap-3">
          {order.status === "At Hub" && (
            <button
              onClick={handleMarkOutForDelivery}
              className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium"
            >
              Mark Out for Delivery
            </button>
          )}
          {order.status === "Out for Delivery" && (
            <button
              onClick={handleMarkAsDelivered}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
            >
              Mark as Delivered
            </button>
          )}
          {order.status === "Delivered" && (
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
              {new Date(order.orderDate).toLocaleDateString()}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Received at Hub</p>
            <p className="text-base font-medium text-gray-900 mt-1">
              {new Date(order.receivedAtHubDate).toLocaleDateString()}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Status</p>
            <p className={`text-base font-medium mt-1 ${
              order.status === "At Hub" ? "text-teal-600" :
              order.status === "Out for Delivery" ? "text-orange-600" :
              "text-green-600"
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

      {/* Customer Details */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center gap-2 mb-4">
          <User className="h-5 w-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">Customer Details</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">Customer Name</p>
            <p className="text-base font-medium text-gray-900 mt-1">{order.customer.name}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Email</p>
            <p className="text-base font-medium text-gray-900 mt-1">{order.customer.email}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Phone</p>
            <p className="text-base font-medium text-gray-900 mt-1">{order.customer.phone}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Delivery Address</p>
            <p className="text-base font-medium text-gray-900 mt-1">{order.customer.address}</p>
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
            Order is currently at <span className="font-semibold">{order.hub}</span>
          </p>
        </div>
      </div>

      {/* Vendor Shipping Details */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center gap-2 mb-4">
          <Truck className="h-5 w-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">Vendor Shipping Details</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
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
        <div className="border-t border-gray-200 pt-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Vendor: {order.vendor.name}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Email</p>
              <p className="text-base font-medium text-gray-900 mt-1">{order.vendor.email}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Phone</p>
              <p className="text-base font-medium text-gray-900 mt-1">{order.vendor.phone}</p>
            </div>
            <div className="md:col-span-2">
              <p className="text-sm text-gray-600">Address</p>
              <p className="text-base font-medium text-gray-900 mt-1">{order.vendor.address}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Vendor Review */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center gap-2 mb-4">
          <Star className="h-5 w-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">Admin Review of Vendor Delivery</h2>
        </div>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-600 mb-2">Rating</p>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`h-5 w-5 ${
                    star <= order.vendor.rating
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-gray-300"
                  }`}
                />
              ))}
              <span className="ml-2 text-sm text-gray-600">
                {order.vendor.rating} out of 5
              </span>
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-2">Review</p>
            <p className="text-base text-gray-900 bg-gray-50 p-4 rounded-lg border border-gray-200">
              {order.vendor.review}
            </p>
          </div>
          {order.vendor.notice && (
            <div>
              <p className="text-sm text-gray-600 mb-2">Notice</p>
              <p className="text-base text-gray-900 bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                {order.vendor.notice}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Delivery Instructions */}
      {order.status !== "Delivered" && (
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
      {order.status === "Delivered" && (
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
