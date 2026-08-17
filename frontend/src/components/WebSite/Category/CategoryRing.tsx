'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect, useRef, useCallback } from 'react';
import { categoryService } from '@/services/categoryService';
import { Package, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  slug: string;
  image?: string;
  productCount?: number;
}

/**
 * ⚠️ PARKED — NOT RENDERED ANYWHERE.
 *
 * This is the 3D ring carousel that used to be the Shop by Category section.
 * It was taken off the homepage because the ring was too much for that slot,
 * and kept here whole because it is wanted for another section or page later.
 *
 * It is complete and working: measured ring geometry, drag and swipe, arrows,
 * dots, auto-advance that stops for good on first touch, and a background that
 * samples its colour from the active card's photograph. Drop it into any page
 * and it runs — it fetches its own categories.
 *
 * ---------------------------------------------------------------------------
 */

/**
 * Shop by Category — a carousel in three dimensions.
 *
 * The cards sit on a ring in 3D space and the whole ring turns, bringing one
 * category to the front at a time. The front card is upright, lit and legible;
 * the others fall away around the curve.
 *
 * Why a ring rather than a row of tiles: the six category photographs have
 * nothing in common — different backgrounds, different lighting, two collages,
 * a spec sheet and a logo — and no grid can make that set look considered,
 * because a grid shows all six at once and invites the comparison. A ring shows
 * ONE at a time, properly, and lets the rest fall out of focus. It turns the
 * inconsistency into depth of field.
 *
 * ── How the geometry works ────────────────────────────────────────────────
 * Each card is fixed at its own angle on the ring, `rotateY(i × step)` then
 * pushed out along Z by the radius. Nothing about a card changes as the
 * carousel moves — the STAGE rotates underneath them, which is why the motion
 * stays smooth however many cards there are.
 *
 * The radius is measured, not guessed: for the card faces to sit edge to edge
 * on a regular polygon, R = width / (2·sin(π/n)). It is computed in JS from the
 * card's real width so it stays correct at every breakpoint and for any number
 * of categories, and re-measured on resize.
 *
 * Position is tracked as an unbounded counter rather than an index, so going
 * from the last card to the first keeps turning forward instead of spinning
 * backwards through the whole ring.
 *
 * ── The honest caveat ─────────────────────────────────────────────────────
 * A ring is a showpiece, not navigation: only the front category is properly
 * readable. "View All Categories" is therefore the real way in for anyone in a
 * hurry, and it stays a full-strength button — sitting under the controls,
 * where it reads as the way out of the carousel rather than as something
 * competing with it.
 */

/** Slightly more than edge-to-edge, so the faces breathe on the curve. */
const SPREAD = 1.14;

/** How long the ring takes to turn one card. */
const TURN_MS = 760;

/**
 * Auto-advance, until the reader takes over.
 *
 * It used to resume after a couple of turns, and that made the order look
 * wrong: you would press next, read for a few seconds, the carousel would
 * advance by itself, and your next press would then land two cards on — so it
 * appeared to skip one. There was a real race in it too, where a tick landing
 * in the same moment as a click moved the ring twice.
 *
 * So the first press stops it for good. Once someone is driving, the ring goes
 * exactly where they put it and nowhere else.
 */
const AUTO_MS = 3800;

const REVEAL_THRESHOLD = 0.25;
const REVEAL_MARGIN = '0px 0px -10% 0px';

/** How long the stage takes to change colour. Slightly longer than the ring's
 *  turn, so the light settles a beat after the card does. */
const TINT_MS = 900;

/** The ground when nothing has been sampled yet, or when sampling fails. */
const FALLBACK_TINT = '236, 220, 210';

type Rgb = { r: number; g: number; b: number };

/**
 * Average colour of an image, ignoring its background.
 *
 * Same method as useImageColor in NoticeBoard, which is what proves it works
 * against this project's image host: a tiny canvas, cross-origin, and skip both
 * transparent pixels and near-white ones. That last part is doing the real work
 * here — the category photographs are shot on white, so without it every single
 * one would average out to roughly the same pale grey.
 *
 * Resolves to null rather than throwing when the canvas is tainted (no CORS
 * headers) or the image fails, and the stage keeps its fallback.
 */
