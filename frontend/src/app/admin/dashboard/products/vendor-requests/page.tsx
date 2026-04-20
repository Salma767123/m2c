import VendorProductRequests from '@/components/AdminDashboard/Products/VendorProductRequests'
import PermissionGuard from '@/components/AdminDashboard/PermissionGuard'

export default function VendorRequestsPage() {
  return (
    <PermissionGuard permission="view_products">
      <VendorProductRequests />
    </PermissionGuard>
  )
}
