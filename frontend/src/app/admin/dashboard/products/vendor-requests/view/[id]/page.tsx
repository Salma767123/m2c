'use client'

import { use } from 'react'
import ProductInspectionDetail from '@/components/AdminDashboard/ProductInspectionDetail'
import PermissionGuard from '@/components/AdminDashboard/PermissionGuard'

// A vendor product request, once inspected, is best viewed as its QC inspection
// report — the same view the QC Reports module opens. The full product detail
// (images, pricing, specs) lives in the All Products view instead.
export default function VendorProductRequestViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: slug } = use(params)
  // Extract MongoDB ID from slug format: "product-name--mongoId"
  const requestId = slug.includes('--') ? slug.split('--').pop()! : slug
  return (
    <PermissionGuard permission="vendor_product_requests:view">
      <ProductInspectionDetail productId={requestId} context="vendor-requests" />
    </PermissionGuard>
  )
}
