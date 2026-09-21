import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { ChevronLeft, ChevronRight, RefreshCw, PackageSearch } from 'lucide-react-native';
import { router } from 'expo-router';
import ProductCard from '../ProductCard/ProductCard';
import { PRODUCT_CARD_WIDTH } from '../ProductCard/metrics';
import { Reveal, EASE_CARD } from '@/components/WebSite/Shared/Reveal';
import { publicProductService, PublicProduct } from '@/services/publicProductService';
import { Palette, Fonts } from '@/constants/theme';
import SectionHeading, { SectionCta } from './SectionHeading';

/**
 * Top Selling — a rail, not a grid.
 *
 * This is the one product section the web builds differently, and deliberately:
 * Featured and Best Sellers are grids, and its own source describes this one as
 * "a white section with a side masthead and a rail". Mobile had rendered all
 * three as the same two-column grid, which erased the only thing telling them
 * apart — the problem the web calls out as making the page read as "one section
 * printed three times".
 *
 * Ported behaviour, from frontend/src/components/WebSite/Featured/TopSelling.tsx:
 *
 *   • horizontal, snapping rail
 *   • auto-advances one card every AUTO_MS
 *   • any touch stops the auto-advance for HOLD_OFF_MS
 *   • two arrow buttons, disabled at each end
 *
 * The arrows are on touch too, which the web explains: "These were desktop-only
 * at first, on the reasoning that swiping is the control on a phone — but a rail
 * with no arrows just reads as a static two-card row unless someone happens to
 * try dragging it, and the arrows are the only thing announcing that there is
 * more. 44px targets, which is the minimum a thumb needs."
 */

/** How often the rail advances on its own, and how long a human touch stops it. */
const AUTO_MS = 3400;
const HOLD_OFF_MS = 7000;

// Entrance timings, from the web. The rail starts later than Best Sellers'
// because the masthead runs in first (LEAD_STEPS 0/90/190/290ms).
const CARDS_BEGIN_MS = 520;
const CARD_STAGGER_MS = 85;
const CARD_MS = 620;

const LIMIT = 8; // a rail can carry more than a 4-up grid
const H_MARGIN = 12;
const CARD_PAD = 14;
const RAIL_GAP = 12;

/* Card width stays PRODUCT_CARD_WIDTH rather than the web's 240px. The web's
   rail card is wider than its grid card, but every product card in this app is
   one size on purpose — a rail with visibly bigger cards would reintroduce the
   inconsistency that was just removed. The rail is the structural difference;
   the card is not. */
const CARD_W = PRODUCT_CARD_WIDTH;
const STEP = CARD_W + RAIL_GAP;

type LoadState = 'loading' | 'ready' | 'empty' | 'error';

const goToAll = () => router.push('/(any)/products' as any);

