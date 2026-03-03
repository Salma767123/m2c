'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/UI/Card';
import { ShoppingCart, Clock, CheckCircle, Package as PackageIcon, Truck } from 'lucide-react';
import Link from 'next/link';

interface Order {
  id: string;
  orderNumber: string;
  product: string;
  quantity: number;
  amount: number;
  hub: string;
  status: 'pending' | 'packed' | 'shipped' | 'delivered';
  orderDate: string;
}
// mock data removed

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'delivered':
      return <CheckCircle className="w-4 h-4 text-green-600" />;
    case 'shipped':
      return <Truck className="w-4 h-4 text-blue-600" />;
    case 'packed':
      return <PackageIcon className="w-4 h-4 text-purple-600" />;
    case 'pending':
      return <Clock className="w-4 h-4 text-yellow-600" />;
    default:
      return null;
  }
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'delivered':
      return 'bg-green-100 text-green-800';
    case 'shipped':
      return 'bg-blue-100 text-blue-800';
    case 'packed':
      return 'bg-purple-100 text-purple-800';
    case 'pending':
      return 'bg-yellow-100 text-yellow-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export default function RecentOrders({ orders }: { orders: any[] }) {
  return (
    <Card className="border border-gray-200 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-lg">
          <ShoppingCart className="w-5 h-5 text-blue-600" />
          Recent Orders
        </CardTitle>
        <Link
          href="/vendor/dashboard/orders"
          className="text-sm text-gray-600 hover:text-gray-900 font-medium"
        >
          View All
        </Link>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {orders && orders.map((order) => (
            <div
              key={order.id}
              className="flex items-start justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="flex-1">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-1">{order.orderId}</h4>
                    <p className="text-sm text-gray-600">{order.customerName}</p>
                  </div>
                  <span
                    className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold capitalize bg-gray-100 text-gray-800`}
                  >
                    {getStatusIcon(order.status?.toLowerCase())}
                    {order.status}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span className="font-semibold text-gray-900">₹{order.amount.toLocaleString()}</span>
                  <span>Items: {order.items}</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(order.date).toLocaleDateString('en-IN')}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
