import UserManagement from '@/components/AdminDashboard/Users/UserManagement'
import PermissionGuard from '@/components/AdminDashboard/PermissionGuard'

export default function UserManagementPage() {
  return (
    <PermissionGuard permission="view_users">
      <UserManagement />
    </PermissionGuard>
  )
}
