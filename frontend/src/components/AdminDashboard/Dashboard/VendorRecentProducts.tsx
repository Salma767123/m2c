import { Card, CardContent, CardHeader, CardTitle } from '@/components/UI/Card'
import { Badge } from '@/components/UI/Badge'
import { Package } from 'lucide-react'

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'Active':
      return <Badge className="bg-green-50 text-green-700 border border-green-200">Active</Badge>
    case 'Pending':
      return <Badge className="bg-yellow-50 text-yellow-700 border border-yellow-200">Pending</Badge>
    case 'REINSPECTION':
      return <Badge className="bg-orange-50 text-orange-700 border border-orange-200 border border-orange-200">Reinspection</Badge>
    default:
      return <Badge className="bg-slate-50 text-slate-700 border border-slate-200">{status}</Badge>
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
            <div key={item.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
              <div className="flex items-center justify-center w-10 h-10 bg-brand-500 rounded-lg shrink-0">
                <Package className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-semibold text-sm text-slate-900 truncate">{item.name}</p>
                  {getStatusBadge(item.status)}
                </div>
                <p className="text-xs text-slate-600 mb-1">{item.vendorName || 'N/A'}</p>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span>{item.category}</span>
                  <span>•</span>
                  <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="font-bold text-slate-900">${item.price}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
