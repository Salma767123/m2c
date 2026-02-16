import VendorOrderDetail from "@/components/VendorDashboard/Orders/OrderDetail";

interface PageProps {
  params: {
    id: string;
  };
}

export default function VendorOrderDetailPage({ params }: PageProps) {
  return (
    <div className="p-6">
      <VendorOrderDetail orderId={params.id} />
    </div>
  );
}
