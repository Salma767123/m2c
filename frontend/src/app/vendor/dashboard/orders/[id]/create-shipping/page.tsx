'use client';

import { use } from 'react';
import dynamic from 'next/dynamic';

const CreateShipping = dynamic(
  () => import('../../../../../../components/VendorDashboard/Orders/CreateShipping'),
  { ssr: false }
);

export default function CreateShippingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <CreateShipping orderId={id} />;
}
