import { use } from 'react'
import { Breadcrumb } from '@/components/AdminDashboard/Breadcrumb/Breadcrumb'
import AddEditCategory from '@/components/AdminDashboard/Categories/AddEditCategory'
import PermissionGuard from '@/components/AdminDashboard/PermissionGuard'

interface EditCategoryPageProps {
  params: Promise<{
    id: string
  }>
}

export default function EditCategoryPage({ params }: EditCategoryPageProps) {
  const { id } = use(params)

  return (
    <PermissionGuard permission="edit_categories">
      <div className="space-y-6">
        <Breadcrumb />
        <AddEditCategory categoryId={id} isEdit={true} />
      </div>
    </PermissionGuard>
  )
}
