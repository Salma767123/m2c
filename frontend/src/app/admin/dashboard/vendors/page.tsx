import VendorsTable from '@/components/AdminDashboard/Vendors/VendorsTable'
import { Breadcrumb } from '@/components/AdminDashboard/Breadcrumb/Breadcrumb'
import PermissionGuard from '@/components/AdminDashboard/PermissionGuard'

export default function VendorsPage() {
  return (
    <PermissionGuard permission="vendor_management:view">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Breadcrumb />
        </div>
        <VendorsTable />
      </div>
    </PermissionGuard>
  )
}
