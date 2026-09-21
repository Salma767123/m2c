import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  TextInput,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  StyleSheet,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import {
  Search,
  ShoppingCart,
  SlidersHorizontal,
  ArrowUpDown,
  X,
  Check,
  Star,
  PackageSearch,
  RefreshCw,
  Sparkles,
  ArrowUpNarrowWide,
  ArrowDownNarrowWide,
} from 'lucide-react-native';
import ScreenHeader from '@/components/WebSite/Shared/ScreenHeader';
import EmptyState from '@/components/WebSite/Shared/EmptyState';

import ProductCard from '@/components/WebSite/ProductCard/ProductCard';
import { CARD_GRID_PADDING, CARD_GAP } from '@/components/WebSite/ProductCard/metrics';
import VendorPartnerCTA from '@/components/WebSite/VendorPartnerCTA/VendorPartnerCTA';
import {
  publicProductService,
  PublicProduct,
  ProductFacets,
} from '@/services/publicProductService';
import { categoryService, Category } from '@/services/categoryService';
import { useCart } from '@/context/CartContext';
import { Fonts, Palette } from '@/constants/theme';

// ─── Types & constants ────────────────────────────────────────────────────
type LoadState = 'initial' | 'ready' | 'empty' | 'error';
type SortKey = 'newest' | 'price_asc' | 'price_desc' | 'rating_desc';

type Filters = {
  search: string;
  category: string;
  subCategory: string;
  minPrice?: number;
  maxPrice?: number;
  minRating: number; // 0 means "any"
  inStockOnly: boolean;
  newArrivals: boolean;
  collection: string; // '' | 'featured' | 'top-selling' | 'best-seller'
  minDiscount: number; // 0 means "any"
  colors: string[];
  sizes: string[];
  materials: string[];
  fabricTypes: string[];
  sort: SortKey;
};

// Only the fields the FilterModal manages (not search or sort).
type FilterFields = Omit<Filters, 'search' | 'sort'>;

type SortOption = { key: SortKey; label: string; sortBy: string; sortOrder: 'asc' | 'desc' };

const SORT_OPTIONS: SortOption[] = [
  { key: 'newest', label: 'Newest first', sortBy: 'createdAt', sortOrder: 'desc' },
  { key: 'price_asc', label: 'Price: Low to High', sortBy: 'basePrice', sortOrder: 'asc' },
  { key: 'price_desc', label: 'Price: High to Low', sortBy: 'basePrice', sortOrder: 'desc' },
  { key: 'rating_desc', label: 'Highest rated', sortBy: 'rating', sortOrder: 'desc' },
];

// Homepage collections, driven by product tags — mirrors the web ?collection= param.
const COLLECTIONS = [
  { key: 'featured', label: 'Featured', tag: 'Featured' },
  { key: 'top-selling', label: 'Top Selling', tag: 'Top Selling' },
  { key: 'best-seller', label: 'Best Seller', tag: 'Best Seller' },
];

// Discount buckets capped at the real maximum available discount — mirrors web.
const DISCOUNT_BUCKETS = [10, 20, 30, 40, 50];

// Order matches web: 4-star → 1-star, then "All Ratings" at the bottom.
// Label uses "& Up" phrasing identical to the web filter sidebar.
const RATING_OPTIONS = [
  { value: 4, label: '& Up' },
  { value: 3, label: '& Up' },
  { value: 2, label: '& Up' },
  { value: 1, label: '& Up' },
  { value: 0, label: 'All Ratings' },
];

const PAGE_SIZE = 12;

