'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import ProductCard from '@/components/WebSite/ProductCard/ProductCard';
import Reveal from '@/components/WebSite/Shared/Reveal';
import SectionBackdrop from '@/components/WebSite/Shared/SectionBackdrop';
import { publicProductService, PublicProduct } from '@/services/publicProductService';

export default function FeaturedProducts() {
  const [products, setProducts] = useState<PublicProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchFeaturedProducts = async () => {
      setIsLoading(true);
      try {
        const response = await publicProductService.getFeaturedProducts(4);
        if (response.success && response.data) {
          setProducts(response.data.items);
        }
      } catch (error) {
        console.error('Error fetching featured products:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFeaturedProducts();
  }, []);

  if (isLoading) {
    // Skeleton that mirrors the loaded section (header row + 4-card product
    // grid). Same outer section padding as the loaded state so the page
    // doesn't reflow when the fetch resolves.
    return (
      <section className="bg-white py-8 sm:py-12 md:py-16 lg:py-20 font-sans">
        <div className="max-w-7xl 2xl:max-w-420 mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4 sm:gap-6 lg:gap-8 mb-8 sm:mb-10 md:mb-12 lg:mb-16">
            <div className="flex-1 space-y-3">
              <div className="h-7 md:h-8 w-48 md:w-64 bg-gray-200 rounded animate-pulse mx-auto lg:mx-0" />
              <div className="h-4 w-full max-w-md bg-gray-100 rounded animate-pulse mx-auto lg:mx-0" />
            </div>
            <div className="h-10 w-32 sm:w-40 bg-gray-200 rounded-lg animate-pulse shrink-0 mx-auto lg:mx-0" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5 md:gap-6 lg:gap-8">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="h-36 sm:h-40 md:h-48 w-full bg-gray-200 animate-pulse" />
                <div className="p-4 space-y-3">
                  <div className="h-3 w-16 bg-gray-100 rounded animate-pulse" />
                  <div className="h-5 w-3/4 bg-gray-200 rounded animate-pulse" />
                  <div className="h-4 w-1/2 bg-gray-100 rounded animate-pulse" />
                  <div className="h-9 w-full bg-gray-200 rounded animate-pulse mt-3" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (products.length === 0) {
    return null; // Don't show section if no products
  }

  return (
    <section className="relative overflow-hidden bg-linear-to-b from-[#faf9f7] via-white to-[#fdf6f6] py-8 sm:py-12 md:py-16 lg:py-20 font-sans">
      <SectionBackdrop />
      <div className="relative max-w-7xl 2xl:max-w-420 mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
        {/* Header Section */}
        <Reveal className="flex flex-col lg:flex-row lg:justify-between lg:items-end gap-4 sm:gap-6 lg:gap-8 mb-8 sm:mb-10 md:mb-12 lg:mb-16">
          <div className="text-center lg:text-left flex-1">
            <span className="inline-flex items-center gap-2 text-[11px] sm:text-xs font-semibold uppercase tracking-[0.18em] text-[#e01a1b] mb-3">
              <span className="h-px w-6 bg-[#e01a1b]" />
              Handpicked
            </span>
            <h2 className="font-playfair text-2xl sm:text-3xl md:text-4xl xl:text-[2.75rem] font-semibold text-[#1a1a1a] mb-2 md:mb-3 tracking-tight">
              Featured Products
            </h2>
            <p className="text-sm sm:text-sm md:text-base lg:text-lg text-gray-500 max-w-full lg:max-w-2xl xl:max-w-3xl mx-auto lg:mx-0 leading-relaxed">
              Handpicked selection of our finest traditional textiles, crafted by master artisans
            </p>
          </div>

          {/* View All Button */}
          <div className="flex justify-center lg:justify-end lg:ml-8 shrink-0">
            <Link
              href="/products"
              className="group btn-shine inline-flex items-center gap-2 bg-[#e01a1b] text-white px-5 sm:px-7 md:px-8 py-2.5 sm:py-3 rounded-full hover:bg-[#c41617] transition-all duration-300 font-semibold text-xs sm:text-sm md:text-base whitespace-nowrap shadow-[0_6px_20px_rgba(224,26,27,0.3)] hover:shadow-[0_12px_30px_rgba(224,26,27,0.45)] hover:-translate-y-0.5"
            >
              <span className="hidden sm:inline">View All Products</span>
              <span className="sm:hidden">View All</span>
              <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </div>
        </Reveal>

        {/* Products Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5 md:gap-6 lg:gap-8">
          {products.map((product, index) => (
            <Reveal key={product.id} delay={index * 90} className="w-full">
              <ProductCard product={product} />
            </Reveal>
          ))}
        </div>

        {/* Mobile View All Button (Bottom) */}
        <div className="flex justify-center mt-8 sm:mt-10 md:mt-12 lg:hidden">
          <Link
            href="/products"
            className="group btn-shine inline-flex items-center gap-2 bg-[#e01a1b] text-white px-6 sm:px-8 py-3 sm:py-3.5 rounded-full hover:bg-[#c41617] transition-all duration-300 font-semibold text-sm sm:text-base shadow-[0_6px_20px_rgba(224,26,27,0.3)] hover:-translate-y-0.5"
          >
            View All Products
            <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </section>
  );
}
