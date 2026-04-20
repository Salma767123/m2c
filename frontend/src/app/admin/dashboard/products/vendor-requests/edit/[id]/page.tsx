'use client'

import { use } from 'react'
import AddEditProduct from '@/components/AdminDashboard/Products/AddEditProduct'
import { Breadcrumb } from '@/components/AdminDashboard/Breadcrumb/Breadcrumb'
import PermissionGuard from '@/components/AdminDashboard/PermissionGuard'

interface EditVendorProductRequestPageProps {
  params: Promise<{
    id: string
  }>
}

export default function EditVendorProductRequestPage({ params }: EditVendorProductRequestPageProps) {
  const { id } = use(params)

  return (
    <PermissionGuard permission="edit_products">
      <div className="space-y-6">
        <Breadcrumb />
        <AddEditProduct productId={id} isEdit={true} />
      </div>
    </PermissionGuard>
  )
}
