import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Star, Heart, Truck, Shield, RotateCcw, Package, ChevronDown, ChevronUp } from 'lucide-react-native';
import { PublicProduct } from '@/services/publicProductService';
import { cartService } from '@/services/cartService';
import { wishlistService } from '@/services/wishlistService';
import { userAuthService } from '@/services/userAuthService';
import { showSuccessToast, showErrorToast } from '@/lib/toast-utils';

const { width } = Dimensions.get('window');

interface ProductDetailProps {
  product: PublicProduct;
  productId: string;
}

export default function ProductDetail({ product, productId }: ProductDetailProps) {
  const router = useRouter();
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState<any>(null);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [showAllDetails, setShowAllDetails] = useState(false);

  useEffect(() => {
    checkWishlistStatus();
  }, [productId]);

  const checkWishlistStatus = async () => {
    try {
      const authenticated = await userAuthService.isAuthenticated();
      if (authenticated) {
        const inWishlist = await wishlistService.isInWishlist(productId);
        setIsWishlisted(inWishlist);
      } else {
        const inLocalWishlist = await wishlistService.isInLocalWishlist(productId);
        setIsWishlisted(inLocalWishlist);
      }
    } catch (error) {
      console.error('Error checking wishlist:', error);
    }
  };

  const handleAddToCart = async () => {
    const authenticated = await userAuthService.isAuthenticated();
    if (!authenticated) {
      showErrorToast('Login Required', 'Please login to add items');
      setTimeout(() => router.push('/(auth)/Login'), 1500);
      return;
    }
    try {
      await cartService.addToCart(product.id, quantity);
      const variantInfo = selectedVariant ? ` (${selectedVariant.size} - ${selectedVariant.color})` : '';
      showSuccessToast('Added to Cart', `${quantity} x ${product.name}${variantInfo} added to your cart`);
      setQuantity(1);
    } catch (error: any) {
      showErrorToast('Failed', error.message || 'Unable to add item');
    }
  };

  const handleBuyNow = async () => {
    const authenticated = await userAuthService.isAuthenticated();
    if (!authenticated) {
      showErrorToast('Login Required', 'Please login to continue');
      setTimeout(() => router.push('/(auth)/Login'), 1500);
      return;
    }
    showSuccessToast('Coming Soon', 'Checkout feature will be available soon');
  };

  const handleToggleWishlist = async () => {
    const authenticated = await userAuthService.isAuthenticated();
    if (!authenticated) {
      showErrorToast('Login Required', 'Please login');
      setTimeout(() => router.push('/(auth)/Login'), 1500);
      return;
    }
    try {
      if (isWishlisted) {
        await wishlistService.removeFromWishlist(product.id);
        setIsWishlisted(false);
        showSuccessToast('Removed', `${product.name} removed from wishlist`);
      } else {
        await wishlistService.addToWishlist(product.id);
        setIsWishlisted(true);
        showSuccessToast('Added', `${product.name} added to wishlist`);
      }
    } catch (error: any) {
      showErrorToast('Failed', error.message || 'Unable to update wishlist');
    }
  };

  const handleIncrement = () => {
    setQuantity(prev => prev + 1);
  };

  const handleDecrement = () => {
    if (quantity > 1) {
      setQuantity(prev => prev - 1);
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        size={16}
        color={i < Math.floor(rating) ? '#fbbf24' : '#d1d5db'}
        fill={i < Math.floor(rating) ? '#fbbf24' : 'transparent'}
      />
    ));
  };

  const displayImages = selectedVariant?.images?.length > 0
    ? selectedVariant.images.map((url: string) => ({ url }))
    : product.images || [];
  const currentPrice = selectedVariant?.price || product.adminFixedPrice || product.basePrice;
  const originalPrice = product.originalPrice;
  const currentImageUrl = displayImages[selectedImage]?.url;

  return (
    <ScrollView className="flex-1 bg-gray-50">
      {/* Product Images */}
      <View className="bg-white">
        <View className="relative" style={{ height: width }}>
          {currentImageUrl ? (
            <Image
              source={{ uri: currentImageUrl }}
              style={{ width, height: width }}
              resizeMode="cover"
            />
          ) : (
            <View className="w-full h-full items-center justify-center bg-gray-100">
              <Package size={80} color="#9ca3af" />
            </View>
          )}

          {/* Wishlist Button */}
          <TouchableOpacity
            onPress={handleToggleWishlist}
            className="absolute top-4 right-4 p-3 rounded-full bg-white shadow-lg"
          >
            <Heart
              size={24}
              color={isWishlisted ? '#ef4444' : '#6b7280'}
              fill={isWishlisted ? '#ef4444' : 'transparent'}
            />
          </TouchableOpacity>
        </View>

        {/* Image Thumbnails */}
        {displayImages.length > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="px-4 py-3"
          >
            {displayImages.map((image: any, index: number) => (
              <TouchableOpacity
                key={index}
                onPress={() => setSelectedImage(index)}
                className={`w-16 h-16 rounded-lg overflow-hidden mr-2 border-2 ${
                  selectedImage === index ? 'border-blue-500' : 'border-gray-200'
                }`}
              >
                {image.url ? (
                  <Image
                    source={{ uri: image.url }}
                    className="w-full h-full"
                    resizeMode="cover"
                  />
                ) : (
                  <View className="w-full h-full items-center justify-center bg-gray-100">
                    <Package size={24} color="#9ca3af" />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>

      {/* Product Info */}
      <View className="bg-white px-4 py-6 mt-2">
        {/* Title and Rating */}
        <Text className="text-2xl font-bold text-gray-900 mb-3">{product.name}</Text>

        <View className="flex-row items-center mb-4">
          <View className="flex-row mr-2">
            {renderStars(product.rating || 0)}
          </View>
          <Text className="text-sm text-gray-600">
            {product.rating || 0} ({product.reviews || 0} reviews)
          </Text>
        </View>

        {/* Price */}
        <View className="bg-gray-50 rounded-xl p-4 mb-4">
          <View className="flex-row items-baseline">
            <Text className="text-3xl font-bold text-gray-900">
              ${currentPrice?.toFixed(2)}
            </Text>
            {originalPrice && originalPrice > currentPrice && (
              <>
                <Text className="text-lg text-gray-500 line-through ml-2">
                  ${originalPrice.toFixed(2)}
                </Text>
                <View className="bg-gray-800 rounded-full px-2 py-1 ml-2">
                  <Text className="text-xs font-bold text-white">
                    Save ${(originalPrice - currentPrice).toFixed(2)}
                  </Text>
                </View>
              </>
            )}
          </View>
          <Text className="text-xs text-gray-600 mt-1">Price includes all taxes</Text>
        </View>

        {/* Variants */}
        {product.hasVariants && product.variants && product.variants.length > 0 && (
          <View className="mb-4">
            <Text className="text-lg font-bold text-gray-900 mb-3">
              Select Variant: {selectedVariant ? `${selectedVariant.size} - ${selectedVariant.color}` : 'Choose one'}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {/* Base Variant */}
              <TouchableOpacity
                onPress={() => {
                  setSelectedVariant(null);
                  setSelectedImage(0);
                }}
                className={`mr-2 p-3 border-2 rounded-xl ${
                  !selectedVariant ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'
                }`}
                style={{ width: 140 }}
              >
                {product.images && product.images.length > 0 && (
                  <Image
                    source={{ uri: product.images.find(img => img.isPrimary)?.url || product.images[0].url }}
                    className="w-full h-20 rounded-lg mb-2"
                    resizeMode="cover"
                  />
                )}
                <Text className="font-bold text-sm text-gray-900">
                  {product.singleUnitSize || product.singleUnitColor || 'Base Variant'}
                </Text>
                {product.singleUnitColor && (
                  <View className="flex-row items-center mt-1">
                    {product.singleUnitColorHex && (
                      <View
                        className="w-4 h-4 rounded-full border border-gray-300 mr-1"
                        style={{ backgroundColor: product.singleUnitColorHex }}
                      />
                    )}
                    <Text className="text-xs text-gray-600">{product.singleUnitColor}</Text>
                  </View>
                )}
                <Text className="text-lg font-bold text-gray-900 mt-1">
                  ${(product.adminFixedPrice || product.basePrice).toFixed(2)}
                </Text>
                <Text className="text-xs text-gray-500">
                  {(product.inventory?.currentStock ?? product.totalStock) > 0
                    ? `${product.inventory?.currentStock ?? product.totalStock} in stock`
                    : 'Out of stock'}
                </Text>
              </TouchableOpacity>

              {product.variants.map((variant) => (
                <TouchableOpacity
                  key={variant.id}
                  onPress={() => {
                    if (selectedVariant?.id === variant.id) {
                      setSelectedVariant(null);
                    } else {
                      setSelectedVariant(variant);
                    }
                    setSelectedImage(0);
                  }}
                  className={`mr-2 p-3 border-2 rounded-xl ${
                    selectedVariant?.id === variant.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 bg-white'
                  }`}
                  style={{ width: 140 }}
                >
                  {variant.images && variant.images.length > 0 && (
                    <Image
                      source={{ uri: variant.images[0] }}
                      className="w-full h-20 rounded-lg mb-2"
                      resizeMode="cover"
                    />
                  )}
                  <Text className="font-bold text-sm text-gray-900">{variant.size}</Text>
                  <View className="flex-row items-center mt-1">
                    {variant.colorHex && (
                      <View
                        className="w-4 h-4 rounded-full border border-gray-300 mr-1"
                        style={{ backgroundColor: variant.colorHex }}
                      />
                    )}
                    <Text className="text-xs text-gray-600">{variant.color}</Text>
                  </View>
                  <Text className="text-lg font-bold text-gray-900 mt-1">
                    ${variant.price.toFixed(2)}
                  </Text>
                  <Text className="text-xs text-gray-500">
                    {variant.stock > 0 ? `${variant.stock} in stock` : 'Out of stock'}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Single Unit Size and Color - Show only if NO variants */}
        {!product.hasVariants && (product.singleUnitSize || product.singleUnitColor) && (
          <View className="bg-gray-50 rounded-xl p-4 border border-gray-200 mb-4">
            <Text className="text-lg font-bold text-gray-900 mb-3">Product Details</Text>
            {product.singleUnitSize && (
              <View className="flex-row items-center mb-2">
                <Text className="text-sm font-semibold text-gray-600 w-16">Size:</Text>
                <View className="bg-white border border-gray-300 rounded-full px-3 py-1">
                  <Text className="text-sm font-bold text-gray-900">{product.singleUnitSize}</Text>
                </View>
              </View>
            )}
            {product.singleUnitColor && (
              <View className="flex-row items-center">
                <Text className="text-sm font-semibold text-gray-600 w-16">Color:</Text>
                <View className="flex-row items-center">
                  {product.singleUnitColorHex && (
                    <View
                      className="w-6 h-6 rounded-full border-2 border-gray-300 mr-2"
                      style={{ backgroundColor: product.singleUnitColorHex }}
                    />
                  )}
                  <View className="bg-white border border-gray-300 rounded-full px-3 py-1">
                    <Text className="text-sm font-bold text-gray-900">{product.singleUnitColor}</Text>
                  </View>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Stock Status */}
        <View className="mb-4">
          {product.inStock && (!selectedVariant || selectedVariant.stock > 0) ? (
            <View className="flex-row items-center">
              <View className="w-3 h-3 bg-green-500 rounded-full mr-2" />
              <Text className="text-green-600 font-bold">In stock</Text>
              <Text className="text-gray-600 ml-2">
                ({selectedVariant?.stock || product.totalStock} available)
              </Text>
            </View>
          ) : (
            <View className="flex-row items-center">
              <View className="w-3 h-3 bg-gray-500 rounded-full mr-2" />
              <Text className="text-gray-600 font-bold">Out of Stock</Text>
            </View>
          )}
        </View>

        {/* Dispatch Timeline */}
        {product.dispatchTimeline && (
          <View className="bg-blue-50 p-3 rounded-lg mb-4">
            <Text className="text-sm text-gray-700">
              <Text className="font-bold">Dispatch: </Text>
              {product.dispatchTimeline.processingDays} days processing +{' '}
              {product.dispatchTimeline.shippingDays} days shipping
              <Text className="text-blue-600 font-bold">
                {' '}(Total: {product.dispatchTimeline.totalDays} days)
              </Text>
            </Text>
          </View>
        )}

        {/* Quantity and Actions */}
        {product.inStock && (!selectedVariant || selectedVariant.stock > 0) && (
          <View>
            {/* Quantity Selector */}
            <View className="flex-row items-center justify-center mb-4">
              <Text className="text-sm font-bold text-gray-700 mr-3">Quantity:</Text>
              <TouchableOpacity
                onPress={handleDecrement}
                disabled={quantity <= 1}
                className="w-10 h-10 items-center justify-center border-2 border-gray-300 rounded-lg"
              >
                <Text className="text-xl font-bold">−</Text>
              </TouchableOpacity>
              <Text className="w-16 text-center font-bold text-lg">{quantity}</Text>
              <TouchableOpacity
                onPress={handleIncrement}
                className="w-10 h-10 items-center justify-center border-2 border-gray-300 rounded-lg"
              >
                <Text className="text-xl font-bold">+</Text>
              </TouchableOpacity>
            </View>

            {/* Action Buttons */}
            <TouchableOpacity
              onPress={handleAddToCart}
              className="bg-white border-2 border-gray-800 py-4 rounded-xl mb-3"
            >
              <Text className="text-gray-800 font-bold text-center text-lg">Add to Cart</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleBuyNow}
              className="bg-gray-800 py-4 rounded-xl"
            >
              <Text className="text-white font-bold text-center text-lg">Buy Now</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Product Details */}
      <View className="bg-white px-4 py-6 mt-2">
        <Text className="text-xl font-bold text-gray-900 mb-4">Product Details</Text>

        {product.category && (
          <View className="flex-row justify-between py-3 border-b border-gray-100">
            <Text className="font-semibold text-gray-700">Category</Text>
            <Text className="text-gray-600">{product.category}</Text>
          </View>
        )}

        {product.subCategory && (
          <View className="flex-row justify-between py-3 border-b border-gray-100">
            <Text className="font-semibold text-gray-700">Sub Category</Text>
            <Text className="text-gray-600">{product.subCategory}</Text>
          </View>
        )}

        {product.material && (
          <View className="flex-row justify-between py-3 border-b border-gray-100">
            <Text className="font-semibold text-gray-700">Material</Text>
            <Text className="text-gray-600">{product.material}</Text>
          </View>
        )}

        {product.fabricType && (
          <View className="flex-row justify-between py-3 border-b border-gray-100">
            <Text className="font-semibold text-gray-700">Fabric Type</Text>
            <Text className="text-gray-600">{product.fabricType}</Text>
          </View>
        )}

        {product.dimensions && (
          <View className="flex-row justify-between py-3 border-b border-gray-100">
            <Text className="font-semibold text-gray-700">Dimensions</Text>
            <Text className="text-gray-600">{product.dimensions}</Text>
          </View>
        )}

        {product.weight && (
          <View className="flex-row justify-between py-3 border-b border-gray-100">
            <Text className="font-semibold text-gray-700">Weight</Text>
            <Text className="text-gray-600">{product.weight}</Text>
          </View>
        )}

        {showAllDetails && product.hasVariants && (
          <View className="flex-row justify-between py-3 border-b border-gray-100">
            <Text className="font-semibold text-gray-700">Available Variants</Text>
            <Text className="text-gray-600">{product.variants?.length || 0}</Text>
          </View>
        )}

        <View className="mt-4">
          <Text className="text-lg font-bold text-gray-900 mb-2">About this item</Text>
          <Text className="text-gray-600 leading-6">{product.description}</Text>
        </View>

        {/* Tags */}
        {product.tags && product.tags.length > 0 && (
          <View className="mt-4">
            <Text className="text-sm font-bold text-gray-700 mb-2">Tags:</Text>
            <View className="flex-row flex-wrap">
              {product.tags.map((tag, index) => (
                <View key={index} className="bg-gray-100 rounded-full px-3 py-1 mr-2 mb-2">
                  <Text className="text-xs text-gray-700">{tag}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Fabric Specifications */}
        {product.fabricSpecifications && typeof product.fabricSpecifications === 'object' && (
          <View className="mt-4">
            <Text className="text-sm font-bold text-gray-700 mb-2">Fabric Specifications:</Text>
            <View className="space-y-2">
              {Object.entries(product.fabricSpecifications).map(([key, value]) => {
                if (key === 'careInstructions') return null; // Skip care instructions here
                return (
                  <View key={key} className="flex-row items-start mb-2">
                    <View className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3" />
                    <Text className="text-gray-600 text-sm flex-1">
                      <Text className="font-semibold">
                        {key.replace(/([A-Z])/g, ' $1').trim()}:
                      </Text>{' '}
                      {Array.isArray(value) ? value.join(', ') : String(value)}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* See More/Less Toggle */}
        <TouchableOpacity
          onPress={() => setShowAllDetails(!showAllDetails)}
          className="mt-4 flex-row items-center"
        >
          {showAllDetails ? (
            <ChevronUp size={16} color="#2563eb" />
          ) : (
            <ChevronDown size={16} color="#2563eb" />
          )}
          <Text className="text-blue-600 font-semibold ml-1">
            {showAllDetails ? 'See less' : 'See more'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Care Instructions */}
      {product.fabricSpecifications &&
        typeof product.fabricSpecifications === 'object' &&
        'careInstructions' in product.fabricSpecifications &&
        Array.isArray((product.fabricSpecifications as any).careInstructions) &&
        (product.fabricSpecifications as any).careInstructions.length > 0 && (
          <View className="bg-white px-4 py-6 mt-2">
            <Text className="text-xl font-bold text-gray-900 mb-4">Care Instructions</Text>
            <View className="space-y-3">
              {(product.fabricSpecifications as any).careInstructions.map(
                (instruction: string, index: number) => (
                  <View key={index} className="flex-row items-start bg-gray-50 rounded-xl p-3">
                    <View className="w-6 h-6 bg-gray-800 rounded-full items-center justify-center mr-3">
                      <Text className="text-white text-xs font-bold">{index + 1}</Text>
                    </View>
                    <Text className="text-gray-700 flex-1">{instruction}</Text>
                  </View>
                )
              )}
            </View>
          </View>
        )}

      {/* Features */}
      <View className="bg-white px-4 py-6 mt-2 mb-4">
        <Text className="text-xl font-bold text-gray-900 mb-4">Why choose this product?</Text>

        <View className="bg-green-50 p-4 rounded-xl mb-3 flex-row items-center">
          <Truck size={32} color="#16a34a" />
          <View className="ml-4 flex-1">
            <Text className="font-bold text-gray-900">Fast Dispatch</Text>
            <Text className="text-sm text-gray-600">
              {product.dispatchTimeline
                ? `Ships in ${product.dispatchTimeline.totalDays} days`
                : 'Quick delivery'}
            </Text>
          </View>
        </View>

        <View className="bg-blue-50 p-4 rounded-xl mb-3 flex-row items-center">
          <Shield size={32} color="#2563eb" />
          <View className="ml-4 flex-1">
            <Text className="font-bold text-gray-900">Quality Guarantee</Text>
            <Text className="text-sm text-gray-600">Premium materials and craftsmanship</Text>
          </View>
        </View>

        <View className="bg-purple-50 p-4 rounded-xl flex-row items-center">
          <RotateCcw size={32} color="#9333ea" />
          <View className="ml-4 flex-1">
            <Text className="font-bold text-gray-900">30-Day Returns</Text>
            <Text className="text-sm text-gray-600">Easy returns and exchanges</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
