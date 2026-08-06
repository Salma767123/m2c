'use client'

import { use } from 'react'
import AddEditProduct from '@/components/AdminDashboard/Products/AddEditProduct'
import PermissionGuard from '@/components/AdminDashboard/PermissionGuard'

interface EditVendorProductRequestPageProps {
  params: Promise<{
    id: string
  }>
}

export default function EditVendorProductRequestPage({ params }: EditVendorProductRequestPageProps) {
  const { id } = use(params)

  return (
    <PermissionGuard permission="vendor_product_requests:edit">
      <div className="space-y-6">
        <AddEditProduct productId={id} isEdit={true} />
      </div>
    </PermissionGuard>
  )
}
