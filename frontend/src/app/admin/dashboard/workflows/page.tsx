import WorkflowManagement from '@/components/AdminDashboard/Workflows/WorkflowManagement'
import PermissionGuard from '@/components/AdminDashboard/PermissionGuard'

export default function WorkflowsPage() {
  return (
    <PermissionGuard permission="workflows:view">
      <WorkflowManagement />
    </PermissionGuard>
  )
}

export const metadata = {
  title: 'Workflows | Admin Dashboard',
  description: 'Design and manage multi-stage approval workflows',
}
