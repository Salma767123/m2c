import AddEditCategory from '@/components/AdminDashboard/Categories/AddEditCategory'
import PermissionGuard from '@/components/AdminDashboard/PermissionGuard'

export default function AddCategoryPage() {
  return (
    <PermissionGuard permission="categories:create">
      <div className="space-y-4">
        <AddEditCategory />
      </div>
    </PermissionGuard>
  )
}
