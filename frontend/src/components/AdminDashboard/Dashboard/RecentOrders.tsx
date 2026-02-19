import { Card, CardContent, CardHeader, CardTitle } from '@/components/UI/Card'
import { Badge } from '@/components/UI/Badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/UI/Table'
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
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs font-semibold text-white uppercase">Order ID</TableHead>
              <TableHead className="text-xs font-semibold text-white uppercase">Customer</TableHead>
              <TableHead className="text-xs font-semibold text-white uppercase">Amount</TableHead>
              <TableHead className="text-xs font-semibold text-white uppercase">Status</TableHead>
              <TableHead className="text-xs font-semibold text-white uppercase">Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recentOrders.map((order) => (
              <TableRow key={order.id} className="hover:bg-gray-50 transition-colors">
                <TableCell className="font-medium text-gray-900">{order.id}</TableCell>
                <TableCell className="text-gray-700">{order.customer}</TableCell>
                <TableCell className="font-semibold text-gray-900">{order.amount}</TableCell>
                <TableCell>{getStatusBadge(order.status)}</TableCell>
                <TableCell className="text-gray-500">{order.date}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
