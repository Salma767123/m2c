import CreateQCChecker from "@/components/AdminDashboard/QCChecker/CreateQCChecker";
import PermissionGuard from '@/components/AdminDashboard/PermissionGuard'

export default function CreateQCCheckerPage() {
  return (
    <PermissionGuard permission="qc_checker_management:create">
      <CreateQCChecker />
    </PermissionGuard>
  );
}
