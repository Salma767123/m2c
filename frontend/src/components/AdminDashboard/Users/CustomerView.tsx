'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { userManagementService } from '@/services/userManagementService'
import { getCountryName, getStateName, formatPhoneForDisplay } from '@/components/WebSite/CheckOut/CheckoutProcess/constants'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/UI/Card'
import { Badge } from '@/components/UI/Badge'
import { formatOrderAmount } from '@/lib/currency'
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
  Star,
  LifeBuoy
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-700"></div>
        <span className="ml-3 text-slate-600">Loading customer details...</span>
      </div>
    )
  }

  if (!customer) {
    return (
      <div className="text-center py-12">
        <p className="text-lg font-medium text-slate-900">Customer not found</p>
        <button
          onClick={() => router.back()}
          className="mt-4 px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600"
        >
          Go Back
        </button>
      </div>
    )
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-50 text-green-700 border border-green-200 px-3 py-1">Active</Badge>
      case 'suspended':
        return <Badge className="bg-red-50 text-red-700 border border-red-200 px-3 py-1">Suspended</Badge>
      case 'pending':
        return <Badge className="bg-yellow-50 text-yellow-700 border border-yellow-200 px-3 py-1">Pending</Badge>
      default:
        return <Badge className="bg-slate-50 text-slate-700 border border-slate-200 px-3 py-1">{status}</Badge>
    }
  }

  const getOrderStatusColor = (status: string) => {
    const s = status.toLowerCase()
    if (['delivered', 'completed'].includes(s)) return 'bg-green-50 text-green-700 border border-green-200'
    if (['shipped', 'shipped_to_customer', 'in_transit'].includes(s)) return 'bg-blue-50 text-blue-700 border border-blue-200'
    if (['cancelled', 'failed'].includes(s)) return 'bg-red-50 text-red-700 border border-red-200'
    return 'bg-yellow-50 text-yellow-700 border border-yellow-200'
  }

  const getTicketStatusColor = (status: string) => {
    const s = (status || '').toLowerCase().replace(/_/g, '-')
    if (s === 'open') return 'bg-red-50 text-red-700 border border-red-200'
    if (s === 'in-progress') return 'bg-blue-50 text-blue-700 border border-blue-200'
    if (s === 'resolved') return 'bg-green-50 text-green-700 border border-green-200'
    return 'bg-slate-100 text-slate-600 border border-slate-200'
  }

  const getTicketPriorityColor = (priority: string) => {
    switch ((priority || '').toLowerCase()) {
      case 'urgent': return 'bg-red-50 text-red-700 border border-red-200'
      case 'high': return 'bg-orange-50 text-orange-700 border border-orange-200'
      case 'medium': return 'bg-yellow-50 text-yellow-700 border border-yellow-200'
      case 'low': return 'bg-green-50 text-green-700 border border-green-200'
      default: return 'bg-slate-50 text-slate-600 border border-slate-200'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-slate-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Customer Details</h1>
          <p className="text-sm text-slate-600">View customer profile and order history</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card — sticky on lg+ so it stays in view while the orders
            column scrolls. self-start stops the grid from stretching it to the
            row height, which would otherwise break position: sticky. */}
        <Card className="rounded-2xl border-slate-200 shadow-sm lg:col-span-1 lg:sticky lg:top-6 lg:self-start">
          <CardContent className="p-6">
            <div className="flex flex-col items-center text-center">
              <div className="mb-4 flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-brand-500 to-brand-600 shadow-lg ring-4 ring-brand-500/10">
                {customer.avatar ? (
                  <img
                    src={customer.avatar}
                    alt={customer.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-2xl font-bold text-white">
                    {customer.name?.charAt(0)?.toUpperCase()}
                  </span>
                )}
              </div>
              <h2 className="text-xl font-bold text-slate-900">{customer.name}</h2>
              <p className="text-sm text-slate-500 mt-1">Joined {new Date(customer.joinDate).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}</p>
              <div className="mt-3">{getStatusBadge(customer.status)}</div>
            </div>

            <div className="mt-6 space-y-4 border-t border-slate-200 pt-6">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-slate-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-slate-500">Email</p>
                  <p className="text-sm font-medium text-slate-900 truncate">{customer.email}</p>
                </div>
                {customer.isEmailVerified && <ShieldCheck className="h-4 w-4 text-green-500 shrink-0" />}
              </div>

              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-slate-400 shrink-0" />
                <div>
                  <p className="text-xs text-slate-500">Phone</p>
                  <p className="text-sm font-medium text-slate-900">{customer.phone}</p>
                </div>
                {customer.isPhoneVerified && <ShieldCheck className="h-4 w-4 text-green-500 shrink-0" />}
              </div>

              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
                <div>
                  <p className="text-xs text-slate-500">Joined</p>
                  <p className="text-sm font-medium text-slate-900">
                    {new Date(customer.joinDate).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Clock className="h-4 w-4 text-slate-400 shrink-0" />
                <div>
                  <p className="text-xs text-slate-500">Last Login</p>
                  <p className="text-sm font-medium text-slate-900">
                    {new Date(customer.lastLogin).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                </div>
              </div>
            </div>

            {/* Saved Addresses — kept here in the profile column so the customer's
                contact details and where they ship read as one block. */}
            {customer.addresses && customer.addresses.length > 0 && (
              <div className="mt-6 border-t border-slate-200 pt-6">
                <div className="mb-3 flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-slate-600" />
                  <p className="text-sm font-semibold text-slate-900">Saved Addresses</p>
                  <span className="text-xs font-medium text-slate-400">({customer.addresses.length})</span>
                </div>
                <div className="space-y-3">
                  {customer.addresses.map((addr: any, idx: number) => (
                    <div key={idx} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                      {addr.type && (
                        <div className="mb-1.5 flex items-center gap-2">
                          <span className="inline-flex items-center rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                            {String(addr.type).charAt(0).toUpperCase() + String(addr.type).slice(1)}
                          </span>
                          {addr.typeLabel && (
                            <span className="text-xs font-medium text-slate-700">{addr.typeLabel}</span>
                          )}
                          {addr.isDefault && (
                            <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-semibold text-green-700">Default</span>
                          )}
                        </div>
                      )}
                      {addr.name && <p className="mb-1 font-medium text-slate-900">{addr.name}</p>}
                      <p className="text-sm text-slate-600">{addr.address || addr.street}</p>
                      {addr.addressLine2 && <p className="text-sm text-slate-600">{addr.addressLine2}</p>}
                      <p className="text-sm text-slate-600">{addr.city}, {getStateName(addr.state, addr.country)} {addr.zipCode || addr.postalCode}</p>
                      <p className="text-sm text-slate-600">{getCountryName(addr.country)}</p>
                      {addr.phone && <p className="mt-1 text-sm text-slate-500">{formatPhoneForDisplay(addr.phone, addr.country)}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="rounded-2xl border-slate-200 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 text-white shadow-sm">
                    <ShoppingBag className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Total Orders</p>
                    <p className="mt-0.5 text-2xl font-bold text-slate-900">{customer.totalOrders}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-slate-200 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 text-white shadow-sm">
                    <CreditCard className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Total Spent</p>
                    <p className="mt-0.5 truncate text-2xl font-bold text-slate-900">₹{customer.totalSpent?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-slate-200 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-sm">
                    <Star className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Reviews</p>
                    <p className="mt-0.5 text-2xl font-bold text-slate-900">
                      {customer.averageRating ? `${customer.averageRating} ★` : '—'}
                    </p>
                    <p className="text-xs text-slate-400">{customer.reviewsCount || 0} review{customer.reviewsCount !== 1 ? 's' : ''}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Orders */}
          <Card className="overflow-hidden rounded-2xl border-slate-200 shadow-sm">
            <CardHeader className="border-b border-slate-200 bg-slate-50">
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="h-4 w-4 text-slate-600" />
                Recent Orders
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {customer.recentOrders && customer.recentOrders.length > 0 ? (
                <div className="divide-y divide-slate-200">
                  {customer.recentOrders.map((order: any) => (
                    <div key={order.id} className="p-4 hover:bg-slate-50 transition-colors">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <span className="font-medium text-slate-900">{order.orderId}</span>
                          <Badge className={getOrderStatusColor(order.status)}>
                            {order.status.replace(/_/g, ' ')}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-slate-900">
                            {formatOrderAmount(order.totalAmount || 0, (order as any).currency, (order as any).exchangeRate).charged}
                          </span>
                          <button
                            onClick={() => router.push(`/admin/dashboard/orders/view/${order.id}`)}
                            className="p-1.5 hover:bg-slate-200 rounded-md transition-colors"
                            title="View Order"
                          >
                            <Eye className="h-4 w-4 text-slate-500" />
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-slate-500">
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
                          <div key={item.id} className="flex items-center gap-2 bg-slate-100 rounded-lg px-2.5 py-1.5">
                            {item.productImage && (
                              <img src={item.productImage} alt={item.productName} className="w-6 h-6 rounded object-cover" />
                            )}
                            <span className="text-xs text-slate-700">{item.productName}</span>
                            <span className="text-xs text-slate-400">x{item.quantity}</span>
                          </div>
                        ))}
                        {order.items?.length > 4 && (
                          <span className="text-xs text-slate-400 self-center">+{order.items.length - 4} more</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-slate-500">
                  <ShoppingBag className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                  <p>No orders yet</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Support Tickets — raised by this customer; click through to the ticket */}
          <Card className="overflow-hidden rounded-2xl border-slate-200 shadow-sm">
            <CardHeader className="border-b border-slate-200 bg-slate-50">
              <CardTitle className="text-base flex items-center gap-2">
                <LifeBuoy className="h-4 w-4 text-slate-600" />
                Support Tickets
                {customer.supportTickets?.length ? (
                  <span className="ml-1 text-xs font-semibold text-slate-500">({customer.supportTickets.length})</span>
                ) : null}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {customer.supportTickets && customer.supportTickets.length > 0 ? (
                <div className="divide-y divide-slate-200">
                  {customer.supportTickets.map((t: any) => (
                    <div key={t.id} className="p-4 hover:bg-slate-50 transition-colors">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-xs text-slate-400">{t.ticketId}</span>
                            <Badge className={getTicketStatusColor(t.status)}>{String(t.status).replace(/[-_]/g, ' ')}</Badge>
                            <Badge className={getTicketPriorityColor(t.priority)}>{t.priority}</Badge>
                          </div>
                          <p className="font-medium text-slate-900 mt-1 truncate">{t.subject}</p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {t.category} · {new Date(t.createdAt).toLocaleDateString('en-IN')}
                          </p>
                        </div>
                        <button
                          onClick={() => router.push(`/admin/dashboard/support/${t.id}`)}
                          className="p-1.5 hover:bg-slate-200 rounded-md transition-colors shrink-0"
                          title="Open ticket"
                        >
                          <Eye className="h-4 w-4 text-slate-500" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-slate-500">
                  <LifeBuoy className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                  <p>No support tickets</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
