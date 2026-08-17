import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

/**
 * The offer band between the hero and the notice board.
 *
 * It used to sit under a white row of three assurances — quality checked, free
 * shipping, 7-day returns. Those have been removed and the offer moved up into
 * their place, so the first thing under the banner is the thing that actually
 * asks for an order rather than three reassurances about one.
 *
 * The band still does the second job the strip was built for: it gives the hero
 * a floor to land on. Without something here the flip board below started
 * half-visible under the fold and its turning tiles were cut in two.
 *
 * Server-rendered and static on purpose. This sits directly under the page's
 * LCP element, so it must not fetch, hydrate or animate on arrival.
 */

// The only content in this file.
const OFFER = {
  lead: 'First order?',
  body: 'Take an extra 10% off with code',
  code: 'NEWFEST123',
  href: '/offers',
  cta: 'See all offers',
}

export default function PromoStrip() {
  return (
    <section aria-label="Current offer" className="w-full">
      <style>{`
        /* A single slow highlight travelling the offer band. Long and faint on
           purpose: this strip sits still under a hero that already moves, so it
           should read as a sheen on the surface, not as a second animation
           competing with the banner above it. */
        @keyframes m2cStripSheen {
          0%   { transform: translateX(-140%) skewX(-18deg) }
          60%  { transform: translateX(240%) skewX(-18deg) }
          100% { transform: translateX(240%) skewX(-18deg) }
        }
        .m2c-sheen { animation: m2cStripSheen 7s cubic-bezier(0.4,0,0.2,1) infinite; }
        @media (prefers-reduced-motion: reduce) { .m2c-sheen { animation: none; opacity: 0 } }
      `}</style>

      {/* Offer band */}
      <div className="relative overflow-hidden" style={{ background: '#7a0f10' }}>
        <span aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <span
            className="m2c-sheen absolute inset-y-0 -left-1/4 w-1/5"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,.13), transparent)' }}
          />
        </span>

        {/* A little taller than before. It used to be the lower half of a
            two-part strip; now it is the whole thing, and at the old height it
            read as a leftover rule under the banner rather than a band. */}
        <div className="relative flex w-full flex-wrap items-center justify-center gap-x-4 gap-y-1.5 px-6 py-5 text-center md:px-12 lg:px-20">
          <span className="text-[15px] font-bold uppercase tracking-[0.14em] text-[#e0a83d] sm:text-[16px]">{OFFER.lead}</span>
          <span className="text-[16px] text-white/90 sm:text-[17px]">{OFFER.body}</span>
          {/* Solid, not dashed — you asked for plain lines over dotted ones
              elsewhere, and this chip is now the most prominent thing here. */}
          <span className="rounded-md border border-white/45 px-2.5 py-1 text-[15px] font-bold tracking-[0.08em] text-white sm:text-[16px]">
            {OFFER.code}
          </span>
          <Link
            href={OFFER.href}
            className="group ml-1 inline-flex items-center gap-1.5 text-[15px] font-semibold text-white underline-offset-4 hover:underline sm:text-[16px]"
          >
            {OFFER.cta}
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </section>
  )
}
