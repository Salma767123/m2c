'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import ProductCard from '@/components/WebSite/ProductCard/ProductCard';
import { CTA_PILL, CTA_PILL_ICON, RAIL_BUTTON } from '@/components/WebSite/Shared/ctaPill';
import { publicProductService, PublicProduct } from '@/services/publicProductService';

/**
 * Top Selling — masthead beside the rail, not above it.
 *
 * Every other section on the home page puts its heading above its products.
 * This one puts it in a column on the left and lets the rail run off the right
 * edge of the screen — a difference you can see from across the room, with no
 * device that starts to feel like a gimmick. (The ranked numerals did: 01 02 03
 * sat above the cards doing nothing but labelling them, and the layout would
 * have been identical without them.)
 *
 * TWO THINGS MAKE THE MASTHEAD READ FIRST, because a text column cannot win a
 * fight for attention against five large colour photographs on mass alone:
 *
 *  1. It arrives first. The eyebrow, heading, copy and buttons land in sequence
 *     over ~400ms, and the cards only begin dealing in at 520ms. By the time
 *     the products move, the reader has already been given the heading. Order
 *     of arrival is the one currency a small element can outbid a large one in.
 *
 *  2. It is simply bigger — a 25rem column at up to 3.2rem of type, with the
 *     copy darkened from the standard grey and the buttons at full size.
 *
 * The rail also advances by itself now rather than waiting to be dragged, so a
 * reader who never touches it still sees that the row moves. It pauses the
 * moment anyone hovers, focuses or touches it — an auto-advancing row under a
 * cursor reaching for Add to Cart would be worse than a static one.
 *
 * Fixed here as well, all inherited from the old copy of Featured: fixed-width
 * cards leaving a dead gap in the row; a skeleton on a stretching grid against
 * a fixed-width loaded state, so cards snapped on arrival; <Reveal> and its
 * 1.4s timer fail-safe; the dot-grid SectionBackdrop shared with Best Sellers;
 * and ragged card bottoms, where a two-line product name pushed that card's Add
 * to Cart out of line with the rest.
 *
 * ⚠️ The endpoint behind this is getProductsByTag('Top Selling'). Nothing counts
 * sales — it is a tag someone ticks in the admin, as is 'Best Seller', so the
 * same product can legitimately appear in both rows and the subtitle's "proven
 * by sales and reviews" is not something the data can support.
 */

/** Asked for, not guaranteed — the tag decides how many come back. */
const RAIL_COUNT = 10;

/** Entrance sequence. The gap between the masthead finishing and the cards
 *  starting is the whole point: read the heading, then watch the row. */
const LEAD_STEPS = ['0ms', '90ms', '190ms', '290ms', '380ms'];
const CARDS_BEGIN_MS = 520;
const CARD_STAGGER_MS = 85;
const CARD_MS = 620;

/** How often the rail advances on its own, and how long any human touch stops
 *  it for afterwards. */
const AUTO_MS = 3400;
const HOLD_OFF_MS = 7000;


const REVEAL_THRESHOLD = 0.2;
const REVEAL_MARGIN = '0px 0px -10% 0px';

/**
 * Aligns the masthead's left edge with the page container's content start.
 *
 * The row is full-bleed so the rail can reach the viewport edge, which means it
 * cannot inherit the usual `mx-auto max-w-420 px-8`. This reproduces that
 * container's inner edge: half the leftover width, plus the gutter.
 *
 * In rem, not px — globals.css sets html to 91%, so max-w-420 is 105rem, and a
 * px literal would drift from every other section. And 100% rather than 100vw,
 * because vw includes the vertical scrollbar and would push the row right by
 * its width.
 */
const MASTHEAD_INSET = 'lg:pl-[max(2rem,calc((100%-105rem)/2+2rem))]';

