import VendorToHubDetail from "@/components/AdminDashboard/Orders/VendorToHubDetail";
import PermissionGuard from '@/components/AdminDashboard/PermissionGuard'

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function VendorToHubDetailPage({ params }: PageProps) {
  const { id } = await params;
  return (
    <PermissionGuard permission="view_orders">
      <div className="p-6">
        <VendorToHubDetail orderId={id} />
      </div>
    </PermissionGuard>
  );
}
