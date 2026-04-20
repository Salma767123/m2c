import CouponManagement from '@/components/AdminDashboard/Coupons/CouponManagement';
import PermissionGuard from '@/components/AdminDashboard/PermissionGuard'

const CouponsPage = () => {
  return (
    <PermissionGuard permission="view_coupons">
      <CouponManagement />
    </PermissionGuard>
  );
};

export default CouponsPage;
