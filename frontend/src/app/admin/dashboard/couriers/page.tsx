import CourierManagement from '@/components/AdminDashboard/Couriers/CourierManagement'
import PermissionGuard from '@/components/AdminDashboard/PermissionGuard'

const CouriersPage = () => {
  return (
    <PermissionGuard permission="all_products:view">
      <CourierManagement />
    </PermissionGuard>
  )
}

export default CouriersPage
