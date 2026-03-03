import InvoiceDetail from "@/components/AdminDashboard/Billing/InvoiceDetail";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function InvoiceDetailPage({ params }: PageProps) {
  const { id } = await params;
  return (
    <div className="p-6">
      <InvoiceDetail invoiceId={id} />
    </div>
  );
}
