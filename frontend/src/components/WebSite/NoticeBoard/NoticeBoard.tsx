'use client'

// Home "notice board" — the second half of the banner area. A continuously scrolling
// marquee of live, dynamic cards: a mobile-app install prompt, active Offers, promo
// Coupons and Top-selling products. Everything is fetched live; the board simply hides
// any source that has nothing to show, and the app-install card is always present so the
// band is never empty. Fail-open: any fetch error just yields fewer cards.

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Percent, Ticket, TrendingUp, ArrowRight, Sparkles, Star } from 'lucide-react'
import { offerService } from '@/services/offerService'
import { couponService } from '@/services/couponService'
import { publicProductService, type PublicProduct } from '@/services/publicProductService'
import type { PublicOffer } from '@/lib/offers'
import { formatPrice, getRegionalPrice, getRegionalOriginalPrice } from '@/lib/currency'

// A flip board: eight fixed tiles, each holding two promotions — one on the
// front, one on the back. Nothing scrolls. A belt had to loop the same handful
// of notices past you over and over, and the repetition was the thing you
// noticed; eight tiles holding sixteen faces show far more while standing still.
const TILES = 8

// Tiles turn one at a time, snaking: across the top row left to right, then
// back along the bottom row right to left, so the eye follows one continuous
// path instead of jumping.
//
//   1 → 2 → 3 → 4
//                 ↓
//   8 ← 7 ← 6 ← 5
//
// DOM order is row-major, so the bottom row's turn order has to be reversed.
const flipOrder = (i: number) => (i < 4 ? i : 4 + (7 - i))

// Two independent speeds, and only one of them is "the queue". SLOT_S is how
// soon the next tile sets off; TURN_S is how long any one tile takes to turn
// and settle. Dropping SLOT_S alone quickens the sweep without touching the
// flap — shortening TURN_S instead would speed the queue too, but it would
// take the rock-and-settle out with it, which is the part that was asked for
// twice.
//
// At 0.43 against a 1.6s turn there are always ~4 tiles mid-flip — half the
// board in motion at once. That overlap IS the effect; the board should look
// like it is being worked, not like eight tiles taking turns.
const SLOT_S = 0.43  // gap between one tile starting and the next
const TURN_S = 1.6   // how long a single tile takes to turn over

// Where the flap sits inside a turn, as [point in the turn, angle past 0].
//
// The tile arrives at its mark only 42% of the way through and spends the
// remaining ~0.9s rocking down to rest: +25, -20, +12, -8, +4, -2, home. Three
// decaying swings, each smaller than the last.
//
// Two things make a flap actually visible, and both are here. Amplitude — a few
// degrees is a twitch, twenty-five is a swing you can watch. And duration — a
// flap crammed into the tail of a fast turn is over before the eye finds it, so
// most of the turn is the flap, not the flip.
const FLAP: Array<[at: number, deg: number]> = [
  [0.42, 205],
  [0.58, 160],
  [0.71, 192],
  [0.82, 172],
  [0.90, 184],
  [0.96, 178],
  [1.0, 180],
]

// The outbound sweep runs clockwise; the return sweep runs back the other way,
// so the wave reverses instead of always restarting from the top-left corner.
// The return cannot begin until the outbound one has fully finished — turns
// overlap by design (SLOT_S < TURN_S), and the last tile out is the first one
// back, so it would otherwise be asked to turn both ways at once.
const SWEEP_END_S = (TILES - 1) * SLOT_S + TURN_S
const CYCLE_S = SWEEP_END_S * 2
const pct = (t: number) => (t / CYCLE_S) * 100

/**
 * One keyframe track per tile. Its two turns sit at different points in the
 * cycle depending on where the tile falls in each sweep, and a single shared
 * keyframe plus animation-delay cannot express that: a delay shifts BOTH turns
 * together, which is what forced the return sweep to repeat the outbound order.
 *
 * Each track ends on 360deg — visually identical to the 0deg it restarts on, so
 * the loop has no seam.
 *
 * The overshoot is the flap: the tile swings past its mark, tips back a little
 * short, then settles. A turn that stops dead on 180 looks braked; a real board
 * carries momentum into the stop.
 */
