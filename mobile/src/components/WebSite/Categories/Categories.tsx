import React, { useState, useEffect, useCallback, memo } from 'react';
import {
  View,
  Text,
  Pressable,
  FlatList,
  RefreshControl,
  StyleSheet,
  useWindowDimensions,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import {
  Package,
  ShoppingCart,
  AlertCircle,
  RefreshCw,
  Search,
  MessageCircle,
  LayoutGrid,
  Headphones,
  ArrowRight,
} from 'lucide-react-native';
import ScreenHeader from '@/components/WebSite/Shared/ScreenHeader';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { categoryService, type Category } from '@/services/categoryService';
import { useCart } from '@/context/CartContext';
import { Palette, Fonts } from '@/constants/theme';
import SectionHeading from '@/components/WebSite/Home/SectionHeading';
import { CARD_GUTTER, CARD_GAP } from '@/components/WebSite/ProductCard/metrics';
import TopSellingSection from '@/components/WebSite/Home/TopSellingSection';
import NoticeBoard from '@/components/WebSite/Home/NoticeBoard';

const BANNER = require('../../../../assets/images/categories/cb5.jpg');
const HELP_BG = require('../../../../assets/images/banner/help-support-bg.jpg');

/* One inset for the whole app: CARD_GUTTER, which is the web's own `px-4`
   for these grids. A page that changes inset as you navigate to it reads as a
   different app, not a different screen. */
const GRID_PAD = CARD_GUTTER;
const GRID_GAP = CARD_GAP;
/* The hero opens edge to edge and lands as a card on the grid's own rails —
   `--cat-open` / `--cat-rest` on the web, scaled to a phone. The ratio between
   them is the gesture: cut the resting height alone and the collapse reads as
   out of all proportion to where it lands. */
const BANNER_OPEN_H = 300;
const BANNER_REST_H = 208;
/** The web's `--lift`: the gap clipped in above the landed card. */
const BANNER_LIFT = 16;
const BANNER_RADIUS = 16;
/* 2600ms with the hold running to 42% of it, then a symmetric ease for the
   close, so the frame leaves slowly, travels, and arrives slowly. */
const HERO_HOLD = 1090;
const HERO_CLOSE = 1510;

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Categories() {
  const { itemCount } = useCart();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cardWidth = (width - GRID_PAD * 2 - GRID_GAP) / 2;

  const fetchCategories = useCallback(async () => {
    try {
      setError(null);
      const res = await categoryService.getAllCategories({
        status: 'ACTIVE',
        showRootOnly: 'true',
        includeSubcategories: 'true',
        sortBy: 'sortOrder',
        sortOrder: 'asc',
      });
      if (res.success && res.data) {
        setCategories(res.data);
      } else {
        setError('Failed to load categories');
      }
    } catch {
      setError('Failed to load categories');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchCategories();
  }, [fetchCategories]);

  const renderItem = useCallback(
    ({ item }: { item: Category }) => (
      <CategoryCard category={item} cardWidth={cardWidth} />
    ),
    [cardWidth],
  );

  const keyExtractor = useCallback((item: Category) => item.id, []);

  // Mirrors the web page's running order: banner → intro → grid → top-selling
  // rail → promos → "Need Help?". Everything lives in the FlatList's header and
  // footer so the whole page scrolls as one and the grid keeps its virtualisation.
  const ListHeader = (
    <>
      <CategoryBanner />
      <View style={s.introWrap}>
        {/* Eyebrow + "Browse Our Collections" + blurb, the same three lines the
            web sets here. The count pill that used to sit under them is gone —
            the web has no such chip, and the page already opens on a banner
            that says what this screen is. */}
        <SectionHeading section="browseCollections" />
      </View>
    </>
  );

  const ListFooter = (
    <View style={s.footerWrap}>
      <TopSellingSection />
      <NoticeBoard />
      <NeedHelpCard />
    </View>
  );

  return (
    <View style={s.screen}>
      <CategoriesHeader itemCount={itemCount} />

      {loading ? (
        <View style={s.skeletonWrap}>
          <View style={s.skeletonRow}>
            <SkeletonCard width={cardWidth} />
            <SkeletonCard width={cardWidth} />
          </View>
          <View style={s.skeletonRow}>
            <SkeletonCard width={cardWidth} />
            <SkeletonCard width={cardWidth} />
          </View>
          <View style={s.skeletonRow}>
            <SkeletonCard width={cardWidth} />
            <SkeletonCard width={cardWidth} />
          </View>
        </View>
      ) : error ? (
        <CenteredState
          icon={<AlertCircle size={32} color="#E01A1B" strokeWidth={1.75} />}
          iconBg="#E01A1B"
          title="Something went wrong"
          body={error}
          action={
            <ActionButton
              label="Try Again"
              icon={<RefreshCw size={15} color="#fff" />}
              onPress={fetchCategories}
            />
          }
        />
      ) : categories.length === 0 ? (
        <CenteredState
          icon={<Package size={32} color="#6b7280" strokeWidth={1.75} />}
          iconBg="#f3f4f6"
          title="No Categories Yet"
          body="Categories will appear here once they are added."
        />
      ) : (
        <FlatList
          data={categories}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          numColumns={2}
          columnWrapperStyle={s.columnWrapper}
          /*
            The tabs Stack reserves a FIXED 72pt for the nav bar
            (`contentStyle` in app/(tabs)/_layout.tsx), but the bar is 72 plus
            the device's bottom inset — so on any phone with a gesture bar it
            is taller than the space reserved for it, and the last thing on the
            page ends up underneath it.

            72 was generous enough to hide that. Trimming the page's own bottom
            padding to 8 stopped hiding it, and the Need Help card went under
            the bar. Measured here instead of guessed.
          */
          contentContainerStyle={[s.flatListContent, { paddingBottom: insets.bottom + 24 }]}
          ListHeaderComponent={ListHeader}
          ListFooterComponent={ListFooter}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#111827"
              colors={['#111827']}
            />
          }
        />
      )}
    </View>
  );
}

// ─── Header ───────────────────────────────────────────────────────────────────
function CategoriesHeader({ itemCount }: { itemCount: number }) {
  return (
    <ScreenHeader
      icon={LayoutGrid}
      title="Categories"
      subtitle="Browse everything we carry"
      right={
        <>
          <Pressable
            onPress={() => router.push('/(any)/products' as any)}
            accessibilityRole="button"
            accessibilityLabel="Search products"
            accessibilityHint="Opens product search"
            hitSlop={6}
          >
            <View style={s.headerBtnCircle}>
              <Search size={18} color="#111827" strokeWidth={2} />
            </View>
          </Pressable>
          <Pressable
            onPress={() => router.push('/(tabs)/cart' as any)}
            accessibilityRole="button"
            accessibilityLabel={`Cart, ${itemCount} items`}
            accessibilityHint="Opens your shopping cart"
            hitSlop={6}
          >
            <View style={s.headerBtnCircle}>
              <ShoppingCart size={18} color="#111827" strokeWidth={2} />
              {itemCount > 0 ? (
                <View style={s.headerBadge}>
                  <Text style={s.headerBadgeText}>{itemCount > 99 ? '99+' : itemCount}</Text>
                </View>
              ) : null}
            </View>
          </Pressable>
        </>
      }
    />
  );
}
/**
 * The banner that opens edge to edge and lands as a card.
 *
 * This was the page's own hand-rolled version — a flat `bg-black/60` over the
 * photograph, an eyebrow ruled on one side only, no seam, no animation, and
 * three Texts with no `fontFamily` at all, so the title rendered in Roboto
 * while every heading around it rendered in Poppins. The web replaced exactly
 * that version with a shared CategoryHero; this is its composition.
 *
 * Two things animate. The height, which has to — the whole point is that the
 * content below MOVES UP, and no transform can do that. And the inset: it
 * opens full-bleed and lands flush with the grid's own rails, so the card's
 * sides finish level with the first and last category card beneath it.
 *
 * The scrim is two layers, not the web's three. React Native has no
 * radial-gradient, so the web's centre pool and its edge gradient are folded
 * into one vertical ramp with stops — darkest at the very top and bottom,
 * lightest in the band either side of the copy. The brand tint stays its own
 * layer because it fades to its own colour at zero alpha; collapsing it into
 * the black ramp would drag red through black and lay a muddy wash over the
 * photograph, which is the failure the web's note describes.
 */
function CategoryBanner() {
  const t = useSharedValue(0);

  useEffect(() => {
    t.value = withDelay(
      HERO_HOLD,
      withTiming(1, { duration: HERO_CLOSE, easing: Easing.bezier(0.62, 0.02, 0.3, 1) }),
    );
  }, [t]);

  const frameStyle = useAnimatedStyle(() => ({
    height: BANNER_OPEN_H + (BANNER_REST_H - BANNER_OPEN_H) * t.value,
    marginHorizontal: -GRID_PAD * (1 - t.value),
    marginTop: BANNER_LIFT * t.value,
    borderRadius: BANNER_RADIUS * t.value,
  }));

  /* The words rise into a frame that is still closing, not after it has
     stopped — which is what makes the two read as one gesture. */
  const copyStyle = useAnimatedStyle(() => {
    const p = Math.min(1, Math.max(0, (t.value - 0.05) / 0.55));
    const eased = 1 - Math.pow(1 - p, 3);
    return { opacity: eased, transform: [{ translateY: 16 * (1 - eased) }] };
  });

  return (
    <Animated.View style={[s.banner, frameStyle]}>
      <Image source={BANNER} style={s.bannerImage} contentFit="cover" transition={220} />

      {/* 1. Black, at the edges and pooled under the copy. A flat 0.6 wash meant
             no part of the photograph was ever less than 60% black. */}
      <LinearGradient
        colors={[
          'rgba(0,0,0,0.48)',
          'rgba(0,0,0,0.20)',
          'rgba(0,0,0,0.52)',
          'rgba(0,0,0,0.22)',
          'rgba(0,0,0,0.55)',
        ]}
        locations={[0, 0.22, 0.5, 0.78, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      {/* 2. Brand tint from the top, fading to its own colour at zero alpha. */}
      <LinearGradient
        colors={['rgba(224,26,27,0.16)', 'rgba(224,26,27,0)']}
        locations={[0, 0.58]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {/* Pinned to a layer of CONSTANT height rather than centred against the
          animating box, so the copy's position is solved once instead of being
          recomputed from a height changing in fractions of a point. */}
      <View style={s.bannerCopyLayer} pointerEvents="none">
        <Animated.View style={[s.bannerContent, copyStyle]}>
          {/* Ruled on BOTH sides. One rule reads as the start of something; a
              pair reads as a caption, which is what this is. */}
          <View style={s.bannerEyebrowRow}>
            <View style={s.bannerRule} />
            <Text style={s.bannerEyebrow} maxFontSizeMultiplier={1.2}>
              Our Collections
            </Text>
            <View style={s.bannerRule} />
          </View>

          <Text style={s.bannerTitle} maxFontSizeMultiplier={1.2}>
            Shop by Categories
          </Text>

          {/* The short seam under the name — the one piece of brand colour in
              the block, and what stops the three lines reading as one
              undifferentiated stack of centred text. */}
          <View style={s.bannerSeam} />

          <Text style={s.bannerSub} maxFontSizeMultiplier={1.2}>
            Discover our wide range of traditional textile products organized by categories
          </Text>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

// ─── Need Help ───────────────────────────────────────────────────────────────
/**
 * The web's split help desk: a deep branded band states the offer, and two
 * tappable rows make the choice.
 *
 * Mobile was still drawing the version the web replaced — a centred stack of
 * icon, headline, seam, paragraph and two full-width pill buttons. The web's
 * own note explains why it went: centred-stack-with-buttons is the shape every
 * other promo on the site already uses, so the support card had no shape of
 * its own.
 *
 * The web lays the two halves side by side from `md:` up and stacks them below
 * it. A phone is always below it, so they stack here — that is the web's own
 * mobile layout, not a reduction of it.
 */
function NeedHelpCard() {
  return (
    <View style={s.helpWrap}>
      <View style={s.helpCard}>
        {/* ── The band ── */}
        <View style={s.helpBand}>
          <Image source={HELP_BG} style={StyleSheet.absoluteFill} contentFit="cover" transition={220} />
          {/* Brand wash over the photograph so the copy stays legible. */}
          <LinearGradient
            colors={['rgba(224,26,27,0.90)', 'rgba(196,22,23,0.80)', 'rgba(122,15,16,0.95)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />

          <View style={s.helpChip}>
            <Headphones size={26} color="#ffffff" strokeWidth={1.7} />
          </View>

          <View style={s.helpEyebrowRow}>
            <View style={s.helpEyebrowRule} />
            <Text style={s.helpEyebrow}>We&apos;re here for you</Text>
          </View>

          <Text style={s.helpTitle}>Need Help?</Text>
          <Text style={s.helpBlurb}>
            Use our search feature or contact our support team for assistance
            finding specific products.
          </Text>
        </View>

        {/* ── The rows ── */}
        <View style={s.helpRows}>
          <HelpRow
            label="Search Products"
            hint="Find exactly what you need, fast."
            onPress={() => router.push('/(any)/products' as any)}
          >
            <LinearGradient
              colors={['#e01a1b', '#c41617']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={s.helpRowMarkFilled}
            >
              <Search size={20} color="#ffffff" strokeWidth={2} />
            </LinearGradient>
          </HelpRow>

          <HelpRow
            label="Contact Support"
            hint="Talk to our team — we reply quickly."
            onPress={() => router.push('/(any)/contact' as any)}
          >
            <View style={s.helpRowMarkPlain}>
              <MessageCircle size={20} color={Palette.primary} strokeWidth={2} />
            </View>
          </HelpRow>
        </View>
      </View>
    </View>
  );
}

/* TouchableOpacity with a plain array style, not a Pressable taking a style
   FUNCTION — when the function form fails to apply, a row loses its ground and
   its border and collapses into the card behind it. This file has hit that
   before. */
function HelpRow({
  label,
  hint,
  onPress,
  children,
}: {
  label: string;
  hint: string;
  onPress: () => void;
  children: React.ReactNode;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      activeOpacity={0.85}
      style={s.helpRow}
    >
      {children}
      <View style={s.helpRowText}>
        <Text style={s.helpRowLabel}>{label}</Text>
        <Text style={s.helpRowHint}>{hint}</Text>
      </View>
      <ArrowRight size={20} color={Palette.primary} strokeWidth={2} />
    </TouchableOpacity>
  );
}

// ─── Category Card (compact grid) ────────────────────────────────────────────
const CategoryCard = memo(function CategoryCard({
  category,
  cardWidth,
}: {
  category: Category;
  cardWidth: number;
}) {
  const count = category.subcategoryCount ?? 0;

  const handlePress = useCallback(() => {
    router.push(`/(tabs)/categories/${category.slug}` as any);
  }, [category.slug]);

  const meta = count > 0 ? `${count} subcategories` : 'Explore collection';

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`${category.name}, ${meta}`}
      accessibilityHint="Opens category details"
      android_ripple={{ color: 'rgba(15,23,42,0.06)' }}
      style={{ width: cardWidth }}
    >
      {/* The web's card is not a card: a rounded square image tile, then the
          name centred beneath it on the page ground. Mobile had boxed the whole
          thing — image and text inside one bordered white panel with the text
          left-aligned and an icon beside the count — which reads as a different
          component, not a smaller one. */}
      <View style={c.tile}>
        {category.image ? (
          <Image
            source={{ uri: category.image }}
            style={c.image}
            /* object-cover on the web. `contain` left the tile part-empty and
               the photo floating inside it. */
            contentFit="cover"
            transition={250}
          />
        ) : (
          /* `bg-gradient-to-br from-gray-100 to-gray-200` — the web gives the
             empty tile a ramp, so a category with no photograph still reads as
             a picture box rather than a flat grey square. */
          <LinearGradient
            colors={['#f3f4f6', '#e5e7eb']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={c.imagePlaceholder}
          >
            <Package size={40} color="#9ca3af" strokeWidth={1.5} />
          </LinearGradient>
        )}
      </View>

      <Text style={c.name} numberOfLines={2}>
        {category.name}
      </Text>
      {count > 0 ? (
        <Text style={c.metaText} numberOfLines={1}>
          {count} {count === 1 ? 'subcategory' : 'subcategories'}
        </Text>
      ) : null}
    </Pressable>
  );
});

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function SkeletonCard({ width: w }: { width: number }) {
  return (
    <View style={[sk.card, { width: w }]}>
      <View style={sk.image} />
      <View style={sk.info}>
        <View style={sk.line1} />
        <View style={sk.line2} />
      </View>
    </View>
  );
}

// ─── Centered state (error / empty) ──────────────────────────────────────────
function CenteredState({
  icon,
  iconBg,
  title,
  body,
  action,
}: {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <View style={s.centeredWrap}>
      <View style={[s.centeredIcon, { backgroundColor: iconBg }]}>{icon}</View>
      <Text style={s.centeredTitle}>{title}</Text>
      <Text style={[s.centeredBody, action ? { marginBottom: 20 } : undefined]}>{body}</Text>
      {action ?? null}
    </View>
  );
}

function ActionButton({
  label,
  icon,
  onPress,
}: {
  label: string;
  icon: React.ReactNode;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label}>
      <View style={s.actionBtn}>
        {icon}
        <Text style={s.actionBtnText}>{label}</Text>
      </View>
    </Pressable>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  /* `bg-gray-50` — #f9fafb. Was #f8fafc, Tailwind's slate-50, which is the
     same value shifted blue; on a page whose every other surface is warm it
     read as a cool cast behind them. */
  screen: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },

  // Header
  headerBtnCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBadge: {
    position: 'absolute',
    top: -3,
    right: -5,
    backgroundColor: Palette.primary,
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  headerBadgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '800',
    lineHeight: 11,
  },

  // List
  /* `paddingBottom` is applied at the call site, from the safe-area inset. */
  flatListContent: {
    paddingHorizontal: GRID_PAD,
  },
  columnWrapper: {
    gap: GRID_GAP,
    marginBottom: GRID_GAP,
  },
  /* The list's contentContainer is inset by GRID_PAD for the grid, so anything
     that should run edge to edge — the banner, and the rails in the footer —
     cancels it with a negative margin. */
  /* `marginHorizontal` and `height` are animated, so neither is set here —
     the resting values live in the worklet, and a static one would win on the
     first frame and make the hero jump before it moves. */
  banner: {
    overflow: 'hidden',
    backgroundColor: '#e8e2dc',
  },
  bannerImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  /* Constant height, pinned to the top: the copy's position is solved once
     rather than recomputed from a height changing every frame. During the
     opening beat it sits high in the frame, which costs nothing — it is still
     transparent until the frame has begun to close. */
  bannerCopyLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: BANNER_REST_H,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerContent: { paddingHorizontal: 24, alignItems: 'center' },
  bannerEyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  /* White, not brand red: on a photograph the red rule disappeared into the
     scrim. `bg-white/45`, and one on each side. */
  bannerRule: { height: 1, width: 26, backgroundColor: 'rgba(255,255,255,0.45)' },
  bannerEyebrow: {
    fontFamily: Fonts.sansSemibold,
    fontSize: 10.5,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
    textTransform: 'uppercase',
    // 0.3em at 10.5px.
    letterSpacing: 3.1,
  },
  bannerTitle: {
    fontFamily: Fonts.heading,
    // Poppins is static: the weight must name the loaded file, or Android
    // synthesises a fake bold over it.
    fontWeight: '600',
    fontSize: 30,
    lineHeight: 37,
    color: '#ffffff',
    letterSpacing: -0.7,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 14,
  },
  bannerSeam: {
    width: 48,
    height: 3,
    borderRadius: 999,
    backgroundColor: Palette.primary,
    marginTop: 16,
  },
  bannerSub: {
    fontFamily: Fonts.sans,
    fontSize: 13.5,
    lineHeight: 20,
    color: 'rgba(255,255,255,0.90)',
    textAlign: 'center',
    marginTop: 14,
    maxWidth: 320,
    textShadowColor: 'rgba(0,0,0,0.55)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },

  introWrap: { paddingTop: 20, paddingBottom: 6 },

  footerWrap: { marginHorizontal: -GRID_PAD, paddingTop: 8 },

  // Need Help
  helpWrap: { paddingHorizontal: 12, paddingTop: 18 },
  /* `rounded-[28px]` with the web's deep drop. The children are clipped to the
     curve, which is why the band can run to the card's own edge. */
  helpCard: {
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
    shadowColor: '#1a1416',
    shadowOffset: { width: 0, height: 30 },
    shadowOpacity: 0.35,
    shadowRadius: 30,
    elevation: 6,
  },
  helpBand: {
    paddingHorizontal: 26,
    paddingVertical: 32,
    overflow: 'hidden',
  },
  /* `h-14 w-14 rounded-2xl bg-white/15 ring-1 ring-white/30` */
  helpChip: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.30)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  helpEyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 24 },
  helpEyebrowRule: { height: 1, width: 20, backgroundColor: 'rgba(255,255,255,0.6)' },
  helpEyebrow: {
    fontFamily: Fonts.sansSemibold,
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.75)',
    textTransform: 'uppercase',
    // 0.22em at 11px.
    letterSpacing: 2.4,
  },
  helpTitle: {
    fontFamily: Fonts.heading,
    fontSize: 28,
    fontWeight: '600',
    lineHeight: 34,
    letterSpacing: -0.7,
    color: '#ffffff',
    marginTop: 8,
  },
  helpBlurb: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    lineHeight: 21,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 12,
    maxWidth: 320,
  },

  helpRows: { padding: 20, gap: 12 },
  /* `rounded-2xl border border-[#f0e6e0] bg-[#fdf8f6] p-4` */
  helpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#f0e6e0',
    backgroundColor: '#fdf8f6',
    padding: 16,
  },
  helpRowMarkFilled: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Palette.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 3,
  },
  helpRowMarkPlain: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#f0d5cf',
  },
  helpRowText: { flex: 1, minWidth: 0 },
  helpRowLabel: {
    fontFamily: Fonts.sansSemibold,
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  helpRowHint: {
    fontFamily: Fonts.sans,
    fontSize: 13,
    lineHeight: 18,
    color: '#6b7280',
    marginTop: 2,
  },

  // Centered states
  centeredWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  centeredIcon: {
    width: 72,
    height: 72,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  centeredTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  centeredBody: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.primary,
    paddingHorizontal: 24,
    height: 48,
    borderRadius: 14,
    gap: 8,
  },
  actionBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },

  // Skeleton
  skeletonWrap: {
    padding: GRID_PAD,
    gap: GRID_GAP,
  },
  skeletonRow: {
    flexDirection: 'row',
    gap: GRID_GAP,
  },
});

// ─── Card styles ──────────────────────────────────────────────────────────────
const c = StyleSheet.create({
  /* `aspect-square rounded-2xl ring-1 ring-black/5` with the soft resting
     shadow the web gives the tile. The name sits outside it, on the page. */
  tile: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#f1f2f4',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
    marginBottom: 12, // mb-4
  },
  image: { width: '100%', height: '100%' },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* text-lg font-semibold text-[#1a1a1a], centred. Was 14px bold #111827 and
     left-aligned inside the old panel. */
  name: {
    fontFamily: Fonts.heading,
    // `text-lg` — 18, which is what the web sets even at its own two-column
    // mobile breakpoint, where the card is about this wide.
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 23,
    letterSpacing: -0.4,
    color: '#1a1a1a',
    textAlign: 'center',
  },
  /* text-sm text-gray-500 mt-1 */
  metaText: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 3,
  },
});

// ─── Skeleton styles ──────────────────────────────────────────────────────────
const sk = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  image: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#e5e7eb',
  },
  info: {
    padding: 12,
  },
  line1: {
    height: 14,
    width: '60%',
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    marginBottom: 6,
  },
  line2: {
    height: 10,
    width: '40%',
    backgroundColor: '#f3f4f6',
    borderRadius: 4,
  },
});
