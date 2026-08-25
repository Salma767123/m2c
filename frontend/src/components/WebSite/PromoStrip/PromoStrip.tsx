'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { couponService, type FirstOrderCoupon } from '@/services/couponService'

/**
 * The offer band between the hero and the notice board.
 *
 * Now data-driven: it shows the admin's active "first order" coupon (the one
 * tagged First Order in the coupon manager) and hides itself entirely when no
 * such coupon is active — nothing is hardcoded. Only one first-order coupon can
 * be active at a time, so there is always at most one to show.
 */
export default function PromoStrip() {
  const [coupon, setCoupon] = useState<FirstOrderCoupon | null>(null)

  useEffect(() => {
    let cancelled = false
    couponService.getFirstOrderCoupon().then((c) => { if (!cancelled) setCoupon(c) }).catch(() => {})
    return () => { cancelled = true }
  }, [])

  // No active first-order coupon → the strip does not render.
  if (!coupon) return null

  const bodyShort = `Extra ${coupon.offer} with code`

  return (
    <section aria-label="Current offer" className="w-full">
      <style>{`
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

        <div className="relative flex w-full flex-wrap items-center justify-center gap-x-2 gap-y-1 px-4 py-2 text-center sm:gap-x-4 sm:gap-y-1.5 sm:px-6 sm:py-3 md:px-12 lg:px-20">
          <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#e0a83d] sm:text-[15px] sm:tracking-[0.14em] md:text-[16px]">
            First order?
          </span>
          <span className="text-[12px] text-white/90 sm:hidden">{bodyShort}</span>
          <span className="hidden text-[16px] text-white/90 sm:inline sm:text-[15px] md:text-[17px]">{coupon.description}</span>
          <span className="rounded border border-white/45 px-1.5 py-0.5 text-[11px] font-bold tracking-[0.06em] text-white sm:rounded-md sm:px-2.5 sm:py-1 sm:text-[15px] sm:tracking-[0.08em] md:text-[16px]">
            {coupon.code}
          </span>
          <Link
            href="/offers"
            className="group inline-flex items-center gap-1 text-[11.5px] font-semibold text-white underline-offset-4 hover:underline sm:ml-1 sm:gap-1.5 sm:text-[15px] md:text-[16px]"
          >
            See all offers
            <ArrowRight className="h-3 w-3 transition-transform duration-300 group-hover:translate-x-0.5 sm:h-4 sm:w-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}
