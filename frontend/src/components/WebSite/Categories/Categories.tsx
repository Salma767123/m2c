'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Package } from 'lucide-react';
import { useState, useEffect } from 'react';
import { categoryService } from '@/services/categoryService';

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
          <div className="text-center text-white">
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold font-sans mb-2 sm:mb-4">
              Shop by Categories
            </h1>
            <p className="text-sm sm:text-lg md:text-xl max-w-2xl mx-auto">
              Discover our wide range of traditional textile products organized by categories
            </p>
          </div>
        </div>
      </div>

      {/* Categories Content */}
      <div className="py-8 sm:py-10 lg:py-12">
        <div className="max-w-7xl 2xl:max-w-420 mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
          <div className="text-start mb-6 sm:mb-8 lg:mb-12">
            <h2 className="text-xl sm:text-2xl font-bold font-sans text-gray-700">Browse Our Collections</h2>
            <p className="text-sm sm:text-base lg:text-lg text-gray-600 max-w-2xl">
              Find exactly what you're looking for in our carefully curated categories.
            </p>
          </div>

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
              {categories.map((category) => (
                <Link
                  key={category.id}
                  href={`/categories/${category.slug}`}
                  className="group text-center"
                >
                  {/* Category Image */}
                  <div className="relative w-full aspect-square mb-4 overflow-hidden rounded-md bg-linear-to-br from-gray-100 to-gray-200">
                    {category.image ? (
                      <Image
                        src={category.image}
                        alt={category.name}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
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
                  <h3 className="text-lg font-semibold text-gray-900 group-hover:text-gray-700 transition-colors">
                    {category.name}
                  </h3>
                  {category.subcategoryCount !== undefined && category.subcategoryCount > 0 && (
                    <p className="text-sm text-gray-500 mt-1">
                      {category.subcategoryCount} subcategories
                    </p>
                  )}
                </Link>
              ))}
            </div>
          )}

          <div className="mt-10 sm:mt-12 lg:mt-16 bg-white rounded-xl shadow-lg p-5 sm:p-6 lg:p-8 text-center">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">Need Help?</h2>
            <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">
              Use our search feature or contact our support team for assistance finding specific products.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
              <Link
                href="/products"
                className="bg-gray-700 text-white px-5 sm:px-6 py-2.5 sm:py-3 rounded-lg hover:bg-gray-400 transition-colors font-medium text-sm sm:text-base"
              >
                Search Products
              </Link>
              <Link
                href="/contact"
                className="border-2 border-gray-700 text-gray-700 px-5 sm:px-6 py-2.5 sm:py-3 rounded-lg hover:bg-gray-700 hover:text-white transition-colors font-medium text-sm sm:text-base"
              >
                Contact Support
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
