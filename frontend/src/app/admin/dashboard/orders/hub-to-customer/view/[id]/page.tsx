import HubToCustomerDetail from "@/components/AdminDashboard/Orders/HubToCustomerDetail";

interface PageProps {
  params: {
    id: string;
  };
}

export default function HubToCustomerDetailPage({ params }: PageProps) {
  return (
    <div className="p-6">
      <HubToCustomerDetail orderId={params.id} />
    </div>
  );
}
