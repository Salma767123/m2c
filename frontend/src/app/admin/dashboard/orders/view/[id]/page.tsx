'use client';

import { use } from 'react';
import ViewOrder from '@/components/AdminDashboard/Orders/ViewOrder';

interface ViewOrderPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function ViewOrderPage({ params }: ViewOrderPageProps) {
  const { id } = use(params);
  return <ViewOrder orderId={id} />;
}