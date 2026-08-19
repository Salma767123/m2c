'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Sparkles, ArrowUpRight } from 'lucide-react';
import { categoryService } from '@/services/categoryService';

interface SubItem { id: string; name: string; slug: string }
interface RibbonCategory {
  id: string;
  name: string;
  slug: string;
  subcategories: SubItem[];
}

const EASE = 'cubic-bezier(0.22,1,0.36,1)';
const PREVIEW_SUBS = 4;

/**
 * SMART CATEGORY RIBBON — a typographic discovery layer (no images, no cards, no
 * side panels). Categories read as editorial labels ("TABLE / LINEN"). Hovering or
 * focusing one draws a thin animated underline and crossfades a single, compact
 * "smart suggestion" line beneath the ribbon — a few subcategories inline + "+N more"
 * + "View all". The suggestion line animates its own small height (grid-rows), so it
 * never drops a heavy panel over the hero. Fully data-driven; adapts to any number of
 * subcategories. Horizontally scrollable + tap-friendly on mobile.
 */
export default function CategoryStrip() {
  const [categories, setCategories] = useState<RibbonCategory[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    categoryService
      .getAllCategories({ status: 'ACTIVE', showRootOnly: 'true', includeSubcategories: 'true', sortBy: 'sortOrder', sortOrder: 'asc' })
      .then((res) => {
        if (cancelled) return;
        const list = (res.success && res.data ? res.data : []).slice(0, 18).map((c): RibbonCategory => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
          subcategories: (c.subcategories || [])
            .filter((s) => (s.status ? s.status === 'ACTIVE' : true))
            .map((s) => ({ id: s.id, name: s.name, slug: s.slug })),
        }));
        setCategories(list);
      })
      .catch(() => { if (!cancelled) setCategories([]); });
    return () => { cancelled = true; };
  }, []);

  const activeCat = useMemo(() => categories.find((c) => c.id === activeId) || null, [categories, activeId]);

  const open = (id: string) => { if (closeTimer.current) clearTimeout(closeTimer.current); setActiveId(id); };
  const scheduleClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setActiveId(null), 160);
  };
  useEffect(() => () => { if (closeTimer.current) clearTimeout(closeTimer.current); }, []);

  if (categories.length === 0) return null;

  return (
    <nav
      aria-label="Browse categories"
      className="relative z-20 bg-[#FBF8F2] border-b border-[#EFE8DB] font-sans"
      onMouseLeave={scheduleClose}
    >
      <style>{`
        @keyframes m2cPrev { from { opacity: 0; transform: translateY(-3px) } to { opacity: 1; transform: translateY(0) } }
        @media (prefers-reduced-motion: reduce) { .m2c-prev { animation: none !important } }
      `}</style>

      <div className="max-w-7xl 2xl:max-w-420 mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
        {/* ── Ribbon: editorial category labels ─────────────────────────────── */}
        <div className="relative">
          <div className="flex items-center gap-6 sm:gap-8 overflow-x-auto scrollbar-hide py-2.5 pr-10">
            {/* EXPLORE — discovery anchor */}
            <Link
              href="/categories"
              onMouseEnter={scheduleClose}
              onFocus={scheduleClose}
              className="group/exp flex shrink-0 items-center gap-1.5 pr-5 sm:pr-6 border-r border-[#E7DFCF]"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#C7A66A] transition-transform duration-[220ms] group-hover/exp:rotate-[18deg] group-hover/exp:scale-110" style={{ transitionTimingFunction: EASE }} strokeWidth={2} />
              <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#252525]">Explore</span>
            </Link>

            {/* Category labels */}
            {categories.map((cat) => {
              const active = cat.id === activeId;
              const hasSubs = cat.subcategories.length > 0;
              const words = cat.name.trim().split(/\s+/);
              return (
                <Link
                  key={cat.id}
                  href={`/products?category=${cat.slug}`}
                  onMouseEnter={() => hasSubs && open(cat.id)}
                  onFocus={() => hasSubs && open(cat.id)}
                  // First interaction reveals the suggestion line (covers touch/keyboard);
                  // a second click follows through to the category page. No subs = navigate.
                  onClick={(e) => { if (hasSubs && activeId !== cat.id) { e.preventDefault(); open(cat.id); } }}
                  aria-expanded={hasSubs ? active : undefined}
                  className="group/cat relative flex shrink-0 flex-col items-start py-0.5"
                >
                  <span className="flex items-start gap-1">
                    <span className={`text-[12px] uppercase tracking-[0.14em] whitespace-nowrap transition-all duration-200 ${active ? 'font-bold text-[#1c1c1c]' : 'font-semibold text-[#787066] group-hover/cat:text-[#1c1c1c]'}`}>
                      {words.map((w, i) => (
                        <span key={i}>
                          {i > 0 && <span className="mx-1 font-normal text-[#C7A66A]">/</span>}
                          {w}
                        </span>
                      ))}
                    </span>
                    {hasSubs && (
                      <span className={`text-[8px] font-bold leading-none tabular-nums transition-colors duration-200 ${active ? 'text-[#D51F26]' : 'text-[#C7A66A]/80'}`}>
                        {cat.subcategories.length}
                      </span>
                    )}
                  </span>

                  {/* animated active/hover underline */}
                  <span
                    className={`mt-1.5 h-[1.5px] w-full origin-left rounded-full transition-transform duration-[220ms] ${active ? 'scale-x-100 bg-[#D51F26]' : 'scale-x-0 bg-[#C7A66A] group-hover/cat:scale-x-100'}`}
                    style={{ transitionTimingFunction: EASE }}
                    aria-hidden="true"
                  />
                </Link>
              );
            })}

            <span className="shrink-0 w-1" aria-hidden="true" />
          </div>

          {/* right-edge fade — hints the ribbon scrolls */}
          <span className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-[#FBF8F2] to-transparent" aria-hidden="true" />
        </div>

        {/* ── Smart suggestion line — small height animation, crossfades per category ── */}
        <div
          className="grid transition-[grid-template-rows] duration-[240ms]"
          style={{ gridTemplateRows: activeCat && activeCat.subcategories.length > 0 ? '1fr' : '0fr', transitionTimingFunction: EASE }}
          onMouseEnter={() => activeId && open(activeId)}
          onMouseLeave={scheduleClose}
        >
          <div className="overflow-hidden">
            {activeCat && activeCat.subcategories.length > 0 && (
              <div
                key={activeCat.id}
                className="m2c-prev flex items-center gap-x-3 gap-y-1 flex-wrap border-t border-[#EFE8DB] py-2"
                style={{ animation: `m2cPrev 220ms ${EASE} both` }}
              >
                {/* active category tag */}
                <span className="flex shrink-0 items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#D51F26]" aria-hidden="true" />
                  <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#1c1c1c]">{activeCat.name}</span>
                </span>
                <span className="h-3 w-px bg-[#E7DFCF]" aria-hidden="true" />

                {/* inline subcategory suggestions */}
                <span className="flex min-w-0 flex-wrap items-center">
                  {activeCat.subcategories.slice(0, PREVIEW_SUBS).map((sub, i) => (
                    <span key={sub.id} className="flex items-center">
                      {i > 0 && <span className="mx-1.5 text-[11px] text-[#C7A66A]/60" aria-hidden="true">·</span>}
                      <Link
                        href={`/products?category=${activeCat.slug}&subcategory=${sub.slug}`}
                        className="group/sub relative text-[12.5px] text-[#5b544b] hover:text-[#1c1c1c] transition-colors duration-200"
                      >
                        {sub.name}
                        <span className="absolute -bottom-0.5 left-0 h-px w-full origin-left scale-x-0 bg-[#C7A66A] transition-transform duration-200 ease-out group-hover/sub:scale-x-100" aria-hidden="true" />
                      </Link>
                    </span>
                  ))}
                  {activeCat.subcategories.length > PREVIEW_SUBS && (
                    <Link
                      href={`/products?category=${activeCat.slug}`}
                      className="ml-2 text-[12px] font-semibold text-[#B4894A] hover:text-[#8f6c38] transition-colors duration-200"
                    >
                      +{activeCat.subcategories.length - PREVIEW_SUBS} more
                    </Link>
                  )}
                </span>

                {/* view all */}
                <Link
                  href={`/products?category=${activeCat.slug}`}
                  className="group/all ml-auto shrink-0 inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#D51F26] hover:text-[#B01A20] transition-colors duration-200"
                >
                  View all
                  <ArrowUpRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover/all:translate-x-0.5 group-hover/all:-translate-y-0.5" strokeWidth={2.25} />
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
