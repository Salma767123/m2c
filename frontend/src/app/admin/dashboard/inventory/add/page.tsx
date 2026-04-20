import { Breadcrumb } from '@/components/AdminDashboard/Breadcrumb/Breadcrumb'
import AddEditInventory from '@/components/AdminDashboard/Inventory/AddEditInventory'
import PermissionGuard from '@/components/AdminDashboard/PermissionGuard'

export default function AddInventoryPage() {
  return (
    <PermissionGuard permission="create_inventory">
      <div className="space-y-4">
        <Breadcrumb />
        <AddEditInventory isEdit={false} />
      </div>
    </PermissionGuard>
  )
}
