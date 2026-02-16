import OrderDetail from "@/components/AdminDashboard/Orders/OrderDetail";

interface PageProps {
  params: {
    id: string;
  };
}

export default function OrderDetailPage({ params }: PageProps) {
  return (
    <div className="p-6">
      <OrderDetail orderId={params.id} />
    </div>
  );
}
