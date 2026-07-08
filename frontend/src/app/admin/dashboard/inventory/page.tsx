import Inventory from "@/components/AdminDashboard/Inventory/Inventory";
import PermissionGuard from '@/components/AdminDashboard/PermissionGuard'

export default function InventoryPage() {
  return (
    <PermissionGuard permission="inventory:view">
      <Inventory />
    </PermissionGuard>
  )
}
