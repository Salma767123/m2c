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
      return <CheckCircle className="w-4 h-4 text-emerald-600" />;
    case 'shipped':
      return <Truck className="w-4 h-4 text-blue-500" />;
    case 'packed':
      return <PackageIcon className="w-4 h-4 text-brand-500" />;
    case 'pending':
      return <Clock className="w-4 h-4 text-amber-500" />;
    default:
      return null;
  }
};

const getStatusBadge = (status: string) => {
  switch (status?.toLowerCase()) {
    case 'delivered':
      return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
    case 'shipped':
      return 'bg-blue-50 text-blue-700 border border-blue-200';
    case 'packed':
      return 'bg-brand-50 text-brand-700 border border-brand-200';
    case 'pending':
      return 'bg-amber-50 text-amber-700 border border-amber-200';
    default:
      return 'bg-slate-50 text-slate-700 border border-slate-200';
  }
};

export default function RecentOrders({ orders }: { orders: any[] }) {
  return (
    <Card className="border border-slate-200/80 rounded-2xl shadow-xs">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-lg text-slate-900">
          <span className="p-2 bg-brand-50 rounded-lg">
            <ShoppingCart className="w-5 h-5 text-brand-500" />
          </span>
          Recent Orders
        </CardTitle>
        <Link
          href="/vendor/dashboard/orders"
          className="text-sm text-brand-500 hover:text-brand-600 font-semibold"
        >
          View All
        </Link>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {orders && orders.map((order) => (
            <div
              key={order.id}
              className="flex items-start justify-between p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
            >
              <div className="flex-1">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="font-semibold text-slate-900 mb-1">{order.orderId}</h4>
                    <p className="text-sm text-slate-600">{order.customerName}</p>
                  </div>
                  <span
                    className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold capitalize ${getStatusBadge(order.status?.toLowerCase())}`}
                  >
                    {getStatusIcon(order.status?.toLowerCase())}
                    {order.status}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm text-slate-600">
                  <span className="font-semibold text-slate-900">₹{order.amount.toLocaleString()}</span>
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
