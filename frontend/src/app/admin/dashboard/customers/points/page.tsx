import PointsManagement from '@/components/AdminDashboard/Points/PointsManagement';
import PermissionGuard from '@/components/AdminDashboard/PermissionGuard';

const PointsPage = () => (
  <PermissionGuard permission="points:view">
    <PointsManagement />
  </PermissionGuard>
);

export default PointsPage;
