import AddEditInventory from "@/components/AdminDashboard/Inventory/AddEditInventory";
import PermissionGuard from '@/components/AdminDashboard/PermissionGuard'

export default function EditInventoryRootPage() {
  return (
    <PermissionGuard permission="edit_inventory">
      <div className="p-6">
        <AddEditInventory />
      </div>
    </PermissionGuard>
  );
}
