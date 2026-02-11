import AddEditInventory from '@/components/AdminDashboard/Inventory/AddEditInventory'

interface EditInventoryPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function EditInventoryPage({ params }: EditInventoryPageProps) {
  const { id } = await params
  return <AddEditInventory inventoryId={id} isEdit={true} />
}