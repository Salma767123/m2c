import AddEditInventory from '@/components/AdminDashboard/Inventory/AddEditInventory'
import PermissionGuard from '@/components/AdminDashboard/PermissionGuard'

interface EditInventoryPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function EditInventoryPage({ params }: EditInventoryPageProps) {
  const { id } = await params
  return (
    <PermissionGuard permission="edit_inventory">
      <AddEditInventory inventoryId={id} isEdit={true} />
    </PermissionGuard>
  )
}