// ─── Screen ───────────────────────────────────────────────────────────────
export default function ProductsScreen() {
  const params = useLocalSearchParams<{
    category?: string;
    subcategory?: string;
    search?: string;
    collection?: string;
  }>();
  const { itemCount } = useCart();

  const [filters, setFilters] = useState<Filters>({
    search: params.search ?? '',
    category: params.category ?? '',
    subCategory: params.subcategory ?? '',
    minPrice: undefined,
    maxPrice: undefined,
    minRating: 0,
    inStockOnly: false,
    newArrivals: false,
    collection: COLLECTIONS.some((c) => c.key === params.collection)
      ? (params.collection as string)
      : '',
    minDiscount: 0,
    colors: [],
    sizes: [],
    materials: [],
    fabricTypes: [],
    sort: 'newest',
  });

  // Debounced search input — updates `filters.search` 400ms after typing stops.
  const [searchInput, setSearchInput] = useState(filters.search);
  useEffect(() => {
    const id = setTimeout(() => {
      setFilters((f) => (f.search === searchInput ? f : { ...f, search: searchInput }));
    }, 400);
    return () => clearTimeout(id);
  }, [searchInput]);

  // Keep the collection filter in sync when the ?collection= param changes while
  // already on this page (e.g. jumping between the home sections' "View All" links).
  useEffect(() => {
    setFilters((f) => ({
      ...f,
      collection: COLLECTIONS.some((c) => c.key === params.collection)
        ? (params.collection as string)
        : '',
    }));
  }, [params.collection]);

  const [products, setProducts] = useState<PublicProduct[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [state, setState] = useState<LoadState>('initial');
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Live filter facets (colors/sizes/materials/fabric/discount) — mirrors the web
  // sidebar. Re-fetched whenever the search/category context changes.
  const [facets, setFacets] = useState<ProductFacets | null>(null);

  useEffect(() => {
    let ignore = false;
    publicProductService
      .getFacets({
        search: filters.search || undefined,
        category: filters.category || undefined,
        subCategory: filters.subCategory || undefined,
      })
      .then((res) => {
        if (!ignore && res.success && res.data) setFacets(res.data);
      })
      .catch(() => {
        /* facets are optional — ignore */
      });
    return () => {
      ignore = true;
    };
  }, [filters.search, filters.category, filters.subCategory]);


  const [showSort, setShowSort] = useState(false);
  const [showFilter, setShowFilter] = useState(false);

  // Cancel in-flight requests whenever filters change.
  const abortRef = useRef<AbortController | null>(null);

  const sortOption = useMemo(
    () => SORT_OPTIONS.find((o) => o.key === filters.sort) ?? SORT_OPTIONS[0],
    [filters.sort],
  );

  const fetchPage = useCallback(
    async (pageNum: number, isLoadMore: boolean) => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;

      if (!isLoadMore) setState((s) => (s === 'ready' ? s : 'initial'));
      if (isLoadMore) setLoadingMore(true);

      try {
        const res = await publicProductService.getProducts({
          page: pageNum,
          limit: PAGE_SIZE,
          search: filters.search || undefined,
          category: filters.category || undefined,
          subCategory: filters.subCategory || undefined,
          minPrice: filters.minPrice,
          maxPrice: filters.maxPrice,
          minRating: filters.minRating > 0 ? filters.minRating : undefined,
          inStock: filters.inStockOnly ? true : undefined,
          tag: COLLECTIONS.find((c) => c.key === filters.collection)?.tag || undefined,
          colors: filters.colors.length ? filters.colors.join(',') : undefined,
          sizes: filters.sizes.length ? filters.sizes.join(',') : undefined,
          materials: filters.materials.length ? filters.materials.join(',') : undefined,
          fabricTypes: filters.fabricTypes.length ? filters.fabricTypes.join(',') : undefined,
          minDiscount: filters.minDiscount > 0 ? filters.minDiscount : undefined,
          newArrivals: filters.newArrivals ? true : undefined,
          sortBy: sortOption.sortBy,
          sortOrder: sortOption.sortOrder,
        });

        if (ctrl.signal.aborted) return;

        if (!res.success || !res.data) {
          setState('error');
          return;
        }

        const items = res.data.items;
        setTotalPages(res.data.pagination.totalPages);
        setTotalItems(res.data.pagination.totalItems);
        setPage(res.data.pagination.currentPage);

        setProducts((prev) => (isLoadMore ? [...prev, ...items] : items));
        setState(
          isLoadMore || items.length > 0
            ? 'ready'
            : 'empty',
        );
      } catch (err) {
        if (ctrl.signal.aborted) return;
        console.error('Failed to fetch products:', err);
        setState('error');
      } finally {
        if (!ctrl.signal.aborted) {
          setLoadingMore(false);
          setRefreshing(false);
        }
      }
    },
    [filters, sortOption],
  );

  // Re-fetch from page 1 whenever the filter object changes.
  useEffect(() => {
    fetchPage(1, false);
    return () => abortRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchPage(1, false);
  }, [fetchPage]);

  const onEndReached = useCallback(() => {
    if (loadingMore) return;
    if (state !== 'ready') return;
    if (page >= totalPages) return;
    fetchPage(page + 1, true);
  }, [fetchPage, loadingMore, page, totalPages, state]);

  const clearAllFilters = useCallback(() => {
    setSearchInput('');
    setFilters({
      search: '',
      category: '',
      subCategory: '',
      minPrice: undefined,
      maxPrice: undefined,
      minRating: 0,
      inStockOnly: false,
      newArrivals: false,
      collection: '',
      minDiscount: 0,
      colors: [],
      sizes: [],
      materials: [],
      fabricTypes: [],
      sort: 'newest',
    });
  }, []);

  // Active-chip helpers
  const activeChips = useMemo(() => {
    const chips: { key: string; label: string; onClear: () => void }[] = [];
    if (filters.category)
      chips.push({
        key: 'category',
        label: `Category: ${filters.category}`,
        onClear: () => setFilters((f) => ({ ...f, category: '', subCategory: '' })),
      });
    if (filters.subCategory)
      chips.push({
        key: 'subCategory',
        label: `Sub: ${filters.subCategory}`,
        onClear: () => setFilters((f) => ({ ...f, subCategory: '' })),
      });
    if (filters.search)
      chips.push({
        key: 'search',
        label: `"${filters.search}"`,
        onClear: () => {
          setSearchInput('');
          setFilters((f) => ({ ...f, search: '' }));
        },
      });
    if (filters.inStockOnly)
      chips.push({
        key: 'inStock',
        label: 'In stock only',
        onClear: () => setFilters((f) => ({ ...f, inStockOnly: false })),
      });
    if (filters.newArrivals)
      chips.push({
        key: 'newArrivals',
        label: 'New arrivals',
        onClear: () => setFilters((f) => ({ ...f, newArrivals: false })),
      });
    if (filters.collection) {
      const collectionLabel = COLLECTIONS.find((c) => c.key === filters.collection)?.label;
      if (collectionLabel)
        chips.push({
          key: 'collection',
          label: `Collection: ${collectionLabel}`,
          onClear: () => setFilters((f) => ({ ...f, collection: '' })),
        });
    }
    if (filters.minDiscount > 0)
      chips.push({
        key: 'discount',
        label: `${filters.minDiscount}%+ off`,
        onClear: () => setFilters((f) => ({ ...f, minDiscount: 0 })),
      });
    if (filters.minRating > 0)
      chips.push({
        key: 'rating',
        label: `${filters.minRating}+ stars`,
        onClear: () => setFilters((f) => ({ ...f, minRating: 0 })),
      });
    if (filters.minPrice != null || filters.maxPrice != null) {
      const range = `$${filters.minPrice ?? 0} – $${filters.maxPrice ?? '∞'}`;
      chips.push({
        key: 'price',
        label: range,
        onClear: () => setFilters((f) => ({ ...f, minPrice: undefined, maxPrice: undefined })),
      });
    }
    if (filters.colors.length > 0)
      chips.push({
        key: 'colors',
        label: `Color (${filters.colors.length})`,
        onClear: () => setFilters((f) => ({ ...f, colors: [] })),
      });
    if (filters.sizes.length > 0)
      chips.push({
        key: 'sizes',
        label: `Size (${filters.sizes.length})`,
        onClear: () => setFilters((f) => ({ ...f, sizes: [] })),
      });
    if (filters.materials.length > 0)
      chips.push({
        key: 'materials',
        label: `Material (${filters.materials.length})`,
        onClear: () => setFilters((f) => ({ ...f, materials: [] })),
      });
    if (filters.fabricTypes.length > 0)
      chips.push({
        key: 'fabricTypes',
        label: `Fabric (${filters.fabricTypes.length})`,
        onClear: () => setFilters((f) => ({ ...f, fabricTypes: [] })),
      });
    return chips;
  }, [filters]);

  const hasActiveFilters = activeChips.length > 0 || filters.sort !== 'newest';

  // Active filter count for the badge on the Filter button — matches web's "Filters (3)" pattern.
  const activeFiltersCount = (
    (filters.category ? 1 : 0) +
    (filters.subCategory ? 1 : 0) +
    (filters.inStockOnly ? 1 : 0) +
    (filters.newArrivals ? 1 : 0) +
    (filters.collection ? 1 : 0) +
    (filters.minDiscount > 0 ? 1 : 0) +
    (filters.minRating > 0 ? 1 : 0) +
    (filters.minPrice != null || filters.maxPrice != null ? 1 : 0) +
    (filters.colors.length > 0 ? 1 : 0) +
    (filters.sizes.length > 0 ? 1 : 0) +
    (filters.materials.length > 0 ? 1 : 0) +
    (filters.fabricTypes.length > 0 ? 1 : 0)
  );

  // Rich results context matching web: "Showing X of Y products in Category > Sub matching 'search'"
  const resultsContext = useMemo(() => {
    if (state !== 'ready') return '';
    let text = `${totalItems.toLocaleString()} ${totalItems === 1 ? 'product' : 'products'}`;
    if (filters.category) text += ` in ${filters.category}`;
    if (filters.subCategory) text += ` › ${filters.subCategory}`;
    if (filters.search) text += ` matching "${filters.search}"`;
    return text;
  }, [state, totalItems, filters.category, filters.subCategory, filters.search]);

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <Header itemCount={itemCount} />
      <SearchBar
        value={searchInput}
        onChange={setSearchInput}
        onClear={() => setSearchInput('')}
      />

      {activeChips.length > 0 || filters.sort !== 'newest' ? (
        <ActiveChips
          chips={activeChips}
          sortLabel={filters.sort !== 'newest' ? sortOption.label : null}
          onClearSort={() => setFilters((f) => ({ ...f, sort: 'newest' }))}
          onClearAll={clearAllFilters}
        />
      ) : null}

      <FilterSortBar
        onFilter={() => setShowFilter(true)}
        onSort={() => setShowSort(true)}
        resultText={resultsContext}
        activeFiltersCount={activeFiltersCount}
        sortLabel={sortOption.label}
      />

      <FlatList
        // key forces FlatList remount when switching between 1-col and 2-col
        // (required by React Native when numColumns changes).
        key={products.length <= 1 ? 'single' : 'grid'}
        data={products}
        keyExtractor={keyExtractor}
        renderItem={({ item }) => (
          <View
            style={
              products.length <= 1
                ? { width: '100%', maxWidth: 300, alignSelf: 'center' }
                : { flex: 1 }
            }
          >
            <ProductCard product={item} />
          </View>
        )}
        numColumns={products.length <= 1 ? 1 : 2}
        columnWrapperStyle={products.length > 1 ? { gap: CARD_GAP } : undefined}
        contentContainerStyle={{
          paddingHorizontal: CARD_GRID_PADDING,
          paddingTop: 8,
          paddingBottom: 32,
          gap: 12,
          flexGrow: products.length === 0 ? 1 : undefined,
        }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#111827" />
        }
        onEndReached={onEndReached}
        onEndReachedThreshold={0.5}
        ListHeaderComponent={
          <HeroBanner
            category={filters.category}
            subcategory={filters.subCategory}
            collection={filters.collection}
          />
        }
        ListEmptyComponent={
          <ListEmpty
            state={state}
            hasActiveFilters={hasActiveFilters}
            onClearAll={clearAllFilters}
            onRetry={() => fetchPage(1, false)}
          />
        }
        ListFooterComponent={
          products.length === 0 ? null : loadingMore ? (
            <View style={{ paddingVertical: 20, alignItems: 'center' }}>
              <ActivityIndicator size="small" color="#111827" />
              <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 6 }}>Loading more…</Text>
            </View>
          ) : totalPages > 1 ? (
            <PaginationBar
              page={page}
              totalPages={totalPages}
              onPrev={() => fetchPage(page - 1, false)}
              onNext={() => fetchPage(page + 1, false)}
            />
          ) : totalItems > 0 ? (
            <View style={{ paddingVertical: 20, alignItems: 'center' }}>
              <Text style={{ fontSize: 12, color: '#9ca3af' }}>You&apos;ve seen all products</Text>
            </View>
          ) : null
        }
        showsVerticalScrollIndicator={false}
      />

      {/* The web closes this listing with the vendor band — Products.tsx
          renders <VendorPartnerCTA /> last. */}
      {products.length > 0 ? <VendorPartnerCTA /> : null}

      <SortModal
        visible={showSort}
        value={filters.sort}
        onChange={(sort) => {
          setFilters((f) => ({ ...f, sort }));
          setShowSort(false);
        }}
        onClose={() => setShowSort(false)}
      />

      <FilterModal
        visible={showFilter}
        filters={filters}
        facets={facets}
        onApply={(filterFields) => {
          // Merge only filter-specific fields — never touch search or sort.
          setFilters((f) => ({ ...f, ...filterFields }));
          setShowFilter(false);
        }}
        onClose={() => setShowFilter(false)}
      />
    </View>
  );
}

