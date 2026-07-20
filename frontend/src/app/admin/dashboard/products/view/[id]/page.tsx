'use client'

import { use } from 'react'
import VendorProductRequestView from '@/components/AdminDashboard/Products/VendorProductRequestView'
import PermissionGuard from '@/components/AdminDashboard/PermissionGuard'

export default function AllProductsViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: slug } = use(params)
  // Extract MongoDB ID from slug format: "product-name--mongoId"
  const productId = slug.includes('--') ? slug.split('--').pop()! : slug
  return (
    <PermissionGuard permission="all_products:view">
      <VendorProductRequestView requestId={productId} context="all-products" />
    </PermissionGuard>
  )
}
