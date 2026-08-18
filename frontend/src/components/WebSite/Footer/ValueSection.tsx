'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

/**
 * The M2C standard — a trust strip.
 *
 * This was five woven care tags hanging from a rail, sliding out of a bunch
 * and swaying on a shared wave. It was the best-made thing on the homepage and
 * it was the wrong thing to make: a full viewport of prose with no product, no
 * price and nothing clickable, sitting as the last block before the footer, so
 * the page closed on an explainer instead of on something to buy. Reviewed as
 * "feeling like an information site rather than an ecommerce application",
 * which was correct.
 *
 * Three things were doing that, and all three are gone:
 *
 * It ran dark for a while — deep oxblood, to buy attention from contrast
 * rather than from height. That worked while the footer was light and this was
 * the only dark block on the page. The footer is maroon now, so a dark strip
 * sitting directly on top of it was two dark masses competing instead of one
 * anchor. Light again, and the contrast it needs comes from the maroon
 * immediately below it.
 *
 *  · A heading and an intro paragraph. That pairing is what makes a block read
 *    as an article. One small eyebrow line carries the same voice without
 *    asking to be read.
 *
 *  · Five accent hues — red, plum, olive, gold, clay. Defensible as a family,
 *    but five colours across five cards is a brochure. The icons already tell
 *    the five apart, so colour has nothing left to do; there is one accent now.
 *
 *  · ~600px of height and 478 lines of animation for five sentences nobody
 *    buys anything from. It is about 150px now, and the homepage gets the rest
 *    back for products.
 *
 * The copy is unchanged and the drawn icons are kept exactly — a cotton boll,
 * a struck-through flask, a weave in cross-section, sun over cloth, a
 * dimensioned mattress. They were drawn for these five claims and nothing off
 * a shelf says any of it.
 *
 * Replace the copy with real numbers (thread count, GSM, certificate no.) when
 * they are confirmed.
 */

const GLASS = 'rgba(255,255,255,.22)';

const labels = [
  { n: '01', kind: 'Fibre',   title: '100% Cotton',        copy: 'Pure cotton throughout. Never blended with polyester.' },
  { n: '02', kind: 'Safety',  title: 'OEKO-TEX Certified', copy: 'Independently tested free of harmful substances.' },
  { n: '03', kind: 'Comfort', title: 'Breathable Weave',   copy: 'Temperature-regulating, so you stay cool all night.' },
  { n: '04', kind: 'Color',   title: 'Fade-Resistant',     copy: 'Color holds wash after wash, year after year.' },
  { n: '05', kind: 'Fit',     title: 'Made for US Sizes',  copy: 'Cut to standard American mattress and pillow sizes.' },
];

const MARKS = [
  // 01 Fibre — a cotton boll: four lobes around a dark seed head.
  <>
    <path
      d="M24 5.5c4.4 0 8 3.4 8 7.6 0 1.3-.3 2.4-.9 3.5 1.1-.6 2.2-.9 3.5-.9 4.2 0 7.6 3.6 7.6 8s-3.4 8-7.6 8c-1.3 0-2.4-.3-3.5-.9.6 1.1.9 2.2.9 3.5 0 4.2-3.6 7.6-8 7.6s-8-3.4-8-7.6c0-1.3.3-2.4.9-3.5-1.1.6-2.2.9-3.5.9-4.2 0-7.6-3.6-7.6-8s3.4-8 7.6-8c1.3 0 2.4.3 3.5.9-.6-1.1-.9-2.2-.9-3.5 0-4.2 3.6-7.6 8-7.6Z"
      fill={GLASS}
      strokeWidth={2.4}
    />
    <circle cx="24" cy="23.7" r="3.6" fill="currentColor" stroke="none" />
  </>,

  // 02 Safety — a laboratory flask struck through: free of harmful substances.
  // Deliberately NOT an OEKO-TEX lookalike; that mark is trademarked.
  <>
    <path
      d="M19.5 7h9v10.8l7.9 15.8A4.4 4.4 0 0 1 32.5 40h-17a4.4 4.4 0 0 1-3.9-6.4l7.9-15.8V7Z"
      fill={GLASS}
      strokeWidth={2.4}
    />
    <path d="M17.5 7h13" strokeWidth={2.4} />
    <circle cx="24" cy="24" r="17.2" strokeWidth={2.9} />
    <path d="M11.8 36.2 36.2 11.8" strokeWidth={2.9} />
  </>,

  // 03 Comfort — a weave in cross-section, weft passing over and under warp,
  // with air moving through it above.
  <>
    <path d="M14 13v24M24 13v24M34 13v24" strokeWidth={2.4} />
    <path d="M7 21q5-6 10 0t10 0 10 0" strokeWidth={2.9} />
    <path d="M7 31q5 6 10 0t10 0 10 0" strokeWidth={2.9} />
    <path d="M8 8c6-3 12 3 18 0s10-2 14-1" strokeWidth={2} />
  </>,

  // 04 Color — sun above a bolt of cloth that keeps its colour under it.
  <>
    <circle cx="24" cy="14" r="6.4" fill={GLASS} strokeWidth={2.4} />
    <path
      d="M24 3.2v3.4M24 21.4v3.4M9.6 14H13M35 14h3.4M16.1 6.1l2.4 2.4M29.5 19.5l2.4 2.4M31.9 6.1l-2.4 2.4M18.5 19.5l-2.4 2.4"
      strokeWidth={2.4}
    />
    <path d="M10 29h28v6.5c-4.7 3.2-9.3-3.2-14 0s-9.3 3.2-14 0Z" fill="currentColor" stroke="none" />
  </>,

  // 05 Fit — a mattress in plan with its hem, dimensioned across the width.
  <>
    <rect x="6" y="12" width="36" height="21" rx="3.5" fill={GLASS} strokeWidth={2.4} />
    <path d="M6 19h36" strokeWidth={2.4} />
    <path d="M8 40h32M11 37l-3 3 3 3M37 37l3 3-3 3" strokeWidth={2.4} />
  </>,
];

