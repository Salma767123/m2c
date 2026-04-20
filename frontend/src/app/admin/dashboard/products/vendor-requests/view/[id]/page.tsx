'use client'

import { use } from 'react'
import VendorProductRequestView from '@/components/AdminDashboard/Products/VendorProductRequestView'
import PermissionGuard from '@/components/AdminDashboard/PermissionGuard'

export default function VendorProductRequestViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return (
    <PermissionGuard permission="view_products">
      <VendorProductRequestView requestId={id} />
    </PermissionGuard>
  )
}
