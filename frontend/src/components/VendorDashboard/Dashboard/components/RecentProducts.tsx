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
  switch (status) {
    case 'approved':
      return 'bg-green-100 text-green-800';
    case 'pending':
      return 'bg-yellow-100 text-yellow-800';
    case 'rejected':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export default function RecentProducts({ products }: { products: any[] }) {
  return (
    <Card className="border border-gray-200 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Package className="w-5 h-5 text-purple-600" />
          Recently Added Products
        </CardTitle>
        <Link
          href="/vendor/dashboard/products"
          className="text-sm text-gray-600 hover:text-gray-900 font-medium"
        >
          View All
        </Link>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {products && products.map((product) => (
            <div
              key={product.id}
              className="flex items-start justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="flex-1">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-1">{product.name}</h4>
                    <p className="text-sm text-gray-600">{product.category}</p>
                  </div>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-semibold capitalize ${getStatusBadge(product.status)}`}
                  >
                    {product.status}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span className="font-semibold text-gray-900">₹{product.price.toLocaleString()}</span>
                  <span>Stock: {product.stock}</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(product.createdAt).toLocaleDateString('en-IN')}
                  </span>
                </div>
              </div>
              <Link
                href={`/vendor/dashboard/products/${product.id}`}
                className="ml-4 p-2 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <Eye className="w-4 h-4 text-gray-600" />
              </Link>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
