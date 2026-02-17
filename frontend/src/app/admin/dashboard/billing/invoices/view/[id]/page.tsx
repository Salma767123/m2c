import InvoiceDetail from "@/components/AdminDashboard/Billing/InvoiceDetail";

interface PageProps {
  params: {
    id: string;
  };
}

export default function InvoiceDetailPage({ params }: PageProps) {
  return (
    <div className="p-6">
      <InvoiceDetail invoiceId={params.id} />
    </div>
  );
}
