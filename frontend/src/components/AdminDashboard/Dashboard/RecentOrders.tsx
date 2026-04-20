import { Card, CardContent, CardHeader, CardTitle } from '@/components/UI/Card'
import { Badge } from '@/components/UI/Badge'
import { useRouter } from 'next/navigation'
import { hasPermission } from '@/lib/auth'

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'Delivered':
      return <Badge className="bg-green-100 text-green-800 text-xs">Delivered</Badge>
    case 'Processing':
      return <Badge className="bg-blue-100 text-blue-800 text-xs">Processing</Badge>
    case 'Shipped':
      return <Badge className="bg-purple-100 text-purple-800 text-xs">Shipped</Badge>
    case 'Pending':
      return <Badge className="bg-yellow-100 text-yellow-800 text-xs">Pending</Badge>
    default:
      return <Badge className="bg-gray-100 text-gray-800 text-xs">{status}</Badge>
  }
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
        <div className="overflow-hidden">
          <table className="w-full divide-y divide-gray-200">
            <thead className="bg-gray-800">
              <tr>
                <th scope="col" className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">
                  Order ID
                </th>
                <th scope="col" className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">
                  Customer
                </th>
                <th scope="col" className="hidden md:table-cell px-3 sm:px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">
                  Date
                </th>
                <th scope="col" className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">
                  Amount
                </th>
                <th scope="col" className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">
                  Status
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
                  <td className="px-3 sm:px-6 py-4 text-sm font-medium text-blue-600">
                    <div className="truncate max-w-[120px] sm:max-w-none">
                      #{order.orderId}
                    </div>
                  </td>
                  <td className="px-3 sm:px-6 py-4 text-sm text-gray-900">
                    <div className="truncate max-w-[100px] sm:max-w-none">
                      {order.customerName}
                    </div>
                  </td>
                  <td className="hidden md:table-cell px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(order.date).toLocaleDateString()}
                  </td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">
                    ${order.totalAmount.toFixed(2)}
                  </td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(order.status)}
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
