import CreateQCChecker from "@/components/AdminDashboard/QCChecker/CreateQCChecker";
import PermissionGuard from '@/components/AdminDashboard/PermissionGuard'

export default function CreateQCCheckerPage() {
  return (
    <PermissionGuard permission={["create_qc_checkers", "create_users"]}>
      <CreateQCChecker />
    </PermissionGuard>
  );
}
