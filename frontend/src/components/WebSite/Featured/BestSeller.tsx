'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import ProductCard from '@/components/WebSite/ProductCard/ProductCard';
import { publicProductService, PublicProduct } from '@/services/publicProductService';

/**
 * Best Sellers.
 *
 * Back to product cards. This was a two-column chart of compact rows — rank,
 * thumbnail, spec line, price — which was denser and better for comparison,
 * but it read as a different kind of object from the rest of the storefront,
 * and a homepage wants its product sections to look like product sections.
 *
 * So it is the same showcase card Featured and Top Selling use. What keeps it
 * from being Featured a second time is the column count, the ground and the
 * entrance: Featured is six across on warm linen with cloth unrolling off each
 * card; this is three or four across on rose, with the cards settling onto a
 * shelf that draws itself first.
 *
 * ── The count still has to be handled ─────────────────────────────────────
 *
 * getProductsByTag returns whatever is tagged, so the length is not fixed —
 * four today, six once two more are tagged. A hard-coded column count leaves a
 * hole in the last row at one of those numbers, so the columns are derived
 * instead: the largest of three or four that divides the count exactly, capped
 * at the count itself. Four products go four across; six go three across in
 * two rows. Odd counts drop their last product rather than leave a gap.
 */

/** How many the row asks for. Six is the design target; four is what is tagged. */
const BEST_SELLER_COUNT = 6;

const CARDS_BEGIN_MS = 260;
const CARD_STAGGER_MS = 80;
const CARD_MS = 660;

const REVEAL_THRESHOLD = 0.25;
const REVEAL_MARGIN = '0px 0px -12% 0px';

/**
 * A pale rose panel.
 *
 * Not a new colour — it is the rose already on the page from the DownloadApp
 * QR card, which is brand red pulled right down. The page alternates on
 * purpose: Featured is warm linen, Top Selling above this is white, this is
 * rose, so the two product grids never read as one interrupted section.
 *
 * Contrast on the darkest step (#f7e5e0): body text #5f5550 measures 5.94:1,
 * the 11px eyebrow #c41617 measures 4.96:1.
 */
const GROUND =
  'border-y border-[#eedad4] bg-linear-to-b from-[#fdf7f5] via-[#f7e5e0] to-[#fdf8f6]';

const SHELL = 'max-w-420';

