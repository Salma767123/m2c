import OrderManagement from "@/components/AdminDashboard/Orders/OrderManagement";

export default function OrdersPage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Order Management</h1>
        <p className="text-gray-600 mt-1">Manage and track all customer orders</p>
      </div>
      <OrderManagement />
    </div>
  );
}
