import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Product as ServiceProduct } from '@/services/productService';
import { PublicProduct } from '@/services/publicProductService';

// Type definitions matching frontend
interface MockProduct {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  discount?: number;
  images?: string[];
  rating?: number;
  reviews?: number;
  inStock: boolean;
  category?: string;
  description?: string;
}

type Product = ServiceProduct | MockProduct | PublicProduct;

interface ProductCardSimpleProps {
  product: Product;
}

export default function ProductCardSimple({ product }: ProductCardSimpleProps) {
  const router = useRouter();

  const handleProductPress = () => {
    router.push(`(any)/products/${product.id}` as any);
  };

  // Type guard to check if it's a ServiceProduct (from API)
  const isServiceProduct = (p: any): p is ServiceProduct => {
    return 'basePrice' in p || 'adminFixedPrice' in p;
  };

  // Get the primary image or first image
  let primaryImage: string | undefined;
  
  if (product.images && Array.isArray(product.images) && product.images.length > 0) {
    const firstImage = product.images[0];
    
    // Check if it's an object with url property (ServiceProduct)
    if (typeof firstImage === 'object' && firstImage !== null && 'url' in firstImage) {
      const images = product.images as Array<{ url: string; isPrimary: boolean }>;
      const primaryImg = images.find(img => img.isPrimary && img.url && img.url.trim() !== '');
      const firstImg = images.find(img => img.url && img.url.trim() !== '');
      primaryImage = primaryImg?.url || firstImg?.url;
    } 
    // Check if it's a string (MockProduct)
    else if (typeof firstImage === 'string') {
      const images = product.images as string[];
      primaryImage = images.find(img => img && img.trim() !== '');
    }
  }

  // Fallback placeholder image
  const placeholderImage = 'https://via.placeholder.com/400x400?text=No+Image';
  const imageUrl = primaryImage || placeholderImage;

  // Get price - use adminFixedPrice if available, otherwise basePrice or price
  let displayPrice: number | undefined;
  
  if (isServiceProduct(product)) {
    // For API products, prioritize adminFixedPrice, then basePrice
    displayPrice = product.adminFixedPrice !== null && product.adminFixedPrice !== undefined 
      ? product.adminFixedPrice 
      : product.basePrice;
  } else {
    // For mock products, use price property
    displayPrice = (product as any).price;
  }

  return (
    <TouchableOpacity
      onPress={handleProductPress}
      className="bg-white rounded-xl shadow-md overflow-hidden"
      activeOpacity={0.7}
    >
      {/* Product Image */}
      <View className="relative h-32 bg-gray-100">
        <Image
          source={{ uri: imageUrl }}
          className="w-full h-full"
          resizeMode="cover"
          defaultSource={{ uri: placeholderImage }}
        />
      </View>

      {/* Product Info */}
      <View className="p-4">
        {/* Product Name */}
        <Text className="text-sm font-bold text-gray-900 mb-2" numberOfLines={1} ellipsizeMode="tail">
          {product.name}
        </Text>

        {/* Price */}
        <View className="flex-row items-center">
          <Text className="text-xl font-bold text-gray-900">
            ${displayPrice?.toFixed(2) || '0.00'}
          </Text>
          {product.originalPrice && (
            <Text className="text-sm text-red-600 line-through ml-2">
              ${product.originalPrice.toFixed(2)}
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}
