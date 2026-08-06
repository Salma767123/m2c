'use client'

import { use } from 'react'
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
    <PermissionGuard permission="categories:view">
      <div className="space-y-6">
        <ViewCategory categoryId={id} />
      </div>
    </PermissionGuard>
  )
}
