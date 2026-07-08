import BagTypeManagement from '@/components/AdminDashboard/BagTypes/BagTypeManagement';
import PermissionGuard from '@/components/AdminDashboard/PermissionGuard';

const BagTypesPage = () => {
  return (
    <PermissionGuard permission="bag_types:view">
      <BagTypeManagement />
    </PermissionGuard>
  );
};

export default BagTypesPage;
