import { Card, CardContent, CardHeader, CardTitle } from '@/components/UI/Card'
import { Badge } from '@/components/UI/Badge'
import { Eye } from 'lucide-react'
import Link from 'next/link'

// Mock data
const recentOrders = [
  {
    id: 'ORD-001',
    customer: 'John Doe',
    amount: '$129.99',
    status: 'Delivered',
    date: '2024-02-14'
  },
  {
    id: 'ORD-002',
    customer: 'Jane Smith',
    amount: '$45.50',
    status: 'Processing',
    date: '2024-02-14'
  },
  {
    id: 'ORD-003',
    customer: 'Mike Johnson',
    amount: '$89.99',
    status: 'Shipped',
    date: '2024-02-13'
  },
  {
    id: 'ORD-004',
    customer: 'Sarah Williams',
    amount: '$65.00',
    status: 'Pending',
    date: '2024-02-13'
  },
  {
    id: 'ORD-005',
    customer: 'David Brown',
    amount: '$55.99',
    status: 'Delivered',
    date: '2024-02-12'
  }
]

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

export default function RecentOrders() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Orders</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-2 text-xs font-semibold text-gray-600 uppercase">Order ID</th>
                <th className="text-left py-3 px-2 text-xs font-semibold text-gray-600 uppercase">Customer</th>
                <th className="text-left py-3 px-2 text-xs font-semibold text-gray-600 uppercase">Amount</th>
                <th className="text-left py-3 px-2 text-xs font-semibold text-gray-600 uppercase">Status</th>
                <th className="text-left py-3 px-2 text-xs font-semibold text-gray-600 uppercase">Date</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((order) => (
                <tr key={order.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-2 text-sm font-medium text-gray-900">{order.id}</td>
                  <td className="py-3 px-2 text-sm text-gray-700">{order.customer}</td>
                  <td className="py-3 px-2 text-sm font-semibold text-gray-900">{order.amount}</td>
                  <td className="py-3 px-2">{getStatusBadge(order.status)}</td>
                  <td className="py-3 px-2 text-sm text-gray-500">{order.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
