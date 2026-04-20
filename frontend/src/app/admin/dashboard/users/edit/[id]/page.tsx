import AddEditUser from '@/components/AdminDashboard/Users/AddEditUser/AddEditUser'
import PermissionGuard from '@/components/AdminDashboard/PermissionGuard'

export default function EditUserPage() {
  return (
    <PermissionGuard permission="edit_users">
      <AddEditUser isEdit />
    </PermissionGuard>
  )
}
