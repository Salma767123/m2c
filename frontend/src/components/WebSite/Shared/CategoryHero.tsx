'use client';

import Reveal from '@/components/WebSite/Shared/Reveal';

interface CategoryHeroProps {
  /** Small ruled caption above the name. */
  eyebrow: string;
  /** The name itself — a category, or the page's own title. */
  title: string;
  /** A sentence or two under it. */
  blurb: string;
  /** Backdrop. With nothing here the hero falls back to a plain light bar. */
  image?: string | null;
  /**
   * Change this and the whole thing remounts, which replays the opening.
   * Defaults to the title, which is the right trigger nearly always.
   */
  replayKey?: string;
}

/**
 * The banner that opens edge to edge and lands as a card.
 *
 * ── Why this is a component and not markup in two files ───────────────────
 *
 * It was written inside Products.tsx, so /categories carried its own
 * hand-rolled version: a flat `bg-black/60` over the photograph, an eyebrow
 * ruled on one side, and no animation at all. Copying the newer one across
 * would have left two implementations to keep in step — the same trap as the
 * opening hours that were stated twice on the contact page and were one edit
 * away from disagreeing. One definition, two call sites.
 *
 * ── What actually animates ────────────────────────────────────────────────
 *
 * Two properties, and only one of them touches layout.
 *
 * `height`, which has to: the whole point is that the content below MOVES UP,
 * and that cannot happen from a transform.
 *
 * `clip-path`, which carries the inward draw, the corner rounding and the top
 * gap in a single composited property. That combination started life as
 * `margin-inline` plus `border-radius`, and it juddered — animating a side
 * margin changes the element's WIDTH every frame, at fractional pixels, and
 * the copy carries `text-wrap: balance`, which re-runs its line-breaking
 * search whenever the available width changes. The headline was re-breaking
 * sixty times a second. Clipping leaves the element full width throughout, so
 * nothing inside ever sees a different box.
 *
 * The photograph keeps `object-cover` against the full box on purpose. Width
 * is constant, and cover takes its scale from whichever axis overflows least —
 * width, here — so the scale never changes and the raster is never resampled;
 * only the crop window closes, evenly from top and bottom. Pinning it to a
 * fixed height instead would anchor it to the top and leave the resting frame
 * showing the upper 60% of every photograph rather than its middle.
 *
 * The copy centres inside a layer of CONSTANT height rather than being centred
 * by flex against the animating box, so its position is solved once instead of
 * being recomputed from a height changing in fractions of a pixel.
 *
 * The cost of clipping is the drop shadow — clip-path removes it along with
 * everything else outside the shape. The photograph's own edge carries the
 * card without it.
 */
