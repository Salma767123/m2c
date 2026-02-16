import VendorToHub from "@/components/AdminDashboard/Orders/VendorToHub";

export default function VendorToHubPage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Vendor to Hub Orders</h1>
        <p className="text-gray-600 mt-1">Manage orders from vendors to your hubs</p>
      </div>
      <VendorToHub />
    </div>
  );
}
