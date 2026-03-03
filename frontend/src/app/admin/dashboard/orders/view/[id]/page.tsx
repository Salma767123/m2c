import OrderDetail from "@/components/AdminDashboard/Orders/OrderDetail";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function OrderDetailPage({ params }: PageProps) {
  const { id } = await params;
  return (
    <div className="p-6">
      <OrderDetail orderId={id} />
    </div>
  );
}