export default function CategoryHero({
  eyebrow,
  title,
  blurb,
  image,
  replayKey,
}: CategoryHeroProps) {
  return (
    <>
      <style>{`
        /* ── The frame ──────────────────────────────────────────────────
           It opens edge to edge, the way a hero should, and lands as a card on
           the same rails as the content below it.

           --rail is what makes the landing land: max() of the page gutter and
           half the overflow past the container, which is exactly where
           max-w-420 mx-auto px-N puts its content edge. So the card's sides
           finish flush with the first and last card underneath rather than
           near them.

           Percentages, not vw: 100vw includes the scrollbar, which would leave
           the card about 7px wider than the grid on either side. */
        .cat-hero {
          --cat-open: min(70vh, 430px);
          --cat-rest: 280px;
          --rail: max(1rem, calc((100% - 105rem) / 2));
          --lift: 1rem;
          --cat-radius: 1rem;

          position: relative;
          height: var(--cat-rest);
          overflow: hidden;
          /* Everything the frame does is height plus one clip. The top gap is
             clipped too rather than being a margin, so no margin animates and
             nothing above this moves. */
          clip-path: inset(var(--lift) var(--rail) 0px var(--rail) round var(--cat-radius));
          will-change: height, clip-path;
          animation: catHero 2600ms linear both;
        }

        /* The copy centres inside a layer of constant height, pinned to the
           top, so its position is solved once and never again. During the
           opening beat it sits high in the frame, which costs nothing — it is
           still transparent until the frame has begun to close. */
        .cat-hero-copy {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: var(--cat-rest);
          display: flex;
          align-items: center;
        }

        @media (min-width: 640px) {
          .cat-hero {
            --cat-open: min(74vh, 540px);
            --cat-rest: 340px;
            --rail: max(1.5rem, calc((100% - 105rem) / 2));
            --lift: 1.5rem;
            --cat-radius: 1.5rem;
          }
        }
        @media (min-width: 1024px) {
          .cat-hero {
            --cat-open: min(78vh, 660px);
            --cat-rest: 400px;
            --rail: max(2rem, calc((100% - 105rem) / 2));
          }
        }

        /* 2600ms, and the hold runs to 42% of it — so the full frame sits
           there for a beat over a second before anything moves.

           The timing function is declared per keyframe: linear across the
           hold, then a symmetric ease-in-out for the close, so the frame
           leaves slowly, travels, and arrives slowly. An ease with a high y1
           covers almost the whole distance in the first slice of the segment,
           and no amount of duration stops that reading as a drop. */
        @keyframes catHero {
          0% {
            height: var(--cat-open);
            clip-path: inset(0px 0px 0px 0px round 0px);
            animation-timing-function: linear;
          }
          42% {
            height: var(--cat-open);
            clip-path: inset(0px 0px 0px 0px round 0px);
            animation-timing-function: cubic-bezier(0.62, 0.02, 0.30, 1);
          }
          100% {
            height: var(--cat-rest);
            clip-path: inset(var(--lift) var(--rail) 0px var(--rail) round var(--cat-radius));
          }
        }

        /* The words rise into a frame that is still closing, not after it has
           stopped — which is what makes the two read as one gesture rather
           than two queued ones. */
        @keyframes catHeroCopy {
          0%, 30% { opacity: 0; transform: translateY(16px); animation-timing-function: cubic-bezier(0.22, 0.61, 0.36, 1) }
          70%     { opacity: 1; transform: none }
        }
        .cat-hero-copy { animation: catHeroCopy 2600ms linear both }

        @media (prefers-reduced-motion: reduce) {
          .cat-hero, .cat-hero-copy { animation: none }
        }
      `}</style>

      <section
        key={replayKey ?? title}
        className={`relative overflow-hidden font-sans ${image ? 'cat-hero' : 'bg-[#f7f7f5] py-6 sm:py-8'}`}
      >
        {image && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover" />

            {/* ── Scrim ───────────────────────────────────────────────
                Three layers that each do one job, replacing the flat wash that
                used to fight the photograph everywhere at once.

                A flat `from-black/65 via-black/45 to-black/65` meant no part of
                the image was ever less than 45% black — and the red vignette
                over it faded to `transparent`, which is rgba(0,0,0,0), so it
                interpolated red -> BLACK rather than red -> nothing and laid a
                muddy dark red across the top half. Between them the photograph
                arrived looking like it was behind frosted glass.

                The darkening goes where the words are and nowhere else. */}

            {/* 1. A pool under the copy. Everything outside it keeps the
                   photograph's own contrast. */}
            <div className="absolute inset-0 bg-[radial-gradient(58%_68%_at_50%_50%,rgba(0,0,0,0.62)_0%,rgba(0,0,0,0.34)_45%,rgba(0,0,0,0)_74%)]" />

            {/* 2. Edges only — the top so the header stays legible over it, the
                   bottom so the banner ends on something rather than stopping
                   dead. The middle band is left alone. */}
            <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.42)_0%,rgba(0,0,0,0)_24%,rgba(0,0,0,0)_72%,rgba(0,0,0,0.5)_100%)]" />

            {/* 3. Brand tint, fading to its own colour at zero alpha so it
                   cannot drag through black. */}
            <div className="absolute inset-0 bg-[radial-gradient(120%_120%_at_50%_0%,rgba(224,26,27,0.16)_0%,rgba(224,26,27,0)_58%)]" />
          </>
        )}

        <div className={image ? 'cat-hero-copy' : 'relative w-full'}>
          <Reveal className="relative w-full px-6 text-center sm:px-10">
            {/* Ruled on both sides, not just the left. A single rule reads as
                the start of something; a pair reads as a caption, which is what
                this is. Wider tracking and a size down as well — small and
                spaced carries more authority up here than big and bold, and it
                stops competing with the name underneath it. */}
            <span className={`mb-4 inline-flex items-center gap-3 text-[10.5px] font-semibold uppercase tracking-[0.3em] sm:text-[11px] ${image ? 'text-white/85' : 'text-[#c41617]'}`}>
              <span aria-hidden className={`h-px w-8 ${image ? 'bg-white/45' : 'bg-[#c41617]/45'}`} />
              {eyebrow}
              <span aria-hidden className={`h-px w-8 ${image ? 'bg-white/45' : 'bg-[#c41617]/45'}`} />
            </span>

            {/* text-balance so a two-word name and a four-word one both break
                evenly instead of stranding a single word on line two. */}
            <h1 className={`font-playfair text-3xl font-semibold tracking-tight text-balance sm:text-4xl lg:text-6xl ${image ? 'text-white drop-shadow-[0_2px_14px_rgba(0,0,0,0.45)]' : 'text-[#1a1a1a]'}`}>
              {title}
            </h1>

            {/* A short seam under the name — the one piece of brand colour in
                the block, and what stops the three lines reading as one
                undifferentiated stack of centred text. */}
            <span aria-hidden className="mx-auto mt-5 block h-[3px] w-12 rounded-full bg-[#e01a1b] sm:w-14" />

            {/* Narrower than the headline and a size smaller: held to about
                sixty characters a line it reads as a caption under the name
                rather than a paragraph competing with it. */}
            <p className={`mx-auto mt-5 max-w-2xl text-[15px] leading-relaxed text-balance sm:text-base lg:text-lg ${image ? 'text-white/90 drop-shadow-[0_1px_6px_rgba(0,0,0,0.55)]' : 'text-gray-600'}`}>
              {blurb}
            </p>
          </Reveal>
        </div>
      </section>
    </>
  );
}
