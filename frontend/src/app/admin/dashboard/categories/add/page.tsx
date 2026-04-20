import { Breadcrumb } from '@/components/AdminDashboard/Breadcrumb/Breadcrumb'
import AddEditCategory from '@/components/AdminDashboard/Categories/AddEditCategory'
import PermissionGuard from '@/components/AdminDashboard/PermissionGuard'

export default function AddCategoryPage() {
  return (
    <PermissionGuard permission="create_categories">
      <div className="space-y-4">
        <Breadcrumb />
        <AddEditCategory />
      </div>
    </PermissionGuard>
  )
}
