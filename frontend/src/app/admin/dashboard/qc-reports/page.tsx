import QCReports from '@/components/AdminDashboard/QCReports';
import PermissionGuard from '@/components/AdminDashboard/PermissionGuard'

export default function QCReportsPage() {
  return (
    <PermissionGuard permission="qc_reports:view">
      <QCReports />
    </PermissionGuard>
  );
}
