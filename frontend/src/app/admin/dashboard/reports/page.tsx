import { Breadcrumb } from '@/components/AdminDashboard/Breadcrumb/Breadcrumb'
import Report from '@/components/AdminDashboard/Reports/AdminReports'
import PermissionGuard from '@/components/AdminDashboard/PermissionGuard'

export default function ReportsPage() {
  return (
    <PermissionGuard permission="view_reports">
      <div className="space-y-6">
        <Breadcrumb />
        <Report />
      </div>
    </PermissionGuard>
  )
}
