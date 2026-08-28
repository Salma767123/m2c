"use client"

import Link from "next/link"
import Image from "next/image"
import { CheckCircle, Package, Truck, Mail, Download, ArrowRight, Clock, AlertCircle, CreditCard, MapPin, Phone, Loader2, BadgePercent, Gift } from "lucide-react"
import { useState, useEffect } from "react"
import orderService, { Order } from "@/services/orderService"
import { popRecentOrder } from "@/lib/recentOrder"
import { formatPrice } from "@/lib/currency"
import { useSearchParams } from "next/navigation"
import { getCountryName, getCountryFlag, getStateName, formatPhoneForDisplay } from "@/components/WebSite/CheckOut/CheckoutProcess/constants"
import Reveal from "@/components/WebSite/Shared/Reveal"

interface OrderConfirmationProps {
  // Optional initial data if passed from server
  initialOrder?: Order
}

// "ORDER_CREATED" → "Order Created"
const formatStatusLabel = (status?: string) =>
  String(status || "").replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase())

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
    /* Skeleton mirrors the confirmation card (success icon + heading + totals). */
    return (
      <div className="min-h-screen bg-gray-50 py-8 sm:py-12 px-3 sm:px-4">
        <div className="max-w-2xl mx-auto bg-white rounded-xl sm:rounded-2xl shadow-sm p-5 sm:p-6 lg:p-8 space-y-5 sm:space-y-6">
          <div className="w-16 h-16 bg-gray-200 rounded-full animate-pulse mx-auto" />
          <div className="space-y-3 text-center">
            <div className="h-7 w-64 bg-gray-200 rounded animate-pulse mx-auto" />
            <div className="h-4 w-80 max-w-full bg-gray-100 rounded animate-pulse mx-auto" />
          </div>
          <div className="border-t border-gray-100 pt-6 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex justify-between">
                <div className="h-4 w-32 bg-gray-100 rounded animate-pulse" />
                <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
              </div>
            ))}
          </div>
          <div className="h-11 w-full bg-gray-200 rounded-lg animate-pulse" />
        </div>
      </div>
    )
  }

  if (error || (!order && !loading)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h1 className="font-playfair text-2xl font-semibold text-[#1a1a1a] mb-2">Order Not Found</h1>
        <p className="text-gray-600 mb-6">{error || "We couldn't find the order details."}</p>
        <Link href="/">
          <button className="btn-shine inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#e01a1b] text-white rounded-full hover:bg-[#c41617] shadow-[0_6px_20px_rgba(224,26,27,0.3)] hover:shadow-[0_12px_30px_rgba(224,26,27,0.45)] hover:-translate-y-0.5 transition-all duration-300 font-semibold">
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

  // Every figure on this page is money the customer was ALREADY charged, so it must be
  // shown in the order's own currency — not the region's. This screen hardcoded '$',
  // which billed a ₹4,999 order as "$4,999.00" on the receipt.
  const money = (n: number) => formatPrice(n, order.currency === 'USD' ? 'USD' : 'INR');

  // Cart-style savings breakdown from the stored order. originalUnitPrice (set
  // only when an automatic offer applied) lets us surface the offer discount
  // alongside the coupon; MRP isn't frozen per line, so "Items subtotal" starts
  // at the post-product-discount goods value plus the offer add-back.
  const round2 = (n: number) => Math.round(n * 100) / 100
  const offerDiscount = Math.max(0, round2(
    (order.items || []).reduce((s, it) => {
      const orig = it.originalUnitPrice
      return s + (orig && orig > it.unitPrice ? (orig - it.unitPrice) * it.quantity : 0)
    }, 0)
  ))
  const couponDiscount = order.discount || 0
  const totalSavings = round2(offerDiscount + couponDiscount)
  const itemsSubtotal = round2(order.subtotal + offerDiscount)

  // Payment status → a labelled colour so the receipt says whether it's settled.
  const payRaw = String(order.paymentStatus || '').toUpperCase()
  const paidLike = ['PAID', 'SUCCESS', 'CAPTURED'].includes(payRaw)
  const payMeta = paidLike
    ? { label: 'Paid', cls: 'bg-[#eaf7ef] text-[#157f4a] ring-[#cdebd8]' }
    : payRaw === 'FAILED'
      ? { label: 'Failed', cls: 'bg-red-50 text-red-700 ring-red-200' }
      : { label: payRaw ? formatStatusLabel(payRaw) : 'Pending', cls: 'bg-amber-50 text-amber-700 ring-amber-200' }

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
    <div className="min-h-screen bg-[#faf7f3] py-8 sm:py-12">
      <div className="max-w-420 mx-auto px-4 sm:px-6 lg:px-8">

        {/* Status Header */}
        <Reveal className="text-center mb-8 sm:mb-12">
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

          <h1 className={`font-playfair text-3xl sm:text-4xl lg:text-5xl font-semibold mb-3 sm:mb-4 ${isConfirmed ? 'text-[#1a1a1a]' : 'text-gray-700'
            }`}>
            {isConfirmed ? 'Order Confirmed!' : 'Order Processing'}
          </h1>

          <p className="text-base sm:text-lg lg:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
            {isConfirmed
              ? `Thank you for your purchase! Your order #${order.orderId} has been successfully placed.`
              : 'Your order is being processed.'
            }
          </p>
        </Reveal>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 mb-8 sm:mb-12">

          {/* Order Details - Left Column */}
          <div className="lg:col-span-2 space-y-6">

            {/* Order Information Card */}
            <div className="bg-white rounded-2xl border border-[#efe4d8] shadow-[0_10px_30px_-24px_rgba(74,50,38,0.5)] p-5 sm:p-6 lg:p-7">
              <div className="flex items-center gap-2.5 mb-5 sm:mb-6">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#e01a1b]/10 text-[#e01a1b]">
                  <Package className="w-5 h-5" />
                </span>
                <h2 className="font-playfair text-xl sm:text-2xl font-semibold text-[#1a1a1a]">Order Information</h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
                <div className="space-y-1.5">
                  <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#a89a8d]">Order Number</h3>
                  <div className="rounded-xl border border-[#efe4d8] bg-[#faf7f3] px-3.5 py-2.5">
                    <p className="font-mono text-base font-bold text-[#1a1a1a]">{order.orderId}</p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#a89a8d]">Order Date</h3>
                  <p className="text-base font-medium text-[#3f3833]">{orderDate}</p>
                </div>

                <div className="space-y-1.5">
                  <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#a89a8d]">Estimated Delivery</h3>
                  <p className="text-base font-medium text-[#3f3833]">{estimatedDelivery}</p>
                </div>

                <div className="space-y-1.5">
                  <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#a89a8d]">Payment Method</h3>
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-[#6b625b]" />
                    <span className="text-base font-medium text-[#3f3833] capitalize">{order.paymentMethod}</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#a89a8d]">Payment Status</h3>
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-sm font-semibold ring-1 ${payMeta.cls}`}>
                    {paidLike && <CheckCircle className="h-3.5 w-3.5" />}
                    {payMeta.label}
                  </span>
                </div>
              </div>

              {/* Status Timeline */}
              <div className="mt-6 border-t border-[#f0e8df] pt-5">
                <h3 className="text-sm font-semibold text-[#1a1a1a] mb-3">
                  Order Status: <span className="text-[#e01a1b]">{formatStatusLabel(order.status)}</span>
                </h3>
                <div className="w-full bg-[#f0e8df] rounded-full h-2 overflow-hidden">
                  <div className="bg-gradient-to-r from-[#e01a1b] to-[#c41617] h-2 rounded-full" style={{ width: '25%' }}></div>
                </div>
                <p className="text-xs text-[#a89a8d] mt-2">Order placed</p>
              </div>
            </div>

            {/* Shipping Address */}
            <div className="bg-white rounded-2xl border border-[#efe4d8] shadow-[0_10px_30px_-24px_rgba(74,50,38,0.5)] p-5 sm:p-6 lg:p-7">
              <div className="flex items-center gap-2.5 mb-5">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#e01a1b]/10 text-[#e01a1b]">
                  <MapPin className="w-5 h-5" />
                </span>
                <h2 className="font-playfair text-xl sm:text-2xl font-semibold text-[#1a1a1a]">Shipping Address</h2>
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-[#1a1a1a] border-b border-[#f0e8df] pb-2 mb-2">
                  {order.shippingAddress?.firstName} {order.shippingAddress?.lastName}
                </p>
                <div className="space-y-0.5 text-[#5f5550]">
                  <p>{order.shippingAddress?.street}</p>
                  {order.shippingAddress?.addressLine2 && <p>{order.shippingAddress?.addressLine2}</p>}
                  <p>
                    {order.shippingAddress?.city}, {getStateName(order.shippingAddress?.state ?? "", order.shippingAddress?.country)} {order.shippingAddress?.zipCode}
                  </p>
                  <p className="flex items-center gap-1.5 mt-1 text-[#a89a8d] font-medium italic text-sm">
                    Shipping to: {getCountryName(order.shippingAddress?.country)} {getCountryFlag(order.shippingAddress?.country)}
                  </p>
                </div>
                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-[#f0e8df]">
                  <div className="flex items-center gap-2 text-[#5f5550] bg-[#faf7f3] px-3 py-1.5 rounded-lg border border-[#efe4d8]">
                    <Phone className="w-3.5 h-3.5" />
                    <span className="text-xs font-medium">{formatPhoneForDisplay(order.shippingAddress?.phone, order.shippingAddress?.country)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Order Summary - Right Column */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl border border-[#efe4d8] shadow-[0_10px_30px_-24px_rgba(74,50,38,0.5)] p-5 sm:p-6 lg:p-7 lg:sticky lg:top-8">
              <div className="flex items-center gap-2.5 mb-5">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#e01a1b]/10 text-[#e01a1b]">
                  <Package className="w-5 h-5" />
                </span>
                <h2 className="font-playfair text-xl sm:text-2xl font-semibold text-[#1a1a1a]">Order Summary</h2>
              </div>

              <div className="space-y-2.5 mb-6 cursor-default max-h-96 overflow-y-auto -mr-1 pr-1">
                {order.items.map((item, index) => (
                  <div key={index} className="flex items-center gap-3 p-2.5 rounded-xl border border-[#f0e8df] bg-[#faf7f3]">
                    <div className="w-12 h-12 rounded-lg shrink-0 overflow-hidden border border-[#efe4d8] bg-white">
                      {item.productImage ? (
                        <img
                          src={item.productImage}
                          alt={item.productName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[#c9bcae] text-xs">img</div>
                      )}
                    </div>
                    {(() => {
                      const isFree = item.totalPrice <= 0
                      const hasOffer = !isFree && !!item.originalUnitPrice && item.originalUnitPrice > item.unitPrice
                      const lineSaved = hasOffer ? (item.originalUnitPrice! - item.unitPrice) * item.quantity : 0
                      return (
                        <>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-[#1a1a1a] text-sm truncate">{item.productName}</h4>
                            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                              <p className="text-xs text-[#a89a8d]">Qty: {item.quantity}</p>
                              {isFree ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-[#157f4a] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                                  <Gift className="h-3 w-3" strokeWidth={2.4} /> Free gift
                                </span>
                              ) : hasOffer ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-[#eaf7ef] px-1.5 py-0.5 text-[10px] font-semibold text-[#157f4a] ring-1 ring-[#cdebd8]">
                                  Offer −{money(lineSaved)}
                                </span>
                              ) : null}
                            </div>
                          </div>
                          <div className="text-right">
                            {isFree ? (
                              <p className="font-bold text-[#157f4a]">FREE</p>
                            ) : (
                              <>
                                <p className="font-semibold text-[#1a1a1a]">{money(item.totalPrice)}</p>
                                {hasOffer && (
                                  <p className="text-xs tabular-nums text-[#a89a8d] line-through">{money(item.originalUnitPrice! * item.quantity)}</p>
                                )}
                                {!hasOffer && item.quantity > 1 && (
                                  <p className="text-xs text-[#a89a8d]">{money(item.unitPrice)} each</p>
                                )}
                              </>
                            )}
                          </div>
                        </>
                      )
                    })()}
                  </div>
                ))}

              </div>

                {/* Cart-style price ladder. Discount rows only show when they
                    exist and read as green savings; the coupon sits above the
                    taxable amount (GST is on the post-coupon net). */}
                <div className="border-t border-[#f0e8df] pt-4 space-y-2.5 text-[13.5px] sm:text-sm">
                  <div className="flex items-center justify-between text-[#5f5550]">
                    <span>Items subtotal</span>
                    <span className="tabular-nums text-[#3f3833]">{money(itemsSubtotal)}</span>
                  </div>

                  {offerDiscount > 0 && (
                    <div className="flex items-center justify-between text-[#157f4a]">
                      <span>Offer discount</span>
                      <span className="font-medium tabular-nums">−{money(offerDiscount)}</span>
                    </div>
                  )}
                  {couponDiscount > 0 && (
                    <div className="flex items-center justify-between text-[#157f4a]">
                      <span>Coupon discount</span>
                      <span className="font-medium tabular-nums">−{money(couponDiscount)}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between border-t border-dashed border-[#ece1d4] pt-2.5 text-[#5f5550]">
                    <span>Taxable amount</span>
                    <span className="font-medium tabular-nums text-[#3f3833]">{money(Math.max(0, order.subtotal - couponDiscount))}</span>
                  </div>
                  <div className="flex items-center justify-between text-[#5f5550]">
                    <span>Tax (GST)</span>
                    <span className="tabular-nums text-[#3f3833]">{money(order.tax)}</span>
                  </div>
                  <div className="flex items-center justify-between text-[#5f5550]">
                    <span>Delivery charges</span>
                    {order.shippingCost > 0 ? (
                      <span className="tabular-nums text-[#3f3833]">{money(order.shippingCost)}</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 font-semibold text-[#157f4a]">
                        <Truck className="h-3.5 w-3.5" /> FREE
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-4 border-t border-[#1a1a1a]/10 pt-4">
                  {totalSavings > 0 && (
                    <div className="mb-3 flex items-center justify-between rounded-xl bg-[#eaf7ef] px-3.5 py-2.5 ring-1 ring-[#cdebd8]">
                      <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#157f4a]">
                        <BadgePercent className="h-4 w-4" /> You save
                      </span>
                      <span className="text-[15px] font-bold tabular-nums text-[#157f4a]">{money(totalSavings)}</span>
                    </div>
                  )}
                  <div className="flex items-baseline justify-between">
                    <span className="text-[15px] font-semibold text-[#1a1a1a] sm:text-base">Total payable</span>
                    <span className="text-2xl font-bold tabular-nums text-[#e01a1b]">{money(order.totalAmount)}</span>
                  </div>
                  {/* Payment status — so the receipt is explicit about settlement. */}
                  <div className="mt-3 flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#5f5550]">
                      <CreditCard className="h-4 w-4 text-[#a89a8d]" /> Payment status
                    </span>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${payMeta.cls}`}>
                      {paidLike && <CheckCircle className="h-3.5 w-3.5" />}
                      {payMeta.label}
                    </span>
                  </div>
                  <p className="mt-2.5 text-[11.5px] leading-snug text-[#a89a8d]">
                    Taxes are calculated based on applicable product tax rates.
                  </p>
                </div>

                {/* Notification Settings */}
                <div className="mt-6 p-4 bg-[#faf7f3] border border-[#efe4d8] rounded-xl">
                  <div className="flex items-start gap-3">
                    <Mail className="w-5 h-5 text-[#e01a1b] mt-0.5 shrink-0" />
                    <div>
                      <h4 className="font-semibold text-[#1a1a1a] text-sm">Email Updates</h4>
                      <p className="text-xs text-[#5f5550] mt-1">
                        We&apos;ll send updates to <span className="font-medium text-[#3f3833]">{order.customerEmail}</span>
                      </p>
                    </div>
                  </div>
                </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <Reveal className="bg-white rounded-2xl ring-1 ring-black/5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] p-4 sm:p-6 lg:p-8">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center">
            <Link href="/" className="w-full sm:w-auto">
              <button className="btn-shine group w-full flex items-center justify-center gap-2 px-6 py-2.5 sm:py-3 bg-[#e01a1b] hover:bg-[#c41617] text-white font-semibold rounded-full transition-all duration-300 hover:-translate-y-0.5 shadow-[0_6px_20px_rgba(224,26,27,0.3)] hover:shadow-[0_12px_30px_rgba(224,26,27,0.45)] text-sm sm:text-base">
                Continue Shopping
                <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
              </button>
            </Link>
          </div>
        </Reveal>
      </div>
    </div>
  )
}
