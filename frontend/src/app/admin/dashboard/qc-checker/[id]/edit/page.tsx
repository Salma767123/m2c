import EditQCChecker from "@/components/AdminDashboard/QCChecker/EditQCChecker";
import PermissionGuard from "@/components/AdminDashboard/PermissionGuard";

export default function EditQCCheckerPage() {
  return (
    <PermissionGuard permission="qc_checker_management:edit">
      <EditQCChecker />
    </PermissionGuard>
  );
}
