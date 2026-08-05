'use client'

import { use, useState } from 'react'
import AddEditProduct from '@/components/AdminDashboard/Products/AddEditProduct'
import PermissionGuard from '@/components/AdminDashboard/PermissionGuard'

interface EditProductPageProps {
  params: Promise<{
    id: string
  }>
}

export default function EditProductPage({ params }: EditProductPageProps) {
  const { id } = use(params)
  const [productName, setProductName] = useState<string>('')

  return (
    <PermissionGuard permission="all_products:edit">
      <div className="space-y-6">
        <AddEditProduct productId={id} isEdit={true} onProductNameLoad={setProductName} />
      </div>
    </PermissionGuard>
  )
}
