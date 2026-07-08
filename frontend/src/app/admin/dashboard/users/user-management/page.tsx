import UserManagement from '@/components/AdminDashboard/Users/UserManagement'
import PermissionGuard from '@/components/AdminDashboard/PermissionGuard'

export default function UserManagementPage() {
  return (
    <PermissionGuard permission="staff_management:view">
      <UserManagement />
    </PermissionGuard>
  )
}
