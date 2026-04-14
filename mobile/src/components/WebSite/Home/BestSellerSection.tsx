import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { ArrowRight } from 'lucide-react-native';
import { router } from 'expo-router';
import  ProductCard  from '../ProductCard/ProductCardSimple';
import { publicProductService, PublicProduct } from '@/services/publicProductService';

interface BestSellerSectionProps {
  onAddToCart?: (productId: string, quantity: number) => void;
  onToggleWishlist?: (productId: string) => void;
}

export default function BestSellerSection({ onAddToCart, onToggleWishlist }: BestSellerSectionProps) {
  const [products, setProducts] = useState<PublicProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchBestSellerProducts();
  }, []);

  const fetchBestSellerProducts = async () => {
    setIsLoading(true);
    try {
      const response = await publicProductService.getBestSellerProducts(4);
      if (response.success && response.data) {
        setProducts(response.data.items);
      }
    } catch (error) {
      console.error('Error fetching best seller products:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View className="bg-white px-4 py-6">
        <View className="items-center justify-center py-12">
          <ActivityIndicator size="large" color="#374151" />
          <Text className="mt-4 text-gray-600">Loading best seller products...</Text>
        </View>
      </View>
    );
  }

  if (products.length === 0) {
    return null;
  }

  return (
    <View className="bg-white px-4 py-6">
      {/* Header Section */}
      <View className="flex-row items-center justify-between mb-4">
        <View className="flex-1">
          <Text className="text-xl font-bold text-gray-900">
            Best Seller Products
          </Text>
          <Text className="text-sm text-gray-600 mt-1">
            Highest rated products that have earned our customers' trust
          </Text>
        </View>
        <Pressable
          onPress={() => router.push('/(any)/products' as any)}
          accessibilityLabel="View all best seller products"
          accessibilityRole="button"
          style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
          className="flex-row items-center bg-gray-800 px-4 py-2 rounded-xl ml-2"
        >
          <Text className="text-white font-medium text-sm mr-1">View All</Text>
          <ArrowRight size={14} color="#ffffff" />
        </Pressable>
      </View>

      {/* Products Grid */}
      <View className="flex-row flex-wrap justify-between">
        {products.map((product) => (
          <View key={product.id} className="w-[48%] mb-4">
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
