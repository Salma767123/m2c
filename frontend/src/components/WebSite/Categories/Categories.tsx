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
    return (
      <div className="min-h-screen bg-gray-50 font-sans">
        <div className="relative h-52 md:h-60 lg:h-80 overflow-hidden bg-gray-200">
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <div className="text-center text-white px-4">
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold font-sans mb-4">
                Loading Categories...
              </h1>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 font-sans">
        <div className="relative h-52 md:h-60 lg:h-80 overflow-hidden bg-gray-200">
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <div className="text-center text-white px-4">
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold font-sans mb-4">
                Error Loading Categories
              </h1>
              <p className="text-lg md:text-xl">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* Banner Section */}
      <div className="relative h-52 md:h-60 lg:h-80 overflow-hidden">
        <Image
          src="/assets/images/categories/cb5.jpg"
          alt="Categories Banner"
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
          <div className="text-center text-white px-4">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold font-sans mb-4">
              Shop by Categories
            </h1>
            <p className="text-lg md:text-xl max-w-2xl mx-auto">
              Discover our wide range of traditional textile products organized by categories
            </p>
          </div>
        </div>
      </div>

      {/* Categories Content */}
      <div className="py-12">
        <div className="max-w-7xl 2xl:max-w-420 mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-start mb-12">
            <h2 className="text-2xl font-bold font-sans text-gray-700">Browse Our Collections</h2>
            <p className="text-lg text-gray-600 max-w-2xl">
              Find exactly what you're looking for in our carefully curated categories.
            </p>
          </div>

          {categories.length === 0 ? (
            <div className="text-center py-20">
              <Package className="mx-auto h-20 w-20 text-gray-300 mb-6" />
              <h3 className="text-2xl font-bold text-gray-900 mb-4">No Categories Available</h3>
              <p className="text-gray-600 mb-6">
                Categories will appear here once they are added.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {categories.map((category) => (
                <Link
                  key={category.id}
                  href={`/categories/${category.slug}`}
                  className="group text-center"
                >
                  {/* Category Image */}
                  <div className="relative w-full aspect-square mb-4 overflow-hidden rounded-md bg-gradient-to-br from-gray-100 to-gray-200">
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

          <div className="mt-16 bg-white rounded-xl shadow-lg p-8 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Need Help?</h2>
            <p className="text-gray-600 mb-6">
              Use our search feature or contact our support team for assistance finding specific products.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/search"
                className="bg-gray-700 text-white px-6 py-3 rounded-lg hover:bg-gray-400 transition-colors font-medium"
              >
                Search Products
              </Link>
              <Link
                href="/contact"
                className="border-2 border-gray-700 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-700 hover:text-white transition-colors font-medium"
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
