import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StatusBar, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Search, ShoppingCart, Package } from 'lucide-react-native';
import { publicProductService, PublicProduct } from '@/services/publicProductService';
import { showErrorToast } from '@/lib/toast-utils';
import ProductDetail from '@/components/WebSite/Home/ProductDetail';

// Truncate to N words, append "..." if excess
function truncateWords(text: string, maxWords = 10): string {
  const words = text.trim().split(/\s+/);
  if (words.length <= maxWords) return text;
  return words.slice(0, maxWords).join(' ') + '…';
}

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [product, setProduct] = useState<PublicProduct | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) fetchProduct();
  }, [id]);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const response = await publicProductService.getProduct(id as string);
      if (response.success && response.data) {
        setProduct(response.data);
      } else {
        showErrorToast('Error', 'Failed to load product details');
      }
    } catch {
      showErrorToast('Error', 'Failed to load product details');
    } finally {
      setLoading(false);
    }
  };

  // ── Shared top bar ────────────────────────────────────────────────────────
  const TopBar = ({ title = 'Product Details' }: { title?: string }) => (
    <View
      className={`bg-[#1a1a2e] ${Platform.OS === 'ios' ? 'pt-0' : 'pt-4'} pb-3.5 px-4 flex-row items-center justify-between`}
    >
      {/* Back button + truncated title */}
      <TouchableOpacity
        onPress={() => router.back()}
        activeOpacity={0.7}
        className="flex-row items-center gap-2 flex-1 mr-3"
      >
        <ArrowLeft size={22} color="#ffffff" />
        <Text
          className="text-white text-base font-bold flex-shrink"
          numberOfLines={1}
        >
          {truncateWords(title, 15)}
        </Text>
      </TouchableOpacity>

      {/* Action icons */}
      <View className="flex-row items-center gap-3">
     
        <TouchableOpacity
          onPress={() => router.push('/(tabs)/cart' as any)}
          activeOpacity={0.7}
          className="p-1.5"
        >
          <ShoppingCart size={22} color="#e5e7eb" />
        </TouchableOpacity>
      </View>
    </View>
  );

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View className="flex-1 bg-slate-50">
        <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />
        <TopBar />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#1a1a2e" />
          <Text className="text-gray-500 mt-3 text-sm">Loading product…</Text>
        </View>
      </View>
    );
  }

  // ── Not found ─────────────────────────────────────────────────────────────
  if (!product) {
    return (
      <View className="flex-1 bg-slate-50">
        <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />
        <TopBar />
        <View className="flex-1 items-center justify-center px-8">
          <View className="w-20 h-20 rounded-full bg-gray-100 items-center justify-center mb-5">
            <Package size={40} color="#d1d5db" />
          </View>
          <Text className="text-[20px] font-extrabold text-gray-900 mb-2.5 text-center">
            Product Not Found
          </Text>
          <Text className="text-sm text-gray-500 text-center leading-[22px] mb-7">
            The product you're looking for doesn't exist or is no longer available.
          </Text>
          <TouchableOpacity
            onPress={() => router.back()}
            activeOpacity={0.85}
            className="bg-[#1a1a2e] rounded-2xl px-7 py-3.5 flex-row items-center gap-2"
          >
            <ArrowLeft size={16} color="#ffffff" />
            <Text className="text-white font-bold text-[15px]">Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Main ──────────────────────────────────────────────────────────────────
  return (
    <View className="flex-1 bg-slate-50">
      <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />
      <TopBar title={product.name} />
      <ProductDetail product={product} productId={id as string} />
    </View>
  );
}
