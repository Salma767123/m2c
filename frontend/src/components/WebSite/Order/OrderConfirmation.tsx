"use client"

import Link from "next/link"
import Image from "next/image"
import { CheckCircle, Package, Truck, Mail, Download, ArrowRight, Clock, AlertCircle, CreditCard, MapPin, Phone, Loader2, ShoppingBag } from "lucide-react"
import { useState, useEffect } from "react"
import orderService, { Order } from "@/services/orderService"
import { popRecentOrder } from "@/lib/recentOrder"
import { useSearchParams } from "next/navigation"
import { getCountryName, getCountryFlag, getStateName, formatPhoneForDisplay } from "@/components/WebSite/CheckOut/CheckoutProcess/constants"

interface OrderConfirmationProps {
  // Optional initial data if passed from server
  initialOrder?: Order
}

export default function OrderConfirmation({ initialOrder }: OrderConfirmationProps) {
  const searchParams = useSearchParams()
  const orderId = searchParams.get("id")

  const [order, setOrder] = useState<Order | null>(initialOrder || null)
  const [loading, setLoading] = useState(!initialOrder && !!orderId)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (order || !orderId) return
    // The checkout page stashes the just-created order in sessionStorage so we
    // can render immediately instead of refetching. Only the original tab that
    // placed the order sees this; refreshes / shared links fall through to the
    // network fetch.
    const cached = popRecentOrder(orderId)
    if (cached) {
      setOrder(cached)
      setLoading(false)
      return
    }
    fetchOrder(orderId)
  }, [orderId])

  const fetchOrder = async (id: string) => {
    try {
      setLoading(true)
      const response = await orderService.getOrderById(id)
      if (response.success) {
        setOrder(response.data)
      } else {
        setError("Failed to load order details")
      }
    } catch (err: any) {
      console.error(err)
      setError("Failed to load order details")
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-gray-800" />
      </div>
    )
  }

  if (error || (!order && !loading)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Order Not Found</h1>
        <p className="text-gray-600 mb-6">{error || "We couldn't find the order details."}</p>
        <Link href="/">
          <button className="px-6 py-3 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors">
            Return to Home
          </button>
        </Link>
      </div>
    )
  }

  // Define values based on order or fallback
  // If no order (e.g. direct access without ID), show a generic "Order Pending" or redirect? 
  // For now let's assume if we hold this page, we show something.
  // But wait, if !order and !loading, I rendered error above. So here order is guaranteed if I passed those checks?
  // Actually if orderId is missing, loading is false, order is null -> Error.
  // So we only render below if order exists. 

  if (!order) return null; // Should be handled by error view but typescript might complain

  const orderStatus = order.status !== 'FAILED' && order.status !== 'CANCELLED'; // Simple check
  const isConfirmed = order.status === 'ORDER_CREATED' || order.status === 'CONFIRMED' || order.status === 'SHIPPED' || order.status === 'DELIVERED';

  const orderDate = new Date(order.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  // Estimated delivery: +7 days for standard
  const estimateDate = new Date(order.createdAt);
  estimateDate.setDate(estimateDate.getDate() + 7);
  const estimatedDelivery = estimateDate.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <div className="min-h-screen bg-gray-50 py-8 sm:py-12">
      <div className="max-w-420 mx-auto px-4 sm:px-6 lg:px-8">

        {/* Status Header */}
        <div className="text-center mb-8 sm:mb-12">
          <div className={`inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full mb-4 sm:mb-6 ${isConfirmed
              ? 'bg-green-100 border-2 border-green-200'
              : 'bg-red-200 border-2 border-red-400'
            }`}>
            {isConfirmed ? (
              <CheckCircle className="w-8 h-8 sm:w-10 sm:h-10 text-green-600" />
            ) : (
              <Clock className="w-8 h-8 sm:w-10 sm:h-10 text-red-600" />
            )}
          </div>

          <h1 className={`text-3xl sm:text-4xl lg:text-5xl font-bold mb-3 sm:mb-4 ${isConfirmed ? 'text-gray-900' : 'text-gray-700'
            }`}>
            {isConfirmed ? 'Order Confirmed!' : 'Order Processing'}
          </h1>

          <p className="text-base sm:text-lg lg:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
            {isConfirmed
              ? `Thank you for your purchase! Your order #${order.orderId} has been successfully placed.`
              : 'Your order is being processed.'
            }
          </p>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 mb-8 sm:mb-12">

          {/* Order Details - Left Column */}
          <div className="lg:col-span-2 space-y-6">

            {/* Order Information Card */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 bg-black border-b border-gray-200">
                <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                  <Package className="w-6 h-6 text-white" />
                  Order Information
                </h2>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
                  <div className="space-y-2">
                    <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">Order Number</h3>
                    <div className="bg-gray-50 border border-gray-300 rounded-lg p-3">
                      <p className="text-lg font-mono font-bold text-gray-900">{order.orderId}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">Order Date</h3>
                    <p className="text-lg text-gray-800 font-medium">{orderDate}</p>
                  </div>

                  <div className="space-y-2">
                    <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">Estimated Delivery</h3>
                    <p className="text-lg text-gray-800 font-medium">{estimatedDelivery}</p>
                  </div>

                  <div className="space-y-2">
                    <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">Payment Method</h3>
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-5 h-5 text-gray-600" />
                      <span className="text-lg text-gray-800 font-medium capitalize">{order.paymentMethod}</span>
                    </div>
                  </div>
                </div>

                {/* Status Timeline */}
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="font-semibold text-gray-900 mb-4">Order Status: <span className="text-blue-600">{order.status}</span></h3>
                  {/* Simplified timeline for now */}
                  <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 mt-4">
                    <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: '25%' }}></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">Order placed</p>
                </div>
              </div>
            </div>

            {/* Shipping Address */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 bg-black border-b border-gray-200">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-white" />
                  Shipping Address
                </h2>
              </div>
              <div className="p-6">
                <div className="space-y-1">
                  <p className="font-semibold text-gray-900 border-b border-gray-100 pb-1 mb-2">
                    {order.shippingAddress?.firstName} {order.shippingAddress?.lastName}
                  </p>
                  <div className="space-y-0.5 text-gray-700">
                    <p>{order.shippingAddress?.street}</p>
                    {order.shippingAddress?.addressLine2 && <p>{order.shippingAddress?.addressLine2}</p>}
                    <p>
                      {order.shippingAddress?.city}, {getStateName(order.shippingAddress?.state ?? "", order.shippingAddress?.country)} {order.shippingAddress?.zipCode}
                    </p>
                    <p className="flex items-center gap-1.5 mt-1 text-slate-500 font-medium italic text-sm">
                      Shipping to: {getCountryName(order.shippingAddress?.country)} {getCountryFlag(order.shippingAddress?.country)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100">
                    <div className="flex items-center gap-2 text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                      <Phone className="w-3.5 h-3.5" />
                      <span className="text-xs font-medium">{formatPhoneForDisplay(order.shippingAddress?.phone, order.shippingAddress?.country)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Order Summary - Right Column */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden sticky top-8">
              <div className="px-6 py-4 bg-black border-b border-gray-200">
                <h2 className="text-xl font-bold text-white">Order Summary</h2>
              </div>

              <div className="p-6">
                <div className="space-y-4 mb-6 cursor-default max-h-96 overflow-y-auto">
                  {order.items.map((item, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="w-12 h-12 bg-gray-200 rounded-lg shrink-0 overflow-hidden">
                        {item.productImage ? (
                          <img
                            src={item.productImage}
                            alt={item.productName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">img</div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 text-sm truncate">{item.productName}</h4>
                        <p className="text-xs text-gray-600">Qty: {item.quantity}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">${item.totalPrice.toFixed(2)}</p>
                        {item.quantity > 1 && (
                          <p className="text-xs text-gray-500">${item.unitPrice.toFixed(2)} each</p>
                        )}
                      </div>
                    </div>
                  )
                  )}

                  {/* Bag Add-on */}
                  {order.bagTypeName && order.bagTypePrice && order.bagTypePrice > 0 && (
                    <div className="flex items-center justify-between px-3 py-2 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <ShoppingBag className="w-4 h-4 text-amber-600" />
                        <span>Bag: {order.bagTypeName}</span>
                      </div>
                      <span className="font-medium text-gray-900">${order.bagTypePrice.toFixed(2)}</span>
                    </div>
                  )}
                </div>

                <div className="border-t border-gray-200 pt-4 space-y-3">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal</span>
                    <span className="font-medium">${order.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Shipping</span>
                    <span className="font-medium text-gray-800">${order.shippingCost.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Tax</span>
                    <span className="font-medium">${order.tax.toFixed(2)}</span>
                  </div>
                  {order.discount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount</span>
                      <span className="font-medium">-${order.discount.toFixed(2)}</span>
                    </div>
                  )}
                  {order.bagTypePrice && order.bagTypePrice > 0 && (
                    <div className="flex justify-between text-gray-600">
                      <span>Bag ({order.bagTypeName})</span>
                      <span className="font-medium">${order.bagTypePrice.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold text-gray-900 pt-3 border-t border-gray-200">
                    <span>Total</span>
                    <span>${order.totalAmount.toFixed(2)}</span>
                  </div>
                </div>

                {/* Notification Settings */}
                <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Mail className="w-5 h-5 text-gray-600 mt-0.5 shrink-0" />
                    <div>
                      <h4 className="font-semibold text-gray-900 text-sm">Email Updates</h4>
                      <p className="text-xs text-gray-700 mt-1">
                        We'll send updates to <span className="font-medium">{order.customerEmail}</span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link href="/" className="w-full sm:w-auto">
              <button className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-black hover:bg-gray-800 text-white font-semibold rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg">
                Continue Shopping
                <ArrowRight className="w-4 h-4" />
              </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
