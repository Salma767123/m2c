import InvoiceDetail from "@/components/AdminDashboard/Billing/InvoiceDetail";
import PermissionGuard from '@/components/AdminDashboard/PermissionGuard'

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function InvoiceDetailPage({ params }: PageProps) {
  const { id } = await params;
  return (
    <PermissionGuard permission="view_billing">
      <div className="p-6">
        <InvoiceDetail invoiceId={id} />
      </div>
    </PermissionGuard>
  );
}
