import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
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
    <View className="bg-gray-50 px-4 py-6">
      {/* Header Section */}
      <View className="flex-row items-center justify-between mb-4">
        <View className="flex-1">
          <Text className="text-xl font-bold text-gray-900">
            Featured Products
          </Text>
          <Text className="text-sm text-gray-600 mt-1">
            Handpicked selection of our finest traditional textiles
          </Text>
        </View>
        <Pressable
          onPress={() => router.push('/(any)/products' as any)}
          accessibilityLabel="View all featured products"
          accessibilityRole="button"
          style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
          className="flex-row items-center bg-gray-800 px-4 py-2 rounded-xl ml-2"
        >
          <Text className="text-white font-medium text-sm mr-1">View All</Text>
          <ArrowRight size={14} color="#ffffff" />
        </Pressable>
      </View>

      {/* ── Products Grid ──────────────────────────────────────────────────── */}
      <View className="flex-row flex-wrap justify-between">
        {products.map((product) => (
          <View key={product.id} className="w-[48.5%] mb-3">
            <ProductCard product={product} />
          </View>
        ))}
      </View>

      {/* Bottom View All Button */}
      <View className="items-center mt-4">
        <Pressable
          onPress={() => router.push('/(any)/products' as any)}
          accessibilityLabel="View all products"
          accessibilityRole="button"
          style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
          className="bg-gray-800 px-8 py-3 rounded-xl"
        >
          <Text className="text-white font-bold">View All Products</Text>
        </Pressable>
      </View>
    </View>
  );
}