export default function ValueSection() {
  return (
    <section className="relative border-t border-[#efe4d8] bg-white py-10 font-sans sm:py-12">
      <div className="relative mx-auto max-w-420 px-4 sm:px-6 lg:px-8">
        {/* ── Masthead ────────────────────────────────────────────────────
            The band used to be a dead end: five claims and nowhere to go from
            them. Now it ends somewhere. Top right on desktop and centred at
            the foot on mobile — the same placement Featured and Best Sellers
            use, so the third call to action on the page behaves like the
            other two.

            Brand red, the same pill Featured and Best Sellers carry, so the
            third call to action on the page matches the other two. */}
        <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
          <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#c41617] sm:text-xs">
            <span aria-hidden className="h-px w-6 bg-[#c41617]" />
            The M2C standard
          </span>

          <Link
            href="/products"
            className="group hidden shrink-0 items-center gap-2 rounded-full bg-[#e01a1b] px-6 py-2.5 text-[12.5px] font-semibold uppercase tracking-[0.12em] text-white shadow-[0_10px_24px_-12px_rgba(224,26,27,0.75)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#c41617] lg:inline-flex"
          >
            Shop the collection
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </div>

        {/* No cards. Five items will not divide evenly into two or three
            columns, and with nothing drawn round them an unfilled last row
            reads as a list ending rather than a hole.

            Hairlines between the columns on lg only — below that the items
            stack, and a divider between stacked rows would fence them off
            rather than separate them. */}
        <div className="grid grid-cols-1 gap-x-8 gap-y-7 sm:grid-cols-2 lg:grid-cols-5 lg:gap-x-0">
          {labels.map((l, i) => (
            <div
              key={l.n}
              className={`group flex items-start gap-3.5 lg:px-5 ${
                i > 0 ? 'lg:border-l lg:border-[#efe4d8]' : ''
              } ${i === 0 ? 'lg:pl-0' : ''}`}
            >
              <span
                aria-hidden
                className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-[#f0dcd6] bg-[#fdf3f0] text-[#c41617] transition-colors duration-300 group-hover:border-[#c41617] group-hover:bg-[#c41617] group-hover:text-white"
              >
                <svg
                  viewBox="0 0 48 48"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-[22px] w-[22px]"
                >
                  {MARKS[i]}
                </svg>
              </span>
              <div className="min-w-0">
                <p className="text-[14.5px] font-semibold text-[#1a1a1a]">{l.title}</p>
                <p className="mt-1 text-[13px] leading-relaxed text-[#5f5550]">{l.copy}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Mobile only — the desktop control lives in the masthead. */}
        <div className="mt-8 flex justify-center lg:hidden">
          <Link
            href="/products"
            className="group inline-flex items-center gap-2 rounded-full bg-[#e01a1b] px-6 py-3 text-[13px] font-semibold uppercase tracking-[0.12em] text-white shadow-[0_10px_24px_-12px_rgba(224,26,27,0.8)] transition-all duration-300 hover:bg-[#c41617]"
          >
            Shop the collection
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </section>
  );
}
