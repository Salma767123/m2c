import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, Dimensions } from 'react-native';
import { ArrowRight, RefreshCw, PackageSearch } from 'lucide-react-native';
import { router } from 'expo-router';
import ProductCard from '../ProductCard/ProductCard';
import { publicProductService, PublicProduct } from '@/services/publicProductService';

const LIMIT = 4;
const H_MARGIN = 12;   // section card outer margin
const CARD_PAD = 14;   // section card inner padding
const GRID_GAP = 12;   // gap between product cards
const screenWidth = Dimensions.get('window').width;
const CARD_WIDTH = Math.floor((screenWidth - H_MARGIN * 2 - CARD_PAD * 2 - GRID_GAP) / 2);

type LoadState = 'loading' | 'ready' | 'empty' | 'error';

const goToAll = () => router.push('/(any)/products' as any);

export default function BestSellerSection() {
  const [products, setProducts] = useState<PublicProduct[]>([]);
  const [state, setState] = useState<LoadState>('loading');

  const fetchProducts = useCallback(async (signal?: AbortSignal) => {
    setState('loading');
    try {
      const res = await publicProductService.getBestSellerProducts(LIMIT);
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
    <SectionCard title="Best Sellers">
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
          {products.map((p) => (
            <View key={p.id} style={{ width: CARD_WIDTH }}>
              <ProductCard product={p} />
            </View>
          ))}
        </Grid>
      )}
    </SectionCard>
  );
}

// ─── Section card shell (white floating card + header) ──────────────────────
function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View
      style={{
        marginTop: 10,
        marginHorizontal: H_MARGIN,
        backgroundColor: '#ffffff',
        borderRadius: 20,
        padding: CARD_PAD,
        borderWidth: 1,
        borderColor: '#eceef1',
        shadowColor: '#0f172a',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 2,
          marginBottom: 14,
        }}
      >
        <Text style={{ flex: 1, color: '#111827', fontSize: 20, fontWeight: '800', letterSpacing: -0.3 }}>
          {title}
        </Text>
        <Pressable onPress={goToAll} accessibilityRole="button" accessibilityLabel="View all products" hitSlop={6}>
          <View
            style={{
              width: 56,
              height: 38,
              borderRadius: 19,
              backgroundColor: '#111827',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ArrowRight size={20} color="#ffffff" strokeWidth={2.5} />
          </View>
        </Pressable>
      </View>
      {children}
    </View>
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
        borderColor: '#f3f4f6',
      }}
    >
      <View style={{ aspectRatio: 1, backgroundColor: '#f3f4f6' }} />
      <View style={{ padding: 12 }}>
        <View style={{ height: 8, width: '33%', backgroundColor: '#f3f4f6', borderRadius: 4, marginBottom: 8 }} />
        <View style={{ height: 14, width: '100%', backgroundColor: '#f3f4f6', borderRadius: 4, marginBottom: 6 }} />
        <View style={{ height: 14, width: '80%', backgroundColor: '#f3f4f6', borderRadius: 4, marginBottom: 10 }} />
        <View style={{ height: 20, width: '50%', backgroundColor: '#f3f4f6', borderRadius: 4, marginBottom: 12 }} />
        <View style={{ height: 40, width: '100%', backgroundColor: '#f3f4f6', borderRadius: 12 }} />
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
          backgroundColor: '#fef2f2',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 12,
        }}
      >
        <PackageSearch size={26} color="#ef4444" strokeWidth={1.5} />
      </View>
      <Text style={{ fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 4 }}>
        {"Couldn't load products"}
      </Text>
      <Text style={{ color: '#6b7280', fontSize: 13, marginBottom: 18, textAlign: 'center', lineHeight: 19 }}>
        Check your connection and try again.
      </Text>
      <Pressable onPress={onRetry} accessibilityRole="button" accessibilityLabel="Retry loading best seller products">
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#111827',
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
