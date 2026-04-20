import { use } from 'react'
import AddEditVendor from '@/components/AdminDashboard/Vendors/AddEditVendor'
import PermissionGuard from '@/components/AdminDashboard/PermissionGuard'

interface EditVendorPageProps {
  params: Promise<{
    id: string
  }>
}

export default function EditVendorPage({ params }: EditVendorPageProps) {
  const { id } = use(params)
  return (
    <PermissionGuard permission="edit_vendors">
      <AddEditVendor vendorId={id} mode="edit" />
    </PermissionGuard>
  )
}
