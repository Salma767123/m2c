'use client'

import { useParams } from 'next/navigation'
import UpdateStockPage from '@/components/AdminDashboard/Inventory/UpdateStockPage'
import PermissionGuard from '@/components/AdminDashboard/PermissionGuard'

export default function UpdateStock() {
  const params = useParams()
  const inventoryId = params.id as string

  return (
    <PermissionGuard permission="edit_inventory">
      <UpdateStockPage inventoryId={inventoryId} />
    </PermissionGuard>
  )
}
