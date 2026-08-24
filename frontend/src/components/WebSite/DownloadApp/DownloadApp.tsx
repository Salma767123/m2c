'use client';

import Image from 'next/image';
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
 * Store badges and their links are untouched.
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

const PHONE_RATIO = '1290/2796';

/* ─────────────────────────────────────────────────────────────────────────
   PLACEHOLDER QR — ENCODES NOTHING. REPLACE BEFORE LAUNCH.

   The app is still in testing, so there is no store listing to point at. This
   draws a QR-shaped pattern with real finder, timing and alignment marks so
   the panel can be reviewed at full size, but the data modules are a
   deterministic hash, not encoded bytes. Scanning it does nothing.

   Deterministic on purpose: Math.random() here would produce a different grid
   on the server and the client and blow up hydration.

   To go live: drop in a real QR (as an <Image>, or generate one) in place of
   the <svg> in QrPanel. Nothing else in this file needs to change.
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

  // One path for the whole grid — 300-odd separate <rect> elements is a lot of
  // DOM for a decorative square.
  let d = '';
  for (let y = 0; y < QR_N; y++)
    for (let x = 0; x < QR_N; x++) if (on[y][x]) d += `M${x} ${y}h1v1h-1z`;
  return d;
}

const QR_PATH = buildPlaceholderQr();

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
      className="group inline-flex items-center gap-3 rounded-xl bg-black px-5 py-2.5 text-white shadow-md transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#141414] hover:shadow-lg"
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
   * Ground: a split, not a wash.
   *
   * FOUR full-bleed colours were tried here and every one was rejected. Woven
   * #f4ece4 → white was identical to "Read the label" directly below, so the
   * two merged. A flat mid stone was the same cream family, only darker. Dark
   * oxblood separated cleanly but was too heavy for a page that is light
   * throughout. Dusty rose differed in hue rather than lightness — cream sits
   * near 40°, rose near 10° — and still did not land.
   *
   * At four rejections the hue was not the problem. Every other section on this
   * page is white or a whisper off it; this one was the only solid wash of
   * colour across the full viewport, roughly 1900x700px of one tint, and a band
   * that size reads as heavy whatever you pour into it.
   *
   * So the colour is now CONTAINED: it sits behind the phone and fades out
   * before it reaches the copy, leaving the right-hand side white like the
   * Category section directly above. The tint has a job — it is the backdrop
   * the phone stands against — instead of being a stripe the section happens
   * to sit on.
   *
   * Two layers rather than one because the split has to follow the layout: the
   * row stacks below lg (phone above copy) so the fade runs top-to-bottom, and
   * only turns left-to-right once the row goes horizontal.
   *
   * The cloth keeps its deepened tone — it lies over the phone, which is still
   * on the tinted side, so it has the same thing to out-contrast as before.
   */
  return (
    <section
      id="download-app"
      ref={rootRef}
      className="relative w-full scroll-mt-24 overflow-hidden bg-white py-14 font-sans sm:py-20"
    >
      {/* Stacked layout: tint the top, where the phone is. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 lg:hidden"
        style={{
          background:
            'linear-gradient(180deg, #f8e2dd 0%, #f9e6e1 34%, rgba(249,230,225,0.45) 55%, rgba(255,255,255,0) 74%)',
        }}
      />
      {/* Horizontal layout: tint the left third and fade out before the copy.
          96deg rather than a flat 90 so the meeting edge is very slightly off
          vertical — dead vertical reads as two panels butted together. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 hidden lg:block"
        style={{
          background:
            'linear-gradient(96deg, #f6dbd5 0%, #f9e5e0 30%, rgba(249,229,224,0.5) 42%, rgba(255,255,255,0) 56%)',
        }}
      />

      <style>{`
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
           having a rectangle slide off in front of it. */
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

      <div className="relative mx-auto flex max-w-6xl flex-col items-center gap-12 px-4 sm:px-6 lg:flex-row lg:items-center lg:gap-12 lg:px-8">
        {/* ── Phone under cloth ─────────────────────────────────────────── */}
        <div ref={phoneRef} className="dl-in relative shrink-0">
          <div
            className="relative w-[220px] rounded-[2.2rem] bg-[#1a1416] p-1.5 shadow-[0_34px_70px_-24px_rgba(120,60,50,.6)] ring-1 ring-black/10 sm:w-[252px]"
          >
            <div
              className="relative overflow-hidden rounded-[1.8rem] bg-white"
              style={{ aspectRatio: PHONE_RATIO }}
            >
              <div className="dl-feed absolute inset-x-0 top-0" style={{ height: '300%' }}>
                {FEED.map(({ src, alt }, i) => (
                  <div key={i} className="relative h-1/3 w-full">
                    <Image
                      src={src}
                      alt={alt}
                      fill
                      sizes="252px"
                      className="object-cover object-top"
                      aria-hidden={alt === '' || undefined}
                    />
                  </div>
                ))}
              </div>

              {/* Taps, timed to the two holds in the feed cycle. */}
              <span
                aria-hidden
                className="dl-tap absolute left-[30%] top-[46%] h-10 w-10 rounded-full bg-[#e01a1b]"
                style={{ animationDelay: '1.4s' }}
              />
              <span
                aria-hidden
                className="dl-tap absolute left-[64%] top-[62%] h-10 w-10 rounded-full bg-[#e01a1b]"
                style={{ animationDelay: '8.2s' }}
              />

              {/* notch */}
              <div className="absolute left-1/2 top-0 z-20 h-4 w-20 -translate-x-1/2 rounded-b-xl bg-[#1a1416]" />

              {/* Screen off until the hem clears it. */}
              <span aria-hidden className="dl-dim absolute inset-0 z-20 bg-[#1a1416]/60" />
            </div>
          </div>

          {/* The cloth. Elliptical radii on the bottom two corners only — and
              deliberately unequal, so the hem falls as an S rather than a
              straight fold. A square edge sliding up is a wipe, not a cloth. */}
          <span
            aria-hidden
            className="dl-cloth pointer-events-none absolute -inset-x-4 -top-5 bottom-8 z-30"
            style={{
              // Deepened along with the ground. At its old #efe3d7 it was
              // within a shade of the new stone background and the reveal
              // would have been invisible — the cloth has to out-contrast
              // whatever it is lying on.
              background:
                'linear-gradient(#e2b4aa, #c98d81),' +
                'linear-gradient(45deg, rgba(70,38,24,.07) 25%, transparent 25%, transparent 75%, rgba(70,38,24,.07) 75%)',
              backgroundSize: 'auto, 18px 18px',
              borderRadius: '14px 14px 62% 38% / 14px 14px 22% 13%',
              boxShadow: '0 22px 38px -12px rgba(120,55,45,.45)',
            }}
          />
        </div>

        {/* ── Copy ──────────────────────────────────────────────────────── */}
        <div className="dl-in w-full text-center lg:flex-1 lg:text-left" style={{ transitionDelay: '160ms' }}>
          <span className="mb-3 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#e01a1b] sm:text-xs">
            <span className="h-px w-6 bg-[#e01a1b]" />
            Mobile App
          </span>
          <h2 className="font-playfair mb-4 text-3xl font-semibold leading-[1.08] tracking-tight text-[#1a1416] sm:text-4xl md:text-[42px] xl:text-5xl">
            Shop M2C from
            <br className="hidden sm:block" /> your pocket.
          </h2>
          <p className="mx-auto mb-8 max-w-xl text-base leading-relaxed text-[#6f625f] sm:text-lg lg:mx-0">
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
              {/* Official Google Play mark — its brand identity is the four-colour
                  play triangle (blue → green → yellow → red), so it's filled with
                  those colours rather than the monochrome white the others use. */}
              <svg viewBox="0 0 512 512" className="h-6 w-6 shrink-0" aria-hidden="true">
                <defs>
                  <linearGradient id="m2c-gplay" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#00D2FF" />
                    <stop offset="42%" stopColor="#00F076" />
                    <stop offset="74%" stopColor="#FFD500" />
                    <stop offset="100%" stopColor="#FF3D00" />
                  </linearGradient>
                </defs>
                <path fill="url(#m2c-gplay)" d="M325.3 234.3 104.6 13l280.8 161.2-60.1 60.1zM47 0C34 6.8 25.3 19.2 25.3 35.3v441.3c0 16.1 8.7 28.5 21.7 35.3l256.6-256L47 0zm425.2 225.6-58.9-34.1-65.7 64.5 65.7 64.5 60.1-34.1c18-14.3 18-46.5-1.2-60.8zM104.6 499l220.7-221.3 60.1 60.1L104.6 499z" />
              </svg>
            </StoreBadge>
          </div>
          {/* With the row hung from a common top line, the phone being the
              tallest column leaves the copy short. One more line closes some of
              that gap and says something the badges only imply. */}
          <p className="mt-6 text-[13px] tracking-[0.02em] text-[#6f625f]">
            Free to download · iOS and Android
          </p>
        </div>

        {/* ── QR ────────────────────────────────────────────────────────────
            Desktop only, and that is the whole point of it. A visitor on a
            computer cannot use a store badge — clicking it lands them on a
            page they then have to find again on their phone. The QR is the
            only control on this side of the section that actually does
            something. Below lg the section stacks and the badges take over,
            since nobody scans their own screen. */}
        <div className="dl-in hidden shrink-0 lg:block" style={{ transitionDelay: '280ms' }}>
          {/* Faintly tinted, not white. This card now sits on the white half of
              the split, and a white card on a white ground has only its border
              to separate it — it stopped reading as an object. The QR panel
              inside stays pure white, which is what scanners want. */}
          <div className="rounded-2xl border border-[#ecd7d1] bg-[#fdf6f4] p-5 text-center shadow-[0_22px_44px_-24px_rgba(120,55,45,.42)]">
            <div className="relative mx-auto h-[168px] w-[168px] overflow-hidden rounded-lg bg-white">
              <svg viewBox="-2 -2 29 29" className="h-full w-full" aria-hidden shapeRendering="crispEdges">
                <path d={QR_PATH} fill="#1a1416" />
              </svg>
              <span aria-hidden className="dl-scan absolute inset-x-2 h-[3px] rounded-full bg-[#e01a1b]" />
            </div>
            <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.2em] text-[#7a0f10]">
              Scan to install
            </p>
            <p className="mt-1.5 text-[12.5px] text-[#8c7f7d]">Point your camera here</p>
          </div>
        </div>
      </div>
    </section>
  );
}
