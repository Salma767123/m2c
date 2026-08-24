'use client';

import Image from 'next/image';
import { Smartphone } from 'lucide-react';
import { useEffect, useRef } from 'react';

/**
 * "Shop M2C from your pocket" — the app section, unveiled and then left running.
 *
 * It used to be the most-cloned layout on the internet: two tilted phones
 * floating with soft shadows on the left, headline + paragraph + two black
 * store badges on the right. Nothing about that is wrong, which was the
 * problem. Worse, the thing being sold is an experience and the section showed
 * a photograph of one.
 *
 * Two changes carry it. A length of cloth is drawn off the phone as you arrive
 * — this shop sells cloth, so the reveal is the product. And underneath, the
 * app is already being used: the feed scrolls, taps land. The unveiling is the
 * entrance; the browsing is the resting state. A reveal on its own would have
 * left this the one section on the page that is dead a second after you reach
 * it, while the hero weaves, the board flips, the tags sway and the footer
 * threads.
 *
 * The handset is a photograph. It was drawn in CSS first — a body with a real
 * depth, a left rail folded back from the face, buttons standing off it — and
 * that got close, but a render of the actual object is the actual object, and
 * the client had one. The app is laid down first and the render goes OVER it,
 * so the notch, the bezel and the polished edge sit in front of the
 * screenshots instead of being approximated behind them.
 *
 * Store badges, their links and every word on the section are untouched.
 */

// Both screenshots are 1290 × 2796 — exactly the frame's own ratio, so neither
// one can scroll inside it. Stacking them is what creates something to scroll
// THROUGH: the feed runs out of the home screen and into the products screen.
// The third panel repeats the first so the loop closes on identical pixels and
// the restart is invisible.
const FEED = [
  { src: '/assets/app/screen-home.png', alt: 'M2C MarkDowns storefront on mobile' },
  { src: '/assets/app/screen-products.png', alt: 'Browsing products in the M2C MarkDowns app' },
  { src: '/assets/app/screen-home.png', alt: '' },
];

/* ─────────────────────────────────────────────────────────────────────────
   THE FRAME, AND THE NUMBERS TAKEN OFF IT.

   phone-frame.png has two holes in its alpha channel: everything outside the
   phone, and the screen. That second hole is what makes this work — the app
   shows through it and the frame paints over everything else.

   None of the numbers below were chosen. They were measured from that exact
   file: the screen hole was isolated by flooding the transparent outside from
   the border, its four sides were recovered from the convex hull and fitted,
   and SCREEN_MATRIX is the homography that lands a flat SCREEN_W x SCREEN_H
   rectangle on the four corners where those sides meet. The screen is a
   quadrilateral in perspective, so nothing less than a projective map will
   sit square in it.

   IF THIS PNG IS EVER REPLACED, EVERY NUMBER HERE MUST BE MEASURED AGAIN.
   A different render is a different screen quad, and the app will sit crooked
   in the frame with no error to tell you why.
   ───────────────────────────────────────────────────────────────────────── */
const PHONE_SRC = '/assets/app/phone-frame.png';
/** The phone's own bounds inside the 1024 x 1536 file. It was exported with a
 *  transparent margin, and laying that margin out as though it were phone
 *  would push the copy across for nothing. */
const PHONE = { w: 927, h: 1448, offX: -84, offY: -48, fileW: 1024, fileH: 1536 };
/** Half the screenshots' own 1290 x 2796, so nothing is upsampled. */
const SCREEN_W = 645;
const SCREEN_H = 1398;
const SCREEN_MATRIX =
  'matrix3d(0.972816, 0.046153, 0, 0.000076, 0.166945, 0.922294, 0, -0.000042, 0, 0, 1, 0, 47.65, 22.59, 0, 1)';

/* ─────────────────────────────────────────────────────────────────────────
   PLACEHOLDER QR — ENCODES NOTHING. REPLACE BEFORE LAUNCH.

   The app is still in testing, so there is no store listing to point at. This
   draws a QR-shaped pattern with real finder, timing and alignment marks so
   the panel can be reviewed at full size, but the data modules are a
   deterministic hash, not encoded bytes. Scanning it does nothing.

   Deterministic on purpose: Math.random() here would produce a different grid
   on the server and the client and blow up hydration.

   To go live: drop in a real QR (as an <Image>, or generate one) in place of
   the <svg> in the QR panel. Nothing else in this file needs to change.
   ───────────────────────────────────────────────────────────────────────── */
