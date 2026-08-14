import React, { useState, useEffect, useCallback, memo } from 'react';
import {
  View,
  Text,
  Pressable,
  FlatList,
  RefreshControl,
  StyleSheet,
  useWindowDimensions,
  StatusBar,
} from 'react-native';
import { Image } from 'expo-image';
import {
  Package,
  ShoppingCart,
  AlertCircle,
  RefreshCw,
  Search,
  Layers,
} from 'lucide-react-native';
import { router } from 'expo-router';
import { categoryService, type Category } from '@/services/categoryService';
import { useCart } from '@/context/CartContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Palette, Radius, Shadow } from '@/constants/theme';
import SectionHeading from '@/components/WebSite/Home/SectionHeading';
import TopSellingSection from '@/components/WebSite/Home/TopSellingSection';
import NoticeBoard from '@/components/WebSite/Home/NoticeBoard';

const BANNER = require('../../../../assets/images/categories/cb5.jpg');

const GRID_PAD = 16;
const GRID_GAP = 12;
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
        <SectionHeading section="browseCollections" />
        <View style={s.listCountPill}>
          <Text style={s.listCountText}>
            {categories.length} {categories.length === 1 ? 'category' : 'categories'}
          </Text>
        </View>
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
      <ScreenHeader itemCount={itemCount} />

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
function ScreenHeader({ itemCount }: { itemCount: number }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[s.header, { paddingTop: insets.top + 8 }]}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <View style={s.headerLeft}>
        <Text style={s.headerTitle}>Categories</Text>
      </View>
      <View style={s.headerActions}>
        <Pressable
          onPress={() => router.push('/(any)/products' as any)}
          accessibilityRole="button"
          accessibilityLabel="Search products"
          accessibilityHint="Opens product search"
          hitSlop={6}
          style={s.headerBtn}
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
          style={s.headerBtn}
        >
          <View style={s.headerBtnCircle}>
            <ShoppingCart size={18} color="#111827" strokeWidth={2} />
            {itemCount > 0 ? (
              <View style={s.headerBadge}>
                <Text style={s.headerBadgeText}>
                  {itemCount > 99 ? '99+' : itemCount}
                </Text>
              </View>
            ) : null}
          </View>
        </Pressable>
      </View>
    </View>
  );
}

// ─── Hero banner ─────────────────────────────────────────────────────────────
// The web page opens with a photo banner under a black/60 scrim carrying the
// eyebrow / title / subtitle. Same asset (cb5.jpg, 1366×480) copied into the app
// so both clients open on the same image.
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
function NeedHelpCard() {
  return (
    <View style={s.helpWrap}>
      <View style={s.helpCard}>
        <Text style={s.helpTitle}>Need Help?</Text>
        <Text style={s.helpBody}>
          Use our search feature or contact our support team for assistance
          finding specific products.
        </Text>
        <Pressable
          onPress={() => router.push('/(any)/products' as any)}
          accessibilityRole="button"
          accessibilityLabel="Search products"
          style={({ pressed }) => [s.helpPrimary, pressed && s.helpPressed]}
        >
          <Text style={s.helpPrimaryText}>Search Products</Text>
        </Pressable>
        <Pressable
          onPress={() => router.push('/(any)/support' as any)}
          accessibilityRole="button"
          accessibilityLabel="Contact support"
          style={({ pressed }) => [s.helpGhost, pressed && s.helpPressed]}
        >
          <Text style={s.helpGhostText}>Contact Support</Text>
        </Pressable>
      </View>
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
      <View style={c.card}>
        {/* Image — square, padded so the full image shows */}
        <View style={c.imageWrap}>
          {category.image ? (
            <Image
              source={{ uri: category.image }}
              style={c.image}
              contentFit="contain"
              transition={250}
            />
          ) : (
            <View style={c.imagePlaceholder}>
              <Package size={34} color="#cbd5e1" strokeWidth={1.5} />
            </View>
          )}
        </View>

        {/* Info */}
        <View style={c.info}>
          <Text style={c.name} numberOfLines={1}>{category.name}</Text>
          <View style={c.metaRow}>
            <Layers size={12} color="#6b7280" strokeWidth={2.25} />
            <Text style={c.metaText} numberOfLines={1}>{meta}</Text>
          </View>
        </View>
      </View>
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
  screen: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },

  // Header
  header: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 3,
  },
  headerLeft: { flex: 1 },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.3,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  listCountPill: {
    alignSelf: 'flex-start',
    backgroundColor: Palette.outlineSubtle,
    borderRadius: Radius.DEFAULT,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 2,
    marginBottom: 10,
  },
  listCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: Palette.textMuted,
  },

  footerWrap: { marginHorizontal: -GRID_PAD, paddingTop: 8 },

  // Need Help
  helpWrap: { paddingHorizontal: 12, paddingTop: 18 },
  helpCard: {
    backgroundColor: Palette.background,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Palette.outline,
    padding: 20,
    alignItems: 'center',
    ...Shadow.cardRest,
  },
  helpTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: Palette.ink,
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  helpBody: {
    fontSize: 13,
    lineHeight: 19,
    color: Palette.textMuted,
    textAlign: 'center',
    marginBottom: 18,
  },
  /* Stacked, not side by side — the same width problem the BrandPromo CTAs hit. */
  helpPrimary: {
    alignSelf: 'stretch',
    height: 46,
    borderRadius: Radius.full,
    backgroundColor: Palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  helpPrimaryText: { fontSize: 14, fontWeight: '800', color: Palette.onPrimary },
  helpGhost: {
    alignSelf: 'stretch',
    height: 46,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  helpGhostText: { fontSize: 14, fontWeight: '700', color: Palette.primary },
  helpPressed: { opacity: 0.88 },

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
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#eceef1',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  imageWrap: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#f7f8fa',
    padding: 10,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 12,
  },
  name: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    lineHeight: 18,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
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
