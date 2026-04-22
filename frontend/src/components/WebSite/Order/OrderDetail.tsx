"use client"

// OrderDetail component for displaying individual order information
import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import {
  ArrowLeft,
  Package,
  Truck,
  CheckCircle,
  Star,
  Calendar,
  MapPin,
  CreditCard,
  Eye,
  Plus,
  Minus,
  Download,
  MessageCircle,
  AlertCircle,
  Clock
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/UI/Card"
import orderService, { Order as APIOrder } from "@/services/orderService"
import ReviewModal from "./ReviewModal"

interface OrderDetailProps {
  orderId: string
}

// Helper to normalize status for display
const formatStatus = (status: string) => {
  return status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())
}

// Helper to get normalized status for comparison
const getNormalizedStatus = (status: string) => {
  const s = status.toLowerCase()
  if (['dispatched', 'shipped', 'shipped_to_customer'].includes(s)) return 'shipped'
  if (['completed', 'delivered', 'received', 'returned'].includes(s)) return 'received'
  if (['failed', 'cancelled', 'rejected', 'rejected_by_admin_hub'].includes(s)) return 'cancelled'
  // Everything else (order_created, vendor_processing, packed_by_vendor,
  // in_transit_to_admin_hub, received_at_admin_hub, approved_by_admin_hub) → processing
  return 'processing'
}

// Helper to get status color class
const getStatusColorClass = (status: string) => {
  const normalized = getNormalizedStatus(status)
  switch (normalized) {
    case 'received': return 'bg-green-100 text-green-800'
    case 'shipped': return 'bg-blue-100 text-blue-800'
    case 'processing': return 'bg-yellow-100 text-yellow-800'
    case 'cancelled': return 'bg-red-100 text-red-800'
    default: return 'bg-slate-100 text-slate-800'
  }
}

// Helper to check status timeline steps
const isStatusReached = (orderStatus: string, step: string) => {
  const statusOrder = ['processing', 'shipped', 'received']
  const normalized = getNormalizedStatus(orderStatus)

  // If cancelled, don't show any progress
  if (normalized === 'cancelled') return false;

  const currentIndex = statusOrder.indexOf(normalized)
  const stepIndex = statusOrder.indexOf(step)
  // If the status is unknown (like some admin status not mapped), fallback to current step = -1
  return currentIndex !== -1 && currentIndex >= stepIndex
}

const isStatusCurrent = (orderStatus: string, step: string) => {
  return getNormalizedStatus(orderStatus) === step
}

