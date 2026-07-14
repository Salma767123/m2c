import SettlementManagement from "@/components/AdminDashboard/Billing/SettlementManagement";
import PermissionGuard from '@/components/AdminDashboard/PermissionGuard'

export default function SettlementPage() {
  return (
    <PermissionGuard permission="settlement:view">
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Settlement Management</h1>
          <p className="text-slate-600 mt-1">Track and process vendor payment settlements</p>
        </div>
        <SettlementManagement />
      </div>
    </PermissionGuard>
  );
}