const QR_N = 25; // version-2 grid

function buildPlaceholderQr(): string {
  const on: boolean[][] = Array.from({ length: QR_N }, () => Array<boolean>(QR_N).fill(false));

  // The three big corner squares a scanner uses to orient itself.
  const finder = (ox: number, oy: number) => {
    for (let y = 0; y < 7; y++)
      for (let x = 0; x < 7; x++)
        on[oy + y][ox + x] =
          x === 0 || x === 6 || y === 0 || y === 6 || (x >= 2 && x <= 4 && y >= 2 && y <= 4);
  };
  finder(0, 0);
  finder(QR_N - 7, 0);
  finder(0, QR_N - 7);

  // Timing runs, and the small alignment square bottom-right.
  for (let i = 8; i < QR_N - 8; i++) {
    on[6][i] = i % 2 === 0;
    on[i][6] = i % 2 === 0;
  }
  for (let y = 0; y < 5; y++)
    for (let x = 0; x < 5; x++)
      on[QR_N - 9 + y][QR_N - 9 + x] = x === 0 || x === 4 || y === 0 || y === 4 || (x === 2 && y === 2);

  const reserved = (x: number, y: number) =>
    (x < 9 && y < 9) ||
    (x >= QR_N - 8 && y < 9) ||
    (x < 9 && y >= QR_N - 8) ||
    x === 6 ||
    y === 6 ||
    (x >= QR_N - 9 && x <= QR_N - 5 && y >= QR_N - 9 && y <= QR_N - 5);

  for (let y = 0; y < QR_N; y++)
    for (let x = 0; x < QR_N; x++)
      if (!reserved(x, y)) on[y][x] = ((((x + 1) * 73856093) ^ ((y + 1) * 19349663)) >>> 0) % 17 < 8;

  // One path for the whole grid — 300-odd separate <rect> elements is a lot
  // of DOM for a decorative square.
  let d = '';
  for (let y = 0; y < QR_N; y++)
    for (let x = 0; x < QR_N; x++) if (on[y][x]) d += `M${x} ${y}h1v1h-1z`;
  return d;
}

const QR_PATH = buildPlaceholderQr();

/**
 * The store badges.
 *
 * Black, which is what the real Apple and Google assets are: people are
 * looking for a shape they already know, and a white card asking to be read
 * is slower than a black one they recognise from every other app page.
 * The Play mark keeps its own four colours, as Google's own badge does.
 */
function StoreBadge({
  label,
  sub,
  children,
}: {
  label: string;
  sub: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href="#"
      onClick={(e) => e.preventDefault()}
      aria-label={`${sub} ${label}`}
      className="group inline-flex items-center gap-3 rounded-2xl bg-[#1a1416] px-5 py-2.5 text-white shadow-[0_14px_28px_-18px_rgba(26,20,22,.85)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-black hover:shadow-[0_20px_36px_-18px_rgba(26,20,22,.9)]"
    >
      {children}
      <span className="flex flex-col text-left leading-tight">
        <span className="text-[10px] font-medium opacity-80">{sub}</span>
        <span className="-mt-0.5 text-lg font-semibold tracking-tight">{label}</span>
      </span>
    </a>
  );
}

