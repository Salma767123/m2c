import ProductsTable from '@/components/AdminDashboard/Products/ProductsTable'
import PermissionGuard from '@/components/AdminDashboard/PermissionGuard'

export default function ProductsPage() {
  return (
    <PermissionGuard permission="all_products:view">
      <div className="space-y-4">
        <ProductsTable />
      </div>
    </PermissionGuard>
  )
}
