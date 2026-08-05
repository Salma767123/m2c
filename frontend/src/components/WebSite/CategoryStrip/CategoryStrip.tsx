'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { Package, LayoutGrid } from 'lucide-react';
import { categoryService } from '@/services/categoryService';

interface StripCategory {
  id: string;
  name: string;
  slug: string;
  image?: string;
}

/**
 * Flipkart-style quick-category rail that sits just under the header nav and above
 * the hero banner — but in the M2C look: soft red-tinted circular tiles, a hover
 * lift, and the brand accent on the active hover. Fully dynamic; renders nothing
 * until at least one active category exists.
 */
export default function CategoryStrip() {
  const [categories, setCategories] = useState<StripCategory[]>([]);

  useEffect(() => {
    let cancelled = false;
    categoryService.getAllCategories({ status: 'ACTIVE', showRootOnly: 'true', sortBy: 'sortOrder', sortOrder: 'asc' })
      .then((res) => {
        if (cancelled) return;
        const list = (res.success && res.data ? res.data : []).slice(0, 12);
        setCategories(list);
      })
      .catch(() => { if (!cancelled) setCategories([]); });
    return () => { cancelled = true; };
  }, []);

  if (categories.length === 0) return null;

  return (
    <nav aria-label="Browse categories" className="bg-white border-b border-gray-100 font-sans">
      <div className="max-w-7xl 2xl:max-w-420 mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
        <div className="flex items-start gap-5 sm:gap-7 lg:gap-9 overflow-x-auto scrollbar-hide py-1.5 lg:justify-center">
          {/* All categories — leading shortcut */}
          <Link href="/categories" className="group flex shrink-0 flex-col items-center gap-1.5 w-16 sm:w-[72px]">
            <span className="flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white ring-1 ring-dashed ring-[#e01a1b]/40 transition-all duration-300 group-hover:bg-[#fff1f1] group-hover:-translate-y-0.5">
              <LayoutGrid className="w-5 h-5 text-[#e01a1b]" />
            </span>
            <span className="text-[11px] sm:text-xs font-semibold text-[#e01a1b] text-center leading-tight">All</span>
          </Link>

          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/products?category=${cat.slug}`}
              className="group flex shrink-0 flex-col items-center gap-1.5 w-16 sm:w-[72px]"
            >
              <span className="relative flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-full overflow-hidden bg-[#fff1f1] ring-1 ring-black/5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-300 group-hover:ring-2 group-hover:ring-[#e01a1b]/40 group-hover:shadow-[0_10px_22px_-8px_rgba(224,26,27,0.4)] group-hover:-translate-y-0.5">
                {cat.image ? (
                  <Image
                    src={cat.image}
                    alt={cat.name}
                    fill
                    sizes="56px"
                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                ) : (
                  <Package className="w-6 h-6 text-[#e01a1b]" />
                )}
              </span>
              <span className="text-[11px] sm:text-xs font-semibold text-gray-700 text-center leading-tight line-clamp-2 transition-colors duration-300 group-hover:text-[#e01a1b]">
                {cat.name}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
