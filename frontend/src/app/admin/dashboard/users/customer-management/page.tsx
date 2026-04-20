import CustomerManagement from '@/components/AdminDashboard/Users/CustomerManagement'
import PermissionGuard from '@/components/AdminDashboard/PermissionGuard'

export default function CustomerManagementPage() {
  return (
    <PermissionGuard permission="view_users">
      <CustomerManagement />
    </PermissionGuard>
  )
}
