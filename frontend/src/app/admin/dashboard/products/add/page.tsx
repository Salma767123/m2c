import AddEditProduct from '@/components/AdminDashboard/Products/AddEditProduct'
import { Breadcrumb } from '@/components/AdminDashboard/Breadcrumb/Breadcrumb'
import PermissionGuard from '@/components/AdminDashboard/PermissionGuard'

export default function AddProductPage() {
  return (
    <PermissionGuard permission="all_products:create">
      <div className="space-y-6">
        <Breadcrumb />
        <AddEditProduct />
      </div>
    </PermissionGuard>
  )
}
