'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/UI/Card';
import { Star } from 'lucide-react';

export interface TopProduct {
  name: string;
  sales: number;
  rating: number;
  revenue: number;
}

interface TopProductsProps {
  products: TopProduct[];
}

export default function TopProducts({ products }: TopProductsProps) {
  return (
    <Card className="border border-slate-200 shadow-sm hover:border-slate-700 transition-all">
      <CardHeader className="bg-slate-50 border-b border-slate-200">
        <CardTitle className="text-lg font-bold text-slate-900">Top Products</CardTitle>
      </CardHeader>
      <CardContent className="p-4 sm:p-6">
        <div className="space-y-3 sm:space-y-4">
          {products.map((product) => (
            <div
              key={product.name}
              className="flex items-center justify-between py-3 border-b border-slate-200 last:border-0 hover:bg-slate-50 rounded-lg px-2 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-900 text-sm sm:text-base truncate">{product.name}</p>
                <div className="flex items-center mt-1">
                  <Star className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-400 fill-current" />
                  <span className="text-xs sm:text-sm text-slate-600 ml-1 font-medium">{product.rating}</span>
                  <span className="text-xs sm:text-sm text-slate-500 ml-2">• {product.sales} sold</span>
                </div>
              </div>
              <div className="text-right ml-3">
                <p className="font-bold text-slate-700 text-sm sm:text-base">${product.revenue.toFixed(2)}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
