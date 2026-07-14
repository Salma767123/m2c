import { Card, CardContent, CardHeader, CardTitle } from '@/components/UI/Card'
import { TrendingUp, Package } from 'lucide-react'

export default function TopSellingProducts({ products }: { products: any[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Selling Products</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {products && products.map((product, index) => (
            <div key={product.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">

              {/* Product Icon */}
              <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-brand-50 shrink-0">
                <Package className="h-6 w-6 text-brand-500" />
              </div>

              {/* Product Info */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-slate-900 truncate">{product.name}</p>
                <p className="text-xs text-slate-500">{product.category}</p>
                <p className="text-xs text-slate-600 mt-1">{product.sales} sales</p>
              </div>

              {/* Revenue & Trend */}
              <div className="text-right shrink-0">
                <p className="font-bold text-sm text-slate-900">${product.revenue?.toLocaleString() || 0}</p>
                <div className="flex items-center justify-end gap-1 text-xs text-green-600 mt-1">
                  <TrendingUp className="w-3 h-3" />
                  <span>N/A</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
