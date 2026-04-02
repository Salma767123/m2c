import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  Animated,
  StatusBar,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  ShoppingCart,
  Package,
  SlidersHorizontal,
  X,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Check,
  LayoutGrid,
} from 'lucide-react-native';
import { publicProductService, PublicProduct } from '@/services/publicProductService';
import { categoryService, Category } from '@/services/categoryService';
import ProductCard from '@/components/WebSite/ProductCard/ProductCard';

// ─── Constants ────────────────────────────────────────────────────────────────
const PAGE_SIZE = 10;

const SORT_OPTIONS = [
  { label: 'Newest First',        value: 'createdAt', order: 'desc' as const, tag: undefined },
  { label: 'Oldest First',        value: 'createdAt', order: 'asc'  as const, tag: undefined },
  { label: 'Price: Low → High',   value: 'price',     order: 'asc'  as const, tag: undefined },
  { label: 'Price: High → Low',   value: 'price',     order: 'desc' as const, tag: undefined },
  { label: '⭐ Featured Products', value: 'createdAt', order: 'desc' as const, tag: 'Featured'   },
  { label: '🔥 Top Selling',       value: 'createdAt', order: 'desc' as const, tag: 'Top Selling' },
  { label: '🏆 Best Sellers',      value: 'createdAt', order: 'desc' as const, tag: 'Best Seller' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const humanise = (slug?: string) =>
  slug ? slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : '';

// ─── Skeleton Card ────────────────────────────────────────────────────────────
function SkeletonCard() {
  const anim = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1,   duration: 650, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.4, duration: 650, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return (
    <Animated.View style={{ opacity: anim, flex: 1, borderWidth: 1, borderColor: '#f3f4f6' }} className="bg-white rounded-2xl overflow-hidden mb-3">
      <View className="h-36 bg-gray-100" />
      <View className="p-3">
        <View className="h-2.5 bg-gray-100 rounded-full mb-2 w-1/2" />
        <View className="h-3 bg-gray-100 rounded-full mb-1.5 w-full" />
        <View className="h-3 bg-gray-100 rounded-full mb-3 w-3/4" />
        <View className="h-8 bg-gray-100 rounded-xl" />
      </View>
    </Animated.View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function ProductsScreen() {
  const router = useRouter();
  const {
    category: categorySlug,
    subcategory: subcategorySlug,
    categoryName: categoryNameParam,
    subcategoryName: subcategoryNameParam,
  } = useLocalSearchParams<{
    category?: string; subcategory?: string;
    categoryName?: string; subcategoryName?: string;
  }>();

  // ── Filter state ────────────────────────────────────────────────────────────
  const [filterVisible,     setFilterVisible]     = useState(false);
  const [categories,        setCategories]        = useState<Category[]>([]);
  const [selectedCategory,  setSelectedCategory]  = useState<Category | null>(null);
  const [subcategories,     setSubcategories]     = useState<Category[]>([]);
  const [selectedSub,       setSelectedSub]       = useState<Category | null>(null);
  const [sortIdx,           setSortIdx]           = useState(0);
  const [minPrice,          setMinPrice]          = useState('');
  const [maxPrice,          setMaxPrice]          = useState('');

  // draft state inside the sheet (only applies when user taps "Apply")
  const [draftCat,      setDraftCat]      = useState<Category | null>(null);
  const [draftSub,      setDraftSub]      = useState<Category | null>(null);
  const [draftSortIdx,  setDraftSortIdx]  = useState(0);
  const [draftMin,      setDraftMin]      = useState('');
  const [draftMax,      setDraftMax]      = useState('');
  const [catExpanded,   setCatExpanded]   = useState(false);
  const [subExpanded,   setSubExpanded]   = useState(false);
  const [sortExpanded,  setSortExpanded]  = useState(false);

  // ── Products + pagination state ─────────────────────────────────────────────
  const [products,    setProducts]    = useState<PublicProduct[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);
  const [pageLoading, setPageLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages,  setTotalPages]  = useState(1);
  const [totalItems,  setTotalItems]  = useState(0);

  // ── Name resolution ─────────────────────────────────────────────────────────
  const [categoryName,    setCategoryName]    = useState(categoryNameParam   || '');
  const [subcategoryName, setSubcategoryName] = useState(subcategoryNameParam || '');
  const [namesResolved,   setNamesResolved]   = useState(
    !!(categoryNameParam || subcategoryNameParam || (!categorySlug && !subcategorySlug))
  );

  const listRef = useRef<FlatList>(null);
  const sheetAnim = useRef(new Animated.Value(0)).current;

  // ── Single source of truth for active filter values (always up-to-date) ──────
  // Using a ref means fetchPage ALWAYS reads the latest values,
  // completely bypassing stale-closure issues with useCallback.
  const activeFiltersRef = useRef({
    category:    null as Category | null,
    sub:         null as Category | null,
    sortIdx:     0,
    minPrice:    '',
    maxPrice:    '',
    categoryName:    categoryNameParam || '',
    subcategoryName: subcategoryNameParam || '',
  });

  const pageTitle =
    subcategoryName || categoryName ||
    humanise(subcategorySlug) || humanise(categorySlug) || 'All Products';

  // ── Load categories for filter ──────────────────────────────────────────────
  useEffect(() => {
    categoryService.getAllCategories({
      status: 'ACTIVE', showRootOnly: 'true', includeSubcategories: 'true',
    }).then(res => {
      if (res.success && res.data) setCategories(res.data);
    });
  }, []);

  // ── Resolve slugs → names ───────────────────────────────────────────────────
  useEffect(() => {
    if (categoryNameParam || subcategoryNameParam) {
      setCategoryName(categoryNameParam || '');
      setSubcategoryName(subcategoryNameParam || '');
      setNamesResolved(true);
      return;
    }
    if (!categorySlug && !subcategorySlug) { setNamesResolved(true); return; }
    (async () => {
      try {
        const res = await categoryService.getAllCategories({
          status: 'ACTIVE', showRootOnly: 'true', includeSubcategories: 'true',
        });
        if (res.success && res.data) {
          const foundCat = res.data.find((c: any) => c.slug === categorySlug);
          if (foundCat) {
            setCategoryName(foundCat.name);
            if (subcategorySlug && foundCat.subcategories) {
              const foundSub = foundCat.subcategories.find((s: any) => s.slug === subcategorySlug);
              if (foundSub) setSubcategoryName(foundSub.name);
            }
          }
        }
      } catch (e) { console.error(e); }
      finally { setNamesResolved(true); }
    })();
  }, [categorySlug, subcategorySlug, categoryNameParam, subcategoryNameParam]);

  // ── Keep ref in sync whenever resolved names change (initial load from URL) ──
  useEffect(() => {
    activeFiltersRef.current.categoryName    = categoryName;
    activeFiltersRef.current.subcategoryName = subcategoryName;
  }, [categoryName, subcategoryName]);

  // ── Initial fetch after name resolution ────────────────────────────────────
  useEffect(() => { if (namesResolved) fetchPage(1); }, [namesResolved]);

  // ── Fetch page ──────────────────────────────────────────────────────────────
  // Reads ONLY from activeFiltersRef — never from state — so it is always fresh.
  const fetchPage = useCallback(async (page: number, isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else if (page === 1) setLoading(true);
      else setPageLoading(true);

      // Always read the latest values from the ref (never stale).
      const f = activeFiltersRef.current;
      const sort = SORT_OPTIONS[f.sortIdx];

      // Tag-based sorts (Featured / Top Selling / Best Sellers) use the
      // `search` param instead of sortBy/sortOrder.
      const params: any = sort.tag
        ? { page, limit: PAGE_SIZE, search: sort.tag }
        : { page, limit: PAGE_SIZE, sortBy: sort.value, sortOrder: sort.order };

      // Category: user-selected filter beats URL-derived name
      if (f.category)             params.category    = f.category.name;
      else if (f.categoryName)    params.category    = f.categoryName;

      // Sub-category
      if (f.sub)                  params.subCategory = f.sub.name;
      else if (f.subcategoryName) params.subCategory = f.subcategoryName;

      // Price
      if (f.minPrice) params.minPrice = Number(f.minPrice);
      if (f.maxPrice) params.maxPrice = Number(f.maxPrice);

      console.log('[fetchPage] params →', JSON.stringify(params)); // ← for debugging

      const response = await publicProductService.getProducts(params);
      if (response.success && response.data) {
        setProducts(response.data.items);
        setCurrentPage(response.data.pagination.currentPage);
        setTotalPages(response.data.pagination.totalPages);
        setTotalItems(response.data.pagination.totalItems);
        if (page > 1) setTimeout(() => listRef.current?.scrollToOffset({ offset: 0, animated: true }), 80);
      } else {
        setProducts([]); setTotalPages(1); setTotalItems(0);
      }
    } catch (e) { console.error('[fetchPage] error', e); setProducts([]); }
    finally { setLoading(false); setRefreshing(false); setPageLoading(false); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // ← intentionally empty: all values come from the ref, not closures

  const onRefresh = () => fetchPage(1, true);
  const goToPage  = (pg: number) => { if (pg >= 1 && pg <= totalPages) fetchPage(pg); };

  // ── Active filters count ────────────────────────────────────────────────────
  const activeFiltersCount = [
    selectedCategory || categoryName,
    selectedSub || subcategoryName,
    sortIdx !== 0,
    minPrice,
    maxPrice,
  ].filter(Boolean).length;

  // ── Open / close filter sheet ───────────────────────────────────────────────
  const openFilter = () => {
    setDraftCat(selectedCategory);
    setDraftSub(selectedSub);
    setDraftSortIdx(sortIdx);
    setDraftMin(minPrice);
    setDraftMax(maxPrice);
    const subs = draftCat?.subcategories || selectedCategory?.subcategories || [];
    setSubcategories(subs);
    setFilterVisible(true);
    Animated.spring(sheetAnim, { toValue: 1, useNativeDriver: true, tension: 65, friction: 11 }).start();
  };

  const closeFilter = () => {
    Animated.timing(sheetAnim, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => setFilterVisible(false));
  };

  const applyFilter = () => {
    // 1. Write new filter values into the ref FIRST (synchronous, instant)
    activeFiltersRef.current = {
      ...activeFiltersRef.current,
      category: draftCat,
      sub:      draftSub,
      sortIdx:  draftSortIdx,
      minPrice: draftMin,
      maxPrice: draftMax,
      // When user explicitly picks a category in the filter panel,
      // clear the URL-derived names so they don't conflict.
      categoryName:    draftCat ? '' : activeFiltersRef.current.categoryName,
      subcategoryName: draftSub ? '' : activeFiltersRef.current.subcategoryName,
    };

    // 2. Sync React state (for UI display / chips / count)
    setSelectedCategory(draftCat);
    setSelectedSub(draftSub);
    setSortIdx(draftSortIdx);
    setMinPrice(draftMin);
    setMaxPrice(draftMax);
    if (draftCat) { setCategoryName(''); }
    if (draftSub) { setSubcategoryName(''); }

    // 3. Close sheet and fetch — fetchPage reads from ref, always fresh
    closeFilter();
    fetchPage(1);
  };

  const clearAllFilters = () => {
    // 1. Clear the ref
    activeFiltersRef.current = {
      category: null, sub: null,
      sortIdx: 0, minPrice: '', maxPrice: '',
      categoryName: '', subcategoryName: '',
    };

    // 2. Sync React state
    setSelectedCategory(null); setSelectedSub(null);
    setSortIdx(0); setMinPrice(''); setMaxPrice('');
    setCategoryName(''); setSubcategoryName('');

    // 3. Fetch immediately
    closeFilter();
    fetchPage(1);
  };

  const onDraftCatSelect = (cat: Category | null) => {
    setDraftCat(cat);
    setDraftSub(null);
    setSubcategories(cat?.subcategories || []);
    setCatExpanded(false);
  };

  // ─── Pagination bar ──────────────────────────────────────────────────────────
  const PaginationBar = totalPages > 1 ? (
    <View
      className="mx-3 mt-1 mb-6 bg-white rounded-2xl p-4"
      style={{ borderWidth: 1, borderColor: '#f3f4f6', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2 }}
    >
      <View className="flex-row items-center justify-between mb-3">
        <Text className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">
          Page {currentPage} of {totalPages}
        </Text>
        <Text className="text-[10px] text-gray-400 font-semibold">
          {totalItems} products
        </Text>
      </View>
      <View className="flex-row items-center justify-between">
        <TouchableOpacity
          onPress={() => goToPage(currentPage - 1)}
          disabled={currentPage <= 1 || pageLoading}
          activeOpacity={0.75}
          className="flex-row items-center gap-1 px-4 py-2.5 rounded-xl"
          style={{ backgroundColor: currentPage <= 1 ? '#f9fafb' : '#111827', borderWidth: 1, borderColor: currentPage <= 1 ? '#e5e7eb' : '#111827' }}
        >
          <ChevronLeft size={13} color={currentPage <= 1 ? '#d1d5db' : '#fff'} />
          <Text className="text-sm font-bold" style={{ color: currentPage <= 1 ? '#d1d5db' : '#fff' }}>Prev</Text>
        </TouchableOpacity>

        <View className="flex-row items-center gap-1.5 flex-1 justify-center">
          {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
            let start = Math.max(1, currentPage - 2);
            const end = Math.min(totalPages, start + 4);
            if (end - start < 4) start = Math.max(1, end - 4);
            const pg = start + i;
            if (pg > totalPages) return null;
            const isActive = pg === currentPage;
            return (
              <TouchableOpacity
                key={pg} onPress={() => goToPage(pg)} disabled={pageLoading} activeOpacity={0.75}
                className="w-9 h-9 rounded-xl items-center justify-center"
                style={{ backgroundColor: isActive ? '#111827' : '#f3f4f6', borderWidth: 1, borderColor: isActive ? '#111827' : '#e5e7eb' }}
              >
                <Text className="text-sm font-bold" style={{ color: isActive ? '#fff' : '#6b7280' }}>{pg}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          onPress={() => goToPage(currentPage + 1)}
          disabled={currentPage >= totalPages || pageLoading}
          activeOpacity={0.75}
          className="flex-row items-center gap-1 px-4 py-2.5 rounded-xl"
          style={{ backgroundColor: currentPage >= totalPages ? '#f9fafb' : '#111827', borderWidth: 1, borderColor: currentPage >= totalPages ? '#e5e7eb' : '#111827' }}
        >
          <Text className="text-sm font-bold" style={{ color: currentPage >= totalPages ? '#d1d5db' : '#fff' }}>Next</Text>
          <ChevronRight size={13} color={currentPage >= totalPages ? '#d1d5db' : '#fff'} />
        </TouchableOpacity>
      </View>
      {pageLoading && <View className="items-center mt-3"><ActivityIndicator size="small" color="#111827" /></View>}
    </View>
  ) : null;

  // ─── List header ─────────────────────────────────────────────────────────────
  const ListHeader = (
    <View className="px-3 pt-3 pb-2 flex-row items-center justify-between">
      <View>
        <Text className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
          {SORT_OPTIONS[sortIdx].label}
        </Text>
        {!loading && totalItems > 0 && (
          <Text className="text-xs text-gray-500 font-medium mt-0.5">
            Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, totalItems)} of {totalItems}
          </Text>
        )}
      </View>
      <View className="flex-row items-center gap-1.5 bg-gray-100 px-3 py-1.5 rounded-lg">
        <LayoutGrid size={12} color="#6b7280" />
        <Text className="text-[11px] font-semibold text-gray-500">Grid</Text>
      </View>
    </View>
  );

  // ─── Empty + Error ────────────────────────────────────────────────────────────
  const EmptyView = (
    <View className="flex-1 items-center justify-center py-24 px-8">
      <View className="w-20 h-20 rounded-full bg-gray-100 items-center justify-center mb-5" style={{ borderWidth: 1, borderColor: '#e5e5e5' }}>
        <Package size={34} color="#d1d5db" />
      </View>
      <Text className="text-lg font-black text-gray-900 text-center mb-2">No Products Found</Text>
      <Text className="text-sm text-gray-400 text-center leading-5 mb-6">
        {subcategoryName || selectedSub
          ? `No products in "${selectedSub?.name || subcategoryName}" yet.`
          : 'No products match your filters. Try adjusting them.'}
      </Text>
      <TouchableOpacity onPress={clearAllFilters} activeOpacity={0.85} className="bg-gray-900 rounded-xl px-7 py-3">
        <Text className="text-white font-bold text-sm">Clear Filters</Text>
      </TouchableOpacity>
    </View>
  );

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <View className="flex-1 bg-gray-50">
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      {/* ── Top Bar ─────────────────────────────────────────────────────────── */}
      <View
        className={`bg-black px-4 ${Platform.OS === 'ios' ? 'pt-14' : 'pt-5'} pb-4`}
        style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.18, shadowRadius: 8, elevation: 6 }}
      >
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={() => router.back()} activeOpacity={0.7}
            className="mr-3 w-9 h-9 rounded-xl items-center justify-center"
            style={{ backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' }}
          >
            <ArrowLeft size={18} color="#ffffff" />
          </TouchableOpacity>

          <View className="flex-1">
            {(categoryName || selectedCategory) && (
              <Text className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-0.5">
                {selectedCategory?.name || categoryName}
              </Text>
            )}
            <Text className="text-xl font-black text-white tracking-tight" numberOfLines={1}>
              {selectedSub?.name || subcategoryName || selectedCategory?.name || categoryName || pageTitle}
            </Text>
          </View>

          {/* Cart */}
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/cart' as any)} activeOpacity={0.7}
            className="w-9 h-9 rounded-xl items-center justify-center ml-2"
            style={{ backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' }}
          >
            <ShoppingCart size={16} color="#ffffff" />
          </TouchableOpacity>

          {/* Filter button */}
          <TouchableOpacity
            onPress={openFilter} activeOpacity={0.8}
            className="flex-row items-center gap-1.5 ml-2 px-3 py-2 rounded-xl"
            style={{ backgroundColor: activeFiltersCount > 0 ? '#ffffff' : 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: activeFiltersCount > 0 ? '#ffffff' : 'rgba(255,255,255,0.08)' }}
          >
            <SlidersHorizontal size={15} color={activeFiltersCount > 0 ? '#111827' : '#ffffff'} />
            {activeFiltersCount > 0 && (
              <View className="w-4 h-4 rounded-full bg-gray-900 items-center justify-center">
                <Text className="text-[9px] font-black text-white">{activeFiltersCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Active chips strip */}
        {(categoryName || selectedCategory || selectedSub || subcategoryName || minPrice || maxPrice || sortIdx !== 0) && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-3" contentContainerStyle={{ gap: 6 }}>
            {(selectedCategory || categoryName) && (
              <View className="flex-row items-center bg-white/15 rounded-full px-3 py-1">
                <Text className="text-[11px] text-white font-semibold">{selectedCategory?.name || categoryName}</Text>
              </View>
            )}
            {(selectedSub || subcategoryName) && (
              <View className="flex-row items-center bg-white/15 rounded-full px-3 py-1">
                <Text className="text-[11px] text-white font-semibold">{selectedSub?.name || subcategoryName}</Text>
              </View>
            )}
            {sortIdx !== 0 && (
              <View className="flex-row items-center bg-white/15 rounded-full px-3 py-1">
                <Text className="text-[11px] text-white font-semibold">{SORT_OPTIONS[sortIdx].label}</Text>
              </View>
            )}
            {(minPrice || maxPrice) && (
              <View className="flex-row items-center bg-white/15 rounded-full px-3 py-1">
                <Text className="text-[11px] text-white font-semibold">
                  ₹{minPrice || '0'} – ₹{maxPrice || '∞'}
                </Text>
              </View>
            )}
            <TouchableOpacity
              onPress={clearAllFilters}
              className="flex-row items-center bg-white/20 rounded-full px-3 py-1 gap-1"
            >
              <X size={10} color="#fff" />
              <Text className="text-[11px] text-white font-semibold">Clear</Text>
            </TouchableOpacity>
          </ScrollView>
        )}
      </View>

      {/* ── Product List ──────────────────────────────────────────────────────── */}
      {loading ? (
        <View className="flex-1 px-3 pt-4">
          <View className="flex-row gap-2 mb-3"><SkeletonCard /><SkeletonCard /></View>
          <View className="flex-row gap-2 mb-3"><SkeletonCard /><SkeletonCard /></View>
          <View className="flex-row gap-2"><SkeletonCard /><SkeletonCard /></View>
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={products}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={{ paddingHorizontal: 12, gap: 8 }}
          contentContainerStyle={{ paddingBottom: 30, flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#111827" colors={['#111827']} />}
          ListHeaderComponent={products.length > 0 ? ListHeader : null}
          ListFooterComponent={products.length > 0 ? PaginationBar : null}
          ListEmptyComponent={EmptyView}
          renderItem={({ item }) => (
            <View className="flex-1 mb-3">
              <ProductCard product={item} />
            </View>
          )}
        />
      )}

      {/* ── Filter Bottom Sheet ───────────────────────────────────────────────── */}
      <Modal visible={filterVisible} transparent animationType="none" onRequestClose={closeFilter}>
        {/* Backdrop */}
        <TouchableOpacity className="flex-1 bg-black/50" activeOpacity={1} onPress={closeFilter} />

        {/* Sheet */}
        <Animated.View
          className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl"
          style={{
            transform: [{ translateY: sheetAnim.interpolate({ inputRange: [0, 1], outputRange: [600, 0] }) }],
            maxHeight: '85%',
            shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.12, shadowRadius: 16, elevation: 20,
          }}
        >
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            {/* Handle */}
            <View className="items-center pt-3 pb-1">
              <View className="w-10 h-1 bg-gray-300 rounded-full" />
            </View>

            {/* Header */}
            <View className="flex-row items-center justify-between px-5 py-3 border-b border-gray-100">
              <Text className="text-lg font-black text-gray-900">Filters</Text>
              <View className="flex-row items-center gap-3">
                <TouchableOpacity onPress={() => { setDraftCat(null); setDraftSub(null); setDraftSortIdx(0); setDraftMin(''); setDraftMax(''); }}>
                  <Text className="text-sm font-semibold text-gray-400">Reset</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={closeFilter} className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center">
                  <X size={16} color="#6b7280" />
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>

              {/* ── Category ─────────────────────────────────────────────────── */}
              <View className="px-5 pt-4">
                <Text className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Category</Text>
                <TouchableOpacity
                  onPress={() => { setCatExpanded(v => !v); setSubExpanded(false); setSortExpanded(false); }}
                  className="flex-row items-center justify-between border border-gray-200 rounded-xl px-4 py-3"
                  style={{ backgroundColor: draftCat ? '#f9fafb' : '#ffffff' }}
                >
                  <Text className={`text-sm font-semibold ${draftCat ? 'text-gray-900' : 'text-gray-400'}`}>
                    {draftCat?.name || 'Select Category'}
                  </Text>
                  <ChevronDown size={16} color="#9ca3af" style={{ transform: [{ rotate: catExpanded ? '180deg' : '0deg' }] }} />
                </TouchableOpacity>

                {catExpanded && (
                  <View className="border border-gray-100 rounded-xl mt-1 overflow-hidden bg-white" style={{ maxHeight: 200 }}>
                    <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false}>
                      <TouchableOpacity
                        onPress={() => onDraftCatSelect(null)}
                        className="flex-row items-center px-4 py-3 border-b border-gray-50"
                      >
                        <Text className="flex-1 text-sm text-gray-500">All Categories</Text>
                        {!draftCat && <Check size={14} color="#111827" />}
                      </TouchableOpacity>
                      {categories.map(cat => (
                        <TouchableOpacity
                          key={cat.id}
                          onPress={() => onDraftCatSelect(cat)}
                          className="flex-row items-center px-4 py-3 border-b border-gray-50"
                        >
                          <Text className={`flex-1 text-sm font-medium ${draftCat?.id === cat.id ? 'text-gray-900 font-bold' : 'text-gray-600'}`}>
                            {cat.name}
                          </Text>
                          {draftCat?.id === cat.id && <Check size={14} color="#111827" />}
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>

              {/* ── Subcategory ───────────────────────────────────────────────── */}
              {(subcategories.length > 0 || draftCat) && (
                <View className="px-5 pt-4">
                  <Text className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Subcategory</Text>
                  <TouchableOpacity
                    onPress={() => { setSubExpanded(v => !v); setCatExpanded(false); setSortExpanded(false); }}
                    className="flex-row items-center justify-between border border-gray-200 rounded-xl px-4 py-3"
                    style={{ backgroundColor: draftSub ? '#f9fafb' : '#ffffff', opacity: subcategories.length === 0 ? 0.4 : 1 }}
                    disabled={subcategories.length === 0}
                  >
                    <Text className={`text-sm font-semibold ${draftSub ? 'text-gray-900' : 'text-gray-400'}`}>
                      {draftSub?.name || (subcategories.length === 0 ? 'No subcategories' : 'Select Subcategory')}
                    </Text>
                    <ChevronDown size={16} color="#9ca3af" />
                  </TouchableOpacity>

                  {subExpanded && subcategories.length > 0 && (
                    <View className="border border-gray-100 rounded-xl mt-1 overflow-hidden bg-white" style={{ maxHeight: 180 }}>
                      <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false}>
                        <TouchableOpacity onPress={() => { setDraftSub(null); setSubExpanded(false); }} className="flex-row items-center px-4 py-3 border-b border-gray-50">
                          <Text className="flex-1 text-sm text-gray-500">All Subcategories</Text>
                          {!draftSub && <Check size={14} color="#111827" />}
                        </TouchableOpacity>
                        {subcategories.map(sub => (
                          <TouchableOpacity
                            key={sub.id}
                            onPress={() => { setDraftSub(sub); setSubExpanded(false); }}
                            className="flex-row items-center px-4 py-3 border-b border-gray-50"
                          >
                            <Text className={`flex-1 text-sm font-medium ${draftSub?.id === sub.id ? 'text-gray-900 font-bold' : 'text-gray-600'}`}>
                              {sub.name}
                            </Text>
                            {draftSub?.id === sub.id && <Check size={14} color="#111827" />}
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>
              )}

              {/* ── Sort ──────────────────────────────────────────────────────── */}
              <View className="px-5 pt-4">
                <Text className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Sort By</Text>
                <View className="flex-row flex-wrap gap-2">
                  {SORT_OPTIONS.map((opt, idx) => (
                    <TouchableOpacity
                      key={idx}
                      onPress={() => setDraftSortIdx(idx)}
                      activeOpacity={0.75}
                      className="px-4 py-2.5 rounded-xl"
                      style={{
                        backgroundColor: draftSortIdx === idx ? '#111827' : '#f3f4f6',
                        borderWidth: 1,
                        borderColor: draftSortIdx === idx ? '#111827' : '#e5e7eb',
                      }}
                    >
                      <Text className="text-sm font-semibold" style={{ color: draftSortIdx === idx ? '#ffffff' : '#6b7280' }}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* ── Price Range ───────────────────────────────────────────────── */}
              <View className="px-5 pt-4">
                <Text className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Price Range (₹)</Text>
                <View className="flex-row gap-3">
                  <View className="flex-1">
                    <Text className="text-[10px] text-gray-400 font-semibold mb-1.5 uppercase tracking-wide">Min</Text>
                    <TextInput
                      value={draftMin}
                      onChangeText={setDraftMin}
                      placeholder="0"
                      placeholderTextColor="#d1d5db"
                      keyboardType="numeric"
                      className="border border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold text-gray-900 bg-white"
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-[10px] text-gray-400 font-semibold mb-1.5 uppercase tracking-wide">Max</Text>
                    <TextInput
                      value={draftMax}
                      onChangeText={setDraftMax}
                      placeholder="Any"
                      placeholderTextColor="#d1d5db"
                      keyboardType="numeric"
                      className="border border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold text-gray-900 bg-white"
                    />
                  </View>
                </View>
              </View>

            </ScrollView>

            {/* Apply button */}
            <View className="px-5 pt-3 pb-8 border-t border-gray-100">
              <TouchableOpacity
                onPress={applyFilter}
                activeOpacity={0.88}
                className="bg-gray-900 rounded-2xl py-4 items-center"
              >
                <Text className="text-white font-extrabold text-base tracking-tight">Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </Animated.View>
      </Modal>
    </View>
  );
}
