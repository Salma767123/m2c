import AddEditRole from '@/components/AdminDashboard/RolesPermissions/AddEditRole'
import { Breadcrumb } from '@/components/AdminDashboard/Breadcrumb/Breadcrumb'

export default function AddRolePage() {
  return (
    <div className="space-y-6">
      <Breadcrumb />
      <AddEditRole />
    </div>
  )
}

export const metadata = {
  title: 'Create Role | Admin Dashboard',
  description: 'Create a new role with specific permissions',
}