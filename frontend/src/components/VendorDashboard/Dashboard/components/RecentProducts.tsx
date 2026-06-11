'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/UI/Card';
import { Package, Clock, Eye } from 'lucide-react';
import Link from 'next/link';

interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  price: number;
  stock: number;
  addedDate: string;
  status: 'pending' | 'approved' | 'rejected';
}
// mock removed
const getStatusBadge = (status: string) => {
  switch (status?.toLowerCase()) {
    case 'approved':
      return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
    case 'pending':
      return 'bg-amber-50 text-amber-700 border border-amber-200';
    case 'rejected':
      return 'bg-red-50 text-red-700 border border-red-200';
    case 'reinspection':
      return 'bg-orange-50 text-orange-700 border border-orange-200';
    default:
      return 'bg-slate-50 text-slate-700 border border-slate-200';
  }
};

export default function RecentProducts({ products }: { products: any[] }) {
  return (
    <Card className="border border-slate-200/80 rounded-2xl shadow-xs">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-lg text-slate-900">
          <span className="p-2 bg-brand-50 rounded-lg">
            <Package className="w-5 h-5 text-brand-500" />
          </span>
          Recently Added Products
        </CardTitle>
        <Link
          href="/vendor/dashboard/products"
          className="text-sm text-brand-500 hover:text-brand-600 font-semibold"
        >
          View All
        </Link>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {products && products.map((product) => (
            <div
              key={product.id}
              className="flex items-start justify-between p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
            >
              <div className="flex-1">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="font-semibold text-slate-900 mb-1">{product.name}</h4>
                    <p className="text-sm text-slate-600">{product.category}</p>
                  </div>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-semibold capitalize ${getStatusBadge(product.status)}`}
                  >
                    {product.status}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm text-slate-600">
                  <span className="font-semibold text-slate-900">₹{product.price.toLocaleString()}</span>
                  <span>Stock: {product.stock}</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(product.createdAt).toLocaleDateString('en-IN')}
                  </span>
                </div>
              </div>
              <Link
                href={`/vendor/dashboard/products/${product.id}`}
                className="ml-4 p-2 hover:bg-slate-200 rounded-lg transition-colors"
              >
                <Eye className="w-4 h-4 text-slate-600" />
              </Link>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
