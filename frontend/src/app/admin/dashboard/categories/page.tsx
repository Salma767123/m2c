import { Breadcrumb } from '@/components/AdminDashboard/Breadcrumb/Breadcrumb'
import CategoryLists from '@/components/AdminDashboard/Categories/CategoryLists'
import PermissionGuard from '@/components/AdminDashboard/PermissionGuard'

export default function CategoriesPage() {
  return (
    <PermissionGuard permission="view_categories">
      <div className="space-y-6">
        <Breadcrumb />
        <CategoryLists />
      </div>
    </PermissionGuard>
  )
}
