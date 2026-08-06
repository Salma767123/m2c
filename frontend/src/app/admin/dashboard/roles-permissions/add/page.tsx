import AddEditRole from '@/components/AdminDashboard/RolesPermissions/AddEditRole'
import PermissionGuard from '@/components/AdminDashboard/PermissionGuard'

export default function AddRolePage() {
  return (
    <PermissionGuard permission="roles_permissions:create">
      <div className="space-y-6">
        <AddEditRole />
      </div>
    </PermissionGuard>
  )
}

export const metadata = {
  title: 'Create Role | Admin Dashboard',
  description: 'Create a new role with specific permissions',
}
