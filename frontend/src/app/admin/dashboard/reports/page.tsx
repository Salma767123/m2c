import Report from '@/components/AdminDashboard/Reports/AdminReports'
import PermissionGuard from '@/components/AdminDashboard/PermissionGuard'

export default function ReportsPage() {
  return (
    <PermissionGuard permission="reports:view">
      <div className="space-y-6">
        <Report />
      </div>
    </PermissionGuard>
  )
}
