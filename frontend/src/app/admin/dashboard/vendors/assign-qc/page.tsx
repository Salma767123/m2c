import AssignQCChecker from "@/components/AdminDashboard/Vendors/AssignQCChecker";
import PermissionGuard from '@/components/AdminDashboard/PermissionGuard'

export default function AssignQCCheckerPage() {
  return (
    <PermissionGuard permission={["edit_vendors", "edit_qc_checkers"]}>
      <AssignQCChecker />
    </PermissionGuard>
  )
}
