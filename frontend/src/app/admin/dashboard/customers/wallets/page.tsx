import WalletManagement from '@/components/AdminDashboard/Wallet/WalletManagement';
import PermissionGuard from '@/components/AdminDashboard/PermissionGuard';

const WalletsPage = () => (
  <PermissionGuard permission="wallet:view">
    <WalletManagement />
  </PermissionGuard>
);

export default WalletsPage;
