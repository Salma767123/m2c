import HubToCustomerDetail from "@/components/AdminDashboard/Orders/HubToCustomerDetail";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function HubToCustomerDetailPage({ params }: PageProps) {
  const { id } = await params;
  return (
    <div className="p-6">
      <HubToCustomerDetail orderId={id} />
    </div>
  );
}
