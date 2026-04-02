import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  Platform,
  Animated,
} from 'react-native';
import {
  ArrowLeft,
  Package,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
} from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { publicProductService, PublicProduct } from '@/services/publicProductService';
import ProductCard from '@/components/WebSite/ProductCard/ProductCard';

// ─── Constants ────────────────────────────────────────────────────────────────
const PAGE_SIZE = 10;

type BrowseType = 'featured' | 'bestseller' | 'topselling';

const TYPE_CONFIG: Record<BrowseType, {
  title: string;
  subtitle: string;
  fetcher: (page: number) => Promise<any>;
}> = {
  featured: {
    title: 'Featured Products',
    subtitle: 'Curated · Handpicked',
    fetcher: (page) => publicProductService.getFeaturedProductsPaged(page, PAGE_SIZE),
  },
  bestseller: {
    title: 'Best Sellers',
    subtitle: 'Most Loved · Top Rated',
    fetcher: (page) => publicProductService.getBestSellerProductsPaged(page, PAGE_SIZE),
  },
  topselling: {
    title: 'Top Selling',
    subtitle: 'Trending · High Demand',
    fetcher: (page) => publicProductService.getTopSellingProductsPaged(page, PAGE_SIZE),
  },
};

// ─── Skeleton Placeholder ─────────────────────────────────────────────────────
function SkeletonCard() {
  const anim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View
      style={{ opacity: anim, flex: 1 }}
      className="bg-white rounded-2xl overflow-hidden mb-3"
    >
      <View className="h-36 bg-gray-200" />
      <View className="p-3">
        <View className="h-3 bg-gray-200 rounded-full mb-2 w-2/3" />
        <View className="h-3 bg-gray-200 rounded-full mb-3 w-full" />
        <View className="h-3 bg-gray-200 rounded-full w-1/2" />
      </View>
    </Animated.View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function BrowseProductsScreen() {
  const router = useRouter();
  const { type } = useLocalSearchParams<{ type: BrowseType }>();
  const config = TYPE_CONFIG[(type as BrowseType)] ?? TYPE_CONFIG['featured'];

  const [products,    setProducts]    = useState<PublicProduct[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);
  const [pageLoading, setPageLoading] = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages,  setTotalPages]  = useState(1);
  const [totalItems,  setTotalItems]  = useState(0);

  const listRef = useRef<FlatList>(null);
  const headerAnim = useRef(new Animated.Value(0)).current;

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchPage = useCallback(async (page: number, isRefresh = false) => {
    try {
      setError(null);
      if (isRefresh) {
        setRefreshing(true);
      } else if (page === 1) {
        setLoading(true);
      } else {
        setPageLoading(true);
      }

      const response = await config.fetcher(page);

      if (response.success && response.data) {
        setProducts(response.data.items);
        setCurrentPage(response.data.pagination.currentPage);
        setTotalPages(response.data.pagination.totalPages);
        setTotalItems(response.data.pagination.totalItems);

        // Scroll to top on page change
        if (page > 1 || isRefresh) {
          setTimeout(() => listRef.current?.scrollToOffset({ offset: 0, animated: true }), 100);
        }
      } else {
        setError(response.message || 'Failed to load products');
      }
    } catch (e: any) {
      setError(e.message || 'Something went wrong');
    } finally {
      setLoading(false);
      setRefreshing(false);
      setPageLoading(false);
    }
  }, [type]);

  useEffect(() => {
    setCurrentPage(1);
    setProducts([]);
    setTotalPages(1);
    setTotalItems(0);
    fetchPage(1);

    // Header entrance animation
    Animated.timing(headerAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, [type]);

  const onRefresh = () => fetchPage(1, true);
  const goToPage  = (pg: number) => { if (pg >= 1 && pg <= totalPages) fetchPage(pg); };

  // ── Pagination Footer ──────────────────────────────────────────────────────
  const PaginationBar = totalPages > 1 ? (
    <View
      className="mx-4 mt-2 mb-6 bg-white rounded-2xl p-4"
      style={{ borderWidth: 1, borderColor: '#f3f4f6', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 }}
    >
      {/* Page info */}
      <View className="flex-row items-center justify-between mb-3">
        <Text className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider">
          Page {currentPage} of {totalPages}
        </Text>
        <Text className="text-[11px] text-gray-400 font-semibold">
          {totalItems} products total
        </Text>
      </View>

      {/* Controls row */}
      <View className="flex-row items-center justify-between gap-2">
        {/* Prev */}
        <TouchableOpacity
          onPress={() => goToPage(currentPage - 1)}
          disabled={currentPage <= 1 || pageLoading}
          activeOpacity={0.75}
          className="flex-row items-center gap-1.5 px-4 py-2.5 rounded-xl"
          style={{
            backgroundColor: currentPage <= 1 ? '#f9fafb' : '#111827',
            borderWidth: 1,
            borderColor: currentPage <= 1 ? '#e5e7eb' : '#111827',
          }}
        >
          <ChevronLeft size={14} color={currentPage <= 1 ? '#d1d5db' : '#ffffff'} />
          <Text
            className="text-sm font-bold"
            style={{ color: currentPage <= 1 ? '#d1d5db' : '#ffffff' }}
          >
            Prev
          </Text>
        </TouchableOpacity>

        {/* Page numbers — show up to 5 page pills */}
        <View className="flex-row items-center gap-1.5 flex-1 justify-center">
          {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
            // sliding window around currentPage
            let start = Math.max(1, currentPage - 2);
            const end = Math.min(totalPages, start + 4);
            if (end - start < 4) start = Math.max(1, end - 4);
            const pg = start + i;
            if (pg > totalPages) return null;
            const isActive = pg === currentPage;
            return (
              <TouchableOpacity
                key={pg}
                onPress={() => goToPage(pg)}
                disabled={pageLoading}
                activeOpacity={0.75}
                className="w-9 h-9 rounded-xl items-center justify-center"
                style={{
                  backgroundColor: isActive ? '#111827' : '#f3f4f6',
                  borderWidth: 1,
                  borderColor: isActive ? '#111827' : '#e5e7eb',
                }}
              >
                <Text
                  className="text-sm font-bold"
                  style={{ color: isActive ? '#ffffff' : '#6b7280' }}
                >
                  {pg}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Next */}
        <TouchableOpacity
          onPress={() => goToPage(currentPage + 1)}
          disabled={currentPage >= totalPages || pageLoading}
          activeOpacity={0.75}
          className="flex-row items-center gap-1.5 px-4 py-2.5 rounded-xl"
          style={{
            backgroundColor: currentPage >= totalPages ? '#f9fafb' : '#111827',
            borderWidth: 1,
            borderColor: currentPage >= totalPages ? '#e5e7eb' : '#111827',
          }}
        >
          <Text
            className="text-sm font-bold"
            style={{ color: currentPage >= totalPages ? '#d1d5db' : '#ffffff' }}
          >
            Next
          </Text>
          <ChevronRight size={14} color={currentPage >= totalPages ? '#d1d5db' : '#ffffff'} />
        </TouchableOpacity>
      </View>

      {/* Page-loading indicator */}
      {pageLoading && (
        <View className="items-center mt-3">
          <ActivityIndicator size="small" color="#111827" />
        </View>
      )}
    </View>
  ) : null;

  // ── List Header ────────────────────────────────────────────────────────────
  const ListHeader = (
    <View className="px-4 pt-4 pb-2 flex-row items-center justify-between">
      <View>
        <Text className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
          {config.subtitle}
        </Text>
        {!loading && totalItems > 0 && (
          <Text className="text-[12px] text-gray-500 mt-0.5 font-medium">
            Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, totalItems)} of {totalItems}
          </Text>
        )}
      </View>
      <View className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100">
        <LayoutGrid size={12} color="#6b7280" />
        <Text className="text-[11px] font-semibold text-gray-500">Grid</Text>
      </View>
    </View>
  );

  // ── Empty / Error ─────────────────────────────────────────────────────────
  const EmptyView = (
    <View className="flex-1 items-center justify-center py-24 px-8">
      <View
        className="w-20 h-20 rounded-full bg-gray-100 items-center justify-center mb-5"
        style={{ borderWidth: 1, borderColor: '#e5e5e5' }}
      >
        <Package size={34} color="#d1d5db" />
      </View>
      <Text className="text-lg font-black text-gray-900 text-center mb-2">
        {error ? 'Something went wrong' : 'No Products Found'}
      </Text>
      <Text className="text-sm text-gray-400 text-center leading-5">
        {error ?? "We couldn't find any products in this section right now."}
      </Text>
      <TouchableOpacity
        onPress={onRefresh}
        className="mt-6 bg-gray-900 px-7 py-3 rounded-xl"
        activeOpacity={0.85}
      >
        <Text className="text-white font-bold text-sm">Retry</Text>
      </TouchableOpacity>
    </View>
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <View className="flex-1 bg-gray-50">
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      {/* ── Top Bar ─────────────────────────────────────────────────────── */}
      <Animated.View
        className={`bg-black px-4 ${Platform.OS === 'ios' ? 'pt-14' : 'pt-5'} pb-5`}
        style={{
          opacity: headerAnim,
          transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [-12, 0] }) }],
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.2,
          shadowRadius: 8,
          elevation: 6,
        }}
      >
        <View className="flex-row items-center">
          {/* Back button */}
          <TouchableOpacity
            onPress={() => router.back()}
            activeOpacity={0.7}
            className="mr-3 w-9 h-9 rounded-xl items-center justify-center"
            style={{ backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' }}
          >
            <ArrowLeft size={18} color="#ffffff" />
          </TouchableOpacity>

          {/* Title block */}
          <View className="flex-1">
            <Text className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest mb-0.5">
              {config.subtitle}
            </Text>
            <Text className="text-xl font-black text-white tracking-tight" numberOfLines={1}>
              {config.title}
            </Text>
          </View>

          {/* Right: product count bubble */}
          {!loading && totalItems > 0 && (
            <View
              className="items-center justify-center px-3 py-1.5 rounded-xl ml-2"
              style={{ backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' }}
            >
              <Text className="text-[11px] font-extrabold text-white">{totalItems}</Text>
              <Text className="text-[8px] text-gray-500 font-semibold uppercase leading-tight">items</Text>
            </View>
          )}
        </View>
      </Animated.View>

      {/* ── Content ─────────────────────────────────────────────────────── */}
      {loading ? (
        // ── Skeleton grid ────────────────────────────────────────────────
        <View className="flex-1 px-3 pt-4">
          <View className="flex-row gap-2 mb-3">
            <SkeletonCard />
            <SkeletonCard />
          </View>
          <View className="flex-row gap-2 mb-3">
            <SkeletonCard />
            <SkeletonCard />
          </View>
          <View className="flex-row gap-2">
            <SkeletonCard />
            <SkeletonCard />
          </View>
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
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#111827"
              colors={['#111827']}
            />
          }
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
    </View>
  );
}
