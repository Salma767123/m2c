import AddEditInventory from '@/components/AdminDashboard/Inventory/AddEditInventory'
import PermissionGuard from '@/components/AdminDashboard/PermissionGuard'

export default function AddInventoryPage() {
  return (
    <PermissionGuard permission="inventory:create">
      <div className="space-y-4">
        <AddEditInventory isEdit={false} />
      </div>
    </PermissionGuard>
  )
}
