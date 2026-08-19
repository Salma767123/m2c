'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import { missionStatement } from '@/components/mockData/aboutContent';

/**
 * The mission statement.
 *
 * Two versions of this were wrong before this one. It began as a full-bleed
 * photograph under a black overlay with white type centred on it — sitting
 * directly beneath a banner that is a full-bleed photograph under a scrim with
 * white type on it, using the same photograph. Replacing that with plain
 * centred type fixed the repetition and produced a different problem: 57 words
 * at heading size, centred, on a flat ground, with nothing else in the frame.
 * It read as unstyled rather than as restrained.
 *
 * So: a subject, an asymmetry, and a reason for the eye to move.
 *
 *  · The photograph returns, but contained and portrait rather than
 *    full-bleed and landscape — the opposite shape to the banner, which is
 *    what stops the two reading as the same device twice.
 *  · The statement splits at its own sentence break. The first sentence is
 *    the claim and carries the size; the second is the reasoning and steps
 *    down. One block at one size was the wall.
 *  · Left-aligned. At this measure, centred text makes the reader hunt for
 *    the start of every line.
 *
 * The warp threads behind the photograph are the tie back to the banner: the
 * same idea, drawn rather than photographed, and they draw themselves down as
 * the section arrives.
 */

const REVEAL_THRESHOLD = 0.3;
const REVEAL_MARGIN = '0px 0px -12% 0px';

/** How many warp threads run behind the portrait. */
const THREADS = 9;

const THREAD_MS = 900;
const THREAD_STEP_MS = 55;
/** The last thread lands here; the copy follows it. */
const THREADS_DONE_MS = (THREADS - 1) * THREAD_STEP_MS + THREAD_MS;

export default function AboutMission() {
  const rootRef = useRef<HTMLDivElement | null>(null);

  // Same pattern as the rest of the site: the class is added imperatively so
  // firing costs no re-render, and the observer disconnects on the first hit.
  //
  // The resting state is the finished section and the animations run from
  // .is-in with fill-mode 'backwards', so if this never fires the section is
  // simply there — nothing is stranded at opacity 0 waiting for a script.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    if (typeof IntersectionObserver === 'undefined') {
      root.classList.add('is-in');
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            root.classList.add('is-in');
            io.disconnect();
          }
        }
      },
      { threshold: REVEAL_THRESHOLD, rootMargin: REVEAL_MARGIN }
    );

    io.observe(root);
    return () => io.disconnect();
  }, []);

  return (
    <section className="relative overflow-hidden border-b border-[#efe4d5] bg-linear-to-b from-[#fdfaf6] via-[#f7efe4] to-[#fdfaf6] py-14 font-sans sm:py-16 lg:py-20">
      <style>{`
        /* ── The warp ──────────────────────────────────────────────────────
           Nine threads drawn behind the portrait, drawing themselves downward
           in sequence. transform on scaleY rather than an animated height, so
           it stays on the compositor. */
        @keyframes amThread {
          from { transform: scaleY(0) }
          to   { transform: scaleY(1) }
        }
        .am-thread {
          position: absolute;
          top: 0;
          bottom: 0;
          width: 1px;
          transform-origin: top center;
          background: linear-gradient(180deg, rgba(122,15,16,0) 0%, rgba(122,15,16,.22) 18%, rgba(122,15,16,.22) 82%, rgba(122,15,16,0) 100%);
        }
        .am-root.is-in .am-thread {
          animation: amThread ${THREAD_MS}ms cubic-bezier(0.22, 0.72, 0.24, 1) var(--d, 0ms) backwards;
        }

        /* The portrait settles onto the threads once they are drawn. */
        @keyframes amPhoto {
          from { opacity: 0; transform: translateY(22px) scale(.97) }
          to   { opacity: 1; transform: none }
        }
        .am-root.is-in .am-photo {
          animation: amPhoto 900ms cubic-bezier(0.22, 0.72, 0.24, 1) 240ms backwards;
        }

        @keyframes amLine {
          from { opacity: 0; transform: translateY(16px) }
          to   { opacity: 1; transform: none }
        }
        .am-root.is-in .am-line {
          animation: amLine 700ms cubic-bezier(0.22, 0.72, 0.24, 1) var(--d, 0ms) backwards;
        }

        @media (prefers-reduced-motion: reduce) {
          .am-root.is-in .am-thread,
          .am-root.is-in .am-photo,
          .am-root.is-in .am-line { animation: none }
        }
      `}</style>

      <div
        ref={rootRef}
        className="am-root relative mx-auto grid max-w-6xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)] lg:gap-16 lg:px-8"
      >
        {/* ── The portrait ─────────────────────────────────────────────────
            Capped and centred on small screens: a 4:5 portrait at full phone
            width would be taller than the viewport and push the statement it
            is supposed to introduce entirely off-screen. */}
        <div className="relative mx-auto w-full max-w-[17rem] sm:max-w-[19rem] lg:mx-0 lg:max-w-none">
          {/* Warp threads, running past the photograph top and bottom so they
              read as continuing beyond the frame rather than decorating it. */}
          <div aria-hidden className="pointer-events-none absolute -inset-y-8 inset-x-0">
            {Array.from({ length: THREADS }).map((_, i) => (
              <span
                key={i}
                className="am-thread"
                style={{
                  left: `${((i + 0.5) / THREADS) * 100}%`,
                  '--d': `${i * THREAD_STEP_MS}ms`,
                } as React.CSSProperties}
              />
            ))}
          </div>

          <div className="am-photo relative aspect-[4/5] w-full overflow-hidden rounded-[2rem] bg-[#efe4d5] shadow-[0_30px_60px_-34px_rgba(74,40,26,0.65)] ring-1 ring-[#e6d6c2]">
            <Image
              src={missionStatement.image}
              alt={missionStatement.imageAlt}
              fill
              sizes="(max-width: 1024px) 19rem, 30vw"
              className="object-cover"
            />
          </div>
        </div>

        {/* ── The statement ────────────────────────────────────────────────
            Left-aligned from lg, where the measure is long enough that centred
            text costs real reading effort. */}
        <div className="text-center lg:text-left">
          <span
            className="am-line mb-5 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#c41617] sm:text-xs"
            style={{ '--d': `${THREADS_DONE_MS - 380}ms` } as React.CSSProperties}
          >
            <span aria-hidden className="h-px w-7 bg-[#c41617]" />
            {missionStatement.title}
          </span>

          <p
            className="am-line font-playfair text-xl leading-[1.35] tracking-tight text-[#1a1a1a] sm:text-2xl md:text-[28px] lg:text-[32px]"
            style={{ '--d': `${THREADS_DONE_MS - 300}ms` } as React.CSSProperties}
          >
            {missionStatement.lead}
          </p>

          {/* #5f5550 measures 6.1:1 on this ground. */}
          <p
            className="am-line mt-5 text-sm leading-relaxed text-[#5f5550] sm:text-base lg:text-[17px]"
            style={{ '--d': `${THREADS_DONE_MS - 200}ms` } as React.CSSProperties}
          >
            {missionStatement.support}
          </p>

          <span
            aria-hidden
            className="am-line mt-8 block h-px w-24 mx-auto lg:mx-0"
            style={{
              background: 'linear-gradient(90deg, rgba(122,15,16,.45) 0%, rgba(122,15,16,0) 100%)',
              '--d': `${THREADS_DONE_MS - 100}ms`,
            } as React.CSSProperties}
          />
        </div>
      </div>
    </section>
  );
}
