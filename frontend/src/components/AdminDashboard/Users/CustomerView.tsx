'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { userManagementService } from '@/services/userManagementService'
import { getCountryName, getStateName, formatPhoneForDisplay } from '@/components/WebSite/CheckOut/CheckoutProcess/constants'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/UI/Card'
import { Badge } from '@/components/UI/Badge'
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Calendar,
  ShoppingBag,
  CreditCard,
  ShieldCheck,
  Clock,
  Package,
  Eye,
  Star
} from 'lucide-react'

interface CustomerViewProps {
  customerId: string
}

export default function CustomerView({ customerId }: CustomerViewProps) {
  const router = useRouter()
  const [customer, setCustomer] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchCustomer = async () => {
      try {
        setLoading(true)
        const data = await userManagementService.getCustomerById(customerId)
        setCustomer(data)
      } catch (error) {
        console.error('Failed to fetch customer', error)
      } finally {
        setLoading(false)
      }
    }
    fetchCustomer()
  }, [customerId])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-700"></div>
        <span className="ml-3 text-gray-600">Loading customer details...</span>
      </div>
    )
  }

  if (!customer) {
    return (
      <div className="text-center py-12">
        <p className="text-lg font-medium text-gray-900">Customer not found</p>
        <button
          onClick={() => router.back()}
          className="mt-4 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800"
        >
          Go Back
        </button>
      </div>
    )
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800 px-3 py-1">Active</Badge>
      case 'suspended':
        return <Badge className="bg-red-100 text-red-800 px-3 py-1">Suspended</Badge>
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800 px-3 py-1">Pending</Badge>
      default:
        return <Badge className="bg-gray-100 text-gray-800 px-3 py-1">{status}</Badge>
    }
  }

  const getOrderStatusColor = (status: string) => {
    const s = status.toLowerCase()
    if (['delivered', 'completed'].includes(s)) return 'bg-green-100 text-green-800'
    if (['shipped', 'shipped_to_customer', 'in_transit'].includes(s)) return 'bg-blue-100 text-blue-800'
    if (['cancelled', 'failed'].includes(s)) return 'bg-red-100 text-red-800'
    return 'bg-yellow-100 text-yellow-800'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customer Details</h1>
          <p className="text-sm text-gray-600">View customer profile and order history</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <Card className="lg:col-span-1 border border-gray-200">
          <CardContent className="p-6">
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-gray-900 rounded-full flex items-center justify-center mb-4">
                {customer.avatar ? (
                  <img
                    src={customer.avatar}
                    alt={customer.name}
                    className="w-full h-full object-cover rounded-full"
                  />
                ) : (
                  <span className="text-2xl font-bold text-white">
                    {customer.name?.charAt(0)?.toUpperCase()}
                  </span>
                )}
              </div>
              <h2 className="text-xl font-bold text-gray-900">{customer.name}</h2>
              <p className="text-sm text-gray-500 mt-1">Joined {new Date(customer.joinDate).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}</p>
              <div className="mt-3">{getStatusBadge(customer.status)}</div>
            </div>

            <div className="mt-6 space-y-4 border-t border-gray-200 pt-6">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-gray-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-gray-500">Email</p>
                  <p className="text-sm font-medium text-gray-900 truncate">{customer.email}</p>
                </div>
                {customer.isEmailVerified && <ShieldCheck className="h-4 w-4 text-green-500 shrink-0" />}
              </div>

              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-gray-400 shrink-0" />
                <div>
                  <p className="text-xs text-gray-500">Phone</p>
                  <p className="text-sm font-medium text-gray-900">{customer.phone}</p>
                </div>
                {customer.isPhoneVerified && <ShieldCheck className="h-4 w-4 text-green-500 shrink-0" />}
              </div>

              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-gray-400 shrink-0" />
                <div>
                  <p className="text-xs text-gray-500">Joined</p>
                  <p className="text-sm font-medium text-gray-900">
                    {new Date(customer.joinDate).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Clock className="h-4 w-4 text-gray-400 shrink-0" />
                <div>
                  <p className="text-xs text-gray-500">Last Login</p>
                  <p className="text-sm font-medium text-gray-900">
                    {new Date(customer.lastLogin).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Right Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="border border-gray-200">
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-blue-50 rounded-lg">
                    <ShoppingBag className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Total Orders</p>
                    <p className="text-2xl font-bold text-gray-900">{customer.totalOrders}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-gray-200">
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-green-50 rounded-lg">
                    <CreditCard className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Total Spent</p>
                    <p className="text-2xl font-bold text-gray-900">₹{customer.totalSpent?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-gray-200">
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-amber-50 rounded-lg">
                    <Star className="h-5 w-5 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Reviews</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {customer.averageRating ? `${customer.averageRating} ★` : '—'}
                    </p>
                    <p className="text-xs text-gray-400">{customer.reviewsCount || 0} review{customer.reviewsCount !== 1 ? 's' : ''}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Addresses */}
          {customer.addresses && customer.addresses.length > 0 && (
            <Card className="border border-gray-200">
              <CardHeader className="border-b border-gray-200 bg-gray-50">
                <CardTitle className="text-base flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-gray-600" />
                  Saved Addresses
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {customer.addresses.map((addr: any, idx: number) => (
                    <div key={idx} className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                      {addr.name && <p className="font-medium text-gray-900 mb-1">{addr.name}</p>}
                      <p className="text-sm text-gray-600">{addr.address || addr.street}</p>
                      {addr.addressLine2 && <p className="text-sm text-gray-600">{addr.addressLine2}</p>}
                      <p className="text-sm text-gray-600">{addr.city}, {getStateName(addr.state, addr.country)} {addr.zipCode || addr.postalCode}</p>
                      <p className="text-sm text-gray-600">{getCountryName(addr.country)}</p>
                      {addr.phone && <p className="text-sm text-gray-500 mt-1">{formatPhoneForDisplay(addr.phone, addr.country)}</p>}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Orders */}
          <Card className="border border-gray-200">
            <CardHeader className="border-b border-gray-200 bg-gray-50">
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="h-4 w-4 text-gray-600" />
                Recent Orders
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {customer.recentOrders && customer.recentOrders.length > 0 ? (
                <div className="divide-y divide-gray-200">
                  {customer.recentOrders.map((order: any) => (
                    <div key={order.id} className="p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <span className="font-medium text-gray-900">{order.orderId}</span>
                          <Badge className={getOrderStatusColor(order.status)}>
                            {order.status.replace(/_/g, ' ')}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-gray-900">₹{order.totalAmount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                          <button
                            onClick={() => router.push(`/admin/dashboard/orders/view/${order.id}`)}
                            className="p-1.5 hover:bg-gray-200 rounded-md transition-colors"
                            title="View Order"
                          >
                            <Eye className="h-4 w-4 text-gray-500" />
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>{new Date(order.createdAt).toLocaleDateString('en-IN')}</span>
                        <span>{order.items?.length || 0} item{(order.items?.length || 0) !== 1 ? 's' : ''}</span>
                        <span className="capitalize">{order.paymentMethod || 'N/A'}</span>
                        <Badge className={order.paymentStatus === 'PAID' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}>
                          {order.paymentStatus}
                        </Badge>
                      </div>
                      {/* Order Items Preview */}
                      <div className="mt-3 flex flex-wrap gap-2">
                        {order.items?.slice(0, 4).map((item: any) => (
                          <div key={item.id} className="flex items-center gap-2 bg-gray-100 rounded-lg px-2.5 py-1.5">
                            {item.productImage && (
                              <img src={item.productImage} alt={item.productName} className="w-6 h-6 rounded object-cover" />
                            )}
                            <span className="text-xs text-gray-700">{item.productName}</span>
                            <span className="text-xs text-gray-400">x{item.quantity}</span>
                          </div>
                        ))}
                        {order.items?.length > 4 && (
                          <span className="text-xs text-gray-400 self-center">+{order.items.length - 4} more</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-gray-500">
                  <ShoppingBag className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <p>No orders yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
