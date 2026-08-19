'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Package, LifeBuoy, Search, MessageCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { categoryService } from '@/services/categoryService';
import Reveal from '@/components/WebSite/Shared/Reveal';
import CategoryHero from '@/components/WebSite/Shared/CategoryHero';
import TopSelling from '@/components/WebSite/Featured/TopSelling';
import NoticeBoard from '@/components/WebSite/NoticeBoard/NoticeBoard';
import SectionBackdrop from '@/components/WebSite/Shared/SectionBackdrop';

interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  subcategoryCount?: number;
}

export default function Categories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await categoryService.getAllCategories({
          status: 'ACTIVE',
          showRootOnly: 'true',
          sortBy: 'sortOrder',
          sortOrder: 'asc'
        });
        
        console.log('Categories response:', response);
        
        if (response.success && response.data) {
          console.log('Categories data:', response.data);
          setCategories(response.data);
        } else {
          setError('Failed to load categories');
        }
      } catch (err) {
        console.error('Failed to fetch categories:', err);
        setError('Failed to load categories');
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  if (loading) {
    /* Skeleton mirrors the loaded page (banner + intro + category grid). */
    return (
      <div className="min-h-screen bg-gray-50 font-sans">
        {/* Banner skeleton — light neutral, same height ladder as loaded banner. */}
        <div className="relative h-40 sm:h-52 md:h-60 lg:h-80 overflow-hidden bg-gray-100">
          <div className="absolute inset-0 flex items-center justify-center animate-pulse">
            <div className="text-center px-4 space-y-3 w-full max-w-2xl">
              <div className="h-10 md:h-12 lg:h-14 w-64 md:w-80 bg-gray-300 rounded-md mx-auto" />
              <div className="h-4 md:h-5 w-full max-w-md bg-gray-200 rounded mx-auto" />
              <div className="h-4 md:h-5 w-3/4 max-w-md bg-gray-200 rounded mx-auto" />
            </div>
          </div>
        </div>

        {/* Body skeleton — intro text + category card grid. */}
        <div className="py-12">
          <div className="max-w-7xl 2xl:max-w-420 mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-start mb-12 space-y-3">
              <div className="h-7 w-56 bg-gray-200 rounded animate-pulse" />
              <div className="h-5 w-80 max-w-full bg-gray-100 rounded animate-pulse" />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="text-center">
                  <div className="relative w-full aspect-square mb-4 overflow-hidden rounded-md bg-gray-200 animate-pulse" />
                  <div className="h-5 w-32 bg-gray-200 rounded animate-pulse mx-auto" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 font-sans">
        <div className="relative min-h-40 sm:min-h-52 md:min-h-60 lg:min-h-80 overflow-hidden bg-gray-200">
          <div className="absolute inset-0 bg-black/60" />
          <div className="relative z-10 flex items-center justify-center min-h-40 sm:min-h-52 md:min-h-60 lg:min-h-80 px-3 sm:px-4 py-5 sm:py-6 md:py-8">
            <div className="text-center text-white">
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold font-sans mb-3 sm:mb-4 break-words">
                Error Loading Categories
              </h1>
              <p className="text-sm sm:text-lg md:text-xl">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* The same banner /products uses. This page had its own copy of the
          idea — a flat bg-black/60 over the photograph, an eyebrow ruled on
          one side only, and no animation — which is how two versions of one
          thing drift apart. Wording is unchanged. */}
      <CategoryHero
        eyebrow="Our Collections"
        title="Shop by Categories"
        blurb="Discover our wide range of traditional textile products organized by categories"
        image="/assets/images/categories/cb5.jpg"
      />

      {/* Categories Content */}
      <div className="py-8 sm:py-10 lg:py-12">
        <div className="max-w-7xl 2xl:max-w-420 mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
          <Reveal className="text-start mb-6 sm:mb-8 lg:mb-12">
            <span className="inline-flex items-center gap-2 text-[11px] sm:text-xs font-semibold uppercase tracking-[0.18em] text-[#e01a1b] mb-3">
              <span className="h-px w-6 bg-[#e01a1b]" />
              Categories
            </span>
            <h2 className="font-playfair text-xl sm:text-2xl md:text-3xl font-semibold text-[#1a1a1a] tracking-tight">Browse Our Collections</h2>
            <p className="text-sm sm:text-base lg:text-lg text-gray-600 max-w-2xl">
              Find exactly what you're looking for in our carefully curated categories.
            </p>
          </Reveal>

          {categories.length === 0 ? (
            <div className="text-center py-12 sm:py-16 lg:py-20">
              <Package className="mx-auto h-14 w-14 sm:h-16 sm:w-16 lg:h-20 lg:w-20 text-gray-300 mb-4 sm:mb-6" />
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">No Categories Available</h3>
              <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">
                Categories will appear here once they are added.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
              {categories.map((category, index) => (
                <Reveal key={category.id} delay={index * 90}>
                  <Link
                    href={`/categories/${category.slug}`}
                    className="group block text-center"
                  >
                    {/* Category Image */}
                    <div className="relative w-full aspect-square mb-4 overflow-hidden rounded-2xl ring-1 ring-black/5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] group-hover:shadow-[0_18px_40px_rgba(0,0,0,0.12)] group-hover:-translate-y-1.5 group-hover:ring-[#e01a1b]/20 transition-all duration-500 bg-linear-to-br from-gray-100 to-gray-200">
                      {category.image ? (
                        <Image
                          src={category.image}
                          alt={category.name}
                          fill
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                          className="object-cover group-hover:scale-110 transition-transform duration-[900ms] ease-out"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                          }}
                        />
                      ) : null}
                      {!category.image && (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-16 h-16 text-gray-400" />
                        </div>
                      )}
                    </div>

                    {/* Category Name */}
                    <h3 className="text-lg font-semibold text-[#1a1a1a] group-hover:text-[#e01a1b] transition-colors">
                      {category.name}
                    </h3>
                    {category.subcategoryCount !== undefined && category.subcategoryCount > 0 && (
                      <p className="text-sm text-gray-500 mt-1">
                        {category.subcategoryCount} subcategories
                      </p>
                    )}
                  </Link>
                </Reveal>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Top-selling products — same live rail as the home page */}
      <TopSelling />

      {/* What's Happening — live offers / coupons board */}
      <NoticeBoard />

      {/* ── Need Help ─────────────────────────────────────────────────────
          The card was bg-[#f7f7f5] on a bg-gray-50 page — #f7f7f5 against
          #f9fafb, which is the same colour to any eye — held apart only by a
          1px ring and a 2px shadow. It did not read as a card at all, just as
          text that happened to be centred at the bottom of the page.

          A warm ground of its own, a mark to arrive at, and motion. The words
          are untouched.

          The card is a plain div and the animation lives on its contents. A
          <Reveal> carries `will-change: transform`, which opens a containing
          block that survives `.is-visible` resetting the transform — the trap
          that catches absolutely-positioned children elsewhere in this
          codebase, and SectionBackdrop is nothing but absolutely-positioned
          children. */}
      <div className="pb-10 sm:pb-12 lg:pb-16">
        <div className="max-w-7xl 2xl:max-w-420 mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl bg-linear-to-br from-[#fdf8f6] via-white to-[#faece8] p-6 text-center ring-1 ring-[#f0dcd6] shadow-[0_20px_60px_-34px_rgba(26,20,22,0.35)] sm:p-8 lg:p-12">
            {/* The same drifting dot grid, blur blobs and outline rings the
                product sections use — so the card has something living in it
                rather than being a still panel. */}
            <SectionBackdrop />

            <div className="relative">
              {/* Staggered rather than simultaneous: 0, 90, 180, 270ms, so the
                  block assembles downward instead of appearing all at once. */}
              <Reveal className="mb-5 flex justify-center">
                <span className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-linear-to-b from-[#fdf1ef] to-[#f9e3df] text-[#e01a1b] ring-1 ring-[#f0d5cf]">
                  {/* Two halos on the same loop, the second offset, so the
                      pulse reads as continuous rather than as a blink. */}
                  <span aria-hidden className="absolute inset-0 animate-ping rounded-2xl bg-[#e01a1b]/10 motion-reduce:animate-none" />
                  <span
                    aria-hidden
                    className="absolute inset-0 animate-ping rounded-2xl bg-[#e01a1b]/[0.07] motion-reduce:animate-none"
                    style={{ animationDelay: '900ms' }}
                  />
                  <LifeBuoy className="relative h-8 w-8" strokeWidth={1.6} />
                </span>
              </Reveal>

              <Reveal delay={90}>
                <h2 className="font-playfair text-xl font-semibold tracking-tight text-[#1a1a1a] sm:text-2xl md:text-3xl">
                  Need Help?
                </h2>
                {/* A short seam under the name — the one piece of brand colour
                    that stops the three lines reading as one centred stack. */}
                <span aria-hidden className="mx-auto mt-4 block h-[3px] w-12 rounded-full bg-[#e01a1b] sm:w-14" />
              </Reveal>

              <Reveal delay={180}>
                <p className="mx-auto mt-5 max-w-xl text-sm text-balance text-gray-600 sm:text-base">
                  Use our search feature or contact our support team for assistance finding specific products.
                </p>
              </Reveal>

              <Reveal delay={270}>
                <div className="mt-6 flex flex-col justify-center gap-3 sm:mt-8 sm:flex-row sm:gap-4">
                  <Link
                    href="/products"
                    className="btn-shine group inline-flex items-center justify-center gap-2 rounded-full bg-[#e01a1b] px-6 py-3 text-sm font-semibold text-white shadow-[0_6px_20px_rgba(224,26,27,0.3)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#c41617] hover:shadow-[0_12px_30px_rgba(224,26,27,0.45)] sm:text-base"
                  >
                    <Search className="h-4 w-4 transition-transform duration-300 group-hover:scale-110" />
                    Search Products
                  </Link>
                  {/* The outline button had no lift while the one beside it
                      did, so the pair behaved like two different controls. */}
                  <Link
                    href="/contact"
                    className="group inline-flex items-center justify-center gap-2 rounded-full border border-[#e01a1b] bg-white/70 px-6 py-3 text-sm font-semibold text-[#e01a1b] backdrop-blur transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#e01a1b] hover:text-white hover:shadow-[0_12px_30px_rgba(224,26,27,0.28)] sm:text-base"
                  >
                    <MessageCircle className="h-4 w-4 transition-transform duration-300 group-hover:scale-110" />
                    Contact Support
                  </Link>
                </div>
              </Reveal>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
