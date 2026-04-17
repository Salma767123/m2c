'use client'

import { use, useState } from 'react'
import AddEditProduct from '@/components/AdminDashboard/Products/AddEditProduct'
import { Breadcrumb } from '@/components/AdminDashboard/Breadcrumb/Breadcrumb'

interface EditProductPageProps {
  params: Promise<{
    id: string
  }>
}

export default function EditProductPage({ params }: EditProductPageProps) {
  const { id } = use(params)
  const [productName, setProductName] = useState<string>('')

  return (
    <div className="space-y-6">
      <Breadcrumb customLabels={{ [id]: productName || 'Edit Product' }} />
      <AddEditProduct productId={id} isEdit={true} onProductNameLoad={setProductName} />
    </div>
  )
}