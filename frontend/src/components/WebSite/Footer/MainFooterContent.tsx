'use client';

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Instagram, Facebook, Youtube, Mail, Phone, ArrowRight } from "lucide-react";
import { categoryService, Category } from "@/services/categoryService";
import { companyInfoService, PublicCompanyInfo } from "@/services/companyInfoService";
import CompanyLogo from "@/components/Shared/CompanyLogo";
import { useSamePageTop } from "@/components/WebSite/Shared/useSamePageTop";

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
 *    passes behind the content, replaced by the weave;
 *  · the "Stay Updated" newsletter column. Beyond taking three of the twelve
 *    columns, its submit handler showed a "Subscribed" toast and then discarded
 *    the address — there is no subscribe endpoint in the backend. It had been
 *    collecting nothing while telling people otherwise.
 *
 * Let's Connect inherited that space, going from two columns (~236px, narrow
 * enough that the email address had to truncate) to five.
 */

/**
 * Clean white, not the warm bone this used to be.
 *
 * #f7f2ec was the same cream as half the page above it and read as beige
 * rather than as a surface. White gives the footer its own zone, and it lands
 * directly under the dark oxblood trust strip, so the edge between them is the
 * sharpest on the page — the footer announces itself without needing a rule.
 *
 * The greys came with it. Every one in here was warm-toned to sit on cream
 * (#6f625f, #4f4442, #e5d8cd, #b8503c); left alone on white they go muddy, and
 * the beige would have survived in the ink after being removed from the
 * ground. They are neutral now at the same lightness, so contrast is unchanged
 * and only the temperature moved.
 *
 * Brand red and oxblood are untouched — they are the site's colours, not a
 * temperature choice.
 */
/**
 * No background here. The gradient lives on the <footer> wrapper so it can run
 * unbroken across this block and the legal bar beneath it — see Footer.tsx.
 */
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

/**
 * Column heading. The red→gold gradient dash is gone, and so is the numbering
 * that briefly replaced it — a lead rule and the label alone, which is exactly
 * how the eyebrows on Featured Products, Top Selling and Shop by Category are
 * built. Oxblood rather than near-black, so the heading lifts off the ink of
 * the rows beneath it.
 */
const ColHeading = ({ children }: { children: React.ReactNode }) => (
  <h4 className="flex items-center gap-2.5 text-[11px] font-bold uppercase tracking-[0.24em] text-[#ff6b6c]">
    <span aria-hidden className="h-px w-5 shrink-0 bg-gradient-to-r from-[#e01a1b] to-[#ff6b6c]" />
    {children}
  </h4>
);

/**
 * Footer nav link.
 *
 * The hairline under every row is gone. It was there to read as weft across a
 * warp ground, and as an idea it worked — but fifteen full-width rules is the
 * loudest texture in the footer, and what it actually reads as is a directory
 * listing. It also made the ragged column bottoms (six links, five, four) into
 * three hard lines stopping at three different heights.
 *
 * Nothing replaces it. Spacing separates the rows now, and hover does the rest.
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
  "group flex w-full items-center gap-2.5 py-[7px] leading-none text-[#e7e2df] transition-colors duration-300";
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
    <span aria-hidden className={`absolute inset-x-0 top-full block leading-[1.4] text-[#ff6b6c] ${SWAP} ${line}`}>
      {label}
    </span>
  </span>
);

/**
 * Clicking one of these while already on that page used to do nothing at all —
 * see useSamePageTop for why, and for what it does instead.
 */
const NavLink = ({ href, label }: { href: string; label: string }) => {
  const samePageTop = useSamePageTop();
  return (
    <Link href={href} onClick={samePageTop(href)} className={`${ROW} text-[17px] sm:text-[18px]`}>
      <SwapLabel label={label} wrapper="min-w-0 flex-1" />
    </Link>
  );
};

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
    <Icon className="h-4 w-4 shrink-0 text-[#ff8f8f] transition-colors duration-300 group-hover:text-white" />
    {/* The email overruns a 236px column, so its two copies truncate together —
        applied to one only, the red copy would arrive a different length. */}
    <SwapLabel label={label} wrapper="min-w-0 flex-1" line={clip ? "truncate" : ""} />
  </a>
);

