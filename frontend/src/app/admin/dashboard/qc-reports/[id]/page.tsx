import FactoryInspectionDetail from "@/components/AdminDashboard/FactoryInspectionDetail";
import ProductInspectionDetail from "@/components/AdminDashboard/ProductInspectionDetail";

export default async function QCReportDetailPage({
    params,
    searchParams
}: {
    params: Promise<{ id: string }>,
    searchParams: Promise<{ type?: string }>
}) {
    const { id } = await params;
    const { type } = await searchParams;

    if (type === 'product') {
        return <ProductInspectionDetail productId={id} />;
    }

    return <FactoryInspectionDetail inspectionId={id} />;
}
