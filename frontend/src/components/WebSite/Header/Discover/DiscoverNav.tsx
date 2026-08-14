'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect, useRef, useCallback, useMemo, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { Sparkles, ArrowRight, ArrowUpRight, X, Flame, Clock, Crown, Tag, Ticket, Layers } from 'lucide-react';
import { categoryService } from '@/services/categoryService';
import { offerService } from '@/services/offerService';
import { couponService } from '@/services/couponService';

interface SubCategory { id: string; name: string; slug: string; status?: string }
interface Category { id: string; name: string; slug: string; status?: string; image?: string; productCount?: number; subcategories?: SubCategory[] }

/** Categories shown as living panels in the canvas; the rest live behind "View all". */
const MAX_PANELS = 6;

type Mode = { key: string; label: string; desc: string; href: string; icon: typeof Flame; spark?: boolean; count?: number; countLabel?: string };

/**
 * A distinct, premium colour per discovery mode — gradient icon chip + soft count
 * pill + hover accent. Class strings are written in full (not interpolated) so
 * Tailwind's JIT can see and generate them.
 */
const MODE_THEME: Record<string, { grad: string; pill: string; hoverText: string; ring: string; glow: string }> = {
  trending:    { grad: 'from-orange-400 to-rose-500',   pill: 'bg-orange-50 text-orange-600',   hoverText: 'group-hover:text-orange-600',   ring: 'hover:ring-orange-200',   glow: 'group-hover:shadow-orange-200/50' },
  new:         { grad: 'from-sky-400 to-indigo-500',    pill: 'bg-sky-50 text-sky-600',         hoverText: 'group-hover:text-sky-600',      ring: 'hover:ring-sky-200',      glow: 'group-hover:shadow-sky-200/50' },
  best:        { grad: 'from-amber-400 to-orange-500',  pill: 'bg-amber-50 text-amber-600',     hoverText: 'group-hover:text-amber-600',    ring: 'hover:ring-amber-200',    glow: 'group-hover:shadow-amber-200/50' },
  offers:      { grad: 'from-rose-500 to-pink-600',     pill: 'bg-rose-50 text-rose-600',       hoverText: 'group-hover:text-rose-600',     ring: 'hover:ring-rose-200',     glow: 'group-hover:shadow-rose-200/50' },
  coupons:     { grad: 'from-emerald-400 to-teal-500',  pill: 'bg-emerald-50 text-emerald-600', hoverText: 'group-hover:text-emerald-600',  ring: 'hover:ring-emerald-200',  glow: 'group-hover:shadow-emerald-200/50' },
  collections: { grad: 'from-violet-500 to-purple-600', pill: 'bg-violet-50 text-violet-600',   hoverText: 'group-hover:text-violet-600',   ring: 'hover:ring-violet-200',   glow: 'group-hover:shadow-violet-200/50' },
};

/**
 * M2C DISCOVER — Living Category Canvas.
 *
 * A single discovery entry point (`DISCOVER ✦`) that opens a floating canvas
 * overlaying the hero (no layout shift): editorial shopping modes on the left,
 * and a "living category canvas" on the right where each admin category is a
 * textile material panel that expands on hover to reveal its image, product
 * count and subcategories. Fully driven by the existing category/offer/coupon
 * APIs; routing is unchanged. Mobile gets a dedicated full-height sheet.
 */
