import { use } from 'react';
import AddEditCustomerOrder from '@/components/AdminDashboard/Orders/AddEditCustomerOrder';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function EditOrderPage({ params }: PageProps) {
  const { id } = use(params);
  return <AddEditCustomerOrder orderId={id} />;
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  return {
    title: `Edit Order ${id} - Admin Dashboard`,
    description: `Edit and manage order ${id} details`,
  };
}