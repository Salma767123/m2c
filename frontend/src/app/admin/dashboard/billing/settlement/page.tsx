import SettlementManagement from "@/components/AdminDashboard/Billing/SettlementManagement";

export default function SettlementPage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Settlement Management</h1>
        <p className="text-gray-600 mt-1">Track and process vendor payment settlements</p>
      </div>
      <SettlementManagement />
    </div>
  );
}
