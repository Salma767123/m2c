import AddEditInventory from "@/components/VendorDashboard/Inventory/AddEditInventory";

export default function EditInventoryPage() {
  return (
    <div className="p-6">
      <AddEditInventory />
    </div>
  );
}

export const metadata = {
  title: 'Edit Inventory - Vendor Dashboard',
  description: 'Edit inventory item details',
}