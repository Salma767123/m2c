'use client'

import { use } from 'react'
import VendorProductRequestView from '@/components/AdminDashboard/Products/VendorProductRequestView'
import PermissionGuard from '@/components/AdminDashboard/PermissionGuard'

export default function VendorProductRequestViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: slug } = use(params)
  // Extract MongoDB ID from slug format: "product-name--mongoId"
  const requestId = slug.includes('--') ? slug.split('--').pop()! : slug
  return (
    <PermissionGuard permission="view_products">
      <VendorProductRequestView requestId={requestId} />
    </PermissionGuard>
  )
}
