import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Search, ShoppingCart, ArrowLeft } from 'lucide-react-native';
import { publicProductService, PublicProduct } from '@/services/publicProductService';
import { showErrorToast } from '@/lib/toast-utils';
import ProductDetail from '@/components/WebSite/Home/ProductDetail';

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [product, setProduct] = useState<PublicProduct | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchProduct();
    }
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
    } catch (error) {
      console.error('Failed to fetch product:', error);
      showErrorToast('Error', 'Failed to load product details');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-white">
        {/* Header */}
        <View className="bg-white p-4 flex-row items-center justify-between border-b border-gray-200">
          <View className="flex-row items-center">
            <TouchableOpacity onPress={() => router.back()} className="mr-3">
              <ArrowLeft size={24} color="#111827" />
            </TouchableOpacity>
            <Text className="text-xl font-bold text-gray-800">Product Details</Text>
          </View>
          <View className="flex-row items-center space-x-4 gap-4">
            <TouchableOpacity onPress={() => router.push("/(any)/search" as any)}>
              <Search size={24} color="#374151" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push("/(tabs)/cart" as any)}>
              <ShoppingCart size={24} color="#374151" />
            </TouchableOpacity>
          </View>
        </View>
        
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#374151" />
          <Text className="mt-4 text-gray-600">Loading product...</Text>
        </View>
      </View>
    );
  }

  if (!product) {
    return (
      <View className="flex-1 bg-white">
        {/* Header */}
        <View className="bg-white p-4 flex-row items-center justify-between border-b border-gray-200">
          <View className="flex-row items-center">
            <TouchableOpacity onPress={() => router.back()} className="mr-3">
              <ArrowLeft size={24} color="#111827" />
            </TouchableOpacity>
            <Text className="text-xl font-bold text-gray-800">Product Details</Text>
          </View>
          <View className="flex-row items-center space-x-4 gap-4">
            <TouchableOpacity onPress={() => router.push("/(any)/search" as any)}>
              <Search size={24} color="#374151" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push("/(tabs)/cart" as any)}>
              <ShoppingCart size={24} color="#374151" />
            </TouchableOpacity>
          </View>
        </View>
        
        <View className="flex-1 items-center justify-center px-4">
          <Text className="text-2xl font-bold text-gray-900 mb-4">Product Not Found</Text>
          <Text className="text-gray-600 mb-8 text-center">
            The product you're looking for doesn't exist or is no longer available.
          </Text>
          <TouchableOpacity
            onPress={() => router.back()}
            className="bg-gray-800 px-6 py-3 rounded-lg"
          >
            <Text className="text-white font-bold">Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      {/* Header */}
      <View className="bg-white p-4 flex-row items-center justify-between border-b border-gray-200">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mr-3">
            <ArrowLeft size={24} color="#111827" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-gray-800">Product Details</Text>
        </View>
        <View className="flex-row items-center space-x-4 gap-4">
          <TouchableOpacity onPress={() => router.push("/(any)/search" as any)}>
            <Search size={24} color="#374151" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push("/(tabs)/cart" as any)}>
            <ShoppingCart size={24} color="#374151" />
          </TouchableOpacity>
        </View>
      </View>
      
      <ProductDetail product={product} productId={id as string} />
    </View>
  );
}
