'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ArrowRight, ArrowLeft, X } from 'lucide-react';
import { categoryService } from '@/services/categoryService';
import { publicProductService, PublicProduct } from '@/services/publicProductService';
import { getRegionalPrice, formatPrice } from '@/lib/currency';

interface SubCategory { id: string; name: string; slug: string; status?: string; image?: string }
interface Category { id: string; name: string; slug: string; status?: string; image?: string; productCount?: number; subcategoryCount?: number; subcategories?: SubCategory[] }

const PANEL_W = 880;                       // fixed mega-menu width (px) — identical for every category
const PANEL_H = 330;                        // fixed mega-menu height (px)
const MARGIN = 18;                          // min viewport margin
const MAX_SUBS = 10;                        // subcategories shown before "View all"
const productPrice = (p: PublicProduct) => formatPrice(getRegionalPrice({ basePrice: p.basePrice, adminFixedPrice: p.adminFixedPrice }));
const productImg = (p: PublicProduct) => p.images?.find((i) => i.isPrimary)?.url || p.images?.[0]?.url || '';

/**
 * COMPACT CATEGORY SPOTLIGHT — typography-driven primary nav (individually
 * separated nodes) plus a small floating spotlight panel anchored beneath the
 * active category: a hero category image, its subcategories in tidy columns,
 * and a lazy-loaded "Popular" strip (only when real products exist). One
 * reusable panel that repositions/crossfades as you move between categories;
 * mobile gets a two-level discovery layer. Fully dynamic; routing unchanged.
 */
/**
 * Fetched once per page load, not once per page VIEW.
 *
 * Every route renders its own <Header />, so this component remounts on each
 * navigation and used to refire the request every time - which is why the rail
 * kept emptying and refilling as you moved around the site. Held at module
 * scope, the second mount has the categories before it renders.
 *
 * A module-level binding rather than a ref or state: it has to outlive the
 * component, since the whole point is that the component is being destroyed
 * and rebuilt.
 */
let CATEGORY_CACHE: Category[] | null = null;

/**
 * Placeholder chip widths, in pixels. Uneven and fixed rather than random or
 * uniform: real category names are not the same length, and a row of
 * identical blocks reads as a broken component, while anything random would
 * differ between the server render and the client one.
 */
const SKELETON_CHIPS = [104, 148, 132, 96, 156, 116];

