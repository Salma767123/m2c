import AddEditUser from '@/components/AdminDashboard/Users/AddEditUser/AddEditUser'
import PermissionGuard from '@/components/AdminDashboard/PermissionGuard'

export default function AddUserPage() {
  return (
    <PermissionGuard permission="create_users">
      <AddEditUser />
    </PermissionGuard>
  )
}
