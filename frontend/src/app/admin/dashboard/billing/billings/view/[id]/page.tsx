import BillingDetail from "@/components/AdminDashboard/Billing/BillingDetail";
import PermissionGuard from '@/components/AdminDashboard/PermissionGuard'

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function BillingDetailPage({ params }: PageProps) {
  const { id } = await params;
  return (
    <PermissionGuard permission="view_billing">
      <div className="p-6">
        <BillingDetail billingId={id} />
      </div>
    </PermissionGuard>
  );
}
