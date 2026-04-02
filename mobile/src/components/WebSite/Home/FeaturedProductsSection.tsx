import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { ArrowRight } from 'lucide-react-native';
import { router } from 'expo-router';
import ProductCard from '../ProductCard/ProductCard';
import { publicProductService, PublicProduct } from '@/services/publicProductService';

interface FeaturedProductsSectionProps {
  onAddToCart?: (productId: string, quantity: number) => void;
  onToggleWishlist?: (productId: string) => void;
}

export default function FeaturedProductsSection({ onAddToCart, onToggleWishlist }: FeaturedProductsSectionProps) {
  const [products, setProducts] = useState<PublicProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchFeaturedProducts();
  }, []);

  const fetchFeaturedProducts = async () => {
    setIsLoading(true);
    try {
      const response = await publicProductService.getFeaturedProducts(4);
      if (response.success && response.data) {
        setProducts(response.data.items);
      }
    } catch (error) {
      console.error('Error fetching featured products:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View className="bg-gray-50 px-4 py-8">
        <View className="items-center justify-center py-12">
          <ActivityIndicator size="large" color="#111827" />
          <Text className="mt-3 text-xs text-gray-400 tracking-widest uppercase">
            Loading…
          </Text>
        </View>
      </View>
    );
  }

  if (products.length === 0) return null;

  return (
    <View className="bg-gray-50 px-4 pt-6 pb-4">

      {/* ── Section Header ─────────────────────────────────────────────────── */}
      <View className="flex-row items-center justify-between mb-5">
        {/* Left: accent bar + title */}
        <View className="flex-row items-center flex-1">
          <View className="w-1 h-6 bg-black rounded-full mr-3" />
          <View>
            <Text className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-0.5">
              Curated
            </Text>
            <Text className="text-lg font-bold text-gray-900 leading-tight">
              Featured Products
            </Text>
          </View>
        </View>

        {/* Right: ghost "View All" link */}
        <TouchableOpacity
          onPress={() => router.push('/products' as any)}
          className="flex-row items-center bg-gray-700 px-3 py-1.5 rounded-lg"
        >
          <Text className="text-sm font-semibold text-gray-100 mr-1">View All</Text>
          <ArrowRight size={12} color="#f5f5f5" />
        </TouchableOpacity>
      </View>

      {/* ── Products Grid ──────────────────────────────────────────────────── */}
      <View className="flex-row flex-wrap justify-between">
        {products.map((product) => (
          <View key={product.id} className="w-[48.5%] mb-3">
            <ProductCard product={product} />
          </View>
        ))}
      </View>

    </View>
  );
}
