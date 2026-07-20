import AdminSupport from "@/components/AdminDashboard/Support/AdminSupport";
import PermissionGuard from '@/components/AdminDashboard/PermissionGuard'

export default function VendorSupportPage() {
  return (
    <PermissionGuard permission="support:view">
      <AdminSupport scope="vendor" />
    </PermissionGuard>
  );
}
