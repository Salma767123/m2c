'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect, useRef } from 'react';
import { categoryService } from '@/services/categoryService';
import { Package, ArrowRight } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  slug: string;
  image?: string;
  productCount?: number;
}

/**
 * Shop by Category — a row of tiles.
 *
 * This was a 3D ring carousel. It worked, and it is kept whole in
 * CategoryRing.tsx for another page, but a turning ring was too much for this
 * slot: categories are navigation, and navigation should be readable at a
 * glance rather than performed one card at a time.
 *
 * So the tiles are all visible, all readable, all links, and the animation is
 * an entrance rather than a mechanism — nothing here moves after it has
 * arrived except under the cursor.
 *
 * ── The thing a grid gives up ─────────────────────────────────────────────
 *
 * The ring existed for a reason worth writing down, because it will look like
 * an oversight otherwise. The category photographs have nothing in common:
 * different backgrounds, different lighting, two collages, a spec sheet and
 * the M2C logo. A ring showed one at a time and let the rest fall out of
 * focus, which turned that inconsistency into depth of field. A grid shows all
 * six at once and invites exactly the comparison the set cannot survive.
 *
 * What the grid can do about it, and does: one fixed 4:5 crop for every tile
 * so they are at least the same shape, one warm ring around each so they sit
 * on the page as a set, and a scrim heavy enough that the name is legible over
 * a white spec sheet and a dark logo alike. The rest is a photography
 * question, not a layout one — replacing the two outliers would do more for
 * this section than any amount of CSS.
 */

/** Six fills one row from lg and two below it, with nothing left over. */
const CATEGORY_COUNT = 6;

const TILE_MS = 700;
const TILE_STAGGER_MS = 80;
/** The photo settles for longer than the tile rises, so it arrives after it. */
const PHOTO_MS = 1200;

const REVEAL_THRESHOLD = 0.2;
const REVEAL_MARGIN = '0px 0px -12% 0px';

