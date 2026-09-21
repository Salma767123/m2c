/**
 * Home "What's happening" board — the mobile counterpart of
 * frontend/src/components/WebSite/NoticeBoard/NoticeBoard.tsx.
 *
 * A flip board, not a carousel. Four fixed tiles, each holding two promotions —
 * one on the front, one on the back. Nothing scrolls. This used to be a
 * swipeable belt that looped the same handful of notices past you over and
 * over, and the repetition was the thing you noticed; four tiles holding eight
 * faces show twice as much while standing still.
 *
 * Four sources, strict priority: promo Coupons first, then active Offers, then
 * Top sellers, then Best sellers. Each only gets a look in once the ones above
 * it are exhausted, and if all four together cannot fill the board, what there
 * is repeats rather than leaving gaps. Fail-open: a fetch error just yields
 * fewer cards.
 *
 * Tile count matches the web at phone width: it renders eight and hides four
 * below 640px, so four is what a phone is meant to show, at sweep positions
 * 0, 2, 6, 4 — every other slot, which keeps the full board's even rhythm
 * rather than turning four cards and then standing still for four beats.
 *
 * Not ported: the web tints each product card from its own photograph
 * (useImageColor samples the image). There is no equivalent on the phone
 * without decoding every image in JS, so product cards use a flat white
 * ground and the badge carries the colour instead.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Sparkles, Percent, Ticket, TrendingUp, ArrowRight, Star } from 'lucide-react-native';
import { router, type Href } from 'expo-router';
import { offerService } from '@/services/offerService';
import { couponService } from '@/services/couponService';
import { publicProductService, type PublicProduct } from '@/services/publicProductService';
import type { PublicOffer } from '@/lib/offers';
import { formatPrice, getRegionalPrice, getRegionalOriginalPrice } from '@/lib/currency';
import { Fonts } from '@/constants/theme';

/* ── Board geometry ──────────────────────────────────────────────────────── */

/** Tiles the phone shows. The web hides its other four below 640px. */
const TILES = 4;
/** Every tile has a front and a back, so this is how many cards the board holds. */
const SLOTS = TILES * 2;
/** The full board's slot count — the sweep timing is still computed against it. */
const SWEEP_SLOTS = 8;

const GUTTER = 16;
const GAP = 8;
/** `aspect-[5/2]` — the web's phone tile. */
const TILE_RATIO = 5 / 2;

/* ── Flip timing ─────────────────────────────────────────────────────────── */

/**
 * Two independent speeds, and only one of them is "the queue". SLOT_S is how
 * soon the next tile sets off; TURN_S is how long any one tile takes to turn
 * and settle. At 0.43 against a 1.6s turn, turns overlap — the board should
 * look like it is being worked, not like tiles taking turns.
 */
const SLOT_S = 0.43;
const TURN_S = 1.6;

/**
 * Where the flap sits inside a turn, as [point in the turn, angle past 0].
 *
 * The tile arrives at its mark only 42% of the way through and spends the
 * remaining ~0.9s rocking down to rest: +25, -20, +12, -8, +4, -2, home. Three
 * decaying swings, each smaller than the last. A turn that stops dead on 180
 * looks braked; a real board carries momentum into the stop.
 */
const FLAP: [at: number, deg: number][] = [
  [0.42, 205],
  [0.58, 160],
  [0.71, 192],
  [0.82, 172],
  [0.9, 184],
  [0.96, 178],
  [1.0, 180],
];

const SWEEP_END_S = (SWEEP_SLOTS - 1) * SLOT_S + TURN_S;
const CYCLE_S = SWEEP_END_S * 2;

/**
 * Tiles turn one at a time, snaking: across a row left to right, then back
 * along the next one right to left, so the eye follows one continuous path
 * instead of jumping. DOM order is row-major, so every odd row reverses.
 */
const snakeOrder = (i: number, cols: number) => {
  const row = Math.floor(i / cols);
  const col = i % cols;
  return row * cols + (row % 2 === 0 ? col : cols - 1 - col);
};

/** Sweep position for phone tile `i` — every other slot of the full board. */
const sweepPosition = (i: number) => snakeOrder(i, 2) * (SWEEP_SLOTS / TILES);

/* ── Data ────────────────────────────────────────────────────────────────── */

type ProductLabel = 'Top seller' | 'Best seller';

