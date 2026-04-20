import VendorInspectionDetail from "@/components/AdminDashboard/Vendors/VendorInspectionDetail";
import PermissionGuard from '@/components/AdminDashboard/PermissionGuard'

export default async function VendorInspectionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <PermissionGuard permission="view_vendors">
      <VendorInspectionDetail vendorId={id} />
    </PermissionGuard>
  )
}
