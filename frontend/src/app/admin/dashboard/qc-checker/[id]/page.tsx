import QCCheckerDetail from "@/components/AdminDashboard/QCChecker/QCCheckerDetail";
import PermissionGuard from "@/components/AdminDashboard/PermissionGuard";

export default function QCCheckerDetailPage() {
  return (
    <PermissionGuard permission="qc_checker_management:view">
      <QCCheckerDetail />
    </PermissionGuard>
  );
}
