import Header from '@/components/WebSite/Header/Header';
import Footer from '@/components/WebSite/Footer/Footer';
import Products from '@/components/WebSite/Products/Products';
import Breadcrumb from '@/components/WebSite/Navigation/Breadcrumb';

import { Suspense } from 'react';

export default function ProductsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <Breadcrumb items={[{ label: 'Products' }]} />
      <Suspense fallback={<div className="p-8 text-center text-gray-500">Loading products...</div>}>
        <Products />
      </Suspense>
      <Footer />
    </div>
  );
}
