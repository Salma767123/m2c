import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, Dimensions } from 'react-native';
import { ChevronRight, RefreshCw, PackageSearch } from 'lucide-react-native';
import { router } from 'expo-router';
import ProductCard from '../ProductCard/ProductCard';
import { publicProductService, PublicProduct } from '@/services/publicProductService';

const LIMIT = 4;
const H_PADDING = 16;
const GRID_GAP = 14;
const screenWidth = Dimensions.get('window').width;
const CARD_WIDTH = Math.floor((screenWidth - H_PADDING * 2 - GRID_GAP) / 2);

type LoadState = 'loading' | 'ready' | 'empty' | 'error';

export default function TopSellingSection() {
  const [products, setProducts] = useState<PublicProduct[]>([]);
  const [state, setState] = useState<LoadState>('loading');

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

  if (state === 'empty') return null;

  return (
    <View style={{ backgroundColor: '#ffffff', paddingVertical: 24 }}>
      <SectionHeader />

      <View style={{ paddingHorizontal: H_PADDING }}>
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
      </View>

      {state === 'ready' ? <ViewAllButton /> : null}
    </View>
  );
}

function SectionHeader() {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        marginBottom: 20,
      }}
    >
      <View style={{ flex: 1, paddingRight: 12 }}>
        <Text
          numberOfLines={1}
          style={{
            color: '#1a1a1a',
            fontSize: 22,
            fontWeight: '700',
            lineHeight: 28,
          }}
        >
          Top Selling
        </Text>
        <Text
          numberOfLines={1}
          style={{
            color: '#6b7280',
            fontSize: 13,
            lineHeight: 18,
            marginTop: 2,
          }}
        >
          Popular choices by the community
        </Text>
      </View>
      <Pressable
        onPress={() => router.push('/(any)/products' as any)}
        accessibilityRole="button"
        accessibilityLabel="View all products"
        hitSlop={6}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#111827',
            paddingHorizontal: 14,
            height: 36,
            minWidth: 96,
            borderRadius: 8,
          }}
        >
          <Text style={{ color: '#ffffff', fontSize: 12, fontWeight: '600', marginRight: 4 }}>
            View All
          </Text>
          <ChevronRight size={14} color="#ffffff" strokeWidth={2.5} />
        </View>
      </Pressable>
    </View>
  );
}

function ViewAllButton() {
  return (
    <View style={{ alignItems: 'center', marginTop: 24, paddingHorizontal: 16 }}>
      <Pressable
        onPress={() => router.push('/(any)/products' as any)}
        accessibilityRole="button"
        accessibilityLabel="View all products"
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: pressed ? '#1a1a1a' : '#1f2937',
          width: '100%',
          height: 52,
          borderRadius: 14,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 2,
        })}
      >
        <Text
          style={{ color: '#ffffff', fontSize: 15, fontWeight: '700', marginRight: 8 }}
        >
          Discover All Top Selling
        </Text>
        <ChevronRight size={18} color="#ffffff" strokeWidth={2.5} />
      </Pressable>
    </View>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: GRID_GAP,
      }}
    >
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
        borderColor: '#f3f4f6'
      }}
    >
      <View style={{ aspectRatio: 1, backgroundColor: '#f3f4f6' }} />
      <View style={{ padding: 14 }}>
        <View style={{ height: 8, width: '33%', backgroundColor: '#f3f4f6', borderRadius: 4, marginBottom: 8 }} />
        <View style={{ height: 16, width: '100%', backgroundColor: '#f3f4f6', borderRadius: 4, marginBottom: 6 }} />
        <View style={{ height: 16, width: '80%', backgroundColor: '#f3f4f6', borderRadius: 4, marginBottom: 12 }} />
        <View style={{ height: 12, width: '33%', backgroundColor: '#f3f4f6', borderRadius: 4, marginBottom: 12 }} />
        <View style={{ height: 24, width: '50%', backgroundColor: '#f3f4f6', borderRadius: 4, marginBottom: 16 }} />
        <View style={{ height: 40, width: '100%', backgroundColor: '#f3f4f6', borderRadius: 12 }} />
      </View>
    </View>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <View style={{ paddingVertical: 48, alignItems: 'center', paddingHorizontal: 24 }}>
      <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#fef2f2', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
        <PackageSearch size={28} color="#dc2626" strokeWidth={1.5} />
      </View>
      <Text style={{ fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 4 }}>
        {"Couldn't load products"}
      </Text>
      <Text style={{ color: '#6b7280', fontSize: 14, marginBottom: 24, textAlign: 'center', lineHeight: 20 }}>
        Check your connection and try again.
      </Text>
      <Pressable
        onPress={onRetry}
        accessibilityRole="button"
        accessibilityLabel="Retry loading top selling products"
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: pressed ? '#1a1a1a' : '#1f2937',
          paddingHorizontal: 24,
          paddingVertical: 12,
          borderRadius: 12,
        })}
      >
        <RefreshCw size={14} color="#ffffff" strokeWidth={2.25} />
        <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: 14, marginLeft: 8 }}>Try Again</Text>
      </Pressable>
    </View>
  );
}
