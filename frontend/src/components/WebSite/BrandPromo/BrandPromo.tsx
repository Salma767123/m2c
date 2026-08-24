'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Factory, Headphones, ShieldCheck, TrendingUp, Truck, Wallet } from 'lucide-react';
import VendorApplicationModal from '@/components/WebSite/Shared/VendorApplicationModal';

/**
 * Brand-promotion band between the home-page product rails.
 *   • makers  — links to the full product catalogue.
 *   • sellers — opens the vendor application modal (same form as Contact page).
 *
 * These were two flat PNGs with every word baked into the pixels, and three
 * things were wrong with that:
 *
 *  1. The seller banner's own button was being cropped off. Both images were
 *     forced into one h-52 box with object-cover: at lg that box is 3.83:1
 *     while m2cseller.png is 2.07:1, so 46% of its height was trimmed. "JOIN AS
 *     A SELLER" sits 85% down the source, which landed 30px past the visible
 *     window. Both also carried scale-x-[1.06] — a 6% horizontal stretch, so
 *     every face and letter in them was that much too wide.
 *
 *  2. Baked text cannot reflow, be selected, searched, translated or read by a
 *     screen reader, and it cannot be edited without a designer. On a 390px
 *     phone m2cseller.png scaled to 20%, which rendered its body copy about 5px
 *     tall.
 *
 *  3. 3.46 MB of PNG on the home page, served as plain <img> with no
 *     optimisation — which is what the two eslint-disable comments were for.
 *
 * So the photography is kept and everything typographic is now real HTML in the
 * site's own fonts. The crops are the text-free regions of the originals
 * (the hang tags stay: they are physical objects in the scene, not overlay
 * type), re-encoded to WebP — 3.46 MB down to 136 KB.
 *
 * The point of the layout is that the photograph should not read as a picture
 * placed on a panel. It bleeds to the panel's top, outer and bottom edges with
 * no border and no radius of its own, and its inner edge is covered by a
 * gradient IN THE PANEL'S OWN GROUND COLOUR — opaque where it meets the copy,
 * clear by two-thirds across. Because the veil is literally the ground, there
 * is no seam to notice; the image appears to emerge out of the panel.
 *
 * Both ground colours are sampled from their own photograph rather than
 * chosen — cream #f5e9d6 sits between the makers image's bedding (#f4e7d0) and
 * its left edge (#e6d8bb); navy #132133 sits between the seller's apron
 * (#101b2a) and the hang tag (#1f3040). That is what makes the blend read as
 * light falling across one surface instead of two layers meeting.
 */

const REVEAL_THRESHOLD = 0.25;
const REVEAL_MARGIN = '0px 0px -10% 0px';

type Feature = { Icon: typeof Factory; label: string; note: string };

/** Ground colours as raw channels, so the veil can build rgba() from the same
 *  value the panel is painted with and the two can never drift apart. */
const CREAM_RGB = '245, 233, 214';
const NAVY_RGB = '19, 33, 51';

const MAKER_FEATURES: Feature[] = [
  { Icon: Factory, label: 'From the makers', note: 'No middlemen' },
  { Icon: ShieldCheck, label: 'Quality checked', note: 'Trusted & inspected' },
  { Icon: Truck, label: 'Fast delivery', note: 'Across the country' },
];

const SELLER_FEATURES: Feature[] = [
  { Icon: Wallet, label: 'Zero selling fee', note: '100% free to list' },
  { Icon: TrendingUp, label: 'Reach more buyers', note: 'Thousands, daily' },
  { Icon: Headphones, label: '24×7 support', note: "We're here anytime" },
];

