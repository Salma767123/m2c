'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { ChevronDown, ChevronRight, Package, LayoutGrid } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { categoryService } from '@/services/categoryService';

interface SubCategory {
  id: string;
  name: string;
  slug: string;
  image?: string;
  status?: string;
  productCount?: number;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  image?: string;
  subcategories?: SubCategory[];
}

/**
 * Myntra-style category navigation bar — a horizontal row of top-level
 * categories, each opening a compact subcategory dropdown on hover, anchored
 * directly under the category. Sits under the main header. On mobile (no hover)
 * it becomes a horizontally-scrolling strip; tapping goes to the category page.
 */
const CategoryNav = () => {
  const pathname = usePathname();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    categoryService
      .getAllCategories({ status: 'ACTIVE', showRootOnly: 'true', includeSubcategories: 'true', sortBy: 'sortOrder', sortOrder: 'asc' })
      .then((res) => { if (res.success && res.data) setCategories(res.data as unknown as Category[]); })
      .catch((e) => console.error('Failed to fetch categories:', e))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { setOpenId(null); }, [pathname]);
  useEffect(() => () => { if (closeTimer.current) clearTimeout(closeTimer.current); }, []);

  const activeSubs = (cat: Category) => (cat.subcategories || []).filter((s) => !s.status || s.status === 'ACTIVE');
  const isActive = (slug: string) => pathname.includes(slug);

  const openMenu = (id: string) => { if (closeTimer.current) clearTimeout(closeTimer.current); setOpenId(id); };
  const scheduleClose = () => { if (closeTimer.current) clearTimeout(closeTimer.current); closeTimer.current = setTimeout(() => setOpenId(null), 150); };

  if (loading) {
    return (
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl xl:max-w-420 mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
          <div className="h-10 flex items-center justify-center gap-6">
            {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-4 w-20 rounded bg-gray-100 animate-pulse" />)}
          </div>
        </div>
      </div>
    );
  }
  if (categories.length === 0) return null;

  return (
    <div className="relative bg-white border-b border-gray-100 shadow-sm" onMouseLeave={scheduleClose}>
      <div className="max-w-7xl xl:max-w-420 mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
        <nav className="h-10 sm:h-11 flex items-center gap-0.5 sm:gap-1 md:justify-center overflow-x-auto md:overflow-visible scrollbar-hide" aria-label="Categories">
          {categories.map((cat) => {
            const subs = activeSubs(cat);
            const hasSubs = subs.length > 0;
            const open = openId === cat.id;
            const active = isActive(cat.slug);
            return (
              <div key={cat.id} onMouseEnter={() => openMenu(cat.id)} className="relative shrink-0">
                <Link
                  href={`/categories/${cat.slug}`}
                  className={`group relative inline-flex items-center gap-1 px-3 sm:px-3.5 py-2.5 text-[13px] sm:text-sm font-semibold uppercase tracking-wide whitespace-nowrap transition-colors ${
                    active || open ? 'text-[#e01a1b]' : 'text-gray-700 hover:text-[#e01a1b]'
                  }`}
                >
                  {cat.name}
                  {hasSubs && <ChevronDown className={`hidden md:block w-3 h-3 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />}
                  {/* animated underline */}
                  <span className={`absolute inset-x-3 bottom-0 h-0.5 bg-[#e01a1b] origin-left transition-transform duration-300 ${active || open ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'}`} />
                </Link>

                {/* ── Subcategory dropdown (desktop) ── */}
                {open && hasSubs && (
                  <div
                    className="hidden md:block absolute top-full left-0 z-40 pt-1.5"
                    onMouseEnter={() => openMenu(cat.id)}
                    onMouseLeave={scheduleClose}
                    role="menu"
                  >
                    <div className="w-64 rounded-b-2xl border border-t-2 border-t-[#e01a1b] border-gray-100 bg-white shadow-[0_24px_48px_-8px_rgba(15,23,42,0.18)] overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200">
                      <div className="p-3 max-h-[24rem] overflow-y-auto scrollbar-hide">
                        <div className="flex items-center justify-between mb-2 px-1">
                          <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#e01a1b]">
                            <span className="h-px w-4 bg-[#e01a1b]" />{cat.name}
                          </span>
                          <Link href={`/categories/${cat.slug}`} className="text-[11px] font-semibold text-gray-400 hover:text-[#e01a1b]">View all</Link>
                        </div>
                        <div className="space-y-0.5">
                          {subs.map((sub) => (
                            <Link
                              key={sub.id}
                              href={`/products?category=${cat.slug}&subcategory=${sub.slug}`}
                              className="group flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-[#fff1f1] transition-colors"
                            >
                              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-gray-100 overflow-hidden ring-1 ring-black/5">
                                {sub.image ? <Image src={sub.image} alt="" width={32} height={32} className="h-full w-full object-cover" /> : <Package className="w-3.5 h-3.5 text-gray-400" />}
                              </span>
                              <span className="flex-1 min-w-0">
                                <span className="block text-[13px] text-gray-700 group-hover:text-[#e01a1b] transition-colors truncate">{sub.name}</span>
                                {sub.productCount != null && <span className="block text-[11px] text-gray-400">{sub.productCount} items</span>}
                              </span>
                              <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-[#e01a1b]" />
                            </Link>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          <Link
            href="/categories"
            onMouseEnter={scheduleClose}
            className="shrink-0 inline-flex items-center gap-1.5 ml-1 px-3 py-2.5 text-[13px] sm:text-sm font-semibold text-[#e01a1b] whitespace-nowrap hover:opacity-80 transition-opacity"
          >
            <LayoutGrid className="w-3.5 h-3.5" /> All Categories
          </Link>
        </nav>
      </div>
    </div>
  );
};

export default CategoryNav;
