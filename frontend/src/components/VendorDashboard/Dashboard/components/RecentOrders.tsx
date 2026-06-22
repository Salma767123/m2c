'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/UI/Card';
import { ShoppingCart, Clock, CheckCircle, Package as PackageIcon, Truck } from 'lucide-react';
import Link from 'next/link';

// Quick overview only — a few latest orders; the rest live in the Orders module.
const MAX_PREVIEW = 4;

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
      return <ShoppingCart className="w-4 h-4 text-slate-400" />;
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
  const items = (orders || []).slice(0, MAX_PREVIEW);

  return (
    <Card className="border border-slate-200/80 rounded-2xl shadow-xs flex flex-col">
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
      <CardContent className="flex-1">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-44 text-slate-400">
            <ShoppingCart className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-sm">No orders yet</p>
          </div>
        ) : (
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 pr-1">
            {items.map((order) => {
              const status = (order.status || '').toLowerCase();
              // Vendor order detail is keyed by VendorShipment id, not Order id.
              // Fall back to the orders list if a shipment id isn't available.
              const href = order.shipmentId
                ? `/vendor/dashboard/orders/view/${order.shipmentId}`
                : '/vendor/dashboard/orders';
              return (
                <Link
                  key={order.id}
                  href={href}
                  className="group flex items-center gap-3 py-3 px-2 -mx-2 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  {/* Status avatar */}
                  <div className="w-11 h-11 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                    {getStatusIcon(status)}
                  </div>

                  {/* Order id + customer */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-slate-900 text-sm truncate">{order.orderId}</h4>
                      <span
                        className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${getStatusBadge(status)}`}
                      >
                        {order.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 truncate">
                      {order.customerName}
                      <span className="text-slate-400"> · {new Date(order.date).toLocaleDateString('en-IN')}</span>
                    </p>
                  </div>

                  {/* Amount + items */}
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-slate-900">₹{Number(order.amount || 0).toLocaleString('en-IN')}</p>
                    <p className="text-[11px] text-slate-500">
                      Items: <span className="font-semibold text-slate-700">{order.items}</span>
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
