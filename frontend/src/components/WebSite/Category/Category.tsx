'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { categoryService } from '@/services/categoryService';
import { Package, ArrowRight } from 'lucide-react';
import Reveal from '@/components/WebSite/Shared/Reveal';

interface Category {
  id: string;
  name: string;
  slug: string;
  image?: string;
}

export default function Category() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await categoryService.getAllCategories({
          status: 'ACTIVE',
          showRootOnly: 'true',
          sortBy: 'sortOrder',
          sortOrder: 'asc'
        });
        
        if (response.success && response.data) {
          // Limit to 6 categories for homepage
          setCategories(response.data.slice(0, 6));
        }
      } catch (error) {
        console.error('Failed to fetch categories:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  const categoryCount = categories.length;
  const maxColumns = Math.min(categoryCount, 4); // Maximum 4 columns, but adjust if fewer categories
  
  // Dynamic grid class based on category count
  const getGridClass = () => {
    if (maxColumns <= 2) return "grid-cols-1 md:grid-cols-2 items-center justify-center mx-auto";
    if (maxColumns === 3) return "grid-cols-2 md:grid-cols-3 items-center justify-center mx-auto";
    return "grid-cols-2 md:grid-cols-3 lg:grid-cols-3";
  };

  if (loading) {
    // Skeleton mirrors the loaded section (header row + responsive category
    // grid). We render six placeholder tiles — enough to fill two rows on
    // desktop and one on mobile — so the skeleton looks intentional even
    // when the actual category count comes back smaller.
    return (
      <section className="py-8 sm:py-12 lg:py-16 bg-white font-sans">
        <div className="max-w-420 mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4 sm:gap-6 lg:gap-8 mb-8 sm:mb-10 md:mb-12 lg:mb-16">
            <div className="flex-1 space-y-3">
              <div className="h-7 md:h-8 w-48 md:w-64 bg-gray-200 rounded animate-pulse mx-auto lg:mx-0" />
              <div className="h-4 w-full max-w-md bg-gray-100 rounded animate-pulse mx-auto lg:mx-0" />
            </div>
            <div className="h-10 w-32 sm:w-40 bg-gray-200 rounded-lg animate-pulse shrink-0 mx-auto lg:mx-0" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-6 items-center justify-center mx-auto">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="text-center">
                <div className="relative w-full aspect-square mb-4 overflow-hidden rounded-md bg-gray-200 animate-pulse" />
                <div className="h-5 w-32 bg-gray-200 rounded animate-pulse mx-auto" />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (categories.length === 0) {
    return null; // Don't show section if no categories
  }

  return (
    <section className="py-8 sm:py-12 lg:py-16 bg-white font-sans">
      <div className="max-w-420 mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
        <Reveal className="flex flex-col lg:flex-row lg:justify-between lg:items-end gap-4 sm:gap-6 lg:gap-8 mb-8 sm:mb-10 md:mb-12 lg:mb-16">
          <div className="text-center lg:text-left flex-1">
            <span className="inline-flex items-center gap-2 text-[11px] sm:text-xs font-semibold uppercase tracking-[0.18em] text-[#e01a1b] mb-3">
              <span className="h-px w-6 bg-[#e01a1b]" />
              Collections
            </span>
            <h2 className="font-playfair text-2xl sm:text-3xl md:text-4xl xl:text-[2.75rem] font-semibold text-[#1a1a1a] mb-2 md:mb-3 tracking-tight">
              Shop by Category
            </h2>
            <p className="text-sm sm:text-sm md:text-base lg:text-lg text-gray-500 max-w-full lg:max-w-2xl xl:max-w-3xl mx-auto lg:mx-0 leading-relaxed">
               Explore our carefully curated collection of traditional textiles, organized by category
            </p>
          </div>

          {/* View All Button */}
          <div className="flex justify-center lg:justify-end lg:ml-8 shrink-0">
            <Link
              href="/categories"
              className="group btn-shine inline-flex items-center gap-2 bg-[#e01a1b] text-white px-5 sm:px-7 md:px-8 py-2.5 sm:py-3 rounded-full hover:bg-[#c41617] transition-all duration-300 font-semibold text-xs sm:text-sm md:text-base whitespace-nowrap shadow-[0_6px_20px_rgba(224,26,27,0.3)] hover:shadow-[0_12px_30px_rgba(224,26,27,0.45)] hover:-translate-y-0.5"
            >
              <span className="hidden sm:inline">View All Categories</span>
              <span className="sm:hidden">View All</span>
              <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </div>
        </Reveal>

        <div className={`grid ${getGridClass()} gap-6 items-center justify-center mx-auto`}>
          {categories.map((category, index) => (
            <Reveal key={category.id} delay={index * 80} className="w-full max-w-[220px] mx-auto">
              <Link
                href={`/categories/${category.slug}`}
                className="group block text-center"
              >
                {/* Category Image — capped so a small category count doesn't
                    blow the tile up to full width (aspect-square × wide column). */}
                <div className="relative w-full aspect-square mb-4 overflow-hidden rounded-2xl bg-linear-to-br from-gray-100 to-gray-200 shadow-[0_1px_2px_rgba(0,0,0,0.04)] ring-1 ring-black/5 transition-all duration-500 group-hover:shadow-[0_18px_40px_rgba(0,0,0,0.14)] group-hover:-translate-y-1.5">
                  {category.image ? (
                    <Image
                      src={category.image}
                      alt={category.name}
                      fill
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                      className="object-cover transition-transform duration-[900ms] ease-out group-hover:scale-110"
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
                  {/* Gradient veil deepens on hover for a premium editorial feel */}
                  <div className="absolute inset-0 bg-linear-to-t from-black/25 via-transparent to-transparent opacity-60 transition-opacity duration-500 group-hover:opacity-90" />
                </div>

                {/* Category Name */}
                <h3 className="text-base font-semibold text-gray-800 transition-colors duration-300 group-hover:text-[#e01a1b]">
                  {category.name}
                </h3>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
