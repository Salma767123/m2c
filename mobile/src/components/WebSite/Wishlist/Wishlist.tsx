import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import {
  Heart,
  ShoppingCart,
  Trash2,
  ArrowRight,
  Package,
  AlertCircle,
} from 'lucide-react-native';
import { router } from 'expo-router';
import { showSuccessToast, showErrorToast } from '@/lib/toast-utils';
import { wishlistService, WishlistItem } from '@/services/wishlistService';
import { publicProductService } from '@/services/publicProductService';
import { cartService } from '@/services/cartService';
import { userAuthService } from '@/services/userAuthService';
import { useWishlist } from '@/context/WishlistContext';
import { useCart } from '@/context/CartContext';
import { WishlistSkeleton } from '@/components/ui/Skeleton';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getRegionalPrice, getRegionalOriginalPrice, formatPrice as fmtCurrency } from '@/lib/currency';

const LOW_STOCK_THRESHOLD = 5;

type StockInfo = {
  stock: number;
  status: 'in_stock' | 'low_stock' | 'out_of_stock';
  livePrice?: number;
  priceChanged?: boolean;
  liveName?: string;
  liveImage?: string;
  liveOriginalPrice?: number;
  liveDiscount?: number;
};

const fmt = (n: number) => fmtCurrency(n);

