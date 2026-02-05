import RolesPermissions from '@/components/AdminDashboard/RolesPermissions/RolesPermissions'
import { Breadcrumb } from '@/components/AdminDashboard/Breadcrumb/Breadcrumb'

export default function RolesPermissionsPage() {
  return (
    <div className="space-y-6">
      <Breadcrumb />
      <RolesPermissions />
    </div>
  )
}

export const metadata = {
  title: 'Roles & Permissions | Admin Dashboard',
  description: 'Manage user roles and system permissions',
}