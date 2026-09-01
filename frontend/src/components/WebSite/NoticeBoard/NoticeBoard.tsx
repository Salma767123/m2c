'use client'

// Home "notice board" — the second half of the banner area. A continuously scrolling
// board of live, dynamic cards. Four sources, and strict priority between them:
// promo Coupons first, then active Offers, then Top sellers, then Best sellers.
// Each source only gets a look in once the ones above it are exhausted, and if
// all four together cannot fill the board, what there is repeats rather than
// leaving gaps. Nothing here is hardcoded -- there used to be an app-install
// card pinned to the front to keep the band full, and it is gone.
// Fail-open: any fetch error just yields fewer cards.

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Percent, Ticket, TrendingUp, ArrowRight, Sparkles, Star } from 'lucide-react'
import { offerService } from '@/services/offerService'
import { couponService } from '@/services/couponService'
import { publicProductService, type PublicProduct, type ProductsResponse } from '@/services/publicProductService'
import type { PublicOffer } from '@/lib/offers'
import { formatPrice, getRegionalPrice, getRegionalOriginalPrice } from '@/lib/currency'

// A flip board: eight fixed tiles, each holding two promotions — one on the
// front, one on the back. Nothing scrolls. A belt had to loop the same handful
// of notices past you over and over, and the repetition was the thing you
// noticed; eight tiles holding sixteen faces show far more while standing still.
const TILES = 8

// Tiles turn one at a time, snaking: across a row left to right, then back
// along the next one right to left, so the eye follows one continuous path
// instead of jumping.
//
//   4 columns              2 columns
//   1 → 2 → 3 → 4          1 → 2
//                 ↓             ↓
//   8 ← 7 ← 6 ← 5          4 ← 3
//                          ↓
//                          5 → 6
//                               ↓
//                          8 ← 7
//
// This used to be hard-coded to the four-column layout: `i < 4 ? i : 4 + (7-i)`.
// The board is grid-cols-2 below lg, where that expression maps the sweep to
// row 1, row 2, then JUMPS to row 4 and comes back up to row 3 — which is
// exactly why the flipping looked random on a phone. The path was computed for
// a grid that is not the one on screen.
//
// DOM order is row-major, so every odd row's turn order has to be reversed.
const snakeOrder = (i: number, cols: number) => {
  const row = Math.floor(i / cols)
  const col = i % cols
  return row * cols + (row % 2 === 0 ? col : cols - 1 - col)
}

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

/**
 * How many tiles a phone gets.
 *
 * Eight tiles two-up is four rows of board before the page moves on, which on a
 * phone is most of a screen spent on promos. Four is one screenful of two rows,
 * and nothing is lost: every coupon and offer on the board is on /offers, which
 * the "All offers" control at the head of the section goes to.
 *
 * Only below sm. From 640px up the row is wide enough to be worth its height,
 * and at lg the board is four across, so eight is two rows there as well.
 */
const MOBILE_TILES = 4

/**
 * Which track each tile runs, per column count.
 *
 * It cannot be an inline style any more: the answer depends on the breakpoint,
 * and inline styles cannot be media-queried. So each tile carries a stable
 * class for its DOM position and the stylesheet decides which sweep position
 * that is — two columns by default, four from lg, matching the grid exactly.
 *
 * The phone needs its own mapping rather than just inheriting the first four
 * two-column tracks. Those are sweep positions 0, 1, 3, 2 — the first half of
 * an eight-slot outbound sweep — so with the other four tiles hidden the board
 * would turn four cards, stand still for the length of four more, and then
 * turn them back. Spacing the four survivors every other slot (0, 2, 6, 4)
 * gives the same even rhythm the full board has, and it needs no new keyframes
 * because it reuses the tracks the hidden tiles are no longer running.
 */
const tileTracks = [
  ...Array.from({ length: TILES }, (_, i) => `.m2c-t${i} { animation-name: m2cFlip${snakeOrder(i, 2)} }`),
  '@media (max-width: 639px) {',
  ...Array.from(
    { length: MOBILE_TILES },
    (_, i) => `  .m2c-t${i} { animation-name: m2cFlip${snakeOrder(i, 2) * (TILES / MOBILE_TILES)} }`,
  ),
  '}',
  '@media (min-width: 1024px) {',
  ...Array.from({ length: TILES }, (_, i) => `  .m2c-t${i} { animation-name: m2cFlip${snakeOrder(i, 4)} }`),
  '}',
].join('\n        ')

