import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  Share,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import {
  Heart,
  ShoppingCart,
  Trash2,
  Package,
  AlertCircle,
  Share2,
  ArrowLeft,
} from 'lucide-react-native';
import ScreenHeader from '@/components/WebSite/Shared/ScreenHeader';
import { router } from 'expo-router';
import { showSuccessToast, showErrorToast } from '@/lib/toast-utils';
import { wishlistService, WishlistItem } from '@/services/wishlistService';
import { publicProductService } from '@/services/publicProductService';
import { cartService } from '@/services/cartService';
import { userAuthService } from '@/services/userAuthService';
import { useWishlist } from '@/context/WishlistContext';
import { useCart } from '@/context/CartContext';
import { WishlistSkeleton } from '@/components/ui/Skeleton';
import { getRegionalPrice, getRegionalOriginalPrice, formatPrice as fmtCurrency } from '@/lib/currency';
import { FaceRatingRow } from '@/components/WebSite/Shared/FaceRating';
import { sharedWishlistUrl, productUrl } from '@/lib/shareLinks';
import { Palette, Radius, Fonts } from '@/constants/theme';
import EmptyState from '@/components/WebSite/Shared/EmptyState';

/* `bg-[#f9f5f2]` — the warm ground the web gives this page, the same one
   the cart and product detail use. Mobile had #f8fafc, Tailwind's slate-50:
   a cool cast behind cards that are all warm. */
