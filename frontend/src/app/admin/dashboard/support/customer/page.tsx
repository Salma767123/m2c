import AdminSupport from "@/components/AdminDashboard/Support/AdminSupport";
import PermissionGuard from '@/components/AdminDashboard/PermissionGuard'

export default function CustomerSupportPage() {
  return (
    <PermissionGuard permission="support:view">
      <AdminSupport scope="customer" />
    </PermissionGuard>
  );
}
