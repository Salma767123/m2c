import RolesPermissions from '@/components/AdminDashboard/RolesPermissions/RolesPermissions'
import PermissionGuard from '@/components/AdminDashboard/PermissionGuard'

export default function RolesPermissionsPage() {
  return (
    <PermissionGuard permission="roles_permissions:view">
      <div className="space-y-6">
        <RolesPermissions />
      </div>
    </PermissionGuard>
  )
}

export const metadata = {
  title: 'Roles & Permissions | Admin Dashboard',
  description: 'Manage user roles and system permissions',
}
