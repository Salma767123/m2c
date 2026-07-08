import AddEditVendor from '@/components/AdminDashboard/Vendors/AddEditVendor'
import PermissionGuard from '@/components/AdminDashboard/PermissionGuard'

export default function AddVendorPage() {
  return (
    <PermissionGuard permission="vendor_management:create">
      <AddEditVendor mode="add" />
    </PermissionGuard>
  )
}