const keyExtractor = (p: PublicProduct) => p.id;

// ─── Sub-components ───────────────────────────────────────────────────────

function Header({ itemCount }: { itemCount: number }) {
  return (
    <ScreenHeader
      onBack={() => (router.canGoBack() ? router.back() : router.push('/(tabs)'))}
      title="Products"
      right={
        <Pressable
          onPress={() => router.push('/(tabs)/cart' as any)}
          accessibilityRole="button"
          accessibilityLabel={`Cart with ${itemCount} items`}
          hitSlop={8}
        >
          <View style={ph.cartCircle}>
            <ShoppingCart size={18} color="#111827" strokeWidth={2} />
            {itemCount > 0 ? (
              <View style={ph.badge}>
                <Text style={ph.badgeText}>{itemCount > 99 ? '99+' : itemCount}</Text>
              </View>
            ) : null}
          </View>
        </Pressable>
      }
    />
  );
}

const ph = StyleSheet.create({
  cartCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -4,
    backgroundColor: '#E01A1B',
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontFamily: Fonts.sansBold,
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
});

function SearchBar({
  value,
  onChange,
  onClear,
}: {
  value: string;
  onChange: (s: string) => void;
  onClear: () => void;
}) {
  return (
    <View
      style={{
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 8,
        backgroundColor: '#f9fafb',
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: '#ffffff',
          borderRadius: 12,
          borderWidth: 1,
          borderColor: '#e5e7eb',
          paddingHorizontal: 12,
          height: 44,
        }}
      >
        <Search size={18} color="#6b7280" />
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder="Search products…"
          placeholderTextColor="#9ca3af"
          style={{ flex: 1, marginLeft: 8, fontSize: 15, color: '#111827' }}
          returnKeyType="search"
        />
        {value ? (
          <Pressable onPress={onClear} accessibilityLabel="Clear search" hitSlop={8}>
            <X size={16} color="#6b7280" />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function ActiveChips({
  chips,
  sortLabel,
  onClearSort,
  onClearAll,
}: {
  chips: { key: string; label: string; onClear: () => void }[];
  sortLabel: string | null;
  onClearSort: () => void;
  onClearAll: () => void;
}) {
  return (
    <View style={{ backgroundColor: '#f9fafb', paddingBottom: 6 }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8, alignItems: 'center' }}
      >
        {sortLabel ? (
          <Chip label={sortLabel} onClear={onClearSort} />
        ) : null}
        {chips.map((c) => (
          <Chip key={c.key} label={c.label} onClear={c.onClear} />
        ))}
        <Pressable onPress={onClearAll} accessibilityRole="button" hitSlop={6}>
          <View
            style={{
              paddingHorizontal: 12,
              height: 30,
              borderRadius: 15,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: '#dc2626', fontSize: 12, fontWeight: '600' }}>
              Clear all
            </Text>
          </View>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function Chip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <Pressable onPress={onClear} accessibilityRole="button" accessibilityLabel={`Remove ${label}`} hitSlop={4}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: Palette.primary,
          paddingLeft: 10,
          paddingRight: 6,
          height: 30,
          borderRadius: 15,
        }}
      >
        <Text
          style={{ color: '#ffffff', fontSize: 12, fontWeight: '600', marginRight: 4 }}
          numberOfLines={1}
        >
          {label}
        </Text>
        <X size={12} color="#ffffff" />
      </View>
    </Pressable>
  );
}

function FilterSortBar({
  onFilter,
  onSort,
  resultText,
  activeFiltersCount,
  sortLabel,
}: {
  onFilter: () => void;
  onSort: () => void;
  resultText: string;
  activeFiltersCount: number;
  sortLabel: string;
}) {
  const active = activeFiltersCount > 0;
  return (
    <View style={fs.bar}>
      {/* The count reads as a status line, not a control: quiet, with the
          current sort named under it so the list never sorts invisibly. */}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={fs.resultText} numberOfLines={1}>
          {resultText}
        </Text>
        <View style={fs.sortedRow}>
          <View style={fs.sortedDot} />
          <Text style={fs.sortedText} numberOfLines={1}>
            {sortLabel}
          </Text>
        </View>
      </View>

      {/* Sort and Filter are joined into one control rather than floating as
          two lookalike outlines — they are the same kind of action, so they
          read as one segmented thing. */}
      <View style={fs.rail}>
        <Pressable
          onPress={onSort}
          accessibilityRole="button"
          accessibilityLabel={`Sort, currently ${sortLabel}`}
          android_ripple={{ color: 'rgba(15,23,42,0.06)' }}
          style={fs.segment}
        >
          <ArrowUpDown size={14} color="#1a1a1a" strokeWidth={2.2} />
          <Text style={fs.segmentText}>Sort</Text>
        </Pressable>

        <View style={fs.railDivider} />

        <Pressable
          onPress={onFilter}
          accessibilityRole="button"
          accessibilityLabel={`Filter${active ? `, ${activeFiltersCount} active` : ''}`}
          android_ripple={{ color: active ? 'rgba(255,255,255,0.18)' : 'rgba(15,23,42,0.06)' }}
          style={[fs.segment, active && fs.segmentActive]}
        >
          <SlidersHorizontal size={14} color={active ? '#ffffff' : '#1a1a1a'} strokeWidth={2.2} />
          <Text style={[fs.segmentText, active && fs.segmentTextActive]}>Filter</Text>
          {active ? (
            <View style={fs.count}>
              <Text style={fs.countText}>{activeFiltersCount}</Text>
            </View>
          ) : null}
        </Pressable>
      </View>
    </View>
  );
}

const fs = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#eef0f3',
  },
  resultText: {
    fontFamily: Fonts.sansSemibold,
    fontSize: 12.5,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  sortedRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  sortedDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: Palette.primary },
  sortedText: { fontFamily: Fonts.sans, fontSize: 11.5, color: '#8b8079' },

  rail: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e4e7eb',
    borderRadius: 11,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
  },
  railDivider: { width: 1, alignSelf: 'stretch', backgroundColor: '#e4e7eb' },
  segment: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 38,
    paddingHorizontal: 14,
  },
  segmentActive: { backgroundColor: Palette.primary },
  segmentText: {
    fontFamily: Fonts.sansSemibold,
    fontSize: 13,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  segmentTextActive: { color: '#ffffff' },
  count: {
    minWidth: 17,
    height: 17,
    borderRadius: 8.5,
    paddingHorizontal: 5,
    backgroundColor: 'rgba(255,255,255,0.26)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: {
    fontFamily: Fonts.sansBold,
    fontSize: 10.5,
    fontWeight: '700',
    color: '#ffffff',
  },
});

