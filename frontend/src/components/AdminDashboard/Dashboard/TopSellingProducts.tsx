import { Card, CardContent, CardHeader, CardTitle } from '@/components/UI/Card'
import { TrendingUp } from 'lucide-react'
import Image from 'next/image'

// Mock data
const topProducts = [
  {
    id: '1',
    name: 'Premium Cotton Bedsheet',
    category: 'Bedding',
    sales: 1245,
    revenue: '$62,250',
    trend: '+15%',
    image: '/assets/images/categories/cs1.jpg'
  },
  {
    id: '2',
    name: 'Silk Pillowcase Set',
    category: 'Bedding',
    sales: 987,
    revenue: '$44,915',
    trend: '+12%',
    image: '/assets/images/categories/cs2.jpg'
  },
  {
    id: '3',
    name: 'Wool Throw Blanket',
    category: 'Blankets',
    sales: 856,
    revenue: '$38,520',
    trend: '+8%',
    image: '/assets/images/categories/cs3.jpg'
  },
  {
    id: '4',
    name: 'Linen Tablecloth',
    category: 'Table Linen',
    sales: 734,
    revenue: '$29,360',
    trend: '+10%',
    image: '/assets/images/categories/cs4.jpg'
  },
  {
    id: '5',
    name: 'Bath Towel Set',
    category: 'Towels',
    sales: 692,
    revenue: '$27,680',
    trend: '+6%',
    image: '/assets/images/categories/cs5.jpg'
  }
]

export default function TopSellingProducts() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Selling Products</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {topProducts.map((product, index) => (
            <div key={product.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              {/* Rank Badge */}
              <div className="flex items-center justify-center w-8 h-8 bg-gray-900 text-white rounded-full font-bold text-sm shrink-0">
                {index + 1}
              </div>
              
              {/* Product Image */}
              <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-gray-200 shrink-0">
                <Image
                  src={product.image}
                  alt={product.name}
                  fill
                  className="object-cover"
                  sizes="64px"
                />
              </div>
              
              {/* Product Info */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-gray-900 truncate">{product.name}</p>
                <p className="text-xs text-gray-500">{product.category}</p>
                <p className="text-xs text-gray-600 mt-1">{product.sales} sales</p>
              </div>
              
              {/* Revenue & Trend */}
              <div className="text-right shrink-0">
                <p className="font-bold text-sm text-gray-900">{product.revenue}</p>
                <div className="flex items-center justify-end gap-1 text-xs text-green-600 mt-1">
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