export default function TopSelling() {
  const [products, setProducts] = useState<PublicProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(true);

  const railRef = useRef<HTMLDivElement | null>(null);
  const rowRef = useRef<HTMLDivElement | null>(null);
  /** Timestamp until which the rail must not advance itself. */
  const holdUntil = useRef(0);
  /* Refs, not state: nothing renders from either, so making them state would
     re-render the whole rail on every hover and every scroll in and out of
     view, to change a boolean the interval reads once every 3.4s. */
  const inViewRef = useRef(false);
  const hoverRef = useRef(false);
  const hintRef = useRef<HTMLParagraphElement | null>(null);

  useEffect(() => {
    const fetchTopSellingProducts = async () => {
      setIsLoading(true);
      try {
        const response = await publicProductService.getTopSellingProducts(RAIL_COUNT);
        if (response.success && response.data) {
          setProducts(response.data.items);
        }
      } catch (error) {
        console.error('Error fetching top selling products:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTopSellingProducts();
  }, []);

  // Which arrows are live. The listener is on the RAIL element, which fires its
  // own scroll events — the body-scroller trap that breaks window-level scroll
  // listeners on this site does not apply to an element's own overflow.
  const syncArrows = useCallback(() => {
    const el = railRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setAtStart(el.scrollLeft <= 2);
    setAtEnd(max <= 2 || el.scrollLeft >= max - 2);
  }, []);

  useEffect(() => {
    const el = railRef.current;
    if (!el) return;
    syncArrows();
    el.addEventListener('scroll', syncArrows, { passive: true });
    window.addEventListener('resize', syncArrows);
    return () => {
      el.removeEventListener('scroll', syncArrows);
      window.removeEventListener('resize', syncArrows);
    };
  }, [products.length, syncArrows]);

  // Watches the row. Fires the entrance once, and keeps inViewRef live so the
  // rail is not advancing itself while the section is off screen.
  useEffect(() => {
    const el = rowRef.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      el.classList.add('is-in');
      inViewRef.current = true;
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          inViewRef.current = entry.isIntersecting;
          if (entry.isIntersecting) el.classList.add('is-in');
        }
      },
      { threshold: REVEAL_THRESHOLD, rootMargin: REVEAL_MARGIN },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [products.length]);

  /** One card plus one gutter — read off the DOM so it stays correct across
   *  breakpoints without duplicating the widths here. */
  const step = () => {
    const el = railRef.current;
    if (!el) return 0;
    const item = el.firstElementChild as HTMLElement | null;
    const gap = parseFloat(getComputedStyle(el).columnGap) || 0;
    return item ? item.offsetWidth + gap : el.clientWidth * 0.3;
  };

  const holdOff = () => {
    holdUntil.current = Date.now() + HOLD_OFF_MS;
    // Called from every genuine interaction — pointer, wheel, arrow — and from
    // nothing the rail does on its own, which makes it exactly the right hook
    // for retiring the swipe hint.
    hintRef.current?.classList.add('is-done');
  };

  const page = (dir: 1 | -1) => {
    holdOff();
    railRef.current?.scrollBy({ left: dir * step() * 2, behavior: 'smooth' });
  };

  // Auto-advance. Stops for hover, for focus inside the rail, for anything the
  // reader does to it, while off screen, and for reduced-motion entirely.
  useEffect(() => {
    if (products.length === 0) return;
    if (typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const id = window.setInterval(() => {
      const el = railRef.current;
      if (!el) return;
      // Every reason to stand still, checked on the tick rather than by
      // tearing the interval down and rebuilding it on each hover.
      if (!inViewRef.current || hoverRef.current || Date.now() < holdUntil.current) return;
      const max = el.scrollWidth - el.clientWidth;
      if (max <= 2) return; // everything already fits; nothing to advance
      if (el.scrollLeft >= max - 4) el.scrollTo({ left: 0, behavior: 'smooth' });
      else el.scrollBy({ left: step(), behavior: 'smooth' });
    }, AUTO_MS);

    return () => window.clearInterval(id);
  }, [products.length]);

  if (isLoading) {
    return (
      <section className="bg-white py-8 font-sans sm:py-10 lg:py-14">
        <div className={`grid gap-7 px-4 sm:px-6 lg:grid-cols-[21rem_minmax(0,1fr)] lg:items-center lg:gap-5 lg:px-0 xl:grid-cols-[23rem_minmax(0,1fr)] ${MASTHEAD_INSET}`}>
          <div className="min-w-0">
            <div className="h-3 w-28 animate-pulse rounded bg-gray-200" />
            <div className="mt-4 h-12 w-full max-w-sm animate-pulse rounded bg-gray-200" />
            <div className="mt-3 h-4 w-full max-w-xs animate-pulse rounded bg-gray-100" />
            <div className="mt-7 h-12 w-48 animate-pulse rounded-full bg-gray-200" />
          </div>
          <div className="min-w-0 bg-[#f7f2ed] lg:rounded-l-[34px]">
            <div className="flex gap-4 overflow-hidden px-4 py-6 sm:gap-5 sm:px-6 lg:py-8 lg:pl-12">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="w-[240px] shrink-0 sm:w-[258px]">
                  <div className="overflow-hidden rounded-[16px] bg-white ring-1 ring-[#e3d7c9]">
                    <div className="aspect-[5/4] w-full animate-pulse bg-[#efe6db]" />
                    <div className="space-y-3 p-3.5 sm:p-4">
                      <div className="h-4 w-3/4 animate-pulse rounded bg-[#e6dacc]" />
                      <div className="h-6 w-1/2 animate-pulse rounded bg-[#e6dacc]" />
                      <div className="h-10 w-full animate-pulse rounded-lg bg-[#f0e8de]" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (products.length === 0) {
    return null; // Don't show section if no products
  }

  return (
    <section className="bg-white py-8 font-sans sm:py-10 lg:py-14">
      <style>{`
        @keyframes m2cLeadIn {
          from { opacity: 0; transform: translateY(16px) }
          to   { opacity: 1; transform: none }
        }
        @keyframes m2cRailIn {
          from { opacity: 0; transform: translateX(38px) }
          to   { opacity: 1; transform: none }
        }

        .m2c-lead > *, .m2c-rail > * { opacity: 0 }

        .is-in .m2c-lead > * {
          animation: m2cLeadIn 560ms cubic-bezier(0.22,1,0.36,1) var(--d, 0ms) both;
        }
        .is-in .m2c-rail > * {
          animation: m2cRailIn ${CARD_MS}ms cubic-bezier(0.22,1,0.36,1) var(--d, 0ms) both;
        }


        /* A short nudge in the direction of travel, with a long pause between —
           a continuously moving arrow reads as a loading state. */
        @keyframes m2cNudge {
          0%, 62%, 100% { transform: translateX(0) }
          78%           { transform: translateX(5px) }
        }
        .m2c-nudge { animation: m2cNudge 2.6s ease-in-out infinite }
        .m2c-hint.is-done { opacity: 0; pointer-events: none }

        @media (prefers-reduced-motion: reduce) {
          .m2c-lead > *, .m2c-rail > *,
          .is-in .m2c-lead > *, .is-in .m2c-rail > * {
            opacity: 1; transform: none; animation: none;
          }
          .m2c-nudge { animation: none }
          .m2c-hint { transition: none }
        }
      `}</style>

      {/* Full-bleed row: no mx-auto max-w wrapper, because the rail has to be
          able to reach the viewport edge. The masthead is inset instead. */}
      {/* Grid, not flex, and deliberately so.
          As a flex row this was `w-full shrink-0` on the masthead against
          `flex-1` on the rail — which means the instant the masthead's lg:w
          override does not land, it claims the entire row, the rail is left
          with 0px, and the strip and every card vanish. A grid track cannot do
          that: if the two-column rule is ever missing the layout simply falls
          back to one column and the products end up beneath the heading.
          Wrong-looking beats invisible. */}
      <div
        ref={rowRef}
        className={`grid gap-7 lg:grid-cols-[21rem_minmax(0,1fr)] lg:items-center lg:gap-5 xl:grid-cols-[23rem_minmax(0,1fr)] ${MASTHEAD_INSET}`}
      >
        {/* ── Masthead ─────────────────────────────────────────────────── */}
        <div className="m2c-lead min-w-0 px-4 sm:px-6 lg:px-0">
          <span
            className="inline-flex items-center gap-2.5 text-[11.5px] font-bold uppercase tracking-[0.2em] text-[#c41617] sm:text-xs"
            style={{ '--d': LEAD_STEPS[0] } as React.CSSProperties}
          >
            <span aria-hidden className="h-px w-7 bg-[#c41617]" />
            Trending Now
          </span>

          <h2
            className="font-playfair mt-4 text-[2.1rem] font-semibold leading-[1.06] tracking-tight text-[#1a1416] sm:text-[2.5rem] lg:text-[2.7rem] xl:text-[3.1rem]"
            style={{ '--d': LEAD_STEPS[1] } as React.CSSProperties}
          >
            Top Selling Products
          </h2>

          {/* Darker than the site's usual grey-500. Against five colour
              photographs, body copy at 4:1 simply disappears. */}
          <p
            className="mt-4 max-w-md text-[15px] leading-relaxed text-[#4a413d] sm:text-[16.5px] lg:max-w-none"
            style={{ '--d': LEAD_STEPS[2] } as React.CSSProperties}
          >
            Most popular items loved by our customers, proven by sales and reviews
          </p>

          <div
            className="mt-7 flex flex-wrap items-center gap-3"
            style={{ '--d': LEAD_STEPS[3] } as React.CSSProperties}
          >
            {/* The standard pill, same as Featured and Best Sellers. Several
                alternatives were tried here — a hang tag, an ink sweep, a woven
                fill, a hairline-and-arrow — and none landed, so this stays as
                it is until we come back to buttons properly. */}
            <Link
              href="/products?collection=top-selling"
              className={CTA_PILL}
            >
              View All Products
              <ArrowRight className={CTA_PILL_ICON} />
            </Link>

            {/* On touch as well as desktop. These were desktop-only at first,
                on the reasoning that swiping is the control on a phone — but a
                rail with no arrows just reads as a static two-card row unless
                someone happens to try dragging it, and the arrows are the only
                thing announcing that there is more. 44px targets, which is the
                minimum a thumb needs. */}
            <div className="flex items-center gap-2">
              <RailButton dir={-1} disabled={atStart} onClick={() => page(-1)} />
              <RailButton dir={1} disabled={atEnd} onClick={() => page(1)} />
            </div>
          </div>

          {/* Touch only. On a phone the rail reads as a static two-card row
              unless something says otherwise; on desktop the cursor, the hover
              states and the visible arrows already say it, so the line would
              just be an instruction nobody needs.

              It retires the moment the reader does anything to the rail —
              telling someone to swipe after they have swiped is noise. Not on
              the auto-advance though: that is the rail moving itself, not the
              reader learning anything. */}
          <p
            ref={hintRef}
            className="m2c-hint mt-4 flex items-center gap-1.5 text-[12.5px] font-medium text-[#7a6d66] transition-opacity duration-500 lg:hidden"
            style={{ '--d': LEAD_STEPS[4] } as React.CSSProperties}
          >
            Swipe to see more
            <ArrowRight aria-hidden className="m2c-nudge h-3.5 w-3.5" />
          </p>
        </div>

        {/* ── The rail ─────────────────────────────────────────────────────
            Rounded where it meets the masthead, square where it leaves the
            screen, so the surface itself shows which way the row runs. */}
        <div
          className="relative min-w-0 bg-[#f7f2ed] lg:rounded-l-[34px]"
          onMouseEnter={() => { hoverRef.current = true; }}
          onMouseLeave={() => { hoverRef.current = false; }}
          onFocusCapture={() => { hoverRef.current = true; }}
          onBlurCapture={() => { hoverRef.current = false; }}
          onPointerDown={holdOff}
          onWheel={holdOff}
        >
          {/* scroll-pl-* is the fix for the first card being sliced by the
              strip's rounded corner. scroll-snap-align:start aligns an item to
              the SCROLLPORT's start edge, and scroll-padding defaults to 0 — so
              snapping ignored the rail's own pl-12 and parked every card hard
              against the strip's left edge. Matching scroll-padding to the
              padding puts the resting position back inside it. */}
          <div
            ref={railRef}
            className="m2c-rail scrollbar-hide flex snap-x snap-mandatory scroll-pl-4 scroll-smooth gap-4 overflow-x-auto px-4 py-6 sm:gap-5 sm:scroll-pl-6 sm:px-6 lg:scroll-pl-12 lg:py-8 lg:pl-12 lg:pr-10"
          >
            {products.map((product, index) => (
              // Direct flex children, so they stretch to the tallest and
              // ProductCard's h-full has something to resolve against — which
              // is what keeps every Add to Cart on one line when a name wraps.
              <div
                key={product.id}
                className="w-[240px] shrink-0 snap-start sm:w-[258px]"
                style={{ '--d': `${CARDS_BEGIN_MS + index * CARD_STAGGER_MS}ms` } as React.CSSProperties}
              >
                <ProductCard product={product} variant="showcase" />
              </div>
            ))}
          </div>

          {/* Between snap points a card is genuinely half over the padding and
              clipped by the strip's edge. Snapping fixes where it comes to
              rest; this softens the frames in between, so a card leaving the
              rail dissolves into the strip instead of being sliced by it —
              the same trick the promo panels use on their photographs. */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-0 w-5 sm:w-7 lg:w-12 lg:rounded-l-[34px]"
            style={{
              background:
                'linear-gradient(to right, #f7f2ed 0%, rgba(247,242,237,0.9) 40%, rgba(247,242,237,0) 100%)',
            }}
          />
        </div>
      </div>
    </section>
  );
}

/** Rail arrow. Disabled at each end rather than hidden, so the control row
 *  keeps its width and the masthead does not shift as you scroll. */
function RailButton({ dir, disabled, onClick }: { dir: 1 | -1; disabled: boolean; onClick: () => void }) {
  const Icon = dir === 1 ? ChevronRight : ChevronLeft;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={dir === 1 ? 'Show later products' : 'Show earlier products'}
      className={RAIL_BUTTON}
    >
      <Icon className="h-4.5 w-4.5 sm:h-5 sm:w-5" strokeWidth={2.2} />
    </button>
  );
}
