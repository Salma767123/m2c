'use client'

import { useSearchParams } from 'next/navigation'
import AddProduct from '@/components/VendorDashboard/Products/AddEditProduct';

export default function AddProductPage() {
  const searchParams = useSearchParams()
  const inventoryId = searchParams.get('inventoryId')

  return <AddProduct inventoryId={inventoryId || undefined} />;
}