function sampleImageColor(url?: string): Promise<Rgb | null> {
  return new Promise((resolve) => {
    if (!url) return resolve(null);
    const im = new window.Image();
    im.crossOrigin = 'anonymous';
    im.onerror = () => resolve(null);
    im.onload = () => {
      try {
        const c = document.createElement('canvas');
        const w = (c.width = 16);
        const h = (c.height = 16);
        const ctx = c.getContext('2d');
        if (!ctx) return resolve(null);
        ctx.drawImage(im, 0, 0, w, h);
        const d = ctx.getImageData(0, 0, w, h).data;
        let r = 0, g = 0, b = 0, n = 0;
        for (let i = 0; i < d.length; i += 4) {
          if (d[i + 3] < 125) continue;                              // transparent
          if (d[i] > 244 && d[i + 1] > 244 && d[i + 2] > 244) continue; // white backdrop
          r += d[i]; g += d[i + 1]; b += d[i + 2]; n++;
        }
        resolve(n > 0 ? { r: Math.round(r / n), g: Math.round(g / n), b: Math.round(b / n) } : null);
      } catch {
        resolve(null); // tainted canvas
      }
    };
    im.src = url;
  });
}

/**
 * Pull a sampled colour into a range that can actually be stood behind.
 *
 * A raw average is unusable as a backdrop: the navy towel shot returns
 * something near-black, the white towels return near-grey, and a saturated
 * product returns something that would fight the photograph in front of it. So
 * the HUE is kept — that is the part carrying the product's identity — and
 * saturation and lightness are clamped to a narrow, pale band.
 *
 * The result is that the stage always shifts recognisably toward the category's
 * colour while never getting dark enough to hurt the text or strong enough to
 * compete with the card.
 */
function toBackdrop({ r, g, b }: Rgb): string {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l0 = (max + min) / 2;
  const d = max - min;

  let h = 0;
  if (d !== 0) {
    if (max === rn) h = ((gn - bn) / d) % 6;
    else if (max === gn) h = (bn - rn) / d + 2;
    else h = (rn - gn) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  const s0 = d === 0 ? 0 : d / (1 - Math.abs(2 * l0 - 1));

  // Keep the hue, force it pale and gently saturated.
  //
  // These two numbers are a contrast guarantee, not taste. Measured across the
  // range of averages these photographs actually produce — navy, near-black,
  // saturated red, olive, gold, washed white — a 0.52 cap at 0.80 lightness let
  // the strongest tints drop body copy to 3.96:1, under the 4.5:1 threshold.
  // 0.44 at 0.87 holds the worst case at 4.99:1 while still shifting visibly
  // toward the product's colour.
  const s = Math.min(0.44, Math.max(0.2, s0));
  const l = 0.87;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r1, g1, b1] =
    h < 60 ? [c, x, 0] :
    h < 120 ? [x, c, 0] :
    h < 180 ? [0, c, x] :
    h < 240 ? [0, x, c] :
    h < 300 ? [x, 0, c] : [c, 0, x];

  return `${Math.round((r1 + m) * 255)}, ${Math.round((g1 + m) * 255)}, ${Math.round((b1 + m) * 255)}`;
}