const MainFooterContent = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [companyInfo, setCompanyInfo] = useState<PublicCompanyInfo>({
    companyName: 'M2C Markdowns Pvt Ltd',
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

  /**
   * One set of social links, not two. Instagram and Facebook were rendered
   * twice in this footer — as bare circles under the company blurb AND as
   * labelled rows in Let's Connect — the same two destinations, 400px apart.
   * YouTube moved in with them so no link was lost.
   *
   * They are tiles now rather than another set of text rows. Three more rows
   * in the same column made the socials indistinguishable from navigation, and
   * the footer is bone and oxblood throughout — each platform's own colour
   * arriving on hover is the one moment of real colour in it, and it only
   * appears when someone reaches for it.
   *
   * `fill` is passed down as a custom property because the value is per-row
   * data, which a utility class cannot express.
   */
  const connectSocials = [
    {
      url: companyInfo.socialInstagram,
      Icon: Instagram,
      label: "Instagram",
      fill: 'radial-gradient(circle at 30% 107%, #fdf497 0%, #fdf497 5%, #fd5949 45%, #d6249f 60%, #285aeb 90%)',
    },
    { url: companyInfo.socialFacebook, Icon: Facebook, label: "Facebook", fill: '#1877f2' },
    { url: companyInfo.socialYoutube, Icon: Youtube, label: "YouTube", fill: '#ff0000' },
  ].filter((s) => s.url) as { url: string; Icon: typeof Instagram; label: string; fill: string }[];

  return (
    <div ref={rootRef} className="relative overflow-hidden text-[#e7e2df]">
      <style>{`
        .m2c-col { opacity: 0; transform: translateY(22px); }
        .is-woven .m2c-col {
          opacity: 1; transform: none;
          transition: opacity .6s ease, transform .7s cubic-bezier(0.22,1,0.36,1);
        }

        /* Each tile's own platform colour, washed in on hover. It lives on a
           pseudo-element so the fill can cross-fade under the icon and label
           rather than snapping, and so the resting border and the arriving
           colour are not fighting over the same property. */
        .m2c-social::before {
          content: '';
          position: absolute;
          inset: 0;
          background: var(--fill);
          opacity: 0;
          transition: opacity .35s ease;
        }
        .m2c-social:hover::before,
        .m2c-social:focus-visible::before { opacity: 1 }

        @media (prefers-reduced-motion: reduce) {
          .m2c-col, .is-woven .m2c-col { opacity: 1; transform: none; transition: none; }
          .m2c-social { transition: none }
          .m2c-social::before { transition: none }
        }
      `}</style>

      <div className="relative mx-auto max-w-7xl px-4 pt-16 sm:px-6 sm:pt-20 lg:px-8 lg:pt-24 xl:max-w-420">
        <div ref={gridRef} className="relative grid grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-12 lg:gap-x-10">
          {/* Our Company */}
          <div className="m2c-col min-w-0 sm:col-span-2 lg:col-span-3">
            <Link href="/" className="inline-block">
              <CompanyLogo
                className="h-12 w-auto object-contain sm:h-14"
                skeletonClassName="h-12 sm:h-14 w-40 bg-white/10"
                fallbackWidth={220}
                fallbackHeight={56}
              />
            </Link>
            <p className="mt-5 max-w-[19rem] text-[14.5px] leading-[1.65] text-[#b3adaa]">
              Home textiles bought direct from the workshops that weave them — towels, aprons, table linen and bath accessories in cotton that lasts.
            </p>
            {/* Solid oxblood rather than a white pill on a warm ground. The
                white pill was a second surface floating over the weave, the
                same mismatch the newsletter card had. */}
            <Link
              href="/about"
              className="group mt-6 inline-flex items-center gap-2 rounded-full bg-[#e01a1b] px-6 py-2.5 text-[13px] font-semibold tracking-[0.04em] text-white shadow-[0_10px_26px_-12px_rgba(224,26,27,0.9)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#c41617] hover:shadow-[0_16px_32px_-12px_rgba(224,26,27,0.9)]"
            >
              About M2C
              <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-1" />
            </Link>
          </div>

          {/* ── Shop ────────────────────────────────────────────────────
              Categories lead, because that is what someone scrolling to the
              foot of a shop is usually looking for. */}
          <div className="m2c-col min-w-0 lg:col-span-2" style={{ transitionDelay: '80ms' }}>
            <ColHeading>Shop</ColHeading>
            <div className="mt-4 flex flex-col -ml-0.5">
              <NavLink href="/products" label="All Products" />
              <NavLink href="/categories" label="All Categories" />
              {categories.slice(0, 4).map((c) => (
                <NavLink key={c.id} href={`/categories/${c.slug}`} label={c.name} />
              ))}
            </div>
          </div>

          {/* ── Help ────────────────────────────────────────────────────
              The column this footer did not have. Every one of these pages
              already existed and only Terms, Privacy and Returns were linked
              at all — from the bottom bar, at 12px, under the copyright.
              Track order, Returns & FAQ and Contact are the three things
              people come to a shop's footer to find. */}
          <div className="m2c-col min-w-0 lg:col-span-2" style={{ transitionDelay: '160ms' }}>
            <ColHeading>Help</ColHeading>
            <div className="mt-4 flex flex-col -ml-0.5">
              <NavLink href="/order" label="Track Order" />
              <NavLink href="/returns" label="Returns &amp; FAQ" />
              <NavLink href="/contact" label="Contact Us" />
              <NavLink href="/about" label="About M2C" />
              <NavLink href="/offers" label="Offers" />
            </div>
          </div>

          {/* ── Account ─────────────────────────────────────────────────
              Signed out these still work: /profile and /wishlist bounce to
              login, which is the normal behaviour for an account link. */}
          <div className="m2c-col min-w-0 lg:col-span-2" style={{ transitionDelay: '200ms' }}>
            <ColHeading>Account</ColHeading>
            <div className="mt-4 flex flex-col -ml-0.5">
              <NavLink href="/profile" label="My Account" />
              <NavLink href="/profile" label="My Orders" />
              <NavLink href="/wishlist" label="Wishlist" />
              <NavLink href="/cart" label="Cart" />
            </div>
          </div>

          {/* Let's Connect — now holding the newsletter's three columns too */}
          <div className="m2c-col min-w-0 sm:col-span-2 lg:col-span-3" style={{ transitionDelay: '240ms' }}>
            <ColHeading>Let&apos;s Connect</ColHeading>

            {/* Capped rather than run to the full five columns. The email is the
                longest string here and it now fits without truncating; letting
                the rows stretch to ~560px would leave the hairlines running far
                past the words they close. */}
            <div className="mt-5 flex max-w-[24rem] flex-col">
              {companyInfo.companyEmail && (
                <ConnectRow href={`mailto:${companyInfo.companyEmail}`} Icon={Mail} label={companyInfo.companyEmail} clip />
              )}
              {companyInfo.companyPhone && (
                <ConnectRow href={`tel:${companyInfo.companyPhone}`} Icon={Phone} label={companyInfo.companyPhone} />
              )}
            </div>

            {connectSocials.length > 0 && (
              <>
                <p className="mt-7 text-[11px] font-bold uppercase tracking-[0.2em] text-[#9a9491]">Follow us</p>
                <div className="mt-3.5 flex flex-wrap items-center gap-2.5">
                  {connectSocials.map(({ url, Icon, label, fill }) => (
                    <a
                      key={label}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`${label} (opens in a new tab)`}
                      style={{ '--fill': fill } as React.CSSProperties}
                      title={label}
                      className="m2c-social group relative grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full border border-white/20 bg-white/10 transition-[transform,border-color,box-shadow] duration-300 hover:-translate-y-0.5 hover:border-transparent hover:shadow-[0_12px_24px_-14px_rgba(74,50,38,0.6)]"
                    >
                      {/* The label was set beside the icon in a tile roughly
                          130x96. Two of those is a lot of furniture to say
                          "Instagram, Facebook" — everyone knows the glyphs, and
                          the name survives on the accessible name and the
                          tooltip. */}
                      <Icon
                        className="relative z-10 h-[18px] w-[18px] text-[#d9d4d1] transition-colors duration-300 group-hover:text-white"
                        strokeWidth={1.8}
                      />
                    </a>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Space the divider used to hold. The rule stays gone — with one
          continuous gradient there is nothing to separate — but the columns
          still need to stop before the legal line starts. */}
      <div aria-hidden className="h-12 sm:h-14" />
    </div>
  );
};

export default MainFooterContent;
