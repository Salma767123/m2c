import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Search, ShoppingCart, Package, SlidersHorizontal, X } from 'lucide-react-native';
import { publicProductService, PublicProduct } from '@/services/publicProductService';
import ProductCard from '@/components/WebSite/ProductCard/ProductCard';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function ProductsScreen() {
  const router = useRouter();
  const { category, subcategory } = useLocalSearchParams<{
    category?: string;
    subcategory?: string;
  }>();

  const [products, setProducts] = useState<PublicProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [totalItems, setTotalItems] = useState(0);

  // Determine the page title
  const getPageTitle = () => {
    if (subcategory) {
      return subcategory
        .replace(/-/g, ' ')
        .replace(/\b\w/g, (l) => l.toUpperCase());
    }
    if (category) {
      return category
        .replace(/-/g, ' ')
        .replace(/\b\w/g, (l) => l.toUpperCase());
    }
    return 'All Products';
  };

  const pageTitle = getPageTitle();

  useEffect(() => {
    fetchProducts();
  }, [category, subcategory]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const params: any = {
        page: 1,
        limit: 50,
        sortBy: 'createdAt',
        sortOrder: 'desc' as const,
      };

      if (category) params.category = category;
      if (subcategory) params.subCategory = subcategory;

      const response = await publicProductService.getProducts(params);

      if (response.success && response.data) {
        setProducts(response.data.items);
        setTotalItems(response.data.pagination.totalItems);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchProducts();
  }, [category, subcategory]);

  // ── Loading State ──
  if (loading) {
    return (
      <View className="flex-1 bg-gray-50">
        {/* Header */}
        <View
          className="bg-white px-4 py-3 flex-row items-center justify-between"
          style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.04,
            shadowRadius: 8,
            elevation: 2,
          }}
        >
          <View className="flex-row items-center flex-1">
            <TouchableOpacity
              onPress={() => router.back()}
              style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                backgroundColor: '#f1f5f9',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 12,
              }}
              activeOpacity={0.7}
            >
              <ArrowLeft size={20} color="#1e293b" />
            </TouchableOpacity>
            <Text
              className="text-lg font-bold text-gray-900"
              numberOfLines={1}
              style={{ flex: 1 }}
            >
              {pageTitle}
            </Text>
          </View>
          <View className="flex-row items-center" style={{ gap: 8 }}>
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/cart' as any)}
              style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                backgroundColor: '#f1f5f9',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              activeOpacity={0.7}
            >
              <ShoppingCart size={18} color="#64748b" />
            </TouchableOpacity>
          </View>
        </View>

        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#1f2937" />
          <Text className="mt-4 text-gray-500 text-sm">Loading products...</Text>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      {/* ── Premium Header ── */}
      <View
        className="bg-white px-4 py-3 flex-row items-center justify-between"
        style={{
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.04,
          shadowRadius: 8,
          elevation: 2,
        }}
      >
        <View className="flex-row items-center flex-1">
          <TouchableOpacity
            onPress={() => router.back()}
            style={{
              width: 38,
              height: 38,
              borderRadius: 12,
              backgroundColor: '#f1f5f9',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 12,
            }}
            activeOpacity={0.7}
          >
            <ArrowLeft size={20} color="#1e293b" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text
              className="text-lg font-bold text-gray-900"
              numberOfLines={1}
            >
              {pageTitle}
            </Text>
            {(category || subcategory) && (
              <Text className="text-xs text-gray-500">
                {totalItems} {totalItems === 1 ? 'product' : 'products'} found
              </Text>
            )}
          </View>
        </View>
        <View className="flex-row items-center" style={{ gap: 8 }}>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/cart' as any)}
            style={{
              width: 38,
              height: 38,
              borderRadius: 12,
              backgroundColor: '#f1f5f9',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            activeOpacity={0.7}
          >
            <ShoppingCart size={18} color="#64748b" />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Active Filters ── */}
      {(category || subcategory) && (
        <View
          style={{
            paddingHorizontal: 16,
            paddingVertical: 10,
            backgroundColor: '#ffffff',
            borderBottomWidth: 1,
            borderBottomColor: '#f1f5f9',
          }}
        >
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {category && (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: '#f1f5f9',
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 20,
                  }}
                >
                  <Text style={{ fontSize: 12, color: '#475569', fontWeight: '600' }}>
                    {category.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                  </Text>
                </View>
              )}
              {subcategory && (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: '#111827',
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 20,
                  }}
                >
                  <Text style={{ fontSize: 12, color: '#ffffff', fontWeight: '600' }}>
                    {subcategory.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                  </Text>
                </View>
              )}
              <TouchableOpacity
                onPress={() => router.push('/(any)/products' as any)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: '#fef2f2',
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 20,
                }}
                activeOpacity={0.7}
              >
                <X size={12} color="#ef4444" />
                <Text style={{ fontSize: 12, color: '#ef4444', fontWeight: '600', marginLeft: 4 }}>
                  Clear
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      )}

      {/* ── Products Grid ── */}
      {products.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <View
            style={{
              width: 100,
              height: 100,
              borderRadius: 50,
              backgroundColor: '#f1f5f9',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 24,
            }}
          >
            <Package size={40} color="#94a3b8" />
          </View>
          <Text className="text-xl font-bold text-gray-900 mb-2 text-center">
            No Products Found
          </Text>
          <Text className="text-gray-500 text-center text-sm mb-8 leading-5">
            {subcategory
              ? `No products available in this subcategory yet.\nCheck back soon for new arrivals!`
              : `No products match your current filters.\nTry a different category.`}
          </Text>
          <TouchableOpacity
            onPress={() => router.back()}
            activeOpacity={0.85}
            className="bg-gray-900 rounded-2xl px-8 py-4"
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.15,
              shadowRadius: 12,
              elevation: 6,
            }}
          >
            <Text className="text-white font-bold text-base">Go Back</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 12, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#1f2937"
              colors={['#1f2937']}
            />
          }
        >
          <View className="flex-row flex-wrap justify-between">
            {products.map((product) => (
              <View key={product.id} className="w-[48%] mb-4">
                <ProductCard product={product} />
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
}
