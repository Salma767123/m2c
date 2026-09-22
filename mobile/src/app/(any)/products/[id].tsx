import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, ActivityIndicator, StatusBar, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { ArrowLeft, ShoppingCart, Package, Heart } from 'lucide-react-native';
import { recordRecentlyViewed } from '@/lib/browsingHistory';
import { publicProductService, PublicProduct } from '@/services/publicProductService';
import { showErrorToast } from '@/lib/toast-utils';
import ProductDetail from '@/components/WebSite/Home/ProductDetail';
import { useCart } from '@/context/CartContext';
import { ProductDetailSkeleton } from '@/components/ui/Skeleton';
import { useWishlist } from '@/context/WishlistContext';

/**
 * This bar is white, like the main Header and like the web's.
 *
 * It was solid brand red, so everything on it was painted white — the back
 * arrow, the product title, all three glyphs, and both badge fills. On white
 * every one of those is invisible, so the repaint had to carry all of them
 * across rather than swap a single fill.
 */
const WHITE_BAR = '#ffffff';
const BAR_INK = '#e01a1b';

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
  return (
    <>
    <View
      className="pb-3.5 px-4 flex-row items-center justify-between"
      style={{ paddingTop: insets.top + 12, backgroundColor: WHITE_BAR }}
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
        <ArrowLeft size={22} color={BAR_INK} />
        <Text
          className="text-base font-bold flex-shrink"
          style={{ color: '#1a1a1a' }}
          numberOfLines={1}
        >
          {truncateWords(title, 15)}
        </Text>
      </Pressable>

      <View className="flex-row items-center gap-4">
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
          <Heart size={22} color={BAR_INK} />
          {wishlistCount > 0 && (
            // Red fill, white digits, white ring — the web's
            // `bg-[#e01a1b] text-white ring-2 ring-white`. It was inverted
            // (white fill, red digits) only to survive a red bar; on white
            // that reads as a hole punched in the header, not a count.
            <View
              className="absolute -top-1 -right-1 min-w-[16px] h-4 rounded-full items-center justify-center px-1"
              style={{ backgroundColor: BAR_INK, borderWidth: 1.5, borderColor: WHITE_BAR }}
            >
              <Text className="text-[9px] font-bold" style={{ color: '#ffffff' }}>
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
          <ShoppingCart size={22} color={BAR_INK} />
          {itemCount > 0 && (
            // Red as well, like the wishlist badge and like the web — the
            // amber was mobile's own signal for "items waiting", and the
            // main Header dropped it when that bar went white.
            <View
              className="absolute -top-1 -right-1 min-w-[16px] h-4 rounded-full items-center justify-center px-1"
              style={{ backgroundColor: BAR_INK, borderWidth: 1.5, borderColor: WHITE_BAR }}
            >
              <Text className="text-[9px] font-bold" style={{ color: '#ffffff' }}>
                {itemCount > 99 ? '99+' : itemCount}
              </Text>
            </View>
          )}
        </Pressable>
      </View>
    </View>
    {/* Brand edge, so the bar reads as an object — same as the main Header.
        It was Brand[700]: a deeper step was needed to separate a red edge from
        a red bar, and on white that deep shade reads as a bruise. */}
    <View style={{ height: 3, backgroundColor: BAR_INK }} />
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
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
        <TopBar insets={insets} router={router} />
        <ProductDetailSkeleton />
      </View>
    );
  }

  // ── Not found ─────────────────────────────────────────────────────────────
  if (!product) {
    return (
      <View className="flex-1 bg-slate-50">
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
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
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <TopBar title={product.name} insets={insets} router={router} />
      <ProductDetail product={product} productId={id as string} />
    </View>
  );
}
