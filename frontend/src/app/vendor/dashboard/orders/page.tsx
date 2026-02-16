import VendorOrderManagement from "@/components/VendorDashboard/Orders/OrderManagement";

export default function VendorOrdersPage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Order Management</h1>
        <p className="text-gray-600 mt-1">Process and ship your assigned orders</p>
      </div>
      <VendorOrderManagement />
    </div>
  );
}
