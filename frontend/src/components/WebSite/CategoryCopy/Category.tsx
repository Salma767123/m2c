'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Swiper, SwiperSlide } from 'swiper/react';
import { FreeMode, Mousewheel } from 'swiper/modules';
import type { Swiper as SwiperType } from 'swiper';
import { categoryService } from '@/services/categoryService';
import { Package, ChevronLeft, ChevronRight } from 'lucide-react';
import Reveal from '@/components/WebSite/Shared/Reveal';

// Import Swiper styles
import 'swiper/css';
import 'swiper/css/free-mode';

/**
 * One definition for both arrows.
 *
 * `disabled:opacity-0` rather than a greyed-out state: an arrow at the end of
 * the row has nothing to do, and a dimmed control that still looks like a
 * control invites the click anyway.
 */
const ARROW =
  'absolute z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full ' +
  'bg-white/95 text-[#1a1a1a] ring-1 ring-black/10 shadow-[0_6px_20px_rgba(0,0,0,0.14)] backdrop-blur ' +
  'transition-all duration-300 hover:bg-[#e01a1b] hover:text-white hover:ring-[#e01a1b] ' +
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#e01a1b]/50 ' +
  'disabled:pointer-events-none disabled:opacity-0 sm:flex';

/**
 * Centred on the IMAGE, not on the slide. Each slide is a square picture plus
 * a caption beneath it, so a plain top-1/2 would sit the arrows low, floating
 * over the words. Subtract the caption block — its margin plus one line — then
 * halve what is left.
 */
const ARROW_TOP = { top: 'calc((100% - 2.75rem) / 2)' } as const;

// Type definitions
interface Category {
  id: string;
  name: string;
  slug: string;
  image?: string;
}

