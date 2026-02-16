import VendorToHubDetail from "@/components/AdminDashboard/Orders/VendorToHubDetail";

interface PageProps {
  params: {
    id: string;
  };
}

export default function VendorToHubDetailPage({ params }: PageProps) {
  return (
    <div className="p-6">
      <VendorToHubDetail orderId={params.id} />
    </div>
  );
}