export default function Wishlist() {
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [addingToCart, setAddingToCart] = useState<string | null>(null);

  const { refreshWishlist } = useWishlist();
  const { refreshCart, itemCount } = useCart();

  // Live stock info keyed by productId
  const [stockMap, setStockMap] = useState<Record<string, StockInfo>>({});
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    (async () => {
      const auth = await userAuthService.isAuthenticated();
      setIsAuthenticated(auth);
      if (auth) await loadWishlist();
      else setIsLoading(false);
    })();
  }, []);

  // Sync stock on mount — tabs use router.replace() so component remounts on each tab switch
  useEffect(() => {
    if (wishlistItems.length > 0) syncWishlistStock(wishlistItems);
  }, [wishlistItems.length]);

  const syncWishlistStock = async (items: WishlistItem[]) => {
    setIsSyncing(true);
    const map: Record<string, StockInfo> = {};
    await Promise.allSettled(
      items.map(async (item) => {
        try {
          const res = await publicProductService.getProduct(item.productId);
          if (!res.success || !res.data) return;
          const p = res.data;

          // For variant products, totalStock is sum of all variants — use baseStock instead
          const stock = p.hasVariants
            ? (p.inventory?.baseStock ?? 0)
            : (p.inventory?.availableStock ?? p.totalStock ?? 0);
          const livePrice = getRegionalPrice(p as any);
          const oldPrice = getRegionalPrice(item.product as any);
          const priceChanged = Math.abs(oldPrice - livePrice) >= 0.01;
          const primaryImg = p.images?.find((img: any) => img.isPrimary)?.url || p.images?.[0]?.url;

          map[item.productId] = {
            stock: Math.max(0, stock),
            status: stock <= 0 ? 'out_of_stock' : stock <= LOW_STOCK_THRESHOLD ? 'low_stock' : 'in_stock',
            livePrice,
            priceChanged,
            liveName: p.name,
            liveImage: primaryImg,
            liveOriginalPrice: getRegionalOriginalPrice(p as any) ?? undefined,
            liveDiscount: p.discount,
          };

        } catch {
          // skip failed items
        }
      }),
    );
    setStockMap(map);
    setIsSyncing(false);
  };

  const loadWishlist = async () => {
    try {
      setIsLoading(true);
      const res = await wishlistService.getWishlist();
      if (res.success && res.data) {
        setWishlistItems(res.data.items);
      }
    } catch {
      showErrorToast('Load Failed', 'Unable to load wishlist');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    if (isAuthenticated) loadWishlist();
    else setRefreshing(false);
  }, [isAuthenticated]);

  const removeItem = async (productId: string, name?: string) => {
    try {
      if (typeof Haptics !== 'undefined') await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await wishlistService.removeFromWishlist(productId);
      setWishlistItems((prev) => prev.filter((i) => i.productId !== productId));
      showSuccessToast('Removed', `${name || 'Item'} removed from wishlist.`);
      refreshWishlist();
    } catch {
      showErrorToast('Failed', 'Unable to remove item.');
    }
  };

  const moveToCart = async (productId: string, name: string) => {
    if (addingToCart) return;
    try {
      if (typeof Haptics !== 'undefined') await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setAddingToCart(productId);
      await cartService.addToCart(productId, 1);
      showSuccessToast('Added to Cart!', `${name} added to your cart.`);
      refreshCart();
    } catch (e: any) {
      showErrorToast('Failed', e.message || 'Unable to add to cart.');
    } finally {
      setAddingToCart(null);
    }
  };


  // ── States ──────────────────────────────────────────────────────────────
  if (isLoading && !refreshing) {
    return (
      <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
        <ScreenHeader count={0} itemCount={itemCount} />
        <WishlistSkeleton />
      </View>
    );
  }

  if (!isAuthenticated) {
    return (
      <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
        <ScreenHeader count={0} itemCount={itemCount} />
        <CenteredMessage
          icon={<Heart size={40} color="#d1d5db" />}
          title="Login Required"
          body="Please log in to view and manage your wishlist."
          action={
            <ActionBtn label="Login to Continue" onPress={() => router.push('/(auth)/Login' as any)} />
          }
        />
      </View>
    );
  }

  if (wishlistItems.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
        <ScreenHeader count={0} itemCount={itemCount} />
        <CenteredMessage
          icon={<Heart size={40} color="#d1d5db" />}
          title="Your Wishlist is Empty"
          body="Save items you love to your wishlist and never lose track of them."
          action={
            <ActionBtn
              label="Start Shopping"
              icon={<ArrowRight size={16} color="#fff" />}
              onPress={() => router.push('/(tabs)')}
            />
          }
        />
      </View>
    );
  }

  // ── Main ────────────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      <ScreenHeader count={wishlistItems.length} itemCount={itemCount} />

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 10 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#111827" />
        }
      >
        {/* Syncing indicator */}
        {isSyncing ? (
          <View style={ws.syncingRow}>
            <ActivityIndicator size="small" color="#2563eb" />
            <Text style={ws.syncingText}>Checking availability...</Text>
          </View>
        ) : null}

        {wishlistItems.map((item) => {
          if (!item.product) return null;
          const isAdding = addingToCart === item.productId;

          // Use live product data if available, fallback to server snapshot
          const live = stockMap[item.productId];
          const inStock = live ? live.status !== 'out_of_stock' : item.product.inStock;
          const isLowStock = live?.status === 'low_stock';
          const isOOS = live ? live.status === 'out_of_stock' : !item.product.inStock;
          const serverPrice = getRegionalPrice(item.product as any);
          const displayPrice = live?.livePrice ?? serverPrice;
          const displayName = live?.liveName ?? item.product.name;
          const displayImage = live?.liveImage ?? item.product.image;
          const displayOriginalPrice = live?.liveOriginalPrice ?? getRegionalOriginalPrice(item.product as any);
          const displayDiscount = live?.liveDiscount ?? item.product.discount;
          const priceChanged = live?.priceChanged ?? false;
          const hasVariants = item.product.hasVariants ?? false;

          return (
            <View
              key={item.id}
              style={{
                backgroundColor: '#ffffff',
                borderRadius: 14,
                borderWidth: 1,
                borderColor: isOOS ? '#fecaca' : isLowStock ? '#fed7aa' : '#e5e7eb',
                shadowColor: '#0f172a',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.04,
                shadowRadius: 4,
                elevation: 1,
              }}
            >
              {/* Stock status banner */}
              {isOOS ? (
                <View style={[ws.bannerRow, ws.bannerOos]} accessibilityRole="alert">
                  <AlertCircle size={11} color="#dc2626" />
                  <Text style={ws.bannerTextOos}>Out of Stock</Text>
                </View>
              ) : isLowStock && live ? (
                <View style={[ws.bannerRow, ws.bannerLow]} accessibilityRole="alert">
                  <AlertCircle size={11} color="#ea580c" />
                  <Text style={ws.bannerTextLow}>Low stock — only {live.stock} left</Text>
                </View>
              ) : null}

              <View style={{ flexDirection: 'row', padding: 12, gap: 12 }}>
                {/* Image — 64px compact */}
                <Pressable
                  onPress={() => router.push(`/(any)/products/${item.productId}` as any)}
                  accessibilityRole="button"
                  accessibilityLabel={`View ${displayName}`}
                >
                  <View
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: 10,
                      overflow: 'hidden',
                      backgroundColor: '#f3f4f6',
                      opacity: isOOS ? 0.4 : 1,
                    }}
                  >
                    {displayImage ? (
                      <Image
                        source={{ uri: displayImage }}
                        style={{ width: '100%', height: '100%' }}
                        contentFit="cover"
                        transition={200}
                      />
                    ) : (
                      <View style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
                        <Package size={20} color="#d1d5db" />
                      </View>
                    )}
                    {displayDiscount != null && displayDiscount > 0 ? (
                      <View
                        style={{ position: 'absolute', top: 4, left: 4, backgroundColor: '#111827', borderRadius: 3, paddingHorizontal: 4, paddingVertical: 1 }}
                      >
                        <Text style={{ color: '#fff', fontSize: 8, fontWeight: '800' }}>
                          {displayDiscount}%
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </Pressable>

                {/* Info + actions */}
                <View style={{ flex: 1 }}>
                  {/* Name + trash */}
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 2 }}>
                    <Text
                      style={{ flex: 1, fontSize: 13, fontWeight: '700', color: '#111827', lineHeight: 17, marginRight: 8 }}
                      numberOfLines={2}
                    >
                      {displayName}
                    </Text>
                    <Pressable onPress={() => removeItem(item.productId, displayName)} accessibilityRole="button" accessibilityLabel="Remove" hitSlop={8}>
                      <View style={{ padding: 4 }}>
                        <Trash2 size={14} color="#9ca3af" />
                      </View>
                    </Pressable>
                  </View>

                  {/* Price row + stock label + Add to Cart */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                    <View>
                      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
                        <Text style={{ fontSize: 14, fontWeight: '800', color: '#111827' }}>
                          {fmt(displayPrice)}
                        </Text>
                        {displayOriginalPrice ? (
                          <Text style={{ fontSize: 10, color: '#dc2626', textDecorationLine: 'line-through' }}>
                            {fmt(displayOriginalPrice)}
                          </Text>
                        ) : null}
                      </View>
                      {priceChanged && live ? (
                        <Text style={live.livePrice! > item.product.basePrice ? ws.priceUp : ws.priceDown}>
                          Price {live.livePrice! > item.product.basePrice ? 'increased' : 'decreased'}
                        </Text>
                      ) : null}
                    </View>

                    {/* Add to Cart / Choose Options / OOS */}
                    <Pressable
                      onPress={() => {
                        if (hasVariants) {
                          router.push(`/(any)/products/${item.productId}` as any);
                        } else {
                          moveToCart(item.productId, displayName);
                        }
                      }}
                      disabled={isOOS || isAdding}
                      accessibilityRole="button"
                      accessibilityLabel={isOOS ? 'Out of stock' : hasVariants ? 'Choose variant options' : 'Add to cart'}
                    >
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          backgroundColor: isOOS ? '#f3f4f6' : '#111827',
                          paddingHorizontal: 10,
                          height: 30,
                          borderRadius: 8,
                          gap: 4,
                        }}
                      >
                        {isAdding ? (
                          <ActivityIndicator size={12} color="#fff" />
                        ) : (
                          <>
                            <ShoppingCart size={11} color={isOOS ? '#9ca3af' : '#fff'} strokeWidth={2.5} />
                            <Text style={{ fontSize: 11, fontWeight: '700', color: isOOS ? '#9ca3af' : '#fff' }}>
                              {isOOS ? 'OOS' : hasVariants ? 'Options' : 'Add'}
                            </Text>
                          </>
                        )}
                      </View>
                    </Pressable>
                  </View>
                </View>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

// ─── Header ───────────────────────────────────────────────────────────────────
function ScreenHeader({ count, itemCount }: { count: number; itemCount: number }) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        backgroundColor: '#ffffff',
        paddingHorizontal: 16,
        paddingTop: insets.top + 12,
        paddingBottom: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
        flexDirection: 'row',
        alignItems: 'center',
      }}
    >
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 24, fontWeight: '800', color: '#111827' }}>
          My Wishlist
        </Text>
        <Text style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>
          {count > 0 ? `${count} saved ${count === 1 ? 'item' : 'items'}` : 'Your saved items'}
        </Text>
      </View>
      <Pressable
        onPress={() => router.push('/(tabs)/cart' as any)}
        accessibilityRole="button"
        accessibilityLabel={`Cart, ${itemCount} items`}
        hitSlop={6}
      >
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            backgroundColor: '#f3f4f6',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ShoppingCart size={18} color="#111827" />
          {itemCount > 0 ? (
            <View
              style={{
                position: 'absolute',
                top: -2,
                right: -4,
                backgroundColor: '#dc2626',
                minWidth: 16,
                height: 16,
                borderRadius: 8,
                paddingHorizontal: 4,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>
                {itemCount > 99 ? '99+' : itemCount}
              </Text>
            </View>
          ) : null}
        </View>
      </Pressable>
    </View>
  );
}

