import DeliveryZones from '@/components/AdminDashboard/Logistics/DeliveryZones';
import PermissionGuard from '@/components/AdminDashboard/PermissionGuard';

const DeliveryZonesPage = () => (
  <PermissionGuard permission="all_products:view">
    <DeliveryZones />
  </PermissionGuard>
);

export default DeliveryZonesPage;
