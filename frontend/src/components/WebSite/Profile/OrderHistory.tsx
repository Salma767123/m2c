"use client"

import { useEffect, useState } from 'react'
import { Package, Eye, Download, Star, Truck, CheckCircle, Clock, AlertCircle } from 'lucide-react'
import orderService, { Order as APIOrder } from '@/services/orderService'

// Extended interface for frontend display if needed, or just use APIOrder
// We will adapt APIOrder to what the UI expects or update UI to use APIOrder fields directly

export default function OrderHistory() {
  const [orders, setOrders] = useState<APIOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchOrders()
  }, [])

  const fetchOrders = async () => {
    try {
      setLoading(true)
      const response = await orderService.getUserOrders()
      if (response.success) {
        setOrders(response.data)
      } else {
        setError('Failed to fetch orders')
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while fetching orders')
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    const normalizedStatus = status.toLowerCase()
    switch (normalizedStatus) {
      case 'delivered':
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-600" />
      case 'shipped':
      case 'dispatched':
        return <Truck className="w-5 h-5 text-blue-600" />
      case 'processing':
      case 'order_created':
      case 'confirmed':
        return <Clock className="w-5 h-5 text-yellow-600" />
      case 'cancelled':
      case 'failed':
        return <Package className="w-5 h-5 text-red-600" />
      default:
        return <Package className="w-5 h-5 text-slate-600" />
    }
  }

  const getStatusColor = (status: string) => {
    const normalizedStatus = status.toLowerCase()
    switch (normalizedStatus) {
      case 'delivered':
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'shipped':
      case 'dispatched':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'processing':
      case 'order_created':
      case 'confirmed':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'cancelled':
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200'
    }
  }

  const formatStatus = (status: string) => {
    return status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())
  }

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
      <div className="flex items-center gap-3 mb-6">
        <Package className="w-6 h-6 text-blue-600" />
        <h2 className="text-xl font-bold text-slate-900">Order History</h2>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-12">
          <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">No orders yet</h3>
          <p className="text-slate-600 mb-6">Start shopping to see your orders here</p>
          <button className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors">
            Start Shopping
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {orders.map((order) => (
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
                        {/* 
                           Note: The backend/orderService might not define size/color in OrderItem interface yet 
                           even though they might be in the database. 
                           If they are needed, update the OrderItem interface in orderService.ts.
                           For now we rely on what's available.
                        */}
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
                <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  <Eye className="w-4 h-4" />
                  View Details
                </button>
                {order.status === 'DELIVERED' && (
                  <button className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors">
                    <Star className="w-4 h-4" />
                    Write Review
                  </button>
                )}
                {/* 
                  If we had tracking details in the order object from API, we would show this button
                  For now we check if it exists in the type, or conditional render
                */}
                <button className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors">
                  <Download className="w-4 h-4" />
                  Invoice
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

