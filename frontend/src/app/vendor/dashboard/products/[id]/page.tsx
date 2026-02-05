'use client'

import { use } from 'react'
import ViewProduct from '@/components/VendorDashboard/Products/ViewProduct'

export default function ViewProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return <ViewProduct productId={id} />
}