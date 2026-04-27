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
  StatusBar,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Search,
  ShoppingCart,
  SlidersHorizontal,
  ArrowUpDown,
  X,
  Check,
  Star,
  PackageSearch,
  RefreshCw,
} from 'lucide-react-native';

import ProductCard from '@/components/WebSite/ProductCard/ProductCard';
import {
  publicProductService,
  PublicProduct,
} from '@/services/publicProductService';
import { categoryService, Category } from '@/services/categoryService';
import { useCart } from '@/context/CartContext';

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

  const [products, setProducts] = useState<PublicProduct[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [state, setState] = useState<LoadState>('initial');
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

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
    return chips;
  }, [filters]);

  const hasActiveFilters = activeChips.length > 0 || filters.sort !== 'newest';

  // Active filter count for the badge on the Filter button — matches web's "Filters (3)" pattern.
  const activeFiltersCount = (
    (filters.category ? 1 : 0) +
    (filters.subCategory ? 1 : 0) +
    (filters.inStockOnly ? 1 : 0) +
    (filters.minRating > 0 ? 1 : 0) +
    (filters.minPrice != null || filters.maxPrice != null ? 1 : 0)
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
        columnWrapperStyle={products.length > 1 ? { gap: 12 } : undefined}
        contentContainerStyle={{
          paddingHorizontal: 16,
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
  const headerInsets = useSafeAreaInsets();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingTop: headerInsets.top + 8,
        paddingBottom: 8,
        backgroundColor: '#ffffff',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
      }}
    >
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <Pressable
        onPress={() => (router.canGoBack() ? router.back() : router.push('/(tabs)'))}
        accessibilityRole="button"
        accessibilityLabel="Go back"
        hitSlop={8}
        style={{ padding: 8 }}
      >
        <ArrowLeft size={22} color="#111827" />
      </Pressable>
      <Text
        style={{
          flex: 1,
          fontSize: 18,
          fontWeight: '700',
          color: '#111827',
          marginLeft: 4,
        }}
      >
        Products
      </Text>
      <Pressable
        onPress={() => router.push('/(tabs)/cart' as any)}
        accessibilityRole="button"
        accessibilityLabel={`Cart with ${itemCount} items`}
        hitSlop={8}
        style={{ padding: 8 }}
      >
        <View>
          <ShoppingCart size={22} color="#111827" />
          {itemCount > 0 ? (
            <View
              style={{
                position: 'absolute',
                top: -4,
                right: -6,
                backgroundColor: '#dc2626',
                minWidth: 16,
                height: 16,
                borderRadius: 8,
                paddingHorizontal: 4,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>
                {itemCount > 99 ? '99+' : itemCount}
              </Text>
            </View>
          ) : null}
        </View>
      </Pressable>
    </View>
  );
}

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
          backgroundColor: '#111827',
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
}: {
  onFilter: () => void;
  onSort: () => void;
  resultText: string;
  activeFiltersCount: number;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: '#f9fafb',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
        gap: 8,
      }}
    >
      <Text style={{ flex: 1, fontSize: 12, color: '#6b7280', lineHeight: 16 }} numberOfLines={2}>
        {resultText}
      </Text>
      <Pressable onPress={onSort} accessibilityRole="button" accessibilityLabel="Sort" hitSlop={4}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            borderWidth: 1,
            borderColor: '#e5e7eb',
            backgroundColor: '#ffffff',
            paddingHorizontal: 12,
            height: 36,
            borderRadius: 8,
          }}
        >
          <ArrowUpDown size={14} color="#111827" />
          <Text style={{ marginLeft: 6, fontSize: 13, fontWeight: '600', color: '#111827' }}>
            Sort
          </Text>
        </View>
      </Pressable>
      <Pressable onPress={onFilter} accessibilityRole="button" accessibilityLabel={`Filter${activeFiltersCount > 0 ? ` (${activeFiltersCount} active)` : ''}`} hitSlop={4}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: activeFiltersCount > 0 ? '#111827' : '#ffffff',
            paddingHorizontal: 12,
            height: 36,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: activeFiltersCount > 0 ? '#111827' : '#e5e7eb',
          }}
        >
          <SlidersHorizontal size={14} color={activeFiltersCount > 0 ? '#ffffff' : '#111827'} />
          <Text style={{ marginLeft: 6, fontSize: 13, fontWeight: '600', color: activeFiltersCount > 0 ? '#ffffff' : '#111827' }}>
            {activeFiltersCount > 0 ? `Filters (${activeFiltersCount})` : 'Filter'}
          </Text>
        </View>
      </Pressable>
    </View>
  );
}

