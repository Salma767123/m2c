import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator, Share, RefreshControl, StatusBar, Platform } from 'react-native';
import { Heart, ShoppingCart, Share2, Trash2, ArrowRight, Package, Tag } from 'lucide-react-native';
import { router } from 'expo-router';
import { showSuccessToast, showErrorToast } from '@/lib/toast-utils';
import { wishlistService, WishlistItem } from '@/services/wishlistService';
import { cartService } from '@/services/cartService';
import { userAuthService } from '@/services/userAuthService';

const fmt = (n: number) => `₹${n.toFixed(2)}`;

const Wishlist = () => {
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    checkAuthAndLoad();
  }, []);

  const checkAuthAndLoad = async () => {
    const authStatus = await userAuthService.isAuthenticated();
    setIsAuthenticated(authStatus);

    if (!authStatus) {
      setIsLoading(false);
      return;
    }
    loadWishlist();
  };

  const loadWishlist = async () => {
    try {
      setIsLoading(true);
      const response = await wishlistService.getWishlist();
      if (response.success && response.data) {
        setWishlistItems(response.data.items);
      }
    } catch (error: any) {
      console.error('Error loading wishlist:', error);
      showErrorToast('Load Failed', 'Unable to load wishlist');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    if (isAuthenticated) {
      loadWishlist();
    } else {
      setRefreshing(false);
    }
  };

  const removeFromWishlist = async (productId: string) => {
    try {
      await wishlistService.removeFromWishlist(productId);
      setWishlistItems(items => items.filter(item => item.productId !== productId));
      showSuccessToast('Removed', 'Item removed from wishlist');
    } catch (error: any) {
      console.error('Error removing from wishlist:', error);
      showErrorToast('Failed', 'Unable to remove item from wishlist');
    }
  };

  const addToCart = async (productId: string, productName: string) => {
    try {
      await cartService.addToCart(productId, 1);
      showSuccessToast('Added to Cart!', `${productName} has been added to your cart.`);
    } catch (error: any) {
      console.error('Error adding to cart:', error);
      showErrorToast('Failed to Add', 'Unable to add item to cart. Please try again.');
    }
  };

  const shareProduct = async (productId: string, productName: string) => {
    try {
      const url = `https://m2cmarkdowns.com/products/${productId}`; 
      await Share.share({
        message: `Check out this amazing product: ${productName} - ${url}`,
        title: productName,
      });
    } catch (error) {
      showErrorToast('Share Failed', 'Unable to share product. Please try again.');
    }
  };

  if (isLoading && !refreshing) {
    return (
      <View className="flex-1 bg-gray-50 items-center justify-center">
        <ActivityIndicator size="large" color="#000000" />
        <Text className="text-gray-500 mt-4">Loading wishlist...</Text>
      </View>
    );
  }

  // ── Authentication State ──────────────────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <View className="flex-1 bg-gray-50">
        <StatusBar barStyle="light-content" backgroundColor="#000000" />
        
        {/* Header */}
        <View className={`bg-black ${Platform.OS === 'ios' ? 'pt-0' : 'pt-4'} pb-5 px-5`}>
          <Text className="text-white text-2xl font-extrabold tracking-tight">My Wishlist</Text>
          <Text className="text-gray-400 text-xs mt-0.5">Please login to view</Text>
        </View>

        <View className="flex-1 items-center justify-center p-8">
          <View className="w-24 h-24 rounded-full bg-gray-200 items-center justify-center mb-6">
            <Heart size={48} color="#9ca3af" />
          </View>
          <Text className="text-2xl font-extrabold text-gray-900 mb-2 text-center">Login Required</Text>
          <Text className="text-sm text-gray-500 mb-8 text-center leading-5">
            Please log in to view and save items to your wishlist.
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/(auth)/Login' as any)}
            activeOpacity={0.85}
            className="bg-black px-8 py-4 rounded-2xl flex-row items-center justify-center w-full"
            style={{ shadowColor: '#000000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 10, elevation: 6 }}
          >
            <Text className="text-white text-base font-bold text-center">Login to Continue</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Empty State ────────────────────────────────────────────────────────────
  if (wishlistItems.length === 0) {
    return (
      <View className="flex-1 bg-gray-50">
        <StatusBar barStyle="light-content" backgroundColor="#000000" />
        
        {/* Header */}
        <View className={`bg-black ${Platform.OS === 'ios' ? 'pt-0' : 'pt-4'} pb-5 px-5`}>
          <Text className="text-white text-2xl font-extrabold tracking-tight">My Wishlist</Text>
          <Text className="text-gray-400 text-xs mt-0.5">0 items</Text>
        </View>

        <View className="flex-1 items-center justify-center p-8">
          <View className="w-24 h-24 rounded-full bg-gray-200 items-center justify-center mb-6">
            <Heart size={48} color="#9ca3af" />
          </View>
          <Text className="text-2xl font-extrabold text-gray-900 mb-2 text-center">Your Wishlist is Empty</Text>
          <Text className="text-sm text-gray-500 mb-8 text-center leading-5 px-4">
            Save items you love to your wishlist and never lose track of them.
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)')}
            activeOpacity={0.85}
            className="bg-black px-8 py-4 rounded-2xl flex-row items-center gap-2"
          >
            <Text className="text-white font-bold text-base">Start Shopping</Text>
            <ArrowRight size={18} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Main Layout ──────────────────────────────────────────────────────────
  return (
    <View className="flex-1 bg-gray-50">
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      
      {/* ── Page Header ─────────────────────────────────────────────────────── */}
      <View className={`bg-black ${Platform.OS === 'ios' ? 'pt-0' : 'pt-4'} pb-5 px-5`}>
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-white text-2xl font-extrabold tracking-tight">My Wishlist</Text>
            <Text className="text-gray-400 text-xs mt-0.5">
              {wishlistItems.length} item{wishlistItems.length !== 1 ? 's' : ''}
            </Text>
          </View>
          {/* Item count chip */}
          <View className="bg-gray-200 rounded-full px-3.5 py-1.5">
            <Text className="text-black font-extrabold text-xs">{wishlistItems.length}</Text>
          </View>
        </View>
      </View>

      <ScrollView 
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#000000" />}
      >
        <View className="px-4 pt-4">

          {/* Map through wishlist items */}
          {wishlistItems.map((item, index) => {
            if (!item.product) return null;
            const isLast = index === wishlistItems.length - 1;
            const isOutOfStock = !item.product.inStock;

            return (
              <View 
                key={item.id} 
                className={`bg-white rounded-[20px] overflow-hidden shadow-sm ${isLast ? '' : 'mb-3'} border-[1.5px] border-transparent`}
              >
                {/* ── Product Info Row ────────────────────────────────────────── */}
                <View className="p-4 flex-row gap-3">
                  
                  {/* Left 25% — Product Image */}
                  <View className="w-[25%] relative">
                    {item.product.image ? (
                      <Image
                        source={{ uri: item.product.image }}
                        className="w-full aspect-square rounded-2xl bg-gray-100"
                        resizeMode="cover"
                      />
                    ) : (
                      <View className="w-full aspect-square rounded-2xl bg-gray-100 items-center justify-center">
                        <Package size={28} color="#d1d5db" />
                      </View>
                    )}
                    
                    {/* Discount Badge */}
                    {item.product.discount && item.product.discount > 0 ? (
                      <View className="absolute top-1 left-1 bg-gray-800 rounded-md px-1 py-0.5">
                        <Text className="text-white text-[9px] font-extrabold">-{item.product.discount}%</Text>
                      </View>
                    ) : null}
                  </View>

                  {/* Right 75% — Details */}
                  <View className="flex-1">
                    {/* Name & Trash Row */}
                    <View className="flex-row items-start justify-between mb-1.5">
                      <Text 
                        className="flex-1 text-[15px] font-bold text-gray-900 leading-5 mr-2" 
                        numberOfLines={2}
                      >
                        {item.product.name}
                      </Text>
                      <TouchableOpacity
                        onPress={() => removeFromWishlist(item.productId)}
                        className="p-1 -mt-0.5"
                        activeOpacity={0.7}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Trash2 size={17} color="#374151" />
                      </TouchableOpacity>
                    </View>

                    {/* Tags */}
                    <View className="flex-row flex-wrap gap-1.5">
                      {item.product.category ? (
                         <View className="bg-gray-100 px-2 py-0.5 rounded-md">
                           <Text className="text-[11px] text-gray-700 font-semibold">{item.product.category}</Text>
                         </View>
                      ) : null}
                    </View>

                    {/* Price & Out of Stock tag */}
                    <View className="mt-3">
                       <View className="flex-row items-center gap-2">
                        <Text className="text-[17px] font-extrabold text-gray-900">
                          {fmt(item.product.basePrice)}
                        </Text>
                        {item.product.originalPrice && item.product.originalPrice > item.product.basePrice && (
                          <Text className="text-xs text-gray-400 line-through">
                            {fmt(item.product.originalPrice)}
                          </Text>
                        )}
                      </View>
                      
                       {!item.product.inStock && (
                          <Text className="text-[11px] font-bold text-red-500 mt-1">
                             Out of Stock
                          </Text>
                       )}
                    </View>

                  </View>
                </View>

                {/* ── Add to Cart & Share Actions ──────────────────────────── */}
                <View className="flex-row border-t border-gray-100 bg-gray-50/50">
                  <TouchableOpacity
                    onPress={() => addToCart(item.productId, item.product!.name)}
                    disabled={isOutOfStock}
                    activeOpacity={0.8}
                    className={`flex-1 flex-row items-center justify-center py-3.5 border-r border-gray-100 ${
                      !isOutOfStock ? 'bg-black' : 'bg-gray-100'
                    }`}
                  >
                    <ShoppingCart size={16} color={!isOutOfStock ? "#ffffff" : "#9ca3af"} />
                    <Text className={`ml-2 text-sm font-bold tracking-wide ${!isOutOfStock ? 'text-white' : 'text-gray-400'}`}>
                      {!isOutOfStock ? 'ADD TO CART' : 'OUT OF STOCK'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => shareProduct(item.productId, item.product!.name)}
                    activeOpacity={0.7}
                    className="px-6 items-center justify-center bg-white"
                  >
                    <Share2 size={18} color="#374151" />
                  </TouchableOpacity>
                </View>

              </View>
            );
          })}

          {/* ── Wishlist Tips ──────────────────────────────────────────────── */}
          <View className="bg-white rounded-[20px] mt-4 shadow-sm p-4">
            <View className="flex-row items-center justify-center gap-2 mb-4">
              <View className="w-8 h-8 bg-gray-100 rounded-xl items-center justify-center">
                <Tag size={15} color="#374151" />
              </View>
              <Text className="text-[15px] font-bold text-gray-900">Wishlist Tips</Text>
            </View>

            <View className="gap-3.5 pl-1">
              {[
                { icon: Heart, label: 'Save for Later', desc: 'Tap the heart icon on any product to save it' },
                { icon: Share2, label: 'Share', desc: 'Share your wishlist with family for gift ideas' },
                { icon: ShoppingCart, label: 'Add to Cart', desc: 'Easily move items right to your cart' },
              ].map(({ icon: Icon, label, desc }, idx) => (
                <View key={idx} className="flex-row items-center gap-3">
                  <View className="w-9 h-9 bg-gray-100 rounded-xl items-center justify-center">
                    <Icon size={16} color="#4b5563" />
                  </View>
                  <View className="flex-1">
                    <Text className="font-bold text-gray-900 text-sm">{label}</Text>
                    <Text className="text-[11px] text-gray-500 mt-0.5">{desc}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

        </View>
      </ScrollView>
    </View>
  );
};

export default Wishlist;
