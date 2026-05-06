'use client';

import { use } from 'react';
import Header from '@/components/WebSite/Header/Header';
import Footer from '@/components/WebSite/Footer/Footer';
import ProductDetail from '@/components/WebSite/ProductDetail/ProductDetail';
import Breadcrumb from '@/components/WebSite/Navigation/Breadcrumb';

interface ProductDetailPageProps {
  params: Promise<{
    slug: string
  }>
}

const ProductDetailPage = ({ params }: ProductDetailPageProps) => {
  const { slug } = use(params);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <ProductDetail productSlug={slug} />
      <Footer />
    </div>
  );
};

export default ProductDetailPage;