export default function Category() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const gridRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await categoryService.getAllCategories({
          status: 'ACTIVE',
          showRootOnly: 'true',
          sortBy: 'sortOrder',
          sortOrder: 'asc',
        });

        if (response.success && response.data) {
          setCategories(response.data.slice(0, CATEGORY_COUNT));
        }
      } catch (error) {
        console.error('Failed to fetch categories:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  // Watches the grid, not the section: the section starts at the masthead, so
  // a section-level observer fires while the tiles are still below the fold.
  //
  // The class goes on imperatively so triggering costs no re-render, and the
  // observer disconnects on the first hit. Re-runs once categories arrive,
  // because the grid does not exist during the loading state.
  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;

    // Tiles default to invisible, so with no observer there would be no
    // section at all. Show them immediately instead.
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
  }, [categories.length]);

  if (loading) {
    // Mirrors the loaded grid exactly — same columns, gaps and 4:5 ratio.
    // Anything that differs shows up as a jump when the fetch resolves.
    return (
      <section className="bg-white py-8 font-sans sm:py-10 lg:py-14">
        <div className="mx-auto max-w-420 px-3 sm:px-4 md:px-6 lg:px-8">
          <div className="mb-8 text-center sm:mb-10">
            <div className="mx-auto h-3 w-28 animate-pulse rounded bg-gray-200" />
            <div className="mx-auto mt-3 h-9 w-64 animate-pulse rounded bg-gray-200 md:h-11 md:w-80" />
            <div className="mx-auto mt-3 h-4 w-full max-w-xl animate-pulse rounded bg-gray-100" />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-6 lg:gap-5">
            {Array.from({ length: CATEGORY_COUNT }).map((_, i) => (
              <div key={i} className="aspect-[4/5] w-full animate-pulse rounded-[18px] bg-gray-200" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (categories.length === 0) {
    return null;
  }

  return (
    <section className="bg-white py-8 font-sans sm:py-10 lg:py-14">
      <style>{`
        /* ── The entrance ──────────────────────────────────────────────────
           Two tracks on one delay: the tile rises into place, and the photo
           inside it settles out of a slight over-scale on a longer curve — so
           the picture arrives a beat after the card that holds it.

           Resting state lives on .is-in and the fill-mode is 'backwards', so a
           skipped or unsupported animation lands on the visible state rather
           than stranding the tiles at opacity 0. */
        @keyframes cgTile {
          from { opacity: 0; transform: translateY(22px) }
          to   { opacity: 1; transform: none }
        }
        @keyframes cgPhoto {
          from { transform: scale(1.12) }
          to   { transform: none }
        }

        .cg-tile { opacity: 0 }
        .cg-grid.is-in .cg-tile {
          opacity: 1;
          transform: none;
          animation: cgTile ${TILE_MS}ms cubic-bezier(0.22, 0.72, 0.24, 1) var(--d, 0ms) backwards;
        }
        .cg-grid.is-in .cg-photo {
          animation: cgPhoto ${PHOTO_MS}ms cubic-bezier(0.22, 0.72, 0.24, 1) var(--d, 0ms) backwards;
        }

        /* Hover: the site's hairline, drawn under the name. The scale on the
           photo is a Tailwind transition and takes over once the entrance
           animation has finished and handed the element back. */
        .cg-rule {
          transform: scaleX(0);
          transform-origin: left center;
          transition: transform .45s cubic-bezier(0.22, 0.72, 0.24, 1);
        }
        .cg-tile:hover .cg-rule,
        .cg-tile:focus-visible .cg-rule { transform: scaleX(1) }

        @media (prefers-reduced-motion: reduce) {
          .cg-tile { opacity: 1 }
          .cg-grid.is-in .cg-tile,
          .cg-grid.is-in .cg-photo { animation: none }
          .cg-rule { transition: none }
        }
      `}</style>

      <div className="mx-auto max-w-420 px-3 sm:px-4 md:px-6 lg:px-8">
        {/* ── Masthead ─────────────────────────────────────────────────────── */}
        <div className="mb-8 text-center sm:mb-10">
          <span className="mb-3 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#e01a1b] sm:text-xs">
            <span aria-hidden className="h-px w-6 bg-[#e01a1b]" />
            Collections
          </span>
          <h2 className="mb-2 font-playfair text-2xl font-semibold tracking-tight text-[#1a1a1a] sm:text-3xl md:mb-3 md:text-4xl xl:text-[2.75rem]">
            Shop by Category
          </h2>
          <p className="mx-auto max-w-4xl text-sm leading-relaxed text-[#5f5550] md:text-base lg:text-[17px]">
            Explore our carefully curated collection of traditional textiles, organized by category
          </p>
        </div>

        {/* ── The tiles ────────────────────────────────────────────────────
            Columns rather than fixed widths, so the row always reaches the
            full container. Six across from lg; two per row on a phone. */}
        <div
          ref={gridRef}
          className="cg-grid grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-6 lg:gap-5"
        >
          {categories.map((category, index) => (
            <Link
              key={category.id}
              href={`/categories/${category.slug}`}
              className="cg-tile group relative block overflow-hidden rounded-[18px] bg-linear-to-br from-gray-100 to-gray-200 ring-1 ring-[#e8ded2] shadow-[0_10px_26px_-18px_rgba(74,50,38,0.5)] transition-all duration-300 hover:-translate-y-1 hover:ring-[#cdb9a5] hover:shadow-[0_26px_48px_-24px_rgba(74,50,38,0.55)]"
              style={{ '--d': `${index * TILE_STAGGER_MS}ms` } as React.CSSProperties}
            >
              <div className="relative aspect-[4/5] w-full overflow-hidden">
                {category.image ? (
                  <Image
                    src={category.image}
                    alt={category.name}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 17vw"
                    className="cg-photo object-cover transition-transform duration-[900ms] ease-out group-hover:scale-[1.06]"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <Package className="h-12 w-12 text-gray-400" />
                  </div>
                )}

                {/* Heavy enough at the foot to carry white type over a white
                    spec sheet, light enough at the top to leave the photo
                    alone. Two of these six images are outliers and this is
                    what keeps their names readable. */}
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0"
                  style={{
                    background:
                      'linear-gradient(to top, rgba(18,10,8,.88) 0%, rgba(18,10,8,.58) 26%, rgba(18,10,8,.14) 54%, rgba(18,10,8,0) 76%)',
                  }}
                />

                <div className="absolute inset-x-0 bottom-0 p-3 sm:p-3.5">
                  <h3 className="font-playfair text-[14px] font-semibold leading-snug tracking-tight text-white sm:text-[15px] lg:text-[16px]">
                    {category.name}
                  </h3>
                  {typeof category.productCount === 'number' && category.productCount > 0 && (
                    <p className="mt-0.5 text-[11px] tabular-nums text-white/75 sm:text-[11.5px]">
                      {category.productCount} {category.productCount === 1 ? 'item' : 'items'}
                    </p>
                  )}
                  <span aria-hidden className="cg-rule mt-2 block h-px w-full bg-[#e01a1b]" />
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-8 flex justify-center sm:mt-10">
          <Link
            href="/categories"
            className="btn-shine group inline-flex items-center gap-2 whitespace-nowrap rounded-full bg-[#e01a1b] px-6 py-2.5 text-[13.5px] font-semibold text-white shadow-[0_10px_24px_-12px_rgba(224,26,27,0.8)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#c41617] sm:px-7 sm:py-3 sm:text-sm"
          >
            View All Categories
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </section>
  );
}
