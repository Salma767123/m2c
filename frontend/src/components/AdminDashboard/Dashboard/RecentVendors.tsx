import { Card, CardContent, CardHeader, CardTitle } from '@/components/UI/Card'
import { Badge } from '@/components/UI/Badge'
import { Store, ArrowRight, Package } from 'lucide-react'
import Link from 'next/link'

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'Approved':
      return <Badge className="bg-green-50 text-green-700 border border-green-200">Approved</Badge>
    case 'Pending':
      return <Badge className="bg-yellow-50 text-yellow-700 border border-yellow-200">Pending</Badge>
    default:
      return <Badge className="bg-slate-50 text-slate-700 border border-slate-200">{status}</Badge>
  }
}

export default function RecentVendors({ vendors }: { vendors: any[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recently Added Vendors</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 max-h-100 overflow-y-auto">
          {vendors && vendors.map((vendor) => (
            <div key={vendor.id} className="flex items-center justify-between p-4 border border-slate-100 rounded-lg hover:bg-slate-50 transition-colors gap-3">
              <div className="flex items-center space-x-4 min-w-0 flex-1">
                <div className="h-10 w-10 bg-brand-50 text-brand-500 rounded-full flex items-center justify-center shrink-0">
                  <Store className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-semibold text-slate-900 truncate">{vendor.companyName}</h4>
                  <div className="flex items-center mt-1 space-x-2 text-xs text-slate-500">
                    <span className="truncate">{vendor.vendorType}</span>
                    <span>•</span>
                    <span className="whitespace-nowrap">Joined {new Date(vendor.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
              <div className="shrink-0">
                {getStatusBadge(vendor.status)}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
