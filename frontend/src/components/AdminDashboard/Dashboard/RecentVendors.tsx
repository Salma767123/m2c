import { Card, CardContent, CardHeader, CardTitle } from '@/components/UI/Card'
import { Badge } from '@/components/UI/Badge'
import { Store, MapPin } from 'lucide-react'

// Mock data for recently added vendors
const recentVendors = [
  {
    id: '1',
    companyName: 'Premium Textiles Co.',
    ownerName: 'John Anderson',
    location: 'Mumbai, Maharashtra',
    category: 'Bedding',
    status: 'Pending',
    joinedDate: '2024-02-14'
  },
  {
    id: '2',
    companyName: 'Luxury Linens Ltd.',
    ownerName: 'Sarah Williams',
    location: 'Delhi, Delhi',
    category: 'Towels',
    status: 'Approved',
    joinedDate: '2024-02-13'
  },
  {
    id: '3',
    companyName: 'Quality Fabrics Inc.',
    ownerName: 'Michael Chen',
    location: 'Bangalore, Karnataka',
    category: 'Table Linen',
    status: 'Pending',
    joinedDate: '2024-02-13'
  },
  {
    id: '4',
    companyName: 'Comfort Home Textiles',
    ownerName: 'Emily Davis',
    location: 'Ahmedabad, Gujarat',
    category: 'Blankets',
    status: 'Approved',
    joinedDate: '2024-02-12'
  },
  {
    id: '5',
    companyName: 'Elite Fabrics Pvt Ltd',
    ownerName: 'Robert Kumar',
    location: 'Surat, Gujarat',
    category: 'Bedding',
    status: 'Pending',
    joinedDate: '2024-02-12'
  }
]

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'Approved':
      return <Badge className="bg-green-100 text-green-800">Approved</Badge>
    case 'Pending':
      return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>
    default:
      return <Badge className="bg-gray-100 text-gray-800">{status}</Badge>
  }
}

export default function RecentVendors() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recently Added Vendors</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {recentVendors.map((vendor) => (
            <div key={vendor.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <div className="flex items-center justify-center w-10 h-10 bg-gray-900 rounded-lg shrink-0">
                <Store className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-semibold text-sm text-gray-900 truncate">{vendor.companyName}</p>
                  {getStatusBadge(vendor.status)}
                </div>
                <p className="text-xs text-gray-600 mb-1">{vendor.ownerName}</p>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <MapPin className="w-3 h-3" />
                  <span>{vendor.location}</span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs text-gray-500">{vendor.joinedDate}</p>
                <p className="text-xs text-gray-600 mt-1">{vendor.category}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
