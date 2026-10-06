import OrganizationManagement from '@/components/AdminDashboard/Organization/OrganizationManagement'
import PermissionGuard from '@/components/AdminDashboard/PermissionGuard'

export default function OrganizationPage() {
  return (
    <PermissionGuard permission="organization:view">
      <OrganizationManagement />
    </PermissionGuard>
  )
}

export const metadata = {
  title: 'Organization | Admin Dashboard',
  description: 'Departments, teams and reporting structure',
}
