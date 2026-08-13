import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Package, LayoutGrid } from 'lucide-react-native';
import { router } from 'expo-router';
import { categoryService } from '@/services/categoryService';
import { Palette, Radius } from '@/constants/theme';

/**
 * Quick-category rail that sits between the header and the hero — the mobile
 * counterpart of frontend/src/components/WebSite/CategoryStrip/CategoryStrip.tsx.
 *
 * Circular brand-tinted tiles, a leading "All" shortcut, and nothing at all until
 * at least one active category exists (same fail-quiet rule as the web).
 */

const TILE = 56;
const ITEM_W = 68;
const MAX_CATEGORIES = 12;

interface StripCategory {
  id: string;
  name: string;
  slug: string;
  image?: string;
}

export default function CategoryStrip() {
  const [categories, setCategories] = useState<StripCategory[]>([]);

  useEffect(() => {
    let cancelled = false;
    categoryService
      .getAllCategories({
        status: 'ACTIVE',
        showRootOnly: 'true',
        sortBy: 'sortOrder',
        sortOrder: 'asc',
      })
      .then((res) => {
        if (cancelled) return;
        setCategories((res.success && res.data ? res.data : []).slice(0, MAX_CATEGORIES));
      })
      .catch(() => {
        if (!cancelled) setCategories([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (categories.length === 0) return null;

  return (
    <View style={s.wrap} accessibilityRole="menubar" accessibilityLabel="Browse categories">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.track}
      >
        {/* Leading "All" shortcut */}
        <Pressable
          onPress={() => router.push('/(tabs)/categories' as any)}
          accessibilityRole="button"
          accessibilityLabel="All categories"
          style={s.item}
        >
          <View style={[s.tile, s.tileAll]}>
            <LayoutGrid size={21} color={Palette.primary} />
          </View>
          <Text style={[s.label, s.labelAll]} numberOfLines={1}>
            All
          </Text>
        </Pressable>

        {categories.map((cat) => (
          <Pressable
            key={cat.id}
            onPress={() => router.push(`/(tabs)/categories/${cat.slug}` as any)}
            accessibilityRole="button"
            accessibilityLabel={cat.name}
            style={s.item}
          >
            <View style={s.tile}>
              {cat.image ? (
                <Image source={{ uri: cat.image }} style={s.tileImage} contentFit="cover" transition={150} />
              ) : (
                <Package size={22} color={Palette.primary} />
              )}
            </View>
            <Text style={s.label} numberOfLines={2}>
              {cat.name}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    backgroundColor: Palette.surface,
    borderBottomWidth: 1,
    borderBottomColor: Palette.outlineSubtle,
    paddingVertical: 10,
  },
  track: { paddingHorizontal: 12, gap: 14 },
  item: { width: ITEM_W, alignItems: 'center' },
  tile: {
    width: TILE,
    height: TILE,
    borderRadius: Radius.full,
    backgroundColor: Palette.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  // The "All" tile is outlined rather than filled, so it reads as a shortcut
  // rather than another category.
  tileAll: {
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.brandBorder,
    borderStyle: 'dashed',
  },
  tileImage: { width: '100%', height: '100%' },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: Palette.text,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 14,
  },
  labelAll: { color: Palette.primary, fontWeight: '700' },
});
