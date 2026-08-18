'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import { aboutContent } from '@/components/mockData/aboutContent';

/**
 * The story, as an editorial spread.
 *
 * Three versions preceded this one: five identical alternating rows, then the
 * same rows hung off a numbered timeline (the most recognisable layout on the
 * web, and it read as a component rather than a page), then this spread with a
 * 9rem chapter numeral behind the panel.
 *
 * The numeral is gone. It was not the wrong idea, it was in the wrong place —
 * a graphic that size needs clean space around it and it was sitting at the
 * junction of the photograph's edge and the panel's corner, the busiest point
 * in the composition. The scale contrast it was providing now comes from the
 * chapter TITLE, which is where the weight belongs: the headline should be the
 * big thing on a page, not a decorative number. The sequence survives as a
 * small marker on a rule.
 *
 * What carries the layout:
 *
 *  · Bleed. The photographs run off the edge of the screen. This is the
 *    single biggest difference between a designed page and a template.
 *  · Overlap. The text panel lies across the photograph's inner edge rather
 *    than sitting beside it — at every width, phone included.
 *  · Two kinds of motion. Each chapter arrives from the edge it bleeds off,
 *    and once it has arrived the photograph keeps drifting inside its frame
 *    against the panel, so the section stays alive rather than firing once
 *    and going inert.
 *
 * Measured with getBoundingClientRect() in a rAF loop, not a scroll listener:
 * <body> is the scroll container in this app (h-full plus overflow-x: hidden
 * forces overflow-y to auto) and scroll events do not bubble out of an
 * element, so a window listener never fires. The loop runs only while the
 * section is on screen.
 */

/** How far the photograph drifts inside its frame, in pixels either way. */
const PHOTO_DRIFT = 38;

/** The panel drifts against it, so the two layers visibly separate. */
const PANEL_DRIFT = -14;

/** The word sits furthest back, so it moves least. */
const WORD_DRIFT = 20;


/** A chapter arrives once it is properly into the viewport. */
const ARRIVE_MARGIN = '0px 0px -18% 0px';

