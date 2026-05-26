"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Package, Eye, Download, Star, Truck, CheckCircle, Clock, AlertCircle, ChevronLeft, ChevronRight, ShoppingBag } from 'lucide-react'
import orderService, { Order as APIOrder } from '@/services/orderService'

const ORDERS_PER_PAGE = 5

/** Smart pagination range builder — collapses long page lists to "1 … 4 5 6 … 20". */
function getPageRange(current: number, total: number): Array<number | '…'> {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: Array<number | '…'> = [1];
  if (current > 4) pages.push('…');
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let p = start; p <= end; p++) pages.push(p);
  if (current < total - 3) pages.push('…');
  pages.push(total);
  return pages;
}

export default function OrderHistory() {
  const [orders, setOrders] = useState<APIOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    fetchOrders()
  }, [])

  const fetchOrders = async () => {
    try {
      setLoading(true)
      const response = await orderService.getUserOrders()
      if (response.success) {
        setOrders(response.data)
        setCurrentPage(1)
      } else {
        setError('Failed to fetch orders')
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while fetching orders')
    } finally {
      setLoading(false)
    }
  }

  const getNormalizedStatus = (status: string): 'processing' | 'shipped' | 'delivered' | 'cancelled' => {
    const s = status.toLowerCase()
    if (['delivered', 'completed', 'received', 'returned'].includes(s)) return 'delivered'
    if (['shipped', 'dispatched', 'shipped_to_customer'].includes(s)) return 'shipped'
    if (['cancelled', 'failed', 'rejected', 'rejected_by_admin_hub'].includes(s)) return 'cancelled'
    return 'processing'
  }

  const getStatusIcon = (status: string) => {
    const normalized = getNormalizedStatus(status)
    switch (normalized) {
      case 'delivered': return <CheckCircle className="w-5 h-5 text-green-600" />
      case 'shipped': return <Truck className="w-5 h-5 text-blue-600" />
      case 'cancelled': return <AlertCircle className="w-5 h-5 text-red-600" />
      default: return <Clock className="w-5 h-5 text-yellow-600" />
    }
  }

  const getStatusColor = (status: string) => {
    const normalized = getNormalizedStatus(status)
    switch (normalized) {
      case 'delivered': return 'bg-green-100 text-green-800 border-green-200'
      case 'shipped': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    }
  }

  const formatStatus = (status: string) => {
    const normalized = getNormalizedStatus(status)
    switch (normalized) {
      case 'delivered': return 'Delivered'
      case 'shipped': return 'Shipped'
      case 'cancelled': return 'Cancelled'
      default: return 'Processing'
    }
  }

  const totalPages = Math.ceil(orders.length / ORDERS_PER_PAGE)
  const paginatedOrders = orders.slice(
    (currentPage - 1) * ORDERS_PER_PAGE,
    currentPage * ORDERS_PER_PAGE
  )

  const handleDownloadInvoice = async (orderId: string) => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
      const token = localStorage.getItem("userToken") || sessionStorage.getItem("userToken") || "";
      const response = await fetch(`${baseUrl}/orders/${orderId}/invoice`, {
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

  if (loading) {
    /* Skeleton mirrors the loaded order list — 3 order-row placeholders. */
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="border border-slate-100 rounded-lg p-4 space-y-3">
            <div className="flex justify-between">
              <div className="h-5 w-32 bg-gray-200 rounded animate-pulse" />
              <div className="h-5 w-20 bg-gray-200 rounded-full animate-pulse" />
            </div>
            <div className="flex gap-3 items-center">
              <div className="w-16 h-16 bg-gray-200 rounded-lg animate-pulse shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse" />
                <div className="h-3 w-1/2 bg-gray-100 rounded animate-pulse" />
              </div>
              <div className="h-5 w-16 bg-gray-200 rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col justify-center items-center min-h-[300px] text-red-600">
        <AlertCircle className="w-12 h-12 mb-4" />
        <p>{error}</p>
        <button
          onClick={fetchOrders}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Package className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-bold text-slate-900">Order History</h2>
        </div>
        {orders.length > 0 && (
          <span className="text-sm text-slate-500">{orders.length} order{orders.length !== 1 ? 's' : ''} total</span>
        )}
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-12">
          <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">No orders yet</h3>
          <p className="text-slate-600 mb-6">Start shopping to see your orders here</p>
          <Link href="/products">
            <button className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors">
              Start Shopping
            </button>
          </Link>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between gap-4 flex-wrap text-sm text-slate-600 mb-4">
            <span>Showing {(currentPage - 1) * ORDERS_PER_PAGE + 1}–{Math.min(currentPage * ORDERS_PER_PAGE, orders.length)} of {orders.length}</span>
          </div>

          <div className="space-y-4 sm:space-y-6">
            {paginatedOrders.map((order) => (
              <div key={order.id} className="border border-slate-200 rounded-lg p-4 sm:p-5 lg:p-6 hover:shadow-md transition-shadow">
                {/* Order Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3 sm:gap-4">
                  <div className="flex items-start sm:items-center flex-wrap gap-2 sm:gap-4 min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="shrink-0">{getStatusIcon(order.status)}</span>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-slate-900 text-sm sm:text-base break-all">{order.orderId}</h3>
                        <p className="text-xs sm:text-sm text-slate-600">Placed on {new Date(order.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <span className={`px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs sm:text-sm font-medium border whitespace-nowrap ${getStatusColor(order.status)}`}>
                      {formatStatus(order.status)}
                    </span>
                  </div>
                  <div className="text-left sm:text-right shrink-0">
                    <p className="text-base sm:text-lg font-bold text-slate-900">${order.totalAmount.toFixed(2)}</p>
                    <p className="text-xs text-slate-500">{order.paymentStatus}</p>
                  </div>
                </div>

                {/* Order Items */}
                <div className="space-y-3 mb-4">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex items-start gap-3 sm:gap-4 p-3 bg-slate-50 rounded-lg">
                      {item.productImage ? (
                        <img
                          src={item.productImage}
                          alt={item.productName}
                          className="w-14 h-14 sm:w-16 sm:h-16 object-cover rounded-lg border border-slate-200 shrink-0"
                        />
                      ) : (
                        <div className="w-14 h-14 sm:w-16 sm:h-16 bg-slate-200 rounded-lg border border-slate-200 flex items-center justify-center shrink-0">
                          <Package className="w-6 h-6 sm:w-8 sm:h-8 text-slate-400" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-slate-900 text-sm sm:text-base break-words">{item.productName}</h4>
                        <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-xs sm:text-sm text-slate-600 mt-1">
                          <span>Qty: {item.quantity}</span>
                          {item.color && <span>{item.color}</span>}
                          {item.size && <span>Size: {item.size}</span>}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-semibold text-slate-900 text-sm sm:text-base">${(item.totalPrice).toFixed(2)}</p>
                        <p className="text-xs sm:text-sm text-slate-600">${item.unitPrice.toFixed(2)} each</p>
                      </div>
                    </div>
                  ))}

                  {/* Bag Add-on */}
                  {order.bagTypeName && order.bagTypePrice && order.bagTypePrice > 0 && (
                    <div className="flex items-center justify-between px-3 py-2 text-sm text-slate-600">
                      <div className="flex items-center gap-2">
                        <ShoppingBag className="w-4 h-4 text-amber-600" />
                        <span>Bag: {order.bagTypeName}</span>
                      </div>
                      <span className="font-medium text-slate-900">${order.bagTypePrice.toFixed(2)}</span>
                    </div>
                  )}
                </div>

                {/* Order Actions */}
                <div className="flex flex-wrap gap-2 sm:gap-3 pt-4 border-t border-slate-200">
                  <Link href={`/order/${order.orderId}`} className="flex-1 sm:flex-none">
                    <button className="w-full flex items-center justify-center gap-2 px-3 sm:px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                      <Eye className="w-4 h-4" />
                      View Details
                    </button>
                  </Link>
                  {formatStatus(order.status) === 'Delivered' && (
                    <button className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 sm:px-4 py-2 text-sm bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors">
                      <Star className="w-4 h-4" />
                      Write Review
                    </button>
                  )}
                  <button
                    onClick={() => handleDownloadInvoice(order.id)}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 sm:px-4 py-2 text-sm bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Invoice
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination — responsive: icon-only on mobile, smart range, label on sm+ */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between gap-2 pt-6 mt-6 border-t border-slate-200">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                aria-label="Previous page"
                className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Previous</span>
              </button>

              <div className="flex items-center gap-0.5 sm:gap-1 overflow-hidden">
                {getPageRange(currentPage, totalPages).map((page, i) =>
                  page === '…' ? (
                    <span key={`oh-e-${i}`} className="px-1 sm:px-2 text-slate-400 text-sm">…</span>
                  ) : (
                    <button
                      key={`oh-p-${page}`}
                      onClick={() => setCurrentPage(page as number)}
                      aria-current={page === currentPage ? 'page' : undefined}
                      className={`min-w-8 h-8 sm:min-w-9 sm:h-9 px-1.5 sm:px-2 text-xs sm:text-sm font-medium rounded-lg transition-colors ${currentPage === page
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-700 bg-white border border-slate-300 hover:bg-slate-50'
                        }`}
                    >
                      {page}
                    </button>
                  )
                )}
              </div>

              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                aria-label="Next page"
                className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
              >
                <span className="hidden sm:inline">Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
