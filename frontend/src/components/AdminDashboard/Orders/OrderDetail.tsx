"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Package, CreditCard, User, MapPin, Truck, Star, Briefcase } from "lucide-react";
import { useRouter } from "next/navigation";
import { showSuccessToast, showErrorToast } from "@/lib/toast-utils";
import { orderService, Order } from "@/services/orderService";

interface OrderDetailProps {
    orderId: string;
}

export default function OrderDetail({ orderId }: OrderDetailProps) {
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

    if (isLoading) {
        return <div className="p-6 text-center text-gray-500">Loading order overview...</div>;
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
                        <h1 className="text-2xl font-bold text-gray-900">Order Details Overview</h1>
                        <p className="text-sm text-gray-600 mt-1">Full overview of Order ID: {order.orderId}</p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <span className={`px-4 py-2 rounded-lg font-medium border ${status === "DELIVERED" ? "bg-green-100 text-green-800 border-green-300" :
                        ["SHIPPED_TO_CUSTOMER", "IN_TRANSIT_TO_ADMIN_HUB"].includes(status) ? "bg-blue-100 text-blue-800 border-blue-300" :
                            "bg-yellow-100 text-yellow-800 border-yellow-300"
                        }`}>
                        Status: {status.replace(/_/g, " ")}
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Product & Order Info */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Product Details */}
                    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                        <div className="flex items-center gap-2 mb-4">
                            <Package className="h-5 w-5 text-gray-600" />
                            <h2 className="text-lg font-semibold text-gray-900">Items Ordered</h2>
                        </div>
                        <div className="space-y-4">
                            {order.items?.map((item: any) => (
                                <div key={item.id} className="flex gap-4 p-4 bg-gray-50 rounded-lg">
                                    <img
                                        src={item.productImage || "/assets/images/placeholder.jpg"}
                                        alt={item.productName}
                                        className="w-24 h-24 object-cover rounded-lg border border-gray-200"
                                    />
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h3 className="text-base font-semibold text-gray-900">{item.productName}</h3>
                                                <p className="text-sm text-gray-600 mt-1">SKU: {item.sku}</p>
                                                {item.variantId && (
                                                    <p className="text-sm text-gray-600 mt-1">Size: {item.size} | Color: {item.color}</p>
                                                )}
                                                <p className="text-sm text-gray-600 mt-1">Vendor: {item.vendorName}</p>
                                            </div>
                                            <p className="text-base font-bold text-gray-900">₹{item.unitPrice.toLocaleString()}</p>
                                        </div>
                                        <div className="flex gap-6 mt-4">
                                            <div>
                                                <p className="text-xs text-gray-500 uppercase">Quantity</p>
                                                <p className="text-sm font-medium text-gray-900">{item.quantity}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-500 uppercase">Subtotal</p>
                                                <p className="text-sm font-medium text-gray-900">₹{item.totalPrice.toLocaleString()}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="mt-6 border-t border-gray-100 pt-4 flex justify-end">
                            <div className="space-y-1 text-right">
                                <p className="text-sm text-gray-600">Total Amount</p>
                                <p className="text-xl font-bold text-teal-600">₹{order.totalAmount?.toLocaleString()}</p>
                            </div>
                        </div>
                    </div>

                    {/* Timeline / Status */}
                    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                        <div className="flex items-center gap-2 mb-6">
                            <Truck className="h-5 w-5 text-gray-600" />
                            <h2 className="text-lg font-semibold text-gray-900">Delivery Status Timeline Snapshot</h2>
                        </div>
                        <div className="space-y-6 relative before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-100">
                            <div className="relative pl-8">
                                <div className="absolute left-0 top-1.5 w-5 h-5 rounded-full bg-green-500 border-4 border-white"></div>
                                <div>
                                    <p className="text-sm font-semibold text-gray-900">Order Placed</p>
                                    <p className="text-xs text-gray-500">{new Date(order.createdAt).toLocaleDateString()}</p>
                                </div>
                            </div>
                            <div className="relative pl-8">
                                <div className={`absolute left-0 top-1.5 w-5 h-5 rounded-full border-4 border-white ${["PACKED_BY_VENDOR", "IN_TRANSIT_TO_ADMIN_HUB", "RECEIVED_AT_ADMIN_HUB", "APPROVED_BY_ADMIN_HUB", "SHIPPED_TO_CUSTOMER", "DELIVERED"].includes(status) ? "bg-green-500" : "bg-gray-200"
                                    }`}></div>
                                <div>
                                    <p className="text-sm font-semibold text-gray-900">Packed & Dispatched from Vendor</p>
                                </div>
                            </div>
                            <div className="relative pl-8">
                                <div className={`absolute left-0 top-1.5 w-5 h-5 rounded-full border-4 border-white ${["RECEIVED_AT_ADMIN_HUB", "APPROVED_BY_ADMIN_HUB", "SHIPPED_TO_CUSTOMER", "DELIVERED"].includes(status) ? "bg-green-500" : "bg-gray-200"
                                    }`}></div>
                                <div>
                                    <p className="text-sm font-semibold text-gray-900">Received at Admin Hub</p>
                                </div>
                            </div>
                            <div className="relative pl-8">
                                <div className={`absolute left-0 top-1.5 w-5 h-5 rounded-full border-4 border-white ${status === "DELIVERED" ? "bg-green-500" :
                                    status === "SHIPPED_TO_CUSTOMER" ? "bg-blue-500" : "bg-gray-200"
                                    }`}></div>
                                <div>
                                    <p className="text-sm font-semibold text-gray-900">Out for Final Delivery</p>
                                </div>
                            </div>
                            <div className="relative pl-8">
                                <div className={`absolute left-0 top-1.5 w-5 h-5 rounded-full border-4 border-white ${status === "DELIVERED" ? "bg-green-500" : "bg-gray-200"
                                    }`}></div>
                                <div>
                                    <p className="text-sm font-semibold text-gray-900">Delivered</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column - Stakeholders */}
                <div className="space-y-6">
                    {/* Customer Info */}
                    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                        <div className="flex items-center gap-2 mb-4">
                            <User className="h-5 w-5 text-gray-600" />
                            <h2 className="text-lg font-semibold text-gray-900">Customer</h2>
                        </div>
                        <div className="space-y-3">
                            <div>
                                <p className="text-xs text-gray-500 uppercase">Name</p>
                                <p className="text-sm font-medium text-gray-900">{order.customerName}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 uppercase">Contact</p>
                                <p className="text-sm text-gray-900">{order.customerPhone || "N/A"}</p>
                                <p className="text-sm text-gray-600">{order.customerEmail}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 uppercase">Address</p>
                                <p className="text-sm text-gray-900 leading-relaxed">
                                    {order.shippingAddress?.addressLine1} {order.shippingAddress?.addressLine2 && `, ${order.shippingAddress?.addressLine2}`}
                                    <br />
                                    {order.shippingAddress?.city}, {order.shippingAddress?.state} - {order.shippingAddress?.postalCode}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Vendor Info Section - Can be multiple, but we show primary */}
                    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                        <div className="flex items-center gap-2 mb-4">
                            <Briefcase className="h-5 w-5 text-gray-600" />
                            <h2 className="text-lg font-semibold text-gray-900">Primary Vendor</h2>
                        </div>
                        <div className="space-y-3">
                            <div>
                                <p className="text-xs text-gray-500 uppercase">Store Name</p>
                                <p className="text-sm font-medium text-gray-900">{order.items?.[0]?.vendorName || "Unknown"}</p>
                            </div>
                            {/* Further vendor details would require backend populated fields currently missing from OrderItem */}
                        </div>
                    </div>

                    {/* Payment Info */}
                    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                        <div className="flex items-center gap-2 mb-4">
                            <CreditCard className="h-5 w-5 text-gray-600" />
                            <h2 className="text-lg font-semibold text-gray-900">Payment</h2>
                        </div>
                        <div className="space-y-3">
                            <div className="flex justify-between">
                                <p className="text-sm text-gray-600">Method</p>
                                <p className="text-sm font-medium text-gray-900">{order.paymentMethod}</p>
                            </div>
                            <div className="flex justify-between">
                                <p className="text-sm text-gray-600">Status</p>
                                <p className={`text-sm font-medium ${order.paymentStatus === 'SUCCESS' ? 'text-green-600' : 'text-yellow-600'}`}>
                                    {order.paymentStatus}
                                </p>
                            </div>
                            <div className="pt-2 border-t border-gray-50">
                                <p className="text-xs text-gray-500 mb-1">Transaction ID</p>
                                <p className="text-xs font-mono text-gray-900 break-all">{order.paymentId || "N/A"}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