export default function OrderDetail({ orderId }: OrderDetailProps) {
  const [quantities, setQuantities] = useState<{ [key: number]: number }>({})
  const [orderDetails, setOrderDetails] = useState<APIOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reviewModalState, setReviewModalState] = useState<{ isOpen: boolean, orderId: string, items: any[] }>({ isOpen: false, orderId: '', items: [] })

  useEffect(() => {
    fetchOrder()
  }, [orderId])

  const fetchOrder = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await orderService.getOrderById(orderId)
      if (response.success) {
        setOrderDetails(response.data)
      } else {
        setError('Order not found')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch order details')
    } finally {
      setLoading(false)
    }
  }

  const updateQuantity = (productId: number, change: number) => {
    setQuantities(prev => ({
      ...prev,
      [productId]: Math.max(1, (prev[productId] || 1) + change)
    }))
  }

  const getQuantity = (productId: number) => quantities[productId] || 1

  const handleDownloadInvoice = async () => {
    if (!orderDetails?.id) return;
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
      const token = localStorage.getItem("userToken") || sessionStorage.getItem("userToken") || "";
      const response = await fetch(`${baseUrl}/orders/${orderDetails.id}/invoice`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to generate invoice");
      const html = await response.text();
      const win = window.open("", "_blank");
      if (win) {
        win.document.write(html);
        win.document.close();
        win.focus();
        setTimeout(() => win.print(), 300);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to generate invoice. Please try again later.");
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 py-8 font-sans">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center items-center min-h-[400px]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (error || !orderDetails) {
    return (
      <div className="min-h-screen bg-slate-50 py-8 font-sans">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card className="border p-12 text-center">
            <CardContent>
              {error ? (
                <>
                  <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-slate-900 mb-2">Error Loading Order</h3>
                  <p className="text-slate-600 mb-6">{error}</p>
                  <div className="flex gap-3 justify-center">
                    <button
                      onClick={fetchOrder}
                      className="bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition-colors"
                    >
                      Try Again
                    </button>
                    <Link href="/order">
                      <button className="border border-slate-300 text-slate-700 px-6 py-3 rounded-xl hover:bg-slate-50 transition-colors">
                        Back to Orders
                      </button>
                    </Link>
                  </div>
                </>
              ) : (
                <>
                  <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-slate-900 mb-2">Order Not Found</h3>
                  <p className="text-slate-600 mb-6">The order you&apos;re looking for doesn&apos;t exist or has been removed.</p>
                  <Link href="/order">
                    <button className="bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition-colors">
                      Back to Orders
                    </button>
                  </Link>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const normalizedStatus = getNormalizedStatus(orderDetails.status)
  const shippingAddr = orderDetails.shippingAddress || {}

  return (
    <div className="min-h-screen bg-white py-8 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link href="/order">
          <button className="flex items-center gap-2 text-white bg-[#222222] p-3 rounded-md mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Orders
          </button>
        </Link>

        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-1">Order Details</h1>
              <p className="text-slate-600">Order #{orderDetails.orderId}</p>
            </div>
            <div>
              <div className={`inline-flex items-center px-3 py-2 rounded-full text-sm font-medium ${getStatusColorClass(orderDetails.status)}`}>
                <Package className="w-4 h-4 mr-1" />
                {formatStatus(orderDetails.status)}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Order Items */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order Status Timeline */}
            <Card className="border">
              <CardHeader>
                <CardTitle className="text-xl">Order Status</CardTitle>
              </CardHeader>
              <CardContent>
                {normalizedStatus === 'cancelled' ? (
                  <div className="flex flex-col items-center justify-center p-4">
                    <AlertCircle className="w-12 h-12 text-red-500 mb-2" />
                    <span className="text-lg font-medium text-red-600">Order Cancelled</span>
                    <span className="text-sm text-slate-500">{new Date(orderDetails.createdAt).toLocaleDateString()}</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col items-center">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${isStatusReached(orderDetails.status, 'processing') ? "bg-yellow-500" : "bg-slate-300"
                        }`}>
                        <Package className="w-5 h-5 text-white" />
                      </div>
                      <span className={`text-sm font-medium ${isStatusReached(orderDetails.status, 'processing') ? "text-yellow-600" : "text-slate-500"
                        }`}>Processing</span>
                      <span className="text-xs text-slate-500">
                        {isStatusCurrent(orderDetails.status, 'processing') ? "Current" : isStatusReached(orderDetails.status, 'shipped') ? "Complete" : "Pending"}
                      </span>
                    </div>
                    <div className={`flex-1 h-0.5 mx-4 ${isStatusReached(orderDetails.status, 'shipped') ? "bg-blue-300" : "bg-slate-300"
                      }`}></div>
                    <div className="flex flex-col items-center">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${isStatusReached(orderDetails.status, 'shipped') ? "bg-blue-500" : "bg-slate-300"
                        }`}>
                        <Truck className="w-5 h-5 text-white" />
                      </div>
                      <span className={`text-sm font-medium ${isStatusReached(orderDetails.status, 'shipped') ? "text-blue-600" : "text-slate-500"
                        }`}>Shipped</span>
                      <span className="text-xs text-slate-500">
                        {isStatusCurrent(orderDetails.status, 'shipped') ? "Current" : isStatusReached(orderDetails.status, 'received') ? "Complete" : "Pending"}
                      </span>
                    </div>
                    <div className={`flex-1 h-0.5 mx-4 ${isStatusReached(orderDetails.status, 'received') ? "bg-green-300" : "bg-slate-300"
                      }`}></div>
                    <div className="flex flex-col items-center">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${isStatusReached(orderDetails.status, 'received') ? "bg-green-500" : "bg-slate-300"
                        }`}>
                        <CheckCircle className="w-5 h-5 text-white" />
                      </div>
                      <span className={`text-sm font-medium ${isStatusReached(orderDetails.status, 'received') ? "text-green-600" : "text-slate-500"
                        }`}>Received</span>
                      <span className="text-xs text-slate-500">
                        {isStatusCurrent(orderDetails.status, 'received') ? "Complete" : "Pending"}
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Ordered Items */}
            <Card className="border overflow-hidden">
              <CardHeader className="border-b bg-slate-50">
                <CardTitle className="text-xl">Ordered Items</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-6">
                  {orderDetails.items.map((item) => (
                    <div key={item.id} className="flex items-center gap-4 p-4 border border-slate-200 rounded-xl hover:shadow-md transition-shadow">
                      <div className="relative w-20 h-20 bg-slate-100 rounded-lg overflow-hidden flex items-center justify-center">
                        {item.productImage ? (
                          <Image
                            src={item.productImage}
                            alt={item.productName}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <Package className="w-10 h-10 text-slate-400" />
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-slate-900 mb-1">{item.productName}</h3>
                        <div className="flex items-center gap-4 text-sm text-slate-600 mb-2">
                          <span>Qty: {item.quantity}</span>
                          {(item.color || item.size) && (
                            <div className="flex items-center gap-2 border-l border-slate-300 pl-3 ml-3">
                              {item.color && <span>{item.color}</span>}
                              {item.color && item.size && <span>|</span>}
                              {item.size && <span>Size: {item.size}</span>}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-lg font-bold text-slate-900">
                            ${item.totalPrice.toFixed(2)}
                          </span>
                          <span className="text-sm text-slate-500">
                            ${item.unitPrice.toFixed(2)} each
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Action Buttons */}
                <div className="mt-6 pt-6 border-t border-slate-200">
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={handleDownloadInvoice}
                      className="flex items-center gap-2 px-4 py-3 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      Download Invoice
                    </button>
                    {normalizedStatus === "received" && (
                      <button
                        onClick={() => setReviewModalState({ isOpen: true, orderId: orderDetails.id, items: orderDetails.items })}
                        className="flex items-center gap-2 px-4 py-3 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors"
                      >
                        <Star className="w-4 h-4" />
                        Write Review
                      </button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Order Summary & Details */}
          <div className="lg:col-span-1">
            <div className="lg:sticky lg:top-8 space-y-6">
              {/* Order Summary */}
              <Card className="border overflow-hidden">
                <CardHeader className="border-b bg-slate-100">
                  <CardTitle className="text-xl">Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Subtotal</span>
                    <span className="font-medium">${orderDetails.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Shipping</span>
                    <span className="font-medium text-green-600">
                      {orderDetails.shippingCost > 0 ? `$${orderDetails.shippingCost.toFixed(2)}` : 'Free'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Tax</span>
                    <span className="font-medium">${orderDetails.tax.toFixed(2)}</span>
                  </div>
                  {orderDetails.discount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-slate-600">Discount</span>
                      <span className="font-medium text-green-600">-${orderDetails.discount.toFixed(2)}</span>
                    </div>
                  )}
                  {orderDetails.bagTypePrice && orderDetails.bagTypePrice > 0 && (
                    <div className="flex justify-between">
                      <span className="text-slate-600">Bag ({orderDetails.bagTypeName})</span>
                      <span className="font-medium">${orderDetails.bagTypePrice.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="border-t border-slate-200 pt-4">
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total</span>
                      <span>${orderDetails.totalAmount.toFixed(2)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Delivery Information */}
              <Card className="border overflow-hidden">
                <CardHeader className="border-b bg-slate-100">
                  <CardTitle className="text-xl">Delivery Info</CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-blue-600 shrink-0" />
                    <div>
                      <p className="font-medium text-slate-900">
                        {normalizedStatus === "received" ? "Delivered" : "Estimated Delivery"}
                      </p>
                      <p className="text-sm text-slate-600">
                        {normalizedStatus === "received"
                          ? `Delivered on ${new Date(orderDetails.createdAt).toLocaleDateString()}`
                          : orderDetails.estimatedDelivery
                            ? new Date(orderDetails.estimatedDelivery).toLocaleDateString()
                            : "To be updated"
                        }
                      </p>
                    </div>
                  </div>
                  {shippingAddr && (
                    <div className="flex items-start gap-3">
                      <MapPin className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium text-slate-900">Shipping Address</p>
                        <div className="text-sm text-slate-600 break-words">
                          {shippingAddr.firstName && <p>{shippingAddr.firstName} {shippingAddr.lastName}</p>}
                          {shippingAddr.street && <p>{shippingAddr.street}</p>}
                          {shippingAddr.city && <p>{shippingAddr.city}, {shippingAddr.state} {shippingAddr.zipCode}</p>}
                          {shippingAddr.phone && <p>{shippingAddr.phone}</p>}
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <CreditCard className="w-5 h-5 text-purple-600 shrink-0" />
                    <div>
                      <p className="font-medium text-slate-900">Payment Method</p>
                      <p className="text-sm text-slate-600">{orderDetails.paymentMethod || "N/A"}</p>
                      <p className="text-xs text-slate-500 mt-1">Status: {orderDetails.paymentStatus}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

      </div>
      <ReviewModal
        isOpen={reviewModalState.isOpen}
        onClose={() => setReviewModalState({ ...reviewModalState, isOpen: false })}
        orderId={reviewModalState.orderId}
        items={reviewModalState.items}
      />
    </div>
  )
}