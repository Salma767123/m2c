'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { aboutBanner } from '@/components/mockData/aboutContent';

/**
 * The About banner.
 *
 * /about had no banner at all — the hero was commented out, so the page opened
 * on a breadcrumb and dropped straight into the mission statement, which was
 * left doing a banner's job while also being a mission statement. This is the
 * opening the page never had.
 *
 * ── The weave ─────────────────────────────────────────────────────────────
 *
 * The photograph is not one image. It is sixteen vertical strips, each showing
 * its own slice, and they arrive alternately from above and below — odd from
 * the top, even from the bottom — interlocking as they land. The picture is
 * literally woven together out of warp threads. Then a band of weft sweeps
 * down through it once and the type rises.
 *
 * It is the one metaphor this business owns, and it is specific to this photo:
 * the weaver is drawing warp across a handloom, so the animation is doing on
 * screen what her hands are doing in the frame.
 *
 * ── Why the strips are CSS backgrounds ────────────────────────────────────
 *
 * Each strip shows a slice of one image, done with the sprite trick: the
 * background is scaled to sixteen times the strip's width — which is exactly
 * the frame's width — and then offset per strip. That means one URL, one
 * network request, and no measuring: the arithmetic is pure CSS and stays
 * correct at any viewport width.
 *
 * The cost is that next/image cannot optimise a CSS background, which is why
 * the source was re-encoded by hand down to 280KB first.
 *
 * ── Why only on large screens ─────────────────────────────────────────────
 *
 * The sprite trick covers the frame only while the frame is wider than the
 * image's 1.5:1 — scale is driven by width, so a frame taller than that leaves
 * the strips short and gaps open at the bottom. That always holds from lg up
 * (1024px against a 34rem frame is 2.07:1) and never holds on a phone. So
 * below lg the banner is a single object-cover image that rises into place.
 * The weave is a large-screen flourish, not a thing that breaks small ones.
 */

/** Sixteen reads as threads; eight reads as panels, and thirty-two as noise. */
const STRIPS = 16;

const WARP_MS = 940;
/** Delay per step out from the middle, so the cloth pulls taut from its centre. */
const WARP_STEP_MS = 54;
/** The furthest strip from the centre, and therefore the last one to land. */
const WARP_LAST_MS = ((STRIPS - 1) / 2) * WARP_STEP_MS + WARP_MS;

/**
 * Which part of the frame survives the crop. 0 keeps the top, 1 the bottom;
 * 0.32 keeps the weaver's face, which sits high in the original.
 */
const FOCUS_Y = '32%';

