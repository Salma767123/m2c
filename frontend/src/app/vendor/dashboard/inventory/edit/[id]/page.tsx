import AddEditInventory from '@/components/VendorDashboard/Inventory/AddEditInventory'

interface EditInventoryPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function EditInventoryPage({ params }: EditInventoryPageProps) {
  const { id } = await params
  return <AddEditInventory inventoryId={id} isEdit={true} />
}

export const metadata = {
  title: 'Edit Inventory - Vendor Dashboard',
  description: 'Edit inventory item details',
}