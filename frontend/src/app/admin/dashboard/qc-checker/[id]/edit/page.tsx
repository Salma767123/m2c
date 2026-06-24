import EditQCChecker from "@/components/AdminDashboard/QCChecker/EditQCChecker";
import PermissionGuard from "@/components/AdminDashboard/PermissionGuard";

export default function EditQCCheckerPage() {
  return (
    <PermissionGuard permission={["edit_qc_checkers"]}>
      <EditQCChecker />
    </PermissionGuard>
  );
}