// ─── Centered message (empty / auth) ──────────────────────────────────────────
function CenteredMessage({
  icon,
  title,
  body,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
      <View
        style={{
          width: 88,
          height: 88,
          borderRadius: 44,
          backgroundColor: '#f3f4f6',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 20,
        }}
      >
        {icon}
      </View>
      <Text style={{ fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 6, textAlign: 'center' }}>
        {title}
      </Text>
      <Text style={{ fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 20, marginBottom: action ? 24 : 0 }}>
        {body}
      </Text>
      {action ?? null}
    </View>
  );
}

function ActionBtn({ label, icon, onPress }: { label: string; icon?: React.ReactNode; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button">
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: '#111827',
          paddingHorizontal: 28,
          height: 50,
          borderRadius: 14,
          gap: 8,
        }}
      >
        <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>{label}</Text>
        {icon ?? null}
      </View>
    </Pressable>
  );
}

// ─── Hoisted styles for sync UI ──────────────────────────────────────────────
const ws = StyleSheet.create({
  // Syncing indicator
  syncingRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 10, backgroundColor: '#eff6ff', borderRadius: 12, marginBottom: 4,
  },
  syncingText: { fontSize: 12, fontWeight: '600', color: '#2563eb' },

  // Stock banners (per-item)
  bannerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 6,
    borderTopLeftRadius: 14, borderTopRightRadius: 14,
  },
  bannerOos: { backgroundColor: '#fef2f2' },
  bannerLow: { backgroundColor: '#fff7ed' },
  bannerTextOos: { fontSize: 10, fontWeight: '700', color: '#dc2626' },
  bannerTextLow: { fontSize: 10, fontWeight: '700', color: '#9a3412' },

  // Price change labels
  priceUp: { fontSize: 9, fontWeight: '600', color: '#dc2626', marginTop: 1 },
  priceDown: { fontSize: 9, fontWeight: '600', color: '#16a34a', marginTop: 1 },
});
