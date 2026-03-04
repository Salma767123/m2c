"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Package, Eye, Download, Star, Truck, CheckCircle, Clock, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react'
import orderService, { Order as APIOrder } from '@/services/orderService'

const ORDERS_PER_PAGE = 5

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
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex justify-center items-center min-h-[300px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
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
          <div className="space-y-6">
            {paginatedOrders.map((order) => (
              <div key={order.id} className="border border-slate-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                {/* Order Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-4">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(order.status)}
                      <div>
                        <h3 className="font-semibold text-slate-900">{order.orderId}</h3>
                        <p className="text-sm text-slate-600">Placed on {new Date(order.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(order.status)}`}>
                      {formatStatus(order.status)}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-slate-900">₹{order.totalAmount.toFixed(2)}</p>
                    <p className="text-xs text-slate-500">{order.paymentStatus}</p>
                  </div>
                </div>

                {/* Order Items */}
                <div className="space-y-3 mb-4">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg">
                      {item.productImage ? (
                        <img
                          src={item.productImage}
                          alt={item.productName}
                          className="w-16 h-16 object-cover rounded-lg border border-slate-200"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-slate-200 rounded-lg border border-slate-200 flex items-center justify-center">
                          <Package className="w-8 h-8 text-slate-400" />
                        </div>
                      )}
                      <div className="flex-1">
                        <h4 className="font-medium text-slate-900">{item.productName}</h4>
                        <div className="flex items-center gap-4 text-sm text-slate-600 mt-1">
                          <span>Qty: {item.quantity}</span>
                          {(item.color || item.size) && (
                            <div className="flex items-center gap-2 border-l border-slate-300 pl-3 ml-3">
                              {item.color && <span>{item.color}</span>}
                              {item.color && item.size && <span>|</span>}
                              {item.size && <span>Size: {item.size}</span>}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-slate-900">₹{(item.totalPrice).toFixed(2)}</p>
                        <p className="text-sm text-slate-600">₹{item.unitPrice.toFixed(2)} each</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Order Actions */}
                <div className="flex flex-wrap gap-3 pt-4 border-t border-slate-200">
                  <Link href={`/order/${order.orderId}`}>
                    <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                      <Eye className="w-4 h-4" />
                      View Details
                    </button>
                  </Link>
                  {formatStatus(order.status) === 'Delivered' && (
                    <button className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors">
                      <Star className="w-4 h-4" />
                      Write Review
                    </button>
                  )}
                  <button
                    onClick={() => handleDownloadInvoice(order.id)}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Invoice
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-6 mt-6 border-t border-slate-200">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-9 h-9 text-sm font-medium rounded-lg transition-colors ${currentPage === page
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-700 bg-white border border-slate-300 hover:bg-slate-50'
                      }`}
                  >
                    {page}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
