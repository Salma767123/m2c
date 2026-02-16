import { Card, CardContent, CardHeader, CardTitle } from '@/components/UI/Card'
import { TrendingUp } from 'lucide-react'

// Mock data
const topProducts = [
  {
    id: '1',
    name: 'Premium Cotton Bedsheet',
    category: 'Bedding',
    sales: 1245,
    revenue: '$62,250',
    trend: '+15%'
  },
  {
    id: '2',
    name: 'Silk Pillowcase Set',
    category: 'Bedding',
    sales: 987,
    revenue: '$44,915',
    trend: '+12%'
  },
  {
    id: '3',
    name: 'Wool Throw Blanket',
    category: 'Blankets',
    sales: 856,
    revenue: '$38,520',
    trend: '+8%'
  },
  {
    id: '4',
    name: 'Linen Tablecloth',
    category: 'Table Linen',
    sales: 734,
    revenue: '$29,360',
    trend: '+10%'
  },
  {
    id: '5',
    name: 'Bath Towel Set',
    category: 'Towels',
    sales: 692,
    revenue: '$27,680',
    trend: '+6%'
  }
]

export default function TopSellingProducts() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Selling Products</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {topProducts.map((product, index) => (
            <div key={product.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <div className="flex items-center justify-center w-10 h-10 bg-gray-900 text-white rounded-full font-bold">
                {index + 1}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm text-gray-900">{product.name}</p>
                <p className="text-xs text-gray-500">{product.category}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-gray-900">{product.revenue}</p>
                <div className="flex items-center gap-1 text-xs text-green-600">
                  <TrendingUp className="w-3 h-3" />
                  <span>{product.trend}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
