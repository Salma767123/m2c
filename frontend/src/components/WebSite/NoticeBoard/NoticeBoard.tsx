'use client'

// Home "notice board" — the second half of the banner area. A continuously scrolling
// marquee of live, dynamic cards: a mobile-app install prompt, active Offers, promo
// Coupons and Top-selling products. Everything is fetched live; the board simply hides
// any source that has nothing to show, and the app-install card is always present so the
// band is never empty. Fail-open: any fetch error just yields fewer cards.

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Percent, Ticket, TrendingUp, ArrowRight, Sparkles, ChevronLeft, ChevronRight, Star } from 'lucide-react'
import { offerService } from '@/services/offerService'
import { couponService } from '@/services/couponService'
import { publicProductService, type PublicProduct } from '@/services/publicProductService'
import type { PublicOffer } from '@/lib/offers'
import { formatPrice, getRegionalPrice, getRegionalOriginalPrice } from '@/lib/currency'

type Notice =
  | { kind: 'app' }
  | { kind: 'offer'; offer: PublicOffer }
  | { kind: 'coupon'; message: string; image: string | null; link: string }
  | { kind: 'product'; product: PublicProduct }

export default function NoticeBoard() {
  const [offers, setOffers] = useState<PublicOffer[]>([])
  const [coupons, setCoupons] = useState<Array<{ message: string; image: string | null; link: string }>>([])
  const [products, setProducts] = useState<PublicProduct[]>([])

  useEffect(() => {
    let active = true
    const run = async () => {
      const [o, c, p] = await Promise.all([
        offerService.getActiveOffers().catch(() => []),
        couponService.getPromotionalCoupons(8).catch(() => []),
        // Only the single top-selling product is featured on the board.
        publicProductService.getTopSellingProducts(1).catch(() => ({ success: false } as const)),
      ])
      if (!active) return
      setOffers(o)
      setCoupons(c)
      setProducts(('data' in p && p.data?.items) ? p.data.items.slice(0, 1) : [])
    }
    run()
    return () => {
      active = false
    }
  }, [])

  // Interleave the sources so the marquee mixes offers, coupons and products rather
  // than showing them in blocks — reads as a livelier "what's happening" ticker.
  const notices = useMemo<Notice[]>(() => {
    const offerCards: Notice[] = offers.map((offer) => ({ kind: 'offer', offer }))
    const couponCards: Notice[] = coupons.map((c) => ({ kind: 'coupon', message: c.message, image: c.image, link: c.link }))
    const productCards: Notice[] = products.map((product) => ({ kind: 'product', product }))

    const mixed: Notice[] = []
    const max = Math.max(offerCards.length, couponCards.length, productCards.length)
    for (let i = 0; i < max; i++) {
      if (offerCards[i]) mixed.push(offerCards[i])
      if (productCards[i]) mixed.push(productCards[i])
      if (couponCards[i]) mixed.push(couponCards[i])
    }
    return [{ kind: 'app' }, ...mixed]
  }, [offers, coupons, products])

  // The track is the cards rendered twice so the auto-scroll can loop seamlessly.
  const track = notices.length > 1 ? [...notices, ...notices] : notices

  // ── Scroller ──────────────────────────────────────────────────────────────
  // Auto-scrolls on its own; cards remain plain clickable links that navigate to the
  // relevant section/page. The viewer can also swipe/trackpad-scroll natively or use
  // the arrow buttons. No pointer-capture/drag — that would swallow the card clicks.
  const scrollRef = useRef<HTMLDivElement>(null)
  const pausedRef = useRef(false)
  const posRef = useRef(0) // float source of truth for the auto-scroll position
  const resumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const el = scrollRef.current
    if (!el || notices.length <= 1) return
    posRef.current = el.scrollLeft
    let raf = 0
    let last = 0
    const speed = 45 // px per second
    const step = (t: number) => {
      if (!last) last = t
      const dt = Math.min((t - last) / 1000, 0.1) // clamp big gaps (backgrounded tab)
      last = t
      if (!pausedRef.current) {
        // Accumulate in a float and ASSIGN scrollLeft — reading scrollLeft back each
        // frame loses sub-pixel deltas on HiDPI (browser rounds it) and the scroll
        // would stall near 0. Wrap on the float too.
        const half = el.scrollWidth / 2
        posRef.current += speed * dt
        if (half > 0 && posRef.current >= half) posRef.current -= half
        el.scrollLeft = posRef.current
      }
      raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [notices.length])

  // Resume auto-scroll from wherever the user left the strip (resync the accumulator).
  const resume = () => {
    if (scrollRef.current) posRef.current = scrollRef.current.scrollLeft
    pausedRef.current = false
  }
  const pause = () => { pausedRef.current = true }
  const pauseThenResume = () => {
    pausedRef.current = true
    if (resumeTimer.current) clearTimeout(resumeTimer.current)
    resumeTimer.current = setTimeout(resume, 2500)
  }

  const nudge = (dir: number) => {
    scrollRef.current?.scrollBy({ left: dir * 320, behavior: 'smooth' })
    pauseThenResume()
  }

  return (
    <section className="relative bg-linear-to-b from-[#f7f6f4] to-white border-t border-black/5 py-1">
      {/* Section eyebrow */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 mb-1 flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-[#e01a1b]" />
        <h2 className="text-xs sm:text-sm font-bold uppercase tracking-[0.14em] text-gray-700">
          What&apos;s happening
        </h2>
        <span className="ml-auto">
          <Link href="/offers" className="text-xs font-semibold text-[#e01a1b] hover:underline inline-flex items-center gap-1">
            All offers <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </span>
      </div>

      {/* Scroller — click a card to navigate; swipe / trackpad / arrows to browse */}
      <div
        className="group/board relative"
        onMouseEnter={pause}
        onMouseLeave={resume}
        style={{
          maskImage: 'linear-gradient(to right, transparent, black 3%, black 97%, transparent)',
          WebkitMaskImage: 'linear-gradient(to right, transparent, black 3%, black 97%, transparent)',
        }}
      >
        {notices.length > 1 && (
          <>
            <button
              onClick={() => nudge(-1)}
              aria-label="Scroll left"
              className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-10 hidden sm:flex items-center justify-center w-9 h-9 rounded-full bg-white/90 text-gray-700 shadow-md ring-1 ring-black/5 backdrop-blur hover:bg-[#e01a1b] hover:text-white transition-all opacity-0 group-hover/board:opacity-100"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => nudge(1)}
              aria-label="Scroll right"
              className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-10 hidden sm:flex items-center justify-center w-9 h-9 rounded-full bg-white/90 text-gray-700 shadow-md ring-1 ring-black/5 backdrop-blur hover:bg-[#e01a1b] hover:text-white transition-all opacity-0 group-hover/board:opacity-100"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}

        <div
          ref={scrollRef}
          onPointerDown={pauseThenResume}
          onTouchStart={pauseThenResume}
          onWheel={pauseThenResume}
          className="flex gap-3 sm:gap-4 px-4 sm:px-6 py-3 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {track.map((notice, i) => (
            <NoticeCard key={`${notice.kind}-${i}`} notice={notice} />
          ))}
        </div>
      </div>
    </section>
  )
}

const CARD =
  'group relative shrink-0 w-80 sm:w-96 md:w-[26rem] h-40 sm:h-44 rounded-2xl overflow-hidden ring-1 ring-black/5 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300'

function scrollToDownloadApp() {
  document.getElementById('download-app')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

// Where an offer's card should take the shopper, by scope:
//  PRODUCT (one product) → that product's detail page
//  CATEGORY             → that category's listing
//  STORE / anything else → the full catalogue
function offerLink(o: PublicOffer): string {
  if (o.scope === 'PRODUCT' && o.productIds?.length === 1) return `/products/${o.productIds[0]}`
  if (o.scope === 'CATEGORY' && o.categoryNames?.length) return `/products?category=${encodeURIComponent(o.categoryNames[0])}`
  return '/products'
}

/**
 * Extract an average colour from a product image so the top-seller card can tint
 * itself to match. Loads the image cross-origin into a tiny canvas and averages
 * the pixels. Fails gracefully (returns null) when the image is missing or the
 * canvas is tainted (no CORS) — the card then falls back to a neutral surface.
 */
function useImageColor(url?: string) {
  const [rgb, setRgb] = useState<{ r: number; g: number; b: number } | null>(null)
  useEffect(() => {
    if (!url) { setRgb(null); return }
    let cancelled = false
    const im = new window.Image()
    im.crossOrigin = 'anonymous'
    im.onload = () => {
      try {
        const c = document.createElement('canvas')
        const w = (c.width = 14), h = (c.height = 14)
        const ctx = c.getContext('2d')
        if (!ctx) return
        ctx.drawImage(im, 0, 0, w, h)
        const d = ctx.getImageData(0, 0, w, h).data
        let r = 0, g = 0, b = 0, n = 0
        for (let i = 0; i < d.length; i += 4) {
          if (d[i + 3] < 125) continue          // skip transparent pixels
          const rr = d[i], gg = d[i + 1], bb = d[i + 2]
          if (rr > 244 && gg > 244 && bb > 244) continue // skip near-white padding
          r += rr; g += gg; b += bb; n++
        }
        if (!cancelled && n > 0) setRgb({ r: Math.round(r / n), g: Math.round(g / n), b: Math.round(b / n) })
      } catch { /* tainted canvas — keep the neutral fallback */ }
    }
    im.src = url
    return () => { cancelled = true }
  }, [url])
  return rgb
}

/** Top-seller product card: ~60% image, 40% content, tinted to the image's colour. */
function TopSellerCard({ p }: { p: PublicProduct }) {
  const img = p.images?.find((i) => i.isPrimary)?.url || p.images?.[0]?.url
  const color = useImageColor(img)
  const rgb = color ? `${color.r}, ${color.g}, ${color.b}` : null

  // Pricing — mirror ProductCard: an active offer (if any) defines the effective
  // price + strike-through, else the product's regional MRP.
  const price = getRegionalPrice(p)
  const offer = (p as any).activeOffer as { offerPrice?: number; originalPrice?: number } | undefined
  const effective = offer?.offerPrice ?? price ?? 0
  const strike = offer?.originalPrice ?? getRegionalOriginalPrice(p as any) ?? null
  const savings = strike && strike > effective ? strike - effective : null
  const discountPct = strike && strike > effective ? Math.round(((strike - effective) / strike) * 100) : (p.discount || 0)
  const rating = p.rating || 0
  const reviews = p.reviews || 0

  return (
    <Link
      href={`/products/${p.slug || p.id}`}
      className={CARD}
      style={{
        background: rgb
          ? `linear-gradient(115deg, rgba(${rgb},0.10) 0%, rgba(${rgb},0.26) 58%, rgba(${rgb},0.12) 100%)`
          : '#ffffff',
      }}
    >
      <div className="flex h-full items-stretch">
        {/* 60% image */}
        <div className="relative w-[60%] shrink-0 overflow-hidden">
          {img ? (
            <Image src={img} alt={p.name} fill className="object-cover" unoptimized={img.startsWith('http')} sizes="260px" />
          ) : (
            <div
              className="flex h-full w-full items-center justify-center"
              style={{ background: rgb ? `rgba(${rgb},0.18)` : '#f3f4f6' }}
            >
              <TrendingUp className="h-7 w-7 text-gray-300" />
            </div>
          )}
          {/* soft blend from the image edge into the tinted content panel */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-y-0 right-0 w-14"
            style={{ backgroundImage: `linear-gradient(to left, rgba(${rgb || '255,255,255'},0.9), transparent)` }}
          />
        </div>

        {/* 40% content */}
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 px-3 py-3">
          {/* Top seller — vibrant gradient tag (stands out from the tinted card) */}
          <span className="inline-flex w-fit items-center gap-1 rounded-full bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-[0_2px_8px_-2px_rgba(234,88,12,0.6)]">
            <TrendingUp className="h-3 w-3" /> Top seller
          </span>

          <p className="line-clamp-2 text-[13px] font-semibold leading-tight text-gray-900 transition-colors group-hover:text-[#e01a1b]">{p.name}</p>

          {/* Ratings */}
          {(rating > 0 || reviews > 0) && (
            <span className="flex items-center gap-1">
              <span className="flex items-center gap-px">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className={`h-3 w-3 ${i < Math.round(rating) ? 'text-amber-400 fill-amber-400' : 'text-gray-300 fill-gray-300'}`} />
                ))}
              </span>
              <span className="text-[10px] font-medium text-gray-500">{rating > 0 ? rating.toFixed(1) : '—'} ({reviews})</span>
            </span>
          )}

          {/* Price + MRP + discount */}
          <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
            <span className="text-base font-extrabold text-gray-900 tabular-nums">{formatPrice(effective)}</span>
            {strike && strike > effective && (
              <span className="text-[11px] text-gray-400 line-through tabular-nums">{formatPrice(strike)}</span>
            )}
            {discountPct > 0 && (
              <span className="rounded bg-[#e01a1b]/10 px-1 py-px text-[10px] font-bold text-[#e01a1b]">{discountPct}% OFF</span>
            )}
          </div>

          {/* Savings */}
          {savings != null && savings > 0 && (
            <span className="inline-flex w-fit items-center rounded-full bg-emerald-50 px-1.5 py-px text-[10px] font-bold text-emerald-700 ring-1 ring-emerald-200 tabular-nums">
              Save {formatPrice(savings)}
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}

function NoticeCard({ notice }: { notice: Notice }) {
  if (notice.kind === 'app') {
    return (
      <button
        type="button"
        onClick={scrollToDownloadApp}
        className={CARD}
        aria-label="Get the M2C App"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/assets/images/hero/m2capp.png"
          alt="Get the M2C App"
          className="w-full h-full object-cover"
        />
      </button>
    )
  }

  if (notice.kind === 'offer') {
    const o = notice.offer
    const hasImg = !!o.bannerImage
    return (
      <Link href={offerLink(o)} className={`${CARD} ${hasImg ? 'bg-gray-900' : 'bg-white'}`}>
        {hasImg ? (
          <>
            <Image src={o.bannerImage!} alt="" fill className="object-cover transition-transform duration-500 group-hover:scale-105" unoptimized={o.bannerImage!.startsWith('http')} sizes="288px" />
            {/* Dark scrim so the text stays legible over any uploaded photo. */}
            <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/45 to-black/20" />
          </>
        ) : (
          <div className="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-[#e01a1b] to-[#ff5a36]" />
        )}
        <div className="relative h-full p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${hasImg ? 'bg-white/20 text-white backdrop-blur-sm' : 'bg-[#e01a1b]/10 text-[#e01a1b]'}`}>
              <Percent className="w-3 h-3" /> Offer
            </span>
            <span className="rounded-full bg-linear-to-r from-[#e01a1b] to-[#ff5a36] text-white px-2 py-0.5 text-[11px] font-extrabold shadow">
              {o.badge}
            </span>
          </div>
          <p className={`font-semibold text-sm line-clamp-2 transition-colors ${hasImg ? 'text-white drop-shadow' : 'text-gray-900 group-hover:text-[#e01a1b]'}`}>{o.title}</p>
          <span className={`text-[11px] font-semibold inline-flex items-center gap-1 ${hasImg ? 'text-white/90' : 'text-gray-500'}`}>
            Shop now <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </span>
        </div>
      </Link>
    )
  }

  if (notice.kind === 'coupon') {
    const hasImg = !!notice.image
    return (
      <Link href={notice.link} className={`${CARD} ${hasImg ? 'bg-gray-900' : 'bg-white'}`}>
        {hasImg ? (
          <>
            {/* Always unoptimized: the uploaded image is a remote (http) or inline data: URL — next/image can't run either through the optimizer. */}
            <Image src={notice.image!} alt="" fill className="object-cover transition-transform duration-500 group-hover:scale-105" unoptimized sizes="288px" />
            {/* Dark scrim so the text stays legible over any uploaded photo. */}
            <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/45 to-black/20" />
          </>
        ) : (
          <div className="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-emerald-500 to-teal-400" />
        )}
        <div className="relative h-full p-4 flex flex-col justify-between">
          <span className={`inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${hasImg ? 'bg-white/20 text-white backdrop-blur-sm' : 'bg-emerald-50 text-emerald-700'}`}>
            <Ticket className="w-3 h-3" /> Coupon
          </span>
          <p className={`font-semibold text-sm line-clamp-2 ${hasImg ? 'text-white drop-shadow' : 'text-gray-800'}`}>{notice.message}</p>
          <span className={`text-[11px] font-semibold inline-flex items-center gap-1 ${hasImg ? 'text-white/90' : 'text-emerald-700'}`}>
            Shop now <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </span>
        </div>
      </Link>
    )
  }

  // product (top seller) — its own component so the image-colour hook is valid.
  return <TopSellerCard p={notice.product} />
}