// ─── Hero Banner ─────────────────────────────────────────────────────────────
function HeroBanner({
  category,
  subcategory,
  collection,
}: {
  category: string;
  subcategory: string;
  collection: string;
}) {
  const collectionLabel = COLLECTIONS.find((c) => c.key === collection)?.label;

  const title = category
    ? subcategory
      ? `${category} › ${subcategory}`
      : category
    : collectionLabel
      ? collectionLabel
      : 'Our Collection';

  const subtitle = category
    ? 'Browse our selection of premium quality products'
    : collectionLabel
      ? `Discover our ${collectionLabel.toLowerCase()} picks`
      : 'Discover authentic handcrafted textiles made by skilled artisans';

  return (
    <View
      style={{
        backgroundColor: Palette.primary,
        marginBottom: 12,
        marginHorizontal: -16, // bleed to edge (list has px-16 padding)
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 22,
      }}
    >
      <Text
        numberOfLines={1}
        style={{
          fontFamily: Fonts.heading,
          color: '#ffffff',
          fontSize: 22,
          // Poppins is static: the weight must name the loaded file
          // (Poppins_600SemiBold), or Android fakes a bold over it.
          fontWeight: '600',
          letterSpacing: -0.3,
          marginBottom: 4,
        }}
      >
        {title}
      </Text>
      <Text
        numberOfLines={2}
        style={{
          fontFamily: Fonts.sans,
          // Was #9ca3af — Tailwind's grey-400, a cool neutral meant for a white
          // page. On the brand-red banner it reads muddy and barely separates
          // from the ground. onBrandMuted is the brand's own soft tint, which
          // is what this band is for.
          color: Palette.onBrandMuted,
          fontSize: 13,
          lineHeight: 18,
        }}
      >
        {subtitle}
      </Text>
    </View>
  );
}

// ─── Pagination Bar ────────────────────────────────────────────────────────────
function PaginationBar({
  page,
  totalPages,
  onPrev,
  onNext,
}: {
  page: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 24,
        gap: 12,
      }}
    >
      <Pressable
        onPress={onPrev}
        disabled={page <= 1}
        accessibilityRole="button"
        accessibilityLabel="Previous page"
        style={({ pressed }) => ({
          paddingHorizontal: 18,
          height: 40,
          borderRadius: 10,
          borderWidth: 1.5,
          borderColor: page <= 1 ? '#e5e7eb' : '#d1d5db',
          backgroundColor: '#ffffff',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: page <= 1 ? 0.4 : pressed ? 0.7 : 1,
        })}
      >
        <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827' }}>← Prev</Text>
      </Pressable>

      <View
        style={{
          paddingHorizontal: 16,
          height: 40,
          borderRadius: 10,
          backgroundColor: '#f3f4f6',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ fontSize: 13, fontWeight: '700', color: '#374151' }}>
          {page} / {totalPages}
        </Text>
      </View>

      <Pressable
        onPress={onNext}
        disabled={page >= totalPages}
        accessibilityRole="button"
        accessibilityLabel="Next page"
        style={({ pressed }) => ({
          paddingHorizontal: 18,
          height: 40,
          borderRadius: 10,
          borderWidth: 1.5,
          borderColor: page >= totalPages ? '#e5e7eb' : '#d1d5db',
          backgroundColor: '#ffffff',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: page >= totalPages ? 0.4 : pressed ? 0.7 : 1,
        })}
      >
        <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827' }}>Next →</Text>
      </Pressable>
    </View>
  );
}

// (Footer replaced inline above — pagination bar and load-more now rendered directly)

function ListEmpty({
  state,
  hasActiveFilters,
  onClearAll,
  onRetry,
}: {
  state: LoadState;
  hasActiveFilters: boolean;
  onClearAll: () => void;
  onRetry: () => void;
}) {
  if (state === 'initial') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 48 }}>
        <ActivityIndicator size="large" color="#111827" />
        <Text style={{ marginTop: 12, color: '#6b7280', fontSize: 13 }}>
          Loading products…
        </Text>
      </View>
    );
  }
  if (state === 'error') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 48 }}>
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: 32,
            backgroundColor: '#fef2f2',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 12,
          }}
        >
          <PackageSearch size={28} color="#dc2626" strokeWidth={1.5} />
        </View>
        <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 4 }}>
          {"Couldn't load products"}
        </Text>
        <Text style={{ color: '#6b7280', fontSize: 13, textAlign: 'center', marginBottom: 16 }}>
          Check your connection and try again.
        </Text>
        <Pressable onPress={onRetry} accessibilityRole="button" accessibilityLabel="Retry">
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: Palette.primary,
              paddingHorizontal: 20,
              height: 40,
              borderRadius: 10,
            }}
          >
            <RefreshCw size={14} color="#ffffff" />
            <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: 14, marginLeft: 6 }}>
              Try again
            </Text>
          </View>
        </Pressable>
      </View>
    );
  }
  // empty
  return (
    <EmptyState
      icon={Search}
      title="No products found"
      subtitle="Try adjusting your filters or search terms."
      ctaLabel={hasActiveFilters ? 'Clear all filters' : undefined}
      onPress={hasActiveFilters ? onClearAll : undefined}
    />
  );
}

// ─── Modals ───────────────────────────────────────────────────────────────

/**
 * Sort sheet.
 *
 * Was four identical rows behind four identical radio dots, so choosing a sort
 * meant reading every label. Each option now carries its own glyph and a line
 * saying what it actually does, and the chosen one is a filled brand card with
 * a left accent rail rather than a dot you have to hunt for. The sheet springs
 * up instead of sliding, and each row fades in behind it on a short stagger.
 */
function SortModal({
  visible,
  value,
  onChange,
  onClose,
}: {
  visible: boolean;
  value: SortKey;
  onChange: (k: SortKey) => void;
  onClose: () => void;
}) {
  if (!visible) return null;
  return <SortSheet value={value} onChange={onChange} onClose={onClose} />;
}

/** What each sort actually does, and the glyph that says so at a glance. */
const SORT_META: Record<SortKey, { icon: any; hint: string }> = {
  newest: { icon: Sparkles, hint: 'Latest arrivals first' },
  price_asc: { icon: ArrowUpNarrowWide, hint: 'Cheapest first' },
  price_desc: { icon: ArrowDownNarrowWide, hint: 'Most expensive first' },
  rating_desc: { icon: Star, hint: 'Best reviewed first' },
};

