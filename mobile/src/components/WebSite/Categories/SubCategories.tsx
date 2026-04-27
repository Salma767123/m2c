import React, { useState, useEffect, useCallback, memo, useMemo } from 'react';
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
  ArrowLeft,
  AlertCircle,
  ChevronRight,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { categoryService, Category } from '@/services/categoryService';
import { useCart } from '@/context/CartContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Subcategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  productCount?: number;
}

interface Props {
  categorySlug: string;
}

const GRID_PAD = 16;
const GRID_GAP = 12;

// ─── Screen ───────────────────────────────────────────────────────────────────
export function SubCategories({ categorySlug }: Props) {
  const router = useRouter();
  const { itemCount } = useCart();
  const { width } = useWindowDimensions();
  const cardWidth = (width - GRID_PAD * 2 - GRID_GAP) / 2;
  const [category, setCategory] = useState<Category | null>(null);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const res = await categoryService.getAllCategories({
        status: 'ACTIVE',
        showRootOnly: 'true',
        includeSubcategories: 'true',
      });

      if (res.success && res.data) {
        const found = res.data.find((c: Category) => c.slug === categorySlug);
        if (found) {
          setCategory(found);
          if (found.subcategories && found.subcategories.length > 0) {
            setSubcategories(found.subcategories);
          } else {
            const subRes = await categoryService.getSubcategories(found.id);
            setSubcategories(subRes.success && subRes.data ? subRes.data : []);
          }
        } else {
          setError('Category not found');
        }
      } else {
        setError('Failed to load category');
      }
    } catch (err) {
      console.error('Failed to fetch subcategories:', err);
      setError('Failed to load category');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [categorySlug]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  const handleSubPress = useCallback(
    (sub: Subcategory) => {
      if (!category) return;
      router.push(
        `/(any)/products?category=${encodeURIComponent(category.name)}&subcategory=${encodeURIComponent(sub.name)}` as any,
      );
    },
    [category, router],
  );

  const handleViewAll = useCallback(() => {
    if (!category) return;
    router.push(
      `/(any)/products?category=${encodeURIComponent(category.name)}` as any,
    );
  }, [category, router]);

  const totalProducts = useMemo(
    () => subcategories.reduce((sum, s) => sum + (s.productCount ?? 0), 0),
    [subcategories],
  );

  // FlatList helpers — defined before early returns to keep hook order stable.
  const renderItem = useCallback(
    ({ item }: { item: Subcategory }) => (
      <SubCategoryCard subcategory={item} onPress={handleSubPress} cardWidth={cardWidth} />
    ),
    [handleSubPress, cardWidth],
  );
  const keyExtractor = useCallback((item: Subcategory) => item.id, []);

  // ── States ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={scr.root}>
        <Header title="Loading…" itemCount={itemCount} />
        <SkeletonGrid cardWidth={cardWidth} />
      </View>
    );
  }

  if (error || !category) {
    return (
      <View style={scr.root}>
        <Header title="Category" itemCount={itemCount} />
        <View style={scr.centeredWrap}>
          <View style={scr.errorIcon}>
            <AlertCircle size={32} color="#dc2626" strokeWidth={1.75} />
          </View>
          <Text style={scr.errorTitle}>{error || 'Category Not Found'}</Text>
          <Text style={scr.errorDesc}>{"We couldn't find what you're looking for."}</Text>
          <View style={scr.errorBtns}>
            <Pressable
              onPress={() => router.push('/(tabs)/categories' as any)}
              accessibilityRole="button"
              accessibilityLabel="Back to categories"
            >
              <View style={scr.primaryBtn}>
                <ArrowLeft size={16} color="#fff" />
                <Text style={scr.primaryBtnText}>Categories</Text>
              </View>
            </Pressable>
            <Pressable
              onPress={() => router.push('/(any)/products' as any)}
              accessibilityRole="button"
              accessibilityLabel="Browse all products"
            >
              <View style={scr.secondaryBtn}>
                <Text style={scr.secondaryBtnText}>Browse All</Text>
              </View>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  // ── FlatList header ─────────────────────────────────────────────────────
  const ListHeaderContent = (
    <View style={list.headerWrap}>
      {/* Stats + View all row */}
      <View style={list.statsRow}>
        <View style={list.statsLeft}>
          <View style={list.statsPill}>
            <Text style={list.statsText}>
              {subcategories.length} {subcategories.length === 1 ? 'subcategory' : 'subcategories'}
            </Text>
          </View>
          {totalProducts > 0 ? (
            <View style={list.statsPill}>
              <Text style={list.statsText}>
                {totalProducts} {totalProducts === 1 ? 'product' : 'products'}
              </Text>
            </View>
          ) : null}
        </View>
        <Pressable
          onPress={handleViewAll}
          accessibilityRole="button"
          accessibilityLabel={`View all ${category.name} products`}
          hitSlop={8}
        >
          <View style={list.viewAllBtn}>
            <Text style={list.viewAllText}>View All</Text>
            <ChevronRight size={14} color="#ffffff" strokeWidth={2.5} />
          </View>
        </Pressable>
      </View>
    </View>
  );

  // ── FlatList footer ─────────────────────────────────────────────────────
  const ListFooterContent = subcategories.length === 0 ? (
    <View style={list.emptyWrap}>
      <View style={list.emptyIcon}>
        <Package size={32} color="#9ca3af" strokeWidth={1.75} />
      </View>
      <Text style={list.emptyTitle}>No Subcategories</Text>
      <Text style={list.emptyDesc}>View all products in this category instead.</Text>
      <Pressable
        onPress={handleViewAll}
        accessibilityRole="button"
        accessibilityLabel={`View ${category.name} products`}
      >
        <View style={list.emptyBtn}>
          <Text style={list.emptyBtnText}>
            {`View ${category.name} Products`}
          </Text>
          <ChevronRight size={16} color="#ffffff" strokeWidth={2.5} />
        </View>
      </Pressable>
    </View>
  ) : null;

  // ── Main ────────────────────────────────────────────────────────────────
  return (
    <View style={scr.root}>
      <Header title={category.name} itemCount={itemCount} />
      <FlatList
        data={subcategories}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        numColumns={2}
        columnWrapperStyle={scr.columnWrapper}
        contentContainerStyle={[
          scr.flatListContent,
          subcategories.length === 0 ? scr.flatListGrow : undefined,
        ]}
        ListHeaderComponent={ListHeaderContent}
        ListFooterComponent={ListFooterContent}
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
    </View>
  );
}

// ─── Header ───────────────────────────────────────────────────────────────────
function Header({ title, itemCount }: { title: string; itemCount: number }) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  return (
    <View style={[hdr.container, { paddingTop: insets.top + 8 }]}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      {/* Back button */}
      <Pressable
        onPress={() => (router.canGoBack() ? router.back() : router.push('/(tabs)/categories' as any))}
        accessibilityRole="button"
        accessibilityLabel="Go back"
        accessibilityHint="Returns to categories list"
        hitSlop={8}
        style={hdr.backBtn}
      >
        <View style={hdr.backCircle}>
          <ArrowLeft size={18} color="#111827" strokeWidth={2.5} />
        </View>
      </Pressable>

      {/* Title */}
      <View style={hdr.titleWrap}>
        <Text style={hdr.title} numberOfLines={1}>
          {title}
        </Text>
      </View>

      {/* Cart */}
      <Pressable
        onPress={() => router.push('/(tabs)/cart' as any)}
        accessibilityRole="button"
        accessibilityLabel={`Cart with ${itemCount} items`}
        accessibilityHint="Opens your shopping cart"
        hitSlop={8}
        style={hdr.cartBtn}
      >
        <View style={hdr.cartCircle}>
          <ShoppingCart size={18} color="#111827" strokeWidth={2} />
          {itemCount > 0 ? (
            <View style={hdr.badge}>
              <Text style={hdr.badgeText}>
                {itemCount > 99 ? '99+' : itemCount}
              </Text>
            </View>
          ) : null}
        </View>
      </Pressable>
    </View>
  );
}

