import BillingDetail from "@/components/AdminDashboard/Billing/BillingDetail";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function BillingDetailPage({ params }: PageProps) {
  const { id } = await params;
  return (
    <div className="p-6">
      <BillingDetail billingId={id} />
    </div>
  );
}
