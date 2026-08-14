import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Sparkles, Percent, Ticket, TrendingUp, ArrowRight } from 'lucide-react-native';
import { router, type Href } from 'expo-router';
import { offerService } from '@/services/offerService';
import { couponService } from '@/services/couponService';
import { publicProductService, type PublicProduct } from '@/services/publicProductService';
import type { PublicOffer } from '@/lib/offers';
import { formatPrice, getRegionalPrice } from '@/lib/currency';
import { Palette, Radius, Shadow } from '@/constants/theme';
import { extractCouponCode } from '@/lib/coupons';

/**
 * Home promos carousel — the mobile counterpart of
 * frontend/src/components/WebSite/NoticeBoard/NoticeBoard.tsx.
 *
 * Live Offers, promotional Coupons and the current top-selling product, mixed
 * into one swipeable set of promo cards. Every source is fetched independently
 * and fails open: an error just means fewer cards.
 *
 * Card anatomy — a gradient panel per notice:
 *   eyebrow ("Up to" / "Coupon" / "Top seller")
 *   headline — the single number that matters (badge, code, price)
 *   supporting line — the offer title or coupon message
 *   pill CTA
 *   a large translucent disc bleeding off the right edge, holding either the
 *   notice's artwork or its type icon
 *
 * Departure from the web: no "Get the M2C App" card. On the web that card is
 * always present so the band is never empty; inside the app it would advertise
 * the app you are already using. With no live content this renders nothing.
 */

const SCREEN_W = Dimensions.get('window').width;
const SIDE_PAD = 12;
const PEEK = 28;
const CARD_W = SCREEN_W - SIDE_PAD * 2 - PEEK;
const CARD_H = 148;
const CARD_GAP = 12;
const SNAP = CARD_W + CARD_GAP;
const DISC = 132;
const STEP_MS = 4000;
const RESUME_MS = 4500;

/**
 * Ceiling on OS text scaling. Android's "Font size / Display size" and iOS
 * Dynamic Type multiply every `<Text>`; at the largest settings that is ~1.7×,
 * which overflows a fixed-height card in a horizontal strip. Vertical sections
 * elsewhere on the home screen honour the setting in full — only this carousel,
 * which cannot reflow, is capped.
 */
const TEXT_SCALE_CAP = 1.15;

type Tone = {
  /** Panel gradient, light → deep. */
  gradient: [string, string];
  /** Text colour for the CTA pill, which is always white-filled. */
  onPill: string;
};

const TONES: Record<'offer' | 'coupon' | 'product', Tone> = {
  offer: { gradient: ['#1f2937', '#000000'], onPill: Palette.primary },
  coupon: { gradient: ['#1f2937', '#000000'], onPill: '#12855a' },
  product: { gradient: ['#1f2937', '#000000'], onPill: '#b45309' },
};

/** One normalised shape for every notice type. */
type Card = {
  key: string;
  eyebrow: string;
  /** The big number — offer badge, coupon code, product price. */
  headline?: string;
  title: string;
  cta: string;
  tone: Tone;
  Icon: typeof Percent;
  image?: string | null;
  route: Href;
};

/**
 * The backend hands out WEB paths (`/products?category=x`). Translate them to
 * Expo Router targets so a coupon's link actually navigates in the app.
 */
