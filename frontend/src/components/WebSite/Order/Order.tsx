"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import {
  Package,
  Truck,
  CheckCircle,
  Clock,
  Search,
  ChevronRight,
  Eye,
  Download,
  Star,
  Plus,
  ShoppingCart,
  AlertCircle,
  ChevronLeft
} from "lucide-react"
import Dropdown from "@/components/UI/Dropdown"
import orderService, { Order as APIOrder } from "@/services/orderService"
import productService from "@/services/productService"
import ReviewModal from "./ReviewModal"

// Interface definitions
interface OrderItem {
  id: string
  productId: string
  name: string
  image: string
  quantity: number
  price: number
  size?: string
  color?: string
}

interface Order {
  id: string
  orderNumber: string
  date: string
  status: string
  total: number
  items: OrderItem[]
  trackingNumber?: string
  estimatedDelivery?: string
  paymentStatus?: string
}

// ── Constants ───────────────────────────────────────────
const ORDERS_PER_PAGE = 5

export default function OrderList() {
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set())
  const [reviewModalState, setReviewModalState] = useState<{ isOpen: boolean, orderId: string, items: any[] }>({ isOpen: false, orderId: '', items: [] })
  const [currentPage, setCurrentPage] = useState(1)
  const [pastPage, setPastPage] = useState(1)

  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Sidebar real data
  const [topSelling, setTopSelling] = useState<any[]>([])
  const [bestSellers, setBestSellers] = useState<any[]>([])

  useEffect(() => {
    fetchOrders()
    fetchSidebarProducts()
  }, [])

  const fetchOrders = async () => {
    try {
      setLoading(true)
      const response = await orderService.getUserOrders()
      if (response.success) {
        // Transform API data to component format
        const transformedOrders: Order[] = response.data.map((apiOrder: any) => ({
          id: apiOrder.id,
          orderNumber: apiOrder.orderId,
          date: apiOrder.createdAt,
          status: ((s: string) => {
            const normalized = s.toLowerCase();
            if (['dispatched', 'shipped', 'shipped_to_customer'].includes(normalized)) return 'shipped';
            if (['completed', 'delivered', 'received', 'returned'].includes(normalized)) return 'delivered';
            if (['cancelled', 'failed', 'rejected', 'rejected_by_admin_hub'].includes(normalized)) return 'cancelled';
            // Everything else (order_created, vendor_processing, packed_by_vendor,
            // in_transit_to_admin_hub, received_at_admin_hub, approved_by_admin_hub, etc.) → processing
            return 'processing';
          })(apiOrder.status),
          total: apiOrder.totalAmount,
          paymentStatus: apiOrder.paymentStatus,
          items: apiOrder.items.map((item: any) => ({
            id: item.id,
            productId: item.productId,
            name: item.productName,
            image: item.productImage || "", // Handle missing image
            quantity: item.quantity,
            price: item.unitPrice,
            size: item.size,
            color: item.color
          })),
          trackingNumber: apiOrder.trackingReference,
          estimatedDelivery: apiOrder.estimatedDelivery
        }))
        setOrders(transformedOrders)
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

  const fetchSidebarProducts = async () => {
    try {
      const [topRes, bestRes] = await Promise.all([
        productService.getPublicProducts({ sortBy: 'rating', sortOrder: 'desc', limit: 4, inStock: true }),
        productService.getPublicProducts({ tag: 'Best Seller', limit: 4, inStock: true })
      ])
      if (topRes.success) setTopSelling(topRes.data.items)
      if (bestRes.success) setBestSellers(bestRes.data.items)
    } catch (err) {
      // sidebar failing silently is okay
    }
  }

  const toggleOrderExpansion = (orderId: string) => {
    setExpandedOrders(prev => {
      const newSet = new Set(prev)
      if (newSet.has(orderId)) {
        newSet.delete(orderId)
      } else {
        newSet.add(orderId)
      }
      return newSet
    })
  }

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

  const getStatusIcon = (status: string) => {
    const normalized = status.toLowerCase()
    if (normalized === 'received' || normalized === 'delivered' || normalized === 'completed') return <CheckCircle className="w-5 h-5 text-green-600" />
    if (normalized === 'shipped' || normalized === 'dispatched') return <Truck className="w-5 h-5 text-blue-600" />
    if (normalized === 'processing' || normalized.includes('created') || normalized === 'confirmed') return <Clock className="w-5 h-5 text-yellow-600" />
    if (normalized === 'cancelled' || normalized === 'failed') return <Package className="w-5 h-5 text-red-600" />
    return <Package className="w-5 h-5 text-slate-600" />
  }

  const getStatusColor = (status: string) => {
    const normalized = status.toLowerCase()
    if (normalized === 'received' || normalized === 'delivered' || normalized === 'completed') return 'bg-green-100 text-green-800 border-green-200'
    if (normalized === 'shipped' || normalized === 'dispatched') return 'bg-blue-100 text-blue-800 border-blue-200'
    if (normalized === 'processing' || normalized.includes('created') || normalized === 'confirmed') return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    if (normalized === 'cancelled' || normalized === 'failed') return 'bg-red-100 text-red-800 border-red-200'
    return 'bg-slate-100 text-slate-800 border-slate-200'
  }

  const formatStatus = (status: string) => {
    switch (status) {
      case 'delivered': return 'Delivered'
      case 'shipped': return 'Shipped'
      case 'cancelled': return 'Cancelled'
      default: return 'Processing'
    }
  }

  // Strip hex codes like (#ead2d2) from color names stored in DB
  const cleanColorName = (color: string) => {
    return color.replace(/\s*\(#[0-9a-fA-F]{3,6}\)/, '').trim()
  }

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.items.some(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()))

    // Adjust logic for status filter to match transformed status
    if (statusFilter === "all") return matchesSearch
    return matchesSearch && order.status.toLowerCase().includes(statusFilter.toLowerCase())
  })

  // Categorize orders based on status logic
  const currentOrders = filteredOrders.filter(order =>
    !['delivered', 'cancelled'].includes(order.status)
  )

  const pastOrders = filteredOrders.filter(order =>
    ['delivered', 'cancelled'].includes(order.status)
  )

  // Pagination
  const totalCurrentPages = Math.ceil(currentOrders.length / ORDERS_PER_PAGE)
  const paginatedCurrentOrders = currentOrders.slice(
    (currentPage - 1) * ORDERS_PER_PAGE,
    currentPage * ORDERS_PER_PAGE
  )

  const totalPastPages = Math.ceil(pastOrders.length / ORDERS_PER_PAGE)
  const paginatedPastOrders = pastOrders.slice(
    (pastPage - 1) * ORDERS_PER_PAGE,
    pastPage * ORDERS_PER_PAGE
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 py-8 flex justify-center items-start">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mt-20"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 py-8 flex justify-center items-start">
        <div className="bg-white p-8 rounded-xl shadow text-center text-red-600">
          <AlertCircle className="w-12 h-12 mx-auto mb-4" />
          <p>{error}</p>
          <button onClick={fetchOrders} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg">Try Again</button>
        </div>
      </div>
    )
  }










  return (
    <div className="min-h-screen bg-slate-50 py-8 font-sans">
      <div className="max-w-420 mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
          {/* Main Content - Orders */}
          <div className="xl:col-span-3">
            <div className="max-w-6xl">
              {/* Header */}
              <div className="mb-8">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Package className="w-8 h-8 text-blue-600" />
                    <div>
                      <h1 className="text-4xl font-bold text-slate-900 mb-2">My Orders</h1>
                      <p className="text-slate-600">Track and manage your orders</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-slate-900">{filteredOrders.length}</p>
                    <p className="text-sm text-slate-600">Total Orders</p>
                  </div>
                </div>
              </div>

              {/* Search and Filter */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-8">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <input
                      type="text"
                      placeholder="Search orders by ID or product name..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border rounded-md border-slate-300 horounded-xl focus:ring-4 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="min-w-40">
                      <Dropdown
                        id="status-filter"
                        value={statusFilter}
                        options={[
                          { value: "all", label: "All Orders" },
                          { value: "processing", label: "Processing" },
                          { value: "shipped", label: "Shipped" },
                          { value: "received", label: "Received" },
                          { value: "cancelled", label: "Cancelled" }
                        ]}
                        onChange={(value) => setStatusFilter(value as string)}
                        placeholder="Filter by status"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Current Orders */}
              {currentOrders.length > 0 && (
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-slate-900 mb-6">Current Orders</h2>
                  <div className="space-y-6">
                    {paginatedCurrentOrders.map((order) => (
                      <div key={order.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow">
                        {/* Order Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-4">
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                              {getStatusIcon(order.status)}
                              <div>
                                <h3 className="font-semibold text-slate-900">{order.orderNumber}</h3>
                                <p className="text-sm text-slate-600">Placed on {new Date(order.date).toLocaleDateString()}</p>
                              </div>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(order.status)}`}>
                              {formatStatus(order.status)}
                            </span>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-slate-900">${order.total.toFixed(2)}</p>
                            {order.trackingNumber && (
                              <p className="text-sm text-slate-600">Tracking: {order.trackingNumber}</p>
                            )}
                          </div>
                        </div>

                        {/* Order Items */}
                        <div className="space-y-3 mb-4">
                          {(expandedOrders.has(order.id) ? order.items : order.items.slice(0, 2)).map((item) => (
                            <div key={item.id} className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg">
                              <div className="relative w-16 h-16 bg-slate-100 rounded-lg overflow-hidden border border-slate-200 flex items-center justify-center">
                                {item.image ? (
                                  <Image
                                    src={item.image}
                                    alt={item.name}
                                    fill
                                    className="object-cover"
                                  />
                                ) : (
                                  <Package className="w-8 h-8 text-slate-400" />
                                )}
                              </div>
                              <div className="flex-1">
                                <h4 className="font-medium text-slate-900">{item.name}</h4>
                                <div className="flex items-center gap-4 text-sm text-slate-600 mt-1">
                                  <span>Qty: {item.quantity}</span>
                                  {item.size && <span>Size: {item.size}</span>}
                                  {item.color && <span>Color: {cleanColorName(item.color)}</span>}
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold text-slate-900">${(item.price * item.quantity).toFixed(2)}</p>
                                <p className="text-sm text-slate-600">${item.price.toFixed(2)} each</p>
                              </div>
                            </div>
                          ))}

                          {/* More/Less Button */}
                          {order.items.length > 2 && (
                            <div className="flex justify-center pt-2">
                              <button
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  toggleOrderExpansion(order.id)
                                }}
                                className="flex items-center gap-2 px-4 py-2 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                              >
                                {expandedOrders.has(order.id) ? (
                                  <>
                                    <ChevronRight className="w-4 h-4 rotate-180" />
                                    Show Less
                                  </>
                                ) : (
                                  <>
                                    <ChevronRight className="w-4 h-4 rotate-90" />
                                    Show {order.items.length - 2} More Items
                                  </>
                                )}
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Order Actions */}
                        <div className="flex flex-wrap gap-3 pt-4 border-t border-slate-200">
                          <Link href={`/order/${order.orderNumber}`}>
                            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                              <Eye className="w-4 h-4" />
                              View Details
                            </button>
                          </Link>
                          {order.trackingNumber && (
                            <button className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors">
                              <Truck className="w-4 h-4" />
                              Track Order
                            </button>
                          )}
                          <button
                            onClick={() => handleDownloadInvoice(order.id)}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
                          >
                            <Download className="w-4 h-4" />
                            Download Invoice / Packing List
                          </button>
                        </div>

                        {/* Estimated Delivery */}
                        {order.estimatedDelivery && order.status !== 'received' && order.status !== 'cancelled' && (
                          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <p className="text-sm text-blue-800">
                              <Clock className="w-4 h-4 inline mr-2" />
                              Estimated delivery: {new Date(order.estimatedDelivery).toLocaleDateString()}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Current Orders Pagination */}
                  {totalCurrentPages > 1 && (
                    <div className="flex items-center justify-between pt-4 mt-2 border-t border-slate-200">
                      <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronLeft className="w-4 h-4" /> Previous
                      </button>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: totalCurrentPages }, (_, i) => i + 1).map(page => (
                          <button key={page} onClick={() => setCurrentPage(page)}
                            className={`w-9 h-9 text-sm font-medium rounded-lg transition-colors ${currentPage === page ? 'bg-blue-600 text-white' : 'text-slate-700 bg-white border border-slate-300 hover:bg-slate-50'
                              }`}>
                            {page}
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={() => setCurrentPage(p => Math.min(totalCurrentPages, p + 1))}
                        disabled={currentPage === totalCurrentPages}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        Next <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Past Orders */}
              {pastOrders.length > 0 && (
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-6">Past Orders</h2>
                  <div className="space-y-6">
                    {paginatedPastOrders.map((order) => (
                      <div key={order.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow">
                        {/* Order Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-4">
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                              {getStatusIcon(order.status)}
                              <div>
                                <h3 className="font-semibold text-slate-900">{order.orderNumber}</h3>
                                <p className="text-sm text-slate-600">Placed on {new Date(order.date).toLocaleDateString()}</p>
                              </div>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(order.status)}`}>
                              {formatStatus(order.status)}
                            </span>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-slate-900">${order.total.toFixed(2)}</p>
                            {order.trackingNumber && (
                              <p className="text-sm text-slate-600">Tracking: {order.trackingNumber}</p>
                            )}
                          </div>
                        </div>

                        {/* Order Items */}
                        <div className="space-y-3 mb-4">
                          {(expandedOrders.has(order.id) ? order.items : order.items.slice(0, 2)).map((item) => (
                            <div key={item.id} className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg">
                              <div className="relative w-16 h-16 bg-slate-100 rounded-lg overflow-hidden border border-slate-200 flex items-center justify-center">
                                {item.image ? (
                                  <Image
                                    src={item.image}
                                    alt={item.name}
                                    fill
                                    className="object-cover"
                                  />
                                ) : (
                                  <Package className="w-8 h-8 text-slate-400" />
                                )}
                              </div>
                              <div className="flex-1">
                                <h4 className="font-medium text-slate-900">{item.name}</h4>
                                <div className="flex items-center gap-4 text-sm text-slate-600 mt-1">
                                  <span>Qty: {item.quantity}</span>
                                  {item.size && <span>Size: {item.size}</span>}
                                  {item.color && <span>Color: {cleanColorName(item.color)}</span>}
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold text-slate-900">${(item.price * item.quantity).toFixed(2)}</p>
                                <p className="text-sm text-slate-600">${item.price.toFixed(2)} each</p>
                              </div>
                            </div>
                          ))}

                          {/* More/Less Button */}
                          {order.items.length > 2 && (
                            <div className="flex justify-center pt-2">
                              <button
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  toggleOrderExpansion(order.id)
                                }}
                                className="flex items-center gap-2 px-4 py-2 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                              >
                                {expandedOrders.has(order.id) ? (
                                  <>
                                    <ChevronRight className="w-4 h-4 rotate-180" />
                                    Show Less
                                  </>
                                ) : (
                                  <>
                                    <ChevronRight className="w-4 h-4 rotate-90" />
                                    Show {order.items.length - 2} More Items
                                  </>
                                )}
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Order Actions */}
                        <div className="flex flex-wrap gap-3 pt-4 border-t border-slate-200">
                          <Link href={`/order/${order.orderNumber}`}>
                            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                              <Eye className="w-4 h-4" />
                              View Details
                            </button>
                          </Link>
                          {order.status === 'received' && (
                            <button
                              onClick={() => setReviewModalState({ isOpen: true, orderId: order.id, items: order.items })}
                              className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
                            >
                              <Star className="w-4 h-4" />
                              Write Review
                            </button>
                          )}
                          {order.trackingNumber && (
                            <button className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors">
                              <Truck className="w-4 h-4" />
                              Track Order
                            </button>
                          )}
                          <button
                            onClick={() => handleDownloadInvoice(order.id)}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
                          >
                            <Download className="w-4 h-4" />
                            Download Invoice / Packing List
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Empty State */}
              {filteredOrders.length === 0 && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
                  <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-slate-900 mb-2">No Orders Found</h3>
                  <p className="text-slate-600 mb-6">
                    {searchTerm || statusFilter !== "all"
                      ? "Try adjusting your search or filter criteria"
                      : "You haven't placed any orders yet"
                    }
                  </p>
                  <Link href="/products">
                    <button className="bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition-colors">
                      Start Shopping
                    </button>
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar - Product Recommendations */}
          <div className="xl:col-span-1">
            <div className="space-y-6 sticky top-8">
              {/* Top Selling Products */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <Star className="w-5 h-5 text-yellow-500" />
                  Top Selling Products
                </h3>
                <div className="space-y-4">
                  {topSelling.map((item: any) => (
                    <Link key={item.id} href={`/product/${item.id}`}>
                      <div className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg hover:shadow-md transition-shadow cursor-pointer group">
                        <div className="relative w-12 h-12 bg-slate-100 rounded-lg overflow-hidden flex-shrink-0">
                          {item.images?.[0] ? (
                            <Image src={item.images[0].url || item.images[0]} alt={item.name} fill className="object-cover" />
                          ) : (
                            <Package className="w-6 h-6 text-slate-400 m-auto" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-slate-900 text-sm line-clamp-2 group-hover:text-blue-600 transition-colors">{item.name}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-slate-900 font-semibold text-sm">₹{item.basePrice ?? item.adminFixedPrice}</span>
                          </div>
                          {item.rating && (
                            <div className="flex items-center gap-1 mt-1">
                              <Star className="w-3 h-3 text-yellow-400 fill-current" />
                              <span className="text-xs text-slate-600">{Number(item.rating).toFixed(1)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                  {topSelling.length === 0 && <p className="text-sm text-slate-400 text-center py-4">Loading...</p>}
                </div>
                <Link href="/products">
                  <button className="w-full mt-4 text-sm text-blue-600 hover:text-blue-800 font-medium py-2 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors">
                    View All Products
                  </button>
                </Link>
              </div>

              {/* Best Seller */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <Package className="w-5 h-5 text-green-600" />
                  Best Seller
                </h3>
                <div className="space-y-4">
                  {bestSellers.map((item: any) => (
                    <Link key={item.id} href={`/product/${item.id}`}>
                      <div className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg hover:shadow-md transition-shadow cursor-pointer group">
                        <div className="relative w-12 h-12 bg-slate-100 rounded-lg overflow-hidden flex-shrink-0">
                          {item.images?.[0] ? (
                            <Image src={item.images[0].url || item.images[0]} alt={item.name} fill className="object-cover" />
                          ) : (
                            <Package className="w-6 h-6 text-slate-400 m-auto" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-slate-900 text-sm line-clamp-2 group-hover:text-green-600 transition-colors">{item.name}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-slate-900 font-semibold text-sm">₹{item.basePrice ?? item.adminFixedPrice}</span>
                            {item.discount && (
                              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">{item.discount}% OFF</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                  {bestSellers.length === 0 && <p className="text-sm text-slate-400 text-center py-4">No Best Sellers found</p>}
                </div>
                <Link href="/products">
                  <button className="w-full mt-4 text-sm text-green-600 hover:text-green-800 font-medium py-2 border border-green-200 rounded-lg hover:bg-green-50 transition-colors">
                    View Best Sellers
                  </button>
                </Link>
              </div>

              {/* Quick Actions */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Quick Actions</h3>
                <div className="space-y-3">
                  <Link href="/products">
                    <button className="w-full flex items-center gap-3 p-3 text-left border border-slate-200 rounded-lg hover:shadow-md transition-all hover:border-blue-300">
                      <Package className="w-5 h-5 text-blue-600" />
                      <span className="font-medium text-slate-900">Browse Products</span>
                    </button>
                  </Link>
                  <Link href="/cart">
                    <button className="w-full flex items-center gap-3 p-3 text-left border border-slate-200 rounded-lg hover:shadow-md transition-all hover:border-green-300">
                      <ShoppingCart className="w-5 h-5 text-green-600" />
                      <span className="font-medium text-slate-900">View Cart</span>
                    </button>
                  </Link>
                  <Link href="/profile">
                    <button className="w-full flex items-center gap-3 p-3 text-left border border-slate-200 rounded-lg hover:shadow-md transition-all hover:border-purple-300">
                      <Eye className="w-5 h-5 text-purple-600" />
                      <span className="font-medium text-slate-900">Account Settings</span>
                    </button>
                  </Link>
                </div>
              </div>
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