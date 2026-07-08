import QCCheckerList from "@/components/AdminDashboard/QCChecker/QCCheckerList";
import PermissionGuard from '@/components/AdminDashboard/PermissionGuard'

export default function QCCheckerPage() {
  return (
    <PermissionGuard permission="qc_checker_management:view">
      <QCCheckerList />
    </PermissionGuard>
  );
}
