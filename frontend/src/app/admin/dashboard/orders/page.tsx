import OrderManagement from "@/components/AdminDashboard/Orders/OrderManagement";
import PermissionGuard from '@/components/AdminDashboard/PermissionGuard'

export default function OrdersPage() {
  return (
    <PermissionGuard permission="hub_to_customer:view">
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Order Management</h1>
          <p className="text-slate-600 mt-1">Manage and track all customer orders</p>
        </div>
        <OrderManagement />
      </div>
    </PermissionGuard>
  );
}
