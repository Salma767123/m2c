import Settings from "@/components/AdminDashboard/Settings/Settings";
import PermissionGuard from '@/components/AdminDashboard/PermissionGuard'

export default function SettingsPage() {
  return (
    <PermissionGuard permission={["view_settings", "manage_settings"]}>
      <Settings />
    </PermissionGuard>
  );
}
