import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, ActivityIndicator, StatusBar, Platform, Share as RNShare } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { ArrowLeft, ShoppingCart, Package, Share2, Heart } from 'lucide-react-native';
import { recordRecentlyViewed } from '@/lib/browsingHistory';
import { publicProductService, PublicProduct } from '@/services/publicProductService';
import { showErrorToast } from '@/lib/toast-utils';
import ProductDetail from '@/components/WebSite/Home/ProductDetail';
import { useCart } from '@/context/CartContext';
import { ProductDetailSkeleton } from '@/components/ui/Skeleton';
import { useWishlist } from '@/context/WishlistContext';
import { Palette } from '@/constants/theme';

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
    <>
    <View
      className="pb-3.5 px-4 flex-row items-center justify-between"
      style={{ paddingTop: insets.top + 12, backgroundColor: Palette.headerSurface }}
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
          <Heart size={22} color={Palette.onBrand} />
          {wishlistCount > 0 && (
            // White-on-red, not red-on-red. The header is brand red now, so a
            // red badge would disappear into it — the same rule the main Header
            // states: on brand chrome, accents are white or near-white, never red.
            <View
              className="absolute -top-1 -right-1 min-w-[16px] h-4 rounded-full items-center justify-center px-1"
              style={{ backgroundColor: Palette.onBrand, borderWidth: 1.5, borderColor: Palette.headerSurface }}
            >
              <Text className="text-[9px] font-bold" style={{ color: Palette.primary }}>
                {wishlistCount > 99 ? '99+' : wishlistCount}
              </Text>
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
          <ShoppingCart size={22} color={Palette.onBrand} />
          {itemCount > 0 && (
            // Cart keeps amber so "items waiting" stays its own signal, distinct
            // from the wishlist badge — again matching the main Header.
            <View
              className="absolute -top-1 -right-1 min-w-[16px] h-4 rounded-full items-center justify-center px-1"
              style={{ backgroundColor: Palette.warning, borderWidth: 1.5, borderColor: Palette.headerSurface }}
            >
              <Text className="text-[9px] font-bold" style={{ color: Palette.surfaceInverse }}>
                {itemCount > 99 ? '99+' : itemCount}
              </Text>
            </View>
          )}
        </Pressable>
      </View>
    </View>
    {/* Darker bottom edge, so the bar reads as an object — same as the main Header. */}
    <View style={{ height: 3, backgroundColor: Palette.headerEdge }} />
    </>
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
        // Feeds the "Recently viewed" rail on Profile, as the web's
        // ProductDetail does on its own fetch.
        recordRecentlyViewed(response.data.id);
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
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <TopBar insets={insets} router={router} />
        <ProductDetailSkeleton />
      </View>
    );
  }

  // ── Not found ─────────────────────────────────────────────────────────────
  if (!product) {
    return (
      <View className="flex-1 bg-slate-50">
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
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
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <TopBar title={product.name} insets={insets} router={router} />
      <ProductDetail product={product} productId={id as string} />
    </View>
  );
}