function SortSheet({
  value,
  onChange,
  onClose,
}: {
  value: SortKey;
  onChange: (k: SortKey) => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const lift = useSharedValue(340);
  const fade = useSharedValue(0);

  useEffect(() => {
    lift.value = withSpring(0, { damping: 20, stiffness: 200, mass: 0.75 });
    fade.value = withTiming(1, { duration: 200 });
    // Shared values are stable; this is a mount-only entrance.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scrimStyle = useAnimatedStyle(() => ({ opacity: fade.value }));
  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: lift.value }] }));

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Animated.View style={[StyleSheet.absoluteFill, sm.scrim, scrimStyle]} />
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityLabel="Close sort menu"
        />

        <Animated.View style={[sm.sheet, { paddingBottom: Math.max(insets.bottom, 16) }, sheetStyle]}>
          <View style={sm.handleWrap}>
            <View style={sm.handle} />
          </View>

          <View style={sm.head}>
            <View style={sm.headIcon}>
              <ArrowUpDown size={17} color={Palette.primary} strokeWidth={2.2} />
            </View>
            <Text style={sm.headTitle}>Sort by</Text>
            <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Close">
              <X size={20} color="#9ca3af" />
            </Pressable>
          </View>

          <View style={sm.list}>
            {SORT_OPTIONS.map((opt, i) => (
              <SortRow
                key={opt.key}
                index={i}
                label={opt.label}
                hint={SORT_META[opt.key].hint}
                Icon={SORT_META[opt.key].icon}
                selected={opt.key === value}
                onPress={() => onChange(opt.key)}
              />
            ))}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