export default function BestSeller() {
  const [products, setProducts] = useState<PublicProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const gridRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const fetchBestSellerProducts = async () => {
      setIsLoading(true);
      try {
        const response = await publicProductService.getBestSellerProducts(BEST_SELLER_COUNT);
        if (response.success && response.data) {
          setProducts(response.data.items);
        }
      } catch (error) {
        console.error('Error fetching best seller products:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBestSellerProducts();
  }, []);

  // Watches the grid rather than the <section>: the section starts at the
  // masthead, so a section-level observer fires while the cards are still
  // below the fold and the entrance plays where nobody can see it.
  //
  // The class goes on imperatively so triggering costs no re-render, and the
  // observer disconnects on the first hit.
  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;

    // Cards default to invisible, so with no observer there would be no row.
    if (typeof IntersectionObserver === 'undefined') {
      grid.classList.add('is-in');
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            grid.classList.add('is-in');
            io.disconnect();
          }
        }
      },
      { threshold: REVEAL_THRESHOLD, rootMargin: REVEAL_MARGIN }
    );

    io.observe(grid);
    return () => io.disconnect();
  }, [products.length]);

  if (isLoading) {
    // Mirrors the loaded row — same columns, gaps and 5/4 image ratio as
    // ProductCard. Anything that differs shows as a jump when the fetch lands.
    return (
      <section className={`${GROUND} py-8 font-sans sm:py-10 lg:py-14`}>
        <div className={`mx-auto ${SHELL} px-3 sm:px-4 md:px-6 lg:px-8`}>
          <div className="mb-6 lg:mb-8">
            <div className="mx-auto h-3 w-32 animate-pulse rounded bg-[#f3e5e0] lg:mx-0" />
            <div className="mx-auto mt-3 h-9 w-64 animate-pulse rounded bg-[#f3e5e0] md:h-11 md:w-80 lg:mx-0" />
            <div className="mx-auto mt-2.5 h-4 w-full max-w-lg animate-pulse rounded bg-[#f8eeeb] lg:mx-0" />
          </div>
          <div className="grid grid-cols-2 gap-4 sm:gap-5 md:grid-cols-3 md:gap-6 xl:grid-cols-6 xl:gap-5">
            {Array.from({ length: BEST_SELLER_COUNT }).map((_, i) => (
              <div
                key={i}
                className="overflow-hidden rounded-[16px] bg-white ring-1 ring-[#e3d7c9] shadow-[0_10px_26px_-18px_rgba(74,50,38,0.45)]"
              >
                <div className="aspect-[5/4] w-full animate-pulse bg-[#f3e5e0]" />
                <div className="space-y-3 p-3.5 sm:p-4">
                  <div className="h-4 w-3/4 animate-pulse rounded bg-[#f3e5e0]" />
                  <div className="h-6 w-1/2 animate-pulse rounded bg-[#f3e5e0]" />
                  <div className="h-10 w-full animate-pulse rounded-lg bg-[#f8eeeb]" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (products.length === 0) {
    return null; // Don't show section if no products
  }

  // Six columns, however many products come back — the same grid Featured
  // uses, at the same shell width, so a card here is the same size as a card
  // there without either section having to know about the other.
  //
  // There is no count logic any more, and none is needed: a fixed six-column
  // grid fills left to right and leaves the remainder empty. Four products
  // sit in four slots with space to their right, and the row completes itself
  // the moment two more are tagged Best Seller in the admin. The earlier
  // version derived a column count to avoid that space, which cost a card
  // size that matched nothing else on the page.
  const visible = products.slice(0, BEST_SELLER_COUNT);

  return (
    <section className={`relative overflow-hidden py-8 font-sans sm:py-10 lg:py-14 ${GROUND}`}>
      <style>{`
        /* ── The cards ─────────────────────────────────────────────────────
           Rise, fade and settle out of a slight under-scale, staggered across
           the row. The easing overshoots a touch at the end so each card
           arrives with a little weight instead of gliding to a stop.

           Resting state lives on .is-in with fill-mode 'backwards', so a
           skipped animation lands on the visible state rather than stranding
           the row at opacity 0. */
        @keyframes bsCard {
          from { opacity: 0; transform: translateY(26px) scale(.97) }
          to   { opacity: 1; transform: none }
        }

        .bs-card { opacity: 0 }
        .bs-grid.is-in .bs-card {
          opacity: 1;
          transform: none;
          animation: bsCard ${CARD_MS}ms cubic-bezier(0.22, 0.94, 0.30, 1) var(--d, 0ms) backwards;
        }

        @media (prefers-reduced-motion: reduce) {
          .bs-card { opacity: 1 }
          .bs-grid.is-in .bs-card { animation: none }
          .bs-shelf { transform: none; animation: none }
        }
      `}</style>

      <div className={`relative mx-auto ${SHELL} px-3 sm:px-4 md:px-6 lg:px-8`}>
        {/* ── Masthead ─────────────────────────────────────────────────────
            No button up here. The original carried a red "View All Products"
            pill AND a second identical one below it on mobile, both pointing
            at the same URL. There is one, at the foot. */}
        <div className="mb-6 lg:mb-8">
          <div className="flex items-center justify-center gap-4 lg:justify-start">
            {/* #c41617, not brand #e01a1b: at 11px bold on this rose the brand
                red measures 4.2:1. This reads the same and makes 4.96:1. */}
            <span className="inline-flex shrink-0 items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#c41617] sm:text-xs">
              <span aria-hidden className="h-px w-6 bg-[#c41617]" />
              Customer Favourites
            </span>

            <span
              aria-hidden
              className="hidden h-px flex-1 lg:block"
              style={{ background: 'linear-gradient(90deg, #e8d1cb 0%, rgba(232,209,203,0) 100%)' }}
            />

            {/* Top right on desktop, matching Featured exactly — same shape,
                same size, same corner. Two product sections carrying the same
                action should carry it in the same place. */}
            <Link
              href="/products?collection=best-seller"
              className="group hidden shrink-0 items-center gap-2 rounded-full bg-[#e01a1b] px-6 py-2.5 text-[12.5px] font-semibold uppercase tracking-[0.12em] text-white shadow-[0_10px_24px_-12px_rgba(224,26,27,0.75)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#c41617] hover:shadow-[0_16px_30px_-12px_rgba(224,26,27,0.6)] lg:inline-flex"
            >
              View all products
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </div>

          <h2 className="mt-3 text-center font-playfair text-2xl font-semibold tracking-tight text-[#1a1a1a] sm:text-3xl md:text-4xl lg:text-left xl:text-[2.75rem]">
            Best Seller Products
          </h2>
          {/* The original line — "Highest rated products that have earned our
              customers' trust and satisfaction" — described data that does not
              exist. Nothing counts sales or ratings; the row is a tag an admin
              sets by hand. This says what is actually true. */}
          <p className="mx-auto mt-2 max-w-full text-center text-sm leading-relaxed text-[#5f5550] md:mt-3 md:text-base lg:mx-0 lg:max-w-2xl lg:text-left lg:text-lg xl:max-w-3xl">
            A small edit from across the catalogue — where to start if you&apos;re buying for the whole house
          </p>
        </div>

        <div
          ref={gridRef}
          className="bs-grid grid grid-cols-2 gap-4 sm:gap-5 md:grid-cols-3 md:gap-6 xl:grid-cols-6 xl:gap-5"
        >
          {visible.map((product, index) => (
            <div
              key={product.id}
              className="bs-card"
              style={{ '--d': `${CARDS_BEGIN_MS + index * CARD_STAGGER_MS}ms` } as React.CSSProperties}
            >
              <ProductCard product={product} variant="showcase" />
            </div>
          ))}
        </div>

        {/* Mobile only — the desktop call to action lives in the masthead,
            the same way Featured's does. */}
        <div className="mt-7 flex justify-center lg:hidden">
          <Link
            href="/products?collection=best-seller"
            className="btn-shine group inline-flex items-center gap-2 whitespace-nowrap rounded-full bg-[#e01a1b] px-6 py-2.5 text-[13.5px] font-semibold text-white shadow-[0_10px_24px_-12px_rgba(224,26,27,0.8)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#c41617] sm:px-7 sm:py-3 sm:text-sm"
          >
            View All Products
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </section>
  );
}