export default function BrandPromo() {
  const [showVendorModal, setShowVendorModal] = useState(false);
  const gridRef = useRef<HTMLDivElement | null>(null);

  // Own observer rather than <Reveal>, which carries a 1.4s fail-safe that
  // fires on a timer whether the element has been scrolled to or not.
  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    if (typeof IntersectionObserver === 'undefined') {
      grid.classList.add('is-in');
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          grid.classList.add('is-in');
          io.disconnect();
        }
      },
      { threshold: REVEAL_THRESHOLD, rootMargin: REVEAL_MARGIN },
    );
    io.observe(grid);
    return () => io.disconnect();
  }, []);

  return (
    <section className="bg-white pt-3 pb-1 font-sans sm:pt-4 sm:pb-1.5 lg:pt-5 lg:pb-2">
      <style>{`
        /* The veil. Vertical below sm, where the photograph sits as a band above
           the copy; horizontal from sm, where it sits beside it. Both end fully
           opaque against the copy and fully clear across the subject, so the
           photograph is never dimmed where it matters. */
        .bp-veil {
          background: linear-gradient(to bottom,
            rgba(var(--g), 0) 30%,
            rgba(var(--g), .55) 62%,
            rgba(var(--g), .93) 86%,
            rgb(var(--g)) 100%);
        }
        @media (min-width: 640px) {
          .bp-veil {
            background: linear-gradient(to right,
              rgb(var(--g)) 0%,
              rgba(var(--g), .95) 20%,
              rgba(var(--g), .58) 44%,
              rgba(var(--g), 0) 72%);
          }
        }

        .bp-panel { opacity: 0; transform: translateY(20px) }
        .is-in .bp-panel {
          opacity: 1; transform: none;
          transition: opacity .6s ease var(--d, 0ms), transform .75s cubic-bezier(0.22,1,0.36,1) var(--d, 0ms);
        }

        /* The photograph drifts in a touch on hover. Scale only — the previous
           version stretched X and Y by different amounts, which distorted it. */
        .bp-art img { transition: transform 700ms cubic-bezier(0.22,1,0.36,1) }
        .group:hover .bp-art img { transform: scale(1.045) }

        @media (prefers-reduced-motion: reduce) {
          .bp-panel, .is-in .bp-panel { opacity: 1; transform: none; transition: none }
          .bp-art img, .group:hover .bp-art img { transition: none; transform: none }
        }
      `}</style>

      <div className="mx-auto max-w-7xl px-3 sm:px-4 md:px-6 lg:px-8 xl:max-w-420">
        <div ref={gridRef} className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2 lg:gap-6">
          {/* ── Buyers ─────────────────────────────────────────────────── */}
          <Panel
            groundRgb={CREAM_RGB}
            href="/products"
            ariaLabel="Shop all products"
            image={{
              src: '/assets/images/promo/makers.webp',
              alt: 'A ribboned stack of folded cotton textiles beside a plant and cushions',
              position: '62% center',
            }}
            eyebrow="Made with care, delivered to you"
            eyebrowClass="text-[#c41617]"
            heading={
              <>
                Premium textiles,
                <br className="hidden sm:block" /> straight from{' '}
                <span className="text-[#a8121c]">the makers.</span>
              </>
            }
            headingClass="text-[#2a1c17]"
            features={MAKER_FEATURES}
            featureLabelClass="text-[#2a1c17]"
            featureNoteClass="text-[#6b5b50]"
            featureIconClass="text-[#a8121c]"
            cta="Shop the collection"
            // Brand red, matching every other "shop more" button on the page.
            // The seller panel keeps gold because that is a different action on
            // a different ground, not the same button in another colour.
            ctaClass="bg-[#e01a1b] text-white hover:bg-[#c41617] shadow-[0_12px_26px_-14px_rgba(224,26,27,0.9)]"
            delay="0ms"
          />

          {/* ── Sellers ────────────────────────────────────────────────── */}
          <Panel
            groundRgb={NAVY_RGB}
            onClick={() => setShowVendorModal(true)}
            ariaLabel="Join us as a vendor"
            image={{
              src: '/assets/images/promo/sellers.webp',
              // slightly lower anchor so the "your brand · our platform" tag at the
              // image's bottom isn't clipped off the shorter panel.
              alt: 'Four M2C vendors standing among folded textiles and packed cartons',
              position: '50% 42%',
            }}
            eyebrow="Your success, our platform"
            eyebrowClass="text-[#e0a83d]"
            heading={
              <>
                Sell more.
                <br className="hidden sm:block" /> <span className="text-[#e0a83d]">Keep more.</span>
              </>
            }
            headingClass="text-white"
            features={SELLER_FEATURES}
            featureLabelClass="text-white"
            featureNoteClass="text-[#c3cddb]"
            featureIconClass="text-[#e0a83d]"
            cta="Join as a seller"
            ctaClass="bg-[#e0a83d] text-[#132133] hover:bg-[#f0bf5c] shadow-[0_12px_26px_-14px_rgba(224,168,61,0.9)]"
            delay="110ms"
          />
        </div>
      </div>

      <VendorApplicationModal open={showVendorModal} onClose={() => setShowVendorModal(false)} />
    </section>
  );
}

