'use client'

import { use } from 'react'
import { Breadcrumb } from '@/components/AdminDashboard/Breadcrumb/Breadcrumb'
import ViewCategory from '@/components/AdminDashboard/Categories/ViewCategory'
import PermissionGuard from '@/components/AdminDashboard/PermissionGuard'

interface ViewCategoryPageProps {
  params: Promise<{
    id: string
  }>
}

export default function ViewCategoryPage({ params }: ViewCategoryPageProps) {
  const { id } = use(params)

  return (
    <PermissionGuard permission="view_categories">
      <div className="space-y-6">
        <Breadcrumb />
        <ViewCategory categoryId={id} />
      </div>
    </PermissionGuard>
  )
}
