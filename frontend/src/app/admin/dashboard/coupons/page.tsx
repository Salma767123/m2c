import CouponManagement from '@/components/AdminDashboard/Coupons/CouponManagement';
import PermissionGuard from '@/components/AdminDashboard/PermissionGuard'

const CouponsPage = () => {
  return (
    <PermissionGuard permission="coupons:view">
      <CouponManagement />
    </PermissionGuard>
  );
};

export default CouponsPage;
