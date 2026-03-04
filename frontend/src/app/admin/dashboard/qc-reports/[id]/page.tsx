import FactoryInspectionDetail from "@/components/AdminDashboard/FactoryInspectionDetail";

export default async function QCReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    return <FactoryInspectionDetail inspectionId={id} />;
}