const WISHLIST_GROUND = '#f9f5f2';

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
  const [isSharing, setIsSharing] = useState(false);

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

  // ── Share ───────────────────────────────────────────────────────────────
  // Mirrors the web's shareWishlist(): mint a token, build a public URL, and
  // hand it to the OS share sheet. RN's Share is the native equivalent of
  // navigator.share; there is no clipboard fallback branch because the sheet is
  // always available on iOS and Android.
  const shareWishlist = useCallback(async () => {
    if (isSharing || wishlistItems.length === 0) return;
    try {
      setIsSharing(true);
      const token = await wishlistService.getShareToken();
      const url = sharedWishlistUrl(token);

      const names = wishlistItems
        .filter((item) => item.product)
        .map((item) => item.product!.name)
        .slice(0, 5);
      const extra = wishlistItems.length > 5 ? ` and ${wishlistItems.length - 5} more` : '';
      const message = names.length
        ? `Check out my wishlist: ${names.join(', ')}${extra}\n${url}`
        : `Check out my wishlist!\n${url}`;

      await Share.share({ title: 'My Wishlist', message, url });
    } catch (error: any) {
      // A user dismissing the sheet is not a failure — only surface real errors.
      if (error?.message) {
        showErrorToast('Share Failed', 'Unable to share your wishlist. Please try again.');
      }
    } finally {
      setIsSharing(false);
    }
  }, [isSharing, wishlistItems]);

  // Share a single product out of the list. Mirrors the web's `shareProduct`;
  // the URL targets the web storefront so it opens for a recipient without the
  // app installed.
  const shareProduct = useCallback(async (productId: string, name: string) => {
    try {
      await Share.share({
        title: name,
        message: `Check out this product: ${name}\n${productUrl(productId)}`,
        url: productUrl(productId),
      });
    } catch (error: any) {
      if (error?.message) {
        showErrorToast('Share Failed', 'Unable to share this product.');
      }
    }
  }, []);

  // ── States ──────────────────────────────────────────────────────────────
  if (isLoading && !refreshing) {
    return (
      <View style={{ flex: 1, backgroundColor: WISHLIST_GROUND }}>
        <WishlistHeader count={0} itemCount={itemCount} />
        <WishlistSkeleton />
      </View>
    );
  }

  if (!isAuthenticated) {
    return (
      <View style={{ flex: 1, backgroundColor: WISHLIST_GROUND }}>
        <WishlistHeader count={0} itemCount={itemCount} />
        <EmptyState
          icon={Heart}
          title="Login Required"
          subtitle="Please log in to view and manage your wishlist."
          ctaLabel="Login to Continue"
          onPress={() => router.push('/(auth)/Login' as any)}
        />
      </View>
    );
  }

  if (wishlistItems.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: WISHLIST_GROUND }}>
        <WishlistHeader count={0} itemCount={itemCount} />
        {/*
          The wishlist keeps its own empty state rather than the shared panel.
          Everywhere else in the app the shared one is right — but this screen
          is the one place the empty state IS the page, and the web gives it a
          designed card: a blush wash, two heart watermarks bleeding off the
          corners, and a heart pulsing inside concentric rings.
        */}
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          <LinearGradient
            colors={['#fff8f4', '#fdf6f0', '#ffffff']}
            start={{ x: 0.2, y: 0 }}
            end={{ x: 0.8, y: 1 }}
            style={ws.emptyCard}
          >
            {/* `-right-8 -top-10 h-36 w-36 fill-current text-[#e01a1b]/[0.05]` */}
            <Heart
              size={144}
              color="transparent"
              fill="rgba(224,26,27,0.05)"
              style={ws.watermarkTop}
            />
            <Heart
              size={112}
              color="transparent"
              fill="rgba(224,26,27,0.04)"
              style={ws.watermarkBottom}
            />

            <View style={ws.emptyDiscWrap}>
              <View style={ws.emptyRing} />
              <View style={ws.emptyDisc}>
                <Heart size={32} color="#e01a1b" strokeWidth={1.75} />
              </View>
            </View>

            <Text style={ws.emptyTitle}>Nothing saved yet</Text>
            <Text style={ws.emptyBody}>
              Tap the heart on anything you like and it will wait for you here — price and all.
            </Text>

            <Pressable
              onPress={() => router.push('/(tabs)')}
              accessibilityRole="button"
              accessibilityLabel="Start Shopping"
              android_ripple={{ color: 'rgba(255,255,255,0.18)' }}
              style={ws.emptyCta}
            >
              <ArrowLeft size={16} color="#ffffff" strokeWidth={2.4} />
              <Text style={ws.emptyCtaText}>Start Shopping</Text>
            </Pressable>
          </LinearGradient>

          <WishlistTips />
        </ScrollView>
      </View>
    );
  }

  // ── Main ────────────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: WISHLIST_GROUND }}>
      <WishlistHeader
        count={wishlistItems.length}
        itemCount={itemCount}
        onShare={shareWishlist}
        isSharing={isSharing}
      />

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

        {/* Top actions — the web pairs "Share Wishlist" with "Continue
            Shopping". The share icon in the header stays as the quick affordance;
            this row is the labelled version plus the route back to the catalogue,
            which mobile had no path to from here at all. */}
        <View style={ws.topActions}>
          <Pressable
            onPress={shareWishlist}
            disabled={isSharing}
            accessibilityRole="button"
            accessibilityLabel="Share my wishlist"
            style={[ws.topActionGhost, isSharing && ws.actionDisabled]}
          >
            {isSharing ? (
              <ActivityIndicator size="small" color={Palette.text} />
            ) : (
              <Share2 size={14} color={Palette.text} strokeWidth={2.25} />
            )}
            <Text style={ws.topActionGhostText} numberOfLines={1}>
              {isSharing ? 'Generating Link...' : 'Share Wishlist'}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => router.push('/(any)/products' as any)}
            accessibilityRole="button"
            accessibilityLabel="Continue shopping"
            style={ws.topActionPrimary}
          >
            <ShoppingCart size={14} color={Palette.onPrimary} strokeWidth={2.25} />
            <Text style={ws.topActionPrimaryText} numberOfLines={1}>
              Continue Shopping
            </Text>
          </Pressable>
        </View>

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
                borderColor: isOOS ? '#E01A1B' : isLowStock ? '#fed7aa' : '#e5e7eb',
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
                  <AlertCircle size={11} color="#E01A1B" />
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
                        style={{ position: 'absolute', top: 4, left: 4, backgroundColor: Palette.primary, borderRadius: 3, paddingHorizontal: 4, paddingVertical: 1 }}
                      >
                        <Text style={{ fontFamily: Fonts.sansBold, color: '#fff', fontSize: 8, fontWeight: '800' }}>
                          {displayDiscount}%
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </Pressable>

                {/* Info + actions */}
                <View style={{ flex: 1 }}>
                  {/* `truncate text-[10px] font-semibold uppercase
                      tracking-[0.12em] text-[#a1948a]` — the web sets this as
                      plain text, not a pill. */}
                  {item.product.category ? (
                    <Text style={ws.categoryText} numberOfLines={1}>
                      {item.product.category}
                    </Text>
                  ) : null}

                  <Text
                    style={{ fontFamily: Fonts.sansBold, fontSize: 13, fontWeight: '700', color: '#111827', lineHeight: 17 }}
                    numberOfLines={2}
                  >
                    {displayName}
                  </Text>

                  {/* FaceRating — matches the web card: face for loved items, else review count */}
                  <FaceRatingRow
                    rating={Number(item.product.rating) || 0}
                    reviewCount={Number(item.product.reviews) || 0}
                    size={13}
                  />

                  {/* Price row + stock label + Add to Cart */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                    <View>
                      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
                        <Text style={{ fontFamily: Fonts.sansBold, fontSize: 14, fontWeight: '800', color: '#111827' }}>
                          {fmt(displayPrice)}
                        </Text>
                        {displayOriginalPrice ? (
                          <Text style={{ fontFamily: Fonts.sans, fontSize: 10, color: '#E01A1B', textDecorationLine: 'line-through' }}>
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

                  </View>

                  {/* Added-on date, as on the web card. */}
                  <Text style={ws.addedOn}>
                    Added on {new Date(item.createdAt).toLocaleDateString()}
                  </Text>

                  {/* Actions — the web pairs a primary Add to Cart with Share and
                      Remove. Previously mobile had a cramped "Add" chip and a bare
                      trash icon, so Share had no home and Remove was unlabelled. */}
                  <View style={ws.actionsRow}>
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
                      accessibilityLabel={
                        isOOS ? 'Out of stock' : hasVariants ? 'Choose variant options' : 'Add to cart'
                      }
                      style={[ws.actionPrimary, isOOS && ws.actionDisabled]}
                    >
                      {isAdding ? (
                        <ActivityIndicator size={12} color="#fff" />
                      ) : (
                        <>
                          <ShoppingCart size={12} color={isOOS ? '#9ca3af' : '#fff'} strokeWidth={2.5} />
                          <Text style={[ws.actionPrimaryText, isOOS && ws.actionDisabledText]}>
                            {isOOS ? 'Out of Stock' : hasVariants ? 'Choose Options' : 'Add to Cart'}
                          </Text>
                        </>
                      )}
                    </Pressable>

                    <Pressable
                      onPress={() => shareProduct(item.productId, displayName)}
                      accessibilityRole="button"
                      accessibilityLabel={`Share ${displayName}`}
                      style={ws.actionNeutral}
                    >
                      <Share2 size={12} color={Palette.text} strokeWidth={2.25} />
                    </Pressable>

                    <Pressable
                      onPress={() => removeItem(item.productId, displayName)}
                      accessibilityRole="button"
                      accessibilityLabel={`Remove ${displayName} from wishlist`}
                      style={ws.actionDanger}
                    >
                      <Trash2 size={12} color={Palette.error} strokeWidth={2.25} />
                    </Pressable>
                  </View>
                </View>
              </View>
            </View>
          );
        })}

        <WishlistTips />
      </ScrollView>
    </View>
  );
}

