import DamagedItems from '@/components/AdminDashboard/Returns/DamagedItems';
import PermissionGuard from '@/components/AdminDashboard/PermissionGuard';

const DamagedItemsPage = () => (
  <PermissionGuard permission="inventory:view">
    <DamagedItems />
  </PermissionGuard>
);

export default DamagedItemsPage;
