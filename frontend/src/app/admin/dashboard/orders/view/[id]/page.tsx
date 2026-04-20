import OrderDetail from "@/components/AdminDashboard/Orders/OrderDetail";
import PermissionGuard from '@/components/AdminDashboard/PermissionGuard'

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function OrderDetailPage({ params }: PageProps) {
  const { id } = await params;
  return (
    <PermissionGuard permission="view_orders">
      <div className="p-6">
        <OrderDetail orderId={id} />
      </div>
    </PermissionGuard>
  );
}
