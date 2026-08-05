'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { categoryService } from '@/services/categoryService';
import { publicProductService } from '@/services/publicProductService';
import { offerService } from '@/services/offerService';

interface SubCategory { id: string; name: string; slug: string; status?: string; }
interface Category { id: string; name: string; slug: string; subcategories?: SubCategory[]; }
interface MiniProduct { id: string; name: string; slug?: string }
interface MiniOffer { id: string; title: string; badge?: string }

type OpenMenu = 'all' | 'textile' | null;

/**
 * Two-menu mega navigation (Printo-style layout, M2C theme):
 *   • "All"     — a wide panel of dynamic columns: Featured Products, Top Selling,
 *                 Best Seller, Offers, All Categories (product/offer data is lazy-
 *                 loaded on first open so it never taxes pages nobody opens it on).
 *   • "Textile" — every category with its sub-categories.
 * Hover-driven on desktop; the two items are plain links on mobile.
 */
const CategoryNav = () => {
  const pathname = usePathname();
  const [categories, setCategories] = useState<Category[]>([]);
  const [featured, setFeatured] = useState<MiniProduct[]>([]);
  const [topSelling, setTopSelling] = useState<MiniProduct[]>([]);
  const [bestSeller, setBestSeller] = useState<MiniProduct[]>([]);
  const [offers, setOffers] = useState<MiniOffer[]>([]);
  const [allLoaded, setAllLoaded] = useState(false);
  const [open, setOpen] = useState<OpenMenu>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Categories power both menus, so they load up-front (cheap).
  useEffect(() => {
    categoryService
      .getAllCategories({ status: 'ACTIVE', showRootOnly: 'true', includeSubcategories: 'true', sortBy: 'sortOrder', sortOrder: 'asc' })
      .then((res) => { if (res.success && res.data) setCategories(res.data as unknown as Category[]); })
      .catch((e) => console.error('Failed to fetch categories:', e));
  }, []);

  // Product rails + offers only load the first time the "All" panel opens.
  const loadAllData = useCallback(() => {
    if (allLoaded) return;
    setAllLoaded(true);
    const toMini = (r: { success: boolean; data?: { items?: MiniProduct[] } }) => (r.success && r.data?.items ? r.data.items : []);
    publicProductService.getFeaturedProducts(6).then((r) => setFeatured(toMini(r))).catch(() => {});
    publicProductService.getTopSellingProducts(6).then((r) => setTopSelling(toMini(r))).catch(() => {});
    publicProductService.getBestSellerProducts(6).then((r) => setBestSeller(toMini(r))).catch(() => {});
    offerService.getActiveOffers().then((o) => setOffers(Array.isArray(o) ? o.slice(0, 6) : [])).catch(() => {});
  }, [allLoaded]);

  useEffect(() => { setOpen(null); }, [pathname]);
  useEffect(() => () => { if (closeTimer.current) clearTimeout(closeTimer.current); }, []);

  const openTo = (m: OpenMenu) => { if (closeTimer.current) clearTimeout(closeTimer.current); if (m === 'all') loadAllData(); setOpen(m); };
  const scheduleClose = () => { if (closeTimer.current) clearTimeout(closeTimer.current); closeTimer.current = setTimeout(() => setOpen(null), 160); };

  const activeSubs = (cat: Category) => (cat.subcategories || []).filter((s) => !s.status || s.status === 'ACTIVE');
  const prodHref = (p: MiniProduct) => `/products/${p.slug || p.id}`;

  if (categories.length === 0) return null;

  // A single column: heading (optionally linked) + a list of dynamic links.
  const Column = ({ title, viewAllHref, links, empty }: { title: string; viewAllHref?: string; links: { key: string; label: string; href: string }[]; empty?: string }) => (
    <div className="min-w-0">
      <div className="flex items-center justify-between gap-2 mb-2.5 pb-2 border-b border-gray-100">
        {viewAllHref ? (
          <Link href={viewAllHref} className="text-[12px] font-bold uppercase tracking-[0.1em] text-[#e01a1b] hover:opacity-80">{title}</Link>
        ) : (
          <span className="text-[12px] font-bold uppercase tracking-[0.1em] text-[#e01a1b]">{title}</span>
        )}
      </div>
      <ul className="space-y-1">
        {links.length === 0 ? (
          <li className="text-[12px] text-gray-400">{empty || 'Nothing here yet'}</li>
        ) : links.map((l) => (
          <li key={l.key}>
            <Link href={l.href} className="group inline-flex items-center gap-1 text-[13px] text-gray-600 hover:text-[#e01a1b] transition-colors">
              <span className="truncate">{l.label}</span>
              <ChevronRight className="w-3 h-3 text-gray-300 -ml-0.5 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <div className="relative bg-white border-b border-gray-100 shadow-sm" onMouseLeave={scheduleClose}>
      <div className="max-w-7xl xl:max-w-420 mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
        <nav className="h-10 sm:h-11 flex items-center gap-1 md:justify-center" aria-label="Categories">
          {/* ── Menu 1: All ── */}
          <div onMouseEnter={() => openTo('all')} className="relative shrink-0">
            <Link
              href="/products"
              className={`group relative inline-flex items-center gap-1 px-3 sm:px-4 py-2.5 text-[13px] sm:text-sm font-semibold uppercase tracking-wide whitespace-nowrap transition-colors ${open === 'all' ? 'text-[#e01a1b]' : 'text-gray-700 hover:text-[#e01a1b]'}`}
            >
              All
              <ChevronDown className={`hidden md:block w-3 h-3 transition-transform duration-300 ${open === 'all' ? 'rotate-180' : ''}`} />
              <span className={`absolute inset-x-3 bottom-0 h-0.5 bg-[#e01a1b] origin-left transition-transform duration-300 ${open === 'all' ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'}`} />
            </Link>
          </div>

          {/* ── Menu 2: Textile ── */}
          <div onMouseEnter={() => openTo('textile')} className="relative shrink-0">
            <Link
              href="/categories"
              className={`group relative inline-flex items-center gap-1 px-3 sm:px-4 py-2.5 text-[13px] sm:text-sm font-semibold uppercase tracking-wide whitespace-nowrap transition-colors ${open === 'textile' ? 'text-[#e01a1b]' : 'text-gray-700 hover:text-[#e01a1b]'}`}
            >
              Textile
              <ChevronDown className={`hidden md:block w-3 h-3 transition-transform duration-300 ${open === 'textile' ? 'rotate-180' : ''}`} />
              <span className={`absolute inset-x-3 bottom-0 h-0.5 bg-[#e01a1b] origin-left transition-transform duration-300 ${open === 'textile' ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'}`} />
            </Link>
          </div>
        </nav>
      </div>

      {/* ── Mega-menu panel (desktop) — full container width, brand-topped ── */}
      {open && (
        <div
          className="hidden md:block absolute inset-x-0 top-full z-40"
          onMouseEnter={() => openTo(open)}
          onMouseLeave={scheduleClose}
        >
          <div className="max-w-7xl xl:max-w-420 mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
            {/* Card is capped narrower than the full nav container and centered,
                so the columns don't spread edge-to-edge on wide screens. */}
            <div className="max-w-6xl mx-auto rounded-b-2xl border border-t-2 border-t-[#e01a1b] border-gray-100 bg-white shadow-[0_28px_56px_-12px_rgba(15,23,42,0.22)] overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200">
              {open === 'all' ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-x-8 gap-y-6 p-6">
                  <Column
                    title="Featured Products"
                    viewAllHref="/products"
                    empty={allLoaded ? 'No featured products' : 'Loading…'}
                    links={featured.map((p) => ({ key: p.id, label: p.name, href: prodHref(p) }))}
                  />
                  <Column
                    title="Top Selling"
                    viewAllHref="/products"
                    empty={allLoaded ? 'No top sellers' : 'Loading…'}
                    links={topSelling.map((p) => ({ key: p.id, label: p.name, href: prodHref(p) }))}
                  />
                  <Column
                    title="Best Seller"
                    viewAllHref="/products"
                    empty={allLoaded ? 'No best sellers' : 'Loading…'}
                    links={bestSeller.map((p) => ({ key: p.id, label: p.name, href: prodHref(p) }))}
                  />
                  <Column
                    title="Offers"
                    empty={allLoaded ? 'No live offers' : 'Loading…'}
                    links={offers.map((o) => ({ key: o.id, label: o.title, href: '/products' }))}
                  />
                  <Column
                    title="All Categories"
                    viewAllHref="/categories"
                    links={categories.map((c) => ({ key: c.id, label: c.name, href: `/products?category=${c.slug}` }))}
                  />
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-8 gap-y-6 p-6">
                  {categories.map((cat) => (
                    <Column
                      key={cat.id}
                      title={cat.name}
                      viewAllHref={`/categories/${cat.slug}`}
                      empty="No sub-categories"
                      links={activeSubs(cat).map((s) => ({ key: s.id, label: s.name, href: `/products?category=${cat.slug}&subcategory=${s.slug}` }))}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoryNav;
