'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Package, ArrowRight, Grid3X3 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { categoryService } from '@/services/categoryService';
import PromotionalPopup from '@/components/WebSite/PromotionalPopup/PromotionalPopup';

interface Subcategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  productCount?: number;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  subcategories?: Subcategory[];
}

export default function SubCategories({ categorySlug }: { categorySlug: string }) {
  const [category, setCategory] = useState<Category | null>(null);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCategoryAndSubcategories = async () => {
      try {
        // First, get all categories to find the one with matching slug
        const categoriesResponse = await categoryService.getAllCategories({
          status: 'ACTIVE',
          showRootOnly: 'true',
          includeSubcategories: 'true'
        });

        if (categoriesResponse.success && categoriesResponse.data) {
          const foundCategory = categoriesResponse.data.find(
            (cat: Category) => cat.slug === categorySlug
          );

          if (foundCategory) {
            setCategory(foundCategory);

            // If category has subcategories, use them
            if (foundCategory.subcategories && foundCategory.subcategories.length > 0) {
              setSubcategories(foundCategory.subcategories);
            } else {
              // Otherwise, fetch subcategories separately
              const subcategoriesResponse = await categoryService.getSubcategories(foundCategory.id);
              if (subcategoriesResponse.success && subcategoriesResponse.data) {
                setSubcategories(subcategoriesResponse.data);
              }
            }
          } else {
            setError('Category not found');
          }
        } else {
          setError('Failed to load category');
        }
      } catch (err) {
        console.error('Failed to fetch category and subcategories:', err);
        setError('Failed to load category');
      } finally {
        setLoading(false);
      }
    };

    fetchCategoryAndSubcategories();
  }, [categorySlug]);

  if (loading) {
    // Skeleton that mirrors the loaded page's structure (banner + 4-card
    // subcategory grid) so the layout doesn't jump when the fetch resolves.
    return (
      <div className="min-h-screen bg-white">
        {/*
          Banner skeleton — light neutral surface (gray-100) following the
          industry-standard pattern used by LinkedIn, Facebook, Pinterest,
          etc. for image-region placeholders. We deliberately do NOT try to
          mimic the dark overlay of the loaded banner: matching that
          produced a very dark "void" while loading that looked broken
          against the surrounding white page, and the transition to the
          actual image was no smoother than from a light placeholder.
        */}
        <div className="relative h-52 md:h-60 lg:h-64 overflow-hidden bg-gray-100">
          <div className="absolute inset-0 flex items-center justify-center animate-pulse">
            <div className="text-center px-4 space-y-3 w-full max-w-2xl">
              <div className="h-10 md:h-12 lg:h-14 w-48 md:w-64 bg-gray-300 rounded-md mx-auto" />
              <div className="h-4 md:h-5 w-full max-w-md bg-gray-200 rounded mx-auto" />
              <div className="h-4 md:h-5 w-3/4 max-w-md bg-gray-200 rounded mx-auto" />
              <div className="h-8 w-44 bg-gray-300 rounded-full mx-auto mt-2" />
            </div>
          </div>
        </div>

        {/* Body skeleton — matches the "View All" button + subcategory grid. */}
        <div className="max-w-7xl 2xl:max-w-420 mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="mb-8 flex justify-center">
            <div className="h-12 w-56 bg-gray-200 rounded-lg animate-pulse" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-6 lg:gap-8">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden"
              >
                <div className="h-56 bg-gray-200 animate-pulse" />
                <div className="p-6 space-y-3">
                  <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
                  <div className="h-4 w-full bg-gray-100 rounded animate-pulse" />
                  <div className="h-4 w-3/4 bg-gray-100 rounded animate-pulse" />
                  <div className="h-5 w-28 bg-gray-200 rounded animate-pulse mt-4" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !category) {
    return (
      <div className="min-h-screen bg-white">
        <div className="relative min-h-40 sm:min-h-52 md:min-h-60 lg:min-h-64 overflow-hidden bg-gray-200">
          <div className="absolute inset-0 bg-black/50" />
          <div className="relative z-10 flex items-center justify-center min-h-40 sm:min-h-52 md:min-h-60 lg:min-h-64 px-3 sm:px-4 py-5 sm:py-6 md:py-8">
            <div className="text-center text-white">
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-sans font-bold mb-3 sm:mb-4 break-words">
                {error || 'Category Not Found'}
              </h1>
              <Link
                href="/categories"
                className="inline-block bg-white text-gray-900 px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg hover:bg-gray-100 transition-colors font-medium text-sm sm:text-base"
              >
                Back to Categories
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <PromotionalPopup category={category.name} />
      {/* Banner Header Section — min-h so it grows with long descriptions on mobile */}
      <div className="relative min-h-40 sm:min-h-52 md:min-h-60 lg:min-h-64 overflow-hidden">
        {category.image ? (
          <Image
            src={category.image}
            alt={`${category.name} Banner`}
            fill
            sizes="100vw"
            className="object-cover"
            priority
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-gray-600 to-gray-800" />
        )}
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-black/50" />
        {/* Content — in normal flow so the banner grows to fit long descriptions */}
        <div className="relative z-10 flex items-center justify-center min-h-40 sm:min-h-52 md:min-h-60 lg:min-h-64 px-3 sm:px-4 py-5 sm:py-6 md:py-8">
          <div className="text-center text-white">
            <div className="flex items-center justify-center mb-2 sm:mb-4">
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-sans font-bold break-words">{category.name}</h1>
            </div>
            <p className="text-sm sm:text-lg md:text-xl max-w-2xl mx-auto mb-3 sm:mb-6">
              {category.description || `Explore our curated collection of ${category.name.toLowerCase()} with premium quality and craftsmanship`}
            </p>
            <div className="inline-flex items-center px-3 sm:px-4 py-1.5 sm:py-2 bg-white/30 backdrop-blur-sm rounded-full text-white text-xs sm:text-sm font-medium">
              <Package className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-2" />
              {subcategories.length} Subcategories Available
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl 2xl:max-w-420 mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-8 sm:py-10 lg:py-12">
        {/* View All Products Button */}
        <div className="mb-6 sm:mb-8 flex justify-center">
          <Link
            href={`/products?category=${category.slug}`}
            className="inline-flex items-center px-4 sm:px-6 py-2.5 sm:py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-1 duration-300 text-sm sm:text-base"
          >
            <Grid3X3 className="mr-2 w-4 h-4 sm:w-5 sm:h-5" />
            View All {category.name} Products
          </Link>
        </div>

        {/* Subcategories Grid */}
        {subcategories.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-6 lg:gap-8">
            {subcategories.map((subcategory) => (
              <Link
                key={subcategory.id}
                href={`/products?category=${category.slug}&subcategory=${subcategory.slug}`}
                className="group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 overflow-hidden border border-gray-100 hover:border-gray-200 transform hover:-translate-y-2"
              >
                {/* Image Section */}
                <div className="relative h-40 sm:h-48 md:h-56 overflow-hidden rounded-t-2xl bg-gradient-to-br from-gray-100 to-orange-200">
                  {subcategory.image ? (
                    <Image
                      src={subcategory.image}
                      alt={subcategory.name}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
                      className="object-cover group-hover:scale-110 transition-transform duration-700"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                      }}
                    />
                  ) : null}
                  {!subcategory.image && (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-16 h-16 text-gray-600 opacity-50" />
                    </div>
                  )}

                  {/* Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                  {/* Product Count Badge */}
                  {subcategory.productCount !== undefined && (
                    <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm px-3 py-1 rounded-full shadow-lg">
                      <span className="text-xs font-semibold text-gray-700">
                        {subcategory.productCount} items
                      </span>
                    </div>
                  )}
                </div>

                {/* Content Section */}
                <div className="p-6">
                  <div className="mb-4">
                    <h3 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900 mb-2 group-hover:text-gray-700 transition-colors duration-300 break-words">
                      {subcategory.name}
                    </h3>
                    {subcategory.description && (
                      <p className="text-sm text-gray-600 leading-relaxed line-clamp-3">
                        {subcategory.description}
                      </p>
                    )}
                  </div>

                  {/* Action Button */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center text-gray-600 font-semibold text-sm group-hover:text-gray-700 transition-colors duration-300">
                      <span>Explore Collection</span>
                      <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
                    </div>
                  </div>
                </div>

                {/* Hover Effect Border */}
                <div className="absolute inset-0 rounded-2xl border-2 border-transparent group-hover:border-gray-600 transition-colors duration-300 pointer-events-none"></div>
              </Link>
            ))}
          </div>
        ) : (
          /* Empty State */
          <div className="text-center py-12 sm:py-16 lg:py-20">
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-6 sm:p-8 lg:p-12 max-w-md mx-auto">
              <Package className="mx-auto h-14 w-14 sm:h-16 sm:w-16 lg:h-20 lg:w-20 text-gray-300 mb-4 sm:mb-6" />
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">No Subcategories</h3>
              <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">
                This category doesn't have subcategories. View all products in this category instead.
              </p>
              <div className="flex flex-col gap-3">
                <Link
                  href={`/products?category=${category.slug}`}
                  className="inline-flex items-center justify-center px-6 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-semibold"
                >
                  <Grid3X3 className="mr-2 w-5 h-5" />
                  View All {category.name} Products
                </Link>
                <Link
                  href="/categories"
                  className="inline-flex items-center justify-center px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
                >
                  Browse All Categories
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Call to Action Section — compact on mobile */}
        <div className="mt-8 sm:mt-12 lg:mt-16 bg-gray-700 rounded-xl sm:rounded-2xl shadow-lg sm:shadow-2xl overflow-hidden">
          <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-12 text-center text-white">
            <h2 className="text-lg sm:text-2xl lg:text-3xl font-sans font-bold mb-2 sm:mb-3 lg:mb-4">Can't Find What You're Looking For?</h2>
            <p className="text-sm sm:text-base lg:text-xl text-gray-100 font-sans mb-4 sm:mb-6 lg:mb-8 max-w-2xl mx-auto">
              Discover more products with our advanced search or browse our complete collection
            </p>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 lg:gap-4 justify-center font-sans">
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('open-search-modal'))}
                className="inline-flex items-center justify-center px-4 sm:px-6 lg:px-8 py-2.5 sm:py-3 lg:py-4 text-sm sm:text-base bg-white text-gray-600 rounded-lg sm:rounded-xl hover:bg-gray-50 transition-colors font-semibold sm:font-bold shadow-md hover:shadow-lg sm:hover:-translate-y-1 duration-300"
              >
                <Package className="mr-2 w-4 h-4 sm:w-5 sm:h-5" />
                Search Products
              </button>
              <Link
                href="/products"
                className="inline-flex items-center justify-center px-4 sm:px-6 lg:px-8 py-2.5 sm:py-3 lg:py-4 text-sm sm:text-base border-2 border-white text-white rounded-lg sm:rounded-xl hover:bg-white hover:text-gray-600 transition-colors font-semibold sm:font-bold shadow-md hover:shadow-lg sm:hover:-translate-y-1 duration-300"
              >
                <Grid3X3 className="mr-2 w-4 h-4 sm:w-5 sm:h-5" />
                Browse All Products
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
