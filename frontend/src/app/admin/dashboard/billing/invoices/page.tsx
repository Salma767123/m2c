import InvoiceManagement from "@/components/AdminDashboard/Billing/InvoiceManagement";
import PermissionGuard from '@/components/AdminDashboard/PermissionGuard'

export default function InvoicesPage() {
  return (
    <PermissionGuard permission="invoices:view">
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Invoice Management</h1>
          <p className="text-slate-600 mt-1">Manage and track all invoices</p>
        </div>
        <InvoiceManagement />
      </div>
    </PermissionGuard>
  );
}
