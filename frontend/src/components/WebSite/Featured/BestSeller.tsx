'use client';
import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, ShoppingCart } from 'lucide-react';
import { publicProductService, PublicProduct } from '@/services/publicProductService';
import { cartService } from '@/services/cartService';
import { userAuthService } from '@/services/userAuthService';
import { showSuccessToast, showErrorToast } from '@/lib/toast-utils';
import { formatPrice, getRegionalPrice, getRegionalOriginalPrice, isVisibleInRegion } from '@/lib/currency';
import type { ActiveOffer } from '@/lib/offers';

/**
 * Best Sellers, as a chart.
 *
 * This section has been a grid of product cards twice now, and both times the
 * problem was the same: the page already has one of those. Featured is a
 * six-across card grid and Top Selling is a card rail, so a third arrangement
 * of the same object reads as the same section printed again, however it is
 * painted. A brief attempt at an editorial hero-plus-grid fixed the repetition
 * but broke something more important — blowing one product up to four times
 * the size implies a rank the data cannot support, and halves how many
 * products are visible at once, which is the wrong trade for a store whose
 * pitch is breadth and price.
 *
 * So this is not cards. It is the ranked list every shopper already recognises
 * as a best-sellers chart: numeral, thumbnail, name, spec, price, quick add.
 * Two columns of compact rows on a white sheet.
 *
 * What that buys, concretely:
 *
 *  · Density. A card is roughly 400px tall; a row is about 110px. Six products
 *    as a 3x2 card grid runs ~800px of page. As a chart it is ~350px, and ten
 *    products would still be shorter than six cards.
 *  · Comparison. Equal weight, aligned prices and aligned savings — you can
 *    read down the column and compare, which is the entire point of a chart
 *    and impossible in a grid of differently-sized names.
 *  · Specs. A row has width to spare where a card does not, so each one shows
 *    the fabric, size and weight buyers actually compare. Nothing else on the
 *    site surfaces those fields.
 *  · Robustness. 4, 6, 8, 10 — odd counts too — all fill cleanly. No padding
 *    products, no filler tile, no trimming.
 *
 * ── One honest caveat ─────────────────────────────────────────────────────
 *
 * The numerals imply a sales rank, and there is no sales data behind them.
 * getProductsByTag sorts by createdAt desc, so "01" means "most recently
 * tagged Best Seller" and the order reshuffles whenever the client tags
 * something new. Every store does this; it is still worth saying out loud
 * rather than leaving for someone to discover.
 */

/** How many products the chart asks for. Ten would also lay out correctly. */
const BEST_SELLER_COUNT = 6;

/** Rows deal in top-to-bottom, down the left column then the right. */
const ROWS_BEGIN_MS = 160;
const ROW_STAGGER_MS = 70;

/** Fire when the chart is properly on screen, not when its top edge appears. */
const REVEAL_THRESHOLD = 0.25;
const REVEAL_MARGIN = '0px 0px -12% 0px';

/**
 * A pale rose panel.
 *
 * Not a new colour — this is the rose already on the page, taken from the
 * DownloadApp QR card (#fdf6f4 on a #ecd7d1 edge), which in turn is brand red
 * pulled right down. Deriving it from something the site already uses is what
 * keeps it reading as part of the palette rather than as a tint someone liked.
 *
 * The page alternates on purpose: Featured is a warm linen panel, Top Selling
 * above this is white, this is rose, Category below is a warm off-white. So
 * the two product grids never touch, and this is the one place on the page
 * carrying any real colour.
 *
 * Contrast on the darkest step (#f7e5e0): body text #5f5550 measures 5.94:1,
 * the 11px eyebrow #c41617 measures 4.96:1. Both clear.
 */
const GROUND =
  'border-y border-[#eedad4] bg-linear-to-b from-[#fdf7f5] via-[#f7e5e0] to-[#fdf8f6]';

const SHELL = 'max-w-420';