export default function DownloadApp() {
  const rootRef = useRef<HTMLElement>(null);
  const phoneRef = useRef<HTMLDivElement>(null);

  /**
   * Watch the PHONE, not the section, and wait until most of it is on screen.
   *
   * Observing the section at a quarter visible meant the trigger fired after
   * about 160px of a 640px section — which is 80px of top padding plus the top
   * sliver of the phone. The cloth was already lifting while the phone was
   * still below the fold, so by the time it was in view the reveal was over.
   * The observed element has to be the thing being revealed.
   *
   * Own observer rather than <Reveal> for the same reason as elsewhere: its
   * 1.4s fail-safe fires whether the element has been reached or not.
   */
  useEffect(() => {
    const el = rootRef.current;
    const target = phoneRef.current;
    if (!el || !target) return;
    if (typeof IntersectionObserver === 'undefined') {
      el.classList.add('is-unveiled');
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          el.classList.add('is-unveiled');
          io.disconnect();
        }
      },
      // 60% of the phone, and the last 6% of the viewport doesn't count — the
      // reveal should start once it is settled in view, not as it clips the
      // bottom edge.
      { threshold: 0.6, rootMargin: '0px 0px -6% 0px' },
    );
    io.observe(target);
    return () => io.disconnect();
  }, []);

  /**
   * Ground: a light room, not a coloured stripe.
   *
   * FOUR full-bleed colours were tried here and every one was rejected. Woven
   * #f4ece4 → white was identical to "Read the label" directly below, so the
   * two merged. A flat mid stone was the same cream family, only darker. Dark
   * oxblood separated cleanly but was too heavy for a page that is light
   * throughout. Dusty rose differed in hue rather than lightness and still did
   * not land.
   *
   * At four rejections the hue was not the problem. Every other section on this
   * page is white or a whisper off it; this one was the only solid wash of
   * colour across the full viewport, and a band that size reads as heavy
   * whatever you pour into it.
   *
   * So the colour is CONTAINED. It is now a single soft disc sitting behind
   * the phone — the thing the phone stands against — on a barely-there cream,
   * with a patch of dots at the left edge and a whisper of hatching top right
   * to give the space a floor and a corner. Same conclusion as before, drawn
   * as an object rather than as a gradient across the whole viewport.
   */
  return (
    <section
      id="download-app"
      ref={rootRef}
      className="relative w-full scroll-mt-24 overflow-hidden bg-[#fdf8f5] py-14 font-sans sm:py-20 lg:py-24 xl:py-28"
    >
      {/* The disc the phone stands against. */}
      <span
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-2 h-[28rem] w-[28rem] -translate-x-1/2 sm:h-[34rem] sm:w-[34rem] lg:left-[25%] lg:top-1/2 lg:-translate-y-1/2 xl:h-[40rem] xl:w-[40rem]"
        style={{
          background:
            'radial-gradient(circle closest-side, #f6d7cc 0%, #f9e3da 44%, rgba(253,248,245,0) 100%)',
        }}
      />
      {/* Dots at the left edge, fading out towards the phone so they read as
          texture on the wall rather than a rectangle of pattern. */}
      <span
        aria-hidden
        className="pointer-events-none absolute left-[1.5%] top-[26%] hidden h-52 w-36 lg:block"
        style={{
          backgroundImage: 'radial-gradient(circle, #e3b3a6 1.4px, transparent 1.4px)',
          backgroundSize: '17px 17px',
          maskImage:
            'radial-gradient(ellipse closest-side at 30% 50%, #000 0%, rgba(0,0,0,0.4) 58%, transparent 100%)',
          WebkitMaskImage:
            'radial-gradient(ellipse closest-side at 30% 50%, #000 0%, rgba(0,0,0,0.4) 58%, transparent 100%)',
        }}
      />
      {/* A corner, top right. */}
      <span
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-6 hidden h-56 w-72 lg:block"
        style={{
          backgroundImage:
            'repeating-linear-gradient(48deg, rgba(224,26,27,0.055) 0 1px, transparent 1px 15px)',
          maskImage: 'radial-gradient(ellipse closest-side at 62% 34%, #000 0%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(ellipse closest-side at 62% 34%, #000 0%, transparent 100%)',
        }}
      />

      <style>{`
        /* ── The handset ────────────────────────────────────────────────────
           Everything inside is laid out at the render's OWN pixel scale and
           the whole assembly is then scaled as one. That is what keeps the
           measured homography valid at any size: scale it and the screen quad
           scales with it, so the app never drifts out of the frame.
           --pw is simply how wide the phone draws. */
        .dl-stage { --pw: 232 }
        @media (min-width: 640px)  { .dl-stage { --pw: 292 } }
        /* Down a little where the row first turns horizontal and the copy is
           at its tightest, then up once there is width to spend. */
        @media (min-width: 1024px) { .dl-stage { --pw: 276 } }
        @media (min-width: 1280px) { .dl-stage { --pw: 344 } }

        .dl-phone {
          position: relative;
          width: calc(var(--pw) * 1px);
          height: calc(var(--pw) * 1448 / 927 * 1px);
        }
        .dl-art {
          position: absolute;
          top: 0;
          left: 0;
          width: 927px;
          height: 1448px;
          transform-origin: 0 0;
          transform: scale(calc(var(--pw) / 927));
        }
        /* The app, projected onto the screen hole. transform-origin has to be
           the top-left corner: the homography was solved from that corner and
           the default centre origin would slide it half a phone sideways. */
        .dl-screen {
          position: absolute;
          top: 0;
          left: 0;
          overflow: hidden;
          transform-origin: 0 0;
        }

        /* ── The feed ───────────────────────────────────────────────────────
           Holds on a screen, travels to the next, holds again. A constant
           crawl reads as a machine; the pauses are what make it look like
           someone is thumbing through it. Ends on the repeated panel, so the
           jump back to 0% lands on identical pixels. */
        @keyframes m2cFeed {
          0%, 14%   { transform: translateY(0) }
          34%, 54%  { transform: translateY(-33.333%) }
          74%, 100% { transform: translateY(-66.667%) }
        }
        .dl-feed { animation: m2cFeed 17s cubic-bezier(0.65,0,0.35,1) infinite; }

        /* A tap landing during a hold, not during a scroll — a finger pressing
           a moving list would read as a mis-tap. */
        @keyframes m2cTap {
          0%, 3%  { opacity: 0; transform: scale(.35) }
          6%      { opacity: .5; transform: scale(.5) }
          14%     { opacity: 0; transform: scale(1.7) }
          100%    { opacity: 0; transform: scale(1.7) }
        }
        .dl-tap { animation: m2cTap 17s linear infinite; }

        /* ── The unveiling ──────────────────────────────────────────────────
           The cloth leaves diagonally. Straight up is a garage door; a couple
           of degrees of rotation is a hand taking one corner. Its own downward
           shadow darkens the phone just beneath its hem, so the dark band
           travels up with it and the screen is genuinely uncovered rather than
           having a rectangle slide off in front of it.

           Its measurements are in the render's pixels like everything else
           in here, which is why they look large. The motion is unchanged. */
        .dl-cloth {
          transform: translateY(0) rotate(0deg);
          /* A beat before it moves. Lifting the instant the phone qualifies
             reads as a trigger firing; a short pause reads as someone taking
             hold of the corner. */
          transition:
            transform 980ms cubic-bezier(0.62,0.02,0.3,1) 180ms,
            opacity 260ms linear 940ms;
        }
        .is-unveiled .dl-cloth { transform: translateY(-124%) rotate(-4deg); opacity: 0; }

        /* The screen comes up as the hem clears it. */
        .dl-dim { opacity: 1; transition: opacity 620ms linear 560ms; }
        .is-unveiled .dl-dim { opacity: 0; }

        /* A scanner sweep, held at the top for a beat between passes so it
           reads as repeated attempts rather than a metronome. */
        @keyframes dlScan {
          0%, 6%   { top: 4%; opacity: 0 }
          12%      { opacity: .85 }
          52%      { top: 92%; opacity: .85 }
          58%, 100%{ top: 92%; opacity: 0 }
        }
        .dl-scan { animation: dlScan 3s cubic-bezier(0.5,0,0.5,1) infinite; }

        .dl-in { opacity: 0; transform: translateY(20px); }
        .is-unveiled .dl-in {
          opacity: 1; transform: none;
          transition: opacity .6s ease, transform .8s cubic-bezier(0.22,1,0.36,1);
        }

        @media (prefers-reduced-motion: reduce) {
          .dl-feed, .dl-tap, .dl-scan { animation: none }
          .dl-scan { opacity: 0 }
          .dl-cloth { display: none }
          .dl-dim { opacity: 0 }
          .dl-in { opacity: 1; transform: none; transition: none }
        }
      `}</style>

      <div className="relative mx-auto flex max-w-6xl flex-col items-center gap-12 px-4 sm:px-6 lg:max-w-[78rem] lg:flex-row lg:items-center lg:gap-9 lg:px-8 xl:max-w-[84rem]">
        {/* ── The handset ───────────────────────────────────────────────── */}
        <div ref={phoneRef} className="dl-in relative shrink-0 lg:pl-4">
          <div className="dl-stage relative">
            {/* Contact shadow. The render has none of its own — it was cut
                out of its background — so without this the phone hovers. */}
            <span
              aria-hidden
              className="pointer-events-none absolute -bottom-6 left-1/2 h-9 w-[76%] -translate-x-1/2 rounded-[50%]"
              style={{
                background: 'radial-gradient(50% 50%, rgba(120,58,46,.3), rgba(120,58,46,0) 70%)',
                filter: 'blur(9px)',
              }}
            />

            <div className="dl-phone">
              <div className="dl-art">
                {/* The app, under the frame and projected into its screen. */}
                <div
                  className="dl-screen"
                  style={{ width: SCREEN_W, height: SCREEN_H, transform: SCREEN_MATRIX }}
                >
                  <div className="dl-feed absolute inset-x-0 top-0" style={{ height: '300%' }}>
                    {FEED.map(({ src, alt }, i) => (
                      <div key={i} className="relative h-1/3 w-full">
                        <Image
                          src={src}
                          alt={alt}
                          fill
                          sizes="360px"
                          className="object-cover object-top"
                          aria-hidden={alt === '' || undefined}
                        />
                      </div>
                    ))}
                  </div>

                  {/* Taps, timed to the two holds in the feed cycle. */}
                  <span
                    aria-hidden
                    className="dl-tap absolute left-[30%] top-[46%] h-24 w-24 rounded-full bg-[#e01a1b]"
                    style={{ animationDelay: '1.4s' }}
                  />
                  <span
                    aria-hidden
                    className="dl-tap absolute left-[64%] top-[62%] h-24 w-24 rounded-full bg-[#e01a1b]"
                    style={{ animationDelay: '8.2s' }}
                  />

                  {/* Light across the glass. The frame brings its own
                      highlights; the screen is a hole, so it would otherwise
                      be the one evenly-lit surface on a turned object. */}
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-0 z-10"
                    style={{
                      background:
                        'linear-gradient(102deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0) 22%, rgba(30,20,16,0.04) 60%, rgba(30,20,16,0.13) 100%)',
                    }}
                  />

                  {/* Screen off until the hem clears it. */}
                  <span aria-hidden className="dl-dim absolute inset-0 z-20 bg-[#1a1416]/60" />
                </div>

                {/* The render, over the top. max-w-none because the reset caps
                    images at their container and this one is deliberately
                    wider than the box — the box is the phone, the file has a
                    transparent margin around it. */}
                <Image
                  src={PHONE_SRC}
                  alt=""
                  aria-hidden
                  width={PHONE.fileW}
                  height={PHONE.fileH}
                  priority={false}
                  className="pointer-events-none absolute z-10 max-w-none select-none"
                  style={{ left: PHONE.offX, top: PHONE.offY }}
                />

                {/* The cloth. Elliptical radii on the bottom two corners only —
                    and deliberately unequal, so the hem falls as an S rather
                    than a straight fold. A square edge sliding up is a wipe,
                    not a cloth. */}
                <span
                  aria-hidden
                  className="dl-cloth pointer-events-none absolute z-30"
                  style={{
                    left: -49,
                    top: -62,
                    width: PHONE.w + 98,
                    height: PHONE.h - 28,
                    // Deepened along with the ground. At its old #efe3d7 it was
                    // within a shade of the background and the reveal would
                    // have been invisible — the cloth has to out-contrast
                    // whatever it is lying on.
                    background:
                      'linear-gradient(#e2b4aa, #c98d81),' +
                      'linear-gradient(45deg, rgba(70,38,24,.07) 25%, transparent 25%, transparent 75%, rgba(70,38,24,.07) 75%)',
                    backgroundSize: 'auto, 56px 56px',
                    borderRadius: '43px 43px 62% 38% / 43px 43px 22% 13%',
                    boxShadow: '0 68px 117px -37px rgba(120,55,45,.45)',
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── Copy ──────────────────────────────────────────────────────── */}
        <div className="dl-in w-full text-center lg:flex-1 lg:text-left" style={{ transitionDelay: '160ms' }}>
          <span className="mb-3 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#e01a1b] sm:text-xs">
            <span className="h-px w-6 bg-[#e01a1b]" />
            Mobile App
          </span>
          {/* Broken after the brand and coloured from there: the first line is
              who, the second is the promise, and the red carries the eye down
              into the paragraph. */}
          <h2 className="font-playfair mb-4 text-[30px] font-semibold leading-[1.1] tracking-tight text-[#1a1416] sm:text-[38px] lg:text-[36px] xl:text-[44px]">
            Shop M2C
            <br />
            <span className="text-[#e01a1b]">from your pocket.</span>
          </h2>
          <span aria-hidden className="mx-auto mb-5 block h-[3px] w-11 rounded-full bg-[#e01a1b] lg:mx-0" />
          <p className="mx-auto mb-8 max-w-[30rem] text-base leading-relaxed text-[#6f625f] sm:text-[17px] lg:mx-0">
            Make your online shopping experience easier and faster. Browse, wishlist and order your favourite
            home textiles on the go — get the M2C MarkDowns app now.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 lg:justify-start">
            <StoreBadge sub="Download on the" label="App Store">
              <svg viewBox="0 0 384 512" className="h-7 w-7 shrink-0" fill="currentColor" aria-hidden="true">
                <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
              </svg>
            </StoreBadge>
            <StoreBadge sub="GET IT ON" label="Google Play">
              {/* The mark in its own four colours, as it is on Google's
                  own black badge. */}
              <svg viewBox="0 0 512 512" className="h-6 w-6 shrink-0" aria-hidden="true">
                <path fill="#00D2FF" d="M47 0C34 6.8 25.3 19.2 25.3 35.3v441.3c0 16.1 8.7 28.5 21.7 35.3l256.6-256L47 0z" />
                <path fill="#00E175" d="M325.3 234.3 104.6 13l280.8 161.2-60.1 60.1z" />
                <path fill="#FFC800" d="M472.2 225.6l-58.9-34.1-65.7 64.5 65.7 64.5 60.1-34.1c18-14.3 18-46.5-1.2-60.8z" />
                <path fill="#F5333F" d="M104.6 499l220.7-221.3 60.1 60.1L104.6 499z" />
              </svg>
            </StoreBadge>
          </div>
          {/* With the row hung from a common top line, the phone being the
              tallest column leaves the copy short. One more line closes some of
              that gap and says something the badges only imply. */}
          <p className="mt-6 flex items-center justify-center gap-2.5 text-[13px] tracking-[0.02em] text-[#6f625f] lg:justify-start">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#e01a1b]/[0.08] text-[#e01a1b]">
              <Smartphone className="h-3.5 w-3.5" strokeWidth={2.2} />
            </span>
            Free to download · iOS and Android
          </p>
        </div>

        {/* A rule rather than a gap. The QR is a separate offer from the
            badges, not a third badge. */}
        <span
          aria-hidden
          className="hidden w-px self-stretch bg-[linear-gradient(180deg,transparent,#f0dfd6_20%,#f0dfd6_80%,transparent)] lg:block"
        />

        {/* ── QR ────────────────────────────────────────────────────────────
            Desktop only, and that is the whole point of it. A visitor on a
            computer cannot use a store badge — clicking it lands them on a
            page they then have to find again on their phone. The QR is the
            only control on this side of the section that actually does
            something. Below lg the section stacks and the badges take over,
            since nobody scans their own screen. */}
        <div className="dl-in hidden shrink-0 lg:block" style={{ transitionDelay: '280ms' }}>
          {/* Warm, not white. This card sits on cream, and a white card on a
              near-white ground has only its border to separate it — it stopped
              reading as an object. The QR panel inside stays pure white, which
              is what scanners want. */}
          <div
            className="rounded-[1.75rem] border border-[#f3e2da] p-5 text-center shadow-[0_24px_46px_-26px_rgba(120,55,45,.4)]"
            style={{ background: 'linear-gradient(180deg, #fefaf8 0%, #f9e6dd 100%)' }}
          >
            <div className="relative mx-auto h-[172px] w-[172px] overflow-hidden rounded-xl bg-white p-1.5 shadow-[0_2px_10px_rgba(120,55,45,.08)]">
              <svg viewBox="-2 -2 29 29" className="h-full w-full" aria-hidden shapeRendering="crispEdges">
                <path d={QR_PATH} fill="#1a1416" />
              </svg>
              <span aria-hidden className="dl-scan absolute inset-x-2 h-[3px] rounded-full bg-[#e01a1b]" />
            </div>
            <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.2em] text-[#e01a1b]">
              Scan to install
            </p>
            <p className="mt-1.5 text-[12.5px] text-[#8c7f7d]">Point your camera here</p>
          </div>
        </div>
      </div>
    </section>
  );
}
