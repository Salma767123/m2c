import { Card, CardContent, CardHeader, CardTitle } from '@/components/UI/Card'
import { Badge } from '@/components/UI/Badge'
import { Package } from 'lucide-react'

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'Active':
      return <Badge className="bg-green-100 text-green-800">Active</Badge>
    case 'Pending':
      return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>
    default:
      return <Badge className="bg-gray-100 text-gray-800">{status}</Badge>
  }
}

export default function VendorRecentProducts({ products }: { products: any[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Vendor Recent Products</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {products && products.map((item) => (
            <div key={item.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <div className="flex items-center justify-center w-10 h-10 bg-gray-900 rounded-lg shrink-0">
                <Package className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-semibold text-sm text-gray-900 truncate">{item.name}</p>
                  {getStatusBadge(item.status)}
                </div>
                <p className="text-xs text-gray-600 mb-1">{item.vendorName || 'N/A'}</p>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span>{item.category}</span>
                  <span>•</span>
                  <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="font-bold text-gray-900">${item.price}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