/** Which merchandising list a product card came from. */
type ProductLabel = 'Top seller' | 'Best seller'

/** Every tile has a front and a back, so this is how many cards the board holds. */
const SLOTS = TILES * 2

/**
 * Deal cards out so each kind is spaced evenly across the whole board rather
 * than bunched.
 *
 * Every card is given a position on a 0..n line: the k-th card of a kind that
 * has c of them sits at (k + phase) * n / c. A kind with two cards therefore
 * lands at roughly a third and two thirds of the way along, whatever the other
 * kinds are doing. Sorting by that position interleaves everything in one pass.
 *
 * The phase is what stops two kinds of equal size from stacking on the same
 * spot: each kind is nudged by a different fraction of its own stride, so an
 * offer and a top seller that both appear twice do not arrive as a pair twice.
 *
 * The obvious greedy version -- always take from the fullest bucket that is
 * not the kind just placed -- spends the small buckets first and leaves the
 * large one as a solid run at the end. With twelve coupons against four other
 * cards it produced eight identical cards in a row.
 *
 * Top and best sellers count as separate kinds on purpose: both are product
 * cards, but they wear different badges, so alternating them still reads as
 * variety.
 */
function spreadByKind(items: Notice[]): Notice[] {
  const buckets = new Map<string, Notice[]>()
  for (const n of items) {
    const key = n.kind === 'product' ? 'product:' + n.label : n.kind
    const bucket = buckets.get(key)
    if (bucket) bucket.push(n)
    else buckets.set(key, [n])
  }

  const total = items.length
  const keys = [...buckets.keys()]
  const placed: Array<{ at: number; notice: Notice }> = []
  keys.forEach((key, ki) => {
    const list = buckets.get(key) as Notice[]
    const phase = (ki + 1) / (keys.length + 1)
    const stride = total / list.length
    list.forEach((notice, i) => placed.push({ at: (i + phase) * stride, notice }))
  })
  placed.sort((x, y) => x.at - y.at)
  return placed.map((p) => p.notice)
}

type Notice =
  | { kind: 'offer'; offer: PublicOffer }
  | { kind: 'coupon'; message: string; image: string | null; link: string }
  | { kind: 'product'; product: PublicProduct; label: ProductLabel }

