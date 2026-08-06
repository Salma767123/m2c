import VendorsTable from '@/components/AdminDashboard/Vendors/VendorsTable'
import PermissionGuard from '@/components/AdminDashboard/PermissionGuard'

export default function VendorsPage() {
  return (
    <PermissionGuard permission="vendor_management:view">
      <div className="space-y-3">
        <VendorsTable />
      </div>
    </PermissionGuard>
  )
}
