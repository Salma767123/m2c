import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  FlatList,
  TextInput,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  Search,
  ShoppingCart,
  Package,
  SlidersHorizontal,
  X,
  Check,
  Star,
  ArrowUpDown,
} from 'lucide-react-native';
import { publicProductService, PublicProduct } from '@/services/publicProductService';
import ProductCard from '@/components/WebSite/ProductCard/ProductCard';

const PAGE_SIZE = 12;
const AVAILABLE_COLORS = ['Red', 'Blue', 'Green', 'Yellow', 'White', 'Black', 'Multi'];

type SortKey = 'newest' | 'price-low' | 'price-high' | 'rating';
const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'newest', label: 'Newest First' },
  { key: 'price-low', label: 'Price: Low to High' },
  { key: 'price-high', label: 'Price: High to Low' },
  { key: 'rating', label: 'Highest Rated' },
];

const pressableOpacity = ({ pressed }: { pressed: boolean }) => ({
  opacity: pressed ? 0.7 : 1,
});

const titleCase = (value: string) =>
  value.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());

export default function ProductsScreen() {
  const router = useRouter();
  const { category, subcategory, search: searchParam } = useLocalSearchParams<{
    category?: string;
    subcategory?: string;
    search?: string;
  }>();

  const [products, setProducts] = useState<PublicProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Search
  const [searchQuery, setSearchQuery] = useState(searchParam || '');
  const [appliedSearch, setAppliedSearch] = useState(searchParam || '');

  // Sort
  const [sortKey, setSortKey] = useState<SortKey>('newest');
  const [sortModalOpen, setSortModalOpen] = useState(false);

  // Filters
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [minRating, setMinRating] = useState(0);
  const [inStockOnly, setInStockOnly] = useState(false);

  // Applied filter snapshot (drives fetch)
  const [applied, setApplied] = useState({
    priceMin: '',
    priceMax: '',
    colors: [] as string[],
    minRating: 0,
    inStockOnly: false,
  });

  // Sync URL search param to state
  useEffect(() => {
    if (searchParam !== undefined) {
      setSearchQuery(searchParam || '');
      setAppliedSearch(searchParam || '');
    }
  }, [searchParam]);

  const pageTitle = useMemo(() => {
    if (appliedSearch) return `Results for "${appliedSearch}"`;
    if (subcategory) return titleCase(subcategory);
    if (category) return titleCase(category);
    return 'All Products';
  }, [appliedSearch, subcategory, category]);

  const buildParams = useCallback(
    (nextPage: number) => {
      const sortMap: Record<SortKey, { sortBy: string; sortOrder: 'asc' | 'desc' }> = {
        newest: { sortBy: 'createdAt', sortOrder: 'desc' },
        'price-low': { sortBy: 'basePrice', sortOrder: 'asc' },
        'price-high': { sortBy: 'basePrice', sortOrder: 'desc' },
        rating: { sortBy: 'rating', sortOrder: 'desc' },
      };
      const { sortBy, sortOrder } = sortMap[sortKey];

      const params: any = {
        page: nextPage,
        limit: PAGE_SIZE,
        sortBy,
        sortOrder,
      };
      if (category) params.category = category;
      if (subcategory) params.subCategory = subcategory;
      if (appliedSearch) params.search = appliedSearch;
      if (applied.priceMin) params.minPrice = parseFloat(applied.priceMin);
      if (applied.priceMax) params.maxPrice = parseFloat(applied.priceMax);
      if (applied.colors.length > 0) params.colors = applied.colors.join(',');
      if (applied.minRating > 0) params.minRating = applied.minRating;
      if (applied.inStockOnly) params.inStock = true;
      return params;
    },
    [category, subcategory, appliedSearch, applied, sortKey],
  );

  const fetchProducts = useCallback(
    async (opts: { reset?: boolean; pageOverride?: number } = {}) => {
      const { reset = true, pageOverride } = opts;
      const targetPage = pageOverride ?? (reset ? 1 : page + 1);

      if (reset) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      try {
        const response = await publicProductService.getProducts(buildParams(targetPage));
        if (response.success && response.data) {
          const newItems = response.data.items;
          setProducts((prev) => (reset ? newItems : [...prev, ...newItems]));
          setPage(targetPage);
          setTotalPages(response.data.pagination.totalPages);
          setTotalItems(response.data.pagination.totalItems);
        }
      } catch (error) {
        console.error('Error fetching products:', error);
      } finally {
        setLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
      }
    },
    [buildParams, page],
  );

  useEffect(() => {
    fetchProducts({ reset: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, subcategory, appliedSearch, applied, sortKey]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchProducts({ reset: true });
  }, [fetchProducts]);

  const onLoadMore = useCallback(() => {
    if (!loading && !loadingMore && page < totalPages) {
      fetchProducts({ reset: false });
    }
  }, [loading, loadingMore, page, totalPages, fetchProducts]);

  const handleSearchSubmit = () => {
    const trimmed = searchQuery.trim();
    setAppliedSearch(trimmed);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setAppliedSearch('');
  };

  const applyFilters = () => {
    setApplied({
      priceMin,
      priceMax,
      colors: selectedColors,
      minRating,
      inStockOnly,
    });
    setFilterModalOpen(false);
  };

  const resetFilters = () => {
    setPriceMin('');
    setPriceMax('');
    setSelectedColors([]);
    setMinRating(0);
    setInStockOnly(false);
    setApplied({ priceMin: '', priceMax: '', colors: [], minRating: 0, inStockOnly: false });
  };

  const clearCategoryFilter = () => {
    router.replace('/(any)/products' as any);
  };

  const activeFiltersCount =
    (applied.priceMin || applied.priceMax ? 1 : 0) +
    applied.colors.length +
    (applied.minRating > 0 ? 1 : 0) +
    (applied.inStockOnly ? 1 : 0);

  const hasContextPills =
    !!category || !!subcategory || !!appliedSearch || activeFiltersCount > 0;

  const renderProduct = useCallback(
    ({ item }: { item: PublicProduct }) => (
      <View className="w-[48%] mb-4">
        <ProductCard product={item} />
      </View>
    ),
    [],
  );

  const keyExtractor = useCallback((item: PublicProduct) => item.id, []);

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View
        className="bg-white px-4 py-3 flex-row items-center"
        style={{
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.04,
          shadowRadius: 8,
          elevation: 2,
        }}
      >
        <Pressable
          onPress={() => router.back()}
          accessibilityLabel="Go back"
          accessibilityRole="button"
          hitSlop={8}
          style={pressableOpacity}
          className="w-10 h-10 rounded-xl bg-gray-100 items-center justify-center mr-3"
        >
          <ArrowLeft size={20} color="#1e293b" />
        </Pressable>
        <View className="flex-1">
          <Text className="text-base font-bold text-gray-900" numberOfLines={1}>
            {pageTitle}
          </Text>
          {!loading && totalItems > 0 ? (
            <Text className="text-xs text-gray-500">
              {totalItems} {totalItems === 1 ? 'product' : 'products'}
            </Text>
          ) : null}
        </View>
        <Pressable
          onPress={() => router.push('/(tabs)/cart' as any)}
          accessibilityLabel="View cart"
          accessibilityRole="button"
          hitSlop={8}
          style={pressableOpacity}
          className="w-10 h-10 rounded-xl bg-gray-100 items-center justify-center"
        >
          <ShoppingCart size={18} color="#64748b" />
        </Pressable>
      </View>

      {/* Search Bar */}
      <View className="bg-white px-4 pb-3 border-b border-gray-100">
        <View className="flex-row items-center bg-gray-100 rounded-xl px-3">
          <Search size={18} color="#6b7280" />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search products..."
            placeholderTextColor="#9ca3af"
            onSubmitEditing={handleSearchSubmit}
            returnKeyType="search"
            accessibilityLabel="Search products"
            className="flex-1 ml-2 py-2.5 text-gray-900"
            style={{ fontSize: 16 }}
          />
          {searchQuery ? (
            <Pressable
              onPress={clearSearch}
              accessibilityLabel="Clear search"
              accessibilityRole="button"
              hitSlop={8}
              style={pressableOpacity}
              className="p-1"
            >
              <X size={16} color="#6b7280" />
            </Pressable>
          ) : null}
        </View>
      </View>

      {/* Sort + Filter Bar */}
      <View className="bg-white px-4 py-2 flex-row border-b border-gray-100">
        <Pressable
          onPress={() => setSortModalOpen(true)}
          accessibilityLabel="Sort products"
          accessibilityRole="button"
          style={pressableOpacity}
          className="flex-1 flex-row items-center justify-center py-2 mr-2 border border-gray-200 rounded-lg"
        >
          <ArrowUpDown size={16} color="#374151" />
          <Text className="ml-2 text-sm font-semibold text-gray-700" numberOfLines={1}>
            {SORT_OPTIONS.find((o) => o.key === sortKey)?.label}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setFilterModalOpen(true)}
          accessibilityLabel="Filter products"
          accessibilityRole="button"
          style={pressableOpacity}
          className="flex-1 flex-row items-center justify-center py-2 border border-gray-200 rounded-lg"
        >
          <SlidersHorizontal size={16} color="#374151" />
          <Text className="ml-2 text-sm font-semibold text-gray-700">
            Filters{activeFiltersCount > 0 ? ` (${activeFiltersCount})` : ''}
          </Text>
        </Pressable>
      </View>

      {/* Active Context Pills */}
      {hasContextPills ? (
        <View className="bg-white border-b border-gray-100">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 10, gap: 8 }}
          >
            {category ? (
              <View className="flex-row items-center bg-gray-100 rounded-full px-3 py-1.5">
                <Text className="text-xs font-semibold text-gray-700">{titleCase(category)}</Text>
                <Pressable
                  onPress={clearCategoryFilter}
                  accessibilityLabel="Clear category"
                  hitSlop={8}
                  style={pressableOpacity}
                  className="ml-2"
                >
                  <X size={12} color="#6b7280" />
                </Pressable>
              </View>
            ) : null}
            {subcategory ? (
              <View className="flex-row items-center bg-gray-900 rounded-full px-3 py-1.5">
                <Text className="text-xs font-semibold text-white">{titleCase(subcategory)}</Text>
                <Pressable
                  onPress={clearCategoryFilter}
                  accessibilityLabel="Clear subcategory"
                  hitSlop={8}
                  style={pressableOpacity}
                  className="ml-2"
                >
                  <X size={12} color="#ffffff" />
                </Pressable>
              </View>
            ) : null}
            {appliedSearch ? (
              <View className="flex-row items-center bg-blue-50 rounded-full px-3 py-1.5">
                <Text className="text-xs font-semibold text-blue-700">Search: {appliedSearch}</Text>
                <Pressable
                  onPress={clearSearch}
                  accessibilityLabel="Clear search"
                  hitSlop={8}
                  style={pressableOpacity}
                  className="ml-2"
                >
                  <X size={12} color="#1d4ed8" />
                </Pressable>
              </View>
            ) : null}
            {activeFiltersCount > 0 ? (
              <Pressable
                onPress={resetFilters}
                accessibilityLabel="Clear all filters"
                accessibilityRole="button"
                style={pressableOpacity}
                className="flex-row items-center bg-red-50 rounded-full px-3 py-1.5"
              >
                <X size={12} color="#ef4444" />
                <Text className="text-xs font-semibold text-red-600 ml-1">Clear Filters</Text>
              </Pressable>
            ) : null}
          </ScrollView>
        </View>
      ) : null}

      {/* Content */}
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#1f2937" />
          <Text className="mt-4 text-gray-500 text-sm">Loading products...</Text>
        </View>
      ) : products.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <View className="w-24 h-24 rounded-full bg-gray-100 items-center justify-center mb-5">
            <Package size={36} color="#94a3b8" />
          </View>
          <Text className="text-lg font-bold text-gray-900 mb-2 text-center">
            No Products Found
          </Text>
          <Text className="text-gray-500 text-center text-sm mb-6 leading-5">
            Try adjusting your search or filters to find what you're looking for.
          </Text>
          {activeFiltersCount > 0 || appliedSearch ? (
            <Pressable
              onPress={() => {
                resetFilters();
                clearSearch();
              }}
              accessibilityLabel="Clear all filters and search"
              accessibilityRole="button"
              style={pressableOpacity}
              className="bg-gray-900 rounded-2xl px-8 py-3"
            >
              <Text className="text-white font-bold text-base">Clear All</Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={() => router.back()}
              accessibilityLabel="Go back"
              accessibilityRole="button"
              style={pressableOpacity}
              className="bg-gray-900 rounded-2xl px-8 py-3"
            >
              <Text className="text-white font-bold text-base">Go Back</Text>
            </Pressable>
          )}
        </View>
      ) : (
        <FlatList
          data={products}
          renderItem={renderProduct}
          keyExtractor={keyExtractor}
          numColumns={2}
          columnWrapperStyle={{ justifyContent: 'space-between' }}
          contentContainerStyle={{ padding: 12, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1f2937" />
          }
          onEndReached={onLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            loadingMore ? (
              <View className="py-6 items-center">
                <ActivityIndicator size="small" color="#1f2937" />
              </View>
            ) : page >= totalPages && products.length > 0 ? (
              <View className="py-6 items-center">
                <Text className="text-xs text-gray-400">You've reached the end</Text>
              </View>
            ) : null
          }
        />
      )}

      {/* Sort Modal */}
      <Modal
        visible={sortModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setSortModalOpen(false)}
      >
        <Pressable
          className="flex-1 bg-black/50 justify-end"
          onPress={() => setSortModalOpen(false)}
        >
          <Pressable className="bg-white rounded-t-3xl p-5">
            <View className="items-center mb-3">
              <View className="w-10 h-1 rounded-full bg-gray-300" />
            </View>
            <Text className="text-lg font-bold text-gray-900 mb-4">Sort By</Text>
            {SORT_OPTIONS.map((option) => {
              const isActive = option.key === sortKey;
              return (
                <Pressable
                  key={option.key}
                  onPress={() => {
                    setSortKey(option.key);
                    setSortModalOpen(false);
                  }}
                  accessibilityRole="button"
                  style={pressableOpacity}
                  className="flex-row items-center justify-between py-3 border-b border-gray-100"
                >
                  <Text
                    className={`text-base ${
                      isActive ? 'font-bold text-gray-900' : 'text-gray-700'
                    }`}
                  >
                    {option.label}
                  </Text>
                  {isActive ? <Check size={18} color="#111827" /> : null}
                </Pressable>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Filter Modal */}
      <Modal
        visible={filterModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setFilterModalOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1 bg-black/50 justify-end"
        >
          <View className="bg-white rounded-t-3xl" style={{ maxHeight: '85%' }}>
            <View className="flex-row items-center justify-between p-5 border-b border-gray-200">
              <Text className="text-lg font-bold text-gray-900">Filters</Text>
              <Pressable
                onPress={() => setFilterModalOpen(false)}
                accessibilityLabel="Close filters"
                hitSlop={8}
                style={pressableOpacity}
              >
                <X size={22} color="#6b7280" />
              </Pressable>
            </View>

            <ScrollView
              className="px-5"
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* Price Range */}
              <View className="py-4 border-b border-gray-100">
                <Text className="text-sm font-bold text-gray-900 mb-3">Price Range</Text>
                <View className="flex-row gap-3">
                  <TextInput
                    value={priceMin}
                    onChangeText={setPriceMin}
                    placeholder="Min"
                    placeholderTextColor="#9ca3af"
                    keyboardType="numeric"
                    accessibilityLabel="Minimum price"
                    style={{ fontSize: 16 }}
                    className="flex-1 px-3 py-2.5 border border-gray-300 rounded-lg text-gray-900"
                  />
                  <TextInput
                    value={priceMax}
                    onChangeText={setPriceMax}
                    placeholder="Max"
                    placeholderTextColor="#9ca3af"
                    keyboardType="numeric"
                    accessibilityLabel="Maximum price"
                    style={{ fontSize: 16 }}
                    className="flex-1 px-3 py-2.5 border border-gray-300 rounded-lg text-gray-900"
                  />
                </View>
              </View>

              {/* Colors */}
              <View className="py-4 border-b border-gray-100">
                <Text className="text-sm font-bold text-gray-900 mb-3">Color</Text>
                <View className="flex-row flex-wrap gap-2">
                  {AVAILABLE_COLORS.map((color) => {
                    const isSelected = selectedColors.includes(color);
                    return (
                      <Pressable
                        key={color}
                        onPress={() => {
                          setSelectedColors((prev) =>
                            isSelected ? prev.filter((c) => c !== color) : [...prev, color],
                          );
                        }}
                        accessibilityLabel={`${color} filter`}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: isSelected }}
                        style={pressableOpacity}
                        className={`px-3 py-2 rounded-full border ${
                          isSelected
                            ? 'bg-gray-900 border-gray-900'
                            : 'bg-white border-gray-300'
                        }`}
                      >
                        <Text
                          className={`text-xs font-semibold ${
                            isSelected ? 'text-white' : 'text-gray-700'
                          }`}
                        >
                          {color}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Rating */}
              <View className="py-4 border-b border-gray-100">
                <Text className="text-sm font-bold text-gray-900 mb-3">Minimum Rating</Text>
                {[4, 3, 2, 1, 0].map((rating) => {
                  const isSelected = minRating === rating;
                  return (
                    <Pressable
                      key={rating}
                      onPress={() => setMinRating(rating)}
                      accessibilityLabel={rating === 0 ? 'All ratings' : `${rating} stars and up`}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: isSelected }}
                      style={pressableOpacity}
                      className="flex-row items-center py-2"
                    >
                      <View
                        className={`w-5 h-5 rounded-full border-2 mr-3 items-center justify-center ${
                          isSelected ? 'border-gray-900' : 'border-gray-300'
                        }`}
                      >
                        {isSelected ? (
                          <View className="w-2.5 h-2.5 rounded-full bg-gray-900" />
                        ) : null}
                      </View>
                      {rating === 0 ? (
                        <Text className="text-sm text-gray-700">All Ratings</Text>
                      ) : (
                        <View className="flex-row items-center">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              size={14}
                              color={i < rating ? '#f59e0b' : '#d1d5db'}
                              fill={i < rating ? '#f59e0b' : 'transparent'}
                            />
                          ))}
                          <Text className="ml-2 text-sm text-gray-700">& Up</Text>
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </View>

              {/* In Stock */}
              <View className="py-4">
                <Pressable
                  onPress={() => setInStockOnly((v) => !v)}
                  accessibilityLabel="In stock only"
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: inStockOnly }}
                  style={pressableOpacity}
                  className="flex-row items-center"
                >
                  <View
                    className={`w-5 h-5 rounded border-2 mr-3 items-center justify-center ${
                      inStockOnly ? 'bg-gray-900 border-gray-900' : 'border-gray-300'
                    }`}
                  >
                    {inStockOnly ? <Check size={14} color="#ffffff" /> : null}
                  </View>
                  <Text className="text-sm font-semibold text-gray-900">In Stock Only</Text>
                </Pressable>
              </View>
            </ScrollView>

            {/* Actions */}
            <View className="flex-row gap-3 p-5 border-t border-gray-200">
              <Pressable
                onPress={resetFilters}
                accessibilityLabel="Reset filters"
                accessibilityRole="button"
                style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
                className="flex-1 py-3 rounded-xl border border-gray-300 items-center"
              >
                <Text className="text-gray-700 font-bold">Reset</Text>
              </Pressable>
              <Pressable
                onPress={applyFilters}
                accessibilityLabel="Apply filters"
                accessibilityRole="button"
                style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
                className="flex-1 py-3 rounded-xl bg-gray-900 items-center"
              >
                <Text className="text-white font-bold">Apply</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
