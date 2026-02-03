import { use } from 'react';
import ViewReturn from '@/components/VendorDashboard/Orders/Returns/ViewReturn';

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function ViewReturnPage({ params }: PageProps) {
  const { id } = use(params);
  return <ViewReturn returnId={id} />;
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  return {
    title: `Return ${id} - Vendor Dashboard`,
    description: `View and manage return request ${id}`,
  };
}