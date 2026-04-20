import ProductsTable from '@/components/AdminDashboard/Products/ProductsTable'
import { Breadcrumb } from '@/components/AdminDashboard/Breadcrumb/Breadcrumb'
import PermissionGuard from '@/components/AdminDashboard/PermissionGuard'

export default function ProductsPage() {
  return (
    <PermissionGuard permission="view_products">
      <div className="space-y-4">
        <Breadcrumb />
        <ProductsTable />
      </div>
    </PermissionGuard>
  )
}
