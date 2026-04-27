import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  Dimensions,
  ScrollView,
} from 'react-native';
import { Package, RefreshCw, ChevronRight } from 'lucide-react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { categoryService, Category } from '@/services/categoryService';

const HOMEPAGE_LIMIT = 6;
const H_PADDING = 16;
const GAP = 14;

// Carousel sizing: ~2.4 cards visible so next one peeks, hinting at scroll.
const screenWidth = Dimensions.get('window').width;
const CARD_WIDTH = Math.max(148, Math.round((screenWidth - H_PADDING * 2) / 2.4));
const SNAP_INTERVAL = CARD_WIDTH + GAP;

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
      const list = (res.success && res.data ? res.data : []).slice(0, HOMEPAGE_LIMIT);
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
    <View style={{ backgroundColor: '#ffffff', paddingTop: 32, paddingBottom: 40 }}>
      <SectionHeader />

      {state === 'loading' ? (
        <Carousel>
          {Array.from({ length: HOMEPAGE_LIMIT }).map((_, i) => (
            <CategoryCardSkeleton key={i} />
          ))}
        </Carousel>
      ) : state === 'error' ? (
        <View style={{ paddingHorizontal: H_PADDING }}>
          <ErrorState onRetry={() => fetchCategories()} />
        </View>
      ) : (
        <Carousel>
          {categories.map((c) => (
            <CategoryCard key={c.id} category={c} />
          ))}
        </Carousel>
      )}
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
          Shop by Category
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
          Explore our carefully curated collection
        </Text>
      </View>
      <Pressable
        onPress={() => router.push('/(tabs)/categories' as any)}
        accessibilityRole="button"
        accessibilityLabel="View all categories"
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

function Carousel({ children }: { children: React.ReactNode }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      decelerationRate="fast"
      snapToInterval={SNAP_INTERVAL}
      snapToAlignment="start"
      contentContainerStyle={{
        paddingHorizontal: H_PADDING,
        gap: GAP,
      }}
    >
      {children}
    </ScrollView>
  );
}

function CategoryCard({ category }: { category: Category }) {
  return (
    <Pressable
      onPress={() => router.push(`/(tabs)/categories/${category.slug}` as any)}
      accessibilityRole="button"
      accessibilityLabel={`View ${category.name} category`}
      android_ripple={{ color: 'rgba(15,23,42,0.06)' }}
      style={({ pressed }) => ({
        width: CARD_WIDTH,
        opacity: pressed ? 0.9 : 1,
        transform: [{ scale: pressed ? 0.98 : 1 }],
      })}
    >
      <View
        style={{
          width: CARD_WIDTH,
          height: CARD_WIDTH,
          borderRadius: 14,
          overflow: 'hidden',
          backgroundColor: '#f3f4f6',
          marginBottom: 10,
          shadowColor: '#0f172a',
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
          elevation: 2,
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
            style={{
              width: '100%',
              height: '100%',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Package size={40} color="#9ca3af" strokeWidth={1.5} />
          </LinearGradient>
        )}
      </View>

      <Text
        style={{
          color: '#374151',
          fontSize: 15,
          fontWeight: '600',
          textAlign: 'center',
          lineHeight: 20,
        }}
        numberOfLines={2}
      >
        {category.name}
      </Text>
    </Pressable>
  );
}

function CategoryCardSkeleton() {
  return (
    <View style={{ width: CARD_WIDTH }}>
      <View
        className="bg-slate-200"
        style={{
          width: CARD_WIDTH,
          height: CARD_WIDTH,
          borderRadius: 14,
          marginBottom: 10,
        }}
      />
      <View
        className="bg-slate-200 self-center"
        style={{ height: 12, width: '60%', borderRadius: 4 }}
      />
    </View>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <View style={{ paddingVertical: 32, alignItems: 'center' }}>
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
        <Package size={24} color="#dc2626" strokeWidth={1.75} />
      </View>
      <Text
        style={{
          fontSize: 15,
          fontWeight: '600',
          color: '#111827',
          marginBottom: 4,
        }}
      >
        {"Couldn't load categories"}
      </Text>
      <Text
        style={{
          fontSize: 13,
          color: '#6b7280',
          marginBottom: 16,
          textAlign: 'center',
        }}
      >
        Check your connection and try again.
      </Text>
      <Pressable
        onPress={onRetry}
        accessibilityRole="button"
        accessibilityLabel="Retry loading categories"
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: pressed ? '#1f2937' : '#374151',
          paddingHorizontal: 20,
          paddingVertical: 10,
          borderRadius: 10,
          minHeight: 40,
        })}
      >
        <RefreshCw size={14} color="#ffffff" strokeWidth={2.25} />
        <Text className="text-white font-semibold text-sm ml-2">Try Again</Text>
      </Pressable>
    </View>
  );
}