// ─── Wishlist Tips ────────────────────────────────────────────────────────────
// Same three tips as the web section. Stacked rather than a 3-column grid —
// each one is a sentence, and three columns on a phone would be unreadable.
const TIPS = [
  {
    Icon: Heart,
    title: 'Save for Later',
    body: 'Tap the heart on any product to save it to your wishlist.',
  },
  {
    Icon: Share2,
    title: 'Share with Friends',
    body: 'Share your wishlist with family and friends for gift ideas.',
  },
  {
    Icon: ShoppingCart,
    title: 'Quick Add to Cart',
    body: 'Easily move items from your wishlist to your shopping cart.',
  },
];

function WishlistTips() {
  return (
    <View style={{ gap: 12, marginTop: 16 }}>
      {TIPS.map(({ Icon, title, body }, i) => (
        <View key={title} style={ws.tipCard}>
          {/* The numeral the web sets behind each card, barely there. */}
          <Text style={ws.tipNumber}>{String(i + 1).padStart(2, '0')}</Text>

          <View style={ws.tipMedallion}>
            <Icon size={20} color="#e01a1b" strokeWidth={2} />
          </View>

          <Text style={ws.tipTitle}>{title}</Text>
          <Text style={ws.tipBody}>{body}</Text>
        </View>
      ))}
    </View>
  );
}

