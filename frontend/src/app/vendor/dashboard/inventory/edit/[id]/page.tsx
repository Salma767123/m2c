import AddEditInventory from '@/components/VendorDashboard/Inventory/AddEditInventory'

interface EditInventoryPageProps {
  params: {
    id: string
  }
}

export default function EditInventoryPage({ params }: EditInventoryPageProps) {
  return <AddEditInventory inventoryId={params.id} isEdit={true} />
}

export const metadata = {
  title: 'Edit Inventory - Vendor Dashboard',
  description: 'Edit inventory item details',
}