function SortRow({
  index,
  label,
  hint,
  Icon,
  selected,
  onPress,
}: {
  index: number;
  label: string;
  hint: string;
  Icon: any;
  selected: boolean;
  onPress: () => void;
}) {
  const enter = useSharedValue(0);

  useEffect(() => {
    // Rows arrive just behind the sheet, one after another.
    enter.value = withDelay(90 + index * 55, withTiming(1, { duration: 240 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: enter.value,
    transform: [{ translateY: (1 - enter.value) * 14 }],
  }));

  return (
    <Animated.View style={style}>
      <Pressable
        onPress={onPress}
        accessibilityRole="radio"
        accessibilityState={{ selected }}
        accessibilityLabel={`${label}. ${hint}`}
        android_ripple={{ color: 'rgba(224,26,27,0.08)' }}
        style={[sm.row, selected && sm.rowSelected]}
      >
        {/* Accent rail — present only on the chosen row. */}
        {selected ? <View style={sm.rail} /> : null}

        <View style={[sm.tile, selected && sm.tileSelected]}>
          <Icon size={17} color={selected ? '#ffffff' : '#8b8079'} strokeWidth={2.1} />
        </View>

        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[sm.label, selected && sm.labelSelected]}>{label}</Text>
          <Text style={sm.hint}>{hint}</Text>
        </View>

        {selected ? (
          <View style={sm.tick}>
            <Check size={13} color="#ffffff" strokeWidth={3} />
          </View>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

const sm = StyleSheet.create({
  scrim: { backgroundColor: 'rgba(15,23,42,0.5)' },
  sheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    overflow: 'hidden',
  },

  handleWrap: { alignItems: 'center', paddingTop: 10, paddingBottom: 2 },
  handle: { width: 38, height: 4, borderRadius: 2, backgroundColor: '#e5e7eb' },

  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 14,
  },
  headIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(224,26,27,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headTitle: {
    flex: 1,
    fontFamily: Fonts.heading,
    fontSize: 18,
    // Poppins is static: the weight must name the loaded file.
    fontWeight: '600',
    letterSpacing: -0.4,
    color: '#1a1a1a',
  },

  list: { paddingHorizontal: 14, paddingBottom: 8, gap: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingLeft: 16,
    paddingRight: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#eef0f3',
    backgroundColor: '#ffffff',
    overflow: 'hidden',
  },
  rowSelected: { borderColor: 'rgba(224,26,27,0.3)', backgroundColor: '#fff6f6' },
  rail: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: Palette.primary,
  },

  tile: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#f4f5f7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileSelected: { backgroundColor: Palette.primary },

  label: {
    fontFamily: Fonts.sansSemibold,
    fontSize: 14.5,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  labelSelected: { fontFamily: Fonts.sansBold, fontWeight: '700' },
  hint: { fontFamily: Fonts.sans, fontSize: 11.5, color: '#8b8079', marginTop: 1 },

  tick: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

function FilterModal({
  visible,
  filters,
  facets,
  onApply,
  onClose,
}: {
  visible: boolean;
  filters: Filters;
  facets: ProductFacets | null;
  onApply: (f: FilterFields) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<FilterFields>({
    category: filters.category,
    subCategory: filters.subCategory,
    minPrice: filters.minPrice,
    maxPrice: filters.maxPrice,
    minRating: filters.minRating,
    inStockOnly: filters.inStockOnly,
    newArrivals: filters.newArrivals,
    collection: filters.collection,
    minDiscount: filters.minDiscount,
    colors: filters.colors,
    sizes: filters.sizes,
    materials: filters.materials,
    fabricTypes: filters.fabricTypes,
  });
  const [minPriceInput, setMinPriceInput] = useState(
    filters.minPrice != null ? String(filters.minPrice) : '',
  );
  const [maxPriceInput, setMaxPriceInput] = useState(
    filters.maxPrice != null ? String(filters.maxPrice) : '',
  );
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    if (!visible) return;
    // Re-sync draft from parent filters when modal opens (never carry stale values).
    setDraft({
      category: filters.category,
      subCategory: filters.subCategory,
      minPrice: filters.minPrice,
      maxPrice: filters.maxPrice,
      minRating: filters.minRating,
      inStockOnly: filters.inStockOnly,
      newArrivals: filters.newArrivals,
      collection: filters.collection,
      minDiscount: filters.minDiscount,
      colors: filters.colors,
      sizes: filters.sizes,
      materials: filters.materials,
      fabricTypes: filters.fabricTypes,
    });
    setMinPriceInput(filters.minPrice != null ? String(filters.minPrice) : '');
    setMaxPriceInput(filters.maxPrice != null ? String(filters.maxPrice) : '');
  }, [visible, filters]);

  useEffect(() => {
    if (!visible || categories.length > 0) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await categoryService.getAllCategories({
          status: 'ACTIVE',
          showRootOnly: 'true',
          includeSubcategories: 'true',
        });
        if (!cancelled && res.success && res.data) setCategories(res.data);
      } catch (err) {
        console.error('Failed to load categories for filter:', err);
      }
    })();
    return () => { cancelled = true; };
  }, [visible, categories.length]);

  const apply = () => {
    onApply({
      category: draft.category,
      subCategory: draft.subCategory,
      inStockOnly: draft.inStockOnly,
      newArrivals: draft.newArrivals,
      collection: draft.collection,
      minDiscount: draft.minDiscount,
      minRating: draft.minRating,
      minPrice: minPriceInput ? Number(minPriceInput) : undefined,
      maxPrice: maxPriceInput ? Number(maxPriceInput) : undefined,
      colors: draft.colors,
      sizes: draft.sizes,
      materials: draft.materials,
      fabricTypes: draft.fabricTypes,
    });
  };

  const reset = () => {
    setDraft({
      category: '',
      subCategory: '',
      minPrice: undefined,
      maxPrice: undefined,
      minRating: 0,
      inStockOnly: false,
      newArrivals: false,
      collection: '',
      minDiscount: 0,
      colors: [],
      sizes: [],
      materials: [],
      fabricTypes: [],
    });
    setMinPriceInput('');
    setMaxPriceInput('');
  };

  // Count active draft filters for the Apply button label
  const draftCount =
    (draft.category ? 1 : 0) +
    (draft.subCategory ? 1 : 0) +
    (draft.inStockOnly ? 1 : 0) +
    (draft.newArrivals ? 1 : 0) +
    (draft.collection ? 1 : 0) +
    (draft.minDiscount > 0 ? 1 : 0) +
    (draft.minRating > 0 ? 1 : 0) +
    (minPriceInput || maxPriceInput ? 1 : 0) +
    (draft.colors.length > 0 ? 1 : 0) +
    (draft.sizes.length > 0 ? 1 : 0) +
    (draft.materials.length > 0 ? 1 : 0) +
    (draft.fabricTypes.length > 0 ? 1 : 0);

  const toggleInDraft = (field: 'colors' | 'sizes' | 'materials' | 'fabricTypes', value: string) => {
    setDraft((d) => ({
      ...d,
      [field]: d[field].includes(value)
        ? d[field].filter((x) => x !== value)
        : [...d[field], value],
    }));
  };

  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <Pressable
          onPress={onClose}
          accessibilityLabel="Close filters"
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}
        >
          <Pressable>
            <View
              style={{
                backgroundColor: '#f9fafb',
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                maxHeight: Dimensions.get('window').height * 0.88,
                // Use flex column so body scrolls and footer is always visible
                flexDirection: 'column',
              }}
            >
              {/* Drag handle */}
              <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 2, backgroundColor: '#ffffff', borderTopLeftRadius: 24, borderTopRightRadius: 24 }}>
                <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: '#e5e7eb' }} />
              </View>

              {/* Header */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 20,
                  paddingTop: 14,
                  paddingBottom: 14,
                  backgroundColor: '#ffffff',
                  borderBottomWidth: 1,
                  borderBottomColor: '#f3f4f6',
                }}
              >
                <View style={fm.headIcon}>
                  <SlidersHorizontal size={17} color={Palette.primary} strokeWidth={2.2} />
                </View>
                <View style={{ flex: 1, marginLeft: 11 }}>
                  <Text style={fm.headTitle}>Filters</Text>
                  {/* Counts as you go, so the sheet says what it will do before
                      you commit to it. */}
                  <Text style={fm.headSub}>
                    {draftCount > 0
                      ? `${draftCount} selected`
                      : 'Narrow down what you see'}
                  </Text>
                </View>
                {draftCount > 0 ? (
                  <Pressable
                    onPress={reset}
                    accessibilityRole="button"
                    accessibilityLabel="Reset all filters"
                    hitSlop={8}
                    style={fm.resetBtn}
                  >
                    <Text style={fm.resetText}>Reset</Text>
                  </Pressable>
                ) : null}
                <Pressable onPress={onClose} hitSlop={8} accessibilityLabel="Close">
                  <X size={20} color="#6b7280" />
                </Pressable>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ paddingBottom: 8 }}
                style={{ flexShrink: 1 }}
              >

                {/* ── Section: Availability ───────────────────────────── */}
                <View style={fm.sectionBand}>
                  <View style={fm.sectionTick} />
                  <Text style={fm.sectionLabel}>Availability</Text>
                </View>
                <Pressable
                  onPress={() => setDraft((d) => ({ ...d, inStockOnly: !d.inStockOnly }))}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: draft.inStockOnly }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#ffffff' }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 15, color: '#111827', fontWeight: '500' }}>In stock only</Text>
                      <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 1 }}>Show only available items</Text>
                    </View>
                    {/* Toggle pill */}
                    <View
                      style={{
                        width: 44,
                        height: 26,
                        borderRadius: 13,
                        backgroundColor: draft.inStockOnly ? '#111827' : '#e5e7eb',
                        justifyContent: 'center',
                        paddingHorizontal: 3,
                        alignItems: draft.inStockOnly ? 'flex-end' : 'flex-start',
                      }}
                    >
                      <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: '#ffffff', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 2, elevation: 2 }} />
                    </View>
                  </View>
                </Pressable>

                <Pressable
                  onPress={() => setDraft((d) => ({ ...d, newArrivals: !d.newArrivals }))}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: draft.newArrivals }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#ffffff', borderTopWidth: 1, borderTopColor: '#f9fafb' }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 15, color: '#111827', fontWeight: '500' }}>New Arrivals</Text>
                      <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 1 }}>Show the latest products</Text>
                    </View>
                    {/* Toggle pill */}
                    <View
                      style={{
                        width: 44,
                        height: 26,
                        borderRadius: 13,
                        backgroundColor: draft.newArrivals ? '#111827' : '#e5e7eb',
                        justifyContent: 'center',
                        paddingHorizontal: 3,
                        alignItems: draft.newArrivals ? 'flex-end' : 'flex-start',
                      }}
                    >
                      <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: '#ffffff', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 2, elevation: 2 }} />
                    </View>
                  </View>
                </Pressable>

                {/* ── Section: Collections ─────────────────────────────── */}
                <View style={fm.sectionBand}>
                  <View style={fm.sectionTick} />
                  <Text style={fm.sectionLabel}>Collections</Text>
                </View>
                <View style={{ backgroundColor: '#ffffff' }}>
                  <CategoryRadio
                    label="All Products"
                    selected={!draft.collection}
                    onPress={() => setDraft((d) => ({ ...d, collection: '' }))}
                  />
                  {COLLECTIONS.map((c) => (
                    <CategoryRadio
                      key={c.key}
                      label={c.label}
                      selected={draft.collection === c.key}
                      onPress={() => setDraft((d) => ({ ...d, collection: c.key }))}
                    />
                  ))}
                </View>

                {/* ── Section: Price Range ─────────────────────────────── */}
                <View style={fm.sectionBand}>
                  <View style={fm.sectionTick} />
                  <Text style={fm.sectionLabel}>Price Range ($)</Text>
                </View>
                <View style={{ backgroundColor: '#ffffff', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20 }}>
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    {/* Min price */}
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 11, fontWeight: '600', color: '#6b7280', marginBottom: 6 }}>Minimum</Text>
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          borderWidth: 1.5,
                          borderColor: minPriceInput ? '#111827' : '#e5e7eb',
                          borderRadius: 10,
                          backgroundColor: '#f9fafb',
                          paddingHorizontal: 12,
                          height: 46,
                        }}
                      >
                        <Text style={{ fontSize: 15, color: '#6b7280', marginRight: 4 }}>$</Text>
                        <TextInput
                          value={minPriceInput}
                          onChangeText={setMinPriceInput}
                          placeholder="0"
                          placeholderTextColor="#9ca3af"
                          keyboardType="numeric"
                          style={{ flex: 1, fontSize: 15, color: '#111827', fontWeight: '600' }}
                        />
                      </View>
                    </View>
                    {/* Max price */}
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 11, fontWeight: '600', color: '#6b7280', marginBottom: 6 }}>Maximum</Text>
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          borderWidth: 1.5,
                          borderColor: maxPriceInput ? '#111827' : '#e5e7eb',
                          borderRadius: 10,
                          backgroundColor: '#f9fafb',
                          paddingHorizontal: 12,
                          height: 46,
                        }}
                      >
                        <Text style={{ fontSize: 15, color: '#6b7280', marginRight: 4 }}>$</Text>
                        <TextInput
                          value={maxPriceInput}
                          onChangeText={setMaxPriceInput}
                          placeholder="Any"
                          placeholderTextColor="#9ca3af"
                          keyboardType="numeric"
                          style={{ flex: 1, fontSize: 15, color: '#111827', fontWeight: '600' }}
                        />
                      </View>
                    </View>
                  </View>
                </View>

                {/* ── Section: Categories ──────────────────────────────── */}
                <View style={fm.sectionBand}>
                  <View style={fm.sectionTick} />
                  <Text style={fm.sectionLabel}>Category</Text>
                </View>
                <View style={{ backgroundColor: '#ffffff' }}>
                  <CategoryRadio
                    label="All Categories"
                    selected={!draft.category}
                    onPress={() => setDraft((d) => ({ ...d, category: '', subCategory: '' }))}
                  />
                  {categories.map((cat) => {
                    const isParentSelected = draft.category === cat.name;
                    return (
                      <View key={cat.id}>
                        <CategoryRadio
                          label={cat.name}
                          selected={isParentSelected && !draft.subCategory}
                          onPress={() => setDraft((d) => ({ ...d, category: cat.name, subCategory: '' }))}
                        />
                        {isParentSelected && cat.subcategories && cat.subcategories.length > 0
                          ? cat.subcategories.map((sub) => (
                              <CategoryRadio
                                key={sub.id}
                                label={sub.name}
                                selected={draft.subCategory === sub.name}
                                indent
                                onPress={() => setDraft((d) => ({ ...d, category: cat.name, subCategory: sub.name }))}
                              />
                            ))
                          : null}
                      </View>
                    );
                  })}
                </View>

                {/* ── Section: Customer Reviews ────────────────────────── */}
                <View style={fm.sectionBand}>
                  <View style={fm.sectionTick} />
                  <Text style={fm.sectionLabel}>Customer Reviews</Text>
                </View>
                <View style={{ backgroundColor: '#ffffff' }}>
                  {RATING_OPTIONS.map((opt, idx) => {
                    const selected = draft.minRating === opt.value;
                    return (
                      <Pressable
                        key={opt.value}
                        onPress={() => setDraft((d) => ({ ...d, minRating: opt.value }))}
                        accessibilityRole="radio"
                        accessibilityState={{ selected }}
                      >
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            paddingHorizontal: 20,
                            paddingVertical: 13,
                            borderBottomWidth: idx < RATING_OPTIONS.length - 1 ? 1 : 0,
                            borderBottomColor: '#f3f4f6',
                            backgroundColor: selected ? '#f9fafb' : '#ffffff',
                          }}
                        >
                          {/* Radio dot */}
                          <View
                            style={{
                              width: 20,
                              height: 20,
                              borderRadius: 10,
                              borderWidth: 2,
                              borderColor: selected ? '#111827' : '#d1d5db',
                              alignItems: 'center',
                              justifyContent: 'center',
                              marginRight: 14,
                            }}
                          >
                            {selected ? (
                              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: Palette.primary }} />
                            ) : null}
                          </View>

                          {/* Stars row (5 stars, filled up to opt.value) */}
                          {opt.value > 0 ? (
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 6 }}>
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star
                                  key={i}
                                  size={14}
                                  color={i < opt.value ? '#facc15' : '#e5e7eb'}
                                  fill={i < opt.value ? '#facc15' : '#e5e7eb'}
                                  strokeWidth={1}
                                />
                              ))}
                            </View>
                          ) : null}

                          <Text
                            style={{
                              fontSize: 14,
                              color: '#111827',
                              fontWeight: selected ? '600' : '400',
                              flex: 1,
                            }}
                          >
                            {opt.label}
                          </Text>

                          {selected ? <Check size={16} color="#111827" strokeWidth={2.5} /> : null}
                        </View>
                      </Pressable>
                    );
                  })}
                </View>

                {/* ── Section: Discount ────────────────────────────────── */}
                {facets && facets.maxDiscount >= 10 ? (
                  <>
                    <View style={fm.sectionBand}>
                  <View style={fm.sectionTick} />
                      <Text style={fm.sectionLabel}>Discount</Text>
                    </View>
                    <View style={{ backgroundColor: '#ffffff' }}>
                      {DISCOUNT_BUCKETS.filter((d) => d <= facets.maxDiscount).map((d, idx) => {
                        const selected = draft.minDiscount === d;
                        return (
                          <Pressable
                            key={d}
                            onPress={() => setDraft((dd) => ({ ...dd, minDiscount: dd.minDiscount === d ? 0 : d }))}
                            accessibilityRole="radio"
                            accessibilityState={{ selected }}
                          >
                            <View
                              style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                paddingHorizontal: 20,
                                paddingVertical: 14,
                                borderBottomWidth: idx < DISCOUNT_BUCKETS.filter((x) => x <= facets.maxDiscount).length - 1 ? 1 : 0,
                                borderBottomColor: '#f3f4f6',
                                backgroundColor: selected ? '#f9fafb' : '#ffffff',
                              }}
                            >
                              <View
                                style={{
                                  width: 20,
                                  height: 20,
                                  borderRadius: 10,
                                  borderWidth: 2,
                                  borderColor: selected ? '#111827' : '#d1d5db',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  marginRight: 14,
                                }}
                              >
                                {selected ? (
                                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: Palette.primary }} />
                                ) : null}
                              </View>
                              <Text
                                style={{
                                  flex: 1,
                                  fontSize: 14,
                                  color: '#111827',
                                  fontWeight: selected ? '600' : '400',
                                }}
                              >
                                {d}% and above
                              </Text>
                              {selected ? <Check size={16} color="#111827" strokeWidth={2.5} /> : null}
                            </View>
                          </Pressable>
                        );
                      })}
                    </View>
                  </>
                ) : null}

                {/* ── Section: Color ───────────────────────────────────── */}
                {facets && facets.colors.length > 0 ? (
                  <>
                    <View style={fm.sectionBand}>
                  <View style={fm.sectionTick} />
                      <Text style={fm.sectionLabel}>
                        Color ({facets.colors.length})
                      </Text>
                    </View>
                    <View style={{ backgroundColor: '#ffffff', paddingHorizontal: 20, paddingVertical: 16 }}>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                        {facets.colors.map((c) => {
                          const active = draft.colors.includes(c.value);
                          return (
                            <Pressable
                              key={c.value}
                              onPress={() => toggleInDraft('colors', c.value)}
                              accessibilityRole="checkbox"
                              accessibilityState={{ checked: active }}
                            >
                              <View
                                style={{
                                  flexDirection: 'row',
                                  alignItems: 'center',
                                  paddingHorizontal: 12,
                                  height: 32,
                                  borderRadius: 16,
                                  borderWidth: 1,
                                  borderColor: active ? '#111827' : '#e5e7eb',
                                  backgroundColor: active ? '#f9fafb' : '#ffffff',
                                  gap: 6,
                                }}
                              >
                                <View
                                  style={{
                                    width: 16,
                                    height: 16,
                                    borderRadius: 8,
                                    backgroundColor: c.hex || '#cccccc',
                                    borderWidth: 1,
                                    borderColor: 'rgba(0,0,0,0.1)',
                                  }}
                                />
                                <Text style={{ fontSize: 12, fontWeight: '600', color: '#111827' }}>
                                  {c.value}
                                </Text>
                                <Text style={{ fontSize: 11, color: '#9ca3af' }}>{c.count}</Text>
                              </View>
                            </Pressable>
                          );
                        })}
                      </View>
                    </View>
                  </>
                ) : null}

                {/* ── Section: Size ────────────────────────────────────── */}
                {facets && facets.sizes.length > 0 ? (
                  <>
                    <View style={fm.sectionBand}>
                  <View style={fm.sectionTick} />
                      <Text style={fm.sectionLabel}>
                        Size ({facets.sizes.length})
                      </Text>
                    </View>
                    <View style={{ backgroundColor: '#ffffff', paddingHorizontal: 20, paddingVertical: 16 }}>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                        {facets.sizes.map((s) => {
                          const active = draft.sizes.includes(s.value);
                          return (
                            <Pressable
                              key={s.value}
                              onPress={() => toggleInDraft('sizes', s.value)}
                              accessibilityRole="checkbox"
                              accessibilityState={{ checked: active }}
                            >
                              <View
                                style={{
                                  paddingHorizontal: 14,
                                  height: 32,
                                  borderRadius: 8,
                                  borderWidth: 1,
                                  borderColor: active ? '#111827' : '#e5e7eb',
                                  backgroundColor: active ? '#f9fafb' : '#ffffff',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                <Text style={{ fontSize: 12, fontWeight: '600', color: '#111827' }}>
                                  {s.value}
                                </Text>
                              </View>
                            </Pressable>
                          );
                        })}
                      </View>
                    </View>
                  </>
                ) : null}

                {/* ── Section: Material ────────────────────────────────── */}
                {facets && facets.materials.length > 0 ? (
                  <>
                    <View style={fm.sectionBand}>
                  <View style={fm.sectionTick} />
                      <Text style={fm.sectionLabel}>Material</Text>
                    </View>
                    <View style={{ backgroundColor: '#ffffff' }}>
                      {facets.materials.map((m, idx) => {
                        const active = draft.materials.includes(m.value);
                        return (
                          <Pressable
                            key={m.value}
                            onPress={() => toggleInDraft('materials', m.value)}
                            accessibilityRole="checkbox"
                            accessibilityState={{ checked: active }}
                          >
                            <View
                              style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                paddingHorizontal: 20,
                                paddingVertical: 13,
                                borderBottomWidth: idx < facets.materials.length - 1 ? 1 : 0,
                                borderBottomColor: '#f3f4f6',
                              }}
                            >
                              <View
                                style={{
                                  width: 18,
                                  height: 18,
                                  borderRadius: 5,
                                  borderWidth: 2,
                                  borderColor: active ? '#111827' : '#d1d5db',
                                  backgroundColor: active ? '#111827' : '#ffffff',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  marginRight: 12,
                                }}
                              >
                                {active ? <Check size={12} color="#ffffff" strokeWidth={3} /> : null}
                              </View>
                              <Text
                                style={{
                                  flex: 1,
                                  fontSize: 14,
                                  color: '#111827',
                                  fontWeight: active ? '600' : '400',
                                }}
                              >
                                {m.value}
                              </Text>
                              <Text style={{ fontSize: 12, color: '#9ca3af' }}>{m.count}</Text>
                            </View>
                          </Pressable>
                        );
                      })}
                    </View>
                  </>
                ) : null}

                {/* ── Section: Fabric Type ─────────────────────────────── */}
                {facets && facets.fabricTypes.length > 0 ? (
                  <>
                    <View style={fm.sectionBand}>
                  <View style={fm.sectionTick} />
                      <Text style={fm.sectionLabel}>Fabric Type</Text>
                    </View>
                    <View style={{ backgroundColor: '#ffffff' }}>
                      {facets.fabricTypes.map((f, idx) => {
                        const active = draft.fabricTypes.includes(f.value);
                        return (
                          <Pressable
                            key={f.value}
                            onPress={() => toggleInDraft('fabricTypes', f.value)}
                            accessibilityRole="checkbox"
                            accessibilityState={{ checked: active }}
                          >
                            <View
                              style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                paddingHorizontal: 20,
                                paddingVertical: 13,
                                borderBottomWidth: idx < facets.fabricTypes.length - 1 ? 1 : 0,
                                borderBottomColor: '#f3f4f6',
                              }}
                            >
                              <View
                                style={{
                                  width: 18,
                                  height: 18,
                                  borderRadius: 5,
                                  borderWidth: 2,
                                  borderColor: active ? '#111827' : '#d1d5db',
                                  backgroundColor: active ? '#111827' : '#ffffff',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  marginRight: 12,
                                }}
                              >
                                {active ? <Check size={12} color="#ffffff" strokeWidth={3} /> : null}
                              </View>
                              <Text
                                style={{
                                  flex: 1,
                                  fontSize: 14,
                                  color: '#111827',
                                  fontWeight: active ? '600' : '400',
                                }}
                              >
                                {f.value}
                              </Text>
                              <Text style={{ fontSize: 12, color: '#9ca3af' }}>{f.count}</Text>
                            </View>
                          </Pressable>
                        );
                      })}
                    </View>
                  </>
                ) : null}

              </ScrollView>

              {/* ── Footer Buttons ────────────────────────────────────── */}
              <View
                style={{
                  flexDirection: 'row',
                  gap: 12,
                  paddingHorizontal: 20,
                  paddingTop: 14,
                  // Clear the device's bottom safe area (home indicator / Android nav bar)
                  paddingBottom: Math.max(insets.bottom, 16) + 6,
                  backgroundColor: '#ffffff',
                  borderTopWidth: 1,
                  borderTopColor: '#f3f4f6',
                  // Ensure footer never scrolls away
                  flexShrink: 0,
                }}
              >
                <Pressable
                  onPress={onClose}
                  accessibilityRole="button"
                  accessibilityLabel="Cancel"
                  android_ripple={{ color: 'rgba(15,23,42,0.06)' }}
                  style={fm.cancelBtn}
                >
                  <Text style={fm.cancelText}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={apply}
                  accessibilityRole="button"
                  accessibilityLabel="Apply filters"
                  android_ripple={{ color: 'rgba(255,255,255,0.18)' }}
                  style={fm.applyBtn}
                >
                  <Text style={fm.applyText}>
                    {draftCount > 0
                      ? `Apply ${draftCount} Filter${draftCount > 1 ? 's' : ''}`
                      : 'Show Results'}
                  </Text>
                </Pressable>
              </View>
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const fm = StyleSheet.create({
  sectionBand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 8,
  },
  sectionTick: { width: 3, height: 12, borderRadius: 2, backgroundColor: Palette.primary },
  sectionLabel: {
    fontFamily: Fonts.sansBold,
    fontSize: 11,
    // Outfit is static: the weight must name the loaded file (Outfit_700Bold).
    fontWeight: '700',
    color: '#5f5550',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },

  headIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(224,26,27,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headTitle: {
    fontFamily: Fonts.heading,
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: -0.4,
    color: '#1a1a1a',
  },
  headSub: { fontFamily: Fonts.sans, fontSize: 11.5, color: '#8b8079', marginTop: 1 },
  resetBtn: {
    marginRight: 12,
    paddingHorizontal: 12,
    height: 32,
    justifyContent: 'center',
    borderRadius: 999,
    backgroundColor: '#f4f5f7',
  },
  resetText: {
    fontFamily: Fonts.sansSemibold,
    fontSize: 12.5,
    fontWeight: '600',
    color: '#5f5550',
  },

  cancelBtn: {
    height: 52,
    paddingHorizontal: 24,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  cancelText: {
    fontFamily: Fonts.sansSemibold,
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  applyBtn: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    backgroundColor: Palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  applyText: {
    fontFamily: Fonts.sansBold,
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
});

function CategoryRadio({
  label,
  selected,
  indent,
  onPress,
}: {
  label: string;
  selected: boolean;
  indent?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      style={({ pressed }) => ({
        backgroundColor: pressed ? '#f9fafb' : selected ? '#fafafa' : '#ffffff',
      })}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 20,
          paddingLeft: indent ? 48 : 20,
          paddingVertical: 13,
          borderBottomWidth: 1,
          borderBottomColor: '#f3f4f6',
          borderLeftWidth: indent ? 3 : 0,
          borderLeftColor: indent && selected ? '#111827' : '#e5e7eb',
        }}
      >
        <View
          style={{
            width: indent ? 16 : 18,
            height: indent ? 16 : 18,
            borderRadius: indent ? 8 : 9,
            borderWidth: 2,
            borderColor: selected ? '#111827' : '#d1d5db',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 12,
          }}
        >
          {selected ? (
            <View
              style={{
                width: indent ? 7 : 8,
                height: indent ? 7 : 8,
                borderRadius: 5,
                backgroundColor: Palette.primary,
              }}
            />
          ) : null}
        </View>
        <Text
          style={{
            fontSize: indent ? 13 : 14,
            color: indent ? '#4b5563' : '#111827',
            fontWeight: selected ? '700' : '400',
            flex: 1,
          }}
        >
          {label}
        </Text>
        {selected ? <Check size={15} color="#111827" strokeWidth={2.5} /> : null}
      </View>
    </Pressable>
  );
}