/**
 * One panel. Buyers navigate and sellers open a modal, so the shell renders as
 * a Link or a button accordingly — everything inside is identical either way.
 */
function Panel({
  groundRgb,
  href,
  onClick,
  ariaLabel,
  image,
  eyebrow,
  eyebrowClass,
  heading,
  headingClass,
  features,
  featureLabelClass,
  featureNoteClass,
  featureIconClass,
  cta,
  ctaClass,
  delay,
}: {
  groundRgb: string;
  href?: string;
  onClick?: () => void;
  ariaLabel: string;
  image: { src: string; alt: string; position: string };
  eyebrow: string;
  eyebrowClass: string;
  heading: React.ReactNode;
  headingClass: string;
  features: Feature[];
  featureLabelClass: string;
  featureNoteClass: string;
  featureIconClass: string;
  cta: string;
  ctaClass: string;
  delay: string;
}) {
  const shell =
    'bp-panel group relative block w-full overflow-hidden rounded-3xl text-left focus:outline-none focus-visible:ring-4 focus-visible:ring-[#e01a1b]/40';

  const body = (
    <>
      {/* The photograph. In flow above the copy on phones; bleeding off the
          outer edge beside it from sm. No border and no radius of its own — the
          panel's rounding clips it, which is what stops it reading as a picture
          sitting on top of something. */}
      {/* overflow-hidden is load-bearing, not tidiness. The image scales on
          hover, and without it the grown image spills past this box's left edge
          into the strip the veil does not cover — putting a hard vertical seam
          of raw photograph against the flat ground. The panel's own
          overflow-hidden does not help: the spill is inside the panel. */}
      <div className="bp-art relative h-44 w-full overflow-hidden sm:absolute sm:inset-y-0 sm:right-0 sm:h-auto sm:w-[64%]">
        <Image
          src={image.src}
          alt={image.alt}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1280px) 45vw, 640px"
          className="object-cover"
          style={{ objectPosition: image.position }}
        />
        <span aria-hidden className="bp-veil absolute inset-0" />
      </div>

      <div className="relative p-6 sm:w-[58%] sm:py-6 sm:pl-8 sm:pr-4 lg:py-6 lg:pl-10">
        <span className={`text-[10.5px] font-bold uppercase tracking-[0.18em] ${eyebrowClass}`}>{eyebrow}</span>

        <h3 className={`font-playfair mt-2.5 text-[26px] font-semibold leading-[1.12] tracking-tight sm:text-[28px] lg:text-[34px] ${headingClass}`}>
          {heading}
        </h3>

        {/* Three facts, not a paragraph — the artwork made the same points as
            pill graphics, and they read faster as a list than as prose. */}
        <ul className="mt-4 space-y-2">
          {features.map(({ Icon, label, note }) => (
            <li key={label} className="flex items-center gap-2.5">
              <Icon className={`h-[18px] w-[18px] shrink-0 ${featureIconClass}`} strokeWidth={1.9} aria-hidden />
              <span className={`text-[13.5px] font-semibold leading-tight ${featureLabelClass}`}>
                {label}
                <span className={`ml-1.5 font-normal ${featureNoteClass}`}>· {note}</span>
              </span>
            </li>
          ))}
        </ul>

        {/* A span, not a nested button or link — the whole panel is already the
            control, and putting an interactive element inside it would nest one
            inside the other. */}
        <span
          className={`mt-5 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[13px] font-semibold tracking-[0.02em] transition-colors duration-300 ${ctaClass}`}
        >
          {cta}
          <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
        </span>
      </div>
    </>
  );

  const style = { background: `rgb(${groundRgb})`, '--g': groundRgb, '--d': delay } as React.CSSProperties;

  return href ? (
    <Link href={href} aria-label={ariaLabel} className={shell} style={style}>
      {body}
    </Link>
  ) : (
    <button type="button" onClick={onClick} aria-label={ariaLabel} className={shell} style={style}>
      {body}
    </button>
  );
}
