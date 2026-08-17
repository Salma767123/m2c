"use client";

import Link from "next/link";
import { useState, useEffect, useRef, useCallback } from "react";
import { bannerService, BannerImage, bannerHref } from "@/services/bannerService";

type Slide = Pick<BannerImage, "id" | "imageUrl" | "altText" | "displayOrder" | "linkType" | "linkValue">;

// How long each banner holds before the next weaves in — 6s, then 4s, then 3s
// all read as sluggish in review, so 2.4s.
//
// Note this is the whole slot, not the still time: the ~700ms weave runs at the
// start of it, leaving about 1.7s of stationary artwork. That is short for
// copy-heavy banners (the usual advice for those is 5–7s) and it only works
// while the headlines stay to a few words. If a banner ever carries a
// paragraph, this needs to go back up.
//
// The progress rail's fill is driven by this same constant and is what calls
// next(), so the bar and the rotation cannot drift apart — changing this number
// changes both.
const AUTOPLAY_MS = 2400;

// The frame's shape, and the only thing that sets its height. The artwork is
// 3.5:1; holding the frame at 3.0 stands it ~17% taller, paid for with ~7% off
// each side. That is the whole trade, and it is the only one available until
// taller artwork exists — squeezing further starts cutting into headlines.
//
// It is deliberately a single number with no min-height and no vh ceiling
// beside it. Both of those used to add height by making the frame squarer than
// the picture on some screens and not others, so the crop changed per device —
// the min-height alone took ~60% off the sides of a phone. One ratio means a
// phone shows exactly what the desktop shows, just smaller.
//
// Set this to 2 when the 2:1 exports land: same frame, ~75% taller, no crop.
const BANNER_RATIO = 3.0;

// Full bleed — no container, no side margin. At 100vw the same ratio also buys
// height for free: the frame is ~19% wider than the contained version was, so
// it stands ~19% taller without cropping a single pixel more.
const CONTAINER = "w-full";

// The weave. Ten columns, alternating in from top and bottom a beat apart.
// Twelve looked busy on a phone; eight lost the effect on a wide monitor.
//
// Both numbers were raised together, and they have to be: WEAVE_MS is how long
// one column takes, WEAVE_STAGGER is the beat between them. Slowing the columns
// alone makes them overlap into a single soft wipe — the gap between them is
// what you actually read as weaving. Total run is now WEAVE_MS + 9 × STAGGER,
// about 700ms against the 3000ms hold, so roughly a quarter of each slide is
// spent changing. Much past this and the banner is in motion more than it is
// still.
const STRIPS = 10;
const WEAVE_MS = 450;
const WEAVE_STAGGER = 28;
const WEAVE_TOTAL = WEAVE_MS + WEAVE_STAGGER * (STRIPS - 1);

// Two banner edges resting behind the front one — depth borrowed from a
// coverflow without its cost. They never move: the stack says "there are more
// of these", the weave says "here comes the next one", and a card flying
// forward while the picture also assembled itself would tell both stories at
// once. Kept to a ~1.6% inset per layer so the banner barely gives up any size.
// Columns don't all travel the same distance. Every one arriving from exactly
// one frame-height away made the weave read as a machine shutter; alternating
// the run gives the columns different speeds over the same duration, which is
// what a hand-thrown weave actually looks like.
const WEAVE_RUN = [101, 138, 116, 165];

const SWIPE_PX = 48;                // travel before a drag counts as a swipe

/**
 * M2C HERO — a full-bleed promotional banner that WEAVES between slides.
 *
 * Each banner is cut into ten vertical columns; odd columns drop from the top,
 * even ones rise from the bottom, each a beat behind the last, so the next
 * banner knits itself shut over the one before. This shop sells woven cloth —
 * the transition is the product, not a stock effect.
 *
 * All the motion lives in the moment of change. Between slides the banner is
 * perfectly still: no zoom, no drift. Six seconds of slow creep is tiring; one
 * strong moment is memorable, and it leaves the artwork alone to be read.
 *
 * Swipe, keyboard, autoplay and hover-pause all survive. Fully dynamic (admin
 * banner API); click-through preserved via bannerHref().
 */
