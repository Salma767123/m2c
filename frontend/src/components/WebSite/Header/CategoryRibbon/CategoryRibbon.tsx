'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ArrowRight, ArrowLeft, X } from 'lucide-react';
import { categoryService } from '@/services/categoryService';
import { publicProductService, PublicProduct } from '@/services/publicProductService';
import { getRegionalPrice, formatPrice } from '@/lib/currency';

interface SubCategory { id: string; name: string; slug: string; status?: string; image?: string }
interface Category { id: string; name: string; slug: string; status?: string; image?: string; productCount?: number; subcategoryCount?: number; subcategories?: SubCategory[] }

const PANEL_W = 940;                        // fixed mega-menu width (px)
const PANEL_MIN_H = 300;                    // floor so short categories still look composed
const MARGIN = 18;                          // min viewport margin
const MAX_SUBS = 10;                        // subcategories shown before "View all"

// Brand ladder. Red earns its place instead of coating everything — and the
// neutrals are warmed off true black/white so the whole surface leans into the
// red rather than sitting beside it. The old ink was gray-900 (#111827), which
// is blue-toned; against a warm red that reads as a faint clash. Same "black"
// to the eye, now with the same undertone as the brand.
const INK = '#1a1416';                      // warm near-black — resting label
const MUTE = '#8c7f7d';                     // warm muted text (was blue-grey)
const RED = '#e01a1b';                      // active / accent — unchanged
const OXBLOOD = '#7a0f10';                  // deep accent — eyebrows, image wash
// Quiet marks (the index numbers). Terracotta sits off the brand ladder — a
// lower saturation at a slightly warmer hue — which is why it failed as the
// label fill. At 10px alongside body text it reads as a warm neutral instead
// of a competing red, so it stays here deliberately.
const CLAY = '#b8503c';
const BLUSH = '#fff1f1';                    // soft surface — trending strip
const GROOVE = '#f3efed';                   // recessed rail the label rides in

// The travelling label — a woven tag with a thread stitched through it, which
// is what this shop actually makes.
//
// Oxblood is hsl(359, 78%, 27%); brand red is hsl(360, 79%, 49%). Same hue,
// same saturation, only lightness apart — so it reads as the brand red in
// shadow rather than as a second, competing red. Terracotta failed here for
// exactly that reason: at 51% saturation against the logo's 79% it looked like
// faded red, not a deeper one.
//
// Cream seam, not red: on this ground red measures 2.3:1 and goes muddy, while
// cream is 11:1 — and an unbleached thread on a wine tag is the real article.
const LABEL_BG = '#7a0f10';
const LABEL_SEAM = 'rgba(255,241,233,.94)';
// Panel ground. Warm enough to agree with the red, far enough from it that the
// surface stays neutral — tinting this one at all turned the whole panel pink,
// because a 3% wash over 900px reads as colour, not as texture.
const BONE = '#fdfbfa';

const EASE = 'cubic-bezier(.22,1,.36,1)';
const productPrice = (p: PublicProduct) => formatPrice(getRegionalPrice({ basePrice: p.basePrice, adminFixedPrice: p.adminFixedPrice }));
const productImg = (p: PublicProduct) => p.images?.find((i) => i.isPrimary)?.url || p.images?.[0]?.url || '';

