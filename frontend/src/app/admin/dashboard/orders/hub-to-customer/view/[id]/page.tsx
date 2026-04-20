import HubToCustomerDetail from "@/components/AdminDashboard/Orders/HubToCustomerDetail";
import PermissionGuard from '@/components/AdminDashboard/PermissionGuard'

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function HubToCustomerDetailPage({ params }: PageProps) {
  const { id } = await params;
  return (
    <PermissionGuard permission="view_orders">
      <div className="p-6">
        <HubToCustomerDetail orderId={id} />
      </div>
    </PermissionGuard>
  );
}
