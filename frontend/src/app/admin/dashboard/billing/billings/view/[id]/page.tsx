import BillingDetail from "@/components/AdminDashboard/Billing/BillingDetail";

interface PageProps {
  params: {
    id: string;
  };
}

export default function BillingDetailPage({ params }: PageProps) {
  return (
    <div className="p-6">
      <BillingDetail billingId={params.id} />
    </div>
  );
}