export default function CategoryRibbon() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeSlug = pathname?.startsWith('/products') ? searchParams.get('category') : null;

  const [mounted, setMounted] = useState(false);

  /**
   * Seeded from the module-level cache, so on every navigation after the
   * first the rail paints filled on its very first frame.
   *
   * Safe against hydration: the cache is empty in a fresh module, which is
   * what the server always has, so the prerendered HTML and the first client
   * render agree. It is only ever populated later, on the client, and by then
   * React is past hydration and simply rendering.
   */
  const [categories, setCategories] = useState<Category[]>(() => CATEGORY_CACHE ?? []);
  const [loadingCategories, setLoadingCategories] = useState(() => CATEGORY_CACHE === null);
  const [reduce, setReduce] = useState(false);
  const [active, setActive] = useState<number | null>(null);
  const [anchor, setAnchor] = useState<{ left: number; top: number } | null>(null);
  const [fadeL, setFadeL] = useState(false);
  const [fadeR, setFadeR] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileCat, setMobileCat] = useState<number | null>(null);
  const [prods, setProds] = useState<Record<string, PublicProduct[]>>({});

  const rootRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const activeElRef = useRef<HTMLElement | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const on = () => setReduce(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);

  useEffect(() => {
    // Already in hand from an earlier page — nothing to wait for.
    if (CATEGORY_CACHE) return;

    categoryService
      .getAllCategories({ status: 'ACTIVE', showRootOnly: 'true', includeSubcategories: 'true', sortBy: 'sortOrder', sortOrder: 'asc' })
      .then((res) => {
        if (res.success && res.data) {
          CATEGORY_CACHE = res.data as unknown as Category[];
          setCategories(CATEGORY_CACHE);
        }
      })
      .catch((e) => console.error('Failed to fetch categories:', e))
      // Whether it worked or not, stop showing a skeleton for something that
      // is no longer on its way.
      .finally(() => setLoadingCategories(false));
  }, []);

  const activeSubs = useCallback((cat?: Category) => (cat?.subcategories || []).filter((s) => !s.status || s.status === 'ACTIVE'), []);
  const catHref = (c: Category) => `/products?category=${c.slug}`;
  const subHref = (c: Category, s: SubCategory) => `/products?category=${c.slug}&subcategory=${s.slug}`;

  // Lazy per-category products for the "Popular" strip (cached).
  const loadProducts = useCallback((cat: Category) => {
    if (prods[cat.id]) return;
    publicProductService.getProducts({ category: cat.slug, limit: 3 })
      .then((r) => setProds((m) => ({ ...m, [cat.id]: r.success && r.data ? r.data.items : [] })))
      .catch(() => setProds((m) => ({ ...m, [cat.id]: [] })));
  }, [prods]);

  const openTo = useCallback((i: number, el: HTMLElement) => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    activeElRef.current = el;
    const r = el.getBoundingClientRect();
    setAnchor({ left: r.left, top: r.bottom });
    setActive(i);
    loadProducts(categories[i]);
  }, [categories, loadProducts]);
  const scheduleClose = useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setActive(null), 160);
  }, []);
  useEffect(() => () => { if (closeTimer.current) clearTimeout(closeTimer.current); }, []);

  /**
   * A string, not the searchParams object: Next hands back a new
   * ReadonlyURLSearchParams instance on most renders, so depending on it
   * directly would re-run this constantly.
   */
  const searchKey = searchParams?.toString() ?? '';

  /**
   * Close on any navigation.
   *
   * This used to watch `pathname` alone, which never changes when you move
   * between categories - /products?category=terry-towels and
   * /products?category=cotton-bags share the path, and only the query differs.
   * So the flyout stayed open across the click and sat on top of the page you
   * had just navigated to.
   */
  useEffect(() => { setActive(null); setMobileOpen(false); setMobileCat(null); }, [pathname, searchKey]);

  // Re-measure the anchor on resize so the panel stays under its node.
  useEffect(() => {
    if (active === null) return;
    const onResize = () => { const el = activeElRef.current; if (el) { const r = el.getBoundingClientRect(); setAnchor({ left: r.left, top: r.bottom }); } };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [active]);

  useEffect(() => {
    if (active === null && !mobileOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setActive(null); setMobileOpen(false); } };
    const onClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (rootRef.current && !rootRef.current.contains(t) && !(t instanceof Element && t.closest('[data-spotlight]'))) setActive(null);
    };
    window.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => { window.removeEventListener('keydown', onKey); document.removeEventListener('mousedown', onClick); };
  }, [active, mobileOpen]);

  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [mobileOpen]);

  const syncFades = useCallback(() => {
    const el = railRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setFadeL(el.scrollLeft > 4);
    setFadeR(el.scrollLeft < max - 4);
  }, []);
  useEffect(() => {
    syncFades();
    const el = railRef.current;
    if (!el) return;
    el.addEventListener('scroll', syncFades, { passive: true });
    window.addEventListener('resize', syncFades);
    return () => { el.removeEventListener('scroll', syncFades); window.removeEventListener('resize', syncFades); };
  }, [syncFades, categories]);

  const activeCategory = active !== null ? categories[active] : undefined;

  if (categories.length === 0) return null;

  const meta = (c: Category) => {
    const subN = c.subcategoryCount ?? activeSubs(c).length;
    const prodN = c.productCount ?? 0;
    const bits: string[] = [];
    if (subN > 0) bits.push(`${subN} collection${subN === 1 ? '' : 's'}`);
    if (prodN > 0) bits.push(`${prodN.toLocaleString('en-IN')} product${prodN === 1 ? '' : 's'}`);
    return bits.join(' · ');
  };

  const panelLeft = anchor ? Math.max(MARGIN, Math.min(anchor.left, (mounted ? window.innerWidth : 1440) - PANEL_W - MARGIN)) : MARGIN;
  const popular = activeCategory ? (prods[activeCategory.id] || []) : [];
  const subsAll = activeCategory ? activeSubs(activeCategory) : [];
  const subsShown = subsAll.slice(0, MAX_SUBS);
  const subsOverflow = subsAll.length > MAX_SUBS;

  return (
    <div ref={rootRef} className="relative border-b border-gray-100 bg-white/95 backdrop-blur-sm">
      <style>{`
        @keyframes m2cSubIn { from { opacity: 0; transform: translateY(6px) } to { opacity: 1; transform: translateY(0) } }
      `}</style>

      {/* ─────────── Desktop / tablet nav — individually separated nodes ─────────── */}
      <div className="mx-auto hidden h-[52px] max-w-7xl xl:max-w-420 items-center gap-3 px-3 sm:px-4 md:flex md:px-6 lg:px-8" onMouseLeave={scheduleClose}>
        <Link
          href="/categories"
          className="group inline-flex shrink-0 items-center gap-1.5 text-[11.5px] font-bold uppercase tracking-[0.26em] text-[#111] transition-colors hover:text-[#c41617] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#e01a1b]/40"
        >
          <span aria-hidden className="text-[#e01a1b] transition-transform duration-300 group-hover:scale-110">✦</span>
          Explore
        </Link>
        <span className="h-4 w-px shrink-0 bg-gray-300" aria-hidden="true" />

          <div className="relative min-w-0 flex-1">
            <nav ref={railRef} aria-label="Product categories" className="overflow-x-auto scrollbar-hide">
              <div ref={trackRef} className="relative flex w-max items-center">
                {/* Shown only on a cold start. It occupies the same 46px track
                    at the same rhythm as the real chips, so when the names
                    arrive they replace the bars in place rather than pushing
                    the rail into a different shape. */}
                {loadingCategories &&
                  SKELETON_CHIPS.map((w, i) => (
                    <div key={`sk-${i}`} className="shrink-0 px-4 py-2" aria-hidden>
                      <span
                        className="block h-[11px] animate-pulse rounded-full"
                        style={{ width: w, background: 'rgba(26,20,22,.09)', animationDelay: `${i * 90}ms` }}
                      />
                    </div>
                  ))}

                {categories.map((cat, i) => {
                  const isActive = active === i;
                  const dim = active !== null && !isActive;
                  return (
                    <div
                      key={cat.id}
                      ref={(el) => { itemRefs.current[i] = el; }}
                      className="shrink-0"
                      style={{ opacity: dim ? 0.68 : 1, transition: reduce ? undefined : 'opacity 220ms' }}
                      onMouseEnter={(e) => openTo(i, e.currentTarget)}
                    >
                      <Link
                        href={catHref(cat)}
                        // Every link inside the panel dismisses it; the chip
                        // that opens the panel never did. Waiting for the
                        // route effect leaves it up for a frame or two, and
                        // the pointer is still resting on the chip afterwards,
                        // so it has nothing to leave.
                        onClick={() => setActive(null)}
                        onFocus={(e) => openTo(i, e.currentTarget.parentElement as HTMLElement)}
                        aria-expanded={isActive}
                        className="block whitespace-nowrap px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.12em] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#e01a1b]/40"
                        style={{ color: INK }}
                      >
                        {cat.name}
                      </Link>
                    </div>
                  );
                })}

                {/* THE LABEL — a woven black tag with a red seam stitched along
                    its bottom edge, which is what this shop actually makes. It
                    rides above the rail and carries its own copy of every name,
                    clipped to its own bounds, so the text it covers is always
                    white and the text it leaves is always ink — no colour race
                    against the slide. Its two edges are timed apart, so it
                    pulls taut on the way across and snaps shut on arrival. */}
                <span
                  ref={pillRef}
                  aria-hidden
                  className="pointer-events-none absolute inset-y-0 z-20 overflow-hidden rounded-[11px]"
                  style={{ left: 0, right: 0, opacity: 0, background: LABEL_BG, boxShadow: '0 4px 14px -4px rgba(26,20,22,.55)' }}
                >
                  <span ref={pillInnerRef} className="absolute inset-y-0 flex w-max items-center" style={{ left: 0 }}>
                    {categories.map((cat) => (
                      <span key={cat.id} className="whitespace-nowrap px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-white">
                        {cat.name}
                      </span>
                    ))}
                  </span>
                  {/* A single hairline held inside the edge — the border a
                      woven tag gets from its own selvedge. Solid, not broken:
                      at this size a dashed rule reads as noise, not texture. */}
                  <span
                    aria-hidden
                    className="absolute inset-[4px] rounded-[7px]"
                    style={{ border: `1px solid ${LABEL_SEAM}`, opacity: 0.34 }}
                  />
                </span>
              </div>
            </nav>
            {/* Scroll fades now bleed into the groove, not the page. */}
            <span className={`pointer-events-none absolute inset-y-0 left-0 z-30 w-6 transition-opacity ${fadeL ? 'opacity-100' : 'opacity-0'}`} style={{ background: `linear-gradient(to right, ${GROOVE}, transparent)` }} aria-hidden="true" />
            <span className={`pointer-events-none absolute inset-y-0 right-0 z-30 w-8 transition-opacity ${fadeR ? 'opacity-100' : 'opacity-0'}`} style={{ background: `linear-gradient(to left, ${GROOVE}, transparent)` }} aria-hidden="true" />
          </div>
        </div>
      </div>

      {/* ─────────── Desktop fixed 3-column mega menu (portaled, anchored) ─────────── */}
      {mounted && activeCategory && anchor && createPortal(
        <div
          data-spotlight
          className={`fixed z-[60] hidden md:block ${reduce ? '' : 'animate-in fade-in slide-in-from-top-1 zoom-in-95 duration-200'}`}
          style={{ top: anchor.top + 6, left: panelLeft, width: PANEL_W, height: PANEL_H, transition: reduce ? undefined : 'left 300ms cubic-bezier(0.22,1,0.36,1)' }}
          onMouseEnter={() => { if (closeTimer.current) clearTimeout(closeTimer.current); }}
          onMouseLeave={scheduleClose}
        >
          <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-[0_28px_60px_-24px_rgba(15,23,42,0.3)]">
            {/* Header row */}
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-2.5">
              <div className="flex items-baseline gap-2.5">
                <h3 className="text-[13.5px] font-semibold uppercase tracking-[0.1em] text-[#111]">{activeCategory.name}</h3>
                {meta(activeCategory) && <span className="text-[10.5px] uppercase tracking-wide text-gray-400">{meta(activeCategory)}</span>}
              </div>
              <Link href={catHref(activeCategory)} onClick={() => setActive(null)} className="group inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#c41617]">
                Explore all <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
              </Link>
            </div>

            {/* Body — fixed 3 columns; content changes, dimensions never do */}
            <div key={activeCategory.id} className={`grid min-h-0 flex-1 grid-cols-[30%_37%_33%] ${reduce ? '' : 'animate-in fade-in duration-200'}`}>
              {/* LEFT — hero category image */}
              <Link href={catHref(activeCategory)} onClick={() => setActive(null)} className="group relative block overflow-hidden bg-gray-100">
                {activeCategory.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={activeCategory.image} alt={activeCategory.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                ) : (
                  <div className="flex h-full items-center justify-center bg-gradient-to-br from-[#efdcdc] to-[#f6e8e2] text-5xl font-semibold text-[#c41617]/50">{activeCategory.name.charAt(0)}</div>
                )}
                <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                <span className="absolute inset-x-4 bottom-4 text-white">
                  <span className="block text-[15px] font-semibold leading-tight drop-shadow">{activeCategory.name}</span>
                  <span className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-white/85">Explore collection <ArrowRight className="h-3 w-3" /></span>
                </span>
              </Link>

              {/* CENTER — subcategories */}
              <div className="flex min-h-0 flex-col overflow-hidden border-l border-gray-100 p-4">
                <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#c41617]">Subcategories</p>
                {subsAll.length > 0 ? (
                  <>
                    <div className="grid min-h-0 flex-1 grid-cols-2 gap-x-4 gap-y-1.5 content-start overflow-hidden">
                      {subsShown.map((s, si) => (
                        <Link
                          key={s.id}
                          href={subHref(activeCategory, s)}
                          onClick={() => setActive(null)}
                          className="group inline-flex items-center gap-2 py-0.5 text-[12.5px] text-gray-600 transition-colors hover:text-[#c41617]"
                          style={{ animation: reduce ? undefined : `m2cSubIn 240ms ease-out ${si * 20}ms both` }}
                        >
                          <span className="grid h-7 w-7 shrink-0 place-items-center overflow-hidden rounded-md bg-gray-100 ring-1 ring-black/5 transition-transform duration-300 group-hover:scale-105">
                            {s.image ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={s.image} alt="" loading="lazy" className="h-full w-full object-cover" />
                            ) : (
                              <span className="text-[10px] font-bold text-gray-400">{s.name.charAt(0)}</span>
                            )}
                          </span>
                          <span className="truncate">{s.name}</span>
                        </Link>
                      ))}
                    </div>
                    {subsOverflow && (
                      <Link href={catHref(activeCategory)} onClick={() => setActive(null)} className="mt-1.5 shrink-0 text-[11.5px] font-semibold text-[#c41617]">
                        View all {subsAll.length} subcategories →
                      </Link>
                    )}
                  </>
                ) : (
                  <p className="text-[13px] text-gray-400">Browse everything in {activeCategory.name}.</p>
                )}
              </div>

              {/* RIGHT — trending products */}
              <div className="flex min-h-0 flex-col overflow-hidden border-l border-gray-100 p-4">
                <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#c41617]">Trending</p>
                {popular.length > 0 ? (
                  <div className="space-y-2.5">
                    {popular.slice(0, 3).map((p) => (
                      <Link key={p.id} href={`/products/${p.slug || p.id}`} onClick={() => setActive(null)} className="group flex items-center gap-2.5">
                        <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-gray-100 ring-1 ring-black/5">
                          {productImg(p) && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={productImg(p)} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                          )}
                          {typeof p.discount === 'number' && p.discount > 0 && (
                            <span className="absolute left-0 top-0 rounded-br-md bg-[#e01a1b] px-1 text-[9px] font-bold leading-4 text-white">−{Math.round(p.discount)}%</span>
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[12.5px] text-gray-700 group-hover:text-[#111]">{p.name}</span>
                          <span className="flex items-center gap-2">
                            <span className="text-[12.5px] font-semibold text-[#c41617]">{productPrice(p)}</span>
                            {typeof p.rating === 'number' && p.rating > 0 && (
                              <span className="text-[11px] text-gray-400">{p.rating.toFixed(1)} <span className="text-[#e0a83d]">✦</span></span>
                            )}
                          </span>
                        </span>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-[12.5px] text-gray-400">Fresh picks coming soon.</p>
                )}
              </div>
            </div>
          </div>
        </div>,
        document.body,
      )}

      {/* ─────────── Mobile nav bar ─────────── */}
      <div className="flex h-[52px] items-center gap-3 px-3 sm:px-4 md:hidden">
        <button type="button" onClick={() => { setMobileOpen(true); setMobileCat(null); }} className="inline-flex shrink-0 items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-[#111]">
          <span aria-hidden className="text-[#e01a1b]">✦</span> Explore
        </button>
        <span className="h-4 w-px shrink-0 bg-gray-300" aria-hidden="true" />
        <div className="flex items-center overflow-x-auto scrollbar-hide">
          {categories.map((cat, i) => (
            <span key={cat.id} className="flex shrink-0 items-center">
              {i > 0 && <span aria-hidden className="mx-0.5 text-gray-300">·</span>}
              <Link href={catHref(cat)} className={`whitespace-nowrap px-2 py-1 text-[12px] font-semibold uppercase tracking-[0.06em] ${activeSlug === cat.slug ? 'text-[#c41617]' : 'text-[#e01a1b]'}`}>{cat.name}</Link>
            </span>
          ))}
        </div>
      </div>

      {/* ─────────── Mobile full-screen discovery layer ─────────── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[70] flex flex-col bg-white md:hidden">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            {mobileCat !== null ? (
              <button type="button" onClick={() => setMobileCat(null)} className="inline-flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.14em] text-gray-500"><ArrowLeft className="h-4 w-4" /> Categories</button>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-[0.2em] text-[#111]"><span className="text-[#e01a1b]">✦</span> Explore</span>
            )}
            <button type="button" onClick={() => setMobileOpen(false)} aria-label="Close" className="p-1 text-gray-400"><X className="h-5 w-5" /></button>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-4">
            {mobileCat === null ? (
              <ul className="divide-y divide-gray-100">
                {categories.map((cat, i) => {
                  const subs = activeSubs(cat);
                  return (
                    <li key={cat.id} className="flex items-center">
                      <span className="w-9 shrink-0 text-[12px] font-semibold tabular-nums text-gray-300">{String(i + 1).padStart(2, '0')}</span>
                      {subs.length > 0 ? (
                        <button type="button" onClick={() => { setMobileCat(i); loadProducts(cat); }} className="flex flex-1 items-center justify-between py-4 text-left">
                          <span className="text-[16px] font-semibold uppercase tracking-[0.06em] text-[#111]">{cat.name}</span>
                          <ArrowRight className="h-4 w-4 text-[#c41617]" />
                        </button>
                      ) : (
                        <Link href={catHref(cat)} className="flex-1 py-4 text-[16px] font-semibold uppercase tracking-[0.06em] text-[#111]">{cat.name}</Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div>
                {categories[mobileCat].image && (
                  <Link href={catHref(categories[mobileCat])} className="relative mb-4 block h-32 overflow-hidden rounded-2xl">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={categories[mobileCat].image} alt="" className="h-full w-full object-cover" />
                    <span className="absolute inset-0 bg-gradient-to-t from-black/65 to-transparent" />
                    <span className="absolute inset-x-4 bottom-3 text-white"><span className="block text-lg font-semibold">{categories[mobileCat].name}</span></span>
                  </Link>
                )}
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-400">Collections</p>
                <ul className="grid grid-cols-2 gap-x-6 gap-y-3">
                  {activeSubs(categories[mobileCat]).map((s) => (
                    <li key={s.id}><Link href={subHref(categories[mobileCat], s)} className="inline-flex items-center gap-1.5 text-[14px] text-gray-700"><span className="h-1 w-1 rounded-full bg-gray-300" />{s.name}</Link></li>
                  ))}
                </ul>
                {(prods[categories[mobileCat].id] || []).length > 0 && (
                  <>
                    <p className="mb-2 mt-5 text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-400">Trending</p>
                    <div className="space-y-2.5">
                      {(prods[categories[mobileCat].id] || []).slice(0, 3).map((p) => (
                        <Link key={p.id} href={`/products/${p.slug || p.id}`} className="flex items-center gap-3">
                          <span className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-gray-100 ring-1 ring-black/5">
                            {productImg(p) && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={productImg(p)} alt="" className="h-full w-full object-cover" />
                            )}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[13.5px] text-gray-800">{p.name}</span>
                            <span className="block text-[13px] font-semibold text-[#c41617]">{productPrice(p)}</span>
                          </span>
                        </Link>
                      ))}
                    </div>
                  </>
                )}
                <Link href={catHref(categories[mobileCat])} className="mt-5 inline-flex items-center gap-1.5 text-[13px] font-semibold uppercase tracking-[0.1em] text-[#c41617]">View all <ArrowRight className="h-4 w-4" /></Link>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
