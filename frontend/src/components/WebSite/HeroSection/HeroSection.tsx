"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { bannerService, BannerImage } from "@/services/bannerService";

const fallbackSlides = [
  {
    id: "1",
    imageUrl: "/assets/images/hero/hs1.webp",
    altText: "Hero slide 1",
    displayOrder: 0,
  },
  {
    id: "2",
    imageUrl: "/assets/images/hero/hs2.webp",
    altText: "Hero slide 2",
    displayOrder: 1,
  },
  {
    id: "3",
    imageUrl: "/assets/images/hero/hs3.webp",
    altText: "Hero slide 3",
    displayOrder: 2,
  },
  {
    id: "4",
    imageUrl: "/assets/images/hero/hs4.webp",
    altText: "Hero slide 4",
    displayOrder: 3,
  },
];

export default function HeroSection() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [slides, setSlides] =
    useState<
      Pick<BannerImage, "id" | "imageUrl" | "altText" | "displayOrder">[]
    >(fallbackSlides);

  // Fetch dynamic banners
  useEffect(() => {
    const fetchBanners = async () => {
      try {
        const response = await bannerService.getActiveBanners();
        if (
          response.success &&
          Array.isArray(response.data) &&
          response.data.length > 0
        ) {
          setSlides(response.data);
        }
      } catch (error) {
        // Keep fallback slides on error
        console.error("Failed to fetch banners:", error);
      }
    };
    fetchBanners();
  }, []);

  // Auto-play functionality
  useEffect(() => {
    if (!isAutoPlaying || slides.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [isAutoPlaying, currentSlide, slides.length]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft" && currentSlide > 0) {
        prevSlide();
      } else if (
        event.key === "ArrowRight" &&
        currentSlide < slides.length - 1
      ) {
        nextSlide();
      } else if (event.key === " ") {
        event.preventDefault();
        setIsAutoPlaying(!isAutoPlaying);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentSlide, isAutoPlaying, slides.length]);

  // Pause auto-play on hover (desktop only)
  const handleMouseEnter = () => {
    setIsAutoPlaying(false);
  };

  const handleMouseLeave = () => {
    setIsAutoPlaying(true);
  };

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
    setIsAutoPlaying(false);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
    setIsAutoPlaying(false);
  };

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
    setIsAutoPlaying(false);
  };

  if (slides.length === 0) return null;

  return (
    <section
      className="relative bg-[#e8e8e8] font-sans overflow-hidden"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      role="region"
      aria-label="Hero image carousel"
    >
      <div className="relative w-full h-[150px] min-[400px]:h-[170px] sm:h-[250px] md:h-[350px] lg:h-[450px] xl:h-[650px] 2xl:h-[750px]">
        {/* Hero Images - fully visible on all screen sizes */}
        {slides.map((slide, index) => (
          <div
            key={slide.id}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
              index === currentSlide ? "opacity-100" : "opacity-0"
            }`}
            aria-hidden={index !== currentSlide}
          >
            <Image
              src={slide.imageUrl}
              alt={slide.altText || `Banner slide ${index + 1}`}
              fill
              className={`object-contain md:object-cover object-center ${
                index === currentSlide ? "animate-ken-burns" : ""
              }`}
              priority={index === 0}
              sizes="100vw"
              unoptimized={slide.imageUrl.startsWith("http")}
            />
          </div>
        ))}

        {/* Subtle edge vignette for a premium, framed look (desktop) */}
        <div className="pointer-events-none absolute inset-0 z-[5] hidden md:block bg-linear-to-t from-black/15 via-transparent to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[5] h-24 hidden md:block bg-linear-to-t from-black/20 to-transparent" />

        {/* Navigation Controls */}
        <button
          onClick={prevSlide}
          className={`group absolute left-2 sm:left-4 lg:left-6 top-1/2 transform -translate-y-1/2 z-20 bg-white/80 text-gray-900 hover:bg-[#e01a1b] hover:text-white p-1.5 sm:p-2 lg:p-3.5 rounded-full transition-all duration-300 hover:scale-110 hover:shadow-[0_8px_24px_rgba(224,26,27,0.35)] shadow-lg backdrop-blur-md border border-white/60 focus:outline-none focus:ring-2 focus:ring-[#e01a1b] focus:ring-offset-2 ${
            currentSlide === 0 ? "hidden" : "block"
          }`}
          aria-label="Previous slide"
          disabled={currentSlide === 0}
        >
          <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 transition-transform duration-300 group-hover:-translate-x-0.5" />
        </button>

        <button
          onClick={nextSlide}
          className={`group absolute right-2 sm:right-4 lg:right-6 top-1/2 transform -translate-y-1/2 z-20 bg-white/80 text-gray-900 hover:bg-[#e01a1b] hover:text-white p-1.5 sm:p-2 lg:p-3.5 rounded-full transition-all duration-300 hover:scale-110 hover:shadow-[0_8px_24px_rgba(224,26,27,0.35)] shadow-lg backdrop-blur-md border border-white/60 focus:outline-none focus:ring-2 focus:ring-[#e01a1b] focus:ring-offset-2 ${
            currentSlide === slides.length - 1 ? "hidden" : "block"
          }`}
          aria-label="Next slide"
          disabled={currentSlide === slides.length - 1}
        >
          <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 transition-transform duration-300 group-hover:translate-x-0.5" />
        </button>

        {/* Slide indicators — elegant pills, active one shows an auto-play progress fill */}
        {slides.length > 1 && (
          <div className="absolute bottom-2.5 sm:bottom-4 lg:bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 sm:gap-2">
            {slides.map((slide, index) => (
              <button
                key={slide.id}
                onClick={() => goToSlide(index)}
                aria-label={`Go to slide ${index + 1}`}
                aria-current={index === currentSlide}
                className={`relative h-1.5 sm:h-2 rounded-full overflow-hidden transition-all duration-500 ${
                  index === currentSlide
                    ? "w-7 sm:w-10 bg-white/50"
                    : "w-1.5 sm:w-2 bg-white/50 hover:bg-white/80"
                }`}
              >
                {index === currentSlide && (
                  <span
                    key={`${slide.id}-${isAutoPlaying}`}
                    className={`absolute inset-0 rounded-full bg-[#e01a1b] ${
                      isAutoPlaying ? "animate-hero-progress" : ""
                    }`}
                    style={!isAutoPlaying ? { transform: "scaleX(1)", transformOrigin: "left" } : undefined}
                  />
                )}
              </button>
            ))}
          </div>
        )}

        {/* Touch/Swipe Area for Mobile */}
        <div
          className="absolute inset-0 z-10 md:hidden"
          onTouchStart={(e) => {
            const touch = e.touches[0];
            const startX = touch.clientX;

            const handleTouchEnd = (endEvent: TouchEvent) => {
              const endTouch = endEvent.changedTouches[0];
              const endX = endTouch.clientX;
              const diff = startX - endX;

              if (Math.abs(diff) > 50) {
                if (diff > 0 && currentSlide < slides.length - 1) {
                  nextSlide();
                } else if (diff < 0 && currentSlide > 0) {
                  prevSlide();
                }
              }

              document.removeEventListener("touchend", handleTouchEnd);
            };

            document.addEventListener("touchend", handleTouchEnd);
          }}
        />

        {/* Screen reader announcements */}
        <div className="sr-only" aria-live="polite" aria-atomic="true">
          Slide {currentSlide + 1} of {slides.length}
        </div>
      </div>
    </section>
  );
}
