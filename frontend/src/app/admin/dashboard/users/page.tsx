import { Breadcrumb } from '@/components/AdminDashboard/Breadcrumb/Breadcrumb'
import UserManagement from '@/components/AdminDashboard/Users/UserManagement'

export default function UsersPage() {
  return (
    <div className="space-y-6">
      <UserManagement />
    </div>
  )
}