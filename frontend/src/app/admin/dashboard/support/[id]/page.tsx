import TicketDetail from "@/components/AdminDashboard/Support/TicketDetail";

export default async function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TicketDetail ticketId={id} />;
}
