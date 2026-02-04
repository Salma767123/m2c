import { use } from 'react';
import ViewCustomerOrder from '@/components/AdminDashboard/Orders/ViewCustomerOrder';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function ViewCustomerOrderPage({ params }: PageProps) {
  const { id } = use(params);
  return <ViewCustomerOrder orderId={id} />;
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  return {
    title: `Customer Order ${id} - Admin Dashboard`,
    description: `View and manage customer order ${id} details and delivery experience`,
  };
}