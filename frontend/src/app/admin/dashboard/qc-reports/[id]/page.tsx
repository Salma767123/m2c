import FactoryInspectionDetail from "@/components/AdminDashboard/FactoryInspectionDetail";
import ProductInspectionDetail from "@/components/AdminDashboard/ProductInspectionDetail";
import PermissionGuard from '@/components/AdminDashboard/PermissionGuard'

export default async function QCReportDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>,
  searchParams: Promise<{ type?: string }>
}) {
  const { id } = await params;
  const { type } = await searchParams;

  return (
    <PermissionGuard permission="view_reports">
      {type === 'product' ? (
        <ProductInspectionDetail productId={id} />
      ) : (
        <FactoryInspectionDetail inspectionId={id} />
      )}
    </PermissionGuard>
  );
}
