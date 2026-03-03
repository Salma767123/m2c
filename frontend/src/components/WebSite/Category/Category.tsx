'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { categoryService } from '@/services/categoryService';
import { Package } from 'lucide-react';

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
    return (
      <section className="py-16 bg-white font-sans">
        <div className="max-w-420 mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-gray-500">Loading categories...</p>
          </div>
        </div>
      </section>
    );
  }

  if (categories.length === 0) {
    return null; // Don't show section if no categories
  }

  return (
    <section className="py-16 bg-white font-sans">
      <div className="max-w-420 mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4 sm:gap-6 lg:gap-8 mb-8 sm:mb-10 md:mb-12 lg:mb-16">
          <div className="text-center lg:text-left flex-1">
            <h2 className="text-lg sm:text-xl md:text-2xl xl:text-3xl font-bold text-[#313131] mb-2 md:mb-3">
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
              className="inline-block bg-gray-700 text-white px-4 sm:px-6 md:px-8 py-2 sm:py-2.5 md:py-3 rounded-lg hover:bg-gray-400 transition-colors font-semibold text-xs sm:text-sm md:text-base whitespace-nowrap transform hover:scale-105 duration-200"
            >
              <span className="hidden sm:inline">View All Categories</span>
              <span className="sm:hidden">View All</span>
            </Link>
          </div>
        </div>

        <div className={`grid ${getGridClass()} gap-6 items-center justify-center mx-auto`}>
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
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
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
              <h3 className="text-base font-semibold text-gray-700 group-hover:text-[#696a6c] transition-colors">
                {category.name}
              </h3>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
