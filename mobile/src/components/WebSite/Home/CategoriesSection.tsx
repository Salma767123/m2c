import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, Dimensions } from 'react-native';
import { Package, RefreshCw } from 'lucide-react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { categoryService, Category } from '@/services/categoryService';
import SectionHeading, { SectionCta } from './SectionHeading';
import { Fonts } from '@/constants/theme';
import { Reveal } from '@/components/WebSite/Shared/Reveal';
import { CARD_GUTTER } from '@/components/WebSite/ProductCard/metrics';

/* Six, the web's CATEGORY_COUNT — a 2×3 grid rather than 2×2. Mobile showed
   four, so two of the admin's categories never appeared on the home page. */
const GRID_LIMIT = 6;
const SCREEN_W = Dimensions.get('window').width;
const TILE_GAP = 12;           // gap between tiles

// Entrance timings, taken from frontend Category/Category.tsx.
const TILE_MS = 700;
const TILE_STAGGER_MS = 80;

/* `bg-white py-8` — a full-bleed white section, not a floating card.
   Mobile had this as a rounded panel with a 12pt margin (and before that, an
   ink-filled one). The web runs it edge to edge in plain white, which is what
   sets it apart from the blush Best Seller band above it and the linen
   Featured band — each product section is told apart by its ground.

   Inset is CARD_GUTTER, the same 26 every other grid on this page uses, so the
   tiles line up with the product cards above and below them. */
const SECTION_BG = '#ffffff';

const TILE_W = Math.floor((SCREEN_W - CARD_GUTTER * 2 - TILE_GAP) / 2);

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
        backgroundColor: SECTION_BG,
        paddingVertical: 24, // py-8
        paddingHorizontal: CARD_GUTTER,
      }}
    >
      <SectionHeading section="categories" />

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
          {categories.map((c, i) => (
            <Reveal
              key={c.id}
              distance={22}
              duration={TILE_MS}
              delay={i * TILE_STAGGER_MS}
              style={{ width: TILE_W }}
            >
              <CategoryTile category={c} />
            </Reveal>
          ))}
        </Grid>
      )}

      {/* Below the grid, as on the web. */}
      <SectionCta
        section="categories"
        onPress={() => router.push('/(tabs)/categories' as any)}
      />
    </View>
  );
}

// ─── 2-column grid ──────────────────────────────────────────────────────────
function Grid({ children }: { children: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: TILE_GAP }}>
      {children}
    </View>
  );
}

// ─── Category Tile (white card · image · name · meta) ───────────────────────
/**
 * A category tile.
 *
 * The web sets the name INSIDE the image over a foot gradient, not underneath
 * it on a white card — so the photo is the tile and the label rides on it. The
 * gradient stops are the web's own, with its reasoning attached: "Heavy enough
 * at the foot to carry white type over a white spec sheet, light enough at the
 * top to leave the photo alone."
 */
