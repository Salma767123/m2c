"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Package, CreditCard, User, MapPin, Truck, Star, Briefcase, FileText, ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation";
import { showSuccessToast, showErrorToast } from "@/lib/toast-utils";
import { orderService, Order } from "@/services/orderService";
import { hubService, Hub } from "@/services/hubService";
import { MapPin as HubIcon } from "lucide-react";
import axiosInstance from "@/lib/axios";
import { hasPermission } from "@/lib/auth";

interface OrderDetailProps {
    orderId: string;
}

export default function OrderDetail({ orderId }: OrderDetailProps) {
    const router = useRouter();
    const [order, setOrder] = useState<Order | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [invoiceLoading, setInvoiceLoading] = useState(false);
    const [hubs, setHubs] = useState<Hub[]>([]);
    const [isAssigningHub, setIsAssigningHub] = useState(false);
    const [selectedHubId, setSelectedHubId] = useState<string>("");

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
            showErrorToast(error.message || "Failed to load order details");
        } finally {
            setIsLoading(false);
        }
    };

    const handleAssignHub = async () => {
        if (!order || !selectedHubId) {
            showErrorToast("Order data missing or hub not selected");
            return;
        }

        setIsAssigningHub(true);
        try {
            // Update order with assignedHubId
            const res = await axiosInstance.put(`/orders/admin/${order.id}/status`, {
                assignedHubId: selectedHubId,
                status: order.status // Keep current status
            });

            if (res.data.success) {
                showSuccessToast("Hub assigned successfully");
                setOrder(res.data.data);
            }
        } catch (error: any) {
            showErrorToast(error.response?.data?.error || "Failed to assign hub");
        } finally {
            setIsAssigningHub(false);
        }
    };

    const handlePrintInvoice = async () => {
        if (!order) return;
        setInvoiceLoading(true);
        try {
            // Open invoice in a new tab — the endpoint returns raw HTML
            const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
            const token = localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken') || '';
            const invoiceUrl = `${baseUrl}/orders/admin/${order.id}/invoice`;

            // Fetch the HTML and open it in a new window for print
            const response = await fetch(invoiceUrl, {
                headers: { Authorization: `Bearer ${token}` },
                credentials: 'include',
            });
            const html = await response.text();
            const win = window.open('', '_blank');
            if (win) {
                win.document.write(html);
                win.document.close();
                win.focus();
            }
        } catch (error: any) {
            showErrorToast('Invoice Error', error.message || 'Failed to generate invoice');
        } finally {
            setInvoiceLoading(false);
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
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                            <p className="text-sm text-gray-600">Order ID: <span className="font-mono font-semibold">{order.orderId}</span></p>
                            {order.invoiceNo && (
                                <span className="inline-flex items-center gap-1.5 text-sm bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full px-3 py-0.5 font-semibold">
                                    <FileText className="h-3.5 w-3.5" />
                                    Invoice: {order.invoiceNo}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex gap-3 items-center">
                    {/* Print Invoice Button */}
                    {hasPermission('view_billing') && (
                        <button
                            onClick={handlePrintInvoice}
                            disabled={invoiceLoading}
                            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                        >
                            {invoiceLoading
                                ? <span className="animate-spin h-4 w-4 border-2 border-gray-400 border-t-transparent rounded-full" />
                                : <FileText className="h-4 w-4" />}
                            {invoiceLoading ? 'Generating…' : 'Print Invoice'}
                        </button>
                    )}
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
                                                <p className="text-sm text-gray-600 mt-1">Vendor: {item.vendorName}</p>
                                            </div>
                                            <p className="text-base font-bold text-gray-900">${item.unitPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                        </div>
                                        <div className="flex gap-6 mt-4">
                                            <div>
                                                <p className="text-xs text-gray-500 uppercase">Quantity</p>
                                                <p className="text-sm font-medium text-gray-900">{item.quantity}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-500 uppercase">Subtotal</p>
                                                <p className="text-sm font-medium text-gray-900">${item.totalPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="mt-6 border-t border-gray-100 pt-4 flex justify-end">
                            <div className="space-y-1 text-right">
                                <p className="text-sm text-gray-600">Total Amount</p>
                                <p className="text-xl font-bold text-teal-600">${order.totalAmount?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
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
                                <div className="text-sm text-gray-900 leading-relaxed mt-1">
                                    <p className="font-medium">{order.shippingAddress?.street}</p>
                                    {order.shippingAddress?.addressLine2 && <p>{order.shippingAddress?.addressLine2}</p>}
                                    <p>{order.shippingAddress?.city}, {order.shippingAddress?.state} - {order.shippingAddress?.zipCode}</p>
                                    <p className="text-slate-500 font-medium italic mt-1 flex items-center gap-1">
                                        {order.shippingAddress?.country || 'USA'} 🇺🇸
                                    </p>
                                </div>
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

                    {/* Hub Assignment Section */}
                    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                        <div className="flex items-center gap-2 mb-4">
                            <HubIcon className="h-5 w-5 text-gray-600" />
                            <h2 className="text-lg font-semibold text-gray-900">Admin Hub Assignment</h2>
                        </div>

                        {order.assignedHubId ? (
                            <div className="p-4 bg-teal-50 border border-teal-100 rounded-lg">
                                <p className="text-xs text-teal-600 uppercase font-semibold">Assigned Hub</p>
                                <p className="text-sm font-medium text-teal-900 mt-1">
                                    {order.hub?.name || hubs.find(h => h.id === order.assignedHubId)?.name || "Assigned Hub"}
                                </p>
                                <p className="text-xs text-teal-700 mt-1 italic">Vendor can now pack and ship this order.</p>
                            </div>
                        ) : hasPermission('edit_orders') ? (
                            <div className="space-y-4">
                                <p className="text-sm text-gray-600 italic">Assign a hub to allow the vendor to process this order.</p>
                                <select
                                    className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                                    value={selectedHubId}
                                    onChange={(e) => setSelectedHubId(e.target.value)}
                                >
                                    <option value="">Select a hub...</option>
                                    {hubs.map(hub => (
                                        <option key={hub.id} value={hub.id}>{hub.name} ({hub.city})</option>
                                    ))}
                                </select>
                                <button
                                    onClick={handleAssignHub}
                                    disabled={isAssigningHub || !selectedHubId}
                                    className="w-full py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 disabled:opacity-50 transition-colors"
                                >
                                    {isAssigningHub ? "Assigning..." : "Assign Hub"}
                                </button>
                            </div>
                        ) : (
                            <p className="text-sm text-gray-500 italic">No hub assigned yet.</p>
                        )}
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
