'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { ArrowRight, X, LayoutGrid } from 'lucide-react';
import { categoryService } from '@/services/categoryService';

interface SubCategory { id: string; name: string; slug: string; status?: string; image?: string; productCount?: number }
interface Category { id: string; name: string; slug: string; status?: string; image?: string; productCount?: number; subcategories?: SubCategory[] }

/** How many categories ride in the slim editorial bar; the rest live in Explore. */
const PRIMARY_COUNT = 6;

/**
 * Magnetic Category Navigation — a slim, editorial category strip with a
 * proximity/"magnetic" hover (hovered item lifts + scales, neighbours ease
 * apart, a floating dynamic-image preview reveals), plus an "Explore" spatial
 * panel (categories → subcategories → large dynamic image) and a mobile
 * bottom-sheet explorer. All category/subcategory data + images + product
 * counts come from the existing admin-driven category API; routing is unchanged
 * (`/products?category=slug` and `&subcategory=slug`).
 */
const CategoryNav = () => {
  const pathname = usePathname();
  const [categories, setCategories] = useState<Category[]>([]);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [activeCat, setActiveCat] = useState(0);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [reduce, setReduce] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Hover intent: open instantly, close after a short grace period so the
  // cursor can travel from EXPLORE into the panel without it snapping shut.
  const openPanel = useCallback(() => { if (closeTimer.current) clearTimeout(closeTimer.current); setPanelOpen(true); }, []);
  const scheduleClose = useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setPanelOpen(false), 160);
  }, []);
  useEffect(() => () => { if (closeTimer.current) clearTimeout(closeTimer.current); }, []);

  // Respect the OS "reduce motion" setting — skip the magnetic transforms.
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const on = () => setReduce(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);

  useEffect(() => {
    categoryService
      .getAllCategories({ status: 'ACTIVE', showRootOnly: 'true', includeSubcategories: 'true', sortBy: 'sortOrder', sortOrder: 'asc' })
      .then((res) => { if (res.success && res.data) setCategories(res.data as unknown as Category[]); })
      .catch((e) => console.error('Failed to fetch categories:', e));
  }, []);

  // Close everything on route change.
  useEffect(() => { setPanelOpen(false); setSheetOpen(false); setHoverIdx(null); }, [pathname]);

  // Escape closes; outside-click closes the desktop panel.
  useEffect(() => {
    if (!panelOpen && !sheetOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setPanelOpen(false); setSheetOpen(false); } };
    const onClick = (e: MouseEvent) => { if (rootRef.current && !rootRef.current.contains(e.target as Node)) setPanelOpen(false); };
    window.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => { window.removeEventListener('keydown', onKey); document.removeEventListener('mousedown', onClick); };
  }, [panelOpen, sheetOpen]);

  // Lock body scroll while the mobile sheet is open.
  useEffect(() => {
    if (!sheetOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [sheetOpen]);

  const activeSubs = useCallback((cat?: Category) => (cat?.subcategories || []).filter((s) => !s.status || s.status === 'ACTIVE'), []);
  const catHref = (c: Category) => `/products?category=${c.slug}`;
  const subHref = (c: Category, s: SubCategory) => `/products?category=${c.slug}&subcategory=${s.slug}`;

  const primary = useMemo(() => categories.slice(0, PRIMARY_COUNT), [categories]);
  const hasMore = categories.length > PRIMARY_COUNT;

  // Magnetic transform for slim-bar item `i` given the hovered index.
  const magnet = (i: number): React.CSSProperties => {
    if (reduce || hoverIdx === null) return {};
    const d = i - hoverIdx;
    if (d === 0) return { transform: 'translateY(-3px) scale(1.06)' };
    const dir = d < 0 ? -1 : 1;
    const ad = Math.abs(d);
    const shift = ad === 1 ? 7 : ad === 2 ? 3.5 : 0;
    return shift ? { transform: `translateX(${dir * shift}px)` } : {};
  };

  // Small circular thumbnail (dynamic image, or a branded initial fallback).
  const Thumb = ({ cat, size }: { cat?: Category; size: number }) => (
    <span
      className="relative inline-flex items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-[#f4e3e3] to-[#f7d9d4] ring-1 ring-black/5 shrink-0"
      style={{ width: size, height: size }}
    >
      {cat?.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={cat.image} alt="" loading="lazy" className="w-full h-full object-cover" />
      ) : (
        <span className="text-[#c41617] font-semibold" style={{ fontSize: size * 0.4 }}>{cat?.name?.charAt(0) || 'M'}</span>
      )}
    </span>
  );

  if (categories.length === 0) return null;

  const activeCategory = categories[activeCat] || categories[0];

  return (
    <div ref={rootRef} className="relative bg-white border-b border-gray-100">
      {/* ───────────────────────── Desktop: slim editorial bar ───────────────────────── */}
      <div className="hidden md:block max-w-7xl xl:max-w-420 mx-auto px-4 lg:px-8" onMouseLeave={scheduleClose}>
        <nav className="h-12 flex items-center justify-center gap-6 lg:gap-8" aria-label="Product categories">
          {/* EXPLORE anchor */}
          <button
            type="button"
            onMouseEnter={openPanel}
            onFocus={openPanel}
            onClick={() => setPanelOpen((v) => !v)}
            aria-expanded={panelOpen}
            aria-haspopup="true"
            className="group relative inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#111] hover:text-[#c41617] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#e01a1b]/40 rounded"
          >
            <LayoutGrid className={`w-3.5 h-3.5 transition-transform duration-300 ${panelOpen ? 'text-[#c41617] rotate-90' : 'text-[#c41617]/70'}`} />
            Explore
            <span className={`absolute -bottom-1 left-0 h-px bg-[#c41617] transition-all duration-300 ${panelOpen ? 'w-full' : 'w-0 group-hover:w-full'}`} />
          </button>

          <span className="h-4 w-px bg-gray-200" aria-hidden="true" />

          {/* Magnetic category strip */}
          <ul className="flex items-center gap-5 lg:gap-7" onMouseLeave={() => setHoverIdx(null)}>
            {primary.map((cat, i) => {
              const count = cat.productCount ?? 0;
              return (
                <li key={cat.id} className="relative" style={{ transition: reduce ? undefined : 'transform 320ms cubic-bezier(0.22,1,0.36,1)', ...magnet(i) }}>
                  <Link
                    href={catHref(cat)}
                    onMouseEnter={() => setHoverIdx(i)}
                    onFocus={() => setHoverIdx(i)}
                    onBlur={() => setHoverIdx(null)}
                    aria-label={`${cat.name}${count ? `, ${count} products` : ''}`}
                    className="block whitespace-nowrap text-[13.5px] tracking-tight text-gray-700 hover:text-[#111] transition-colors focus:outline-none focus-visible:text-[#c41617]"
                  >
                    {cat.name}
                    <span className={`block h-px bg-[#c41617] transition-all duration-300 ${hoverIdx === i ? 'w-full' : 'w-0'}`} />
                  </Link>

                  {/* Floating dynamic preview cue */}
                  <div
                    className={`pointer-events-none absolute left-1/2 top-full z-50 mt-3 -translate-x-1/2 origin-top transition-all duration-300 ${hoverIdx === i ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-1 scale-95'}`}
                    aria-hidden="true"
                  >
                    <span className="flex items-center gap-3 rounded-2xl bg-white/95 backdrop-blur px-3.5 py-2.5 shadow-[0_18px_40px_-16px_rgba(15,23,42,0.35)] ring-1 ring-black/5 whitespace-nowrap">
                      <Thumb cat={cat} size={40} />
                      <span className="flex flex-col items-start leading-tight">
                        <span className="text-[13px] font-semibold text-[#111]">{cat.name}</span>
                        <span className="text-[11px] text-gray-400">{count > 0 ? `${count} product${count === 1 ? '' : 's'}` : 'Explore'}</span>
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-[#c41617]" />
                    </span>
                  </div>
                </li>
              );
            })}

            {hasMore && (
              <li>
                <button
                  type="button"
                  onClick={() => setPanelOpen(true)}
                  className="whitespace-nowrap text-[13px] italic text-gray-400 hover:text-[#c41617] transition-colors"
                >
                  +{categories.length - PRIMARY_COUNT} more
                </button>
              </li>
            )}
          </ul>
        </nav>
      </div>

      {/* ───────────────────────── Desktop: Explore spatial panel ───────────────────────── */}
      {panelOpen && (
        <div className="hidden md:block absolute inset-x-0 top-full z-50" onMouseEnter={openPanel} onMouseLeave={scheduleClose}>
          <div className="max-w-7xl xl:max-w-420 mx-auto px-4 lg:px-8">
            <div
              className={`mx-auto max-w-5xl overflow-hidden rounded-b-3xl bg-white ring-1 ring-black/5 shadow-[0_36px_70px_-24px_rgba(15,23,42,0.35)] ${reduce ? '' : 'animate-in fade-in slide-in-from-top-2 duration-300'}`}
            >
              <div className="grid grid-cols-[0.9fr_1.1fr_1.2fr]">
                {/* Col 1 — categories */}
                <div className="border-r border-gray-100 p-5">
                  <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-gray-400">Categories</p>
                  <ul className="space-y-0.5">
                    {categories.map((cat, i) => (
                      <li key={cat.id}>
                        <button
                          type="button"
                          onMouseEnter={() => setActiveCat(i)}
                          onFocus={() => setActiveCat(i)}
                          onClick={() => setActiveCat(i)}
                          className={`group flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-[13.5px] transition-colors ${i === activeCat ? 'bg-[#fbeaea] text-[#c41617] font-semibold' : 'text-gray-700 hover:bg-gray-50'}`}
                        >
                          <span className="truncate">{cat.name}</span>
                          <ArrowRight className={`w-3.5 h-3.5 shrink-0 transition-all ${i === activeCat ? 'opacity-100 translate-x-0 text-[#c41617]' : 'opacity-0 -translate-x-1 text-gray-300 group-hover:opacity-100 group-hover:translate-x-0'}`} />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Col 2 — subcategories of the active category */}
                <div className="border-r border-gray-100 p-5">
                  <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-gray-400">Sub-categories</p>
                  <div key={activeCategory?.id} className={reduce ? '' : 'animate-in fade-in slide-in-from-right-2 duration-300'}>
                    {activeSubs(activeCategory).length === 0 ? (
                      <p className="px-1 text-[13px] text-gray-400">No sub-categories yet.</p>
                    ) : (
                      <ul className="grid grid-cols-1 gap-0.5">
                        {activeSubs(activeCategory).map((s) => (
                          <li key={s.id}>
                            <Link
                              href={subHref(activeCategory, s)}
                              className="group flex items-center justify-between gap-2 rounded-lg px-3 py-1.5 text-[13.5px] text-gray-600 hover:bg-gray-50 hover:text-[#111] transition-colors"
                            >
                              <span className="truncate">{s.name}</span>
                              <ArrowRight className="w-3 h-3 text-gray-300 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                {/* Col 3 — large dynamic image + CTA */}
                <div className="relative p-5">
                  <div key={activeCategory?.id} className={`flex h-full flex-col ${reduce ? '' : 'animate-in fade-in duration-300'}`}>
                    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#f4e3e3] to-[#f7d9d4] aspect-[4/3]">
                      {activeCategory?.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={activeCategory.image} alt={activeCategory.name} loading="lazy" className="h-full w-full object-cover" />
                      ) : (
                        <span className="absolute inset-0 flex items-center justify-center text-5xl font-semibold text-[#c41617]/60">{activeCategory?.name?.charAt(0)}</span>
                      )}
                      <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 to-transparent" />
                      <div className="absolute bottom-3 left-4 right-4 text-white">
                        <p className="text-lg font-semibold leading-tight drop-shadow">{activeCategory?.name}</p>
                        {(activeCategory?.productCount ?? 0) > 0 && (
                          <p className="text-[12px] text-white/85">{activeCategory?.productCount} products</p>
                        )}
                      </div>
                    </div>
                    <Link
                      href={catHref(activeCategory)}
                      className="mt-4 inline-flex items-center justify-center gap-2 rounded-full bg-[#e01a1b] px-5 py-2.5 text-[13px] font-semibold text-white shadow-[0_10px_26px_-10px_rgba(224,26,27,0.7)] transition-all hover:bg-[#c41617] hover:gap-3"
                    >
                      Explore collection <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────── Mobile: compact trigger + chips ───────────────────────── */}
      <div className="md:hidden max-w-7xl mx-auto px-3 sm:px-4">
        <div className="flex items-center gap-3 h-12">
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className="inline-flex items-center gap-1.5 shrink-0 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#111]"
          >
            <LayoutGrid className="w-3.5 h-3.5 text-[#c41617]" />
            Explore
            <ArrowRight className="w-3.5 h-3.5 text-[#c41617]" />
          </button>
          <span className="h-4 w-px bg-gray-200" aria-hidden="true" />
          <div className="flex items-center gap-4 overflow-x-auto scrollbar-hide -mx-1 px-1">
            {primary.map((cat) => (
              <Link key={cat.id} href={catHref(cat)} className="whitespace-nowrap text-[13px] text-gray-600 hover:text-[#c41617]">
                {cat.name}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* ───────────────────────── Mobile: bottom-sheet explorer ───────────────────────── */}
      {sheetOpen && (
        <div className="md:hidden fixed inset-0 z-[70]">
          <div className={`absolute inset-0 bg-black/40 ${reduce ? '' : 'animate-in fade-in duration-200'}`} onClick={() => setSheetOpen(false)} />
          <div className={`absolute inset-x-0 bottom-0 max-h-[85vh] flex flex-col rounded-t-3xl bg-white ${reduce ? '' : 'animate-in slide-in-from-bottom duration-300'}`}>
            <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-gray-100">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#111]">Explore Categories</p>
              <button type="button" onClick={() => setSheetOpen(false)} aria-label="Close" className="p-1 text-gray-400 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto p-4 space-y-3">
              {categories.map((cat) => {
                const subs = activeSubs(cat);
                return (
                  <div key={cat.id} className="rounded-2xl ring-1 ring-gray-100 overflow-hidden">
                    <Link href={catHref(cat)} className="flex items-center gap-3 p-3 bg-gray-50/60 active:bg-gray-100">
                      <Thumb cat={cat} size={44} />
                      <span className="flex-1 min-w-0">
                        <span className="block text-[14px] font-semibold text-[#111] truncate">{cat.name}</span>
                        <span className="block text-[11px] text-gray-400">{(cat.productCount ?? 0) > 0 ? `${cat.productCount} products` : 'View all'}</span>
                      </span>
                      <ArrowRight className="w-4 h-4 text-[#c41617]" />
                    </Link>
                    {subs.length > 0 && (
                      <div className="flex flex-wrap gap-2 p-3">
                        {subs.map((s) => (
                          <Link key={s.id} href={subHref(cat, s)} className="rounded-full bg-white ring-1 ring-gray-200 px-3 py-1 text-[12.5px] text-gray-600 active:bg-gray-50">
                            {s.name}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoryNav;
