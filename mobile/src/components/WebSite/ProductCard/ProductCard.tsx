import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { Star, ShoppingCart, Heart, Plus, Minus } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { cartService } from '@/services/cartService';
import { wishlistService } from '@/services/wishlistService';
import { userAuthService } from '@/services/userAuthService';
import { Product as ServiceProduct } from '@/services/productService';
import { PublicProduct } from '@/services/publicProductService';
import { showSuccessToast, showErrorToast } from '@/lib/toast-utils';

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

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [isTogglingWishlist, setIsTogglingWishlist] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();

  useEffect(() => {
    checkAuthStatus();
    checkWishlistStatus();
  }, [product.id]);

  const checkAuthStatus = async () => {
    try {
      const authenticated = await userAuthService.isAuthenticated();
      setIsAuthenticated(authenticated);
    } catch (error) {
      console.error('Error checking auth status:', error);
    }
  };

  const checkWishlistStatus = async () => {
    try {
      if (isAuthenticated) {
        const inWishlist = await wishlistService.isInWishlist(product.id);
        setIsInWishlist(inWishlist);
      } else {
        const inLocalWishlist = await wishlistService.isInLocalWishlist(product.id);
        setIsInWishlist(inLocalWishlist);
      }
    } catch (error) {
      console.error('Error checking wishlist status:', error);
    }
  };

  const handleAddToCart = async () => {
    if (!isAuthenticated) {
      showErrorToast('Login Required', 'Please login to add items to cart');
      setTimeout(() => {
        router.push('/(auth)/Login' as any);
      }, 1500);
      return;
    }

    if (!product.inStock) {
      showErrorToast('Out of Stock', 'This product is currently out of stock');
      return;
    }

    setIsAddingToCart(true);
    try {
      await cartService.addToCart(product.id, quantity);
      showSuccessToast('Added to Cart', `${quantity} x ${product.name} added to your cart`);
      setQuantity(1);
    } catch (error: any) {
      console.error('Error adding to cart:', error);
      showErrorToast('Failed', error.message || 'Unable to add item to cart');
    } finally {
      setIsAddingToCart(false);
    }
  };

  const handleToggleWishlist = async () => {
    if (!isAuthenticated) {
      showErrorToast('Login Required', 'Please login to add items to wishlist');
      setTimeout(() => {
        router.push('/(auth)/Login' as any);
      }, 1500);
      return;
    }

    setIsTogglingWishlist(true);
    try {
      if (isInWishlist) {
        await wishlistService.removeFromWishlist(product.id);
        setIsInWishlist(false);
        showSuccessToast('Removed', `${product.name} removed from wishlist`);
      } else {
        await wishlistService.addToWishlist(product.id);
        setIsInWishlist(true);
        showSuccessToast('Added', `${product.name} added to wishlist`);
      }
    } catch (error: any) {
      console.error('Error toggling wishlist:', error);
      showErrorToast('Failed', error.message || 'Unable to update wishlist');
    } finally {
      setIsTogglingWishlist(false);
    }
  };

  const handleProductPress = () => {
    router.push(`(any)/products/${product.id}` as any);
  };

  const handleIncrement = () => {
    setQuantity(prev => prev + 1);
  };

  const handleDecrement = () => {
    if (quantity > 1) {
      setQuantity(prev => prev - 1);
    }
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

  const reviewCount = product.reviews || 0;

  return (
    <TouchableOpacity
      onPress={handleProductPress}
      className="bg-white rounded-xl shadow-md overflow-hidden"
      activeOpacity={0.7}
    >
      {/* Product Image */}
      <View className="relative h-48 bg-gray-100">
        <Image
          source={{ uri: imageUrl }}
          className="w-full h-full"
          resizeMode="cover"
          defaultSource={{ uri: placeholderImage }}
        />
        
        {/* Discount Badge */}
        {product.discount && (
          <View className="absolute top-2 left-2 bg-gray-800 rounded px-2 py-1">
            <Text className="text-xs font-bold text-white">
              {product.discount}% OFF
            </Text>
          </View>
        )}
        
        {/* Wishlist Button */}
        <TouchableOpacity
          onPress={handleToggleWishlist}
          disabled={isTogglingWishlist}
          className={`absolute top-2 ${product.inStock ? 'right-2' : 'right-24'} p-2 rounded-full shadow-md ${
            isInWishlist 
              ? 'bg-red-500' 
              : 'bg-white'
          }`}
        >
          <Heart
            size={18}
            color={isInWishlist ? '#ffffff' : '#6b7280'}
            fill={isInWishlist ? '#ffffff' : 'transparent'}
          />
        </TouchableOpacity>

        {/* Out of Stock Badge */}
        {!product.inStock && (
          <View className="absolute top-2 right-2 bg-gray-500 rounded px-2 py-1">
            <Text className="text-xs font-semibold text-white">
              Out of Stock
            </Text>
          </View>
        )}
      </View>

      {/* Product Info */}
      <View className="p-4">
        {/* Category */}
        {product.category && (
          <Text className="text-xs text-gray-600 font-medium mb-1">
            {product.category}
          </Text>
        )}

        {/* Product Name */}
        <Text className="text-sm font-bold text-gray-900 mb-2 min-h-[40px]" numberOfLines={2}>
          {product.name}
        </Text>

        {/* Rating */}
        {product.rating && (
          <View className="mb-2">
            <View className="flex-row items-center mb-1">
              <View className="flex-row">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    size={12}
                    color={i < Math.floor(product.rating || 0) ? '#fbbf24' : '#d1d5db'}
                    fill={i < Math.floor(product.rating || 0) ? '#fbbf24' : 'transparent'}
                  />
                ))}
              </View>
              <Text className="text-sm font-bold text-gray-900 ml-2">
                {product.rating.toFixed(1)}
              </Text>
            </View>
            <Text className="text-xs text-gray-600">
              ({reviewCount} reviews)
            </Text>
          </View>
        )}

        {/* Price */}
        <View className="flex-row items-center justify-between mb-3">
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
          {product.discount && (
            <View className="bg-gray-800 rounded px-2 py-1">
              <Text className="text-xs font-bold text-white">
                {product.discount}% OFF
              </Text>
            </View>
          )}
        </View>

        {/* Quantity Selector */}
        {product.inStock && (
          <View className="flex-row items-center gap-2 mb-2">
            <TouchableOpacity
              onPress={handleDecrement}
              disabled={quantity <= 1}
              className="w-8 h-8 items-center justify-center border border-gray-300 rounded"
            >
              <Minus size={16} color={quantity <= 1 ? '#d1d5db' : '#374151'} />
            </TouchableOpacity>
            <Text className="w-12 text-center font-semibold text-gray-900">
              {quantity}
            </Text>
            <TouchableOpacity
              onPress={handleIncrement}
              className="w-8 h-8 items-center justify-center border border-gray-300 rounded"
            >
              <Plus size={16} color="#374151" />
            </TouchableOpacity>
          </View>
        )}

        {/* Add to Cart Button */}
        <TouchableOpacity
          onPress={handleAddToCart}
          disabled={!product.inStock || isAddingToCart}
          className={`flex-row items-center justify-center py-3 rounded-xl ${
            product.inStock && !isAddingToCart
              ? 'bg-gray-800'
              : 'bg-gray-300'
          }`}
        >
          <ShoppingCart size={16} color="#ffffff" />
          <Text className="text-white font-bold text-sm ml-2">
            {isAddingToCart ? 'Adding...' : product.inStock ? 'Add to Cart' : 'Out of Stock'}
          </Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}
