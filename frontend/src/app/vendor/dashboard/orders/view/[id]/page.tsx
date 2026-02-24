import VendorOrderDetail from "@/components/VendorDashboard/Orders/OrderDetail";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function VendorOrderDetailPage({ params }: PageProps) {
  const { id } = await params;
  return (
    <div className="p-6">
      <VendorOrderDetail orderId={id} />
    </div>
  );
}
