import VendorToHubDetail from "@/components/AdminDashboard/Orders/VendorToHubDetail";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function VendorToHubDetailPage({ params }: PageProps) {
  const { id } = await params;
  return (
    <div className="p-6">
      <VendorToHubDetail orderId={id} />
    </div>
  );
}
