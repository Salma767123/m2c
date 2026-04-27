import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, ActivityIndicator, StatusBar, Platform, Share as RNShare } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { ArrowLeft, ShoppingCart, Package, Share2, Heart } from 'lucide-react-native';
import { publicProductService, PublicProduct } from '@/services/publicProductService';
import { showErrorToast } from '@/lib/toast-utils';
import ProductDetail from '@/components/WebSite/Home/ProductDetail';
import { useCart } from '@/context/CartContext';
import { ProductDetailSkeleton } from '@/components/ui/Skeleton';
import { useWishlist } from '@/context/WishlistContext';

// Truncate to N words, append "..." if excess
function truncateWords(text: string, maxWords = 10): string {
  const words = text.trim().split(/\s+/);
  if (words.length <= maxWords) return text;
  return words.slice(0, maxWords).join(' ') + '…';
}

// ── Shared TopBar Component ──────────────────────────────────────────

const TopBar = ({ 
  title = 'Product Details', 
  router, 
  insets 
}: { 
  title?: string; 
  router: any; 
  insets: any 
}) => {
  const { itemCount } = useCart();
  const { wishlistCount } = useWishlist();
  const handleShare = async () => {
    try {
      if (typeof Haptics !== 'undefined') await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await RNShare.share({
        message: `Check out this product: ${title}`,
      });
    } catch (error) {
      console.error('Sharing error:', error);
    }
  };

  return (
    <View
      className="bg-[#111827] pb-3.5 px-4 flex-row items-center justify-between"
      style={{ paddingTop: 12 }}
    >
      <Pressable
        onPress={async () => {
          if (typeof Haptics !== 'undefined') await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.back();
        }}
        accessibilityRole="button"
        accessibilityLabel="Go Back"
        style={({ pressed }) => ({
          opacity: pressed ? 0.6 : 1,
        })}
        className="flex-row items-center gap-2 flex-1 mr-3"
      >
        <ArrowLeft size={22} color="#ffffff" />
        <Text
          className="text-white text-base font-bold flex-shrink"
          numberOfLines={1}
        >
          {truncateWords(title, 15)}
        </Text>
      </Pressable>

      <View className="flex-row items-center gap-4">
        <Pressable
          onPress={handleShare}
          accessibilityRole="button"
          accessibilityLabel="Share Product"
          style={({ pressed }) => ({
            opacity: pressed ? 0.6 : 1,
          })}
          className="p-1"
        >
          <Share2 size={22} color="#ffffff" />
        </Pressable>

        <Pressable
          onPress={async () => {
             if (typeof Haptics !== 'undefined') await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
             router.push('/(tabs)/wishlist' as any);
          }}
          accessibilityRole="button"
          accessibilityLabel="View Wishlist"
          style={({ pressed }) => ({
            opacity: pressed ? 0.6 : 1,
          })}
          className="p-1 relative"
        >
          <Heart size={22} color="#ffffff" />
          {wishlistCount > 0 && (
            <View className="absolute -top-1 -right-1 bg-red-500 min-w-[16px] h-4 rounded-full items-center justify-center px-1 border border-[#111827]">
              <Text className="text-white text-[9px] font-bold">{wishlistCount > 99 ? '99+' : wishlistCount}</Text>
            </View>
          )}
        </Pressable>

        <Pressable
          onPress={async () => {
             if (typeof Haptics !== 'undefined') await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
             router.push('/(tabs)/cart' as any);
          }}
          accessibilityRole="button"
          accessibilityLabel="View Cart"
          style={({ pressed }) => ({
            opacity: pressed ? 0.6 : 1,
          })}
          className="p-1 relative"
        >
          <ShoppingCart size={22} color="#ffffff" />
          {itemCount > 0 && (
            <View className="absolute -top-1 -right-1 bg-amber-500 min-w-[16px] h-4 rounded-full items-center justify-center px-1 border border-[#111827]">
              <Text className="text-[#111827] text-[9px] font-bold">{itemCount > 99 ? '99+' : itemCount}</Text>
            </View>
          )}
        </Pressable>
      </View>
    </View>
  );
};

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [product, setProduct] = useState<PublicProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const insets = useSafeAreaInsets();

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

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View className="flex-1 bg-slate-50">
        <StatusBar barStyle="light-content" backgroundColor="#111827" translucent={false} />
        <TopBar insets={insets} router={router} />
        <ProductDetailSkeleton />
      </View>
    );
  }

  // ── Not found ─────────────────────────────────────────────────────────────
  if (!product) {
    return (
      <View className="flex-1 bg-slate-50">
        <StatusBar barStyle="light-content" backgroundColor="#111827" translucent={false} />
        <TopBar insets={insets} router={router} />
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
          <Pressable
            onPress={async () => {
              if (typeof Haptics !== 'undefined') await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.back();
            }}
            accessibilityRole="button"
            accessibilityLabel="Go back to previous page"
            style={({ pressed }) => ({
              opacity: pressed ? 0.8 : 1,
              transform: [{ scale: pressed ? 0.98 : 1 }]
            })}
            className="bg-[#111827] rounded-2xl px-7 py-3.5 flex-row items-center gap-2"
          >
            <ArrowLeft size={16} color="#ffffff" />
            <Text className="text-white font-bold text-[15px]">Go Back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ── Main ──────────────────────────────────────────────────────────────────
  return (
    <View className="flex-1 bg-slate-50">
      <StatusBar barStyle="light-content" backgroundColor="#111827" translucent={false} />
      <TopBar title={product.name} insets={insets} router={router} />
      <ProductDetail product={product} productId={id as string} />
    </View>
  );
}