// ─── Hero Banner ─────────────────────────────────────────────────────────────
function HeroBanner({ category, subcategory }: { category: string; subcategory: string }) {
  const title = category
    ? subcategory
      ? `${category} › ${subcategory}`
      : category
    : 'Our Collection';

  const subtitle = category
    ? 'Browse our selection of premium quality products'
    : 'Discover authentic handcrafted textiles made by skilled artisans';

  return (
    <View
      style={{
        backgroundColor: '#111827',
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
          color: '#ffffff',
          fontSize: 22,
          fontWeight: '800',
          letterSpacing: -0.3,
          marginBottom: 4,
        }}
      >
        {title}
      </Text>
      <Text
        numberOfLines={2}
        style={{
          color: '#9ca3af',
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
              backgroundColor: '#111827',
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
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 48 }}>
      <View
        style={{
          width: 64,
          height: 64,
          borderRadius: 32,
          backgroundColor: '#f3f4f6',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 12,
        }}
      >
        <Search size={28} color="#6b7280" strokeWidth={1.5} />
      </View>
      <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 4 }}>
        No products found
      </Text>
      <Text
        style={{ color: '#6b7280', fontSize: 13, textAlign: 'center', marginBottom: 16 }}
      >
        Try adjusting your filters or search terms.
      </Text>
      {hasActiveFilters ? (
        <Pressable onPress={onClearAll} accessibilityRole="button" accessibilityLabel="Clear all filters">
          <View
            style={{
              backgroundColor: '#111827',
              paddingHorizontal: 20,
              height: 40,
              borderRadius: 10,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: 14 }}>
              Clear all filters
            </Text>
          </View>
        </Pressable>
      ) : null}
    </View>
  );
}

