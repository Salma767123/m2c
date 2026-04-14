import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  FlatList,
  Keyboard,
} from 'react-native';
import {
  Search as SearchIcon,
  X,
  SlidersHorizontal,
  ArrowLeft,
  ShoppingCart,
  Package,
  ChevronDown,
  TrendingUp,
} from 'lucide-react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { publicProductService, PublicProduct } from '@/services/publicProductService';
import ProductCard from '@/components/WebSite/ProductCard/ProductCard';

// ─── Sort options ─────────────────────────────────────────────────────────────
const SORT_OPTIONS = [
  { label: 'Relevance', value: 'relevance', sortBy: 'createdAt', sortOrder: 'desc' as const },
  { label: 'Price: Low → High', value: 'price-low', sortBy: 'basePrice', sortOrder: 'asc' as const },
  { label: 'Price: High → Low', value: 'price-high', sortBy: 'basePrice', sortOrder: 'desc' as const },
  { label: 'Newest First', value: 'newest', sortBy: 'createdAt', sortOrder: 'desc' as const },
];

// ─── Popular search tags ──────────────────────────────────────────────────────
const POPULAR_SEARCHES = [
  'Cotton', 'Handwoven', 'Organic', 'Linen', 'Silk',
  'Traditional', 'Artisan', 'Kitchen', 'Bamboo',
];

