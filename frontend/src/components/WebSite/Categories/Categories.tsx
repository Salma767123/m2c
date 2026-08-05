'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Package } from 'lucide-react';
import { useState, useEffect } from 'react';
import { categoryService } from '@/services/categoryService';
import Reveal from '@/components/WebSite/Shared/Reveal';
import TopSelling from '@/components/WebSite/Featured/TopSelling';
import NoticeBoard from '@/components/WebSite/NoticeBoard/NoticeBoard';

interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  subcategoryCount?: number;
}

export default function Categories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await categoryService.getAllCategories({
          status: 'ACTIVE',
          showRootOnly: 'true',
          sortBy: 'sortOrder',
          sortOrder: 'asc'
        });
        
        console.log('Categories response:', response);
        
        if (response.success && response.data) {
          console.log('Categories data:', response.data);
          setCategories(response.data);
        } else {
          setError('Failed to load categories');
        }
      } catch (err) {
        console.error('Failed to fetch categories:', err);
        setError('Failed to load categories');
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  if (loading) {
    /* Skeleton mirrors the loaded page (banner + intro + category grid). */
    return (
      <div className="min-h-screen bg-gray-50 font-sans">
        {/* Banner skeleton — light neutral, same height ladder as loaded banner. */}
        <div className="relative h-40 sm:h-52 md:h-60 lg:h-80 overflow-hidden bg-gray-100">
          <div className="absolute inset-0 flex items-center justify-center animate-pulse">
            <div className="text-center px-4 space-y-3 w-full max-w-2xl">
              <div className="h-10 md:h-12 lg:h-14 w-64 md:w-80 bg-gray-300 rounded-md mx-auto" />
              <div className="h-4 md:h-5 w-full max-w-md bg-gray-200 rounded mx-auto" />
              <div className="h-4 md:h-5 w-3/4 max-w-md bg-gray-200 rounded mx-auto" />
            </div>
          </div>
        </div>

        {/* Body skeleton — intro text + category card grid. */}
        <div className="py-12">
          <div className="max-w-7xl 2xl:max-w-420 mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-start mb-12 space-y-3">
              <div className="h-7 w-56 bg-gray-200 rounded animate-pulse" />
              <div className="h-5 w-80 max-w-full bg-gray-100 rounded animate-pulse" />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="text-center">
                  <div className="relative w-full aspect-square mb-4 overflow-hidden rounded-md bg-gray-200 animate-pulse" />
                  <div className="h-5 w-32 bg-gray-200 rounded animate-pulse mx-auto" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 font-sans">
        <div className="relative min-h-40 sm:min-h-52 md:min-h-60 lg:min-h-80 overflow-hidden bg-gray-200">
          <div className="absolute inset-0 bg-black/60" />
          <div className="relative z-10 flex items-center justify-center min-h-40 sm:min-h-52 md:min-h-60 lg:min-h-80 px-3 sm:px-4 py-5 sm:py-6 md:py-8">
            <div className="text-center text-white">
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold font-sans mb-3 sm:mb-4 break-words">
                Error Loading Categories
              </h1>
              <p className="text-sm sm:text-lg md:text-xl">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* Banner Section — min-h so it grows with long copy on mobile */}
      <div className="relative min-h-40 sm:min-h-52 md:min-h-60 lg:min-h-80 overflow-hidden">
        <Image
          src="/assets/images/categories/cb5.jpg"
          alt="Categories Banner"
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-black/60" />
        <div className="relative z-10 flex items-center justify-center min-h-40 sm:min-h-52 md:min-h-60 lg:min-h-80 px-3 sm:px-4 py-5 sm:py-6 md:py-8">
          <Reveal className="text-center text-white">
            <span className="inline-flex items-center gap-2 text-[11px] sm:text-xs font-semibold uppercase tracking-[0.18em] text-white/80 mb-3">
              <span className="h-px w-6 bg-[#e01a1b]" />
              Our Collections
            </span>
            <h1 className="font-playfair text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-semibold mb-2 sm:mb-4 tracking-tight">
              Shop by Categories
            </h1>
            <p className="text-sm sm:text-lg md:text-xl max-w-2xl mx-auto">
              Discover our wide range of traditional textile products organized by categories
            </p>
          </Reveal>
        </div>
      </div>

      {/* Categories Content */}
      <div className="py-8 sm:py-10 lg:py-12">
        <div className="max-w-7xl 2xl:max-w-420 mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
          <Reveal className="text-start mb-6 sm:mb-8 lg:mb-12">
            <span className="inline-flex items-center gap-2 text-[11px] sm:text-xs font-semibold uppercase tracking-[0.18em] text-[#e01a1b] mb-3">
              <span className="h-px w-6 bg-[#e01a1b]" />
              Categories
            </span>
            <h2 className="font-playfair text-xl sm:text-2xl md:text-3xl font-semibold text-[#1a1a1a] tracking-tight">Browse Our Collections</h2>
            <p className="text-sm sm:text-base lg:text-lg text-gray-600 max-w-2xl">
              Find exactly what you're looking for in our carefully curated categories.
            </p>
          </Reveal>

          {categories.length === 0 ? (
            <div className="text-center py-12 sm:py-16 lg:py-20">
              <Package className="mx-auto h-14 w-14 sm:h-16 sm:w-16 lg:h-20 lg:w-20 text-gray-300 mb-4 sm:mb-6" />
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">No Categories Available</h3>
              <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">
                Categories will appear here once they are added.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
              {categories.map((category, index) => (
                <Reveal key={category.id} delay={index * 90}>
                  <Link
                    href={`/categories/${category.slug}`}
                    className="group block text-center"
                  >
                    {/* Category Image */}
                    <div className="relative w-full aspect-square mb-4 overflow-hidden rounded-2xl ring-1 ring-black/5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] group-hover:shadow-[0_18px_40px_rgba(0,0,0,0.12)] group-hover:-translate-y-1.5 group-hover:ring-[#e01a1b]/20 transition-all duration-500 bg-linear-to-br from-gray-100 to-gray-200">
                      {category.image ? (
                        <Image
                          src={category.image}
                          alt={category.name}
                          fill
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                          className="object-cover group-hover:scale-110 transition-transform duration-[900ms] ease-out"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                          }}
                        />
                      ) : null}
                      {!category.image && (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-16 h-16 text-gray-400" />
                        </div>
                      )}
                    </div>

                    {/* Category Name */}
                    <h3 className="text-lg font-semibold text-[#1a1a1a] group-hover:text-[#e01a1b] transition-colors">
                      {category.name}
                    </h3>
                    {category.subcategoryCount !== undefined && category.subcategoryCount > 0 && (
                      <p className="text-sm text-gray-500 mt-1">
                        {category.subcategoryCount} subcategories
                      </p>
                    )}
                  </Link>
                </Reveal>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Top-selling products — same live rail as the home page */}
      <TopSelling />

      {/* What's Happening — live offers / coupons board */}
      <NoticeBoard />

      {/* Need Help card */}
      <div className="pb-10 sm:pb-12 lg:pb-16">
        <div className="max-w-7xl 2xl:max-w-420 mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
          <Reveal className="bg-[#f7f7f5] rounded-2xl ring-1 ring-black/5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] p-5 sm:p-6 lg:p-8 text-center">
            <h2 className="font-playfair text-xl sm:text-2xl md:text-3xl font-semibold text-[#1a1a1a] mb-3 sm:mb-4 tracking-tight">Need Help?</h2>
            <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">
              Use our search feature or contact our support team for assistance finding specific products.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
              <Link
                href="/products"
                className="btn-shine inline-flex items-center justify-center gap-2 bg-[#e01a1b] text-white px-6 py-3 rounded-full hover:bg-[#c41617] shadow-[0_6px_20px_rgba(224,26,27,0.3)] hover:shadow-[0_12px_30px_rgba(224,26,27,0.45)] hover:-translate-y-0.5 transition-all duration-300 font-semibold text-sm sm:text-base"
              >
                Search Products
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center justify-center gap-2 border border-[#e01a1b] text-[#e01a1b] px-6 py-3 rounded-full hover:bg-[#e01a1b] hover:text-white transition-all duration-300 font-semibold text-sm sm:text-base"
              >
                Contact Support
              </Link>
            </div>
          </Reveal>
        </div>
      </div>
    </div>
  );
}