function CategoryTile({ category }: { category: Category }) {
  const count = category.productCount;
  const meta =
    typeof count === 'number' && count > 0
      ? `${count} ${count === 1 ? 'item' : 'items'}`
      : null;

  return (
    <Pressable
      onPress={() => router.push(`/(tabs)/categories/${category.slug}` as any)}
      accessibilityRole="button"
      accessibilityLabel={`View ${category.name} category`}
      android_ripple={{ color: 'rgba(15,23,42,0.06)' }}
      style={{ width: TILE_W }}
    >
      <View
        style={{
          borderRadius: 18,
          overflow: 'hidden',
          backgroundColor: '#f3f4f6',
          borderWidth: 1,
          borderColor: '#e8ded2',
          shadowColor: '#4a3226',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.5,
          shadowRadius: 13,
          elevation: 3,
        }}
      >
        {/* aspect-[4/5] — portrait, where mobile had a square. */}
        <View style={{ width: '100%', aspectRatio: 0.8, position: 'relative' }}>
          {category.image ? (
            <Image
              source={{ uri: category.image }}
              style={{ width: '100%', height: '100%' }}
              contentFit="cover"
              transition={250}
              accessibilityIgnoresInvertColors
            />
          ) : (
            <View
              style={{
                width: '100%',
                height: '100%',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#f3f4f6',
              }}
            >
              <Package size={48} color="#9ca3af" strokeWidth={1.5} />
            </View>
          )}

          {/* Foot gradient. expo-linear-gradient takes stops bottom-up here, so
              the opaque end is first and `locations` mirror the web's stops. */}
          <LinearGradient
            colors={[
              'rgba(18,10,8,0.88)',
              'rgba(18,10,8,0.58)',
              'rgba(18,10,8,0.14)',
              'rgba(18,10,8,0)',
            ]}
            locations={[0, 0.26, 0.54, 0.76]}
            start={{ x: 0.5, y: 1 }}
            end={{ x: 0.5, y: 0 }}
            style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
            pointerEvents="none"
          />

          <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: 12 }}>
            <Text
              style={{
                fontFamily: Fonts.heading,
                fontSize: 14,
                fontWeight: '600',
                lineHeight: 19.3, // leading-snug
                letterSpacing: -0.35, // tracking-tight
                color: '#ffffff',
              }}
              numberOfLines={2}
            >
              {category.name}
            </Text>
            {meta ? (
              <Text
                style={{
                  fontFamily: Fonts.sans,
                  fontSize: 11,
                  color: 'rgba(255,255,255,0.75)',
                  marginTop: 2,
                }}
                numberOfLines={1}
              >
                {meta}
              </Text>
            ) : null}
            {/* The brand hairline the web draws under the label. */}
            <View style={{ height: 1, width: '100%', backgroundColor: '#e01a1b', marginTop: 8 }} />
          </View>
        </View>
      </View>
    </Pressable>
  );
}

// ─── Skeleton ───────────────────────────────────────────────────────────────
function TileSkeleton() {
  // Mirrors the loaded tile: same radius and the same 4/5 frame, so the grid
  // does not change shape the moment the fetch resolves.
  return (
    <View
      className="bg-slate-200"
      style={{ width: TILE_W, aspectRatio: 0.8, borderRadius: 18 }}
    />
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
          backgroundColor: '#E01A1B',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 10,
        }}
      >
        {/* White on the red disc. This was #E01A1B on #E01A1B — a red glyph on
            a red circle, i.e. an empty red dot whenever categories failed. */}
        <Package size={22} color="#ffffff" strokeWidth={1.75} />
      </View>
      {/* Dark type: this panel is white now, and the old white/#cbd5e1 pair was
          left over from when it was ink-filled — it would be invisible here. */}
      <Text
        style={{
          fontFamily: Fonts.heading,
          fontSize: 14,
          fontWeight: '600',
          color: '#1a1a1a',
          marginBottom: 2,
        }}
      >
        {"Couldn't load categories"}
      </Text>
      <Text
        style={{
          fontFamily: Fonts.sans,
          fontSize: 12,
          color: '#5f5550',
          marginBottom: 14,
          textAlign: 'center',
        }}
      >
        Check your connection and try again.
      </Text>
      <Pressable onPress={onRetry} accessibilityRole="button" accessibilityLabel="Retry loading categories">
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#fbf4ec',
            borderWidth: 1,
            borderColor: '#e2d1bd',
            paddingHorizontal: 18,
            minHeight: 40,
            borderRadius: 10,
            gap: 6,
          }}
        >
          <RefreshCw size={14} color="#7a0f10" strokeWidth={2.25} />
          <Text style={{ fontFamily: Fonts.sansSemibold, color: '#7a0f10', fontWeight: '600', fontSize: 13 }}>
            Try Again
          </Text>
        </View>
      </Pressable>
    </View>
  );
}
