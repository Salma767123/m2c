import SettlementDetail from "@/components/AdminDashboard/Billing/SettlementDetail";
import PermissionGuard from '@/components/AdminDashboard/PermissionGuard'

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function SettlementDetailPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <PermissionGuard permission="view_billing">
      <div className="p-6">
        <SettlementDetail settlementId={id} />
      </div>
    </PermissionGuard>
  );
}
