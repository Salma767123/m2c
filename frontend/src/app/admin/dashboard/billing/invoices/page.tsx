import InvoiceManagement from "@/components/AdminDashboard/Billing/InvoiceManagement";

export default function InvoicesPage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Invoice Management</h1>
        <p className="text-gray-600 mt-1">Manage and track all invoices</p>
      </div>
      <InvoiceManagement />
    </div>
  );
}
