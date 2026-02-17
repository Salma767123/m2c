import SettlementDetail from "@/components/AdminDashboard/Billing/SettlementDetail";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function SettlementDetailPage({ params }: PageProps) {
  const { id } = await params;
  
  return (
    <div className="p-6">
      <SettlementDetail settlementId={id} />
    </div>
  );
}
