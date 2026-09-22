import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { RefreshCw, PackageSearch } from 'lucide-react-native';
import { router } from 'expo-router';
import ProductCard from '../ProductCard/ProductCard';
import { PRODUCT_CARD_WIDTH, CARD_GUTTER, CARD_GAP } from '../ProductCard/metrics';
import { Reveal, EASE_CARD } from '@/components/WebSite/Shared/Reveal';
import { publicProductService, PublicProduct } from '@/services/publicProductService';
import { Palette, Fonts } from '@/constants/theme';
import SectionHeading, { SectionCta } from './SectionHeading';

/**
 * Best Sellers.
 *
 * ── The ground ──────────────────────────────────────────────────────────────
 * The web gives each of its three product sections a ground of its own, and
 * says why: it "is what lets the white cards read as objects sitting on
 * something instead of dissolving into the page".
 *
 *   Featured     linen band   border-y #ece0d2, #faf6f0 → #f4ebe0 → #f8f2ea
 *   Top Selling  plain white
 *   Best Seller  blush band   border-y #eedad4, #fdf7f5 → #f7e5e0 → #fdf8f6
 *
 * Mobile had rendered all three as the same white rounded card — so white
 * product cards sat on a white panel, which is the exact dissolving these
 * grounds exist to prevent. This section is now the web's blush band:
 * full-bleed, with a rule top and bottom rather than a floating card.
 *
 * The horizontal padding is CARD_GUTTER, the app's one grid inset, so every
 * product grid — here, the home rails, the products list — lands on the same
 * card width.
 */
const BEST_SELLER_COUNT = 6; // the web's BEST_SELLER_COUNT

// Entrance timings, from frontend Featured/BestSeller.tsx — the cards rise
// 26px from .97 on the web's card curve, beginning after the masthead.
const CARDS_BEGIN_MS = 260;
const CARD_STAGGER_MS = 80;
const CARD_MS = 660;

const CARD_WIDTH = PRODUCT_CARD_WIDTH;

type LoadState = 'loading' | 'ready' | 'empty' | 'error';

const goToAll = () => router.push('/(any)/products' as any);

export default function BestSellerSection() {
  const [products, setProducts] = useState<PublicProduct[]>([]);
  const [state, setState] = useState<LoadState>('loading');

  const fetchProducts = useCallback(async (signal?: AbortSignal) => {
    setState('loading');
    try {
      const res = await publicProductService.getBestSellerProducts(BEST_SELLER_COUNT);
      if (signal?.aborted) return;
      const list = res.success && res.data ? res.data.items : [];
      setProducts(list);
      setState(list.length === 0 ? 'empty' : 'ready');
    } catch (err) {
      if (signal?.aborted) return;
      console.error('Error fetching best seller products:', err);
      setState('error');
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchProducts(controller.signal);
    return () => controller.abort();
  }, [fetchProducts]);

  if (state === 'empty') return null;

  return (
    <LinearGradient
      colors={['#fdf7f5', '#f7e5e0', '#fdf8f6']}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={s.band}
    >
      <SectionHeading section="bestSeller" />

      {state === 'loading' ? (
        <Grid>
          {Array.from({ length: BEST_SELLER_COUNT }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </Grid>
      ) : state === 'error' ? (
        <ErrorState onRetry={() => fetchProducts()} />
      ) : (
        <Grid>
          {products.slice(0, BEST_SELLER_COUNT).map((p, i) => (
            <Reveal
              key={p.id}
              distance={26}
              fromScale={0.97}
              duration={CARD_MS}
              delay={CARDS_BEGIN_MS + i * CARD_STAGGER_MS}
              easing={EASE_CARD}
              style={{ width: CARD_WIDTH }}
            >
              <ProductCard product={p} />
            </Reveal>
          ))}
        </Grid>
      )}

      {/* Below the grid, matching the web: it hides the masthead link on a
          phone and puts a solid pill under the grid instead. */}
      <SectionCta section="bestSeller" onPress={goToAll} />
    </LinearGradient>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        rowGap: CARD_GAP,
      }}
    >
      {children}
    </View>
  );
}

function CardSkeleton() {
  return (
    <View style={s.skeleton}>
      {/* aspect-[5/4] and the showcase card's warm ring, so the grid keeps its
          shape when the fetch resolves. */}
      <View style={{ aspectRatio: 1.25, backgroundColor: '#f3e5e0' }} />
      <View style={{ padding: 10 }}>
        <View style={s.skLine} />
        <View style={[s.skLine, { width: '75%' }]} />
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
      <Pressable
        onPress={onRetry}
        accessibilityRole="button"
        accessibilityLabel="Retry loading best seller products"
      >
        <View style={s.retry}>
          <RefreshCw size={14} color="#ffffff" strokeWidth={2.25} />
          <Text style={s.retryText}>Try Again</Text>
        </View>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  /* Full-bleed band with a rule top and bottom — `border-y border-[#eedad4]`.
     No margin and no radius: this is a band the page passes through, not a
     card floating on it. */
  band: {
    marginTop: 10,
    paddingVertical: 24,
    paddingHorizontal: CARD_GUTTER,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#eedad4',
  },

  skeleton: {
    width: CARD_WIDTH,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e3d7c9',
  },
  skLine: {
    height: 12,
    width: '100%',
    backgroundColor: '#f3e5e0',
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