// ─── Modals ───────────────────────────────────────────────────────────────

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
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable
        onPress={onClose}
        accessibilityLabel="Close sort menu"
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}
      >
        <Pressable>
          <View
            style={{
              backgroundColor: '#ffffff',
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              paddingBottom: 32,
            }}
          >
            {/* Drag handle */}
            <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 4 }}>
              <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: '#e5e7eb' }} />
            </View>

            {/* Header */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 20,
                paddingVertical: 14,
                borderBottomWidth: 1,
                borderBottomColor: '#f3f4f6',
              }}
            >
              <ArrowUpDown size={18} color="#374151" strokeWidth={2} />
              <Text style={{ flex: 1, fontSize: 17, fontWeight: '700', color: '#111827', marginLeft: 10 }}>
                Sort by
              </Text>
              <Pressable onPress={onClose} hitSlop={8} accessibilityLabel="Close">
                <X size={20} color="#6b7280" />
              </Pressable>
            </View>

            {/* Options */}
            <View style={{ paddingTop: 8 }}>
              {SORT_OPTIONS.map((opt, idx) => {
                const selected = opt.key === value;
                return (
                  <Pressable
                    key={opt.key}
                    onPress={() => onChange(opt.key)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    style={({ pressed }) => ({
                      backgroundColor: pressed ? '#f9fafb' : selected ? '#f9fafb' : '#ffffff',
                    })}
                  >
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingHorizontal: 20,
                        paddingVertical: 15,
                        borderBottomWidth: idx < SORT_OPTIONS.length - 1 ? 1 : 0,
                        borderBottomColor: '#f3f4f6',
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
                          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#111827' }} />
                        ) : null}
                      </View>
                      <Text
                        style={{
                          flex: 1,
                          fontSize: 15,
                          color: '#111827',
                          fontWeight: selected ? '700' : '400',
                        }}
                      >
                        {opt.label}
                      </Text>
                      {selected ? <Check size={18} color="#111827" strokeWidth={2.5} /> : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function FilterModal({
  visible,
  filters,
  onApply,
  onClose,
}: {
  visible: boolean;
  filters: Filters;
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
      minRating: draft.minRating,
      minPrice: minPriceInput ? Number(minPriceInput) : undefined,
      maxPrice: maxPriceInput ? Number(maxPriceInput) : undefined,
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
    });
    setMinPriceInput('');
    setMaxPriceInput('');
  };

  // Count active draft filters for the Apply button label
  const draftCount =
    (draft.category ? 1 : 0) +
    (draft.subCategory ? 1 : 0) +
    (draft.inStockOnly ? 1 : 0) +
    (draft.minRating > 0 ? 1 : 0) +
    (minPriceInput || maxPriceInput ? 1 : 0);

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
                <SlidersHorizontal size={18} color="#374151" strokeWidth={2} />
                <Text style={{ flex: 1, fontSize: 17, fontWeight: '700', color: '#111827', marginLeft: 10 }}>
                  Filters
                </Text>
                <Pressable onPress={reset} accessibilityRole="button" hitSlop={8}
                  style={{ marginRight: 14 }}
                >
                  <Text style={{ color: '#d97706', fontSize: 13, fontWeight: '700' }}>Reset</Text>
                </Pressable>
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
                <View style={{ backgroundColor: '#f3f4f6', paddingHorizontal: 20, paddingVertical: 8, marginTop: 8 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#6b7280', letterSpacing: 0.8, textTransform: 'uppercase' }}>Availability</Text>
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

                {/* ── Section: Price Range ─────────────────────────────── */}
                <View style={{ backgroundColor: '#f3f4f6', paddingHorizontal: 20, paddingVertical: 8, marginTop: 8 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#6b7280', letterSpacing: 0.8, textTransform: 'uppercase' }}>Price Range ($)</Text>
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
                <View style={{ backgroundColor: '#f3f4f6', paddingHorizontal: 20, paddingVertical: 8, marginTop: 8 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#6b7280', letterSpacing: 0.8, textTransform: 'uppercase' }}>Category</Text>
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
                <View style={{ backgroundColor: '#f3f4f6', paddingHorizontal: 20, paddingVertical: 8, marginTop: 8 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#6b7280', letterSpacing: 0.8, textTransform: 'uppercase' }}>Customer Reviews</Text>
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
                              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#111827' }} />
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

              </ScrollView>

              {/* ── Footer Buttons ────────────────────────────────────── */}
              <View
                style={{
                  flexDirection: 'row',
                  gap: 12,
                  paddingHorizontal: 20,
                  paddingTop: 14,
                  paddingBottom: Platform.OS === 'ios' ? 34 : 20,
                  backgroundColor: '#ffffff',
                  borderTopWidth: 1,
                  borderTopColor: '#f3f4f6',
                  // Ensure footer never scrolls away
                  flexShrink: 0,
                }}
              >
                <Pressable onPress={onClose} accessibilityRole="button">
                  <View
                    style={{
                      height: 52,
                      borderRadius: 12,
                      borderWidth: 1.5,
                      borderColor: '#e5e7eb',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: '#ffffff',
                      paddingHorizontal: 24,
                    }}
                  >
                    <Text style={{ color: '#374151', fontSize: 15, fontWeight: '600' }}>Cancel</Text>
                  </View>
                </Pressable>
                <Pressable onPress={apply} accessibilityRole="button" accessibilityLabel="Apply filters" style={{ flex: 1 }}>
                  <View
                    style={{
                      height: 52,
                      borderRadius: 12,
                      backgroundColor: '#111827',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ color: '#ffffff', fontSize: 15, fontWeight: '700' }}>
                      {draftCount > 0 ? `Apply ${draftCount} Filter${draftCount > 1 ? 's' : ''}` : 'Show Results'}
                    </Text>
                  </View>
                </Pressable>
              </View>
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

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
                backgroundColor: '#111827',
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



