import RolesPermissions from '@/components/AdminDashboard/RolesPermissions/RolesPermissions'
import { Breadcrumb } from '@/components/AdminDashboard/Breadcrumb/Breadcrumb'
import PermissionGuard from '@/components/AdminDashboard/PermissionGuard'

export default function RolesPermissionsPage() {
  return (
    <PermissionGuard permission={["view_roles", "edit_roles", "manage_settings"]}>
      <div className="space-y-6">
        <Breadcrumb />
        <RolesPermissions />
      </div>
    </PermissionGuard>
  )
}

export const metadata = {
  title: 'Roles & Permissions | Admin Dashboard',
  description: 'Manage user roles and system permissions',
}