export default function SearchScreen() {
  const router = useRouter();
  const { q } = useLocalSearchParams<{ q?: string }>();

  const [query, setQuery] = useState(q || '');
  const [activeSort, setActiveSort] = useState(SORT_OPTIONS[0]);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showSortSheet, setShowSortSheet] = useState(false);

  const [products, setProducts] = useState<PublicProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalItems, setTotalItems] = useState(0);
  const [hasSearched, setHasSearched] = useState(false);

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<TextInput>(null);

  // ── Run search whenever query or filters change (debounced) ──────────────────
  useEffect(() => {
    if (!query.trim() && !minPrice && !maxPrice) {
      setProducts([]);
      setHasSearched(false);
      setTotalItems(0);
      return;
    }

    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      runSearch();
    }, 350);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [query, activeSort, minPrice, maxPrice]);

  // Auto-focus and run search if query came from Header
  useEffect(() => {
    if (q) {
      setQuery(q);
    }
    setTimeout(() => inputRef.current?.focus(), 200);
  }, []);

  const runSearch = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = {
        page: 1,
        limit: 50,
        sortBy: activeSort.sortBy,
        sortOrder: activeSort.sortOrder,
      };

      if (query.trim()) params.search = query.trim();
      if (minPrice) params.minPrice = parseFloat(minPrice);
      if (maxPrice) params.maxPrice = parseFloat(maxPrice);

      const response = await publicProductService.getProducts(params);
      if (response.success && response.data) {
        setProducts(response.data.items);
        setTotalItems(response.data.pagination.totalItems);
      } else {
        setProducts([]);
        setTotalItems(0);
      }
      setHasSearched(true);
    } catch (error) {
      console.error('Search error:', error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [query, activeSort, minPrice, maxPrice]);

  const clearAll = () => {
    setQuery('');
    setMinPrice('');
    setMaxPrice('');
    setActiveSort(SORT_OPTIONS[0]);
    setProducts([]);
    setHasSearched(false);
    setTotalItems(0);
    inputRef.current?.focus();
  };

  const hasActiveFilters = minPrice || maxPrice || activeSort.value !== 'relevance';

  return (
    <View className="flex-1 bg-gray-50">
      {/* ── Fixed Header with search bar ──────────────────────────────────── */}
      <View className="bg-gray-900 pt-3 pb-3 px-4">
        {/* Row 1: Back + Input + Clear */}
        <View className="flex-row items-center gap-2 mb-2">
          <TouchableOpacity
            onPress={() => router.back()}
            className="p-2 rounded-full bg-white/10"
            activeOpacity={0.7}
          >
            <ArrowLeft size={20} color="#ffffff" />
          </TouchableOpacity>

          <View className="flex-1 flex-row items-center bg-white rounded-xl overflow-hidden">
            <SearchIcon size={18} color="#9ca3af" style={{ marginLeft: 12 }} />
            <TextInput
              ref={inputRef}
              value={query}
              onChangeText={setQuery}
              placeholder="Search products..."
              placeholderTextColor="#9ca3af"
              className="flex-1 px-3 py-3 text-gray-900 text-base"
              returnKeyType="search"
              onSubmitEditing={() => { Keyboard.dismiss(); runSearch(); }}
              autoCorrect={false}
            />
            {query.length > 0 && (
              <TouchableOpacity
                onPress={() => { setQuery(''); setProducts([]); setHasSearched(false); }}
                className="p-3"
                activeOpacity={0.7}
              >
                <X size={16} color="#9ca3af" />
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            onPress={() => router.push('/(tabs)/cart' as any)}
            className="p-2 rounded-full bg-white/10"
            activeOpacity={0.7}
          >
            <ShoppingCart size={20} color="#ffffff" />
          </TouchableOpacity>
        </View>

        {/* Row 2: Sort + Filter toggles */}
        <View className="flex-row gap-2">
          {/* Sort Picker */}
          <TouchableOpacity
            onPress={() => setShowSortSheet(!showSortSheet)}
            className="flex-row items-center bg-white/10 rounded-full px-3 py-1.5 gap-1"
            activeOpacity={0.7}
          >
            <TrendingUp size={13} color="#e5e7eb" />
            <Text className="text-xs text-gray-200 font-semibold">{activeSort.label}</Text>
            <ChevronDown size={13} color="#e5e7eb" />
          </TouchableOpacity>

          {/* Filter Toggle */}
          <TouchableOpacity
            onPress={() => setShowFilters(!showFilters)}
            className={`flex-row items-center rounded-full px-3 py-1.5 gap-1 ${hasActiveFilters ? 'bg-amber-400' : 'bg-white/10'}`}
            activeOpacity={0.7}
          >
            <SlidersHorizontal size={13} color={hasActiveFilters ? '#000000' : '#e5e7eb'} />
            <Text className={`text-xs font-semibold ${hasActiveFilters ? 'text-black' : 'text-gray-200'}`}>
              Filters{hasActiveFilters ? ' ●' : ''}
            </Text>
          </TouchableOpacity>

          {/* Results count */}
          {hasSearched && !loading && (
            <View className="flex-1 items-end justify-center">
              <Text className="text-xs text-gray-400">
                {totalItems} result{totalItems !== 1 ? 's' : ''}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* ── Sort Sheet (dropdown) ──────────────────────────────────────────── */}
      {showSortSheet && (
        <View className="bg-white border-b border-gray-100 shadow-md">
          {SORT_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              onPress={() => { setActiveSort(opt); setShowSortSheet(false); }}
              className={`px-4 py-3 flex-row items-center justify-between ${activeSort.value === opt.value ? 'bg-amber-50' : ''}`}
              activeOpacity={0.7}
            >
              <Text className={`text-sm font-medium ${activeSort.value === opt.value ? 'text-amber-700' : 'text-gray-700'}`}>
                {opt.label}
              </Text>
              {activeSort.value === opt.value && (
                <View className="w-2 h-2 rounded-full bg-amber-500" />
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* ── Price Filter Panel ─────────────────────────────────────────────── */}
      {showFilters && (
        <View className="bg-white border-b border-gray-100 px-4 py-4">
          <Text className="text-sm font-bold text-gray-700 mb-3">Price Range (₹)</Text>
          <View className="flex-row items-center gap-3">
            <View className="flex-1 flex-row items-center bg-gray-100 rounded-xl px-3 py-2">
              <Text className="text-gray-400 text-sm mr-1">₹</Text>
              <TextInput
                value={minPrice}
                onChangeText={setMinPrice}
                placeholder="Min"
                placeholderTextColor="#9ca3af"
                keyboardType="numeric"
                className="flex-1 text-sm text-gray-900"
              />
            </View>
            <Text className="text-gray-400">—</Text>
            <View className="flex-1 flex-row items-center bg-gray-100 rounded-xl px-3 py-2">
              <Text className="text-gray-400 text-sm mr-1">₹</Text>
              <TextInput
                value={maxPrice}
                onChangeText={setMaxPrice}
                placeholder="Max"
                placeholderTextColor="#9ca3af"
                keyboardType="numeric"
                className="flex-1 text-sm text-gray-900"
              />
            </View>
            {(minPrice || maxPrice) && (
              <TouchableOpacity
                onPress={() => { setMinPrice(''); setMaxPrice(''); }}
                className="p-2 bg-red-50 rounded-xl"
                activeOpacity={0.7}
              >
                <X size={16} color="#ef4444" />
              </TouchableOpacity>
            )}
          </View>
          {hasActiveFilters && (
            <TouchableOpacity
              onPress={clearAll}
              className="mt-3 flex-row items-center gap-1"
              activeOpacity={0.7}
            >
              <X size={13} color="#6b7280" />
              <Text className="text-xs text-gray-500 font-medium">Clear all filters</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* ── Content Area ───────────────────────────────────────────────────── */}
      {loading ? (
        // Loading
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#1f2937" />
          <Text className="text-gray-500 text-sm mt-3">Searching...</Text>
        </View>

      ) : !hasSearched ? (
        // Empty / Initial state — show popular searches
        <ScrollView className="flex-1" contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
          <View className="items-center mb-8 mt-4">
            <View className="w-20 h-20 rounded-full bg-gray-100 items-center justify-center mb-4">
              <SearchIcon size={36} color="#9ca3af" />
            </View>
            <Text className="text-xl font-bold text-gray-800 mb-1">Search Products</Text>
            <Text className="text-sm text-gray-500 text-center">
              Type a product name, material, or keyword
            </Text>
          </View>

          <Text className="text-sm font-bold text-gray-700 uppercase tracking-widest mb-3">
            Popular Searches
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {POPULAR_SEARCHES.map((term) => (
              <TouchableOpacity
                key={term}
                onPress={() => setQuery(term)}
                className="px-4 py-2 bg-white border border-gray-200 rounded-full shadow-sm"
                activeOpacity={0.7}
              >
                <Text className="text-sm text-gray-700 font-medium">{term}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

      ) : products.length === 0 ? (
        // No results
        <View className="flex-1 items-center justify-center px-8">
          <Package size={56} color="#d1d5db" />
          <Text className="text-xl font-bold text-gray-900 mt-4 mb-2 text-center">
            {query ? `No results for "${query}"` : 'No products found'}
          </Text>
          <Text className="text-sm text-gray-500 text-center mb-6">
            Try a different keyword or remove some filters.
          </Text>
          <TouchableOpacity
            onPress={clearAll}
            className="bg-gray-900 rounded-xl px-6 py-3"
            activeOpacity={0.85}
          >
            <Text className="text-white font-bold">Clear & Try Again</Text>
          </TouchableOpacity>
        </View>

      ) : (
        // Results grid
        <FlatList
          data={products}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={{ padding: 12, paddingBottom: 100 }}
          columnWrapperStyle={{ gap: 8, marginBottom: 8 }}
          keyboardShouldPersistTaps="handled"
          // Summary banner
          ListHeaderComponent={
            query ? (
              <View className="bg-amber-50 rounded-xl p-3 mb-3 border border-amber-100">
                <Text className="text-amber-800 text-sm">
                  Results for <Text className="font-bold">"{query}"</Text>
                  {hasActiveFilters ? ' · filtered' : ''}
                </Text>
              </View>
            ) : null
          }
          renderItem={({ item }) => (
            <View style={{ flex: 1 }}>
              <ProductCard product={item} />
            </View>
          )}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}