export default function HeroSection() {
  const [current, setCurrent] = useState(0);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [loading, setLoading] = useState(true);
  const [paused, setPaused] = useState(false);
  const [docHidden, setDocHidden] = useState(false);
  const [reduce, setReduce] = useState(false);
  const [dragging, setDragging] = useState(false);

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

  // Swipe as a gesture, not as direct manipulation. Dragging the artwork under
  // the finger belonged to a reel that slid sideways; a weave has nothing to
  // drag, so the pointer only decides which way to go.
  const onPointerDown = (e: React.PointerEvent) => {
    if (slides.length <= 1) return;
    startX.current = e.clientX;
    moved.current = false;
    setDragging(true);
    setPaused(true);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    if (Math.abs(e.clientX - startX.current) > 6) moved.current = true;
  };
  const endDrag = (e: React.PointerEvent) => {
    if (!dragging) return;
    const dx = e.clientX - startX.current;
    if (dx < -SWIPE_PX) next();
    else if (dx > SWIPE_PX) prev();
    setDragging(false);
    setPaused(false);
  };

  // One rule, every screen: the frame is the shape of the picture.
  const frameStyle: React.CSSProperties = { aspectRatio: `${BANNER_RATIO}` };

  if (loading) {
    return (
      <section className="w-full bg-[#faf7f1] py-3 font-sans md:py-5" aria-hidden="true">
        <div className={CONTAINER}>
          <div className="w-full animate-pulse rounded-2xl bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200" style={frameStyle} />
        </div>
      </section>
    );
  }
  if (slides.length === 0) return null;

  const multi = slides.length > 1;

  return (
    <section
      className="relative w-full bg-[#faf7f1] font-sans"
      role="region"
      aria-roledescription="carousel"
      aria-label="Promotional banners"
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <style>{`
        @keyframes m2cReelProgress { from { transform: scaleX(0) } to { transform: scaleX(1) } }
      `}</style>

      <div className={CONTAINER}>
      <div className="relative">

      {/* No stacked edges any more — they existed to give a contained card some
          depth. Edge to edge there is nothing for a card to sit on. */}
      <div
        className={`relative z-10 w-full overflow-hidden bg-[#1a1416] ${dragging ? "cursor-grabbing" : "cursor-grab"} select-none`}
        style={frameStyle}
        // Hover-pause belongs to the banner itself, not the section. On the
        // section it covered the full page width, so drifting anywhere near the
        // hero — including the empty margin beside it — froze the rotation and
        // made the carousel look stuck.
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => { if (!dragging) setPaused(false); }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        {slides.map((slide, index) => {
          const href = bannerHref(slide);
          const active = index === current;

          // The outgoing banner is never animated away — it simply sits there
          // until the incoming weave has covered it, then blinks out. Animating
          // both at once opens gaps between the columns mid-transition.
          const layer = (
            <>
              {Array.from({ length: STRIPS }, (_, i) => {
                const fromTop = i % 2 === 0;
                // Each column is a FULL-SIZE copy of the banner, clipped to its
                // own slice. Slicing instead by narrow boxes with an oversized
                // image inside meant every column carried its own rounding
                // error, and where two of them disagreed by half a pixel a
                // hairline seam showed through the middle of the picture.
                // Clipping a full-size layer has no per-column arithmetic at
                // all, and the 0.5px bleed closes the joins for good.
                const l = (i * 100) / STRIPS;
                const r = 100 - ((i + 1) * 100) / STRIPS;
                const run = WEAVE_RUN[i % WEAVE_RUN.length];
                return (
                  <span
                    key={i}
                    aria-hidden
                    className="absolute inset-0"
                    style={{
                      clipPath: `inset(-2px calc(${r}% - 0.5px) -2px calc(${l}% - 0.5px))`,
                      transform: active ? "translateY(0)" : `translateY(${fromTop ? "-" : ""}${run}%)`,
                      transition: reduce
                        ? "none"
                        : active
                          ? `transform ${WEAVE_MS}ms cubic-bezier(0.22,1,0.36,1) ${i * WEAVE_STAGGER}ms`
                          : `transform 0s linear ${WEAVE_TOTAL + 60}ms`,
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={slide.imageUrl}
                      alt=""
                      draggable={false}
                      loading={index === 0 ? "eager" : "lazy"}
                      fetchPriority={index === 0 && i === 0 ? "high" : "auto"}
                      className="absolute inset-0 h-full w-full object-cover object-center"
                    />
                  </span>
                );
              })}
            </>
          );

          const cls = "absolute inset-0 block overflow-hidden";
          const style: React.CSSProperties = {
            zIndex: active ? 2 : 1,
            opacity: active ? 1 : 0,
            // The delay belongs to hiding only. Applied in both directions it
            // also held the INCOMING banner invisible for the whole weave, so
            // the columns animated behind an opacity of 0 and the slide simply
            // appeared, finished. Arriving must be instant; leaving waits until
            // the weave above it has closed.
            transition: reduce || active ? "none" : `opacity 0s linear ${WEAVE_TOTAL + 60}ms`,
          };

          return href ? (
            <Link
              key={slide.id}
              href={href}
              className={cls}
              style={style}
              tabIndex={active ? 0 : -1}
              aria-hidden={!active}
              aria-label={slide.altText || `Banner ${index + 1}`}
              onClickCapture={(e) => { if (moved.current) { e.preventDefault(); e.stopPropagation(); } }}
              draggable={false}
            >
              {layer}
            </Link>
          ) : (
            <div key={slide.id} className={cls} style={style} aria-hidden={!active}>{layer}</div>
          );
        })}

        {/* Edge navigation, lifted above the banner layers */}
        {multi && (
          <>
            <button
              onClick={prev}
              aria-label="Previous banner"
              className="group absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/25 p-2 text-white/70 backdrop-blur-sm transition-colors hover:bg-black/45 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 sm:left-5"
            >
              <span className="block text-2xl leading-none transition-transform duration-300 group-hover:-translate-x-0.5">‹</span>
            </button>
            <button
              onClick={next}
              aria-label="Next banner"
              className="group absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/25 p-2 text-white/70 backdrop-blur-sm transition-colors hover:bg-black/45 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 sm:right-5"
            >
              <span className="block text-2xl leading-none transition-transform duration-300 group-hover:translate-x-0.5">›</span>
            </button>
          </>
        )}

      </div>
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