export default function NoticeBoard() {
  const [offers, setOffers] = useState<PublicOffer[]>([])
  const [coupons, setCoupons] = useState<Array<{ message: string; image: string | null; link: string }>>([])
  const [products, setProducts] = useState<Array<{ product: PublicProduct; label: ProductLabel }>>([])

  useEffect(() => {
    let active = true
    const run = async () => {
      const [o, c, top, best] = await Promise.all([
        offerService.getActiveOffers().catch(() => []),
        // Each source is asked for a full board's worth. Priority decides who
        // actually gets in, so anything past the deficit goes unused — but
        // asking for less would cap the board below whatever the admin added.
        couponService.getPromotionalCoupons(SLOTS).catch(() => []),
        publicProductService.getTopSellingProducts(SLOTS).catch(() => ({ success: false } as const)),
        publicProductService.getBestSellerProducts(SLOTS).catch(() => ({ success: false } as const)),
      ])
      if (!active) return
      setOffers(o)
      setCoupons(c)

      // A product can carry both tags (Printed Cotton Bag currently does), and
      // merging without a guard would put it on the board twice wearing a
      // different badge each time. That reads as two products rather than one
      // doing well on two counts. First list to claim it wins.
      // The two product fetches resolve to a ProductsResponse, or to the bare
      // { success: false } their catch returns, so data has to be probed for
      // rather than assumed.
      const items = (r: ProductsResponse | { success: false }): PublicProduct[] =>
        ('data' in r && r.data?.items) ? r.data.items : []
      const seen = new Set<string>()
      const merged: Array<{ product: PublicProduct; label: ProductLabel }> = []
      for (const [list, label] of [[items(top), 'Top seller'], [items(best), 'Best seller']] as const) {
        for (const product of list) {
          if (seen.has(product.id)) continue
          seen.add(product.id)
          merged.push({ product, label })
        }
      }
      setProducts(merged)
    }
    run()
    return () => {
      active = false
    }
  }, [])

  // Everything on the board is fetched. There used to be a hardcoded app promo
  // pinned to the front here, which meant the board was never empty but also
  // never honest: it padded thin content with something no one could change
  // from the admin, and shipped a 1.79MB PNG on every home page load to do it.
  //
  // Two separate questions now, answered in order:
  //
  //   WHO gets in   — strict priority. Coupons are taken first, and only once
  //                   they run out do offers get a look, then top sellers,
  //                   then best sellers. Enough coupons and nothing else
  //                   appears at all; that is the intent, not a bug.
  //   WHERE they sit — spread, so a board that is mostly coupons does not
  //                   arrive as a wall of identical cards.
  //
  // No count is fixed anywhere. Whatever each source returns is what it gets
  // to contribute, and the deficit rolls down to the next one.
  const notices = useMemo<Notice[]>(() => {
    const byPriority: Notice[][] = [
      coupons.map((c) => ({ kind: 'coupon', message: c.message, image: c.image, link: c.link })),
      offers.map((offer) => ({ kind: 'offer', offer })),
      products.filter((x) => x.label === 'Top seller').map(({ product, label }) => ({ kind: 'product', product, label })),
      products.filter((x) => x.label === 'Best seller').map(({ product, label }) => ({ kind: 'product', product, label })),
    ]

    const chosen: Notice[] = []
    for (const pool of byPriority) {
      for (const notice of pool) {
        if (chosen.length >= SLOTS) break
        chosen.push(notice)
      }
    }
    if (chosen.length === 0) return []

    const spread = spreadByKind(chosen)

    // Less than a full board between all four sources: cycle what we have
    // rather than leaving gaps. Cycling the SPREAD sequence, not the raw one,
    // so the repeats stay mixed too.
    const filled: Notice[] = []
    while (filled.length < SLOTS) filled.push(spread[filled.length % spread.length])
    return filled
  }, [offers, coupons, products])

  // Eight tiles, sixteen faces, filled by walking the notice list. With fewer
  // than sixteen live notices the list simply wraps — every tile still carries
  // two different ones, which is what stops a flip landing on the same card.
  const tiles = useMemo(() => {
    if (notices.length === 0) return []
    // No wraparound here any more. notices is either empty or exactly SLOTS
    // long, because the cycling that used to happen at this line now happens
    // above, where it can cycle the spread order instead of the raw one.
    return Array.from({ length: TILES }, (_, i) => ({
      front: notices[i * 2],
      back: notices[i * 2 + 1],
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
    <section className="relative border-t border-black/5 bg-linear-to-b from-[#f7f6f4] to-white pb-7 pt-3 sm:pb-11 sm:pt-4">
      {/* Section header. It was pinned hard against the band above with 4px of
          clearance and set in small grey text, so it read as a stray caption
          rather than as the start of a section. The rule between the two ends
          ties them into one line instead of leaving them floating apart. */}
      {/* Both ends are shrink-0, which is correct — a heading that truncates
          and a pill that squashes are both worse than a short rule. It does
          mean the row cannot absorb anything, so the two ends have to actually
          fit, and below sm they did not: the pill was arriving as "All of"
          against the right edge.

          The tracking was most of it. Sixteen uppercase characters at 0.2em of
          a 13px font is about 42px of pure letter-spacing — more than the
          icon and both gaps together — so it comes down on phones along with
          the type. The rule between them keeps its min-w-0 and gives up its
          width first, as it should. */}
      <div className="mx-auto mb-6 flex max-w-[1400px] items-center gap-2.5 px-4 sm:gap-4 sm:px-6">
        <h2 className="inline-flex shrink-0 items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-[#1a1416] sm:gap-2 sm:text-[14.5px] sm:tracking-[0.2em]">
          <Sparkles className="h-3.5 w-3.5 shrink-0 text-[#e01a1b] sm:h-[17px] sm:w-[17px]" />
          What&apos;s happening
        </h2>
        <span aria-hidden className="h-px min-w-0 flex-1 bg-linear-to-r from-black/[0.14] to-transparent" />
        <Link
          href="/offers"
          className="group inline-flex shrink-0 items-center gap-1 rounded-full border border-[#e01a1b]/25 px-2.5 py-1 text-[11px] font-semibold text-[#e01a1b] transition-colors hover:bg-[#fff1f1] sm:gap-1.5 sm:px-3.5 sm:py-1.5 sm:text-[13px]"
        >
          All offers
          <ArrowRight className="h-3 w-3 shrink-0 transition-transform duration-300 group-hover:translate-x-0.5 sm:h-3.5 sm:w-3.5" />
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

        ${tileTracks}

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
              // Hidden rather than not rendered. The count is a CSS breakpoint
              // question, and deciding it in JS would mean either reading the
              // viewport during render — which the server cannot do, so the
              // markup would not match on hydration — or a resize listener
              // re-rendering the board on every drag of a window edge.
              // display:none also stops the tile's flip animation, so the four
              // that are off screen are not turning behind it.
              className={`[perspective:1400px] ${i >= MOBILE_TILES ? 'hidden sm:block' : ''}`}
              style={{ animationDelay: `${i * 60}ms` }}
            >
              {/* The track comes from tileTracks in the stylesheet above, which
                  picks this tile's place in the snake for the column count
                  actually on screen. Every tile shares one duration and runs
                  undelayed — the timing lives inside its track, which is the
                  only way the two sweeps can run in opposite directions. */}
              <div
                className={`m2c-flip m2c-t${i} relative aspect-[5/2] w-full [transform-style:preserve-3d] sm:aspect-[7/3]`}
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

// Offer and coupon cards carry the same three rows in the same box -- a badge
// line, the message, and "Shop now" -- so they scale on the same tiers as the
// product card, and off the card's own width for the same reason.
//
// What was wrong: at 390px the board hands these a 177x71 box, and p-4 alone
// was eating 29 of those 71 pixels before a single row of content. The rest
// went to flex-shrink, which squashed the MIDDLE row -- the message -- to
// SEVEN pixels tall rather than let it overflow. So a coupon on a phone showed
// a badge, a blank strip, and "Shop now", and never the code itself. The offer
// title fared worse at five pixels.
//
// shrink-0 on every row is what makes that impossible now: the rows keep their
// height and the tiers make sure the height is one the card actually has.
const BANNER_BOX = 'relative flex h-full flex-col justify-between p-1.5 @min-[11rem]:p-2 @min-[15rem]:p-3 @min-[20rem]:p-4'
const BANNER_KIND = 'inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-1.5 py-px text-[8px] font-bold uppercase tracking-wide @min-[11rem]:text-[9px] @min-[15rem]:px-2 @min-[15rem]:py-0.5 @min-[15rem]:text-[10px] @min-[15rem]:tracking-wider'
const BANNER_TITLE = 'line-clamp-1 shrink-0 text-[10px] font-semibold leading-tight @min-[11rem]:text-[11px] @min-[12.5rem]:line-clamp-2 @min-[15rem]:text-[12px] @min-[20rem]:text-sm'
const BANNER_CTA = 'inline-flex shrink-0 items-center gap-1 text-[9px] font-semibold @min-[11rem]:text-[10px] @min-[20rem]:text-[11px]'
const BANNER_ICON = 'h-2.5 w-2.5 shrink-0 @min-[15rem]:h-3 @min-[15rem]:w-3'

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

/** Top/best-seller product card. Image and content split by the card's OWN
 *  width, not the viewport, and tinted to the image's colour. */
function TopSellerCard({ p, label }: { p: PublicProduct; label: ProductLabel }) {
  // Two lists, so two badges: same shape and weight, far enough apart in hue
  // that you can tell them apart without reading the words.
  const isBest = label === 'Best seller'
  const badgeTone = isBest
    ? 'bg-gradient-to-r from-teal-500 via-teal-600 to-emerald-600 shadow-[0_2px_8px_-2px_rgba(13,148,136,0.6)]'
    : 'bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 shadow-[0_2px_8px_-2px_rgba(234,88,12,0.6)]'

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
    // @container, not breakpoints. This card's width is set by the grid's
    // column count, not by the window: the board is grid-cols-2 below lg and
    // grid-cols-4 from lg, so the card is WIDEST at 768px (358px) and narrows
    // again at 1024px (238px). A viewport breakpoint reads that backwards.
    // Everything below sizes itself off the card's own inline size.
    //
    // What was wrong: at 360px the card is 162x65 and the old layout wanted
    // 151px of height in it. The badge wrapped to two lines and was cut off,
    // the name collapsed to height 0 (line-clamp-2 in a 43px column has
    // nothing to clamp), and the discount chip was sliced in half. A phone
    // showed a picture and a price and nothing else. 1024px overflowed too,
    // by 19px, for the same reason.
    //
    // Five tiers, each measured against the card sizes the grid really
    // produces. Every threshold is the point where the next thing FITS:
    //
    //   base      142x57   a 320px phone. No struck MRP -- the red chip
    //                      beside it already says a discount is on, and the
    //                      pair together needs a third line the card has not
    //                      got. Badge rides on the image.
    //   11rem     162x76   struck MRP back, type up a step.
    //   15rem     222x89   the badge moves off the image into the column,
    //                      where it can carry the full two-word label.
    //   20rem     294x130  image takes more of the card, name gets a second
    //                      line.
    //   22rem     332x142  room at last for the rating and the savings pill,
    //                      on one line between them.
    //
    // Verified at 19 widths from 320 to 1920: nothing overflows, and the
    // tightest card still has 4px to spare. The rows are shrink-0 on purpose
    // -- without it flex quietly squashes them to fake a fit, which is how
    // a two-line name reports 24px when it needs 33.
    <Link
      href={`/products/${p.slug || p.id}`}
      className={`${CARD} @container`}
      style={{
        background: rgb
          ? `linear-gradient(115deg, rgba(${rgb},0.10) 0%, rgba(${rgb},0.26) 58%, rgba(${rgb},0.12) 100%)`
          : '#ffffff',
      }}
    >
      <div className="flex h-full items-stretch">
        {/* The image gives ground back as the card narrows: 60% of a 162px
            card leaves 43px for words, which is not a column, it is a margin. */}
        <div className="relative w-[40%] shrink-0 overflow-hidden @min-[11rem]:w-[44%] @min-[20rem]:w-[54%]">
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
            className="pointer-events-none absolute inset-y-0 right-0 w-5 @min-[11rem]:w-8 @min-[20rem]:w-14"
            style={{ backgroundImage: `linear-gradient(to left, rgba(${rgb || '255,255,255'},0.9), transparent)` }}
          />

          {/* On the narrowest card the badge rides on the picture instead of
              taking a row in the column — which is the row the product's name
              needs. Shortened to one word because "Top seller" does not fit
              across a 71px image, and the colour carries the rest of it. This
              and its full-width twin below are display:none at opposite sizes,
              so only ever one of them is in the page or read aloud. */}
          <span className={`absolute left-1 top-1 inline-flex items-center gap-0.5 rounded-full px-1.5 py-px text-[9px] font-bold uppercase leading-[1.35] tracking-wide text-white @min-[15rem]:hidden ${badgeTone}`}>
            {isBest ? <Star className="h-2.5 w-2.5 fill-current" /> : <TrendingUp className="h-2.5 w-2.5" />}
            {isBest ? 'Best' : 'Top'}
          </span>
        </div>

        {/* Content */}
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5 px-1.5 py-0.5 @min-[11rem]:px-2 @min-[11rem]:py-1 @min-[15rem]:px-2.5 @min-[20rem]:gap-1 @min-[20rem]:px-3 @min-[20rem]:py-1.5">
          {/* Top seller — vibrant gradient tag (stands out from the tinted card) */}
          <span className={`hidden w-fit shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white @min-[15rem]:inline-flex @min-[20rem]:px-2 @min-[20rem]:tracking-wider ${badgeTone}`}>
            {isBest ? <Star className="h-3 w-3 fill-current" /> : <TrendingUp className="h-3 w-3" />} {label}
          </span>

          <p className="line-clamp-1 shrink-0 text-[10px] font-semibold leading-tight text-gray-900 transition-colors group-hover:text-[#e01a1b] @min-[11rem]:text-[11px] @min-[15rem]:text-[12px] @min-[20rem]:line-clamp-2 @min-[20rem]:text-[13px]">{p.name}</p>

          {/* Price + MRP + discount */}
          <div className="flex shrink-0 flex-wrap items-baseline gap-x-1 gap-y-0.5 @min-[15rem]:gap-x-1.5">
            <span className="text-[12px] font-extrabold text-gray-900 tabular-nums @min-[11rem]:text-[13px] @min-[15rem]:text-[14px] @min-[20rem]:text-base">{formatPrice(effective)}</span>
            {strike && strike > effective && (
              <span className="hidden text-[10px] text-gray-400 line-through tabular-nums @min-[11rem]:inline @min-[20rem]:text-[11px]">{formatPrice(strike)}</span>
            )}
            {discountPct > 0 && (
              <span className="rounded bg-[#e01a1b]/10 px-1 py-px text-[9px] font-bold text-[#e01a1b] @min-[20rem]:text-[10px]">{discountPct}% OFF</span>
            )}
          </div>

          {/* Ratings and savings, on one line and only once there is room for
              them, which is 22rem and not before. Stacked as two separate
              rows they made the column taller than any tile the grid hands
              this card, so the pair was already being trimmed on desktop
              before the phone ever came into it. Neither is load-bearing:
              the strike-through and the % chip above already say there is a
              discount. */}
          {(rating > 0 || reviews > 0 || (savings != null && savings > 0)) && (
            <div className="hidden shrink-0 flex-wrap items-center gap-x-2 gap-y-0.5 @min-[22rem]:flex">
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

              {savings != null && savings > 0 && (
                <span className="inline-flex w-fit items-center rounded-full bg-emerald-50 px-1.5 py-px text-[10px] font-bold text-emerald-700 ring-1 ring-emerald-200 tabular-nums">
                  Save {formatPrice(savings)}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}

function NoticeCard({ notice }: { notice: Notice }) {
  if (notice.kind === 'offer') {
    const o = notice.offer
    const hasImg = !!o.bannerImage
    return (
      <Link href={offerLink(o)} className={`${CARD} @container ${hasImg ? 'bg-gray-900' : 'bg-white'}`}>
        {hasImg ? (
          <>
            <Image src={o.bannerImage!} alt="" fill className="object-cover transition-transform duration-500 group-hover:scale-105" unoptimized={o.bannerImage!.startsWith('http')} sizes="288px" />
            {/* Dark scrim so the text stays legible over any uploaded photo. */}
            <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/45 to-black/20" />
          </>
        ) : (
          <div className="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-[#e01a1b] to-[#ff5a36]" />
        )}
        <div className={BANNER_BOX}>
          <div className="flex shrink-0 items-center justify-between gap-1">
            <span className={`${BANNER_KIND} ${hasImg ? 'bg-white/20 text-white backdrop-blur-sm' : 'bg-[#e01a1b]/10 text-[#e01a1b]'}`}>
              <Percent className={BANNER_ICON} /> Offer
            </span>
            <span className="shrink-0 whitespace-nowrap rounded-full bg-linear-to-r from-[#e01a1b] to-[#ff5a36] px-1.5 py-px text-[9px] font-extrabold text-white shadow @min-[15rem]:px-2 @min-[15rem]:py-0.5 @min-[15rem]:text-[11px]">
              {o.badge}
            </span>
          </div>
          <p className={`${BANNER_TITLE} transition-colors ${hasImg ? 'text-white drop-shadow' : 'text-gray-900 group-hover:text-[#e01a1b]'}`}>{o.title}</p>
          <span className={`${BANNER_CTA} ${hasImg ? 'text-white/90' : 'text-gray-500'}`}>
            Shop now <ArrowRight className={`${BANNER_ICON} transition-transform group-hover:translate-x-0.5`} />
          </span>
        </div>
      </Link>
    )
  }

  if (notice.kind === 'coupon') {
    const hasImg = !!notice.image
    return (
      <Link href={notice.link} className={`${CARD} @container ${hasImg ? 'bg-gray-900' : 'bg-white'}`}>
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
        <div className={BANNER_BOX}>
          <span className={`${BANNER_KIND} w-fit ${hasImg ? 'bg-white/20 text-white backdrop-blur-sm' : 'bg-emerald-50 text-emerald-700'}`}>
            <Ticket className={BANNER_ICON} /> Coupon
          </span>
          <p className={`${BANNER_TITLE} ${hasImg ? 'text-white drop-shadow' : 'text-gray-800'}`}>{notice.message}</p>
          <span className={`${BANNER_CTA} ${hasImg ? 'text-white/90' : 'text-emerald-700'}`}>
            Shop now <ArrowRight className={`${BANNER_ICON} transition-transform group-hover:translate-x-0.5`} />
          </span>
        </div>
      </Link>
    )
  }

  // product (top seller) — its own component so the image-colour hook is valid.
  return <TopSellerCard p={notice.product} label={notice.label} />
}
