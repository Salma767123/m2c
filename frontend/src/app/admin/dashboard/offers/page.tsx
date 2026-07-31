import OfferManagement from '@/components/AdminDashboard/Offers/OfferManagement'
import PermissionGuard from '@/components/AdminDashboard/PermissionGuard'

const OffersPage = () => {
  return (
    <PermissionGuard permission="coupons:view">
      <OfferManagement />
    </PermissionGuard>
  )
}

export default OffersPage
