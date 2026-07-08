import AssignQCChecker from "@/components/AdminDashboard/Vendors/AssignQCChecker";
import PermissionGuard from '@/components/AdminDashboard/PermissionGuard'

export default function AssignQCCheckerPage() {
  return (
    <PermissionGuard permission="assign_qc_checker:view">
      <AssignQCChecker />
    </PermissionGuard>
  )
}
