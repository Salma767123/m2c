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
import { Image } from 'expo-image';
import {
  Package,
  ShoppingCart,
  AlertCircle,
  RefreshCw,
  Search,
  LifeBuoy,
  MessageCircle,
  LayoutGrid,
} from 'lucide-react-native';
import ScreenHeader from '@/components/WebSite/Shared/ScreenHeader';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { categoryService, type Category } from '@/services/categoryService';
import { useCart } from '@/context/CartContext';
import { Palette, Radius, Fonts } from '@/constants/theme';
import SectionHeading from '@/components/WebSite/Home/SectionHeading';
import { CARD_GUTTER, CARD_GAP } from '@/components/WebSite/ProductCard/metrics';
import TopSellingSection from '@/components/WebSite/Home/TopSellingSection';
import NoticeBoard from '@/components/WebSite/Home/NoticeBoard';

const BANNER = require('../../../../assets/images/categories/cb5.jpg');

/* One inset for the whole app. The web uses px-4 here, but mobile's own pages
   settled on CARD_GUTTER (26) — the 12pt margin plus 14pt padding its floating
   sections already reached — and a page that changes inset as you navigate to
   it reads as a different app, not a different screen. */
const GRID_PAD = CARD_GUTTER;
const GRID_GAP = CARD_GAP;
const BANNER_H = 172;

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Categories() {
  const { itemCount } = useCart();
  const { width } = useWindowDimensions();
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
          contentContainerStyle={s.flatListContent}
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
function CategoryBanner() {
  return (
    <View style={s.banner}>
      <Image source={BANNER} style={s.bannerImage} contentFit="cover" transition={220} />
      <View style={s.bannerScrim} />
      <View style={s.bannerContent}>
        <View style={s.bannerEyebrowRow}>
          <View style={s.bannerRule} />
          <Text style={s.bannerEyebrow} maxFontSizeMultiplier={1.2}>
            Our Collections
          </Text>
        </View>
        <Text style={s.bannerTitle} maxFontSizeMultiplier={1.2}>
          Shop by Categories
        </Text>
        <Text style={s.bannerSub} maxFontSizeMultiplier={1.2}>
          Discover our wide range of traditional textile products organized by categories
        </Text>
      </View>
    </View>
  );
}

// ─── Need Help card ──────────────────────────────────────────────────────────
/**
 * The web's support card, which mobile had reduced to a title, a paragraph and
 * two plain buttons on a flat panel. Three of its four devices were missing:
 * the warm gradient ground, the LifeBuoy mark, and the short red seam under the
 * title — the web's note calls that seam "the one piece of brand colour that
 * stops the three lines reading as one centred stack", which is exactly how the
 * mobile version read.
 */
function NeedHelpCard() {
  return (
    <View style={s.helpWrap}>
      <LinearGradient
        colors={['#fdf8f6', '#ffffff', '#faece8']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.helpCard}
      >
        {/* LifeBuoy in its own tinted chip, as on the web. */}
        <LinearGradient
          colors={['#fdf1ef', '#f9e3df']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={s.helpIcon}
        >
          <LifeBuoy size={30} color={Palette.primary} strokeWidth={1.6} />
        </LinearGradient>

        <Text style={s.helpTitle}>Need Help?</Text>
        <View style={s.helpSeam} />

        <Text style={s.helpBody}>
          Use our search feature or contact our support team for assistance
          finding specific products.
        </Text>

        {/* TouchableOpacity with a plain array style, not a Pressable taking a
            style FUNCTION.

            "Search Products" is a white label on a red fill. When the function
            style does not apply, the fill is lost and the label is white text
            on this card's near-white gradient — invisible. "Contact Support"
            below it survived the same failure only because its label is red,
            which is why that button was readable and this one was not.
            ActionButton elsewhere in this file uses the plain form and renders
            correctly, so this follows it. */}
        <TouchableOpacity
          onPress={() => router.push('/(any)/products' as any)}
          accessibilityRole="button"
          accessibilityLabel="Search products"
          activeOpacity={0.85}
          style={s.helpPrimary}
        >
          <Search size={16} color={Palette.onPrimary} strokeWidth={2.25} />
          <Text style={s.helpPrimaryText}>Search Products</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => router.push('/(any)/contact' as any)}
          accessibilityRole="button"
          accessibilityLabel="Contact support"
          activeOpacity={0.85}
          style={s.helpGhost}
        >
          <MessageCircle size={16} color={Palette.primary} strokeWidth={2.25} />
          <Text style={s.helpGhostText}>Contact Support</Text>
        </TouchableOpacity>
      </LinearGradient>
    </View>
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
          <View style={c.imagePlaceholder}>
            <Package size={40} color="#9ca3af" strokeWidth={1.5} />
          </View>
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
  flatListContent: {
    paddingHorizontal: GRID_PAD,
    paddingBottom: 32,
  },
  columnWrapper: {
    gap: GRID_GAP,
    marginBottom: GRID_GAP,
  },
  /* The list's contentContainer is inset by GRID_PAD for the grid, so anything
     that should run edge to edge — the banner, and the rails in the footer —
     cancels it with a negative margin. */
  banner: {
    marginHorizontal: -GRID_PAD,
    height: BANNER_H,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  bannerImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  // Matches the web's `bg-black/60` — the photo is busy and the copy sits on it.
  bannerScrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },
  bannerContent: { paddingHorizontal: 24, alignItems: 'center' },
  bannerEyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  bannerRule: { height: 1, width: 22, backgroundColor: Palette.primary },
  bannerEyebrow: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.85)',
    textTransform: 'uppercase',
    letterSpacing: 1.6,
  },
  bannerTitle: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.5,
    textAlign: 'center',
    marginBottom: 6,
  },
  bannerSub: {
    fontSize: 12.5,
    lineHeight: 18,
    color: 'rgba(255,255,255,0.88)',
    textAlign: 'center',
  },

  introWrap: { paddingTop: 20, paddingBottom: 6 },

  footerWrap: { marginHorizontal: -GRID_PAD, paddingTop: 8 },

  // Need Help
  helpWrap: { paddingHorizontal: 12, paddingTop: 18 },
  /* rounded-3xl with the web's warm ring, over the gradient ground. */
  helpCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#f0dcd6',
    padding: 24,
    alignItems: 'center',
    shadowColor: '#1a1416',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.35,
    shadowRadius: 22,
    elevation: 5,
  },
  helpIcon: {
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#f0d5cf',
    marginBottom: 20,
  },
  helpTitle: {
    fontFamily: Fonts.heading,
    fontSize: 22,
    fontWeight: '600',
    color: '#1a1a1a',
    letterSpacing: -0.55,
    textAlign: 'center',
  },
  /* The 3px × 48 seam under the title. */
  helpSeam: {
    width: 48,
    height: 3,
    borderRadius: 999,
    backgroundColor: Palette.primary,
    marginTop: 16,
  },
  helpBody: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    lineHeight: 21,
    color: '#4b5563',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 24,
  },
  /* Stacked, not side by side — the web pairs them from `sm:` up, which is
     wider than a phone, and the same width problem the BrandPromo CTAs hit. */
  helpPrimary: {
    alignSelf: 'stretch',
    minHeight: 48,
    borderRadius: Radius.full,
    backgroundColor: Palette.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: Palette.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 3,
  },
  helpPrimaryText: {
    fontFamily: Fonts.sansSemibold,
    fontSize: 15,
    fontWeight: '600',
    color: Palette.onPrimary,
  },
  helpGhost: {
    alignSelf: 'stretch',
    minHeight: 48,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Palette.primary,
    backgroundColor: 'rgba(255,255,255,0.7)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
  },
  helpGhostText: {
    fontFamily: Fonts.sansSemibold,
    fontSize: 15,
    fontWeight: '600',
    color: Palette.primary,
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
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 21,
    letterSpacing: -0.35,
    color: '#1a1a1a',
    textAlign: 'center',
  },
  /* text-sm text-gray-500 mt-1 */
  metaText: {
    fontFamily: Fonts.sans,
    fontSize: 13,
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