export default function TopSellingSection() {
  const [products, setProducts] = useState<PublicProduct[]>([]);
  const [state, setState] = useState<LoadState>('loading');
  const [offset, setOffset] = useState(0);
  const [contentW, setContentW] = useState(0);
  const [railW, setRailW] = useState(0);

  const railRef = useRef<ScrollView>(null);
  /** Auto-advance is suppressed until this timestamp after any touch. */
  const holdUntil = useRef(0);

  const fetchProducts = useCallback(async (signal?: AbortSignal) => {
    setState('loading');
    try {
      const res = await publicProductService.getTopSellingProducts(LIMIT);
      if (signal?.aborted) return;
      const list = res.success && res.data ? res.data.items : [];
      setProducts(list);
      setState(list.length === 0 ? 'empty' : 'ready');
    } catch (err) {
      if (signal?.aborted) return;
      console.error('Error fetching top selling products:', err);
      setState('error');
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchProducts(controller.signal);
    return () => controller.abort();
  }, [fetchProducts]);

  const maxOffset = Math.max(0, contentW - railW);
  const atStart = offset <= 2;
  const atEnd = maxOffset > 0 && offset >= maxOffset - 2;

  const page = useCallback(
    (dir: 1 | -1) => {
      // A tap on an arrow is a human touch, so it holds the timer off too.
      holdUntil.current = Date.now() + HOLD_OFF_MS;
      // The web pages by two cards on an arrow press, one on auto-advance.
      const next = Math.max(0, Math.min(maxOffset, offset + dir * STEP * 2));
      railRef.current?.scrollTo({ x: next, animated: true });
    },
    [offset, maxOffset],
  );

  // Auto-advance. Wraps to the start once the last card is reached, so the rail
  // keeps circulating rather than parking at the end.
  useEffect(() => {
    if (state !== 'ready' || maxOffset <= 0) return;
    const id = setInterval(() => {
      if (Date.now() < holdUntil.current) return;
      const next = offset >= maxOffset - 2 ? 0 : Math.min(maxOffset, offset + STEP);
      railRef.current?.scrollTo({ x: next, animated: true });
    }, AUTO_MS);
    return () => clearInterval(id);
  }, [state, offset, maxOffset]);

  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setOffset(e.nativeEvent.contentOffset.x);
  }, []);

  const holdAuto = useCallback(() => {
    holdUntil.current = Date.now() + HOLD_OFF_MS;
  }, []);

  if (state === 'empty') return null;

  return (
    <View style={s.card}>
      <SectionHeading section="topSelling" />

      {state === 'loading' ? (
        <Rail>
          {Array.from({ length: 3 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </Rail>
      ) : state === 'error' ? (
        <ErrorState onRetry={() => fetchProducts()} />
      ) : (
        <>
          <ScrollView
            ref={railRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            onScroll={onScroll}
            scrollEventThrottle={16}
            onScrollBeginDrag={holdAuto}
            onTouchStart={holdAuto}
            onLayout={(e) => setRailW(e.nativeEvent.layout.width)}
            onContentSizeChange={(w) => setContentW(w)}
            // snap-x snap-mandatory: a card always parks at the left edge.
            snapToInterval={STEP}
            snapToAlignment="start"
            decelerationRate="fast"
            contentContainerStyle={s.railContent}
          >
            {products.map((p, i) => (
              <Reveal
                key={p.id}
                distance={26}
                fromScale={0.97}
                duration={CARD_MS}
                delay={CARDS_BEGIN_MS + i * CARD_STAGGER_MS}
                easing={EASE_CARD}
                style={{ width: CARD_W }}
              >
                <ProductCard product={p} />
              </Reveal>
            ))}
          </ScrollView>

          {/* Right-aligned under the rail, as on the web. */}
          <View style={s.railBtnRow}>
            <RailButton dir={-1} disabled={atStart} onPress={() => page(-1)} />
            <RailButton dir={1} disabled={atEnd} onPress={() => page(1)} />
          </View>
        </>
      )}

      <SectionCta section="topSelling" onPress={goToAll} />
    </View>
  );
}

/**
 * The rail's circular arrow. Geometry from the web's RAIL_BUTTON:
 * `h-11 w-11 rounded-full border border-[#dcc9bd] bg-white text-[#7a0f10]`,
 * and its disabled state `border-[#ece4dc] text-[#cbbcb2]`.
 */
function RailButton({
  dir,
  disabled,
  onPress,
}: {
  dir: 1 | -1;
  disabled: boolean;
  onPress: () => void;
}) {
  const Icon = dir === 1 ? ChevronRight : ChevronLeft;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      accessibilityLabel={dir === 1 ? 'Show later products' : 'Show earlier products'}
      android_ripple={{ color: 'rgba(224,26,27,0.15)', borderless: true, radius: 22 }}
      style={[s.railBtn, disabled && s.railBtnDisabled]}
    >
      <Icon size={20} color={disabled ? '#cbbcb2' : '#7a0f10'} strokeWidth={2.2} />
    </Pressable>
  );
}

function Rail({ children }: { children: React.ReactNode }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={s.railContent}
      scrollEnabled={false}
    >
      {children}
    </ScrollView>
  );
}

function CardSkeleton() {
  return (
    <View style={s.skeleton}>
      <View style={{ aspectRatio: 1.25, backgroundColor: '#f3f4f6' }} />
      <View style={{ padding: 10 }}>
        <View style={s.skLine} />
        <View style={[s.skLine, { width: '80%' }]} />
        <View style={[s.skLine, { width: '50%', height: 18, marginTop: 8 }]} />
        <View style={[s.skLine, { width: '100%', height: 36, marginTop: 10, borderRadius: 8 }]} />
      </View>
    </View>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <View style={s.errorWrap}>
      <View style={s.errorIcon}>
        <PackageSearch size={26} color="#ffffff" strokeWidth={1.5} />
      </View>
      <Text style={s.errorTitle}>{"Couldn't load products"}</Text>
      <Text style={s.errorBody}>Check your connection and try again.</Text>
      <Pressable onPress={onRetry} accessibilityRole="button" accessibilityLabel="Retry loading top selling products">
        <View style={s.retry}>
          <RefreshCw size={14} color="#ffffff" strokeWidth={2.25} />
          <Text style={s.retryText}>Try Again</Text>
        </View>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    marginTop: 10,
    marginHorizontal: H_MARGIN,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    paddingVertical: CARD_PAD,
    paddingHorizontal: CARD_PAD,
    borderWidth: 1,
    borderColor: '#eceef1',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },

  /* `alignItems: stretch` so every card in the rail takes the height of the
     tallest one. Without it each card is only as tall as its own contents, and
     a two-line product name pushes that card's price and Add to Cart button
     below its neighbour's — which is exactly what the rail was doing. */
  railContent: {
    gap: RAIL_GAP,
    paddingRight: CARD_PAD,
    alignItems: 'stretch',
  },

  railBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 12,
  },
  railBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#dcc9bd',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  railBtnDisabled: { borderColor: '#ece4dc' },

  skeleton: {
    width: CARD_W,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  skLine: {
    height: 12,
    width: '100%',
    backgroundColor: '#f3f4f6',
    borderRadius: 4,
    marginBottom: 6,
  },

  errorWrap: { paddingVertical: 36, alignItems: 'center', paddingHorizontal: 16 },
  errorIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E01A1B',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  errorTitle: {
    fontFamily: Fonts.heading,
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  errorBody: {
    fontFamily: Fonts.sans,
    color: '#5f5550',
    fontSize: 13,
    marginBottom: 18,
    textAlign: 'center',
    lineHeight: 19,
  },
  retry: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.primary,
    paddingHorizontal: 20,
    minHeight: 42,
    borderRadius: 11,
    gap: 6,
  },
  retryText: {
    fontFamily: Fonts.sansSemibold,
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 13,
  },
});