export default function AboutStory() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const rowsRef = useRef<(HTMLDivElement | null)[]>([]);

  // ── Parallax ────────────────────────────────────────────────────────────
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const reduced =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced || typeof IntersectionObserver === 'undefined') return;

    let raf = 0;
    let running = false;

    const frame = () => {
      const vh = window.innerHeight;
      for (const row of rowsRef.current) {
        if (!row) continue;
        const rect = row.getBoundingClientRect();
        // Five rows is cheap, but there is no reason to write styles for the
        // ones nowhere near the screen.
        if (rect.bottom < -200 || rect.top > vh + 200) continue;

        // -1 entering from the bottom, 0 dead centre, +1 leaving the top.
        const centre = rect.top + rect.height / 2;
        const t = Math.max(-1, Math.min(1, (vh / 2 - centre) / (vh / 2 + rect.height / 2)));

        row.style.setProperty('--py', `${(t * PHOTO_DRIFT).toFixed(1)}px`);
        row.style.setProperty('--cy', `${(t * PANEL_DRIFT).toFixed(1)}px`);
        row.style.setProperty('--wy', `${(t * WORD_DRIFT).toFixed(1)}px`);
      }
      if (running) raf = requestAnimationFrame(frame);
    };

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && !running) {
            running = true;
            raf = requestAnimationFrame(frame);
          } else if (!entry.isIntersecting && running) {
            running = false;
            cancelAnimationFrame(raf);
          }
        }
      },
      { threshold: 0 }
    );

    io.observe(section);
    frame();

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      io.disconnect();
    };
  }, []);

  // ── Arrival ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const rows = rowsRef.current.filter(Boolean) as HTMLDivElement[];
    if (rows.length === 0) return;

    // The hidden state is the exception, not the default — a row whose
    // observer never fires stays readable rather than invisible.
    if (typeof IntersectionObserver === 'undefined') {
      rows.forEach((row) => row.classList.add('is-in'));
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-in');
            io.unobserve(entry.target);
          }
        }
      },
      { rootMargin: ARRIVE_MARGIN, threshold: 0 }
    );

    rows.forEach((row) => io.observe(row));
    return () => io.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative overflow-hidden border-y border-[#efe4d5] py-14 font-sans sm:py-16 lg:py-24"
      style={{ background: '#faf6f0' }}
    >
      {/* Warp threads in the ground.
          The section was white, which is why the space beside the panel read
          as blank rather than as margin: a white card on a white page has no
          surface to sit on and the whole row floats. On linen the photograph
          lies on something and the panel becomes a real card. Same move that
          fixed Featured and Best Sellers on the homepage.

          Softened from 3.5% at 26px to 2.6% at 34px: at the tighter pitch the
          threads were reading as visible stripes across the empty ground
          rather than as a texture under it. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'repeating-linear-gradient(90deg, rgba(122,15,16,.026) 0 1px, transparent 1px 34px)',
        }}
      />

      <style>{`
        .eb-art {
          position: relative;
          height: 16rem;
          overflow: hidden;
          border-radius: 0 1.25rem 1.25rem 0;
        }
        .eb-row[data-flip="1"] .eb-art { border-radius: 1.25rem 0 0 1.25rem }

        .eb-photo {
          position: absolute;
          inset: 0;
          /* Oversized, so the drift can never pull an edge into frame. */
          transform: translateY(var(--py, 0px)) scale(1.18);
          will-change: transform;
        }

        /* ── Mobile keeps the spread ───────────────────────────────────────
           A phone has no room for a side-by-side overlap, but it has every
           reason to bleed and to be asymmetric. The photograph runs to both
           edges, and the panel is pulled up over its foot and inset harder
           from one side — the side alternating with the row, so the same
           left/right rhythm survives at phone width. It used to be a centred
           card with equal margins, which is what made it look like a
           different, plainer design on mobile. */
        .eb-copy {
          position: relative;
          margin: -3.5rem 0.75rem 0 2rem;
          transform: translateY(var(--cy, 0px));
        }
        .eb-row[data-flip="1"] .eb-copy { margin: -3.5rem 2rem 0 0.75rem }

        @media (min-width: 640px) {
          .eb-art  { height: 21rem }
          .eb-copy { margin: -4.5rem 1.5rem 0 3.5rem }
          .eb-row[data-flip="1"] .eb-copy { margin: -4.5rem 3.5rem 0 1.5rem }
        }

        /* ── Desktop ───────────────────────────────────────────────────────
           Photograph from the edge of the screen to 58%; panel from 50%, so
           it lies across the photograph's inner eighth. */
        @media (min-width: 1024px) {
          .eb-row  { position: relative; min-height: 30rem }
          .eb-art  { width: 58%; height: 30rem }
          .eb-row[data-flip="1"] .eb-art { margin-left: 42% }

          .eb-copy {
            position: absolute;
            top: 50%;
            left: 50%;
            width: 42%;
            max-width: 36rem;
            margin: 0;
            transform: translateY(calc(-50% + var(--cy, 0px)));
          }
          .eb-row[data-flip="1"] .eb-copy { left: auto; right: 50% }

          /* ── The word ────────────────────────────────────────────────────
             The panel is capped at 36rem for readability but has to start at
             50% to overlap the photograph, so a wide screen leaves a deep
             outer margin — around 420px at 1900px. This is what fills it.

             A vertical chapter label was tried there first and taken out: at
             a readable size it looked like stray text, and at a size that
             would have read as deliberate it competed with the heading. One
             word at 8rem has neither problem — it is too large to be mistaken
             for a caption and too pale to be read before the heading is.

             Aligned to the outer edge rather than positioned by offset, so a
             short word and a long one both tuck the same distance under the
             panel instead of one of them floating loose in the margin. */
          .eb-word {
            position: absolute;
            top: 50%;
            right: 2rem;
            text-align: right;
            transform: translateY(calc(-50% + var(--wy, 0px)));
            white-space: nowrap;
            line-height: .82;
            letter-spacing: -.02em;
            /* Oxblood at 9% rather than a flat beige: it picks up the brand
               without becoming a colour of its own, and it sits ON the linen
               instead of looking like a second, paler ground. */
            color: rgba(122, 15, 16, .09);
            will-change: transform;
          }
          .eb-row[data-flip="1"] .eb-word {
            right: auto;
            left: 2rem;
            text-align: left;
          }
        }

        /* ── Arrival ───────────────────────────────────────────────────────
           Each chapter comes in from the edge it bleeds off, and the panel
           follows a beat later. One gesture per row, and after it lands the
           parallax takes over — so nothing here fires once and leaves the
           section dead for the rest of the scroll. */
        .eb-art, .eb-copy {
          transition: opacity .85s ease, transform .85s cubic-bezier(0.22, 0.72, 0.24, 1);
        }
        .eb-row:not(.is-in) .eb-art  { opacity: 0; transform: translateX(-8%) }
        .eb-row[data-flip="1"]:not(.is-in) .eb-art { transform: translateX(8%) }
        .eb-row:not(.is-in) .eb-copy { opacity: 0; transform: translateY(30px) }
        .eb-row.is-in .eb-copy { transition-delay: .14s }

        @media (min-width: 1024px) {
          /* The panel is centred with translateY(-50%), so its hidden state
             has to keep that or it jumps half its own height on arrival. */
          .eb-row:not(.is-in) .eb-copy { transform: translateY(calc(-50% + 30px)) }
        }

        @media (prefers-reduced-motion: reduce) {
          .eb-art, .eb-copy { transition: none }
          .eb-row:not(.is-in) .eb-art,
          .eb-row:not(.is-in) .eb-copy { opacity: 1; transform: none }
          @media (min-width: 1024px) {
            .eb-row:not(.is-in) .eb-copy { transform: translateY(-50%) }
          }
          .eb-photo { transform: scale(1.18) }
        }
      `}</style>

      {aboutContent.map((chapter, index) => (
        <div
          key={index}
          ref={(el) => {
            rowsRef.current[index] = el;
          }}
          data-flip={index % 2 === 1 ? '1' : undefined}
          className="eb-row mb-14 last:mb-0 sm:mb-16 lg:mb-24"
        >
          {/* First in the DOM on purpose. It has no z-index of its own, so
              paint order is source order — being first puts it behind both the
              photograph and the panel, which is what lets the panel cover its
              opening letters and the photograph swallow it entirely if a long
              word reaches that far. */}
          {chapter.keyword && (
            <span
              aria-hidden
              className="eb-word hidden font-playfair text-[6.5rem] font-semibold uppercase lg:block xl:text-[8rem]"
            >
              {chapter.keyword}
            </span>
          )}

          {chapter.image && (
            <div className="eb-art">
              <div className="eb-photo">
                <Image
                  src={chapter.image}
                  alt={chapter.title}
                  fill
                  sizes="(max-width: 1024px) 100vw, 58vw"
                  className="object-cover"
                />
              </div>
            </div>
          )}

          {/* White on a white page, but lifted off the photograph by a shadow
              and a hairline — which is what makes the overlap read as two
              layers rather than a hole cut in the picture. */}
          <div className="eb-copy rounded-2xl bg-white p-6 shadow-[0_24px_60px_-30px_rgba(40,22,14,0.45)] ring-1 ring-black/5 sm:p-8 lg:rounded-[1.5rem] lg:px-12 lg:py-11">
            {/* The sequence, kept — small, on a rule, out of the way. */}
            <span className="mb-4 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#c41617]">
              {String(index + 1).padStart(2, '0')}
              <span aria-hidden className="h-px w-10 bg-[#e8d2cb]" />
            </span>

            {/* The scale contrast the numeral used to provide, moved to where
                it belongs. */}
            <h3 className="mb-3 font-playfair text-[22px] font-semibold leading-tight tracking-tight text-[#1a1a1a] sm:mb-4 sm:text-[28px] lg:text-[34px]">
              {chapter.title}
            </h3>
            {/* #5f5550 measures 8.6:1 on white. */}
            <p className="text-sm leading-relaxed text-[#5f5550] sm:text-base lg:text-[17px]">
              {chapter.content}
            </p>
          </div>
        </div>
      ))}
    </section>
  );
}
