import { Card, CardContent, CardHeader, CardTitle } from '@/components/UI/Card'
import { Badge } from '@/components/UI/Badge'
import { Eye } from 'lucide-react'
import Link from 'next/link'

// Mock data
const recentOrders = [
  {
    id: 'ORD-001',
    customer: 'John Doe',
    product: 'Cotton Bedsheet Set',
    amount: '$129.99',
    status: 'Delivered',
    date: '2024-02-14'
  },
  {
    id: 'ORD-002',
    customer: 'Jane Smith',
    product: 'Silk Pillowcase',
    amount: '$45.50',
    status: 'Processing',
    date: '2024-02-14'
  },
  {
    id: 'ORD-003',
    customer: 'Mike Johnson',
    product: 'Wool Blanket',
    amount: '$89.99',
    status: 'Shipped',
    date: '2024-02-13'
  },
  {
    id: 'ORD-004',
    customer: 'Sarah Williams',
    product: 'Linen Tablecloth',
    amount: '$65.00',
    status: 'Pending',
    date: '2024-02-13'
  },
  {
    id: 'ORD-005',
    customer: 'David Brown',
    product: 'Bath Towel Set',
    amount: '$55.99',
    status: 'Delivered',
    date: '2024-02-12'
  }
]

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'Delivered':
      return <Badge className="bg-green-100 text-green-800">Delivered</Badge>
    case 'Processing':
      return <Badge className="bg-blue-100 text-blue-800">Processing</Badge>
    case 'Shipped':
      return <Badge className="bg-purple-100 text-purple-800">Shipped</Badge>
    case 'Pending':
      return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>
    default:
      return <Badge className="bg-gray-100 text-gray-800">{status}</Badge>
  }
}

export default function RecentOrders() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Orders</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {recentOrders.map((order) => (
            <div key={order.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-sm">{order.id}</span>
                  {getStatusBadge(order.status)}
                </div>
                <p className="text-sm text-gray-600">{order.customer}</p>
                <p className="text-xs text-gray-500">{order.product}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-gray-900">{order.amount}</p>
                <p className="text-xs text-gray-500">{order.date}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
