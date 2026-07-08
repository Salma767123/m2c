import CreateAssignment from "@/components/AdminDashboard/Vendors/CreateAssignment";
import PermissionGuard from '@/components/AdminDashboard/PermissionGuard'

export default function CreateAssignmentPage() {
  return (
    <PermissionGuard permission={["assign_qc_checker:create", "assign_qc_checker:edit"]}>
      <CreateAssignment />
    </PermissionGuard>
  )
}
