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
  // Phones only. Same offer, four words shorter, so the band stays one line.
  bodyShort: 'Extra 10% off with code',
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

        {/* Desktop keeps the taller band — at the old height it read as a
            leftover rule under the banner rather than a band of its own.

            Phones get roughly half of it. The type and padding were fixed at
            desktop values, so on a 390px screen the copy wrapped to two lines
            inside 40px of vertical padding and the strip came out taller than
            half the banner above it — an offer note ending up louder than the
            hero it sits under. Everything here scales from sm upward; nothing
            below sm is a shrunken desktop value. */}
        <div className="relative flex w-full flex-wrap items-center justify-center gap-x-2 gap-y-1 px-4 py-2.5 text-center sm:gap-x-4 sm:gap-y-1.5 sm:px-6 sm:py-5 md:px-12 lg:px-20">
          <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#e0a83d] sm:text-[15px] sm:tracking-[0.14em] md:text-[16px]">
            {OFFER.lead}
          </span>
          {/* Shorter wording on phones rather than the same sentence at a size
              nobody can read — the two words dropped are the two carrying the
              least information. */}
          <span className="text-[12px] text-white/90 sm:hidden">{OFFER.bodyShort}</span>
          <span className="hidden text-[16px] text-white/90 sm:inline sm:text-[15px] md:text-[17px]">{OFFER.body}</span>
          {/* Solid, not dashed — you asked for plain lines over dotted ones
              elsewhere, and this chip is now the most prominent thing here. */}
          <span className="rounded border border-white/45 px-1.5 py-0.5 text-[11px] font-bold tracking-[0.06em] text-white sm:rounded-md sm:px-2.5 sm:py-1 sm:text-[15px] sm:tracking-[0.08em] md:text-[16px]">
            {OFFER.code}
          </span>
          <Link
            href={OFFER.href}
            className="group inline-flex items-center gap-1 text-[11.5px] font-semibold text-white underline-offset-4 hover:underline sm:ml-1 sm:gap-1.5 sm:text-[15px] md:text-[16px]"
          >
            {OFFER.cta}
            <ArrowRight className="h-3 w-3 transition-transform duration-300 group-hover:translate-x-0.5 sm:h-4 sm:w-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}
