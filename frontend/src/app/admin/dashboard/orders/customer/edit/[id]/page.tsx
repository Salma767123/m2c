import { use } from 'react';
import AddEditCustomerOrder from '@/components/AdminDashboard/Orders/AddEditCustomerOrder';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function EditCustomerOrderPage({ params }: PageProps) {
  const { id } = use(params);
  return <AddEditCustomerOrder orderId={id} isEdit={true} />;
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  return {
    title: `Edit Customer Order ${id} - Admin Dashboard`,
    description: `Edit customer order ${id} details and shipping information`,
  };
}