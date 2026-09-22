import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Sparkles } from 'lucide-react-native';
import { router } from 'expo-router';
import { categoryService } from '@/services/categoryService';
import { Fonts } from '@/constants/theme';
import DiscoverSheet from '@/components/WebSite/Header/DiscoverSheet';

/**
 * The category ribbon under the header — the mobile counterpart of
 * frontend/src/components/WebSite/Header/CategoryRibbon/CategoryRibbon.tsx at
 * its own mobile breakpoint.
 *
 * A recessed groove rail carrying "✦ EXPLORE", a hairline, then the categories
 * as uppercase chips. This used to be a row of circular photo tiles with a
 * leading "All" shortcut — a different shape, and a different offer: "All"
 * linked to the categories list, where the web's first item opens the discovery
 * menu instead.
 *
 * Nothing renders until at least one active category exists — the same
 * fail-quiet rule the web follows.
 */

/* The ribbon's own tokens, straight from the web component. */
const INK = '#1a1416'; // warm near-black — resting label
const RED = '#e01a1b'; // accent
const GROOVE = '#f3efed'; // the recessed rail the labels ride in

const MAX_CATEGORIES = 12;

interface StripCategory {
  id: string;
  name: string;
  slug: string;
  image?: string;
}

export default function CategoryStrip() {
  const [categories, setCategories] = useState<StripCategory[]>([]);
  const [discoverOpen, setDiscoverOpen] = useState(false);

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
      <View style={s.rail}>
        <Pressable
          onPress={() => setDiscoverOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Explore — browse the marketplace"
          hitSlop={6}
          style={s.explore}
        >
          {/* The web sets a literal ✦ glyph here; a drawn sparkle renders the
              same at any font and cannot fall back to tofu. */}
          <Sparkles size={12} color={RED} strokeWidth={2.4} />
          <Text style={s.exploreText}>Explore</Text>
        </Pressable>

        <View style={s.divider} />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.track}
        >
          {categories.map((cat) => (
            <Pressable
              key={cat.id}
              onPress={() => router.push(`/(tabs)/categories/${cat.slug}` as any)}
              accessibilityRole="button"
              accessibilityLabel={cat.name}
              android_ripple={{ color: 'rgba(26,20,22,0.06)' }}
              style={s.chip}
            >
              <Text style={s.chipText} numberOfLines={1}>
                {cat.name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <DiscoverSheet visible={discoverOpen} onClose={() => setDiscoverOpen(false)} />
    </View>
  );
}

const s = StyleSheet.create({
  /* `h-[58px] items-center px-3` */
  wrap: { height: 58, justifyContent: 'center', paddingHorizontal: 12 },

  /* `h-[42px] w-full items-center gap-2.5 rounded-2xl pl-3 pr-1.5` over the
     groove, with the web's inset hairline standing in for its inset shadow —
     React Native has no inset box-shadow. */
  rail: {
    height: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 16,
    paddingLeft: 12,
    paddingRight: 6,
    backgroundColor: GROOVE,
    borderWidth: 1,
    borderColor: 'rgba(26,20,22,0.05)',
  },

  explore: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 0 },
  /* `text-[11px] font-bold uppercase tracking-[0.2em]` */
  exploreText: {
    fontFamily: Fonts.sansBold,
    fontSize: 11,
    // Outfit is static: the weight must name the loaded file (Outfit_700Bold).
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 2.2,
    color: INK,
  },

  /* `h-5 w-px` */
  divider: { width: 1, height: 20, backgroundColor: 'rgba(26,20,22,0.18)', flexShrink: 0 },

  track: { alignItems: 'center', gap: 4, paddingRight: 6 },
  /* `rounded-[10px] px-3.5 py-1.5` */
  chip: { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 6, overflow: 'hidden' },
  /* `text-[12px] font-semibold uppercase tracking-[0.08em]` */
  chipText: {
    fontFamily: Fonts.sansSemibold,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.96,
    color: INK,
  },
});
