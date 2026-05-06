'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import { useState, useEffect } from 'react';
import { categoryService } from '@/services/categoryService';

interface Category {
  id: string;
  name: string;
  slug: string;
  image?: string;
}

const Category = () => {
  const pathname = usePathname();
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
          setCategories(response.data);
        }
      } catch (error) {
        console.error('Failed to fetch categories:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  const isActiveCategory = (categorySlug: string) => {
    return pathname.includes(categorySlug);
  };

  if (loading) {
    return (
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl xl:max-w-420 mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
          <div className="h-12 flex items-center justify-center gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-7 rounded-lg bg-gray-100 animate-pulse shrink-0" style={{ width: `${60 + (i % 3) * 20}px` }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow-sm">
      <div className="max-w-7xl xl:max-w-420 mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
        <div className="h-12 flex items-center justify-center mx-auto overflow-x-auto scrollbar-hide">

          {categories.slice(0, 8).map((category) => (
            <Link
              key={category.id}
              href={`/categories/${category.slug}`}
              className={`px-2 sm:px-3 py-1 rounded-lg whitespace-nowrap transition-all duration-200 shrink-0 ${
                isActiveCategory(category.slug)
                  ? 'text-white bg-[#222222] shadow-sm text-lg font-semibold transform scale-105'
                  : 'text-[#444444] hover:text-white hover:bg-[#212121] text-base'
              }`}
            >
              {category.name}
            </Link>
          ))}

          {categories.length > 8 && (
            <Link
              href="/categories"
              className="flex items-center gap-1 px-3 sm:px-4 py-2 rounded-lg font-medium text-sm sm:text-base text-[#330b03] hover:text-[#3c2415] hover:bg-[#ddd9ce] whitespace-nowrap transition-all duration-200 shrink-0"
            >
              More
              <ChevronRight className="w-4 h-4" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

export default Category;
