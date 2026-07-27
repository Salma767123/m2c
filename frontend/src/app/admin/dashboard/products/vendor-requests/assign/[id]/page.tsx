import AssignQCToProduct from "@/components/AdminDashboard/Products/AssignQCToProduct";
import PermissionGuard from '@/components/AdminDashboard/PermissionGuard'

export default async function AssignQCToProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <PermissionGuard permission="vendor_product_requests:assign_qc">
      <AssignQCToProduct productId={id} />
    </PermissionGuard>
  )
}