export default function Category() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
  /** Whether the row has anywhere left to go, which is all the arrows need. */
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);
  const swiperRef = useRef<SwiperType | null>(null);

  // Fetch categories from backend
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await categoryService.getAllCategories({
          status: 'ACTIVE',
          showRootOnly: 'true',
          sortBy: 'sortOrder',
          sortOrder: 'asc'
        });
        
        if (response.success && response.data) {
          setCategories(response.data);
        }
      } catch (error) {
        console.error('Failed to fetch categories:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  // Handle image load errors
  const handleImageError = (imageSrc: string) => {
    setImageErrors((prev) => new Set(prev).add(imageSrc));
  };

  // Handle swiper events
  const goPrev = () => swiperRef.current?.slidePrev();
  const goNext = () => swiperRef.current?.slideNext();

  const handleSlideChange = (swiper: SwiperType) => {
    setAtStart(swiper.isBeginning);
    setAtEnd(swiper.isEnd);
  };

  // Keyboard navigation
  const handleKeyDown = (event: React.KeyboardEvent) => {
    switch (event.key) {
      case 'ArrowLeft':
        event.preventDefault();
        if (swiperRef.current) {
          swiperRef.current.slidePrev();
        }
        break;
      case 'ArrowRight':
        event.preventDefault();
        if (swiperRef.current) {
          swiperRef.current.slideNext();
        }
        break;
      case 'Home':
        event.preventDefault();
        if (swiperRef.current) {
          swiperRef.current.slideTo(0);
        }
        break;
      case 'End':
        event.preventDefault();
        if (swiperRef.current) {
          swiperRef.current.slideTo(categories.length - 1);
        }
        break;
    }
  };

  // Show loading state
  if (loading) {
    /* Skeleton mirrors the loaded section (header row + responsive category grid). */
    return (
      <section className="py-6 sm:py-8 lg:py-10 bg-white font-sans">
        <div className="max-w-7xl 2xl:max-w-420 mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4 sm:gap-6 lg:gap-8 mb-5 sm:mb-6 lg:mb-8">
            <div className="flex-1 space-y-3">
              <div className="h-7 md:h-8 lg:h-10 w-48 md:w-64 bg-gray-200 rounded animate-pulse mx-auto lg:mx-0" />
              <div className="h-4 md:h-5 w-full max-w-md bg-gray-100 rounded animate-pulse mx-auto lg:mx-0" />
            </div>
            <div className="h-10 w-32 sm:w-40 bg-gray-200 rounded-lg animate-pulse shrink-0 mx-auto lg:mx-0" />
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 gap-3 sm:gap-4 md:gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="text-center">
                <div className="relative w-full aspect-square mb-3 overflow-hidden rounded-md bg-gray-200 animate-pulse" />
                <div className="h-4 w-20 bg-gray-200 rounded animate-pulse mx-auto" />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // Don't show section if no categories
  if (categories.length === 0) {
    return null;
  }

  return (
    <section 
      className="py-6 sm:py-8 lg:py-10 bg-white font-sans overflow-hidden"
      aria-labelledby="category-heading"
    >
      <div className="max-w-7xl 2xl:max-w-420 mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
        {/* Header Section */}
        <Reveal className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4 sm:gap-6 lg:gap-8 mb-5 sm:mb-6 lg:mb-8">
          <div className="text-center lg:text-left flex-1">
            <span className="inline-flex items-center gap-2 text-[11px] sm:text-xs font-semibold uppercase tracking-[0.18em] text-[#e01a1b] mb-3">
              <span className="h-px w-6 bg-[#e01a1b]" />
              Categories
            </span>
            <h2
              id="category-heading"
              className="font-playfair text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl font-semibold text-[#1a1a1a] mb-2 sm:mb-3 md:mb-4 tracking-tight"
            >
              Shop by Category
            </h2>
            <p className="text-sm sm:text-base md:text-lg lg:text-xl text-gray-500 max-w-full lg:max-w-3xl xl:max-w-4xl mx-auto lg:mx-0 leading-relaxed">
              Explore our carefully curated collection of traditional textiles, organized by category
            </p>
          </div>

          {/* View All Categories Button */}
          <div className="flex justify-center lg:justify-end lg:ml-8 shrink-0">
            <Link
              href="/categories"
              className="btn-shine inline-flex items-center justify-center bg-[#e01a1b] text-white px-6 md:px-8 py-2.5 md:py-3 rounded-full hover:bg-[#c41617] focus:outline-none focus:ring-2 focus:ring-[#e01a1b]/40 focus:ring-offset-2 shadow-[0_6px_20px_rgba(224,26,27,0.3)] hover:shadow-[0_12px_30px_rgba(224,26,27,0.45)] hover:-translate-y-0.5 transition-all duration-300 font-semibold text-xs sm:text-sm md:text-base whitespace-nowrap"
              aria-label="View all categories"
            >
              <span className="hidden sm:inline">View All Categories</span>
              <span className="sm:hidden">View All</span>
            </Link>
          </div>
        </Reveal>

        {/* Categories Swiper */}
        {/* The padding IS the arrows' lane. They used to sit at left-1/right-1,
            which put them on top of the first and last photograph.

            Pulling them outward instead was the obvious move and does not work:
            this section is overflow-hidden, and between roughly 1024px and
            1230px the container is nearly as wide as the viewport, so an arrow
            hung off the edge gets its outer rim sliced off. Insetting the row
            by 3rem gives them somewhere to stand that exists at every width. */}
        <div
          className="relative sm:px-12"
          onKeyDown={handleKeyDown}
          tabIndex={0}
          role="region"
          aria-label="Categories navigation"
        >
          {/* ── Arrows ────────────────────────────────────────────────────
              Replacing the pagination dots. Two 8px dots at the foot of the
              row were the only visible control, they said nothing about which
              direction they moved, and clicking one jumped a whole screen of
              cards.

              Centred on the IMAGE, not on the slide: each slide is a square
              picture plus a caption underneath, so `top-1/2` would have set
              them low, floating over the words. The offset subtracts the
              caption block — its margin plus one line — before halving.

              Kept inside the row rather than hung off its edges, because the
              section is overflow-hidden and anything sticking out would simply
              be cut off. */}
          <button
            type="button"
            onClick={goPrev}
            disabled={atStart}
            aria-label="Previous categories"
            className={`${ARROW} left-0`}
            style={ARROW_TOP}
          >
            <ChevronLeft className="h-5 w-5" strokeWidth={2.2} />
          </button>
          <button
            type="button"
            onClick={goNext}
            disabled={atEnd}
            aria-label="Next categories"
            className={`${ARROW} right-0`}
            style={ARROW_TOP}
          >
            <ChevronRight className="h-5 w-5" strokeWidth={2.2} />
          </button>

          <Swiper
            modules={[FreeMode, Mousewheel]}
            spaceBetween={16}
            slidesPerView={2}
            /**
             * The dots used to be the only way through this row.
             *
             * Only Pagination was registered, so the mouse wheel and trackpad
             * did nothing at all — that needs the Mousewheel module — and while
             * Swiper's core drag was technically live, without grabCursor
             * nothing on screen said so. What was left was a pair of dots that
             * jumped eight cards at a time.
             *
             * freeMode lets it move with the gesture instead of by the page,
             * and `sticky` settles it flush against a card when you let go, so
             * it stays neat rather than stopping mid-tile.
             */
            grabCursor
            freeMode={{ enabled: true, sticky: true, momentum: true, momentumRatio: 0.55 }}
            /**
             * forceToAxis so only a genuinely horizontal gesture moves the row —
             * otherwise scrolling down the page would be swallowed by whatever
             * carousel the pointer happened to be over. releaseOnEdges hands the
             * scroll back to the page once the row has nowhere left to go.
             */
            mousewheel={{ forceToAxis: true, releaseOnEdges: true, sensitivity: 0.7 }}
            speed={450}
            onSwiper={(swiper) => {
              swiperRef.current = swiper;
            }}
            onSlideChange={handleSlideChange}
            /* freeMode moves without firing slideChange for every pixel, so the
               arrows would stay lit past the end without this. */
            onProgress={handleSlideChange}
            onResize={handleSlideChange}
            loop={false}
            watchSlidesProgress={true}
            breakpoints={{
              320: {
                slidesPerView: 2,
                spaceBetween: 12,
              },
              480: {
                slidesPerView: 3,
                spaceBetween: 16,
              },
              640: {
                slidesPerView: 4,
                spaceBetween: 20,
              },
              768: {
                slidesPerView: 5,
                spaceBetween: 24,
              },
              1024: {
                slidesPerView: 6,
                spaceBetween: 28,
              },
              1280: {
                slidesPerView: 7,
                spaceBetween: 32,
              },
              1536: {
                slidesPerView: 8,
                spaceBetween: 36,
              },
            }}
            className="categories-swiper"
            aria-label="Product categories carousel"
          >
            {categories.map((category, index) => (
              <SwiperSlide key={`${category.id}-${index}`}>
                <Link
                  href={`/categories/${category.slug}`}
                  className="group text-center block w-full focus:outline-none focus:ring-2 focus:ring-[#e01a1b]/40 focus:ring-offset-2 rounded-2xl"
                  aria-label={`Browse ${category.name} category`}
                >
                  {/* Category Image */}
                  <div className="relative w-full aspect-square mb-3 sm:mb-4 overflow-hidden rounded-2xl ring-1 ring-black/5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:shadow-[0_18px_40px_rgba(0,0,0,0.12)] group-hover:-translate-y-1.5 group-hover:ring-[#e01a1b]/20 transition-all duration-500">
                    {category.image && !imageErrors.has(category.image) ? (
                      <Image
                        src={category.image}
                        alt={`${category.name} category image`}
                        fill
                        sizes="(max-width: 480px) 50vw, (max-width: 640px) 33vw, (max-width: 768px) 25vw, (max-width: 1024px) 20vw, (max-width: 1280px) 16vw, (max-width: 1536px) 14vw, 12vw"
                        className="object-cover group-hover:scale-110 transition-transform duration-[900ms] ease-out"
                        onError={() => handleImageError(category.image!)}
                        loading={index < 4 ? 'eager' : 'lazy'}
                        priority={index < 4}
                      />
                    ) : (
                      <div className="w-full h-full bg-linear-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                        <Package className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400" />
                      </div>
                    )}
                    
                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-linear-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity duration-300 rounded-xl" aria-hidden="true"></div>
                    
                    {/* Hover Effect Ring */}
                    <div className="absolute inset-0 rounded-2xl ring-2 ring-transparent group-hover:ring-[#e01a1b]/30 group-focus:ring-[#e01a1b]/30 transition-all duration-300" aria-hidden="true"></div>
                  </div>

                  {/* Category Name */}
                  <h3 className="text-xs sm:text-sm md:text-base font-semibold text-gray-700 group-hover:text-[#e01a1b] group-focus:text-[#e01a1b] transition-colors duration-200 px-1 leading-tight break-words">
                    {category.name}
                  </h3>
                </Link>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>

        {/* Mobile View All Button (Bottom) */}
        <div className="flex justify-center mt-6 sm:mt-8 lg:hidden">
          <Link
            href="/categories"
            className="btn-shine inline-flex items-center justify-center bg-[#e01a1b] text-white px-6 sm:px-8 py-3 sm:py-3.5 rounded-full hover:bg-[#c41617] focus:outline-none focus:ring-2 focus:ring-[#e01a1b]/40 focus:ring-offset-2 shadow-[0_6px_20px_rgba(224,26,27,0.3)] hover:shadow-[0_12px_30px_rgba(224,26,27,0.45)] hover:-translate-y-0.5 transition-all duration-300 font-semibold text-sm sm:text-base"
            aria-label="View all categories"
          >
            View All Categories
          </Link>
        </div>
      </div>

      {/* Custom Styles */}
      <style jsx global>{`
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        
        /* Smooth scroll behavior */
        .categories-swiper {
          scroll-behavior: smooth;
        }
        
        /* Custom scrollbar for touch devices */
        .categories-swiper .swiper-wrapper {
          scroll-snap-type: x mandatory;
        }
        
        .categories-swiper .swiper-slide {
          scroll-snap-align: start;
        }
      `}</style>
    </section>
  );
}
