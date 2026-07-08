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
    <PermissionGuard permission="inventory:edit">
      <AddEditInventory inventoryId={id} isEdit={true} />
    </PermissionGuard>
  )
}
