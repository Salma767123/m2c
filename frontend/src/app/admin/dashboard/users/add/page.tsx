import AddEditUser from '@/components/AdminDashboard/Users/AddEditUser/AddEditUser'
import PermissionGuard from '@/components/AdminDashboard/PermissionGuard'

export default function AddUserPage() {
  return (
    <PermissionGuard permission="staff_management:create">
      <AddEditUser />
    </PermissionGuard>
  )
}
