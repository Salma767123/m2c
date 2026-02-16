import { Card, CardContent, CardHeader, CardTitle } from '@/components/UI/Card'
import { Badge } from '@/components/UI/Badge'
import { Package, TrendingUp, AlertTriangle } from 'lucide-react'

// Mock data for vendor inventory restocks
const inventoryRestocks = [
  {
    id: '1',
    vendorName: 'Premium Textiles Co.',
    productName: 'Cotton Bedsheet - King Size',
    previousStock: 45,
    restockedQty: 200,
    currentStock: 245,
    restockDate: '2024-02-14',
    status: 'Completed'
  },
  {
    id: '2',
    vendorName: 'Luxury Linens Ltd.',
    productName: 'Egyptian Cotton Towels',
    previousStock: 12,
    restockedQty: 150,
    currentStock: 162,
    restockDate: '2024-02-14',
    status: 'Completed'
  },
  {
    id: '3',
    vendorName: 'Quality Fabrics Inc.',
    productName: 'Silk Pillowcase Set',
    previousStock: 8,
    restockedQty: 100,
    currentStock: 108,
    restockDate: '2024-02-13',
    status: 'In Progress'
  },
  {
    id: '4',
    vendorName: 'Comfort Home Textiles',
    productName: 'Wool Blanket - Queen',
    previousStock: 25,
    restockedQty: 80,
    currentStock: 105,
    restockDate: '2024-02-13',
    status: 'Completed'
  },
  {
    id: '5',
    vendorName: 'Elite Fabrics Pvt Ltd',
    productName: 'Linen Tablecloth Set',
    previousStock: 5,
    restockedQty: 60,
    currentStock: 65,
    restockDate: '2024-02-12',
    status: 'Completed'
  }
]

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'Completed':
      return <Badge className="bg-green-100 text-green-800">Completed</Badge>
    case 'In Progress':
      return <Badge className="bg-blue-100 text-blue-800">In Progress</Badge>
    default:
      return <Badge className="bg-gray-100 text-gray-800">{status}</Badge>
  }
}

const getStockIcon = (previousStock: number) => {
  if (previousStock < 20) {
    return <AlertTriangle className="w-4 h-4 text-red-500" />
  }
  return <TrendingUp className="w-4 h-4 text-green-500" />
}

export default function VendorInventoryRestock() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Inventory Restocks</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {inventoryRestocks.map((restock) => (
            <div key={restock.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <div className="flex items-center justify-center w-10 h-10 bg-gray-900 rounded-lg shrink-0">
                <Package className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-semibold text-sm text-gray-900 truncate">{restock.productName}</p>
                  {getStatusBadge(restock.status)}
                </div>
                <p className="text-xs text-gray-600 mb-2">{restock.vendorName}</p>
                <div className="flex items-center gap-3 text-xs">
                  <div className="flex items-center gap-1">
                    {getStockIcon(restock.previousStock)}
                    <span className="text-gray-500">
                      Previous: <span className="font-semibold text-gray-700">{restock.previousStock}</span>
                    </span>
                  </div>
                  <span className="text-gray-400">→</span>
                  <span className="text-gray-500">
                    Added: <span className="font-semibold text-green-600">+{restock.restockedQty}</span>
                  </span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-lg font-bold text-gray-900">{restock.currentStock}</p>
                <p className="text-xs text-gray-500">{restock.restockDate}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
