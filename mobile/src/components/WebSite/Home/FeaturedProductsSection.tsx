import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, Dimensions } from 'react-native';
import { RefreshCw, PackageSearch } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import ProductCard from '../ProductCard/ProductCard';
import { PRODUCT_CARD_WIDTH } from '../ProductCard/metrics';
import { UnrollReveal } from '@/components/WebSite/Shared/Reveal';

import { publicProductService, PublicProduct } from '@/services/publicProductService';
import { Palette } from '@/constants/theme';
import SectionHeading, { SectionCta, type SectionKey } from './SectionHeading';

// From frontend Featured/Products.tsx. A longer stagger than the other rails
// on purpose: this entrance reads as a wave travelling across the grid, where
// theirs are a quick rise.
const UNROLL_MS = 950;
const UNROLL_STAGGER_MS = 170;

// Matches frontend Featured/Products.tsx: FEATURED_COUNT = 6.
const LIMIT = 6;
const H_MARGIN = 12;
const CARD_PAD = 14;
const GRID_GAP = 12;
const screenWidth = Dimensions.get('window').width;
// One shared width for every product grid in the app.
const CARD_WIDTH = PRODUCT_CARD_WIDTH;

type LoadState = 'loading' | 'ready' | 'empty' | 'error';

const goToAll = () => router.push('/(any)/products' as any);

export default function FeaturedProductsSection() {
  const [products, setProducts] = useState<PublicProduct[]>([]);
  const [state, setState] = useState<LoadState>('loading');

  const fetchProducts = useCallback(async (signal?: AbortSignal) => {
    setState('loading');
    try {
      const res = await publicProductService.getFeaturedProducts(LIMIT);
      if (signal?.aborted) return;
      const list = res.success && res.data ? res.data.items : [];
      setProducts(list);
      setState(list.length === 0 ? 'empty' : 'ready');
    } catch (err) {
      if (signal?.aborted) return;
      console.error('Error fetching featured products:', err);
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
    <SectionCard section="featured">
      {state === 'loading' ? (
        <Grid>
          {Array.from({ length: LIMIT }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </Grid>
      ) : state === 'error' ? (
        <ErrorState onRetry={() => fetchProducts()} />
      ) : (
        <Grid>
          {products.map((p, i) => (
            <UnrollReveal
              key={p.id}
              duration={UNROLL_MS}
              delay={i * UNROLL_STAGGER_MS}
              style={{ width: CARD_WIDTH, borderRadius: 16 }}
            >
              <ProductCard product={p} />
            </UnrollReveal>
          ))}
        </Grid>
      )}
    </SectionCard>
  );
}

// ─── Section card shell (linen ground + header) ────────────────────────────────
function SectionCard({
  section,
  children,
}: {
  section: SectionKey;
  children: React.ReactNode;
}) {
  return (
    <LinearGradient
      /* Warm linen ground from frontend Featured/Products.tsx GROUND constant:
         border-y border-[#ece0d2] bg-linear-to-b from-[#faf6f0] via-[#f4ebe0] to-[#f8f2ea] */
      colors={['#faf6f0', '#f4ebe0', '#f8f2ea']}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={{
        marginTop: 10,
        marginHorizontal: H_MARGIN,
        borderRadius: 20,
        padding: CARD_PAD,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderLeftWidth: 0,
        borderRightWidth: 0,
        borderColor: '#ece0d2',
      }}
    >
      <SectionHeading section={section} />

      {children}

      {/* Below the rail, matching the web: it hides the masthead link on a
          phone and puts a solid pill under the grid instead. */}
      <SectionCta section={section} onPress={goToAll} />
    </LinearGradient>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: GRID_GAP }}>
      {children}
    </View>
  );
}

function CardSkeleton() {
  return (
    <View
      style={{
        width: CARD_WIDTH,
        backgroundColor: '#ffffff',
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#e3d7c9',
        /* Mirrors ProductCard showcase shadow so the skeleton and the real card
           sit at the same elevation — no jump when fetch resolves. */
        shadowColor: '#4a3226',
        shadowOpacity: 0.45,
        shadowOffset: { width: 0, height: 10 },
        shadowRadius: 13,
        elevation: 3,
      }}
    >
      {/* Frontend skeleton: aspect-[5/4] with bg-[#efe6db]. Was square (1:1). */}
      <View style={{ aspectRatio: 1.25, backgroundColor: '#efe6db' }} />
      {/* Frontend skeleton: space-y-3 p-3.5 with #e6dacc placeholders. */}
      <View style={{ padding: 14 }}>
        <View style={{ height: 16, width: '75%', backgroundColor: '#e6dacc', borderRadius: 4, marginBottom: 12 }} />
        <View style={{ height: 24, width: '50%', backgroundColor: '#e6dacc', borderRadius: 4, marginBottom: 12 }} />
        <View style={{ height: 40, width: '100%', backgroundColor: '#f0e8de', borderRadius: 8 }} />
      </View>
    </View>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <View style={{ paddingVertical: 36, alignItems: 'center', paddingHorizontal: 16 }}>
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: '#E01A1B',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 12,
        }}
      >
        <PackageSearch size={26} color="#ffffff" strokeWidth={1.5} />
      </View>
      <Text style={{ fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 4 }}>
        {"Couldn't load products"}
      </Text>
      <Text style={{ color: '#6b7280', fontSize: 13, marginBottom: 18, textAlign: 'center', lineHeight: 19 }}>
        Check your connection and try again.
      </Text>
      <Pressable onPress={onRetry} accessibilityRole="button" accessibilityLabel="Retry loading featured products">
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: Palette.primary,
            paddingHorizontal: 20,
            minHeight: 42,
            borderRadius: 11,
            gap: 6,
          }}
        >
          <RefreshCw size={14} color="#ffffff" strokeWidth={2.25} />
          <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: 13 }}>Try Again</Text>
        </View>
      </Pressable>
    </View>
  );
}
