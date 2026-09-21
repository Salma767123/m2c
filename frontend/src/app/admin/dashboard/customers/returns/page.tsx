import ReturnManagement from '@/components/AdminDashboard/Returns/ReturnManagement';
import PermissionGuard from '@/components/AdminDashboard/PermissionGuard';

const ReturnsPage = () => (
  <PermissionGuard permission="returns:view">
    <ReturnManagement />
  </PermissionGuard>
);

export default ReturnsPage;