const hdr = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 3,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backCircle: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleWrap: {
    flex: 1,
    marginHorizontal: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: -0.3,
  },
  cartBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartCircle: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -3,
    right: -5,
    backgroundColor: '#111827',
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '800',
    lineHeight: 11,
  },
});

// ─── SubCategory Card (memoized, compact grid) ──────────────────────────────
const SubCategoryCard = memo(function SubCategoryCard({
  subcategory,
  onPress,
  cardWidth,
}: {
  subcategory: Subcategory;
  onPress: (s: Subcategory) => void;
  cardWidth: number;
}) {
  const tap = useCallback(() => onPress(subcategory), [onPress, subcategory]);
  const count = subcategory.productCount ?? 0;

  return (
    <Pressable
      onPress={tap}
      accessibilityRole="button"
      accessibilityLabel={`Browse ${subcategory.name}, ${count} products`}
      accessibilityHint="Opens subcategory products"
      android_ripple={{ color: 'rgba(15,23,42,0.06)' }}
      style={{ width: cardWidth }}
    >
      <View style={card.container}>
        {/* Image — square for compact grid */}
        <View style={card.imageWrap}>
          {subcategory.image ? (
            <Image
              source={{ uri: subcategory.image }}
              style={card.image}
              contentFit="cover"
              transition={250}
            />
          ) : (
            <View style={card.imagePlaceholder}>
              <Package size={36} color="#d1d5db" strokeWidth={1.5} />
            </View>
          )}
          {count > 0 ? (
            <View style={card.countBadge}>
              <Text style={card.countText}>{count}</Text>
            </View>
          ) : null}
        </View>

        {/* Info */}
        <View style={card.info}>
          <Text style={card.name} numberOfLines={2}>{subcategory.name}</Text>
          {subcategory.description ? (
            <Text style={card.desc} numberOfLines={1}>{subcategory.description}</Text>
          ) : null}
          <View style={card.exploreRow}>
            <Text style={card.exploreText}>Explore</Text>
            <ChevronRight size={12} color="#6b7280" strokeWidth={2.5} />
          </View>
        </View>
      </View>
    </Pressable>
  );
});

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function SkeletonGrid({ cardWidth }: { cardWidth: number }) {
  return (
    <View style={sk.wrap}>
      {Array.from({ length: 3 }).map((_, i) => (
        <View key={i} style={sk.row}>
          <View style={[sk.card, { width: cardWidth }]}>
            <View style={sk.image} />
            <View style={sk.info}>
              <View style={sk.line1} />
              <View style={sk.line2} />
            </View>
          </View>
          <View style={[sk.card, { width: cardWidth }]}>
            <View style={sk.image} />
            <View style={sk.info}>
              <View style={sk.line1} />
              <View style={sk.line2} />
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

export default SubCategories;

// ─── List header / footer styles ─────────────────────────────────────────���──
const list = StyleSheet.create({
  headerWrap: {
    paddingTop: 12,
    paddingBottom: 8,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statsPill: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statsText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111827',
    paddingHorizontal: 14,
    height: 34,
    borderRadius: 10,
    gap: 2,
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  emptyDesc: {
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 20,
  },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111827',
    paddingHorizontal: 20,
    height: 44,
    borderRadius: 12,
    gap: 4,
  },
  emptyBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
});

// ─── Screen-level styles ────────────────────────────────────────────────────
const scr = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f8fafc' },
  flatListContent: { paddingHorizontal: GRID_PAD, paddingBottom: 32 },
  flatListGrow: { flexGrow: 1 },
  columnWrapper: { gap: GRID_GAP, marginBottom: GRID_GAP },
  centeredWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  errorIcon: {
    width: 72, height: 72, borderRadius: 24,
    backgroundColor: '#fef2f2', alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  errorTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 4 },
  errorDesc: { fontSize: 14, color: '#6b7280', textAlign: 'center', marginBottom: 20 },
  errorBtns: { flexDirection: 'row', gap: 10 },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#111827',
    paddingHorizontal: 18, height: 44, borderRadius: 12, gap: 6,
  },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  secondaryBtn: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#e5e7eb',
    backgroundColor: '#fff', paddingHorizontal: 18, height: 44, borderRadius: 12,
  },
  secondaryBtnText: { color: '#111827', fontWeight: '600', fontSize: 14 },
});

// ─── SubCategory card styles (compact grid) ─────────────────────────────────
const card = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#f3f4f6',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  imageWrap: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#f3f4f6',
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
  countBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#111827',
    minWidth: 24,
    height: 24,
    borderRadius: 8,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#ffffff',
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
  desc: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 2,
    lineHeight: 15,
  },
  exploreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 2,
  },
  exploreText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6b7280',
  },
});

// ─── Skeleton styles ────────────────────────────────────────────────────────
const sk = StyleSheet.create({
  wrap: { padding: GRID_PAD, gap: GRID_GAP },
  row: { flexDirection: 'row', gap: GRID_GAP },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  image: { width: '100%', aspectRatio: 1, backgroundColor: '#e5e7eb' },
  info: { padding: 12 },
  line1: { height: 14, width: '60%', backgroundColor: '#e5e7eb', borderRadius: 4, marginBottom: 6 },
  line2: { height: 10, width: '40%', backgroundColor: '#f3f4f6', borderRadius: 4 },
});
