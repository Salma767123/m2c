import AddEditInventory from '@/components/VendorDashboard/Inventory/AddEditInventory'

interface EditInventoryPageProps {
  params: Promise<{
    id: string
  }>
  searchParams: Promise<{
    from?: string
    returnTo?: string
  }>
}

export default async function EditInventoryPage({ params, searchParams }: EditInventoryPageProps) {
  const { id } = await params
  const { from, returnTo } = await searchParams
  return (
    <AddEditInventory
      inventoryId={id}
      isEdit={true}
      fromProductCreation={from === 'product-creation'}
      returnTo={returnTo ? decodeURIComponent(returnTo) : undefined}
    />
  )
}

export const metadata = {
  title: 'Edit Inventory - Vendor Dashboard',
  description: 'Edit inventory item details',
}
