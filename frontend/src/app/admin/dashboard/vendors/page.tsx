import VendorsTable from '@/components/AdminDashboard/Vendors/VendorsTable'
import { Breadcrumb } from '@/components/AdminDashboard/Breadcrumb/Breadcrumb'
import PermissionGuard from '@/components/AdminDashboard/PermissionGuard'

export default function VendorsPage() {
  return (
    <PermissionGuard permission="view_vendors">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Breadcrumb />
        </div>
        <VendorsTable />
      </div>
    </PermissionGuard>
  )
}
