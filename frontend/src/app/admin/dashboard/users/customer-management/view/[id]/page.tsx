import CustomerView from '@/components/AdminDashboard/Users/CustomerView'

export default async function CustomerViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <CustomerView customerId={id} />
}
