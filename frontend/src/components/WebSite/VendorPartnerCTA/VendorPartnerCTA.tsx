'use client';

import Link from 'next/link';
import { ArrowRight, Store } from 'lucide-react';
import Reveal from '@/components/WebSite/Shared/Reveal';

/**
 * "Sell on M2C" advertisement band, built as markup rather than as one flat
 * picture.
 *
 * ── Why the artwork could not stay a single image ─────────────────────────
 *
 * m2cseller.png is 1805x871 — aspect 2.073 — so its width and height are one
 * decision, not two. That gave a choice with no good answer:
 *
 *   at max-w-4xl   757 x 365   552px of dead ground down each side at 1920px
 *   at the rail   1471 x 710   no dead ground, but 710px tall on a page whose
 *                              job is selling products, not sellers
 *
 * Both were tried and both were wrong, which is the image telling us it cannot
 * do this job. Cropping is not a third option either: to show only the right
 * third of a 2.073 image the panel has to be TALLER than it is wide (h ≈ 1.38w),
 * so inside a slim band the crop collapses to a sliver, and any vertical crop
 * cuts either the headline or the JOIN AS A SELLER button, both of which are
 * baked into the picture.
 *
 * Split into text and photograph, each behaves. Type is type, so it stays crisp
 * at any width and reflows on a phone. The photograph crops the way photographs
 * are supposed to. The band now fills the full page rail at ~230px instead of
 * 710px, and products keep the page.
 *
 * ── Where the pieces came from ────────────────────────────────────────────
 *
 * Every word is lifted from the artwork unchanged — headline, sub-line, the
 * four perk titles, the badge line and the button label. The four perk
 * sub-lines ("Reach Thousands of Buyers" and the rest) are the only copy left
 * out, because at this height they would turn four chips into four paragraphs.
 *
 * The colours are sampled from the artwork rather than matched by eye: navy
 * #0c1e38, gold #bd8023, the button's brighter gold #f8b341, cream ground
 * #f9f2e9. m2cseller-photo.webp is the photograph cut straight out of
 * m2cseller.png (source box 1240,132 557x661, right of the badge and inside the
 * artwork's white margin) — 56KB against the original's 1602KB, and the full
 * PNG no longer loads on this page at all.
 */

/** The four perk titles, verbatim from the artwork. */
const PERKS = ['Grow Your Business', 'Zero Selling Fee', 'Transparent Earnings', '24x7 Support'];

export default function VendorPartnerCTA() {
  return (
    <section className="bg-white font-sans py-6 sm:py-8">
      <div className="max-w-420 mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal>
          <Link
            href="/vendor"
            aria-label="Sell on M2C — become a vendor partner"
            className="group grid overflow-hidden rounded-3xl bg-linear-to-r from-[#faf4ec] via-[#f7efe4] to-[#f2e6d5] ring-1 ring-[#e8dac4] shadow-[0_18px_50px_-30px_rgba(12,30,56,0.45)] transition-shadow duration-500 hover:shadow-[0_24px_64px_-28px_rgba(12,30,56,0.55)] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#e01a1b]/40 md:grid-cols-[minmax(0,1fr)_18rem] lg:grid-cols-[minmax(0,1fr)_23rem]"
          >
            {/* ── Words ──────────────────────────────────────────────────
                Stacked on narrow screens; from lg the copy and the button
                separate to opposite ends of the column. Left-stacking
                everything left ~660px of empty cream between the text and the
                photograph on a 1920px screen — the same hole this rebuild set
                out to close, just moved inside the card. */}
            <div className="flex flex-col justify-center gap-3 px-5 py-6 sm:px-8 sm:py-7 lg:flex-row lg:items-center lg:justify-between lg:gap-10">
              <div className="flex flex-col gap-2.5">
              <span className="inline-flex w-fit items-center gap-2 rounded-full bg-[#0c1e38] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#f8b341]">
                Zero Charges to Sell
              </span>

              {/* Two weights of one line, exactly as the artwork sets it. */}
              <h2 className="text-[26px] font-bold leading-[1.1] tracking-tight text-[#0c1e38] sm:text-[32px]">
                Sell More. <span className="text-[#bd8023]">Keep More.</span>
              </h2>

              <p className="text-[14px] font-medium text-[#0c1e38]/70 sm:text-[15px]">
                Your Success, Our Platform.
              </p>

              {/* Titles only. The sub-line under each would double the band's
                  height for detail the /vendor page states properly. */}
              <ul className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-[11.5px] font-semibold text-[#0c1e38]/75 sm:text-[12px]">
                {PERKS.map((perk, i) => (
                  <li key={perk} className="flex items-center gap-2">
                    {i > 0 && <span aria-hidden className="h-1 w-1 rounded-full bg-[#bd8023]/60" />}
                    {perk}
                  </li>
                ))}
              </ul>
              </div>

              {/* A span, not a button — the whole band is already the link, and
                  a control inside a link is neither valid nor operable. */}
              <span className="mt-1 inline-flex w-fit shrink-0 items-center gap-2.5 rounded-full bg-[#0c1e38] px-5 py-2.5 text-[12.5px] font-bold uppercase tracking-[0.12em] text-white ring-1 ring-[#f8b341]/60 transition-colors duration-300 group-hover:bg-[#12233c] lg:mt-0 lg:px-7 lg:py-3.5 lg:text-[13.5px]">
                <Store className="h-4 w-4 text-[#f8b341]" strokeWidth={2} />
                Join as a Seller
                <ArrowRight className="h-4 w-4 text-[#f8b341] transition-transform duration-300 group-hover:translate-x-1" />
              </span>
            </div>

            {/* ── Photograph ─────────────────────────────────────────────
                Hidden below md. On a phone the band is one column, and a photo
                stacked above the words would put back most of the height this
                rebuild just removed. */}
            <div className="relative hidden md:block">
              {/* Absolute, not `h-full w-full` in the flow. In an auto-height
                  grid row `h-full` on an image has nothing to resolve against,
                  so it falls back to the intrinsic aspect and the PHOTO ends up
                  setting the row height — 335px wide x 661/557 = 398px, which
                  is what this band measured before: 397px, driven by the
                  picture rather than by the words. Taken out of the flow it
                  fills whatever height the text column decides. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/assets/images/banner/m2cseller-photo.webp"
                alt=""
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover object-[50%_12%] transition-transform duration-700 ease-out group-hover:scale-[1.04]"
              />
              {/* Fades the photo's cut edge into the cream so the two halves
                  read as one panel rather than as a picture pasted beside text.
                  The stop fades to the ground's own colour at zero alpha —
                  `transparent` is rgba(0,0,0,0) and would drag the midpoint
                  through black, leaving a grey smear along the seam. */}
              <span
                aria-hidden
                className="pointer-events-none absolute inset-y-0 left-0 w-20 bg-linear-to-r from-[#f2e6d5] to-[rgba(242,230,213,0)]"
              />
            </div>
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
