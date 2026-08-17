'use client';

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Instagram, Facebook, Youtube, Mail, Phone, ArrowRight } from "lucide-react";
import { categoryService, Category } from "@/services/categoryService";
import { companyInfoService, PublicCompanyInfo } from "@/services/companyInfoService";
import CompanyLogo from "@/components/Shared/CompanyLogo";
import { showSuccessToast } from "@/lib/toast-utils";

/**
 * The footer.
 *
 * It carried a full loom for a while — vertical warp threads the whole height
 * with the columns in the gaps, and a weft that wove across on arrival. The
 * client didn't want the ruled pattern, so the ground is now a plain warm bone
 * and the only rules left are the hairlines closing each link row, which are
 * structure rather than pattern.
 *
 * Removed earlier, and still gone:
 *  · the "— OUR PROMISE —" headline block, which repeated the eyebrow and the
 *    layout of the section directly above it, and opened the footer with a
 *    42px hero headline;
 *  · its subtitle, which was the same sentence as the company column's
 *    description 150px below it;
 *  · the four trust badges, which were the third set on one page after
 *    PromoStrip's — and which carried "Pan-India shipping" on a store that
 *    runs NEXT_PUBLIC_SITE_REGION=US and prices in dollars;
 *  · the grid, dot, twin-radial and drifting-contour layers — four decorative
 *    passes behind the content, replaced by the weave.
 */

const BONE = '#f7f2ec';

const WORDMARK = 'M2C MARKDOWNS';

/**
 * The wordmark is set to FIT, not to be cropped.
 *
 * It used to run at clamp(2.2rem, 12.2vw, 12.5rem) and overflow the container
 * deliberately, so the final S was sliced by the edge. Two problems: it read as
 * a bug rather than a crop, and vw keeps growing after the container stops at
 * 1680px, so the wider the monitor the more of the word was lost.
 *
 * "M2C MARKDOWNS" measures about 9.3em wide in Outfit ExtraBold at this
 * tracking (M and W are ~0.9em each, S and 2 ~0.6em). Against a 1616px content
 * width that caps the type at ~174px; 160px leaves a margin for font fallback,
 * where the metrics differ. 9.4vw keeps the same fit at every width below that.
 */
const WORDMARK_SIZE = 'clamp(1.6rem, 9.4vw, 10rem)';

/**
 * Column heading. The red→gold gradient dash is gone, and so is the numbering
 * that briefly replaced it — a lead rule and the label alone, which is exactly
 * how the eyebrows on Featured Products, Top Selling and Shop by Category are
 * built. Oxblood rather than near-black, so the heading lifts off the ink of
 * the rows beneath it.
 */
const ColHeading = ({ children }: { children: React.ReactNode }) => (
  <h4 className="flex items-center gap-2.5 text-[11px] font-bold uppercase tracking-[0.24em] text-[#7a0f10]">
    <span aria-hidden className="h-px w-5 shrink-0 bg-[#e01a1b]" />
    {children}
  </h4>
);

/**
 * Footer nav link — a row in the cloth, not a line of text on top of it.
 *
 * The arrow is gone: eleven links each carrying a → was eleven pieces of
 * punctuation doing no work. But removing it only fixed a detail. The reason
 * the block still read as a stock footer is that it WAS one — four vertical
 * lists of small type, which is the shape every footer has. So the shape
 * changed: every link is now a full-width row closed by a hairline, and those
 * hairlines are wefts. Warp behind, weft between each row, and the column
 * block is fabric rather than text sitting on a picture of fabric.
 *
 * 14.5px was fine print, which is why the eye skipped the words and only took
 * in the layout. 18px is navigation.
 *
 * Hover swaps the label. The word rides up out of the row and a red copy of it
 * rises into the same place from below, both moving together inside a clipped
 * box exactly one line tall. Nothing grows, slides sideways or underlines —
 * the row simply changes state, which is a cleaner read at 18px than a rule
 * racing across 236px of column.
 *
 * The second copy is aria-hidden: it is the same word twice in the DOM, and a
 * screen reader should hear it once.
 */
const ROW =
  "group flex w-full items-center gap-2.5 border-b border-[#e5d8cd] py-3 leading-none text-[#4f4442] transition-colors duration-300 hover:border-[#e01a1b]/45";
