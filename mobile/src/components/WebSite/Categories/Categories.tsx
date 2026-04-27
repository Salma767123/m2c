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
  ChevronRight,
  AlertCircle,
  RefreshCw,
  Search,
} from 'lucide-react-native';
import { router } from 'expo-router';
import { categoryService, type Category } from '@/services/categoryService';
import { useCart } from '@/context/CartContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const GRID_PAD = 16;
const GRID_GAP = 12;

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

  const ListHeader = (
    <View style={s.listHeader}>
      <Text style={s.listTitle}>Browse Collections</Text>
      <View style={s.listCountPill}>
        <Text style={s.listCountText}>
          {categories.length} {categories.length === 1 ? 'category' : 'categories'}
        </Text>
      </View>
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
          icon={<AlertCircle size={32} color="#dc2626" strokeWidth={1.75} />}
          iconBg="#fef2f2"
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

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`${category.name}, ${count} subcategories`}
      accessibilityHint="Opens category details"
      android_ripple={{ color: 'rgba(15,23,42,0.06)' }}
      style={{ width: cardWidth }}
    >
      <View style={c.card}>
        {/* Image — square for compact grid */}
        <View style={c.imageWrap}>
          {category.image ? (
            <Image
              source={{ uri: category.image }}
              style={c.image}
              contentFit="cover"
              transition={250}
            />
          ) : (
            <View style={c.imagePlaceholder}>
              <Package size={36} color="#d1d5db" strokeWidth={1.5} />
            </View>
          )}

          {/* Subcategory count */}
          {count > 0 ? (
            <View style={c.badge}>
              <Text style={c.badgeText}>{count}</Text>
            </View>
          ) : null}
        </View>

        {/* Info */}
        <View style={c.info}>
          <Text style={c.name} numberOfLines={2}>{category.name}</Text>
          {category.description ? (
            <Text style={c.desc} numberOfLines={1}>{category.description}</Text>
          ) : null}
          <View style={c.exploreRow}>
            <Text style={c.exploreText}>Explore</Text>
            <ChevronRight size={12} color="#6b7280" strokeWidth={2.5} />
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
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 16,
    paddingBottom: 12,
  },
  listTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#374151',
  },
  listCountPill: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  listCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
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
    backgroundColor: '#111827',
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
  badge: {
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
  badgeText: {
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