function toAppRoute(webPath: string): Href {
  const [path, query] = webPath.split('?');
  const params = new URLSearchParams(query || '');

  if (path.startsWith('/products/')) {
    return { pathname: '/(any)/products/[id]', params: { id: path.slice('/products/'.length) } } as Href;
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

export default function NoticeBoard() {
  const [offers, setOffers] = useState<PublicOffer[]>([]);
  const [coupons, setCoupons] = useState<{ message: string; image: string | null; link: string }[]>([]);
  const [products, setProducts] = useState<PublicProduct[]>([]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    let active = true;
    (async () => {
      const [o, c, p] = await Promise.all([
        offerService.getActiveOffers().catch(() => []),
        couponService.getPromotionalCoupons(8).catch(() => []),
        // Only the single top-selling product is featured here.
        publicProductService.getTopSellingProducts(1).catch(() => ({ success: false }) as const),
      ]);
      if (!active) return;
      setOffers(o);
      setCoupons(c);
      setProducts('data' in p && p.data?.items ? p.data.items.slice(0, 1) : []);
    })();
    return () => {
      active = false;
    };
  }, []);

  // Normalise, then interleave so the carousel alternates types rather than
  // showing them in blocks — same ordering rule as the web.
  const cards = useMemo<Card[]>(() => {
    const offerCards: Card[] = offers.map((o, i) => ({
      key: `offer-${o.id ?? i}`,
      eyebrow: 'Up to',
      headline: o.badge,
      title: o.title,
      cta: 'Shop now',
      tone: TONES.offer,
      Icon: Percent,
      image: o.bannerImage,
      route: offerRoute(o),
    }));

    const couponCards: Card[] = coupons.map((c, i) => ({
      key: `coupon-${i}`,
      eyebrow: 'Coupon',
      headline: extractCouponCode(c.message),
      title: c.message,
      cta: 'Use code',
      tone: TONES.coupon,
      Icon: Ticket,
      image: c.image,
      route: toAppRoute(c.link),
    }));

    const productCards: Card[] = products.map((p) => ({
      key: `product-${p.id}`,
      eyebrow: 'Top seller',
      headline: formatPrice(getRegionalPrice(p)),
      title: p.name,
      cta: 'View product',
      tone: TONES.product,
      Icon: TrendingUp,
      image: p.images?.find((i) => i.isPrimary)?.url || p.images?.[0]?.url,
      route: { pathname: '/(any)/products/[id]', params: { id: p.id } } as Href,
    }));

    const mixed: Card[] = [];
    const max = Math.max(offerCards.length, couponCards.length, productCards.length);
    for (let i = 0; i < max; i++) {
      if (offerCards[i]) mixed.push(offerCards[i]);
      if (productCards[i]) mixed.push(productCards[i]);
      if (couponCards[i]) mixed.push(couponCards[i]);
    }
    return mixed;
  }, [offers, coupons, products]);

  // ── Auto-advance ──────────────────────────────────────────────────────────
  const scrollRef = useRef<ScrollView>(null);
  const indexRef = useRef(0);
  const pausedRef = useRef(false);
  const resumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (cards.length <= 1) return;
    const id = setInterval(() => {
      if (pausedRef.current) return;
      indexRef.current = (indexRef.current + 1) % cards.length;
      setIndex(indexRef.current);
      scrollRef.current?.scrollTo({ x: indexRef.current * SNAP, animated: true });
    }, STEP_MS);
    return () => clearInterval(id);
  }, [cards.length]);

  // Touching pauses; it resumes a few seconds after the user stops, so a
  // deliberate swipe is never yanked back.
  const pauseThenResume = useCallback(() => {
    pausedRef.current = true;
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
    resumeTimer.current = setTimeout(() => {
      pausedRef.current = false;
    }, RESUME_MS);
  }, []);

  useEffect(
    () => () => {
      if (resumeTimer.current) clearTimeout(resumeTimer.current);
    },
    [],
  );

  const onScrollEnd = useCallback((e: any) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / SNAP);
    indexRef.current = i;
    setIndex(i);
  }, []);

  const goTo = useCallback((i: number) => {
    indexRef.current = i;
    setIndex(i);
    scrollRef.current?.scrollTo({ x: i * SNAP, animated: true });
    pauseThenResume();
  }, [pauseThenResume]);

  if (cards.length === 0) return null;

  return (
    <View style={s.wrap}>
      <View style={s.head}>
        <Sparkles size={14} color={Palette.primary} />
        <Text style={s.headTitle} numberOfLines={1} maxFontSizeMultiplier={TEXT_SCALE_CAP}>
          Promos &amp; Offers
        </Text>
        <View style={s.spacer} />
        <Pressable
          onPress={() => router.push('/(any)/offers')}
          accessibilityRole="button"
          accessibilityLabel="See all offers"
          hitSlop={8}
          style={s.allLink}
        >
          <Text style={s.allLinkText} numberOfLines={1} maxFontSizeMultiplier={TEXT_SCALE_CAP}>
            View all
          </Text>
          <ArrowRight size={12} color={Palette.primary} />
        </Pressable>
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.track}
        onScrollBeginDrag={pauseThenResume}
        onMomentumScrollEnd={onScrollEnd}
        decelerationRate="fast"
        snapToInterval={SNAP}
        snapToAlignment="start"
      >
        {cards.map((card) => (
          <PromoCard key={card.key} card={card} />
        ))}
      </ScrollView>

      {cards.length > 1 ? (
        <View style={s.dots}>
          {cards.map((card, i) => (
            <Pressable
              key={card.key}
              onPress={() => goTo(i)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={`Go to promo ${i + 1}`}
              accessibilityState={{ selected: i === index }}
            >
              <View style={[s.dot, i === index && s.dotActive]} />
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

/* ── Promo card ───────────────────────────────────────────────────────────── */

function PromoCard({ card }: { card: Card }) {
  const { Icon } = card;
  return (
    <Pressable
      onPress={() => router.push(card.route)}
      accessibilityRole="button"
      accessibilityLabel={`${card.eyebrow} ${card.headline ?? ''}. ${card.title}. ${card.cta}`}
      style={({ pressed }) => [s.card, pressed && s.pressed]}
    >
      <LinearGradient
        colors={card.tone.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.panel}
      >
        {/* Decorative disc bleeding off the right edge. Holds the notice's own
            artwork when it has any, otherwise its type icon. Two rings give it
            depth without a blur, which RN can't do cheaply. */}
        <View style={s.discOuter} pointerEvents="none">
          <View style={s.discInner}>
            {card.image ? (
              <Image source={{ uri: card.image }} style={s.discImage} contentFit="cover" transition={200} />
            ) : (
              <Icon size={46} color="rgba(255,255,255,0.9)" strokeWidth={1.6} />
            )}
          </View>
        </View>

        <View style={s.body}>
          <Text style={s.eyebrow} numberOfLines={1} maxFontSizeMultiplier={TEXT_SCALE_CAP}>
            {card.eyebrow}
          </Text>

          {/* Headline always reserves its row so every card keeps the same
              vertical rhythm, with or without a value. */}
          <Text
            style={[s.headline, !card.headline && s.headlineEmpty]}
            numberOfLines={1}
            maxFontSizeMultiplier={TEXT_SCALE_CAP}
          >
            {card.headline ?? ''}
          </Text>

          <Text
            style={s.title}
            numberOfLines={2}
            maxFontSizeMultiplier={TEXT_SCALE_CAP}
          >
            {card.title}
          </Text>

          <View style={s.ctaRow}>
            <View style={s.ctaPill}>
              <Text
                style={[s.ctaText, { color: card.tone.onPill }]}
                numberOfLines={1}
                maxFontSizeMultiplier={TEXT_SCALE_CAP}
              >
                {card.cta}
              </Text>
              <ArrowRight size={13} color={card.tone.onPill} strokeWidth={2.6} />
            </View>
          </View>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

const s = StyleSheet.create({
  wrap: { paddingTop: 16, paddingBottom: 4 },

  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  headTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: Palette.text,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  spacer: { flex: 1 },
  allLink: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  allLinkText: { fontSize: 11.5, fontWeight: '700', color: Palette.primary },

  track: { paddingHorizontal: SIDE_PAD, gap: CARD_GAP },

  card: {
    width: CARD_W,
    height: CARD_H,
    borderRadius: Radius.lg,
    ...Shadow.cardHover,
  },
  pressed: { opacity: 0.94, transform: [{ scale: 0.995 }] },

  panel: {
    flex: 1,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    justifyContent: 'center',
  },

  discOuter: {
    position: 'absolute',
    right: -DISC * 0.3,
    top: (CARD_H - DISC) / 2,
    width: DISC,
    height: DISC,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  discInner: {
    width: DISC * 0.72,
    height: DISC * 0.72,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255,255,255,0.18)',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  discImage: { width: '100%', height: '100%' },

  // Copy stops well short of the disc so nothing collides with it.
  body: { paddingLeft: 18, paddingRight: DISC * 0.62, gap: 2 },
  eyebrow: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.85)',
    textTransform: 'uppercase',
    letterSpacing: 1.1,
  },
  headline: {
    fontSize: 27,
    lineHeight: 32,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: -0.6,
  },
  /** Invisible placeholder keeping the headline row's height when there's no value. */
  headlineEmpty: { color: 'transparent', height: 32 },
  title: {
    fontSize: 12.5,
    lineHeight: 17,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.92)',
    marginTop: 1,
  },

  ctaRow: { flexDirection: 'row', marginTop: 10 },
  ctaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ffffff',
    borderRadius: Radius.full,
    paddingHorizontal: 14,
    height: 32,
    bottom: 10,
  },
  ctaText: {
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 15,
    includeFontPadding: false,
    
  },

  dots: {
    flexDirection: 'row',
    alignSelf: 'center',
    alignItems: 'center',
    gap: 5,
    marginTop: 12,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: Radius.full,
    backgroundColor: Palette.outlineVariant,
  },
  dotActive: { width: 18, backgroundColor: Palette.primary },
});