// ─── Header ───────────────────────────────────────────────────────────────────
function WishlistHeader({
  count,
  itemCount,
  onShare,
  isSharing,
}: {
  count: number;
  itemCount: number;
  /** Omitted on the empty/logged-out states — there is nothing to share. */
  onShare?: () => void;
  isSharing?: boolean;
}) {
  return (
    <ScreenHeader
      icon={Heart}
      eyebrow="Your saved things"
      title="My Wishlist"
      subtitle={count > 0 ? `${count} saved ${count === 1 ? 'item' : 'items'}` : 'Your saved items'}
      right={
        <>
          {onShare ? (
            <Pressable
              onPress={onShare}
              disabled={isSharing}
              accessibilityRole="button"
              accessibilityLabel="Share my wishlist"
              accessibilityState={{ busy: !!isSharing, disabled: !!isSharing }}
              hitSlop={6}
            >
              {/* Was Palette.onBrand — a white disc on a white header, while the
                  cart disc beside it was #f3f4f6. */}
              <View style={[ws.headerBtn, { opacity: isSharing ? 0.6 : 1 }]}>
                {isSharing ? (
                  <ActivityIndicator size="small" color={Palette.primary} />
                ) : (
                  <Share2 size={18} color={Palette.primary} />
                )}
              </View>
            </Pressable>
          ) : null}
          <Pressable
            onPress={() => router.push('/(tabs)/cart' as any)}
            accessibilityRole="button"
            accessibilityLabel={`Cart, ${itemCount} items`}
            hitSlop={6}
          >
            <View style={ws.headerBtn}>
              <ShoppingCart size={18} color="#111827" />
              {itemCount > 0 ? (
                <View style={ws.headerBadge}>
                  <Text style={ws.headerBadgeText}>{itemCount > 99 ? '99+' : itemCount}</Text>
                </View>
              ) : null}
            </View>
          </Pressable>
        </>
      }
    />
  );
}