const flipKeyframes = Array.from({ length: TILES }, (_, c) => {
  const out = c * SLOT_S                             // clockwise position
  const back = SWEEP_END_S + (TILES - 1 - c) * SLOT_S // anticlockwise position
  const turn = (from: number, base: number) =>
    `\n    ${pct(from).toFixed(3)}% { transform: rotateY(${base}deg) }` +
    FLAP.map(([at, deg]) =>
      `\n    ${pct(from + TURN_S * at).toFixed(3)}% { transform: rotateY(${base + deg}deg) }`,
    ).join('')
  return `@keyframes m2cFlip${c} {
    0% { transform: rotateY(0deg) }${turn(out, 0)}${turn(back, 180)}
    100% { transform: rotateY(360deg) }
  }`
}).join('\n')

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

  // Eight tiles, sixteen faces, filled by walking the notice list. With fewer
  // than sixteen live notices the list simply wraps — every tile still carries
  // two different ones, which is what stops a flip landing on the same card.
  const tiles = useMemo(() => {
    if (notices.length === 0) return []
    return Array.from({ length: TILES }, (_, i) => ({
      front: notices[(i * 2) % notices.length],
      back: notices[(i * 2 + 1) % notices.length],
    }))
  }, [notices])

  const boardRef = useRef<HTMLDivElement>(null)

  // Deal the cards in the first time the board scrolls into view. Driven by a
  // class on the container rather than state — nothing here needs a re-render,
  // and the stagger is per-card CSS delay.
  useEffect(() => {
    const el = boardRef.current
    if (!el) return
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          el.classList.add('m2c-dealt')
          io.disconnect()
        }
      },
      { threshold: 0.12 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [notices.length])

  return (
    <section className="relative border-t border-black/5 bg-linear-to-b from-[#f7f6f4] to-white pb-11 pt-9">
      {/* Section header. It was pinned hard against the band above with 4px of
          clearance and set in small grey text, so it read as a stray caption
          rather than as the start of a section. The rule between the two ends
          ties them into one line instead of leaving them floating apart. */}
      <div className="mx-auto mb-6 flex max-w-[1400px] items-center gap-4 px-4 sm:px-6">
        <h2 className="inline-flex shrink-0 items-center gap-2 text-[13px] font-bold uppercase tracking-[0.2em] text-[#1a1416] sm:text-[14.5px]">
          <Sparkles className="h-[17px] w-[17px] text-[#e01a1b]" />
          What&apos;s happening
        </h2>
        <span aria-hidden className="h-px min-w-0 flex-1 bg-linear-to-r from-black/[0.14] to-transparent" />
        <Link
          href="/offers"
          className="group inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[#e01a1b]/25 px-3.5 py-1.5 text-[12.5px] font-semibold text-[#e01a1b] transition-colors hover:bg-[#fff1f1] sm:text-[13px]"
        >
          All offers
          <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
        </Link>
      </div>

      <style>{`
        @keyframes m2cDeal { from { opacity: 0; transform: translateY(24px) scale(.96) } to { opacity: 1; transform: none } }
        [data-deal] { opacity: 0 }
        .m2c-dealt [data-deal] { animation: m2cDeal 520ms cubic-bezier(0.22,1,0.36,1) both }

        ${flipKeyframes}

        /* Held until the board has been seen, so the first sweep isn't spent
           above the fold. Paused again on hover — a turn mid-read is the one
           thing this animation must never do. */
        .m2c-flip {
          animation-duration: ${CYCLE_S}s;
          /* Applies between every pair of keyframes, so the flap's own steps get
             it too. ease-in-out is what a swinging thing does — slowest at each
             extreme, fastest through the middle. An ease-out curve here flattened
             every rebound into a slide before it could read as a swing. */
          animation-timing-function: ease-in-out;
          animation-iteration-count: infinite;
          animation-play-state: paused;
        }
        .m2c-dealt .m2c-flip { animation-play-state: running; }
        .m2c-board:hover .m2c-flip { animation-play-state: paused; }

        @media (prefers-reduced-motion: reduce) {
          [data-deal] { opacity: 1 }
          .m2c-dealt [data-deal] { animation: none }
          .m2c-flip, .m2c-dealt .m2c-flip { animation-name: none }
        }
      `}</style>

      {/* The board — eight tiles, two faces each, turning one at a time. */}
      <div ref={boardRef} className="m2c-board mx-auto max-w-[1400px] px-4 sm:px-6">
        <div className="grid grid-cols-2 gap-2 sm:gap-2.5 lg:grid-cols-4">
          {tiles.map((tile, i) => (
            <div
              key={`tile-${i}`}
              data-deal
              className="[perspective:1400px]"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div
                className="m2c-flip relative aspect-[7/3] w-full [transform-style:preserve-3d]"
                // Picks the track for this tile's place in the snake, not its
                // place in the DOM. Every tile shares one duration and runs
                // undelayed — the timing lives inside its track, which is the
                // only way the two sweeps can run in opposite directions.
                style={{ animationName: `m2cFlip${flipOrder(i)}` }}
              >
                <div className="absolute inset-0 [backface-visibility:hidden]">
                  <NoticeCard notice={tile.front} />
                </div>
                <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)]">
                  <NoticeCard notice={tile.back} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

const CARD =
  // `block` is load-bearing: most of these cards are <Link>, which renders an
  // <a> — inline, and width/height do not apply to inline boxes. A card that
  // is not a direct flex child does not get blockified for free, and it would
  // silently collapse to its content size.
  //
  // Sized by its tile now rather than by fixed widths, so the two faces of a
  // flip always occupy exactly the same box.
  'group relative block h-full w-full rounded-xl overflow-hidden ring-1 ring-black/5 shadow-sm'

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
