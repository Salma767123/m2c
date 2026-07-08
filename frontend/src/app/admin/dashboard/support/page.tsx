import AdminSupport from "@/components/AdminDashboard/Support/AdminSupport";
import PermissionGuard from '@/components/AdminDashboard/PermissionGuard'

export default function AdminSupportPage() {
  return (
    <PermissionGuard permission="support:view">
      <AdminSupport />
    </PermissionGuard>
  );
}