type Notice =
  | { kind: 'offer'; offer: PublicOffer }
  | { kind: 'coupon'; message: string; image: string | null; link: string }
  | { kind: 'product'; product: PublicProduct; label: ProductLabel };

/**
 * Deal cards out so each kind is spaced evenly across the board rather than
 * bunched. Every card is given a position on a 0..n line: the k-th card of a
 * kind that has c of them sits at (k + phase) * n / c. The phase stops two
 * kinds of equal size from stacking on the same spot.
 *
 * The obvious greedy version — always take from the fullest bucket — spends
 * the small buckets first and leaves the large one as a solid run at the end.
 *
 * Top and best sellers count as separate kinds on purpose: both are product
 * cards, but they wear different badges, so alternating them reads as variety.
 */
function spreadByKind(items: Notice[]): Notice[] {
  const buckets = new Map<string, Notice[]>();
  for (const n of items) {
    const key = n.kind === 'product' ? 'product:' + n.label : n.kind;
    const bucket = buckets.get(key);
    if (bucket) bucket.push(n);
    else buckets.set(key, [n]);
  }

  const total = items.length;
  const keys = [...buckets.keys()];
  const placed: { at: number; notice: Notice }[] = [];
  keys.forEach((key, ki) => {
    const list = buckets.get(key) as Notice[];
    const phase = (ki + 1) / (keys.length + 1);
    const stride = total / list.length;
    list.forEach((notice, i) => placed.push({ at: (i + phase) * stride, notice }));
  });
  placed.sort((x, y) => x.at - y.at);
  return placed.map((p) => p.notice);
}

/**
 * The backend hands out WEB paths (`/products?category=x`). Translate them to
 * Expo Router targets so a coupon's link actually navigates in the app.
 */
function toAppRoute(webPath: string): Href {
  const [path, query] = webPath.split('?');
  const params = new URLSearchParams(query || '');

  if (path.startsWith('/products/')) {
    return {
      pathname: '/(any)/products/[id]',
      params: { id: path.slice('/products/'.length) },
    } as Href;
  }
  if (path === '/products') {
    const category = params.get('category');
    return { pathname: '/(any)/products', params: category ? { category } : {} } as Href;
  }
  if (path === '/categories') return '/(tabs)/categories' as Href;
  if (path === '/offers') return '/(any)/offers' as Href;
  return '/(any)/products' as Href;
}

/** Where an offer card should land, by scope. Mirrors `offerLink` on the web. */
function offerRoute(o: PublicOffer): Href {
  if (o.scope === 'PRODUCT' && o.productIds?.length === 1) {
    return { pathname: '/(any)/products/[id]', params: { id: o.productIds[0] } } as Href;
  }
  if (o.scope === 'CATEGORY' && o.categoryNames?.length) {
    return { pathname: '/(any)/products', params: { category: o.categoryNames[0] } } as Href;
  }
  return '/(any)/products' as Href;
}

/* ── Board ───────────────────────────────────────────────────────────────── */

