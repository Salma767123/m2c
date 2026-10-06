import MyTasks from '@/components/AdminDashboard/Workflows/MyTasks'
import PermissionGuard from '@/components/AdminDashboard/PermissionGuard'

export default function MyTasksPage() {
  return (
    <PermissionGuard permission="my_tasks:view">
      <MyTasks />
    </PermissionGuard>
  )
}

export const metadata = {
  title: 'My Tasks | Admin Dashboard',
  description: 'Your approval inbox',
}
