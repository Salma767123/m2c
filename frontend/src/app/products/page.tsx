'use client'

import Header from '@/components/WebSite/Header/Header';
import Footer from '@/components/WebSite/Footer/Footer';
import Products from '@/components/WebSite/Products/Products';
import Breadcrumb from '@/components/WebSite/Navigation/Breadcrumb';
import SEOHead from '@/components/SEO/SEOHead';

import { Suspense } from 'react';

export default function ProductsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <SEOHead 
        pageName="products" 
        defaultTitle="Products - M2C Marketplace"
        defaultDescription="Browse our wide range of quality products from trusted suppliers"
      />
      <Header />
      <Breadcrumb items={[{ label: 'Products' }]} />
      <Suspense fallback={<div className="p-8 text-center text-gray-500">Loading products...</div>}>
        <Products />
      </Suspense>
      <Footer />
    </div>
  );
}
