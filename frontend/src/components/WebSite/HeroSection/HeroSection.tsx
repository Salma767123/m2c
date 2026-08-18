"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect, useRef, useCallback } from "react";
import { ArrowRight } from "lucide-react";
import { bannerService, BannerImage, bannerHref } from "@/services/bannerService";

type Slide = Pick<BannerImage, "id" | "imageUrl" | "altText" | "displayOrder" | "linkType" | "linkValue">;

const AUTOPLAY_MS = 3500;
const SLIDE_VW = 82;         // active slide width (vw); the rest peeks at the edges
const GAP_PX = 14;

/**
 * M2C COMMERCE REEL — a compact, immersive shopping carousel (not a full-width
 * banner). The active slide sits at ~82vw with the previous/next slides peeking
 * at the edges, signalling horizontal browsing. Drag / swipe / keyboard /
 * autoplay, a hairline numbered progress rail that doubles as the autoplay
 * timer, and a data-driven "Shop now" action shown only when a banner actually
 * links somewhere. No invented labels or metadata — the banner artwork leads.
 * Fully dynamic (admin banner API); click-through preserved via bannerHref().
 */
export default function HeroSection() {
  const [current, setCurrent] = useState(0);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [loading, setLoading] = useState(true);
  const [paused, setPaused] = useState(false);
  const [docHidden, setDocHidden] = useState(false);
  const [reduce, setReduce] = useState(false);
  const [drag, setDrag] = useState(0);
  const [dragging, setDragging] = useState(false);

  const viewportRef = useRef<HTMLDivElement>(null);
  const startX = useRef(0);
  const moved = useRef(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const on = () => setReduce(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const response = await bannerService.getActiveBanners();
        if (response.success && Array.isArray(response.data) && response.data.length > 0) {
          setSlides(response.data);
        }
      } catch (error) {
        console.error("Failed to fetch banners:", error);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Pause autoplay when the tab is hidden.
  useEffect(() => {
    const on = () => setDocHidden(document.hidden);
    document.addEventListener("visibilitychange", on);
    return () => document.removeEventListener("visibilitychange", on);
  }, []);

  const next = useCallback(() => setCurrent((p) => (p + 1) % slides.length), [slides.length]);
  const prev = useCallback(() => setCurrent((p) => (p - 1 + slides.length) % slides.length), [slides.length]);
  const go = useCallback((i: number) => setCurrent(i), []);

  useEffect(() => {
    if (slides.length <= 1) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") prev();
      else if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [slides.length, next, prev]);

  const frozen = paused || docHidden;

  // ── Drag / swipe (unified pointer) ──
  const onPointerDown = (e: React.PointerEvent) => {
    if (slides.length <= 1) return;
    startX.current = e.clientX;
    moved.current = false;
    setDragging(true);
    setPaused(true);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    const dx = e.clientX - startX.current;
    if (Math.abs(dx) > 6) moved.current = true;
    setDrag(dx);
  };
  const endDrag = () => {
    if (!dragging) return;
    const w = viewportRef.current?.clientWidth || 1;
    const th = w * 0.12;
    if (drag < -th) next();
    else if (drag > th) prev();
    setDrag(0);
    setDragging(false);
    setPaused(false);
  };

  if (loading) {
    return (
      <section className="bg-[#faf7f1] font-sans overflow-hidden py-3 md:py-5" aria-hidden="true">
        <div className="mx-auto w-[82vw] h-[clamp(260px,50vh,540px)] rounded-2xl bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-pulse" />
      </section>
    );
  }
  if (slides.length === 0) return null;

  const multi = slides.length > 1;
  const trackX = `calc(${(100 - SLIDE_VW) / 2}vw - ${current} * (${SLIDE_VW}vw + ${GAP_PX}px) + ${drag}px)`;

  return (
    <section
      className="relative bg-[#faf7f1] font-sans overflow-hidden py-3 md:py-5"
      role="region"
      aria-roledescription="carousel"
      aria-label="Promotional banners"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => { if (!dragging) setPaused(false); }}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <style>{`
        @keyframes m2cReelProgress { from { transform: scaleX(0) } to { transform: scaleX(1) } }
      `}</style>

      {/* Reel viewport */}
      <div
        ref={viewportRef}
        className={`relative h-[clamp(260px,50vh,540px)] ${dragging ? "cursor-grabbing" : "cursor-grab"} select-none`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onPointerLeave={endDrag}
      >
        <div
          className="flex h-full items-stretch"
          style={{
            gap: `${GAP_PX}px`,
            transform: `translateX(${trackX})`,
            transition: dragging || reduce ? "none" : "transform 600ms cubic-bezier(0.22,1,0.36,1)",
          }}
        >
          {slides.map((slide, index) => {
            const href = bannerHref(slide);
            const active = index === current;
            const inner = (
              <>
                <Image
                  src={slide.imageUrl}
                  alt={slide.altText || `Banner ${index + 1}`}
                  fill
                  className="object-cover object-center"
                  priority={index === 0}
                  loading={index === 0 ? undefined : "lazy"}
                  sizes="82vw"
                  unoptimized={slide.imageUrl.startsWith("http")}
                  draggable={false}
                />
                {/* Data-driven action — only when this banner actually links somewhere */}
                {href && active && (
                  <>
                    <span className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/45 to-transparent" />
                    <span className="group/cta absolute bottom-4 left-4 sm:bottom-5 sm:left-6 inline-flex items-center gap-2 rounded-full bg-white/95 px-4 py-2 text-[13px] font-semibold text-[#1a1a1a] shadow-sm transition-all duration-300 hover:bg-white">
                      Shop now
                      <ArrowRight className="h-4 w-4 text-[#e01a1b] transition-transform duration-300 group-hover/cta:translate-x-0.5" />
                    </span>
                  </>
                )}
              </>
            );
            const cls = `relative h-full w-[82vw] shrink-0 overflow-hidden rounded-2xl bg-[#ece7dd] transition-[opacity,transform] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${active ? "opacity-100 scale-100" : "opacity-45 scale-[0.94]"}`;
            return href ? (
              <Link
                key={slide.id}
                href={href}
                className={cls}
                tabIndex={active ? 0 : -1}
                aria-hidden={!active}
                aria-label={slide.altText || `Banner ${index + 1}`}
                onClickCapture={(e) => { if (moved.current) { e.preventDefault(); e.stopPropagation(); } }}
                draggable={false}
              >
                {inner}
              </Link>
            ) : (
              <div key={slide.id} className={cls} aria-hidden={!active}>{inner}</div>
            );
          })}
        </div>

        {/* Minimal edge navigation */}
        {multi && (
          <>
            <button
              onClick={prev}
              aria-label="Previous banner"
              className="group absolute left-[4vw] top-1/2 z-10 -translate-y-1/2 text-[#1a1a1a]/40 transition-colors hover:text-[#1a1a1a] focus:outline-none focus-visible:text-[#e01a1b]"
            >
              <span className="block text-2xl leading-none transition-transform duration-300 group-hover:-translate-x-0.5">‹</span>
            </button>
            <button
              onClick={next}
              aria-label="Next banner"
              className="group absolute right-[4vw] top-1/2 z-10 -translate-y-1/2 text-[#1a1a1a]/40 transition-colors hover:text-[#1a1a1a] focus:outline-none focus-visible:text-[#e01a1b]"
            >
              <span className="block text-2xl leading-none transition-transform duration-300 group-hover:translate-x-0.5">›</span>
            </button>
          </>
        )}
      </div>

        {/* Progress rails — one per banner, on their own row beneath the frame
            rather than laid over the artwork.

            Over the picture they had to be white at 45% with a drop shadow to
            survive whatever was underneath, and on the Black Friday banner they
            landed in the middle of the gold ribbon. Below the frame they sit on
            a known background, so the track can be dark and the red fill reads
            at full strength.

            The active rail fills across its own run, so the duration of every
            banner is visible: you can see the change coming and how long is
            left. It also drives the rotation — when the fill completes it calls
            next(), which is why hover-pausing the banner pauses the bar and the
            two can never drift apart.

            Tighter on phones. The rails were fixed at desktop proportions, so
            against a banner only ~110px tall on a 390px screen the row of
            dashes plus 34px of padding read as a second element competing with
            the image rather than an index under it. */}
        {multi && (
          <div className="flex items-center justify-center gap-1.5 px-4 pb-2.5 pt-2 sm:gap-2.5 sm:pb-5 sm:pt-3.5">
            {slides.map((slide, index) => {
              const active = index === current;
              return (
                <button
                  key={slide.id}
                  onClick={() => go(index)}
                  aria-label={`Go to banner ${index + 1}`}
                  aria-current={active}
                  className="group py-1.5 focus:outline-none sm:py-2"
                >
                  <span
                    className={`relative block h-[2.5px] overflow-hidden rounded-full transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] sm:h-[3px] ${active ? "w-9 sm:w-16 md:w-24" : "w-4 group-hover:w-6 sm:w-7 sm:group-hover:w-10"}`}
                    style={{ background: "rgba(26,20,22,.14)" }}
                  >
                    {active && (
                      <span
                        key={`${current}-${frozen}-${reduce}`}
                        className="absolute inset-0 origin-left rounded-full bg-[#e01a1b]"
                        style={reduce
                          ? { transform: "scaleX(1)" }
                          : { animation: `m2cReelProgress ${AUTOPLAY_MS}ms linear forwards`, animationPlayState: frozen ? "paused" : "running" }}
                        onAnimationEnd={() => { if (!frozen) next(); }}
                      />
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Reduced-motion / fallback autoplay (progress bar doesn't animate to drive it) */}
      {reduce && <ReduceAutoplay paused={frozen} count={slides.length} onTick={next} current={current} />}

      <div className="sr-only" aria-live="polite" aria-atomic="true">Banner {current + 1} of {slides.length}</div>
    </section>
  );
}

/** Timer-based autoplay used only under prefers-reduced-motion. */
function ReduceAutoplay({ paused, count, onTick, current }: { paused: boolean; count: number; onTick: () => void; current: number }) {
  useEffect(() => {
    if (paused || count <= 1) return;
    const t = setTimeout(onTick, AUTOPLAY_MS);
    return () => clearTimeout(t);
  }, [paused, count, onTick, current]);
  return null;
}
