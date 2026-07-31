'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Tag, Percent, Clock, ArrowRight } from 'lucide-react'
import { offerService } from '@/services/offerService'
import { offerEndsLabel, type PublicOffer } from '@/lib/offers'

// Where an offer's "Shop now" should point.
function offerLink(o: PublicOffer): string {
  if (o.scope === 'PRODUCT' && o.productIds?.length === 1) return `/products/${o.productIds[0]}`
  if (o.scope === 'CATEGORY' && o.categoryNames?.length === 1) {
    return `/products?category=${encodeURIComponent(o.categoryNames[0])}`
  }
  return '/products'
}

export default function OffersGrid() {
  const [offers, setOffers] = useState<PublicOffer[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    offerService
      .getActiveOffers()
      .then(setOffers)
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <div className="text-center mb-8 sm:mb-12">
        <span className="inline-flex items-center gap-2 rounded-full bg-[#e01a1b]/10 text-[#e01a1b] px-4 py-1.5 text-sm font-semibold mb-3">
          <Percent className="w-4 h-4" /> Live Offers
        </span>
        <h1 className="font-playfair text-3xl sm:text-4xl font-bold text-gray-900">Today&apos;s Best Deals</h1>
        <p className="text-gray-500 mt-2">Automatic savings — no code needed. Prices already reflect the offer at checkout.</p>
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-56 rounded-2xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : offers.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <Tag className="w-12 h-12 mx-auto text-gray-300 mb-4" />
          <p className="text-lg">No live offers right now.</p>
          <Link href="/products" className="inline-flex items-center gap-1 text-[#e01a1b] font-semibold mt-3">
            Browse all products <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {offers.map((o) => {
            const ends = offerEndsLabel(o.endsAt)
            return (
              <Link
                key={o.id}
                href={offerLink(o)}
                className="group relative flex flex-col rounded-2xl overflow-hidden bg-white ring-1 ring-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
              >
                <div className="relative h-36 bg-linear-to-br from-[#e01a1b] to-[#ff5a36] overflow-hidden">
                  {o.bannerImage ? (
                    <Image src={o.bannerImage} alt={o.title} fill className="object-cover" unoptimized />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-white text-3xl font-extrabold tracking-tight drop-shadow">{o.badge}</span>
                    </div>
                  )}
                  <span className="absolute top-3 left-3 rounded-full bg-white/90 text-[#e01a1b] px-2.5 py-1 text-xs font-bold shadow-sm">
                    {o.badge}
                  </span>
                </div>
                <div className="p-4 flex flex-col grow">
                  <h3 className="font-semibold text-gray-900 group-hover:text-[#e01a1b] transition-colors">{o.title}</h3>
                  {o.description && <p className="text-sm text-gray-500 mt-1 line-clamp-2">{o.description}</p>}
                  <div className="mt-auto pt-3 flex items-center justify-between">
                    {ends ? (
                      <span className="inline-flex items-center gap-1 text-xs text-[#e01a1b] font-semibold">
                        <Clock className="w-3.5 h-3.5" /> {ends}
                      </span>
                    ) : (
                      <span />
                    )}
                    <span className="inline-flex items-center gap-1 text-sm text-gray-700 font-semibold group-hover:text-[#e01a1b]">
                      Shop now <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                    </span>
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
