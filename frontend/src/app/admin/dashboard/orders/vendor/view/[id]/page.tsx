import { use } from 'react';
import ViewVendorOrder from '@/components/AdminDashboard/Orders/ViewVendorOrder';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function ViewVendorOrderPage({ params }: PageProps) {
  const { id } = use(params);
  return <ViewVendorOrder orderId={id} />;
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  return {
    title: `Vendor Order ${id} - Admin Dashboard`,
    description: `View and manage vendor order ${id} shipping details`,
  };
}