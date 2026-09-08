import HubToCustomer from "@/components/AdminDashboard/Orders/HubToCustomer";
import PermissionGuard from '@/components/AdminDashboard/PermissionGuard'

export default function HubToCustomerPage() {
  return (
    <PermissionGuard permission="hub_to_customer:view">
      <HubToCustomer />
    </PermissionGuard>
  );
}
