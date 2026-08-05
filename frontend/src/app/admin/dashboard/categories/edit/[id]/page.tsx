import { use } from 'react'
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
    <PermissionGuard permission="categories:edit">
      <div className="space-y-6">
        <AddEditCategory categoryId={id} isEdit={true} />
      </div>
    </PermissionGuard>
  )
}
