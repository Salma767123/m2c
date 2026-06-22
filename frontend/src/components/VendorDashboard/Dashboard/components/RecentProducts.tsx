'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/UI/Card';
import { Package, Eye } from 'lucide-react';
import Link from 'next/link';

// Dashboard is a quick overview only — show a few latest items, never the
// full dataset. The rest live in the Products module / View All page.
const MAX_PREVIEW = 4;

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
  const items = (products || []).slice(0, MAX_PREVIEW);

  return (
    <Card className="border border-slate-200/80 rounded-2xl shadow-xs flex flex-col">
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
      <CardContent className="flex-1">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-44 text-slate-400">
            <Package className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-sm">No products added yet</p>
          </div>
        ) : (
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 pr-1">
            {items.map((product) => (
              <Link
                key={product.id}
                href={`/vendor/dashboard/products/${product.id}`}
                className="group flex items-center gap-3 py-3 px-2 -mx-2 rounded-xl hover:bg-slate-50 transition-colors"
              >
                {/* Thumbnail */}
                {product.image ? (
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-11 h-11 rounded-lg object-cover border border-slate-200 shrink-0"
                  />
                ) : (
                  <div className="w-11 h-11 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                    <Package className="w-5 h-5 text-slate-400" />
                  </div>
                )}

                {/* Name + meta */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-slate-900 text-sm truncate">{product.name}</h4>
                    <span
                      className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${getStatusBadge(product.status)}`}
                    >
                      {product.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 truncate">
                    {product.category}
                    {product.sku ? <span className="text-slate-400"> · {product.sku}</span> : null}
                  </p>
                </div>

                {/* Price + stock */}
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-slate-900">₹{Number(product.price || 0).toLocaleString('en-IN')}</p>
                  <p className="text-[11px] text-slate-500">
                    Stock: <span className="font-semibold text-slate-700">{product.stock}</span>
                  </p>
                </div>

                <Eye className="w-4 h-4 text-slate-300 group-hover:text-brand-500 transition-colors shrink-0" />
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
