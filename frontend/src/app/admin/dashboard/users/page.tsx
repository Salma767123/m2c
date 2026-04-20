import UserManagement from '@/components/AdminDashboard/Users/UserManagement'
import PermissionGuard from '@/components/AdminDashboard/PermissionGuard'

export default function UsersPage() {
  return (
    <PermissionGuard permission="view_users">
      <div className="space-y-6">
        <UserManagement />
      </div>
    </PermissionGuard>
  )
}
