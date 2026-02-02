import { Breadcrumb } from '@/components/AdminDashboard/Breadcrumb/Breadcrumb'
import AddEditInventory from '@/components/VendorDashboard/Inventory/AddEditInventory'

export default function AddInventoryPage() {
  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <Breadcrumb />
      
      {/* Add Inventory Form */}
      <AddEditInventory isEdit={false} />
    </div>
  )
}

export const metadata = {
  title: 'Add Inventory - Vendor Dashboard',
  description: 'Add new inventory item to your stock',
}