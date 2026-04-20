import CreateAssignment from "@/components/AdminDashboard/Vendors/CreateAssignment";
import PermissionGuard from '@/components/AdminDashboard/PermissionGuard'

export default function CreateAssignmentPage() {
  return (
    <PermissionGuard permission={["edit_vendors", "edit_qc_checkers"]}>
      <CreateAssignment />
    </PermissionGuard>
  )
}
