import QCCheckerList from "@/components/AdminDashboard/QCChecker/QCCheckerList";
import PermissionGuard from '@/components/AdminDashboard/PermissionGuard'

export default function QCCheckerPage() {
  return (
    <PermissionGuard permission={["view_qc_checkers", "view_users"]}>
      <QCCheckerList />
    </PermissionGuard>
  );
}
