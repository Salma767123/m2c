import { use } from 'react';
import ViewOrder from '@/components/VendorDashboard/Orders/ViewOrder';

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function ViewOrderPage({ params }: PageProps) {
  const { id } = use(params);
  return <ViewOrder orderId={id} />;
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  return {
    title: `Order ${id} - Vendor Dashboard`,
    description: `View and manage order ${id}`,
  };
}