import CategoryLists from '@/components/AdminDashboard/Categories/CategoryLists'
import PermissionGuard from '@/components/AdminDashboard/PermissionGuard'

export default function CategoriesPage() {
  return (
    <PermissionGuard permission="categories:view">
      <div className="space-y-6">
        <CategoryLists />
      </div>
    </PermissionGuard>
  )
}
