import TicketDetail from "@/components/AdminDashboard/Support/TicketDetail";

export default function TicketDetailPage({ params }: { params: { id: string } }) {
  return <TicketDetail ticketId={params.id} />;
}