export default function NoticeBoard() {
  const { width } = useWindowDimensions();
  const [offers, setOffers] = useState<PublicOffer[]>([]);
  const [coupons, setCoupons] = useState<
    { message: string; image: string | null; link: string }[]
  >([]);
  const [products, setProducts] = useState<{ product: PublicProduct; label: ProductLabel }[]>([]);

  useEffect(() => {
    let active = true;
    (async () => {
      const [o, c, top, best] = await Promise.all([
        offerService.getActiveOffers().catch(() => []),
        couponService.getPromotionalCoupons(SLOTS).catch(() => []),
        publicProductService
          .getTopSellingProducts(SLOTS)
          .catch(() => ({ success: false }) as const),
        publicProductService
          .getBestSellerProducts(SLOTS)
          .catch(() => ({ success: false }) as const),
      ]);
      if (!active) return;
      setOffers(o);
      setCoupons(c);

      // A product can carry both tags, and merging without a guard would put it
      // on the board twice wearing a different badge each time — reading as two
      // products rather than one doing well on two counts. First list wins.
      const items = (r: { success: boolean; data?: { items?: PublicProduct[] } }) =>
        r && 'data' in r && r.data?.items ? r.data.items : [];
      const seen = new Set<string>();
      const merged: { product: PublicProduct; label: ProductLabel }[] = [];
      for (const [list, label] of [
        [items(top), 'Top seller'],
        [items(best), 'Best seller'],
      ] as const) {
        for (const product of list) {
          if (seen.has(product.id)) continue;
          seen.add(product.id);
          merged.push({ product, label });
        }
      }
      setProducts(merged);
    })();
    return () => {
      active = false;
    };
  }, []);

  /** Front/back pairs, one per tile. */
  const tiles = useMemo(() => {
    const pool: Notice[] = spreadByKind([
      ...coupons.map(
        (c): Notice => ({ kind: 'coupon', message: c.message, image: c.image, link: c.link }),
      ),
      ...offers.map((offer): Notice => ({ kind: 'offer', offer })),
      ...products.map(({ product, label }): Notice => ({ kind: 'product', product, label })),
    ]);
    if (pool.length === 0) return [];

    // Repeat rather than leave gaps, exactly as the web does.
    const faces: Notice[] = Array.from({ length: SLOTS }, (_, i) => pool[i % pool.length]);
    return Array.from({ length: TILES }, (_, i) => ({
      front: faces[i],
      back: faces[i + TILES],
    }));
  }, [offers, coupons, products]);

  if (tiles.length === 0) return null;

  const tileW = (width - GUTTER * 2 - GAP) / 2;
  const tileH = tileW / TILE_RATIO;

  return (
    <LinearGradient colors={['#f7f6f4', '#ffffff']} style={s.section}>
      {/* Section header — a rule between the heading and the pill ties them
          into one line instead of leaving them floating apart. */}
      <View style={s.head}>
        <View style={s.headLeft}>
          <Sparkles size={14} color="#e01a1b" strokeWidth={2.2} />
          <Text style={s.headTitle}>What&apos;s happening</Text>
        </View>
        <LinearGradient
          colors={['rgba(0,0,0,0.14)', 'rgba(0,0,0,0)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={s.headRule}
        />
        <Pressable
          onPress={() => router.push('/(any)/offers')}
          accessibilityRole="button"
          accessibilityLabel="All offers"
          style={s.allOffers}
        >
          <Text style={s.allOffersText}>All offers</Text>
          <ArrowRight size={12} color="#e01a1b" strokeWidth={2.4} />
        </Pressable>
      </View>

      <View style={s.board}>
        {tiles.map((tile, i) => (
          <Tile
            key={`tile-${i}`}
            index={i}
            width={tileW}
            height={tileH}
            front={tile.front}
            back={tile.back}
          />
        ))}
      </View>
    </LinearGradient>
  );
}

/* ── One tile ────────────────────────────────────────────────────────────── */

function Tile({
  index,
  width,
  height,
  front,
  back,
}: {
  index: number;
  width: number;
  height: number;
  front: Notice;
  back: Notice;
}) {
  const rot = useSharedValue(0);
  const deal = useSharedValue(0);

  useEffect(() => {
    // Dealt in: fade up and settle, staggered across the board.
    deal.value = withDelay(index * 60, withTiming(1, { duration: 520, easing: Easing.out(Easing.cubic) }));

    const c = sweepPosition(index);
    const out = c * SLOT_S;
    const back2 = SWEEP_END_S + (SWEEP_SLOTS - 1 - c) * SLOT_S;

    // One turn: the flap's steps, each an ease-in-out leg. ease-in-out is what
    // a swinging thing does — slowest at each extreme, fastest through the
    // middle. An ease-out curve flattens every rebound into a slide.
    const turn = (base: number) => {
      let prev = 0;
      return FLAP.map(([at, deg]) => {
        const duration = (at - prev) * TURN_S * 1000;
        prev = at;
        return withTiming(base + deg, { duration, easing: Easing.inOut(Easing.ease) });
      });
    };

    const holdBefore = out * 1000;
    const holdMid = (back2 - (out + TURN_S)) * 1000;
    const holdAfter = (CYCLE_S - (back2 + TURN_S)) * 1000;

    rot.value = withRepeat(
      withSequence(
        withTiming(0, { duration: Math.max(holdBefore, 0) }),
        ...turn(0),
        withTiming(180, { duration: Math.max(holdMid, 0) }),
        ...turn(180),
        withTiming(360, { duration: Math.max(holdAfter, 0) }),
        // 360 and 0 are the same picture, so the loop has no seam.
        withTiming(0, { duration: 0 }),
      ),
      -1,
      false,
    );
    // Shared values are stable and the tile's track never changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dealStyle = useAnimatedStyle(() => ({
    opacity: deal.value,
    transform: [{ translateY: (1 - deal.value) * 24 }, { scale: 0.96 + deal.value * 0.04 }],
  }));

  /*
   * Each face carries its own rotation. React Native has no `transform-style:
   * preserve-3d`, so a face nested inside a rotating parent is NOT placed in
   * that parent's 3D space — the card would spin flat and the back would never
   * turn into view. The two faces are therefore siblings, half a turn apart,
   * each rotated directly.
   *
   * `backfaceVisibility: 'hidden'` is unreliable on Android, so which face is
   * up is also driven from the angle: the front shows whenever cos(angle) >= 0,
   * and they swap at 90 degrees, where the tile is edge-on and invisible anyway.
   */
  const frontStyle = useAnimatedStyle(() => ({
    opacity: Math.cos((rot.value * Math.PI) / 180) >= 0 ? 1 : 0,
    transform: [{ perspective: 1400 }, { rotateY: `${rot.value}deg` }],
  }));
  const backStyle = useAnimatedStyle(() => ({
    opacity: Math.cos((rot.value * Math.PI) / 180) < 0 ? 1 : 0,
    transform: [{ perspective: 1400 }, { rotateY: `${rot.value + 180}deg` }],
  }));

  return (
    <Animated.View style={[{ width, height }, dealStyle]}>
      <Animated.View style={[s.face, frontStyle]}>
        <NoticeCard notice={front} width={width} height={height} />
      </Animated.View>
      <Animated.View style={[s.face, backStyle]}>
        <NoticeCard notice={back} width={width} height={height} />
      </Animated.View>
    </Animated.View>
  );
}

/* ── Cards ───────────────────────────────────────────────────────────────── */

function NoticeCard({
  notice,
  width,
  height,
}: {
  notice: Notice;
  width: number;
  height: number;
}) {
  if (notice.kind === 'product') {
    return <ProductFace p={notice.product} label={notice.label} width={width} height={height} />;
  }

  const isOffer = notice.kind === 'offer';
  const image = isOffer ? notice.offer.bannerImage : notice.image;
  const hasImg = !!image;
  const onPress = () =>
    router.push(isOffer ? offerRoute(notice.offer) : toAppRoute(notice.link));

  // Tiers off the tile's own width, matching the web's container queries.
  const pad = width >= 320 ? 12 : width >= 240 ? 10 : width >= 176 ? 7 : 6;
  const titleSize = width >= 320 ? 13 : width >= 240 ? 12 : width >= 176 ? 11 : 10;
  const kindSize = width >= 240 ? 10 : width >= 176 ? 9 : 8;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={isOffer ? `Offer: ${notice.offer.title}` : `Coupon: ${notice.message}`}
      style={[s.card, { backgroundColor: hasImg ? '#111827' : '#ffffff' }]}
    >
      {hasImg ? (
        <>
          <Image source={{ uri: image! }} style={StyleSheet.absoluteFill} contentFit="cover" />
          {/* Dark scrim so the text stays legible over any uploaded photo. */}
          <LinearGradient
            colors={['rgba(0,0,0,0.20)', 'rgba(0,0,0,0.45)', 'rgba(0,0,0,0.80)']}
            style={StyleSheet.absoluteFill}
          />
        </>
      ) : (
        <LinearGradient
          colors={isOffer ? ['#e01a1b', '#ff5a36'] : ['#10b981', '#2dd4bf']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={s.topRule}
        />
      )}

      <View style={[s.bannerBox, { padding: pad }]}>
        <View style={s.bannerTop}>
          <View
            style={[
              s.kindPill,
              hasImg
                ? { backgroundColor: 'rgba(255,255,255,0.2)' }
                : { backgroundColor: isOffer ? 'rgba(224,26,27,0.10)' : '#ecfdf5' },
            ]}
          >
            {isOffer ? (
              <Percent size={kindSize} color={hasImg ? '#ffffff' : '#e01a1b'} strokeWidth={2.6} />
            ) : (
              <Ticket size={kindSize} color={hasImg ? '#ffffff' : '#047857'} strokeWidth={2.6} />
            )}
            <Text
              style={[
                s.kindText,
                { fontSize: kindSize, color: hasImg ? '#ffffff' : isOffer ? '#e01a1b' : '#047857' },
              ]}
            >
              {isOffer ? 'Offer' : 'Coupon'}
            </Text>
          </View>

          {isOffer ? (
            <LinearGradient
              colors={['#e01a1b', '#ff5a36']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={s.badgeChip}
            >
              <Text style={[s.badgeText, { fontSize: width >= 240 ? 11 : 9 }]} numberOfLines={1}>
                {notice.offer.badge}
              </Text>
            </LinearGradient>
          ) : null}
        </View>

        <Text
          style={[
            s.bannerTitle,
            { fontSize: titleSize, color: hasImg ? '#ffffff' : isOffer ? '#111827' : '#1f2937' },
          ]}
          numberOfLines={width >= 200 ? 2 : 1}
        >
          {isOffer ? notice.offer.title : notice.message}
        </Text>

        <View style={s.bannerCta}>
          <Text
            style={[
              s.bannerCtaText,
              {
                fontSize: width >= 320 ? 11 : width >= 176 ? 10 : 9,
                color: hasImg ? 'rgba(255,255,255,0.9)' : isOffer ? '#6b7280' : '#047857',
              },
            ]}
          >
            Shop now
          </Text>
          <ArrowRight
            size={kindSize}
            color={hasImg ? 'rgba(255,255,255,0.9)' : isOffer ? '#6b7280' : '#047857'}
            strokeWidth={2.6}
          />
        </View>
      </View>
    </Pressable>
  );
}

function ProductFace({
  p,
  label,
  width,
}: {
  p: PublicProduct;
  label: ProductLabel;
  width: number;
  height: number;
}) {
  const isBest = label === 'Best seller';
  const img = p.images?.find((i) => i.isPrimary)?.url || p.images?.[0]?.url;

  // Mirrors ProductCard: an active offer defines the effective price and the
  // strike-through, else the product's regional MRP.
  const price = getRegionalPrice(p);
  const offer = (p as { activeOffer?: { offerPrice?: number; originalPrice?: number } })
    .activeOffer;
  const effective = offer?.offerPrice ?? price ?? 0;
  const strike = offer?.originalPrice ?? getRegionalOriginalPrice(p) ?? null;
  const savings = strike && strike > effective ? strike - effective : null;
  const discountPct =
    strike && strike > effective
      ? Math.round(((strike - effective) / strike) * 100)
      : p.discount || 0;

  /* The web's five tiers, measured against the card widths the grid produces.
     Each threshold is the point where the next thing FITS. */
  const showStrike = width >= 176; // 11rem
  const badgeInColumn = width >= 240; // 15rem — badge leaves the image
  const twoLineName = width >= 320; // 20rem
  const showSavings = width >= 352; // 22rem

  const imgPct = width >= 320 ? 0.54 : width >= 176 ? 0.44 : 0.4;
  const nameSize = width >= 320 ? 13 : width >= 240 ? 12 : width >= 176 ? 11 : 10;
  const priceSize = width >= 320 ? 16 : width >= 240 ? 14 : width >= 176 ? 13 : 12;

  const badgeColors: [string, string] = isBest ? ['#14b8a6', '#059669'] : ['#fbbf24', '#f43f5e'];
  const BadgeIcon = isBest ? Star : TrendingUp;

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/(any)/products/[id]', params: { id: p.id } })}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${p.name}, ${formatPrice(effective)}`}
      style={[s.card, { backgroundColor: '#ffffff' }]}
    >
      <View style={s.productRow}>
        <View style={[s.productImage, { width: `${imgPct * 100}%` }]}>
          {img ? (
            <Image source={{ uri: img }} style={StyleSheet.absoluteFill} contentFit="cover" />
          ) : (
            <View style={s.productImageEmpty}>
              <TrendingUp size={24} color="#d1d5db" />
            </View>
          )}
          {/* Soft blend from the image edge into the content panel. */}
          <LinearGradient
            colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.9)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={s.productFade}
          />

          {/* On a narrow card the badge rides on the picture instead of taking
              the row the product's name needs. Shortened to one word, because
              "Top seller" does not fit across a 71px image — the colour
              carries the rest of it. */}
          {!badgeInColumn ? (
            <LinearGradient colors={badgeColors} style={s.badgeOnImage}>
              <BadgeIcon size={8} color="#ffffff" strokeWidth={2.6} />
              <Text style={s.badgeOnImageText}>{isBest ? 'Best' : 'Top'}</Text>
            </LinearGradient>
          ) : null}
        </View>

        <View style={s.productCol}>
          {badgeInColumn ? (
            <LinearGradient
              colors={badgeColors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={s.badgeInCol}
            >
              <BadgeIcon size={10} color="#ffffff" strokeWidth={2.6} />
              <Text style={s.badgeInColText}>{label}</Text>
            </LinearGradient>
          ) : null}

          <Text style={[s.productName, { fontSize: nameSize }]} numberOfLines={twoLineName ? 2 : 1}>
            {p.name}
          </Text>

          <View style={s.priceRow}>
            <Text style={[s.price, { fontSize: priceSize }]}>{formatPrice(effective)}</Text>
            {showStrike && strike && strike > effective ? (
              <Text style={s.strike}>{formatPrice(strike)}</Text>
            ) : null}
            {discountPct > 0 ? (
              <View style={s.discountChip}>
                <Text style={s.discountText}>{discountPct}% OFF</Text>
              </View>
            ) : null}
          </View>

          {showSavings && savings != null && savings > 0 ? (
            <View style={s.savingsChip}>
              <Text style={s.savingsText}>Save {formatPrice(savings)}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

/* ── Styles ──────────────────────────────────────────────────────────────── */

const s = StyleSheet.create({
  section: { borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)', paddingTop: 12, paddingBottom: 28 },

  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: GUTTER,
    marginBottom: 14,
  },
  headLeft: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 0 },
  headTitle: {
    fontFamily: Fonts.sansBold,
    fontSize: 11,
    // Outfit is static: the weight must name the loaded file (Outfit_700Bold).
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.3,
    color: '#1a1416',
  },
  headRule: { flex: 1, minWidth: 0, height: 1 },
  allOffers: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
    borderWidth: 1,
    borderColor: 'rgba(224,26,27,0.25)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  allOffersText: {
    fontFamily: Fonts.sansSemibold,
    fontSize: 11,
    fontWeight: '600',
    color: '#e01a1b',
  },

  board: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GAP,
    paddingHorizontal: GUTTER,
  },

  face: { ...StyleSheet.absoluteFillObject, backfaceVisibility: 'hidden' },

  card: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  topRule: { position: 'absolute', left: 0, right: 0, top: 0, height: 4 },

  /* ── Offer / coupon face ── */
  bannerBox: { flex: 1, justifyContent: 'space-between' },
  bannerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 4 },
  kindPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  kindText: {
    fontFamily: Fonts.sansBold,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  badgeChip: { borderRadius: 999, paddingHorizontal: 7, paddingVertical: 1 },
  badgeText: { fontFamily: Fonts.sansBold, fontWeight: '700', color: '#ffffff' },
  bannerTitle: { fontFamily: Fonts.sansSemibold, fontWeight: '600', lineHeight: 15 },
  bannerCta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  bannerCtaText: { fontFamily: Fonts.sansSemibold, fontWeight: '600' },

  /* ── Product face ── */
  productRow: { flex: 1, flexDirection: 'row', alignItems: 'stretch' },
  productImage: { position: 'relative', overflow: 'hidden' },
  productImageEmpty: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  productFade: { position: 'absolute', top: 0, bottom: 0, right: 0, width: 24 },
  badgeOnImage: {
    position: 'absolute',
    left: 4,
    top: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    borderRadius: 999,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  badgeOnImageText: {
    fontFamily: Fonts.sansBold,
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    color: '#ffffff',
  },
  productCol: { flex: 1, minWidth: 0, justifyContent: 'center', gap: 2, paddingHorizontal: 7, paddingVertical: 4 },
  badgeInCol: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  badgeInColText: {
    fontFamily: Fonts.sansBold,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    color: '#ffffff',
  },
  productName: {
    fontFamily: Fonts.sansSemibold,
    fontWeight: '600',
    lineHeight: 15,
    color: '#111827',
  },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', gap: 4 },
  price: { fontFamily: Fonts.sansBold, fontWeight: '700', color: '#111827' },
  strike: {
    fontFamily: Fonts.sans,
    fontSize: 10,
    color: '#9ca3af',
    textDecorationLine: 'line-through',
  },
  discountChip: {
    backgroundColor: 'rgba(224,26,27,0.10)',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  discountText: {
    fontFamily: Fonts.sansBold,
    fontSize: 9,
    fontWeight: '700',
    color: '#e01a1b',
  },
  savingsChip: {
    alignSelf: 'flex-start',
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  savingsText: {
    fontFamily: Fonts.sansBold,
    fontSize: 10,
    fontWeight: '700',
    color: '#047857',
  },
});
