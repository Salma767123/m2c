import VendorTicketDetail from "@/components/VendorDashboard/Support/VendorTicketDetail";

export default async function VendorTicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    return (
        <div className="space-y-6">
            <VendorTicketDetail ticketId={id} />
        </div>
    );
}