/** The chart's primary photo, mirroring ProductCard's selection order. */
function primaryImageUrl(product: PublicProduct): string | undefined {
  const images = product.images;
  if (!Array.isArray(images) || images.length === 0) return undefined;
  const primary = images.find((img) => img.isPrimary && img.url && img.url.trim() !== '');
  const first = images.find((img) => img.url && img.url.trim() !== '');
  return (primary ?? first)?.url;
}

/**
 * The one line of specification a row has room for.
 *
 * Built from whatever the product actually carries rather than a fixed set, so
 * a product missing its fabric type shows a shorter line instead of an empty
 * separator. GSM lives inside fabricSpecifications, which the service types as
 * `any` — narrowed here rather than trusted.
 */
function specLine(product: PublicProduct): string | null {
  const fabricSpecs = product.fabricSpecifications as { gsm?: string | number } | null | undefined;
  const gsm = fabricSpecs?.gsm;

  const parts = [
    gsm ? `${gsm} GSM` : null,
    product.dimensions || product.singleUnitSize || null,
    product.fabricType || product.material || null,
  ].filter((part): part is string => Boolean(part && String(part).trim()));

  return parts.length > 0 ? parts.join(' · ') : null;
}

interface ChartRowProps {
  product: PublicProduct;
  rank: number;
  /** Last row of its column — drops the hairline so columns don't end in one. */
  isColumnEnd: boolean;
  delay: number;
}