// useLayoutEffect warns during SSR; the component is client-rendered but its body
// still executes on the server pass.
const useIsoLayout = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/**
 * CATEGORY RIBBON — a typography-led primary nav carrying one travelling
 * indicator instead of ten independent hover states.
 *
 * The signature is the LABEL: an oxblood tag, hairlined inside its own edge,
 * that travels the rail. Its two edges are timed apart, so it pulls taut on the
 * way across and snaps shut on arrival rather than sliding as a rigid block.
 *
 * The mega panel unfolds from its top edge, morphs its height to the content,
 * and carries a faint woven crosshatch. Fully dynamic; routing unchanged.
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
  // Which subcategory the preview is showing. Tagged with its category so a
  // stale index can never survive a category change — that keeps it out of an
  // effect, which would only add a render pass.
  const [preview, setPreview] = useState<{ catId: string; idx: number } | null>(null);

  const rootRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLSpanElement>(null);
  const pillInnerRef = useRef<HTMLSpanElement>(null);
  const itemRefs = useRef<(HTMLElement | null)[]>([]);
  const activeElRef = useRef<HTMLElement | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevLeft = useRef(0);

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

  // Lazy per-category products for the "Trending" strip (cached).
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

  const routeIndex = activeSlug ? categories.findIndex((c) => c.slug === activeSlug) : -1;

  // Park the stitch on whatever is open, else on the current route, else retire
  // it in place. Driven straight onto the nodes rather than through state: the
  // indicator is pure decoration, and this keeps hovering off the render path.
  //
  // The trailing edge always leads. Moving right, the right edge sprints while
  // the left edge drags — the thread pulls taut, then snaps closed. Mirrored
  // going left. The pill runs the same trick on a gentler lag so the two layer.
  useEffect(() => {
    const pill = pillRef.current;
    const inner = pillInnerRef.current;
    const track = trackRef.current;
    if (!pill || !inner) return;

    const target = active !== null ? active : routeIndex;
    const el = target >= 0 ? itemRefs.current[target] : null;
    if (!el || !track) { pill.style.opacity = '0'; return; }

    const left = el.offsetLeft;
    const right = track.offsetWidth - (el.offsetLeft + el.offsetWidth);
    const goingRight = left >= prevLeft.current;
    prevLeft.current = left;

    // Lead edge sprints, trailing edge drags — that gap is the stretch.
    const LEAD = 250;
    const DRAG = 430;
    const leftMs = goingRight ? DRAG : LEAD;
    const rightMs = goingRight ? LEAD : DRAG;

    pill.style.transition = reduce ? 'opacity 160ms linear' : `left ${leftMs}ms ${EASE}, right ${rightMs}ms ${EASE}, opacity 200ms linear`;
    pill.style.left = `${left}px`;
    pill.style.right = `${right}px`;
    pill.style.opacity = '1';

    // The chip's copy of the labels has to stay pinned to track origin at every
    // frame, so it rides the exact same easing the chip's left edge does.
    // Anything else and the white text drifts inside the moving chip.
    inner.style.transition = reduce ? 'none' : `left ${leftMs}ms ${EASE}`;
    inner.style.left = `${-left}px`;
  }, [active, routeIndex, categories, reduce]);

  // Re-measure the panel anchor on resize so it stays under its node.
  useEffect(() => {
    if (active === null) return;
    const onResize = () => { const el = activeElRef.current; if (el) { const r = el.getBoundingClientRect(); setAnchor({ left: r.left, top: r.bottom }); } };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [active]);

  // Panel height follows its content. The body is absolutely positioned so its
  // own height never depends on the wrapper it is driving; the wrapper is sized
  // imperatively for the same reason the indicator is.
  const activeCategory = active !== null ? categories[active] : undefined;
  useIsoLayout(() => {
    const wrap = panelRef.current;
    const body = bodyRef.current;
    if (!wrap || !body) return;
    const apply = () => { wrap.style.height = `${Math.max(PANEL_MIN_H, body.offsetHeight)}px`; };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(body);
    return () => ro.disconnect();
  }, [activeCategory?.id, mounted, prods]);

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
  // Derived, never stored: a preview belonging to another category is simply
  // not shown, so switching categories resets it for free.
  const previewIdx = activeCategory && preview?.catId === activeCategory.id ? preview.idx : null;
  const previewSub = previewIdx !== null ? subsShown[previewIdx] : undefined;

  return (
    <div ref={rootRef} className="relative border-b border-gray-100 bg-white/95 backdrop-blur-sm">
      <style>{`
        @keyframes m2cSubIn { from { opacity: 0; transform: translateY(7px) } to { opacity: 1; transform: none } }
        @keyframes m2cUnfold { from { opacity: 0; transform: translateY(-8px) scaleY(.94) } to { opacity: 1; transform: none } }
        @keyframes m2cKen { from { transform: scale(1) } to { transform: scale(1.07) } }
        @keyframes m2cRowIn { from { opacity: 0; transform: translateX(-10px) } to { opacity: 1; transform: none } }
      `}</style>

      {/* ─────────── Desktop / tablet rail ─────────── */}
      <div className="mx-auto hidden h-[62px] max-w-7xl xl:max-w-420 items-center px-3 sm:px-4 md:flex md:px-6 lg:px-8" onMouseLeave={scheduleClose}>
        {/* Recessed track. Pressed INTO the bar, while the mega panel lifts OUT
            of it — two depths, so the two surfaces read as one system instead
            of two competing cards stacked on each other. */}
        <div
          className="flex h-[46px] w-full items-center gap-3 rounded-2xl pl-4 pr-2"
          style={{ background: GROOVE, boxShadow: 'inset 0 1px 2px rgba(26,20,22,.06), inset 0 0 0 1px rgba(26,20,22,.05)' }}
        >
          <Link
            href="/categories"
            className="group inline-flex shrink-0 items-center gap-1.5 text-[11.5px] font-bold uppercase tracking-[0.26em] transition-colors hover:text-[#e01a1b] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#e01a1b]/40"
            style={{ color: INK }}
          >
            <span aria-hidden style={{ color: RED }} className="inline-block transition-transform duration-500 group-hover:rotate-180">✦</span>
            Explore
          </Link>
          {/* Hairline, faded at both ends rather than a flat grey tick. */}
          <span aria-hidden className="h-5 w-px shrink-0" style={{ background: 'linear-gradient(to bottom, transparent, rgba(26,20,22,.18), transparent)' }} />

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

      {/* ─────────── Desktop mega panel (portaled, anchored, height-morphing) ─────────── */}
      {mounted && activeCategory && anchor && createPortal(
        <div
          ref={panelRef}
          data-spotlight
          className="fixed z-[60] hidden md:block"
          style={{
            top: anchor.top + 8,
            left: panelLeft,
            width: PANEL_W,
            transformOrigin: 'top center',
            animation: reduce ? undefined : `m2cUnfold 280ms ${EASE} both`,
            transition: reduce ? undefined : `left 320ms ${EASE}, height 300ms ${EASE}`,
          }}
          onMouseEnter={() => { if (closeTimer.current) clearTimeout(closeTimer.current); }}
          onMouseLeave={scheduleClose}
        >
          <div
            className="relative h-full overflow-hidden rounded-2xl shadow-[0_28px_64px_-26px_rgba(26,20,22,0.28)] ring-1 ring-[#1a1416]/[0.07]"
            style={{ backgroundColor: BONE }}
          >
            <div ref={bodyRef} className="absolute inset-x-0 top-0">
              {/* Header row */}
              <div className="flex items-center justify-between px-6 pb-3 pt-3.5">
                <div className="flex items-baseline gap-2.5">
                  <h3 className="text-[13.5px] font-semibold uppercase tracking-[0.12em]" style={{ color: INK }}>{activeCategory.name}</h3>
                  {meta(activeCategory) && <span className="text-[10.5px] uppercase tracking-wide" style={{ color: MUTE }}>{meta(activeCategory)}</span>}
                </div>
                <Link href={catHref(activeCategory)} onClick={() => setActive(null)} className="group inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: RED }}>
                  Explore all <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
              </div>

              {/* Body — an editorial index on the left driving one large preview
                  on the right. The seam from the rail continues here: the row
                  you are on runs a thread across into the image. */}
              <div key={activeCategory.id} className="grid grid-cols-[42%_58%] gap-0" style={{ minHeight: PANEL_MIN_H - 52 }}>
                {/* LEFT — numbered index */}
                <div className="flex flex-col px-6 pb-5" onMouseLeave={() => setPreview(null)}>
                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.2em]" style={{ color: OXBLOOD }}>Collections</p>
                  {subsAll.length > 0 ? (
                    <>
                      <div className="flex flex-col">
                        {subsShown.map((s, si) => {
                          const on = previewIdx === si;
                          return (
                            <Link
                              key={s.id}
                              href={subHref(activeCategory, s)}
                              onClick={() => setActive(null)}
                              onMouseEnter={() => setPreview({ catId: activeCategory.id, idx: si })}
                              onFocus={() => setPreview({ catId: activeCategory.id, idx: si })}
                              className="group flex items-center gap-3 py-[7px] focus:outline-none"
                              style={{ animation: reduce ? undefined : `m2cSubIn 300ms ${EASE} ${si * 35}ms both` }}
                            >
                              <span
                                className="w-6 shrink-0 text-[10.5px] font-semibold tabular-nums transition-colors duration-200"
                                style={{ color: on ? RED : CLAY }}
                              >
                                {String(si + 1).padStart(2, '0')}
                              </span>
                              <span
                                className="shrink-0 text-[15px] font-medium leading-none transition-all duration-300"
                                style={{ color: on ? RED : INK, transform: on ? 'translateX(3px)' : 'none' }}
                              >
                                {s.name}
                              </span>
                              {/* Drawn out of the name and aimed at the preview.
                                  Full width, because a rule that stops halfway
                                  connects nothing; solid and fading, because
                                  broken into dashes it reads as a dot leader. */}
                              <span
                                aria-hidden
                                className="ml-2.5 h-px min-w-0 flex-1 origin-left transition-transform duration-500"
                                style={{
                                  background: `linear-gradient(to right, ${RED}, ${RED}cc 30%, ${RED}00)`,
                                  transform: on ? 'scaleX(1)' : 'scaleX(0)',
                                  transitionTimingFunction: EASE,
                                }}
                              />
                            </Link>
                          );
                        })}
                      </div>
                      {subsOverflow && (
                        <Link href={catHref(activeCategory)} onClick={() => setActive(null)} className="mt-2 text-[11.5px] font-semibold" style={{ color: RED }}>
                          View all {subsAll.length} collections →
                        </Link>
                      )}
                    </>
                  ) : (
                    <p className="text-[13px]" style={{ color: MUTE }}>Browse everything in {activeCategory.name}.</p>
                  )}
                </div>

                {/* RIGHT — the preview. The category image is the floor; each
                    subcategory image is stacked above it and wipes in from the
                    direction the cursor travelled. No swap, no flash. */}
                <div className="relative mb-3 mr-3 overflow-hidden rounded-xl bg-gray-100">
                  <Link
                    href={previewSub ? subHref(activeCategory, previewSub) : catHref(activeCategory)}
                    onClick={() => setActive(null)}
                    className="group absolute inset-0 block"
                  >
                    {activeCategory.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={activeCategory.image}
                        alt={activeCategory.name}
                        className="absolute inset-0 h-full w-full object-cover"
                        style={{ animation: reduce ? undefined : 'm2cKen 9s ease-out both' }}
                      />
                    ) : (
                      <span className="absolute inset-0 grid place-items-center bg-gradient-to-br from-[#efdcdc] to-[#f6e8e2] text-6xl font-semibold text-[#c41617]/40">{activeCategory.name.charAt(0)}</span>
                    )}

                    {subsShown.map((s, si) => {
                      if (!s.image) return null;
                      const on = previewIdx === si;
                      // Retreats the way it came: rows below wipe up from the
                      // bottom, rows above wipe down from the top.
                      const parked = previewIdx === null || si > previewIdx ? 'inset(100% 0 0 0)' : 'inset(0 0 100% 0)';
                      return (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={s.id}
                          src={s.image}
                          alt=""
                          className="absolute inset-0 h-full w-full object-cover"
                          style={{
                            clipPath: on ? 'inset(0 0 0 0)' : parked,
                            transition: reduce ? 'none' : `clip-path 520ms ${EASE}`,
                          }}
                        />
                      );
                    })}

                    <span className="pointer-events-none absolute inset-0" style={{ background: `linear-gradient(to top, ${OXBLOOD}e6, ${OXBLOOD}2e 42%, transparent 72%)` }} />
                    <span className="absolute inset-x-5 bottom-4 text-white">
                      <span key={previewSub?.id || activeCategory.id} className="block text-[19px] font-semibold leading-tight drop-shadow" style={{ animation: reduce ? undefined : `m2cSubIn 320ms ${EASE} both` }}>
                        {previewSub ? previewSub.name : activeCategory.name}
                      </span>
                      <span className="mt-1 inline-flex items-center gap-1.5 text-[11.5px] uppercase tracking-[0.14em] text-white/90">
                        View collection <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
                      </span>
                    </span>
                  </Link>
                </div>
              </div>

              {/* Trending — a full-width strip that simply is not there when the
                  category has nothing to show, so no column sits empty. */}
              {popular.length > 0 && (
                <div className="mx-6 mb-4 flex items-center gap-5 rounded-xl px-4 py-3" style={{ background: BLUSH }}>
                  <p className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.2em]" style={{ color: OXBLOOD }}>Trending</p>
                  <div className="flex min-w-0 flex-1 items-center gap-5">
                    {popular.slice(0, 3).map((p, pi) => (
                      <Link
                        key={p.id}
                        href={`/products/${p.slug || p.id}`}
                        onClick={() => setActive(null)}
                        className="group flex min-w-0 flex-1 items-center gap-2.5"
                        style={{ animation: reduce ? undefined : `m2cSubIn 300ms ${EASE} ${140 + pi * 60}ms both` }}
                      >
                        <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-white ring-1 ring-black/5">
                          {productImg(p) && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={productImg(p)} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                          )}
                          {typeof p.discount === 'number' && p.discount > 0 && (
                            <span className="absolute left-0 top-0 rounded-br-md px-1 text-[9px] font-bold leading-4 text-white" style={{ background: RED }}>−{Math.round(p.discount)}%</span>
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[12.5px] transition-colors" style={{ color: INK }}>{p.name}</span>
                          <span className="flex items-center gap-2">
                            <span className="text-[12.5px] font-semibold" style={{ color: RED }}>{productPrice(p)}</span>
                            {typeof p.rating === 'number' && p.rating > 0 && (
                              <span className="text-[11px]" style={{ color: MUTE }}>{p.rating.toFixed(1)} <span className="text-[#e0a83d]">✦</span></span>
                            )}
                          </span>
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body,
      )}

      {/* ─────────── Mobile rail — same groove, same sewn label ─────────── */}
      <div className="flex h-[58px] items-center px-3 sm:px-4 md:hidden">
        <div
          className="flex h-[42px] w-full items-center gap-2.5 rounded-2xl pl-3 pr-1.5"
          style={{ background: GROOVE, boxShadow: 'inset 0 1px 2px rgba(26,20,22,.06), inset 0 0 0 1px rgba(26,20,22,.05)' }}
        >
          <button type="button" onClick={() => { setMobileOpen(true); setMobileCat(null); }} className="inline-flex shrink-0 items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.2em]" style={{ color: INK }}>
            <span aria-hidden style={{ color: RED }}>✦</span> Explore
          </button>
          <span aria-hidden className="h-5 w-px shrink-0" style={{ background: 'linear-gradient(to bottom, transparent, rgba(26,20,22,.18), transparent)' }} />
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
            {categories.map((cat) => {
              const isRoute = activeSlug === cat.slug;
              return (
                <Link
                  key={cat.id}
                  href={catHref(cat)}
                  className="relative whitespace-nowrap rounded-[10px] px-3.5 py-1.5 text-[12px] font-semibold uppercase tracking-[0.08em] transition-colors"
                  style={isRoute
                    ? { color: '#fff', background: LABEL_BG, boxShadow: '0 4px 14px -4px rgba(26,20,22,.55)' }
                    : { color: INK }}
                >
                  {cat.name}
                  {isRoute && (
                    <span
                      aria-hidden
                      className="absolute inset-[3px] rounded-[7px]"
                      style={{ border: `1px solid ${LABEL_SEAM}`, opacity: 0.34 }}
                    />
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* ─────────── Mobile full-screen discovery layer ─────────── */}
      {/* Portalled to <body>, exactly like the desktop panel above, and for the
          same reason. This component's own root carries backdrop-blur-sm, and a
          non-none backdrop-filter makes an element the containing block for its
          fixed-position descendants. Rendered in place, `fixed inset-0` resolved
          against that 58px ribbon strip instead of the viewport: the panel
          opened as a 58px-tall box showing its own header bar and nothing else,
          with all nine category rows present but squashed out of sight. */}
      {mounted && mobileOpen && createPortal(
        <div className="fixed inset-0 z-[70] flex flex-col bg-white md:hidden">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            {mobileCat !== null ? (
              <button type="button" onClick={() => setMobileCat(null)} className="inline-flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.14em]" style={{ color: MUTE }}><ArrowLeft className="h-4 w-4" /> Categories</button>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-[0.2em]" style={{ color: INK }}><span style={{ color: RED }}>✦</span> Explore</span>
            )}
            <button type="button" onClick={() => setMobileOpen(false)} aria-label="Close" className="p-1" style={{ color: MUTE }}><X className="h-5 w-5" /></button>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-4">
            {mobileCat === null ? (
              <ul className="divide-y divide-gray-100">
                {categories.map((cat, i) => {
                  const subs = activeSubs(cat);
                  return (
                    <li
                      key={cat.id}
                      className="flex items-center"
                      style={{ animation: reduce ? undefined : `m2cRowIn 320ms ${EASE} ${i * 40}ms both` }}
                    >
                      <span className="w-9 shrink-0 text-[12px] font-semibold tabular-nums" style={{ color: `${RED}66` }}>{String(i + 1).padStart(2, '0')}</span>
                      {subs.length > 0 ? (
                        <button type="button" onClick={() => { setMobileCat(i); loadProducts(cat); }} className="flex flex-1 items-center justify-between py-4 text-left">
                          <span className="text-[16px] font-semibold uppercase tracking-[0.06em]" style={{ color: INK }}>{cat.name}</span>
                          <ArrowRight className="h-4 w-4" style={{ color: RED }} />
                        </button>
                      ) : (
                        <Link href={catHref(cat)} className="flex-1 py-4 text-[16px] font-semibold uppercase tracking-[0.06em]" style={{ color: INK }}>{cat.name}</Link>
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
                    <span className="absolute inset-0" style={{ background: `linear-gradient(to top, ${OXBLOOD}d9, transparent)` }} />
                    <span className="absolute inset-x-4 bottom-3 text-white"><span className="block text-lg font-semibold">{categories[mobileCat].name}</span></span>
                  </Link>
                )}
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: OXBLOOD }}>Collections</p>
                <ul className="grid grid-cols-2 gap-x-6 gap-y-3">
                  {activeSubs(categories[mobileCat]).map((s, si) => (
                    <li key={s.id} style={{ animation: reduce ? undefined : `m2cSubIn 280ms ${EASE} ${si * 35}ms both` }}>
                      <Link href={subHref(categories[mobileCat], s)} className="inline-flex items-center gap-1.5 text-[14px] text-gray-700">
                        <span className="h-1 w-1 rounded-full" style={{ background: RED }} />{s.name}
                      </Link>
                    </li>
                  ))}
                </ul>
                {(prods[categories[mobileCat].id] || []).length > 0 && (
                  <>
                    <p className="mb-2 mt-5 text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: OXBLOOD }}>Trending</p>
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
                            <span className="block text-[13px] font-semibold" style={{ color: RED }}>{productPrice(p)}</span>
                          </span>
                        </Link>
                      ))}
                    </div>
                  </>
                )}
                <Link href={catHref(categories[mobileCat])} className="mt-5 inline-flex items-center gap-1.5 text-[13px] font-semibold uppercase tracking-[0.1em]" style={{ color: RED }}>View all <ArrowRight className="h-4 w-4" /></Link>
              </div>
            )}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