const ws = StyleSheet.create({
  emptyCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#f2e4da',
    paddingHorizontal: 28,
    paddingVertical: 44,
    alignItems: 'center',
    overflow: 'hidden',
  },
  watermarkTop: { position: 'absolute', right: -32, top: -40 },
  watermarkBottom: { position: 'absolute', left: -32, bottom: -32 },

  emptyDiscWrap: {
    width: 96,
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyRing: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 48,
    backgroundColor: 'rgba(224,26,27,0.1)',
  },
  emptyDisc: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#e01a1b',
    shadowOpacity: 0.16,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    // Android paints elevation only.
    elevation: 6,
  },
  emptyTitle: {
    fontFamily: Fonts.heading,
    fontSize: 24,
    // Poppins_600SemiBold is the loaded file.
    fontWeight: '600',
    letterSpacing: -0.6,
    color: '#1a1a1a',
    textAlign: 'center',
  },
  emptyBody: {
    fontFamily: Fonts.sans,
    fontSize: 13.5,
    lineHeight: 20,
    color: '#6b625b',
    textAlign: 'center',
    marginTop: 12,
    maxWidth: 300,
  },
  emptyCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#e01a1b',
    borderRadius: 999,
    paddingHorizontal: 24,
    paddingVertical: 13,
    marginTop: 28,
    overflow: 'hidden',
    shadowColor: '#e01a1b',
    shadowOpacity: 0.3,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  emptyCtaText: {
    fontFamily: Fonts.sansSemibold,
    fontSize: 14.5,
    fontWeight: '600',
    color: '#ffffff',
  },

  tipCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#f1ece6',
    padding: 20,
    overflow: 'hidden',
  },
  tipNumber: {
    position: 'absolute',
    right: 16,
    top: 6,
    fontFamily: Fonts.heading,
    fontSize: 44,
    fontWeight: '600',
    color: 'rgba(224,26,27,0.07)',
  },
  /* `h-12 w-12 rounded-2xl bg-[#fdeeee] ring-1 ring-[#f7dcdc]` */
  tipMedallion: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#fdeeee',
    borderWidth: 1,
    borderColor: '#f7dcdc',
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBadge: {
    position: 'absolute',
    top: -2,
    right: -4,
    backgroundColor: '#E01A1B',
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBadgeText: {
    fontFamily: Fonts.sansBold,
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },

  // ── Item metadata (parity with the web card) ──
  categoryText: {
    fontFamily: Fonts.sansSemibold,
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    color: '#a1948a',
    marginBottom: 3,
  },
  addedOn: { fontFamily: Fonts.sans, fontSize: 9.5, color: Palette.textSubtle, marginTop: 6 },

  // ── Per-item actions ──
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Palette.outlineSubtle,
  },
  actionPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    height: 32,
    borderRadius: Radius.full,
    backgroundColor: Palette.primary,
  },
  actionPrimaryText: { fontFamily: Fonts.sansBold, fontSize: 11, fontWeight: '700', color: Palette.onPrimary },
  actionDisabled: { backgroundColor: Palette.outlineSubtle },
  actionDisabledText: { color: Palette.textSubtle },
  actionNeutral: {
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    backgroundColor: Palette.outlineSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionDanger: {
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    backgroundColor: Palette.errorContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Top actions ──
  topActions: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  topActionGhost: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 42,
    borderRadius: Radius.md,
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.outline,
  },
  topActionGhostText: { fontFamily: Fonts.sansBold, fontSize: 12.5, fontWeight: '700', color: Palette.text },
  topActionPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 42,
    borderRadius: Radius.md,
    backgroundColor: Palette.primary,
  },
  topActionPrimaryText: { fontFamily: Fonts.sansBold, fontSize: 12.5, fontWeight: '700', color: Palette.onPrimary },

  // ── Tips ──
  tipTitle: {
    fontFamily: Fonts.sansBold,
    fontSize: 15,
    // Outfit is static: the weight must name the loaded file (Outfit_700Bold).
    fontWeight: '700',
    color: '#1a1a1a',
    marginTop: 16,
  },
  tipBody: {
    fontFamily: Fonts.sans,
    fontSize: 13,
    lineHeight: 19,
    color: '#6b625b',
    marginTop: 6,
  },

  // Syncing indicator
  syncingRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 10, backgroundColor: '#eff6ff', borderRadius: 12, marginBottom: 4,
  },
  syncingText: { fontFamily: Fonts.sansSemibold, fontSize: 12, fontWeight: '600', color: '#2563eb' },

  // Stock banners (per-item)
  bannerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 6,
    borderTopLeftRadius: 14, borderTopRightRadius: 14,
  },
  bannerOos: { backgroundColor: '#E01A1B' },
  bannerLow: { backgroundColor: '#fff7ed' },
  bannerTextOos: { fontFamily: Fonts.sansBold, fontSize: 10, fontWeight: '700', color: '#E01A1B' },
  bannerTextLow: { fontFamily: Fonts.sansBold, fontSize: 10, fontWeight: '700', color: '#9a3412' },

  // Price change labels
  priceUp: { fontFamily: Fonts.sansSemibold, fontSize: 9, fontWeight: '600', color: '#E01A1B', marginTop: 1 },
  priceDown: { fontFamily: Fonts.sansSemibold, fontSize: 9, fontWeight: '600', color: '#16a34a', marginTop: 1 },
});