function ChartRow({ product, rank, isColumnEnd, delay }: ChartRowProps) {
  const [isAdding, setIsAdding] = useState(false);

  const imageUrl = primaryImageUrl(product);
  const spec = specLine(product);

  // Pricing mirrors ProductCard exactly: an automatic offer, when the backend
  // attaches one, defines both the effective price and the strike-through and
  // takes precedence over the product's own MRP discount, so the two never
  // stack into two different savings claims on one row.
  const displayPrice = getRegionalPrice(product);
  const regionalOriginalPrice = getRegionalOriginalPrice(product);
  const activeOffer: ActiveOffer | undefined = product.activeOffer;
  const effectivePrice = activeOffer ? activeOffer.offerPrice : displayPrice;
  const strikePrice = activeOffer ? activeOffer.originalPrice : regionalOriginalPrice;

  const hasMarkdown = Boolean(strikePrice && effectivePrice && strikePrice > effectivePrice);
  // No percentage figure anywhere in the row. It used to sit as a dark bar
  // across the foot of each photo, which put a heavy slab over the product at
  // the exact size where the product was already hard to read — and it said
  // the same thing twice, since "Save $4.82" is right there in the price
  // block and is the number a shopper actually acts on.
  const savingsAmount = hasMarkdown ? (strikePrice as number) - (effectivePrice as number) : null;

  const currentStock = Math.max(product.totalStock ?? 0, 0);
  const inStock = currentStock > 0;

  // Quick add is one unit, deliberately — a quantity stepper belongs on the
  // detail page and there is no room for one in a chart row.
  //
  // This repeats ProductCard's auth guard rather than sharing it. Extracting a
  // hook would mean refactoring a component rendered on five other pages for
  // the sake of a dozen lines; if a third caller ever needs this, that is the
  // point to pull it out.
  const handleAdd = async (e: React.MouseEvent) => {
    e.preventDefault(); // the whole row is a link to the product
    e.stopPropagation();

    if (!userAuthService.isAuthenticated()) {
      showErrorToast('Login Required', 'Please login to add items to cart');
      setTimeout(() => {
        window.location.href = '/login';
      }, 1500);
      return;
    }

    if (!inStock) {
      showErrorToast('Out of Stock', 'This product is currently out of stock');
      return;
    }

    setIsAdding(true);
    try {
      await cartService.addToCart(product.id, 1);
      showSuccessToast('Added to Cart', `${product.name} added to your cart`);
    } catch (error) {
      console.error('Error adding to cart:', error);
      const message = error instanceof Error ? error.message : 'Unable to add item to cart';
      showErrorToast('Failed', message);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <Link
      href={`/products/${product.slug || product.id}`}
      data-colend={isColumnEnd ? '1' : undefined}
      className="bsc-row group px-2 py-5 transition-colors duration-300 hover:bg-[#fdf7f5] sm:px-3 sm:py-6"
      style={{ '--d': `${delay}ms` } as React.CSSProperties}
    >
      {/* Rank. #9c8770 measures 3.44:1 on white — over the 3:1 large-text
          threshold this qualifies for at 24px semibold. The obvious paler tone
          looked better and measured 1.6:1, which is not a legible number for
          something carrying meaning. */}
      <span className="bsc-num w-7 text-center font-playfair text-[22px] font-semibold leading-none tabular-nums text-[#9c8770] transition-colors duration-300 group-hover:text-[#c41617] sm:w-12 sm:text-[36px]">
        {String(rank).padStart(2, '0')}
      </span>

      {/* Square, and sized off the track rather than off itself — w-full is
          the fixed column, aspect-square turns that into the height. The
          product photo is the point of the row: it is why a chart beats a
          bare price list, and at thumbnail scale nobody can tell a terry
          towel from a dish cloth. */}
      <span className="bsc-thumb relative block aspect-square w-full overflow-hidden rounded-2xl bg-[radial-gradient(120%_100%_at_50%_0%,#faf9f7_0%,#ece9e4_100%)] ring-1 ring-[#efe3dd]">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 96px, 132px"
            className="object-cover transition-transform duration-[900ms] ease-out group-hover:scale-[1.06]"
          />
        ) : null}

        {!inStock ? (
          <span className="absolute inset-0 grid place-items-center bg-white/65">
            <span className="rounded bg-[#1a1a1a]/85 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white">
              Sold out
            </span>
          </span>
        ) : null}
      </span>

      <span className="bsc-name block min-w-0">
        <span className="block truncate font-playfair text-[16px] font-semibold leading-snug tracking-tight text-[#1a1a1a] transition-colors duration-300 group-hover:text-[#e01a1b] sm:text-[19px]">
          {product.name}
        </span>
        {/* #6b6058 on white measures 6.10:1. */}
        {spec ? (
          <span className="mt-1 block truncate text-[12px] leading-relaxed text-[#6b6058] sm:text-[12.5px]">
            {spec}
          </span>
        ) : null}
      </span>

      <span className="bsc-price flex items-baseline gap-2 sm:flex-col sm:items-end sm:gap-1">
        <span className="whitespace-nowrap text-[19px] font-bold leading-none tabular-nums text-[#1a1a1a] sm:text-[22px]">
          {formatPrice(effectivePrice || 0)}
        </span>
        {hasMarkdown ? (
          // #7a6d62 measures 5.01:1 — the softer grey this wants to be lands at
          // 3.99:1, under the body-text threshold.
          <span className="whitespace-nowrap text-[12.5px] leading-none tabular-nums text-[#7a6d62] line-through sm:text-[13px]">
            {formatPrice(strikePrice as number)}
          </span>
        ) : null}
        {savingsAmount ? (
          <span className="whitespace-nowrap text-[12px] font-semibold leading-none tabular-nums text-[#7a0f10] sm:text-[12.5px]">
            Save {formatPrice(savingsAmount)}
          </span>
        ) : null}
      </span>

      <button
        onClick={handleAdd}
        disabled={!inStock || isAdding}
        aria-label={inStock ? `Add ${product.name} to cart` : `${product.name} is out of stock`}
        title={inStock ? 'Add to cart' : 'Out of stock'}
        className={`bsc-btn grid h-11 w-11 shrink-0 place-items-center rounded-full transition-all duration-300 sm:h-13 sm:w-13 ${inStock
          ? 'bg-[#fdf1ee] text-[#7a0f10] ring-1 ring-[#eed5cd] hover:bg-[#e01a1b] hover:text-white hover:ring-[#e01a1b] hover:shadow-[0_10px_22px_-10px_rgba(224,26,27,0.65)] active:scale-90 disabled:opacity-60'
          : 'cursor-not-allowed bg-[#f5f0ea] text-[#a89a8d] ring-1 ring-[#e8ded2]'
          }`}
      >
        <ShoppingCart className={`h-[19px] w-[19px] ${isAdding ? 'animate-pulse' : ''}`} strokeWidth={2} />
      </button>
    </Link>
  );
}

