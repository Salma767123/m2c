'use client';

import { use, Suspense } from 'react';
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
    // Warm ground, matching the cart and the rest of the storefront. This
    // wrapper sits ABOVE ProductDetail's own, so leaving it on the cool
    // bg-gray-50 kept a blue-grey band showing around the header and footer
    // however warm the component underneath was.
    <div className="min-h-screen bg-[#f9f5f2]">
      <Header />
      {/* ProductDetail reads useSearchParams (?selectShipping) — Suspense keeps a
          `next build` prerender from erroring, matching the products listing page. */}
      <Suspense fallback={<div className="p-8 text-center text-gray-500">Loading product…</div>}>
        <ProductDetail productSlug={slug} />
      </Suspense>
      <Footer />
    </div>
  );
};

export default ProductDetailPage;
