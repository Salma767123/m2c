import QCCheckerDetail from "@/components/AdminDashboard/QCChecker/QCCheckerDetail";
import PermissionGuard from "@/components/AdminDashboard/PermissionGuard";

export default function QCCheckerDetailPage() {
  return (
    <PermissionGuard permission={["view_qc_checkers", "view_users"]}>
      <QCCheckerDetail />
    </PermissionGuard>
  );
}