const SWAP = "transition-transform duration-[420ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:-translate-y-full";

/**
 * The swap itself, shared by every row in the footer. It lived inside NavLink
 * at first, which meant the Let's Connect column — email, phone, socials — had
 * only a colour change while the two columns beside it swapped, and one column
 * behaving differently from its neighbours reads as a bug rather than a choice.
 *
 * The clip box is sized in em, not pixels, so it tracks the font size across
 * breakpoints; a fixed pixel height crops the descenders at 18px.
 */
const SwapLabel = ({ label, wrapper = "", line = "" }: { label: string; wrapper?: string; line?: string }) => (
  <span className={`relative block h-[1.4em] overflow-hidden ${wrapper}`}>
    <span className={`block leading-[1.4] ${SWAP} ${line}`}>{label}</span>
    <span aria-hidden className={`absolute inset-x-0 top-full block leading-[1.4] text-[#e01a1b] ${SWAP} ${line}`}>
      {label}
    </span>
  </span>
);

const NavLink = ({ href, label }: { href: string; label: string }) => (
  <Link href={href} className={`${ROW} text-[17px] sm:text-[18px]`}>
    <SwapLabel label={label} wrapper="min-w-0 flex-1" />
  </Link>
);

/** Contact row — the same swap, with the icon leading it. */
const ConnectRow = ({
  href,
  Icon,
  label,
  external = false,
  clip = false,
}: {
  href: string;
  Icon: typeof Instagram;
  label: string;
  external?: boolean;
  clip?: boolean;
}) => (
  <a
    href={href}
    {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    className={`${ROW} text-[16px]`}
  >
    <Icon className="h-4 w-4 shrink-0 text-[#b8503c] transition-colors duration-300 group-hover:text-[#e01a1b]" />
    {/* The email overruns a 236px column, so its two copies truncate together —
        applied to one only, the red copy would arrive a different length. */}
    <SwapLabel label={label} wrapper="min-w-0 flex-1" line={clip ? "truncate" : ""} />
  </a>
);

const MainFooterContent = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [email, setEmail] = useState("");
  const [companyInfo, setCompanyInfo] = useState<PublicCompanyInfo>({
    companyName: 'M2C MarkDowns Private Limited',
    companyLogo: null,
    secondaryLogo: null,
    companyEmail: null,
    companyPhone: null,
    companyWebsite: null,
    registeredAddress: null,
    city: null,
    state: null,
    country: null,
    zipCode: null,
    socialInstagram: null,
    socialFacebook: null,
    socialYoutube: null,
  });

  const rootRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const wordmarkRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    categoryService.getAllCategories({ status: 'ACTIVE', showRootOnly: 'true' })
      .then((res) => { if (res.success && res.data) setCategories(res.data.slice(0, 6)); })
      .catch((e) => console.error("Failed to fetch categories for footer:", e));
    companyInfoService.getPublicCompanyInfo().then(setCompanyInfo).catch(() => {});
  }, []);

  /**
   * TWO triggers, not one — and neither of them watches the footer.
   *
   * A single observer on the root at 10% fired after ~70px of a 700px footer,
   * i.e. the moment its top edge appeared. That is roughly right for the
   * columns, which sit at the top, and completely wrong for the wordmark, which
   * sits at the very bottom: it had finished rising before it was ever on
   * screen. Whatever is being animated has to be the thing observed.
   *
   * Not <Reveal> for either, for the same reason as the rest of the page: its
   * 1.4s fail-safe fires whether the element has been reached or not.
   */
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const targets: Array<[HTMLElement | null, string, number]> = [
      [gridRef.current, 'is-woven', 0.12],
      [wordmarkRef.current, 'is-stamped', 0.7],
    ];
    if (typeof IntersectionObserver === 'undefined') {
      targets.forEach(([, cls]) => root.classList.add(cls));
      return;
    }
    const observers = targets.map(([el, cls, threshold]) => {
      if (!el) return null;
      const io = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) {
            root.classList.add(cls);
            io.disconnect();
          }
        },
        // The last 5% of the viewport doesn't count, so nothing starts while
        // it is still clipping the bottom edge.
        { threshold, rootMargin: '0px 0px -5% 0px' },
      );
      io.observe(el);
      return io;
    });
    return () => observers.forEach((io) => io?.disconnect());
  }, []);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    showSuccessToast("Subscribed", "You're on the list — new arrivals & offers are on the way.");
    setEmail("");
  };

  /**
   * One set of social links, not two. Instagram and Facebook were rendered
   * twice in this footer — as bare circles under the company blurb AND as
   * labelled rows in Let's Connect — the same two destinations, 400px apart.
   * The labelled rows win: they say where they go, and they give that column
   * enough to stand up. YouTube moved in with them so no link was lost.
   */
  const connectSocials = [
    { url: companyInfo.socialInstagram, Icon: Instagram, label: "Instagram" },
    { url: companyInfo.socialFacebook, Icon: Facebook, label: "Facebook" },
    { url: companyInfo.socialYoutube, Icon: Youtube, label: "YouTube" },
  ].filter((s) => s.url) as { url: string; Icon: typeof Instagram; label: string }[];

  return (
    <div ref={rootRef} className="relative overflow-hidden text-[#3f3f46]" style={{ background: BONE }}>
      <style>{`
        .m2c-col { opacity: 0; transform: translateY(22px); }
        .is-woven .m2c-col {
          opacity: 1; transform: none;
          transition: opacity .6s ease, transform .7s cubic-bezier(0.22,1,0.36,1);
        }

        /* Driven by is-stamped, from its own observer on the wordmark itself —
           under the columns' trigger it had already risen by the time it
           scrolled into view. */
        .m2c-wm span { display: inline-block; opacity: 0; transform: translateY(0.3em); }
        .is-stamped .m2c-wm span {
          opacity: 1; transform: translateY(0);
          transition: opacity .5s ease, transform .75s cubic-bezier(0.22,1,0.36,1);
        }

        @media (prefers-reduced-motion: reduce) {
          .m2c-col, .is-woven .m2c-col,
          .m2c-wm span, .is-stamped .m2c-wm span { opacity: 1; transform: none; transition: none; }
        }
      `}</style>

      {/* Brand hairline across the very top — subtle continuity with the site. */}
      <div
        className="absolute inset-x-0 top-0 z-10 h-px"
        style={{ background: "linear-gradient(90deg, transparent, rgba(224,26,27,0.25), rgba(224,26,27,0.7), rgba(224,26,27,0.25), transparent)" }}
      />

      <div className="relative mx-auto max-w-7xl px-4 pt-14 sm:px-6 sm:pt-16 lg:px-8 xl:max-w-420">
        <div ref={gridRef} className="relative grid grid-cols-1 gap-x-8 gap-y-11 sm:grid-cols-2 lg:grid-cols-12 lg:gap-x-10">
          {/* Our Company */}
          <div className="m2c-col min-w-0 sm:col-span-2 lg:col-span-3">
            <Link href="/" className="inline-block">
              <CompanyLogo
                className="h-12 w-auto object-contain sm:h-14"
                skeletonClassName="h-12 sm:h-14 w-40 bg-black/5"
                fallbackWidth={220}
                fallbackHeight={56}
              />
            </Link>
            <p className="mt-5 max-w-[21rem] text-[14.5px] leading-[1.7] text-[#6f625f]">
              Premium home textiles manufacturer specializing in high-quality towels, kitchen aprons, table linens and bath accessories — crafted with finest cotton and sustainable materials for everyday comfort.
            </p>
            {/* Solid oxblood rather than a white pill on a warm ground. The
                white pill was a second surface floating over the weave, the
                same mismatch the newsletter card had. */}
            <Link
              href="/about"
              className="group mt-6 inline-flex items-center gap-2 rounded-full bg-[#7a0f10] px-6 py-2.5 text-[13px] font-semibold tracking-[0.04em] text-[#fdf6f1] transition-colors duration-200 hover:bg-[#e01a1b]"
            >
              About M2C
              <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-1" />
            </Link>
          </div>

          {/* Explore */}
          <div className="m2c-col min-w-0 lg:col-span-2" style={{ transitionDelay: '80ms' }}>
            <ColHeading>Explore</ColHeading>
            <div className="mt-5 flex flex-col">
              <NavLink href="/" label="Home" />
              <NavLink href="/about" label="About" />
              <NavLink href="/products" label="Products" />
              <NavLink href="/contact" label="Contact Us" />
            </div>
          </div>

          {/* Categories */}
          <div className="m2c-col min-w-0 lg:col-span-2" style={{ transitionDelay: '160ms' }}>
            <ColHeading>Categories</ColHeading>
            <div className="mt-5 flex flex-col">
              <NavLink href="/categories" label="All Categories" />
              {categories.map((c) => (
                <NavLink key={c.id} href={`/categories/${c.slug}`} label={c.name} />
              ))}
            </div>
          </div>

          {/* Let's Connect */}
          <div className="m2c-col min-w-0 lg:col-span-2" style={{ transitionDelay: '240ms' }}>
            <ColHeading>Let&apos;s Connect</ColHeading>
            <div className="mt-5 flex flex-col">
              {companyInfo.companyEmail && (
                <ConnectRow href={`mailto:${companyInfo.companyEmail}`} Icon={Mail} label={companyInfo.companyEmail} clip />
              )}
              {companyInfo.companyPhone && (
                <ConnectRow href={`tel:${companyInfo.companyPhone}`} Icon={Phone} label={companyInfo.companyPhone} />
              )}
              {connectSocials.map(({ url, Icon, label }) => (
                <ConnectRow key={label} href={url} Icon={Icon} label={label} external />
              ))}
            </div>
          </div>

          {/* Stay Updated — newsletter */}
          <div className="m2c-col min-w-0 sm:col-span-2 lg:col-span-3" style={{ transitionDelay: '320ms' }}>
            <ColHeading>Stay Updated</ColHeading>
            {/* A bordered field, not a card and not a bare underline.
                The card version floated over the weave with its own shadow and
                backdrop-blur; the underline version went the other way and
                vanished into a warm ground it barely out-contrasted. A form
                field is entitled to be its own surface — that is what tells
                you it can be typed in — so it gets white fill and a warm
                border, and no shadow, so it sits IN the weave rather than
                above it. */}
            <p className="mt-5 text-[16.5px] font-bold text-[#1a1416]">Get the latest from M2C</p>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-[#6f625f]">
              New arrivals, offers &amp; more.
            </p>
            <form
              onSubmit={handleSubscribe}
              className="mt-5 flex max-w-[22rem] items-center gap-2.5 rounded-full border border-[#dfcdc1] bg-white py-1.5 pl-4 pr-1.5 transition-colors focus-within:border-[#e01a1b]"
            >
              <Mail className="h-4 w-4 shrink-0 text-[#b8503c]" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                aria-label="Email address"
                className="min-w-0 flex-1 bg-transparent text-[14.5px] text-[#1a1416] placeholder-[#a3928c] outline-none"
              />
              <button
                type="submit"
                aria-label="Subscribe"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#e01a1b] text-white transition-all duration-200 hover:scale-105 hover:bg-[#c41617]"
              >
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* A single hairline where the weft used to run — a divider, not a
          pattern. */}
      <div className="relative mx-auto mt-14 h-px max-w-7xl px-4 sm:px-6 lg:px-8 xl:max-w-420">
        <span aria-hidden className="block h-px w-full bg-[#e0d3c6]" />
      </div>

      {/* ── Wordmark ─────────────────────────────────────────────────────── */}
      <div ref={wordmarkRef} className="relative mx-auto max-w-7xl px-4 pb-6 pt-8 sm:px-6 lg:px-8 xl:max-w-420">
        <div
          aria-label={WORDMARK}
          role="img"
          className="m2c-wm select-none whitespace-nowrap text-center font-extrabold leading-[0.86] tracking-[-0.02em] text-[#7a0f10]/[0.13]"
          style={{ fontSize: WORDMARK_SIZE }}
        >
          {WORDMARK.split('').map((ch, i) =>
            ch === ' ' ? (
              <span key={i} className="w-[0.26em]" />
            ) : (
              <span key={i} style={{ transitionDelay: `${700 + i * 45}ms` }}>
                {ch}
              </span>
            ),
          )}
        </div>
      </div>
    </div>
  );
};

export default MainFooterContent;