export default function CategoryRing() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  /** Unbounded — see the note above about turning forward past the end. */
  const [pos, setPos] = useState(0);
  /** One backdrop colour per category, sampled once. Held for all of them
   *  rather than just the active one so turning the ring is instant — sampling
   *  on demand would leave the stage a beat behind the card every time. */
  const [tints, setTints] = useState<Array<string | null>>([]);

  const stageRef = useRef<HTMLDivElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<HTMLDivElement | null>(null);
  /** Set by the first arrow or dot press, and never cleared. */
  const takenOver = useRef(false);
  const hoverRef = useRef(false);
  const inViewRef = useRef(false);

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
          // Limit to 6 categories for homepage
          setCategories(response.data.slice(0, 6));
        }
      } catch (error) {
        console.error('Failed to fetch categories:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  const n = categories.length;
  const step = n > 0 ? 360 / n : 0;
  const activeIndex = n > 0 ? ((pos % n) + n) % n : 0;

  // Sample every category image once, in parallel. setState lands inside the
  // promise rather than in the effect body, so this never fires during render.
  useEffect(() => {
    if (categories.length === 0) return;
    let cancelled = false;
    Promise.all(
      categories.map((c) => sampleImageColor(c.image).then((rgb) => (rgb ? toBackdrop(rgb) : null))),
    ).then((result) => {
      if (!cancelled) setTints(result);
    });
    return () => { cancelled = true; };
  }, [categories]);

  const tint = tints[activeIndex] ?? FALLBACK_TINT;

  // The ring's radius comes from the card's measured width, so it is right at
  // every breakpoint without the widths being written down twice.
  const sizeRing = useCallback(() => {
    const stage = stageRef.current;
    const card = cardRef.current;
    if (!stage || !card || n < 2) return;
    const w = card.offsetWidth;
    const r = (w * SPREAD) / (2 * Math.sin(Math.PI / n));
    stage.style.setProperty('--r', `${Math.round(r)}px`);
  }, [n]);

  useEffect(() => {
    sizeRing();
    window.addEventListener('resize', sizeRing);
    return () => window.removeEventListener('resize', sizeRing);
  }, [sizeRing, n]);

  // Entrance, and a live in-view flag so the ring is not turning off screen.
  useEffect(() => {
    const el = sceneRef.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      el.classList.add('is-in');
      inViewRef.current = true;
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          inViewRef.current = entry.isIntersecting;
          if (entry.isIntersecting) el.classList.add('is-in');
        }
      },
      { threshold: REVEAL_THRESHOLD, rootMargin: REVEAL_MARGIN },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [n]);

  const holdOff = () => {
    takenOver.current = true;
  };

  /** Turn to a card by the SHORTEST way round, rather than always forward. */
  const goTo = (index: number) => {
    holdOff();
    setPos((p) => {
      const current = ((p % n) + n) % n;
      let delta = index - current;
      if (delta > n / 2) delta -= n;
      if (delta < -n / 2) delta += n;
      return p + delta;
    });
  };

  const turn = (dir: 1 | -1) => {
    holdOff();
    setPos((p) => p + dir);
  };

  /**
   * Drag and swipe.
   *
   * The ring follows the finger live rather than waiting for the gesture to
   * finish — a carousel that sits still until you let go feels broken on touch,
   * because there is no feedback that the gesture was even received.
   *
   * The transform is written straight to the node during the drag instead of
   * through state: this fires on every pointermove, and re-rendering the whole
   * ring at that rate would stutter. React takes the transform back over on
   * release, when setPos lands.
   *
   * One card's width of travel turns the ring one place, which is what makes
   * the gesture feel proportional to what is on screen at any breakpoint.
   */
  const drag = useRef({ active: false, startX: 0, dx: 0 });
  const suppressClick = useRef(false);

  const dragUnit = () => cardRef.current?.offsetWidth || 220;

  const onPointerDown = (e: React.PointerEvent) => {
    if (n < 2) return;
    drag.current = { active: true, startX: e.clientX, dx: 0 };
    stageRef.current?.classList.add('is-dragging');
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current.active) return;
    drag.current.dx = e.clientX - drag.current.startX;
    const stage = stageRef.current;
    if (stage) {
      stage.style.transform = `rotateY(${-pos * step + (drag.current.dx / dragUnit()) * step}deg)`;
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (!drag.current.active) return;
    const { dx } = drag.current;
    drag.current.active = false;
    stageRef.current?.classList.remove('is-dragging');
    e.currentTarget.releasePointerCapture?.(e.pointerId);

    // Anything past a few pixels was a drag, not a tap — so the card underneath
    // must not also navigate.
    suppressClick.current = Math.abs(dx) > 6;

    const steps = -Math.round(dx / dragUnit());
    if (steps !== 0) {
      holdOff();
      setPos((p) => p + steps);
    } else if (stageRef.current) {
      // No state change means no re-render, so the inline transform written
      // during the drag would stay put. Snap it back by hand.
      stageRef.current.style.transform = `rotateY(${-pos * step}deg)`;
    }
  };

  useEffect(() => {
    if (n < 2) return;
    if (typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = window.setInterval(() => {
      if (takenOver.current || !inViewRef.current || hoverRef.current) return;
      setPos((p) => p + 1);
    }, AUTO_MS);
    return () => window.clearInterval(id);
  }, [n]);

  if (loading) {
    return (
      <section className="bg-white py-6 font-sans sm:py-8 lg:py-10">
        <div className="mx-auto max-w-420 px-3 sm:px-4 md:px-6 lg:px-8">
          <div className="mb-8">
            <div className="h-3 w-24 animate-pulse rounded bg-gray-200" />
            <div className="mt-3 h-9 w-56 animate-pulse rounded bg-gray-200 md:h-11 md:w-80" />
            <div className="mt-2.5 h-4 w-full max-w-md animate-pulse rounded bg-gray-100" />
          </div>
          <div className="flex justify-center">
            <div className="h-[19rem] w-[13rem] animate-pulse rounded-3xl bg-gray-200 sm:h-[23rem] sm:w-[16rem] lg:h-[26rem] lg:w-[18.5rem]" />
          </div>
        </div>
      </section>
    );
  }

  if (n === 0) {
    return null; // Don't show section if no categories
  }

  return (
    // The stage takes its colour from whichever category is facing you.
    //
    // --tint is the active card's own photograph, averaged and then pulled into
    // a pale band (see toBackdrop). Everything coloured below reads it, so the
    // whole set changes together each time the ring turns.
    <section
      className="relative overflow-hidden py-7 font-sans sm:py-8 lg:py-10"
      style={{ '--tint': tint, background: '#fdfaf7' } as React.CSSProperties}
    >
      <style>{`
        /* The scene owns the camera; the stage owns the ring. Keeping them
           separate means the perspective never moves as the ring turns.

           perspective-origin stays at dead centre. Lifting it to 42% put the
           vanishing point above the middle, which sent the far cards drifting
           UP as they receded — straight into the sub-heading above. */
        .m2c-scene { perspective: 1500px; perspective-origin: 50% 50% }
        .m2c-stage {
          position: relative;
          transform-style: preserve-3d;
          transition: transform ${TURN_MS}ms cubic-bezier(0.33, 0.9, 0.28, 1);
        }
        /* While a finger is down the ring must track it exactly — an easing
           curve here would lag the gesture and feel like drag on a rope. The
           transition comes back on release, which is what makes it snap. */
        .m2c-stage.is-dragging { transition: none }
        /* Each card holds one fixed place on the ring. --r is measured and set
           from JS; the angle is the card's own. Nothing here changes as the
           carousel moves.

           backface-visibility belongs HERE, on the transformed element itself.
           On the inner link it did nothing: this element has no preserve-3d, so
           its children are flattened into it and never get their own facing —
           which is why the far cards were showing as mirrored ghosts with their
           labels running backwards. */
        .m2c-ringcard {
          position: absolute;
          top: 0;
          left: 50%;
          transform: translateX(-50%) rotateY(var(--a)) translateZ(var(--r, 300px));
          backface-visibility: hidden;
          transition: opacity ${TURN_MS}ms ease;
        }

        /* Flat colour + fixed mask, so the colour is the only thing that ever
           changes and it can therefore be transitioned. */
        .m2c-tint {
          background-color: rgb(var(--tint));
          transition: background-color ${TINT_MS}ms ease;
        }
        .m2c-tint-floor {
          opacity: .62;
          -webkit-mask-image: linear-gradient(to top, #000 0%, rgba(0,0,0,.45) 34%, transparent 62%);
          mask-image: linear-gradient(to top, #000 0%, rgba(0,0,0,.45) 34%, transparent 62%);
        }
        .m2c-tint-l {
          opacity: .72;
          -webkit-mask-image: radial-gradient(ellipse 46% 66% at 10% 46%, #000 0%, rgba(0,0,0,.35) 44%, transparent 72%);
          mask-image: radial-gradient(ellipse 46% 66% at 10% 46%, #000 0%, rgba(0,0,0,.35) 44%, transparent 72%);
        }
        .m2c-tint-r {
          opacity: .72;
          -webkit-mask-image: radial-gradient(ellipse 46% 66% at 90% 50%, #000 0%, rgba(0,0,0,.35) 44%, transparent 72%);
          mask-image: radial-gradient(ellipse 46% 66% at 90% 50%, #000 0%, rgba(0,0,0,.35) 44%, transparent 72%);
        }

        /* ── The turntable ────────────────────────────────────────────────
           A pale disc under the ring with two hairline rings around it, seen
           at the same shallow angle as the carousel — so the ground reads as
           the thing the cards are standing on rather than as pattern behind
           them. Decoration that describes the section it is in.

           The disc is a flat colour under a radial mask for the same reason
           the stage tints are: it takes --tint, and a gradient could not be
           transitioned when the category changes. */
        .m2c-plat {
          background-color: rgb(var(--tint));
          opacity: .5;
          transition: background-color ${TINT_MS}ms ease;
          -webkit-mask-image: radial-gradient(closest-side, #000 0%, rgba(0,0,0,.55) 55%, transparent 100%);
          mask-image: radial-gradient(closest-side, #000 0%, rgba(0,0,0,.55) 55%, transparent 100%);
        }
        /* Oxblood rather than the tint: a constant brand hairline keeps the
           geometry readable when the tint happens to land close to the sweep.
           At 7% it was barely there against the sweep; 16% reads as a drawn
           line without becoming a shape in its own right. */
        .m2c-ringline { border: 1px solid rgba(122,15,16,.16) }

        .m2c-scene { opacity: 0; transform: translateY(26px) }
        .m2c-scene.is-in {
          opacity: 1; transform: none;
          transition: opacity .7s ease, transform .9s cubic-bezier(0.22,1,0.36,1);
        }

        @media (prefers-reduced-motion: reduce) {
          .m2c-stage, .m2c-ringcard, .m2c-tint, .m2c-plat { transition: none }
          .m2c-scene, .m2c-scene.is-in { opacity: 1; transform: none; transition: none }
        }
      `}</style>

      {/* Three coloured layers and a white key above them.
          A gradient cannot be transitioned, so none of these paint the shape
          with a gradient — each is a FLAT background-color wearing a fixed
          mask. The mask never changes; only the colour does, and a flat colour
          transitions smoothly. That is what lets the stage fade from one
          category's colour to the next instead of cutting. */}
      <span aria-hidden className="m2c-tint m2c-tint-floor pointer-events-none absolute inset-0 z-0" />
      <span aria-hidden className="m2c-tint m2c-tint-l pointer-events-none absolute inset-0 z-0" />
      <span aria-hidden className="m2c-tint m2c-tint-r pointer-events-none absolute inset-0 z-0" />

      {/* The key light sits above all three, so the middle of the stage — where
          the front card and its label live — stays clean however strong the
          colour at the edges gets. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background:
            'radial-gradient(ellipse 40% 52% at 50% 50%, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.46) 46%, rgba(255,255,255,0) 74%)',
        }}
      />

      <div className="relative z-10 mx-auto max-w-420 px-3 sm:px-4 md:px-6 lg:px-8">
        {/* ── Masthead ─────────────────────────────────────────────────── */}
        {/* Centred above the ring. A detail panel beside the carousel — name,
            count, description, its own CTA — was tried and taken back out: it
            put a second heading next to the section's own, and the ring is
            strong enough without a paragraph explaining it. The card carries
            its name and nothing else. */}
        <div className="mb-8 text-center sm:mb-10 lg:mb-12">
          <span className="mb-3 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#e01a1b] sm:text-xs">
            <span aria-hidden className="h-px w-6 bg-[#e01a1b]" />
            Collections
          </span>
          <h2 className="font-playfair mb-2 text-2xl font-semibold tracking-tight text-[#1a1a1a] sm:text-3xl md:mb-3 md:text-4xl xl:text-[2.75rem]">
            Shop by Category
          </h2>
          {/* Darker than the site's usual grey-500, which measures under the
              4.5:1 threshold once the ground stops being white. */}
          {/* max-w-4xl, not 2xl: at 2xl this sentence wrapped onto a second
              line on desktop, and a wrapped sub-heading costs the section
              nearly 2rem of height for no reading benefit. */}
          <p className="mx-auto max-w-4xl text-sm leading-relaxed text-[#5f5550] md:text-base lg:text-[17px]">
            Explore our carefully curated collection of traditional textiles, organized by category
          </p>

        </div>

        {/* ── The ring ─────────────────────────────────────────────────── */}
        {/* The hover pause covers the ring and the controls together. Scoped to
            the ring alone, the carousel kept advancing while the cursor sat on
            the arrows, which made the order look like it was skipping. */}
        <div
          className="relative"
          onMouseEnter={() => { hoverRef.current = true; }}
          onMouseLeave={() => { hoverRef.current = false; }}
          onFocusCapture={() => { hoverRef.current = true; }}
          onBlurCapture={() => { hoverRef.current = false; }}
        >
          {/* Sits before the scene in the DOM and the scene is positioned, so
              this paints behind the cards without needing a z-index war with
              the perspective context.

              Offsets are in rem, not per cent. They were percentages, measured
              against this wrapper — which contains the ring AND the controls
              AND the button — so the turntable's position depended on the
              height of three things underneath it that have nothing to do with
              where the floor should be. Shortening the section by any amount
              dragged the floor up through the cards, which is what made this
              untrimmable. The cards hang from the top of the scene, so the
              floor is now measured from there too: same reference, fixed
              distance, immune to anything below it changing size. The values
              are the ones the percentages were already resolving to. */}
          <span
            aria-hidden
            className="m2c-ringline pointer-events-none absolute left-1/2 top-[16.5rem] h-[16rem] w-[42rem] -translate-x-1/2 -translate-y-1/2 rounded-[50%] sm:top-[18.5rem] sm:h-[19rem] sm:w-[52rem] lg:top-[20.5rem] lg:h-[23rem] lg:w-[64rem]"
          />
          <span
            aria-hidden
            className="m2c-ringline pointer-events-none absolute left-1/2 top-[16.7rem] h-[12rem] w-[32rem] -translate-x-1/2 -translate-y-1/2 rounded-[50%] sm:top-[19rem] sm:h-[14.5rem] sm:w-[40rem] lg:top-[20.8rem] lg:h-[17.5rem] lg:w-[49rem]"
          />
          <span
            aria-hidden
            className="m2c-plat pointer-events-none absolute left-1/2 top-[17rem] h-[13rem] w-[34rem] -translate-x-1/2 -translate-y-1/2 rounded-[50%] sm:top-[19.4rem] sm:h-[16rem] sm:w-[42rem] lg:top-[21.2rem] lg:h-[19rem] lg:w-[52rem]"
          />
        {/* touch-action: pan-y hands vertical scrolling back to the page while
            this element keeps the horizontal axis. Without it the browser
            claims the whole gesture and the ring never moves — or worse, the
            page refuses to scroll over the carousel. */}
        <div
          ref={sceneRef}
          // Trimmed by 2rem. The cards are absolutely positioned at top: 0 and
          // come to about 22rem tall at lg, so the scene was carrying 4rem of
          // empty box underneath them that pushed the button off the bottom of
          // the viewport. Cutting it moves nothing visible — the cards do not
          // shift, only the controls beneath them come up.
          className="m2c-scene relative mx-auto h-[18rem] w-full cursor-grab select-none active:cursor-grabbing sm:h-[21.5rem] lg:h-[24rem]"
          style={{ touchAction: 'pan-y' }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onClickCapture={(e) => {
            if (suppressClick.current) {
              e.preventDefault();
              e.stopPropagation();
              suppressClick.current = false;
            }
          }}
        >
          {/* Contact shadow. The front card's own drop-shadow says "lit from
              above"; this says "resting on the floor", and without it the ring
              floats in front of the sweep rather than standing in it. Outside
              the stage on purpose, so it does not rotate with the ring. */}
          <span
            aria-hidden
            className="pointer-events-none absolute bottom-[14%] left-1/2 h-10 w-[13rem] -translate-x-1/2 sm:w-[16rem] lg:w-[19rem]"
            style={{
              background:
                'radial-gradient(ellipse 50% 50% at 50% 50%, rgba(58,46,40,0.26) 0%, rgba(58,46,40,0.10) 46%, rgba(58,46,40,0) 72%)',
            }}
          />

          <div
            ref={stageRef}
            className="m2c-stage mx-auto h-full"
            style={{ transform: `rotateY(${-pos * step}deg)` }}
          >
            {categories.map((category, i) => {
              // Distance round the ring, so dimming is symmetrical either side.
              const away = Math.min((i - activeIndex + n) % n, (activeIndex - i + n) % n);
              const isFront = away === 0;
              return (
                <div
                  key={category.id}
                  ref={i === 0 ? cardRef : undefined}
                  className="m2c-ringcard w-[13rem] sm:w-[16rem] lg:w-[18.5rem]"
                  style={{
                    '--a': `${i * step}deg`,
                    opacity: isFront ? 1 : away === 1 ? 0.62 : 0.34,
                    zIndex: n - away,
                  } as React.CSSProperties}
                  aria-hidden={!isFront}
                >
                  <RingCard
                    category={category}
                    isFront={isFront}
                    onSelect={() => goTo(i)}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Controls ─────────────────────────────────────────────────── */}
        {/* `relative` so these paint above the turntable. The floor ellipses
            are positioned and these were not, which puts them below positioned
            siblings in paint order regardless of source order — the platter's
            50% wash was sitting over the arrows and dots. */}
        <div className="relative mt-5 flex items-center justify-center gap-4 sm:mt-6">
          <RingButton dir={-1} onClick={() => turn(-1)} />

          <div className="flex items-center gap-2">
            {categories.map((category, i) => (
              <button
                key={category.id}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Show ${category.name}`}
                aria-current={i === activeIndex}
                className={`h-2 rounded-full transition-all duration-500 ${i === activeIndex ? 'w-7 bg-[#e01a1b]' : 'w-2 bg-[#e0d5cd] hover:bg-[#c9b8ac]'}`}
              />
            ))}
          </div>

          <RingButton dir={1} onClick={() => turn(1)} />
        </div>

        {/* Below the controls rather than under the sub-heading: up there it
            sat between the section's description and the ring it introduces,
            and a red button that size pulled the eye past the carousel before
            anyone had looked at it. */}
        <div className="relative mt-5 flex justify-center">
          <Link
            href="/categories"
            className="btn-shine group inline-flex items-center gap-2 whitespace-nowrap rounded-full bg-[#e01a1b] px-6 py-2.5 text-[13.5px] font-semibold text-white shadow-[0_10px_24px_-12px_rgba(224,26,27,0.8)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#c41617] sm:px-7 sm:py-3 sm:text-sm"
          >
            View All Categories
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </div>
        </div>
      </div>
    </section>
  );
}

/**
 * One face on the ring.
 *
 * Only the front card is a link. The ones around the curve are buttons that
 * turn the ring instead — clicking a card you cannot properly see and being
 * navigated away from the page is the wrong outcome, and it is also why the
 * off-front cards are aria-hidden: a screen reader should be offered the
 * category it can actually read, not six at once.
 */
function RingCard({
  category,
  isFront,
  onSelect,
}: {
  category: Category;
  isFront: boolean;
  onSelect: () => void;
}) {
  const body = (
    <>
      <div className="relative aspect-square w-full overflow-hidden rounded-[20px] bg-linear-to-br from-gray-100 to-gray-200 ring-1 ring-black/10">
        {category.image ? (
          <Image
            src={category.image}
            alt={category.name}
            fill
            sizes="(max-width: 640px) 13rem, (max-width: 1024px) 16rem, 18.5rem"
            className="object-cover transition-transform duration-[900ms] ease-out group-hover:scale-105"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
            }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Package className="h-16 w-16 text-gray-400" />
          </div>
        )}
        <div className="absolute inset-0 bg-linear-to-t from-black/35 via-transparent to-transparent" />
      </div>

      {/* The card's own name, at every width. This is the only place a category
          is named now — the side panel that briefly carried it has gone. */}
      <div className="mt-4 text-center">
        <h3 className={`text-[17px] font-semibold transition-colors duration-300 ${isFront ? 'text-[#1a1416] group-hover:text-[#e01a1b]' : 'text-[#4f4442]'}`}>
          {category.name}
        </h3>
        {typeof category.productCount === 'number' && category.productCount > 0 && (
          <p className="mt-1 text-[12.5px] text-[#7a6d66]">
            {category.productCount} {category.productCount === 1 ? 'item' : 'items'}
          </p>
        )}
      </div>
    </>
  );

  const shell = 'group block w-full text-left focus:outline-none focus-visible:ring-4 focus-visible:ring-[#e01a1b]/35 rounded-[22px]';

  // Shadow only on the front card: a shadow on a face angled away from the
  // camera falls in the wrong direction and gives the ring away as flat.
  const lift = isFront ? 'drop-shadow-[0_26px_36px_rgba(60,40,30,0.28)]' : '';

  // aria-label because the visible name is hidden at lg — without it the link's
  // only accessible name from that breakpoint up would be the image's alt.
  return isFront ? (
    <Link href={`/categories/${category.slug}`} aria-label={category.name} className={`${shell} ${lift}`}>
      {body}
    </Link>
  ) : (
    <button type="button" onClick={onSelect} tabIndex={-1} className={shell}>
      {body}
    </button>
  );
}

function RingButton({ dir, onClick }: { dir: 1 | -1; onClick: () => void }) {
  const Icon = dir === 1 ? ChevronRight : ChevronLeft;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={dir === 1 ? 'Next category' : 'Previous category'}
      className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-[#e3d5cb] bg-white text-[#7a0f10] transition-all duration-300 hover:border-[#e01a1b] hover:bg-[#e01a1b] hover:text-white"
    >
      <Icon className="h-5 w-5" strokeWidth={2.2} />
    </button>
  );
}
