import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, Dimensions } from 'react-native';
import { Package, RefreshCw, ArrowRight } from 'lucide-react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { categoryService, Category } from '@/services/categoryService';

// 2×2 grid → show 4 categories
const GRID_LIMIT = 4;
const SCREEN_W = Dimensions.get('window').width;
const CARD_MARGIN = 12;        // section card horizontal margin
const CARD_PADDING = 14;       // inner padding of the tinted card
const TILE_GAP = 12;           // gap between the 4 tiles

// Section card — uses the project brand color (#111827) so it's on-brand
const SECTION_BG = '#111827';  // brand dark slate

const cardInnerW = SCREEN_W - CARD_MARGIN * 2 - CARD_PADDING * 2;
const TILE_W = Math.floor((cardInnerW - TILE_GAP) / 2);

type LoadState = 'loading' | 'ready' | 'empty' | 'error';

export default function CategoriesSection() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [state, setState] = useState<LoadState>('loading');

  const fetchCategories = useCallback(async (signal?: AbortSignal) => {
    setState('loading');
    try {
      const res = await categoryService.getAllCategories({
        status: 'ACTIVE',
        showRootOnly: 'true',
        sortBy: 'sortOrder',
        sortOrder: 'asc',
      });
      if (signal?.aborted) return;
      const list = (res.success && res.data ? res.data : []).slice(0, GRID_LIMIT);
      setCategories(list);
      setState(list.length === 0 ? 'empty' : 'ready');
    } catch (err) {
      if (signal?.aborted) return;
      console.error('Failed to fetch categories:', err);
      setState('error');
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchCategories(controller.signal);
    return () => controller.abort();
  }, [fetchCategories]);

  if (state === 'empty') return null;

  return (
    <View
      style={{
        marginTop: 10,
        marginHorizontal: CARD_MARGIN,
        backgroundColor: SECTION_BG,
        borderRadius: 24,
        padding: CARD_PADDING,
      }}
    >
      {/* Header — title + arrow pill */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 4,
          marginBottom: 14,
        }}
      >
        <Text style={{ flex: 1, color: '#ffffff', fontSize: 20, fontWeight: '800', letterSpacing: -0.3 }}>
          Shop by Category
        </Text>
        <Pressable
          onPress={() => router.push('/(tabs)/categories' as any)}
          accessibilityRole="button"
          accessibilityLabel="View all categories"
          hitSlop={6}
        >
          <View
            style={{
              width: 56,
              height: 38,
              borderRadius: 19,
              backgroundColor: '#ffffff',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ArrowRight size={20} color="#111827" strokeWidth={2.5} />
          </View>
        </Pressable>
      </View>

      {/* Body */}
      {state === 'loading' ? (
        <Grid>
          {Array.from({ length: GRID_LIMIT }).map((_, i) => (
            <TileSkeleton key={i} />
          ))}
        </Grid>
      ) : state === 'error' ? (
        <ErrorState onRetry={() => fetchCategories()} />
      ) : (
        <Grid>
          {categories.map((c) => (
            <CategoryTile key={c.id} category={c} />
          ))}
        </Grid>
      )}
    </View>
  );
}

// ─── 2×2 Grid ───────────────────────────────────────────────────────────────
function Grid({ children }: { children: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: TILE_GAP }}>
      {children}
    </View>
  );
}

// ─── Category Tile (white card · image · name · meta) ───────────────────────
function CategoryTile({ category }: { category: Category }) {
  const subCount = (category as any).subcategoryCount as number | undefined;
  const meta = subCount && subCount > 0 ? `${subCount} subcategories` : 'Explore collection';

  return (
    <Pressable
      onPress={() => router.push(`/(tabs)/categories/${category.slug}` as any)}
      accessibilityRole="button"
      accessibilityLabel={`View ${category.name} category`}
      android_ripple={{ color: 'rgba(15,23,42,0.06)' }}
      style={{ width: TILE_W }}
    >
      <View style={{ backgroundColor: '#ffffff', borderRadius: 16, padding: 8 }}>
        {/* Image */}
        <View
          style={{
            width: '100%',
            aspectRatio: 1,
            borderRadius: 12,
            overflow: 'hidden',
            backgroundColor: '#f3f4f6',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {category.image ? (
            <Image
              source={{ uri: category.image }}
              style={{ width: '100%', height: '100%' }}
              contentFit="cover"
              transition={250}
              accessibilityIgnoresInvertColors
            />
          ) : (
            <LinearGradient
              colors={['#f3f4f6', '#e5e7eb']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}
            >
              <Package size={36} color="#9ca3af" strokeWidth={1.5} />
            </LinearGradient>
          )}
        </View>

        {/* Name + meta */}
        <Text
          style={{ color: '#1f2937', fontSize: 14, fontWeight: '700', marginTop: 8 }}
          numberOfLines={1}
        >
          {category.name}
        </Text>
        <Text style={{ color: '#475569', fontSize: 12, fontWeight: '600', marginTop: 2 }} numberOfLines={1}>
          {meta}
        </Text>
      </View>
    </Pressable>
  );
}

// ─── Skeleton ───────────────────────────────────────────────────────────────
function TileSkeleton() {
  return (
    <View style={{ width: TILE_W, backgroundColor: '#ffffff', borderRadius: 16, padding: 8 }}>
      <View
        className="bg-slate-200"
        style={{ width: '100%', aspectRatio: 1, borderRadius: 12 }}
      />
      <View className="bg-slate-200" style={{ height: 12, width: '75%', borderRadius: 4, marginTop: 10 }} />
      <View className="bg-slate-200" style={{ height: 10, width: '50%', borderRadius: 4, marginTop: 6 }} />
    </View>
  );
}

// ─── Error ──────────────────────────────────────────────────────────────────
function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <View style={{ paddingVertical: 28, alignItems: 'center' }}>
      <View
        style={{
          width: 52,
          height: 52,
          borderRadius: 26,
          backgroundColor: '#fef2f2',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 10,
        }}
      >
        <Package size={22} color="#dc2626" strokeWidth={1.75} />
      </View>
      <Text style={{ fontSize: 14, fontWeight: '700', color: '#ffffff', marginBottom: 2 }}>
        {"Couldn't load categories"}
      </Text>
      <Text style={{ fontSize: 12, color: '#cbd5e1', marginBottom: 14, textAlign: 'center' }}>
        Check your connection and try again.
      </Text>
      <Pressable onPress={onRetry} accessibilityRole="button" accessibilityLabel="Retry loading categories">
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#ffffff',
            paddingHorizontal: 18,
            minHeight: 40,
            borderRadius: 10,
            gap: 6,
          }}
        >
          <RefreshCw size={14} color="#111827" strokeWidth={2.25} />
          <Text style={{ color: '#111827', fontWeight: '700', fontSize: 13 }}>Try Again</Text>
        </View>
      </Pressable>
    </View>
  );
}
