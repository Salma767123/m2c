import { Card, CardContent, CardHeader, CardTitle } from '@/components/UI/Card'
import { Badge } from '@/components/UI/Badge'
import { useRouter } from 'next/navigation'
import { Eye } from 'lucide-react'
import { hasPermission } from '@/lib/auth'

const getStatusBadge = (status: string) => {
  const s = status?.toUpperCase().replace(/ /g, '_') || ''

  if (['DELIVERED', 'COMPLETED'].includes(s))
    return <Badge className="bg-green-100 text-green-800 text-xs whitespace-nowrap">Delivered</Badge>
  if (['SHIPPED_TO_CUSTOMER', 'SHIPPED'].includes(s))
    return <Badge className="bg-purple-100 text-purple-800 text-xs whitespace-nowrap">Shipped</Badge>
  if (['IN_TRANSIT_TO_ADMIN_HUB', 'IN_TRANSIT'].includes(s))
    return <Badge className="bg-blue-100 text-blue-800 text-xs whitespace-nowrap">In Transit</Badge>
  if (['RECEIVED_AT_ADMIN_HUB'].includes(s))
    return <Badge className="bg-teal-100 text-teal-800 text-xs whitespace-nowrap">At Hub</Badge>
  if (['APPROVED_BY_ADMIN_HUB'].includes(s))
    return <Badge className="bg-emerald-100 text-emerald-800 text-xs whitespace-nowrap">Approved</Badge>
  if (['REJECTED_BY_ADMIN_HUB'].includes(s))
    return <Badge className="bg-red-100 text-red-800 text-xs whitespace-nowrap">Rejected</Badge>
  if (['VENDOR_PROCESSING', 'PROCESSING'].includes(s))
    return <Badge className="bg-blue-100 text-blue-800 text-xs whitespace-nowrap">Processing</Badge>
  if (['ORDER_CREATED', 'PENDING'].includes(s))
    return <Badge className="bg-yellow-100 text-yellow-800 text-xs whitespace-nowrap">Order Created</Badge>
  if (['CANCELLED', 'FAILED'].includes(s))
    return <Badge className="bg-red-100 text-red-800 text-xs whitespace-nowrap">Cancelled</Badge>

  return <Badge className="bg-gray-100 text-gray-800 text-xs whitespace-nowrap">{status?.replace(/_/g, ' ')}</Badge>
}

export default function RecentOrders({ orders }: { orders: any[] }) {
  const router = useRouter()
  const canViewOrders = hasPermission('view_orders')

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Orders</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full divide-y divide-gray-200">
            <thead className="bg-gray-800">
              <tr>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">
                  Order ID
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">
                  Customer
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">
                  Date
                </th>
                <th scope="col" className="px-4 py-3 text-right text-xs font-semibold text-white uppercase tracking-wider">
                  Amount
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-4 py-3 text-center text-xs font-semibold text-white uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {orders && orders.map((order) => (
                <tr
                  key={order.id}
                  className={`hover:bg-gray-50 ${canViewOrders ? 'cursor-pointer' : ''}`}
                  onClick={canViewOrders ? () => router.push(`/admin/dashboard/orders/view/${order.id}`) : undefined}
                >
                  <td className="px-4 py-4 text-sm font-medium text-blue-600 whitespace-nowrap">
                    #{order.orderId}
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-900 whitespace-nowrap">
                    {order.customerName}
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-500 whitespace-nowrap">
                    {new Date(order.date).toLocaleDateString('en-IN')}
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-900 font-semibold text-right whitespace-nowrap">
                    ₹{order.totalAmount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    {getStatusBadge(order.status)}
                  </td>
                  <td className="px-4 py-4 text-center whitespace-nowrap">
                    <button
                      onClick={() => router.push(`/admin/dashboard/orders/view/${order.id}`)}
                      className="p-1.5 hover:bg-gray-200 rounded-md transition-colors"
                      title="View Order"
                    >
                      <Eye className="h-4 w-4 text-gray-500" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
