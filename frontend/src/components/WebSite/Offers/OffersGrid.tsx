'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Tag, Percent, Ticket, ArrowRight, ChevronRight, Clock } from 'lucide-react'
import { offerService } from '@/services/offerService'
import { couponService } from '@/services/couponService'
import { offerEndsLabel, type PublicOffer } from '@/lib/offers'

// Where an offer's "Shop now" should point.
function offerLink(o: PublicOffer): string {
  if (o.scope === 'PRODUCT' && o.productIds?.length === 1) return `/products/${o.productIds[0]}`
  if (o.scope === 'CATEGORY' && o.categoryNames?.length === 1) {
    return `/products?category=${encodeURIComponent(o.categoryNames[0])}`
  }
  return '/products'
}

interface TicketItem {
  key: string
  kind: 'coupon' | 'offer'
  image: string | null
  title: string
  sub?: string | null
  ends?: string | null
  href: string
}

// Alternating pastel surfaces cycled by index, so the page reads as a wallet of
// tickets. `chip` tints the little Coupon/Offer badge to match.
const TONES = [
  { bg: 'bg-[#eef0fb]', chip: 'bg-white/70 text-[#4f46e5]' },
  { bg: 'bg-[#fdeede]', chip: 'bg-white/70 text-[#e01a1b]' },
  { bg: 'bg-[#e9f7f0]', chip: 'bg-white/70 text-emerald-600' },
  { bg: 'bg-[#fdf4e3]', chip: 'bg-white/70 text-amber-600' },
]

export default function OffersGrid() {
  const [items, setItems] = useState<TicketItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    Promise.all([
      offerService.getActiveOffers().catch(() => [] as PublicOffer[]),
      couponService.getPromotionalCoupons(24).catch(() => []),
    ]).then(([offers, coupons]) => {
      if (!alive) return
      const offerItems: TicketItem[] = (offers || []).map((o, i) => ({
        key: `o-${o.id ?? i}`,
        kind: 'offer',
        image: o.bannerImage ?? null,
        title: o.title,
        sub: o.badge || o.description || null,
        ends: offerEndsLabel(o.endsAt),
        href: offerLink(o),
      }))
      const couponItems: TicketItem[] = coupons.map((c, i) => ({
        key: `c-${i}`,
        kind: 'coupon',
        image: c.image,
        title: c.message,
        href: c.link || '/products',
      }))
      // Interleave so the page isn't all one kind.
      const merged: TicketItem[] = []
      const max = Math.max(offerItems.length, couponItems.length)
      for (let i = 0; i < max; i++) {
        if (offerItems[i]) merged.push(offerItems[i])
        if (couponItems[i]) merged.push(couponItems[i])
      }
      setItems(merged)
      setLoading(false)
    })
    return () => { alive = false }
  }, [])

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <div className="text-center mb-8 sm:mb-12">
        <span className="inline-flex items-center gap-2 rounded-full bg-[#e01a1b]/10 text-[#e01a1b] px-4 py-1.5 text-sm font-semibold mb-3">
          <Percent className="w-4 h-4" /> Coupons &amp; Offers
        </span>
        <h1 className="font-playfair text-3xl sm:text-4xl font-bold text-gray-900">Today&apos;s Best Deals</h1>
        <p className="text-gray-500 mt-2">Grab a coupon code or an automatic offer — savings apply at checkout.</p>
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 rounded-2xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <Tag className="w-12 h-12 mx-auto text-gray-300 mb-4" />
          <p className="text-lg">No live coupons or offers right now.</p>
          <Link href="/products" className="inline-flex items-center gap-1 text-[#e01a1b] font-semibold mt-3">
            Browse all products <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {items.map((it, i) => {
            const tone = TONES[i % TONES.length]
            const isCoupon = it.kind === 'coupon'
            return (
              <Link
                key={it.key}
                href={it.href}
                className={`group relative flex items-stretch overflow-hidden rounded-2xl transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(0,0,0,0.10)] ${tone.bg}`}
              >
                {/* Punched notches on the ends (match the page's gray-50 bg) */}
                <span className="pointer-events-none absolute -left-2.5 top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-gray-50" />
                <span className="pointer-events-none absolute -right-2.5 top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-gray-50" />

                {/* Thumbnail */}
                <div className="relative m-3 h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-white/70">
                  {it.image ? (
                    <Image
                      src={it.image}
                      alt=""
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      unoptimized={it.image.startsWith('http')}
                      sizes="96px"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[#e01a1b]/50">
                      {isCoupon ? <Ticket className="h-8 w-8" /> : <Percent className="h-8 w-8" />}
                    </div>
                  )}
                </div>

                {/* Perforated divider */}
                <div className="my-4 self-stretch border-l-2 border-dashed border-white" />

                {/* Content */}
                <div className="flex min-w-0 flex-1 flex-col justify-center p-3 pr-4 sm:py-4">
                  <span className={`inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${tone.chip}`}>
                    {isCoupon ? <Ticket className="h-3 w-3" /> : <Percent className="h-3 w-3" />}
                    {isCoupon ? 'Coupon' : 'Offer'}
                  </span>
                  <p className="mt-1.5 line-clamp-2 text-[15px] font-semibold leading-snug text-[#1a1a1a]">
                    {it.title}
                  </p>
                  {it.sub && <p className="mt-0.5 line-clamp-1 text-[12.5px] text-[#6b625b]">{it.sub}</p>}
                  <div className="mt-1.5 flex items-center gap-3">
                    <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-[#e01a1b]">
                      Shop now
                      <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                    </span>
                    {it.ends && (
                      <span className="inline-flex items-center gap-1 text-[11.5px] font-medium text-[#8a7d72]">
                        <Clock className="h-3 w-3" /> {it.ends}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