export default function DiscoverNav() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [offerCount, setOfferCount] = useState<number | null>(null);
  const [couponCount, setCouponCount] = useState<number | null>(null);
  const [hp, setHp] = useState<number | null>(null); // hovered category panel
  const [reduce, setReduce] = useState(false);
  const [top, setTop] = useState(0);
  const [metaLoaded, setMetaLoaded] = useState(false);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const on = () => setReduce(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);

  // Categories load up-front (cheap, powers the whole canvas).
  useEffect(() => {
    categoryService
      .getAllCategories({ status: 'ACTIVE', showRootOnly: 'true', includeSubcategories: 'true', sortBy: 'sortOrder', sortOrder: 'asc' })
      .then((res) => { if (res.success && res.data) setCategories(res.data as unknown as Category[]); })
      .catch((e) => console.error('Failed to fetch categories:', e));
  }, []);

  // Offer/coupon counts load lazily the first time Discover opens.
  const loadMeta = useCallback(() => {
    if (metaLoaded) return;
    setMetaLoaded(true);
    offerService.getActiveOffers().then((o) => setOfferCount(Array.isArray(o) ? o.length : 0)).catch(() => {});
    couponService.getPromotionalCoupons(50).then((c) => setCouponCount(Array.isArray(c) ? c.length : 0)).catch(() => {});
  }, [metaLoaded]);

  // Hover-intent open/close so the cursor can travel into the canvas.
  const doOpen = useCallback(() => { if (closeTimer.current) clearTimeout(closeTimer.current); loadMeta(); setOpen(true); }, [loadMeta]);
  const scheduleClose = useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpen(false), 180);
  }, []);
  useEffect(() => () => { if (closeTimer.current) clearTimeout(closeTimer.current); }, []);

  useEffect(() => { setOpen(false); }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  // Measure the header's bottom edge so the canvas hangs exactly beneath it.
  useLayoutEffect(() => {
    if (!open) return;
    const update = () => {
      const header = triggerRef.current?.closest('header');
      if (header) setTop(header.getBoundingClientRect().bottom);
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => { window.removeEventListener('resize', update); window.removeEventListener('scroll', update, true); };
  }, [open]);

  // Lock body scroll while the mobile sheet is open.
  useEffect(() => {
    if (!open) return;
    if (window.matchMedia('(min-width: 768px)').matches) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  const activeSubs = useCallback((cat?: Category) => (cat?.subcategories || []).filter((s) => !s.status || s.status === 'ACTIVE'), []);
  const catHref = (c: Category) => `/products?category=${c.slug}`;
  const subHref = (c: Category, s: SubCategory) => `/products?category=${c.slug}&subcategory=${s.slug}`;
  const panels = useMemo(() => categories.slice(0, MAX_PANELS), [categories]);

  const modes: Mode[] = useMemo(() => [
    { key: 'trending', label: 'Trending', desc: 'Recently popular', href: '/products?collection=top-selling', icon: Flame, spark: true },
    { key: 'new', label: 'New Arrivals', desc: 'Freshly added', href: '/products', icon: Clock },
    { key: 'best', label: 'Best Sellers', desc: 'Most purchased', href: '/products?collection=best-seller', icon: Crown },
    { key: 'offers', label: 'Offers', desc: 'Limited-time deals', href: '/offers', icon: Tag, count: offerCount ?? undefined, countLabel: 'active' },
    { key: 'coupons', label: 'Coupons', desc: 'Available savings', href: '/offers', icon: Ticket, count: couponCount ?? undefined, countLabel: 'available' },
    { key: 'collections', label: 'Collections', desc: 'Curated edits', href: '/categories', icon: Layers },
  ], [offerCount, couponCount]);

  // Expanding-panel flex weight: hovered grows, neighbours yield.
  const panelFlex = (i: number): number => {
    if (reduce) return 1;
    if (hp === null) return 1;
    return hp === i ? 3.2 : 0.72;
  };

  const trigger = (
    <button
      ref={triggerRef}
      type="button"
      onMouseEnter={doOpen}
      onFocus={doOpen}
      onClick={() => (open ? setOpen(false) : doOpen())}
      aria-expanded={open}
      aria-haspopup="true"
      aria-label="Discover — browse the marketplace"
      className={`group order-1 relative inline-flex items-center gap-1.5 rounded-full px-3 lg:px-4 py-2 text-sm font-semibold tracking-wide transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#e01a1b]/40 ${open ? 'text-[#c41617]' : 'text-gray-800 hover:text-[#c41617]'}`}
    >
      <Sparkles className={`w-4 h-4 text-[#e01a1b] transition-transform duration-500 ${reduce ? '' : 'group-hover:rotate-12 group-hover:scale-110'} ${open ? 'rotate-12 scale-110' : ''}`} />
      <span className="hidden md:inline uppercase tracking-[0.14em] text-[13px]">Discover</span>
      <span aria-hidden className={`hidden md:inline text-[#e01a1b] transition-opacity duration-500 ${reduce ? '' : 'motion-safe:animate-pulse'}`}>✦</span>
      <span className={`pointer-events-none absolute left-3 right-3 -bottom-0.5 h-px bg-[#c41617] transition-transform duration-300 origin-left ${open ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'}`} />
    </button>
  );

  // ── Editorial shopping-mode row (shared desktop/mobile markup) ──
  // Vertical cards: gradient icon on top, label + description below, and the count as
  // a pill pinned to the top-right corner so it never crowds the text.
  const renderModes = (onNavigate?: () => void) => (
    <div className="grid grid-cols-2 gap-2.5">
      {modes.map((m) => {
        const Icon = m.icon;
        const t = MODE_THEME[m.key] ?? MODE_THEME.trending;
        const hasCount = typeof m.count === 'number' && m.count > 0;
        return (
          <Link
            key={m.key}
            href={m.href}
            onClick={onNavigate}
            className={`group relative flex flex-col gap-1.5 rounded-2xl bg-white px-2.5 py-2 ring-1 ring-black/[0.06] shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md ${t.ring} ${t.glow}`}
          >
            {hasCount && (
              <span className={`absolute right-2 top-2 whitespace-nowrap rounded-full ${t.pill} px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide`}>
                {m.count} {m.countLabel}
              </span>
            )}
            <span className={`flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br ${t.grad} text-white shadow-sm transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3`}>
              <Icon className="h-4 w-4" />
            </span>
            <span className="min-w-0">
              <span className={`block text-[13px] font-bold text-gray-900 transition-colors ${t.hoverText}`}>{m.label}</span>
              <span className="block text-[11px] leading-tight text-gray-400">{m.desc}</span>
            </span>
          </Link>
        );
      })}
    </div>
  );

  // ── Desktop floating canvas ──
  const canvas = (
    <>
      {/* Soft scrim over the hero (not the header) */}
      <div
        className={`hidden md:block fixed inset-x-0 bottom-0 z-[55] bg-slate-900/15 ${reduce ? '' : 'animate-in fade-in duration-300'}`}
        style={{ top }}
        onClick={() => setOpen(false)}
      />
      <div
        className="hidden md:block fixed inset-x-0 z-[60]"
        style={{ top }}
        onMouseEnter={doOpen}
        onMouseLeave={scheduleClose}
      >
        <div className="max-w-7xl xl:max-w-420 mx-auto px-4 lg:px-8">
          <div className={`overflow-hidden rounded-b-[28px] bg-white ring-1 ring-black/5 shadow-[0_40px_80px_-28px_rgba(15,23,42,0.4)] ${reduce ? '' : 'animate-in fade-in slide-in-from-top-3 duration-300'}`}>
            <div className="grid grid-cols-[minmax(250px,1fr)_2.4fr]">
              {/* Left rail — discovery modes (soft tint so the colourful cards pop) */}
              <div className="border-r border-gray-100 p-5 bg-gradient-to-b from-slate-50/80 to-white">
                <p className="mb-3 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.24em] text-transparent bg-clip-text bg-gradient-to-r from-[#e01a1b] to-rose-400">
                  <Sparkles className="h-3 w-3 text-[#e01a1b]" /> Discover
                </p>
                {renderModes(() => setOpen(false))}
              </div>

              {/* Right — living category canvas */}
              <div className="p-5">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-gray-400">Categories</p>
                  <Link href="/categories" onClick={() => setOpen(false)} className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-400 hover:text-[#c41617] transition-colors">
                    View all <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>

                {panels.length === 0 ? (
                  <div className="flex h-[240px] items-center justify-center text-sm text-gray-400">Loading collections…</div>
                ) : (
                  <div className="flex h-[260px] gap-2" onMouseLeave={() => setHp(null)}>
                    {panels.map((cat, i) => {
                      const expanded = hp === i;
                      const subs = activeSubs(cat);
                      const count = cat.productCount ?? 0;
                      return (
                        <div
                          key={cat.id}
                          onMouseEnter={() => setHp(i)}
                          className="group relative h-full overflow-hidden rounded-2xl bg-gray-100"
                          style={{ flexGrow: panelFlex(i), flexBasis: 0, transition: reduce ? undefined : 'flex-grow 420ms cubic-bezier(0.22,1,0.36,1)' }}
                        >
                          {/* Material surface */}
                          {cat.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={cat.image}
                              alt=""
                              loading="lazy"
                              className={`absolute inset-0 h-full w-full object-cover transition-all duration-500 ${expanded ? 'scale-105 brightness-100' : 'scale-100 brightness-[0.82]'}`}
                            />
                          ) : (
                            <div className="absolute inset-0 bg-gradient-to-br from-[#e6cfcf] to-[#f1ded9]" />
                          )}
                          <div className={`absolute inset-0 transition-colors duration-500 ${expanded ? 'bg-gradient-to-t from-black/75 via-black/25 to-transparent' : 'bg-gradient-to-t from-black/70 to-black/10'}`} />

                          {/* Whole-panel category link (behind the interactive bits) */}
                          <Link href={catHref(cat)} onClick={() => setOpen(false)} aria-label={`${cat.name}${count ? `, ${count} products` : ''}`} className="absolute inset-0 z-0" />

                          {/* Collapsed label — vertical, editorial */}
                          {!expanded && (
                            <span
                              className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap text-[13px] font-semibold uppercase tracking-[0.16em] text-white drop-shadow"
                              style={{ writingMode: 'vertical-rl', transform: 'translateX(-50%) rotate(180deg)' }}
                            >
                              {cat.name}
                            </span>
                          )}

                          {/* Expanded content — emerges from within the panel */}
                          <div className={`pointer-events-none absolute inset-x-0 bottom-0 z-10 p-4 transition-all duration-500 ${expanded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`}>
                            <p className="text-lg font-semibold leading-tight text-white drop-shadow">{cat.name}</p>
                            {count > 0 && <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-white/70">{count} products</p>}
                            {subs.length > 0 && (
                              <div className="pointer-events-auto mb-3 flex flex-wrap gap-x-3 gap-y-1">
                                {subs.slice(0, 6).map((s) => (
                                  <Link
                                    key={s.id}
                                    href={subHref(cat, s)}
                                    onClick={() => setOpen(false)}
                                    className="text-[12px] text-white/80 hover:text-white transition-colors underline-offset-2 hover:underline"
                                  >
                                    {s.name}
                                  </Link>
                                ))}
                              </div>
                            )}
                            <Link
                              href={catHref(cat)}
                              onClick={() => setOpen(false)}
                              className="pointer-events-auto inline-flex items-center gap-1.5 text-[12px] font-semibold text-white"
                            >
                              View collection <ArrowUpRight className="h-3.5 w-3.5 text-[#ff8a8a]" />
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );

  // ── Mobile full-height discovery sheet ──
  const sheet = (
    <div className="md:hidden fixed inset-0 z-[70]">
      <div className={`absolute inset-0 bg-black/45 ${reduce ? '' : 'animate-in fade-in duration-200'}`} onClick={() => setOpen(false)} />
      <div className={`absolute inset-x-0 bottom-0 max-h-[90vh] flex flex-col rounded-t-3xl bg-white ${reduce ? '' : 'animate-in slide-in-from-bottom duration-300'}`}>
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-gray-100">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#111]">
            <Sparkles className="h-3.5 w-3.5 text-[#e01a1b]" /> Discover
          </p>
          <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="p-1 text-gray-400 hover:text-gray-700">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto p-4">
          {renderModes(() => setOpen(false))}
          <p className="mt-5 mb-2 px-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-gray-400">Categories</p>
          <div className="space-y-3">
            {panels.map((cat) => {
              const subs = activeSubs(cat);
              return (
                <div key={cat.id} className="overflow-hidden rounded-2xl ring-1 ring-gray-100">
                  <Link href={catHref(cat)} onClick={() => setOpen(false)} className="relative flex h-24 items-end p-3">
                    {cat.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={cat.image} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-[#e6cfcf] to-[#f1ded9]" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                    <span className="relative z-10">
                      <span className="block text-[15px] font-semibold text-white drop-shadow">{cat.name}</span>
                      {(cat.productCount ?? 0) > 0 && <span className="block text-[11px] text-white/75">{cat.productCount} products</span>}
                    </span>
                    <ArrowUpRight className="relative z-10 ml-auto h-5 w-5 text-white" />
                  </Link>
                  {subs.length > 0 && (
                    <div className="flex flex-wrap gap-2 p-3">
                      {subs.map((s) => (
                        <Link key={s.id} href={subHref(cat, s)} onClick={() => setOpen(false)} className="rounded-full bg-gray-50 ring-1 ring-gray-200 px-3 py-1 text-[12.5px] text-gray-600 active:bg-gray-100">
                          {s.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            <Link href="/categories" onClick={() => setOpen(false)} className="flex items-center justify-center gap-1.5 rounded-2xl border border-dashed border-gray-200 py-3 text-[13px] font-medium text-gray-500 active:bg-gray-50">
              View all categories <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {trigger}
      {mounted && open && createPortal(<>{canvas}{sheet}</>, document.body)}
    </>
  );
}
