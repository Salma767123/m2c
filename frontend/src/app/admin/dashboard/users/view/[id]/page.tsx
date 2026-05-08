import StaffView from '@/components/AdminDashboard/Users/StaffView/StaffView'
import PermissionGuard from '@/components/AdminDashboard/PermissionGuard'

export default function ViewUserPage() {
  return (
    <PermissionGuard permission="view_users">
      <StaffView />
    </PermissionGuard>
  )
}