export default function BestSeller() {
  const [products, setProducts] = useState<PublicProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const sheetRef = useRef<HTMLDivElement | null>(null);

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

  // Watches the sheet rather than the <section>, for the same reason Featured
  // watches its grid: the section starts at the masthead, so a section-level
  // observer fires while the rows are still below the fold and the animation
  // plays where nobody can see it.
  //
  // The class goes on imperatively so triggering costs no re-render, and the
  // observer disconnects on the first hit — it plays once and stays played.
  useEffect(() => {
    const sheet = sheetRef.current;
    if (!sheet) return;

    // Rows default to invisible, so with no observer there would be no chart.
    if (typeof IntersectionObserver === 'undefined') {
      sheet.classList.add('is-open');
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            sheet.classList.add('is-open');
            io.disconnect();
          }
        }
      },
      { threshold: REVEAL_THRESHOLD, rootMargin: REVEAL_MARGIN }
    );

    io.observe(sheet);
    return () => io.disconnect();
  }, [products.length]);

  if (isLoading) {
    // Mirrors the loaded chart: same sheet, same two columns, same row height.
    // Anything that differs here shows up as a jump when the fetch resolves.
    return (
      <section className={`${GROUND} py-8 font-sans sm:py-10 lg:py-14`}>
        <div className={`mx-auto ${SHELL} px-3 sm:px-4 md:px-6 lg:px-8`}>
          <div className="mb-5 lg:mb-6">
            <div className="mx-auto h-3 w-32 animate-pulse rounded bg-[#e3dbd1] lg:mx-0" />
            <div className="mx-auto mt-3 h-9 w-64 animate-pulse rounded bg-[#e3dbd1] md:h-11 md:w-80 lg:mx-0" />
            <div className="mx-auto mt-2.5 h-4 w-full max-w-lg animate-pulse rounded bg-[#ece5dc] lg:mx-0" />
          </div>

          <div className="rounded-[28px] bg-white p-4 ring-1 ring-[#f0e2dd] sm:p-6 lg:p-9">
            <div className="grid lg:grid-cols-2 lg:gap-x-12">
              {Array.from({ length: BEST_SELLER_COUNT }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 py-5 sm:gap-6 sm:py-6">
                  <div className="h-7 w-7 shrink-0 animate-pulse rounded bg-[#f3e5e0] sm:h-9 sm:w-12" />
                  <div className="h-24 w-24 shrink-0 animate-pulse rounded-2xl bg-[#f3e5e0] sm:h-33 sm:w-33" />
                  <div className="min-w-0 flex-1 space-y-2.5">
                    <div className="h-5 w-2/3 animate-pulse rounded bg-[#f3e5e0]" />
                    <div className="h-3 w-1/2 animate-pulse rounded bg-[#f8eeeb]" />
                  </div>
                  <div className="hidden h-6 w-20 shrink-0 animate-pulse rounded bg-[#f3e5e0] sm:block" />
                  <div className="h-11 w-11 shrink-0 animate-pulse rounded-full bg-[#f8eeeb] sm:h-13 sm:w-13" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  // Region filtering happens here rather than inside the row, so the numerals
  // stay contiguous. Filtering inside would have rendered null for a hidden
  // product and left a gap in the chart numbering.
  const visible = products
    .filter((p) => isVisibleInRegion((p as { priceVisibility?: string }).priceVisibility))
    .slice(0, BEST_SELLER_COUNT);

  if (visible.length === 0) {
    return null; // Don't show section if no products
  }

  // Two balanced columns, filled down the left then down the right — the way a
  // top-ten chart splits, rather than snaking left-to-right. An odd count puts
  // the extra row in the left column, which is where a reader expects it.
  const rows = Math.ceil(visible.length / 2);

  return (
    <section className={`relative overflow-hidden py-8 font-sans sm:py-10 lg:py-14 ${GROUND}`}>
      <style>{`
        /* ── Row geometry ─────────────────────────────────────────────────
           Two lines on narrow screens — name over price, with the numeral,
           thumbnail and button spanning both — and one line from sm up. Grid
           areas rather than two sets of markup, so the price block is written
           once and simply lands somewhere different. */
        /* The photo column is a FIXED track, not an auto one.
           Sized automatically, the thumbnails rendered as a few-pixel sliver:
           the track
           was sizing intrinsically against a box whose only content is an
           absolutely-positioned next/image, and the width declared on the box
           itself did not rescue it. Rather than work out which step of that
           chain gave way, the track is now pinned — the column is 5rem before
           any child is measured, and the photo fills it. Same reasoning as the
           grid columns elsewhere on this page: prefer the version whose
           failure mode is visible over the one that silently resolves to
           nothing. */
        .bsc-row {
          display: grid;
          grid-template-columns: auto 6rem minmax(0, 1fr) auto;
          grid-template-areas:
            "num thumb name  btn"
            "num thumb price btn";
          align-items: center;
          column-gap: 1rem;
          row-gap: .35rem;
          border-bottom: 1px solid #f0e2dd;
        }
        @media (min-width: 640px) {
          .bsc-row {
            grid-template-columns: auto 8.25rem minmax(0, 1fr) auto auto;
            grid-template-areas: "num thumb name price btn";
            column-gap: 1.5rem;
          }
        }
        .bsc-num   { grid-area: num }
        .bsc-thumb { grid-area: thumb }
        .bsc-name  { grid-area: name }
        .bsc-price { grid-area: price }
        .bsc-btn   { grid-area: btn }

        /* No hairline under the final row of a column — otherwise each column
           ends in a rule pointing at nothing. */
        .bsc-row:last-child { border-bottom: 0 }

        /* ── The two columns ──────────────────────────────────────────────
           grid-auto-flow: column with explicit row and column tracks fills
           down column one and then down column two. Because the row tracks are
           shared across both columns, rank 01 and rank 04 always sit on the
           same baseline even when one name wraps and the other does not. */
        .bsc-chart { display: grid }
        @media (min-width: 1024px) {
          .bsc-chart {
            position: relative;
            grid-auto-flow: column;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            grid-template-rows: repeat(var(--rows), auto);
            column-gap: 3rem;
          }
          .bsc-chart::before {
            content: '';
            position: absolute;
            inset-block: 0;
            left: 50%;
            width: 1px;
            transform: translateX(-50%);
            background: #f0e2dd;
          }
          .bsc-row[data-colend="1"] { border-bottom: 0 }
        }

        /* ── The deal ─────────────────────────────────────────────────────
           Rows drop into place in rank order and each numeral arrives just
           after its row, with a little overshoot — a chart being counted out.

           Resting state lives on .is-open and the fill-mode is 'backwards',
           not 'both': backwards holds the from-state through the stagger delay
           and then hands back to the normal rule, so a skipped or unsupported
           animation lands on the visible state instead of being stranded at
           opacity 0 by a forwards fill. */
        @keyframes bscDeal {
          from { opacity: 0; transform: translateY(14px) }
          to   { opacity: 1; transform: none }
        }
        @keyframes bscNum {
          from { opacity: 0; transform: translateY(8px) scale(.86) }
          to   { opacity: 1; transform: none }
        }

        .bsc-row, .bsc-num, .bsc-cta { opacity: 0 }

        .bsc-sheet.is-open .bsc-row,
        .bsc-sheet.is-open .bsc-num,
        .bsc-sheet.is-open .bsc-cta { opacity: 1; transform: none }

        .bsc-sheet.is-open .bsc-row,
        .bsc-sheet.is-open .bsc-cta {
          animation: bscDeal 560ms cubic-bezier(0.22, 0.72, 0.24, 1) var(--d, 0ms) backwards;
        }
        .bsc-sheet.is-open .bsc-num {
          animation: bscNum 520ms cubic-bezier(0.34, 1.4, 0.5, 1) calc(var(--d, 0ms) + 150ms) backwards;
        }

        /* Motion off, content on. The default state here is hidden, so this has
           to restore it rather than merely cancel the animation. */
        @media (prefers-reduced-motion: reduce) {
          .bsc-row, .bsc-num, .bsc-cta { opacity: 1; transform: none; animation: none }
        }
      `}</style>

      <div className={`relative mx-auto ${SHELL} px-3 sm:px-4 md:px-6 lg:px-8`}>
        {/* ── Masthead ─────────────────────────────────────────────────────
            No button up here. The old header carried a red "View All Products"
            pill AND a second identical one below it on mobile, both pointing
            at the same URL. The bar at the foot of the chart replaces both. */}
        <div className="mb-5 lg:mb-6">
          <div className="flex items-center justify-center gap-4 lg:justify-start">
            {/* #c41617, not brand #e01a1b: at 11px bold on this stone the brand
                red measures 4.2:1. This reads the same and makes 5.06:1. */}
            <span className="inline-flex shrink-0 items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#c41617] sm:text-xs">
              <span aria-hidden className="h-px w-6 bg-[#c41617]" />
              Customer Favourites
            </span>

            <span
              aria-hidden
              className="hidden h-px flex-1 lg:block"
              style={{ background: 'linear-gradient(90deg, #e8d1cb 0%, rgba(232,209,203,0) 100%)' }}
            />
          </div>

          <h2 className="mt-3 text-center font-playfair text-2xl font-semibold tracking-tight text-[#1a1a1a] sm:text-3xl md:text-4xl lg:text-left xl:text-[2.75rem]">
            Best Seller Products
          </h2>
          {/* The old line — "Highest rated products that have earned our
              customers' trust and satisfaction" — described data that does not
              exist. Nothing counts sales or ratings; the row is a tag an admin
              sets by hand. This says what is actually true. */}
          <p className="mx-auto mt-2 max-w-full text-center text-sm leading-relaxed text-[#5f5550] md:mt-3 md:text-base lg:mx-0 lg:max-w-2xl lg:text-left lg:text-lg xl:max-w-3xl">
            The shortlist — what to buy first, with the weight, size and weave for each
          </p>
        </div>

        {/* ── The sheet ────────────────────────────────────────────────────
            The chart sits on white rather than directly on the panel, so it
            reads as a printed list on a table. It is also the only container
            of its kind on the page, which is half of why the section no longer
            looks like Featured. */}
        <div
          ref={sheetRef}
          className="bsc-sheet rounded-[28px] bg-white p-4 shadow-[0_20px_50px_-30px_rgba(122,15,16,0.28)] ring-1 ring-[#f0e2dd] sm:p-6 lg:p-9"
        >
          <div className="bsc-chart" style={{ '--rows': String(rows) } as React.CSSProperties}>
            {visible.map((product, index) => (
              <ChartRow
                key={product.id}
                product={product}
                rank={index + 1}
                // Last of its column on desktop, or last overall.
                isColumnEnd={index % rows === rows - 1 || index === visible.length - 1}
                delay={ROWS_BEGIN_MS + index * ROW_STAGGER_MS}
              />
            ))}
          </div>

          {/* The chart's closing line, in the reading path rather than beside
              it — and the section's only call to action. */}
          <Link
            href="/products?collection=best-seller"
            className="bsc-cta group mt-5 flex items-center justify-center gap-2 rounded-2xl bg-[#fdf3f0] py-4 text-[12.5px] font-semibold uppercase tracking-[0.12em] text-[#7a0f10] ring-1 ring-[#f0ded8] transition-all duration-300 hover:bg-[#e01a1b] hover:text-white hover:ring-[#e01a1b] hover:shadow-[0_14px_30px_-14px_rgba(224,26,27,0.6)] sm:py-4.5 sm:text-[13.5px]"
            style={{ '--d': `${ROWS_BEGIN_MS + visible.length * ROW_STAGGER_MS}ms` } as React.CSSProperties}
          >
            View all products
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </section>
  );
}