export default function AboutBanner() {
  const frameRef = useRef<HTMLDivElement | null>(null);

  // Triggered on the next frame rather than during render, so the browser has
  // painted the from-state before the animation starts — otherwise the first
  // strips can appear already in place on a fast machine.
  //
  // Imperative, because a state flag here would re-render the whole banner to
  // change one class, and setState directly in an effect is a lint error in
  // this codebase besides.
  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const id = requestAnimationFrame(() => frame.classList.add('is-woven'));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <section className="relative bg-[#1a0f0c] font-sans">
      <style>{`
        /* ── The warp ──────────────────────────────────────────────────────
           Odd strips fall, even strips rise. scaleX comes in with them so the
           threads read as being pulled taut rather than merely sliding.

           The resting state is the normal one and the animation runs from
           .is-woven with fill-mode 'backwards'. That ordering matters more
           here than anywhere else on the site: this is the first thing on the
           page, above the fold. If the class never lands — no JS, hydration
           error, anything — the banner is simply there, whole. It is never
           blank waiting for a script. */
        @keyframes wvWarpDown {
          from { transform: translateY(-104%) scaleX(.78) }
          to   { transform: none }
        }
        @keyframes wvWarpUp {
          from { transform: translateY(104%) scaleX(.78) }
          to   { transform: none }
        }

        .wv-strip {
          position: absolute;
          top: 0;
          bottom: 0;
          width: calc(100% / ${STRIPS});
          background-repeat: no-repeat;
          /* Sixteen strip-widths across = one frame width. The horizontal
             offset is the standard sprite percentage: i / (n - 1). */
          background-size: ${STRIPS * 100}% auto;
          background-position-y: ${FOCUS_Y};
          will-change: transform;
        }

        .wv-frame.is-woven .wv-strip {
          animation-duration: ${WARP_MS}ms;
          animation-delay: var(--d, 0ms);
          animation-timing-function: cubic-bezier(0.16, 0.84, 0.24, 1);
          animation-fill-mode: backwards;
        }
        .wv-frame.is-woven .wv-strip:nth-child(odd)  { animation-name: wvWarpDown }
        .wv-frame.is-woven .wv-strip:nth-child(even) { animation-name: wvWarpUp }

        /* ── The weft ──────────────────────────────────────────────────────
           One band of fine horizontal lines passes down through the finished
           warp — the pick being beaten in. It exists for about eight tenths of
           a second and never comes back, which is the point: it is the last
           step of making the cloth, not a decoration sitting on top of it. */
        @keyframes wvWeft {
          0%   { transform: translateY(-120%); opacity: 0 }
          22%  { opacity: .85 }
          78%  { opacity: .5 }
          100% { transform: translateY(420%); opacity: 0 }
        }
        .wv-weft {
          position: absolute;
          left: 0; right: 0;
          height: 22%;
          opacity: 0;
          background: repeating-linear-gradient(
            180deg,
            rgba(255,244,228,.55) 0 1px,
            rgba(255,244,228,0) 1px 8px
          );
          mix-blend-mode: overlay;
          pointer-events: none;
        }
        .wv-frame.is-woven .wv-weft {
          animation: wvWeft 900ms cubic-bezier(0.4, 0, 0.5, 1) ${WARP_LAST_MS - 220}ms backwards;
        }

        /* ── The type ──────────────────────────────────────────────────────
           Arrives once the cloth is made, not alongside it. */
        @keyframes wvRise {
          from { opacity: 0; transform: translateY(18px) }
          to   { opacity: 1; transform: none }
        }
        .wv-frame.is-woven ~ .wv-copy .wv-line {
          animation: wvRise 720ms cubic-bezier(0.22, 0.72, 0.24, 1) var(--d, 0ms) backwards;
        }

        /* Below lg the strips are not used at all; this is the whole image. */
        @keyframes wvPhotoIn {
          from { opacity: 0; transform: scale(1.06) }
          to   { opacity: 1; transform: none }
        }
        .wv-frame.is-woven .wv-photo {
          animation: wvPhotoIn 1100ms cubic-bezier(0.22, 0.72, 0.24, 1) backwards;
        }

        @media (prefers-reduced-motion: reduce) {
          .wv-frame.is-woven .wv-strip,
          .wv-frame.is-woven .wv-photo,
          .wv-frame.is-woven ~ .wv-copy .wv-line { animation: none }
          .wv-frame.is-woven .wv-weft { animation: none; opacity: 0 }
        }
      `}</style>

      <div className="relative">
        {/* ── The frame ────────────────────────────────────────────────────
            A fixed height rather than an aspect ratio: the strip arithmetic
            needs the frame to stay wider than 1.5:1, and a ratio tall enough
            to look like a banner on a phone would break that on a laptop. */}
        <div
          ref={frameRef}
          className="wv-frame relative h-[26rem] w-full overflow-hidden bg-[#1a0f0c] sm:h-[30rem] lg:h-[34rem]"
        >
          {/* Small screens: one image, no slicing. See the note above. */}
          <div className="wv-photo absolute inset-0 lg:hidden">
            <Image
              src={aboutBanner.image}
              alt={aboutBanner.imageAlt}
              fill
              sizes="100vw"
              priority
              className="object-cover object-[50%_32%]"
            />
          </div>

          {/* Large screens: the warp. aria-hidden throughout — the image is
              described once by the <Image> above, and sixteen slices of one
              photograph are not sixteen pieces of content. */}
          <div aria-hidden className="hidden lg:block">
            {Array.from({ length: STRIPS }).map((_, i) => (
              <span
                key={i}
                className="wv-strip"
                style={{
                  left: `calc(${i} * 100% / ${STRIPS})`,
                  backgroundImage: `url(${aboutBanner.image})`,
                  backgroundPositionX: `${(i / (STRIPS - 1)) * 100}%`,
                  // Out from the middle, so the centre lands first.
                  '--d': `${Math.abs(i - (STRIPS - 1) / 2) * WARP_STEP_MS}ms`,
                } as React.CSSProperties}
              />
            ))}
          </div>

          <span aria-hidden className="wv-weft" />

          {/* Scrim. Bottom-up on small screens where the copy sits at the foot,
              left-to-right from lg where it sits beside the weaver rather than
              over her. Both land white type on an effective luminance well
              under 0.1, so contrast holds wherever the photograph is bright. */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 lg:hidden"
            style={{
              background:
                'linear-gradient(to top, rgba(20,10,8,.94) 0%, rgba(20,10,8,.74) 34%, rgba(20,10,8,.28) 64%, rgba(20,10,8,.12) 100%)',
            }}
          />
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 hidden lg:block"
            style={{
              background:
                'linear-gradient(90deg, rgba(20,10,8,.92) 0%, rgba(20,10,8,.72) 30%, rgba(20,10,8,.26) 58%, rgba(20,10,8,0) 80%)',
            }}
          />
        </div>

        {/* ── The copy ─────────────────────────────────────────────────────
            A sibling of the frame rather than a child, so the animation
            selector can wait on the cloth being finished before it runs. */}
        <div className="wv-copy pointer-events-none absolute inset-0 flex items-end lg:items-center">
          <div className="mx-auto w-full max-w-420 px-4 pb-9 sm:px-6 sm:pb-11 lg:px-8 lg:pb-0">
            <div className="pointer-events-auto max-w-full lg:max-w-2xl">
              <span
                className="wv-line mb-3 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#ffb3a6] sm:text-xs"
                style={{ '--d': `${WARP_LAST_MS - 60}ms` } as React.CSSProperties}
              >
                <span aria-hidden className="h-px w-7 bg-[#ffb3a6]" />
                {aboutBanner.eyebrow}
              </span>

              <h1
                className="wv-line font-playfair text-3xl font-semibold leading-[1.08] tracking-tight text-white sm:text-4xl md:text-5xl lg:text-6xl"
                style={{ '--d': `${WARP_LAST_MS + 40}ms` } as React.CSSProperties}
              >
                {aboutBanner.title}
              </h1>

              <p
                className="wv-line mt-4 max-w-xl text-sm leading-relaxed text-white/85 sm:text-base lg:mt-5 lg:text-[17px]"
                style={{ '--d': `${WARP_LAST_MS + 150}ms` } as React.CSSProperties}
              >
                {aboutBanner.subtitle}
              </p>

              <span
                className="wv-line mt-6 inline-block lg:mt-7"
                style={{ '--d': `${WARP_LAST_MS + 260}ms` } as React.CSSProperties}
              >
                <Link
                  href={aboutBanner.ctaHref}
                  className="group inline-flex items-center gap-2 rounded-full bg-[#e01a1b] px-6 py-3 text-[13px] font-semibold uppercase tracking-[0.12em] text-white shadow-[0_14px_32px_-14px_rgba(224,26,27,0.9)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#c41617] sm:px-7 sm:text-sm"
                >
                  {aboutBanner.ctaLabel}
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
