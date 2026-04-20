import AddEditRole from '@/components/AdminDashboard/RolesPermissions/AddEditRole'
import { Breadcrumb } from '@/components/AdminDashboard/Breadcrumb/Breadcrumb'
import PermissionGuard from '@/components/AdminDashboard/PermissionGuard'

export default function AddRolePage() {
  return (
    <PermissionGuard permission={["create_roles", "manage_settings"]}>
      <div className="space-y-6">
        <Breadcrumb />
        <AddEditRole />
      </div>
    </PermissionGuard>
  )
}

export const metadata = {
  title: 'Create Role | Admin Dashboard',
  description: 'Create a new role with specific permissions',
}
