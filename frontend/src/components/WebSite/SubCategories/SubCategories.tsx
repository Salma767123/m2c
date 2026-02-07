'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Package, ArrowRight, Grid3X3 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { categoryService } from '@/services/categoryService';

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
    return (
      <div className="min-h-screen bg-white">
        <div className="relative h-52 md:h-60 lg:h-64 overflow-hidden bg-gray-200">
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="text-center text-white px-4">
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-sans font-bold">Loading...</h1>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !category) {
    return (
      <div className="min-h-screen bg-white">
        <div className="relative h-52 md:h-60 lg:h-64 overflow-hidden bg-gray-200">
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="text-center text-white px-4">
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-sans font-bold mb-4">
                {error || 'Category Not Found'}
              </h1>
              <Link
                href="/categories"
                className="inline-block bg-white text-gray-900 px-6 py-3 rounded-lg hover:bg-gray-100 transition-colors font-medium"
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
      {/* Banner Header Section */}
      <div className="relative h-52 md:h-60 lg:h-64 overflow-hidden">
        {category.image ? (
          <Image
            src={category.image}
            alt={`${category.name} Banner`}
            fill
            className="object-cover"
            priority
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gray-600 to-gray-800" />
        )}
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
          <div className="text-center text-white px-4">
            <div className="flex items-center justify-center mb-4">
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-sans font-bold">{category.name}</h1>
            </div>
            <p className="text-lg md:text-xl max-w-2xl mx-auto mb-6">
              {category.description || `Explore our curated collection of ${category.name.toLowerCase()} with premium quality and craftsmanship`}
            </p>
            <div className="inline-flex items-center px-4 py-2 bg-white/30 backdrop-blur-sm rounded-full text-white text-sm font-medium">
              <Package className="w-4 h-4 mr-2" />
              {subcategories.length} Subcategories Available
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl 2xl:max-w-420 mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Subcategories Grid */}
        {subcategories.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {subcategories.map((subcategory) => (
              <Link
                key={subcategory.id}
                href={`/products?category=${category.slug}&subcategory=${subcategory.slug}`}
                className="group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 overflow-hidden border border-gray-100 hover:border-gray-200 transform hover:-translate-y-2"
              >
                {/* Image Section */}
                <div className="relative h-56 overflow-hidden rounded-t-2xl bg-gradient-to-br from-gray-100 to-orange-200">
                  {subcategory.image ? (
                    <Image
                      src={subcategory.image}
                      alt={subcategory.name}
                      fill
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
                    <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-gray-700 transition-colors duration-300 line-clamp-2">
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
          <div className="text-center py-20">
            <div className="bg-white rounded-2xl shadow-lg p-12 max-w-md mx-auto">
              <Package className="mx-auto h-20 w-20 text-gray-300 mb-6" />
              <h3 className="text-2xl font-bold text-gray-900 mb-4">No Subcategories Found</h3>
              <p className="text-gray-600 mb-6">
                This category doesn't have any subcategories yet. Check back later for updates.
              </p>
              <Link
                href="/categories"
                className="inline-flex items-center px-6 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-semibold"
              >
                Browse All Categories
              </Link>
            </div>
          </div>
        )}

        {/* Call to Action Section */}
        <div className="mt-16 bg-gray-700 rounded-2xl shadow-2xl overflow-hidden">
          <div className="px-8 py-12 text-center text-white">
            <h2 className="text-3xl font-sans font-bold mb-4">Can't Find What You're Looking For?</h2>
            <p className="text-xl text-gray-100 font-sans mb-8 max-w-2xl mx-auto">
              Discover more products with our advanced search or browse our complete collection
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center font-sans">
              <Link
                href="/search"
                className="inline-flex items-center px-8 py-4 bg-white text-gray-600 rounded-xl hover:bg-gray-50 transition-colors font-bold shadow-lg hover:shadow-xl transform hover:-translate-y-1 duration-300"
              >
                <Package className="mr-2 w-5 h-5" />
                Search Products
              </Link>
              <Link
                href="/products"
                className="inline-flex items-center px-8 py-4 border-2 border-white text-white rounded-xl hover:bg-white hover:text-gray-600 transition-colors font-bold shadow-lg hover:shadow-xl transform hover:-translate-y-1 duration-300"
              >
                <Grid3X3 className="mr-2 w-5 h-5" />
                Browse All Products
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
