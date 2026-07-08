import CustomerManagement from '@/components/AdminDashboard/Users/CustomerManagement'
import PermissionGuard from '@/components/AdminDashboard/PermissionGuard'

export default function CustomerManagementPage() {
  return (
    <PermissionGuard permission="customer_management:view">
      <CustomerManagement />
    </PermissionGuard>
  )
}
