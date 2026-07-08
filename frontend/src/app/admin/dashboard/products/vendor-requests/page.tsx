import VendorProductRequests from '@/components/AdminDashboard/Products/VendorProductRequests'
import PermissionGuard from '@/components/AdminDashboard/PermissionGuard'

export default function VendorRequestsPage() {
  return (
    <PermissionGuard permission="vendor_product_requests:view">
      <VendorProductRequests />
    </PermissionGuard>
  )
}
