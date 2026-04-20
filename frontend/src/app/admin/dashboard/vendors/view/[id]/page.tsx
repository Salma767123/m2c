import { use } from 'react'
import VendorView from '@/components/AdminDashboard/Vendors/VendorView'
import PermissionGuard from '@/components/AdminDashboard/PermissionGuard'

interface ViewVendorPageProps {
  params: Promise<{
    id: string
  }>
}

export default function ViewVendorPage({ params }: ViewVendorPageProps) {
  const { id } = use(params)
  return (
    <PermissionGuard permission="view_vendors">
      <VendorView vendorId={id} />
    </PermissionGuard>
  )
}
