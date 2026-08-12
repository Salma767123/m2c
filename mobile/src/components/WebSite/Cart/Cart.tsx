import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { calculateLogistics, type LogisticsConfig } from '@/lib/logistics';
import { getRegionalPrice, getRegionalOriginalPrice, getCurrency, getRegion, convertINRtoUSD, formatPrice as fmtCurrency } from '@/lib/currency';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  ArrowRight,
  Package,
  Tag,
  AlertCircle,
  AlertTriangle,
  X,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Info,
  ChevronDown,
  ChevronRight,
  Truck,
  Star,
  Shield,
} from 'lucide-react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { cartService } from '@/services/cartService';
import { courierService } from '@/services/courierService';
import { couponService } from '@/services/couponService';
import { publicProductService } from '@/services/publicProductService';
import { userAuthService } from '@/services/userAuthService';
import { showSuccessToast, showErrorToast } from '@/lib/toast-utils';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCart } from '@/context/CartContext';
import type { StockSyncResult } from '@/lib/stockSync';
import { CartSkeleton } from '@/components/ui/Skeleton';
import BagSelector from './BagSelector';
import type { BagType } from '@/services/bagTypeService';
import { Palette, Radius } from '@/constants/theme';
import { extractCouponCode } from '@/lib/coupons';

/*
  NOTE ON ASSUMPTIONS (courier naming)
  ─────────────────────────────────────
  Web reads a courier's display name via `courierName(item.courier)` from
  `frontend/src/lib/couriers.ts`. Mirrored here as an optional import that
  no-ops (falls back to showing the raw courier id) if the module doesn't
  exist yet in mobile/src/lib — create it mirroring the web file if missing.
*/
let courierNameFn: ((id: string) => string) | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  courierNameFn = require('@/lib/couriers').courierName;
} catch {
  courierNameFn = null;
}
const courierName = (id?: string | null) => (id ? (courierNameFn?.(id) ?? id) : '');

// Brand color — matches DESIGN.md primary (#E01A1B), used the same way web uses
// `text-[#E01A1B]` / `bg-[#E01A1B]` throughout the cart page.
const BRAND = '#E01A1B';
const BRAND_DARK = '#E01A1B';

// ─── Types ────────────────────────────────────────────────────────────────────
interface CartItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  originalPrice?: number;
  /** Automatic offer applied to this line + the pre-offer price to strike through
      (web parity — was entirely absent from mobile before). */
  activeOffer?: { badge: string; title?: string; description?: string; endsAt?: string } | null;
  offerStrikePrice?: number;
  images: string[];
  category: string;
  rating?: number;
  reviews?: number;
  material?: string;
  inStock: boolean;
  availableStock?: number;
  quantity: number;
  discount?: number;
  gstPercentage?: number;
  /** Chosen shipping mode + courier for this line (web parity). */
  transportType?: 'AIR' | 'SHIP' | null;
  courier?: string | null;
  variantDetails?: { size: string; color: string; colorHex?: string; sku?: string };
  product?: any;
}

const fmt = (n: number) => fmtCurrency(n);

// ─── Component ────────────────────────────────────────────────────────────────
export default function Cart() {
  const { refreshCart, itemCount, syncStock, syncResult, allSyncResults, isSyncing, clearSyncResult } = useCart();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Bag add-on
  const [selectedBag, setSelectedBag] = useState<BagType | null>(null);

  // Persist bag selection so checkout can read it
  const handleBagSelect = useCallback((bag: BagType | null) => {
    setSelectedBag(bag);
    if (bag) {
      AsyncStorage.setItem('selectedBagType', JSON.stringify({
        id: bag.id,
        name: bag.name,
        price: bag.price,
        priceINR: (bag as any).priceINR,
        priceUSD: (bag as any).priceUSD,
      }));
    } else {
      AsyncStorage.removeItem('selectedBagType');
    }
  }, []);

  // Promo
  const [promoCode, setPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState('');
  const [discountAmount, setDiscountAmount] = useState(0);
  const [couponMeta, setCouponMeta] = useState<{ discountType: string; discountValue: number; maxDiscountAmount?: number } | null>(null);
  const [freeShippingApplied, setFreeShippingApplied] = useState(false);
  const [freeShippingMessage, setFreeShippingMessage] = useState('');
  const [applyingCoupon, setApplyingCoupon] = useState(false);

  const [availablePromos, setAvailablePromos] = useState<
    { message: string; code?: string }[]
  >([]);
  const [promosLoading, setPromosLoading] = useState(true);

  useEffect(() => {
    let active = true;
    couponService
      .getPromotionalCoupons(6)
      .then((list) => {
        if (!active) return;
        setAvailablePromos(
          list.map((c) => ({ message: c.message, code: extractCouponCode(c.message) })),
        );
      })
      .catch(() => {
        if (active) setAvailablePromos([]);
      })
      .finally(() => {
        if (active) setPromosLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    fetchCart();
    loadSavedCoupon();
    syncStock();
  }, []);

  // Prime the courier registry so courierName(item.courier) resolves DB ids to
  // display names instead of leaking the raw Mongo ObjectId into the shipping row.
  useEffect(() => {
    courierService.getActiveCouriers(getRegion()).catch(() => {});
  }, []);

  // When sync completes, merge live product data into local cartItems
  useEffect(() => {
    if (allSyncResults.length === 0) return;

    setCartItems((prev) => {
      return prev.map((item) => {
        let sr = allSyncResults.find((r) => r.itemId === item.id);
        if (!sr) {
          const byProduct = allSyncResults.filter((r) => r.productId === item.productId);
          if (byProduct.length === 1) sr = byProduct[0];
        }
        if (!sr?.live) return item;
        return {
          ...item,
          name: sr.live.name,
          price: sr.live.price,
          originalPrice: sr.live.originalPrice,
          discount: sr.live.discount,
          images: sr.live.images.length > 0 ? sr.live.images : item.images,
          category: sr.live.category || item.category,
          inStock: sr.live.inStock,
          availableStock: sr.live.availableStock,
          quantity: sr.qtyAdjusted ? sr.clampedQty : item.quantity,
          variantDetails: sr.live.variant
            ? { size: sr.live.variant.size, color: sr.live.variant.color, colorHex: sr.live.variant.colorHex, sku: sr.live.variant.sku }
            : item.variantDetails,
        };
      });
    });
  }, [allSyncResults]);

  const loadSavedCoupon = async () => {
    try {
      const saved = await AsyncStorage.getItem('appliedCoupon');
      if (saved) {
        const parsed = JSON.parse(saved);
        setAppliedPromo(parsed.code);
        setDiscountAmount(parsed.discountAmount);
        setFreeShippingApplied(parsed.freeShipping || false);
        setFreeShippingMessage(parsed.freeShippingMessage || '');
        if (parsed.discountType && parsed.discountValue != null) {
          setCouponMeta({
            discountType: parsed.discountType,
            discountValue: parsed.discountValue,
            maxDiscountAmount: parsed.maxDiscountAmount,
          });
        }
      }
    } catch { /* ignore */ }
  };

  const checkFreeShippingOffers = useCallback(async (cartSubtotal: number) => {
    if (cartSubtotal <= 0) return;
    try {
      const userData = await userAuthService.getUserData();
      if (!userData?.id) return;

      const response = await couponService.applyFreeShippingOffer(userData.id, cartSubtotal);
      if (response.success && (response.data as any)?.freeShipping) {
        setFreeShippingApplied(true);
        setFreeShippingMessage(response.message || 'Free shipping available!');
      }
    } catch { /* no offer available — expected */ }
  }, []);

  const fetchCart = async () => {
    try {
      setLoading(true);
      const auth = await userAuthService.isAuthenticated();
      setIsAuthenticated(auth);

      if (auth) {
        const res = await cartService.getCart();
        if (res.success && res.data) {
          setCartItems(
            res.data.items.map((item: any) => {
              const hasVariant = !!item.variant;

              const imgArray: string[] = [];
              const imgSource = (hasVariant && item.variant.images?.length > 0)
                ? item.variant.images
                : item.product?.images;
              if (Array.isArray(imgSource)) {
                for (const img of imgSource) {
                  const url = typeof img === 'string' ? img : img?.url;
                  if (url) imgArray.push(url);
                }
              }

              const livePrice = hasVariant
                ? getRegionalPrice(item.variant as any)
                : getRegionalPrice(item.product as any);

              const liveStock = hasVariant
                ? item.variant.stock
                : (item.product?.availableStock ?? item.product?.totalStock);

              const liveOriginalPrice = hasVariant
                ? getRegionalOriginalPrice(item.variant as any) ?? getRegionalOriginalPrice(item.product as any)
                : getRegionalOriginalPrice(item.product as any);
              const liveDiscount = hasVariant
                ? (item.variant.discount ?? item.product?.discount)
                : item.product?.discount;

              // Offer-aware effective price — web parity (was entirely missing).
              const activeOffer = item.product?.activeOffer ?? null;
              const effectivePrice = activeOffer
                ? applyOfferPrice(livePrice, activeOffer, item.quantity)
                : livePrice;
              const offerStrikePrice = activeOffer && effectivePrice < livePrice ? livePrice : undefined;

              let variantDetails: CartItem['variantDetails'];
              if (hasVariant) {
                variantDetails = {
                  size: item.variant.size,
                  color: item.variant.color,
                  colorHex: item.variant.colorHex,
                  sku: item.variant.sku,
                };
              } else if (item.product?.singleUnitSize || item.product?.singleUnitColor) {
                variantDetails = {
                  size: item.product.singleUnitSize || '',
                  color: item.product.singleUnitColor || '',
                  colorHex: item.product.singleUnitColorHex,
                };
              }

              return {
                id: item.id,
                productId: item.productId,
                name: item.product?.name || 'Product',
                price: effectivePrice,
                originalPrice: liveOriginalPrice ?? undefined,
                activeOffer,
                offerStrikePrice,
                images: imgArray,
                category: item.product?.category || '',
                rating: item.product?.rating,
                reviews: item.product?.reviews,
                material: item.product?.material,
                inStock: liveStock > 0 && (item.product?.inStock ?? true),
                availableStock: liveStock,
                quantity: item.quantity,
                discount: liveDiscount,
                gstPercentage: item.product?.gstPercentage,
                transportType: item.transportType ?? null,
                courier: item.courier ?? null,
                variantDetails,
                product: item.product || null,
              };
            }),
          );
        }
      } else {
        const local = await cartService.getLocalCart();
        const items: CartItem[] = [];
        for (const ci of local) {
          try {
            const res = await publicProductService.getProduct(ci.productId);
            if (res.success && res.data) {
              const p = res.data;
              const url = p.images?.[0]?.url;
              const activeOffer = (p as any).activeOffer ?? null;
              const basePrice = getRegionalPrice(p as any);
              const effectivePrice = activeOffer ? applyOfferPrice(basePrice, activeOffer, ci.quantity) : basePrice;
              items.push({
                id: ci.id,
                productId: ci.productId,
                name: p.name,
                price: effectivePrice,
                originalPrice: getRegionalOriginalPrice(p as any) ?? undefined,
                activeOffer,
                offerStrikePrice: activeOffer && effectivePrice < basePrice ? basePrice : undefined,
                images: url ? [url] : [],
                category: p.category || '',
                rating: (p as any).rating,
                reviews: (p as any).reviews,
                material: (p as any).material,
                inStock: p.inStock,
                availableStock: p.totalStock,
                quantity: ci.quantity,
                discount: p.discount,
                gstPercentage: p.gstPercentage,
                product: p,
              });
            }
          } catch { /* skip broken items */ }
        }
        setCartItems(items);
      }
    } catch {
      showErrorToast('Error', 'Failed to load cart');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchCart();
  }, []);

  // ── Actions (optimistic updates) ────────────────────────────────────────
  const pendingUpdates = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const updateQty = useCallback((id: string, qty: number) => {
    if (qty < 1) return;

    setCartItems((prev) => prev.map((i) => (i.id === id ? { ...i, quantity: qty } : i)));

    if (pendingUpdates.current[id]) clearTimeout(pendingUpdates.current[id]);
    pendingUpdates.current[id] = setTimeout(async () => {
      delete pendingUpdates.current[id];
      try {
        if (isAuthenticated) await cartService.updateCartItem(id, qty);
        else await cartService.updateLocalCartItem(id, qty);
        refreshCart();
      } catch {
        showErrorToast('Error', 'Failed to update quantity');
      }
    }, 400);
  }, [isAuthenticated, refreshCart]);

  const removeItem = useCallback((id: string) => {
    Alert.alert('Remove Item', 'Remove this item from your cart?', [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          const prev = [...cartItems];
          setCartItems((items) => items.filter((i) => i.id !== id));
          try {
            if (isAuthenticated) await cartService.removeFromCart(id);
            else await cartService.removeFromLocalCart(id);
            refreshCart();
            showSuccessToast('Removed', 'Item removed from cart');
          } catch {
            setCartItems(prev);
            showErrorToast('Error', 'Failed to remove item');
          }
        },
      },
    ]);
  }, [isAuthenticated, cartItems, refreshCart]);

  const applyCoupon = async () => {
    if (!promoCode.trim()) return;
    try {
      setApplyingCoupon(true);
      const subtotal = cartItems.reduce((s, i) => s + i.price * i.quantity, 0);
      const res = await couponService.applyCoupon(promoCode, subtotal, getCurrency());
      if (res.success && res.data) {
        setAppliedPromo(res.data.code);
        setDiscountAmount(res.data.discountAmount);
        setCouponMeta({
          discountType: res.data.discountType,
          discountValue: res.data.discountValue,
          maxDiscountAmount: res.data.minPurchaseAmount,
        });
        setPromoCode('');
        await AsyncStorage.setItem('appliedCoupon', JSON.stringify({
          code: res.data.code,
          discountAmount: res.data.discountAmount,
          discountType: res.data.discountType,
          discountValue: res.data.discountValue,
        }));
        showSuccessToast('Applied!', `Saved ${fmt(res.data.discountAmount)}`);
      } else {
        throw new Error(res.message || 'Invalid coupon');
      }
    } catch (e: any) {
      showErrorToast('Invalid', e.message || 'Coupon not valid');
    } finally {
      setApplyingCoupon(false);
    }
  };

  const removeCoupon = async () => {
    setAppliedPromo('');
    setDiscountAmount(0);
    setCouponMeta(null);
    await AsyncStorage.removeItem('appliedCoupon');
  };

  const subtotal = cartItems.reduce((s, i) => s + i.price * i.quantity, 0);
  const tax = cartItems.reduce((s, i) => s + i.price * i.quantity * ((i.gstPercentage ?? 0) / 100), 0);

  useEffect(() => {
    if (isAuthenticated) checkFreeShippingOffers(subtotal);
  }, [isAuthenticated, subtotal, checkFreeShippingOffers]);

  const shippingCost = useMemo(() => {
    if (freeShippingApplied) return 0;

    let inr = 0;
    for (const item of cartItems) {
      const config = (item as any).product?.logisticsConfig;
      if (!config) continue;
      const types = Array.isArray(config.transportTypes) ? config.transportTypes : [];
      const mode = ((item as any).transportType || types[0]) as 'AIR' | 'SHIP' | undefined;
      const result = calculateLogistics(config as LogisticsConfig, item.quantity, mode, getRegion());
      inr += result.totalShippingCost;
    }
    return getCurrency() === 'USD' ? convertINRtoUSD(inr) : inr;
  }, [cartItems, freeShippingApplied]);

  const effectiveDiscount = (() => {
    if (!couponMeta || !appliedPromo) return discountAmount;
    let calc = 0;
    if (couponMeta.discountType === 'PERCENTAGE') {
      calc = (subtotal * couponMeta.discountValue) / 100;
      if (couponMeta.maxDiscountAmount && calc > couponMeta.maxDiscountAmount) {
        calc = couponMeta.maxDiscountAmount;
      }
    } else {
      calc = couponMeta.discountValue;
    }
    return Math.min(calc, subtotal);
  })();

  const bagCost = selectedBag ? getRegionalPrice({ basePrice: selectedBag.price, priceINR: (selectedBag as any).priceINR, priceUSD: (selectedBag as any).priceUSD }) : 0;
  const total = Math.max(0, subtotal + shippingCost + tax - effectiveDiscount + bagCost);
  const hasStockIssue = cartItems.some((i) => !i.inStock || (i.availableStock != null && i.quantity > i.availableStock));

  // ── Shipping method gating — web parity ─────────────────────────────────
  // A line "needs" a shipping decision when its product offers >1 transport
  // mode (must pick AIR/SHIP) or when it has logistics at all (must pick a
  // courier). Previously mobile had no concept of this — checkout could
  // proceed with an incomplete/undefined shipping choice.
  const transportOptionsFor = useCallback((item: CartItem): Array<'AIR' | 'SHIP'> => {
    const types = (item as any).product?.logisticsConfig?.transportTypes;
    return Array.isArray(types) ? types : [];
  }, []);

  const needsTransportChoice = useCallback((item: CartItem) => {
    const opts = transportOptionsFor(item);
    if (opts.length === 0) return false;
    if (opts.length > 1 && !item.transportType) return true;
    return !item.courier;
  }, [transportOptionsFor]);

  const hasShippingIssue = cartItems.some(needsTransportChoice);

  const goSelectShipping = useCallback((item: CartItem) => {
    router.push({
      pathname: '/(any)/products/[id]' as any,
      params: { id: item.productId, selectShipping: '1', cartItem: item.id },
    } as any);
  }, []);

  const handleCheckout = () => {
    if (!isAuthenticated) {
      Alert.alert('Login Required', 'Please login to checkout', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Login', onPress: () => router.push('/(auth)/Login') },
      ]);
      return;
    }
    if (hasStockIssue) {
      showErrorToast('Stock Issue', 'Fix stock issues before checkout');
      return;
    }
    if (hasShippingIssue) {
      showErrorToast('Shipping Required', 'Choose a shipping method to proceed');
      return;
    }
    router.push('/(any)/checkout' as any);
  };

  // ── Loading ─────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
        <ScreenHeader count={0} />
        <CartSkeleton />
      </View>
    );
  }

  // ── Empty ───────────────────────────────────────────────────────────────
  if (cartItems.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
        <ScreenHeader count={0} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <View
            style={{ width: 88, height: 88, borderRadius: 44, backgroundColor: '#E01A1B', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}
          >
            <ShoppingCart size={40} color="#ffffff" />
          </View>
          <Text style={{ fontSize: 20, fontWeight: '800', color: '#1a1a1a', marginBottom: 6 }}>
            Your cart is empty
          </Text>
          <Text style={{ fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 20, marginBottom: 24 }}>
            Add some items to get started
          </Text>
          <Pressable onPress={() => router.push('/(tabs)')} accessibilityRole="button" accessibilityLabel="Continue shopping, browse products">
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: BRAND,
                paddingHorizontal: 28,
                height: 50,
                borderRadius: 999,
                gap: 8,
                shadowColor: BRAND,
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.3,
                shadowRadius: 12,
                elevation: 4,
              }}
            >
              <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>Continue Shopping</Text>
            </View>
          </Pressable>
        </View>
      </View>
    );
  }

  // ── Main ────────────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      <ScreenHeader count={cartItems.length} />

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 140, gap: 10 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#111827" />}
      >
        {/* Sync notification banner (mobile-only value-add — kept) */}
        {syncResult.length > 0 ? (
          <SyncBanner results={syncResult} onDismiss={clearSyncResult} isSyncing={isSyncing} />
        ) : null}

        {isSyncing && syncResult.length === 0 ? (
          <View style={cs.syncingRow}>
            <RefreshCw size={14} color="#2563eb" />
            <Text style={cs.syncingText}>Checking stock & prices...</Text>
          </View>
        ) : null}

        {/* Items */}
        {cartItems.map((item) => {
          const oos = !item.inStock;
          const overStock = !oos && item.availableStock != null && item.quantity > item.availableStock;
          const lowStock = !oos && !overStock && item.availableStock != null && item.availableStock > 0 && item.availableStock <= 5;
          const incOff = oos || (item.availableStock != null && item.quantity >= item.availableStock);
          const shippingNeeded = needsTransportChoice(item);
          const hasLogistics = transportOptionsFor(item).length >= 1 || !!(item as any).product?.logisticsConfig;

          const sr = syncResult.find((r) => r.itemId === item.id)
            ?? (syncResult.filter((r) => r.productId === item.productId).length === 1
              ? syncResult.find((r) => r.productId === item.productId)
              : undefined);

          return (
            <View
              key={item.id}
              style={{
                backgroundColor: '#fff',
                borderRadius: 14,
                borderWidth: 1,
                borderColor: oos ? '#fecaca' : overStock ? '#fde68a' : lowStock ? '#fed7aa' : '#e5e7eb',
                shadowColor: '#0f172a',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.04,
                shadowRadius: 4,
                elevation: 1,
              }}
            >
              {/* Stock warning */}
              {oos ? (
                <View style={[cs.bannerRow, cs.bannerOos]} accessibilityRole="alert">
                  <AlertCircle size={11} color="#dc2626" />
                  <Text style={cs.bannerTextOos}>Out of Stock — remove to checkout</Text>
                </View>
              ) : overStock ? (
                <View style={[cs.bannerRow, cs.bannerOver]} accessibilityRole="alert">
                  <AlertTriangle size={11} color="#d97706" />
                  <Text style={cs.bannerTextOver}>Only {item.availableStock} left — quantity adjusted</Text>
                </View>
              ) : lowStock ? (
                <View style={[cs.bannerRow, cs.bannerLow]} accessibilityRole="alert">
                  <Info size={11} color="#ea580c" />
                  <Text style={cs.bannerTextLow}>Low stock — only {item.availableStock} left</Text>
                </View>
              ) : null}

              {/* Price change notification */}
              {sr?.priceChanged ? (
                <View
                  style={[cs.priceBannerRow, sr.newPrice > sr.oldPrice ? cs.priceBannerUp : cs.priceBannerDown]}
                  accessibilityRole="alert"
                >
                  {sr.newPrice > sr.oldPrice ? (
                    <TrendingUp size={11} color="#dc2626" />
                  ) : (
                    <TrendingDown size={11} color="#16a34a" />
                  )}
                  <Text style={sr.newPrice > sr.oldPrice ? cs.priceTextUp : cs.priceTextDown}>
                    Price {sr.newPrice > sr.oldPrice ? 'increased' : 'decreased'}: {fmt(sr.oldPrice)} → {fmt(sr.newPrice)}
                  </Text>
                </View>
              ) : null}

              <View style={{ flexDirection: 'row', padding: 12, gap: 12 }}>
                {/* Image */}
                <Pressable
                  onPress={() => router.push(`/(any)/products/${item.productId}` as any)}
                  accessibilityRole="button"
                  accessibilityLabel={`View ${item.name}`}
                >
                  <View
                    style={{ width: 88, height: 88, borderRadius: 12, overflow: 'hidden', backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#f3f4f6', opacity: oos ? 0.4 : 1 }}
                  >
                    {item.images.length > 0 ? (
                      <Image source={{ uri: item.images[0] }} style={{ width: '100%', height: '100%' }} contentFit="contain" transition={200} />
                    ) : (
                      <View style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
                        <Package size={24} color="#d1d5db" />
                      </View>
                    )}
                  </View>
                </Pressable>

                {/* Info + controls */}
                <View style={{ flex: 1, justifyContent: 'space-between' }}>
                  {/* Name row + trash */}
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4 }}>
                    <Text
                      style={{ flex: 1, fontSize: 13, fontWeight: '700', color: '#111827', lineHeight: 17, marginRight: 8 }}
                      numberOfLines={2}
                    >
                      {item.name}
                    </Text>
                    <Pressable
                      onPress={() => removeItem(item.id)}
                      accessibilityRole="button"
                      accessibilityLabel={`Remove ${item.name} from cart`}
                      hitSlop={6}
                    >
                      <View style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}>
                        <Trash2 size={16} color="#9ca3af" />
                      </View>
                    </Pressable>
                  </View>

                  {/* Category + rating + material badges (web parity — new) */}
                  <View style={cs.tagRow}>
                    {item.category ? (
                      <View style={cs.categoryChip}>
                        <Text style={cs.categoryChipText}>{item.category}</Text>
                      </View>
                    ) : null}
                    {item.rating != null ? (
                      <View style={cs.ratingChip}>
                        <Star size={10} color="#facc15" fill="#facc15" />
                        <Text style={cs.ratingChipText}>{item.rating}</Text>
                        <Text style={cs.ratingChipCount}>({item.reviews ?? 0})</Text>
                      </View>
                    ) : null}
                    {item.material ? (
                      <View style={cs.materialChip}>
                        <Text style={cs.materialChipText}>{item.material}</Text>
                      </View>
                    ) : null}
                    {item.discount != null && item.discount > 0 ? (
                      <View style={cs.discountChip}>
                        <Text style={cs.discountChipText}>Save {item.discount}%</Text>
                      </View>
                    ) : null}
                  </View>

                  {/* Variant / stock */}
                  <View style={cs.metaRow}>
                    {item.variantDetails ? (
                      <View style={cs.variantChip}>
                        {item.variantDetails.colorHex ? (
                          <View style={[cs.colorDot, { backgroundColor: item.variantDetails.colorHex }]} />
                        ) : null}
                        <Text style={cs.variantText}>
                          {[item.variantDetails.size, item.variantDetails.color].filter(Boolean).join(' · ')}
                        </Text>
                      </View>
                    ) : null}
                    {item.availableStock != null ? (
                      <View style={[
                        cs.stockChip,
                        oos ? cs.stockChipOos : lowStock ? cs.stockChipLow : cs.stockChipOk,
                      ]}>
                        <Text style={[
                          cs.stockText,
                          oos ? cs.stockTextOos : lowStock ? cs.stockTextLow : cs.stockTextOk,
                        ]}>
                          {oos ? 'Out of stock' : `${item.availableStock} in stock`}
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  {/* Price — offer-aware (web parity) */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                    <Text style={{ fontSize: 15, fontWeight: '800', color: '#111827' }}>{fmt(item.price)}</Text>
                    {item.offerStrikePrice ? (
                      <Text style={{ fontSize: 11, color: '#6b7280', textDecorationLine: 'line-through' }}>{fmt(item.offerStrikePrice)}</Text>
                    ) : item.originalPrice && item.originalPrice > item.price ? (
                      <Text style={{ fontSize: 11, color: '#6b7280', textDecorationLine: 'line-through' }}>{fmt(item.originalPrice)}</Text>
                    ) : null}
                    {item.activeOffer ? (
                      <View style={cs.offerBadge}>
                        <Text style={cs.offerBadgeText}>{item.activeOffer.badge}</Text>
                      </View>
                    ) : null}
                    {item.quantity > 1 ? (
                      <Text style={{ fontSize: 11, color: '#6b7280' }}>
                        ({fmt(item.price * item.quantity)} total)
                      </Text>
                    ) : null}
                  </View>
                </View>
              </View>

              {/* Shipping method row — web parity (was completely missing) */}
              {hasLogistics ? (
                shippingNeeded ? (
                  <Pressable
                    onPress={() => goSelectShipping(item)}
                    accessibilityRole="button"
                    accessibilityLabel={`Select shipping method for ${item.name}`}
                    style={{ marginHorizontal: 12, marginBottom: 12 }}
                  >
                    <View style={cs.shipSelectRow}>
                      <Truck size={14} color="#92400e" />
                      <Text style={cs.shipSelectText}>Select shipping method</Text>
                      <Text style={cs.shipSelectRequired}>*</Text>
                      <ArrowRight size={12} color="#92400e" style={{ marginLeft: 'auto' }} />
                    </View>
                  </Pressable>
                ) : (
                  <View style={{ marginHorizontal: 12, marginBottom: 12 }}>
                    <View style={cs.shipInfoRow}>
                      <Truck size={14} color="#6b7280" />
                      <Text style={cs.shipInfoText}>
                        Shipping: <Text style={cs.shipInfoBold}>{item.transportType === 'AIR' ? 'Air' : 'Sea'}</Text>
                        {item.courier ? <Text style={cs.shipInfoBold}>{`  ·  ${courierName(item.courier)}`}</Text> : null}
                      </Text>
                      <Pressable onPress={() => goSelectShipping(item)} hitSlop={6}>
                        <Text style={cs.shipChangeText}>Change</Text>
                      </Pressable>
                    </View>
                  </View>
                )
              ) : null}

              {/* Stepper row */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderTopWidth: 1,
                  borderTopColor: '#f3f4f6',
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#6b7280' }}>Quantity</Text>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: '#f3f4f6',
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: '#e5e7eb',
                  }}
                >
                  <Pressable
                    onPress={() => {
                      if (item.quantity <= 1) {
                        removeItem(item.id);
                      } else {
                        updateQty(item.id, item.quantity - 1);
                      }
                    }}
                    disabled={oos}
                    accessibilityRole="button"
                    accessibilityLabel={item.quantity <= 1 ? `Remove ${item.name} from cart` : `Decrease quantity of ${item.name}`}
                    android_ripple={{ color: 'rgba(0,0,0,0.08)', borderless: false, radius: 20 }}
                  >
                    <View style={{
                      width: 44, height: 44,
                      alignItems: 'center', justifyContent: 'center',
                      opacity: oos ? 0.3 : 1,
                    }}>
                      {item.quantity <= 1 && !oos ? (
                        <Trash2 size={15} color="#dc2626" strokeWidth={2.5} />
                      ) : (
                        <Minus size={15} color="#111827" strokeWidth={2.5} />
                      )}
                    </View>
                  </Pressable>
                  <Text style={{ minWidth: 32, textAlign: 'center', fontSize: 16, fontWeight: '800', color: '#111827' }}>
                    {item.quantity}
                  </Text>
                  <Pressable
                    onPress={() => updateQty(item.id, item.quantity + 1)}
                    disabled={incOff}
                    accessibilityRole="button"
                    accessibilityLabel={`Increase quantity of ${item.name}`}
                    android_ripple={{ color: 'rgba(0,0,0,0.08)', borderless: false, radius: 20 }}
                  >
                    <View style={{
                      width: 44, height: 44,
                      alignItems: 'center', justifyContent: 'center',
                      opacity: incOff ? 0.3 : 1,
                    }}>
                      <Plus size={15} color="#111827" strokeWidth={2.5} />
                    </View>
                  </Pressable>
                </View>
              </View>
            </View>
          );
        })}

        {/* Bag add-on (mobile-only value-add — kept) */}
        <BagSelector
          selectedBagId={selectedBag?.id ?? null}
          onSelect={handleBagSelect}
        />

        {/* Promo code */}
        <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#e5e7eb' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <Tag size={14} color="#374151" />
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#374151' }}>Promo Code</Text>
          </View>
          {appliedPromo ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f0fdf4', borderRadius: 10, padding: 12 }}>
              <View>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#16a34a' }}>{`"${appliedPromo}" applied!`}</Text>
                <Text style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>You saved {fmt(discountAmount)}</Text>
              </View>
              <Pressable onPress={removeCoupon} accessibilityRole="button" accessibilityLabel="Remove applied coupon" hitSlop={8}>
                <View style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}>
                  <X size={16} color="#6b7280" />
                </View>
              </Pressable>
            </View>
          ) : (
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TextInput
                value={promoCode}
                onChangeText={setPromoCode}
                placeholder="Enter code"
                placeholderTextColor="#9ca3af"
                autoCapitalize="characters"
                returnKeyType="done"
                onSubmitEditing={applyCoupon}
                style={{
                  flex: 1,
                  borderWidth: 1,
                  borderColor: '#e5e7eb',
                  borderRadius: 10,
                  paddingHorizontal: 14,
                  height: 44,
                  fontSize: 14,
                  color: '#111827',
                  backgroundColor: '#f9fafb',
                }}
              />
              <Pressable onPress={applyCoupon} disabled={applyingCoupon} accessibilityRole="button" accessibilityLabel="Apply promo code">
                <View
                  style={{
                    backgroundColor: applyingCoupon ? '#6b7280' : BRAND,
                    height: 44,
                    paddingHorizontal: 20,
                    borderRadius: 10,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {applyingCoupon ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>Apply</Text>
                  )}
                </View>
              </Pressable>
            </View>
          )}

          {freeShippingApplied && !appliedPromo ? (
            <View style={cs.freeShipRow}>
              <Truck size={15} color={Palette.secondary} />
              <Text style={cs.freeShipText} numberOfLines={2}>
                {freeShippingMessage || 'Free shipping applied!'}
              </Text>
            </View>
          ) : null}

          {!appliedPromo ? (
            <View style={cs.offersBlock}>
              {promosLoading ? (
                <View style={cs.offersLoadingRow}>
                  <ActivityIndicator size="small" color={Palette.textMuted} />
                  <Text style={cs.offersEmptyText}>Checking for offers...</Text>
                </View>
              ) : availablePromos.length === 0 ? (
                <View style={cs.offersEmptyRow}>
                  <Info size={13} color={Palette.textSubtle} />
                  <Text style={cs.offersEmptyText}>No promo codes available right now.</Text>
                </View>
              ) : (
                <>
                  <Text style={cs.offersLabel}>Available offers</Text>
                  {availablePromos.map((promo, i) => (
                    <View key={`${promo.code ?? 'offer'}-${i}`} style={cs.offerRow}>
                      <Tag size={13} color={BRAND} />
                      <Text style={cs.offerText} numberOfLines={2}>
                        {promo.message}
                      </Text>
                      {promo.code ? (
                        <Pressable
                          onPress={() => setPromoCode(promo.code!)}
                          accessibilityRole="button"
                          accessibilityLabel={`Use code ${promo.code}`}
                          hitSlop={6}
                          style={cs.offerCodeChip}
                        >
                          <Text style={cs.offerCodeText}>{promo.code}</Text>
                        </Pressable>
                      ) : null}
                    </View>
                  ))}
                </>
              )}
            </View>
          ) : null}
        </View>

        {/* Trust badges — web parity (was completely missing) */}
        <View style={cs.trustCard}>
          <View style={cs.trustRow}>
            <Shield size={18} color="#16a34a" />
            <Text style={cs.trustText}>Secure checkout with SSL encryption</Text>
          </View>
          <View style={cs.trustRow}>
            <Truck size={18} color={BRAND} />
            <Text style={cs.trustText}>Free shipping on orders over $100</Text>
          </View>
          <View style={cs.trustRow}>
            <Package size={18} color="#7c3aed" />
            <Text style={cs.trustText}>30-day return policy</Text>
          </View>
        </View>

      </ScrollView>

      {/* Sticky bottom — summary + checkout */}
      <StickyCheckout
        subtotal={subtotal}
        shipping={shippingCost}
        tax={tax}
        discount={effectiveDiscount}
        bagCost={bagCost}
        bagName={selectedBag?.name}
        total={total}
        hasStockIssue={hasStockIssue}
        hasShippingIssue={hasShippingIssue}
        onCheckout={handleCheckout}
      />
    </View>
  );
}

/**
 * Minimal offer-to-price resolver mirroring web's `applyOfferToPrice` from
 * `frontend/src/lib/offers.ts` for the common PERCENTAGE/FIXED shapes. If
 * mobile already has (or gets) its own `lib/offers.ts`, swap this for that
 * import — kept local + defensive so this file doesn't hard-fail if that
 * module isn't ported yet.
 */
function applyOfferPrice(price: number, offer: any, quantity: number): number {
  try {
    if (!offer) return price;
    if (offer.discountType === 'PERCENTAGE' && offer.discountValue) {
      return Math.max(0, price - (price * offer.discountValue) / 100);
    }
    if (offer.discountType === 'FIXED' && offer.discountValue) {
      return Math.max(0, price - offer.discountValue);
    }
    return price;
  } catch {
    return price;
  }
}

// ─── Header ───────────────────────────────────────────────────────────────────
function ScreenHeader({ count }: { count: number }) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        backgroundColor: '#fff',
        paddingHorizontal: 16,
        paddingTop: insets.top + 12,
        paddingBottom: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
      }}
    >
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
          {/* Brand-red cart icon — matches web's text-[#E01A1B] header icon */}
          {/* <ShoppingCart size={26} color={BRAND} /> */}
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 22, fontWeight: '800', color: '#1a1a1a' }}>Shopping Cart</Text>
            <Text style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>
              Review your items and proceed to checkout
            </Text>
          </View>
        </View>
        {count > 0 ? (
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontSize: 20, fontWeight: '800', color: '#1a1a1a' }}>{count}</Text>
            <Text style={{ fontSize: 11, color: '#6b7280' }}>{count === 1 ? 'Item' : 'Items'}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

function SummaryRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <Text style={{ fontSize: 13, color: '#6b7280' }}>{label}</Text>
      <Text style={{ fontSize: 13, fontWeight: '600', color: color || '#111827' }}>{value}</Text>
    </View>
  );
}

// ─── Sticky Checkout with expandable summary ──────────────────────────────────
function StickyCheckout({
  subtotal,
  shipping = 0,
  tax,
  discount,
  bagCost = 0,
  bagName,
  total,
  hasStockIssue,
  hasShippingIssue,
  onCheckout,
}: {
  subtotal: number;
  shipping?: number;
  tax: number;
  discount: number;
  bagCost?: number;
  bagName?: string;
  total: number;
  hasStockIssue: boolean;
  hasShippingIssue: boolean;
  onCheckout: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const bottomInsets = useSafeAreaInsets();
  const blocked = hasStockIssue || hasShippingIssue;

  return (
    <View
      style={{
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#e5e7eb',
        paddingHorizontal: 16,
        paddingTop: 10,
        paddingBottom: Math.max(bottomInsets.bottom, 16),
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
        elevation: 10,
      }}
    >
      {expanded ? (
        <View style={{ marginBottom: 10, gap: 6 }}>
          <SummaryRow label="Subtotal" value={fmt(subtotal)} />
          {tax > 0 ? <SummaryRow label="Tax (GST)" value={fmt(tax)} /> : null}
          {discount > 0 ? <SummaryRow label="Discount" value={`-${fmt(discount)}`} color="#16a34a" /> : null}
          {bagCost > 0 ? <SummaryRow label={`Bag (${bagName})`} value={fmt(bagCost)} /> : null}
          <SummaryRow label="Shipping" value={shipping > 0 ? fmt(shipping) : 'Free'} color={shipping > 0 ? undefined : '#16a34a'} />
          <View style={{ height: 1, backgroundColor: '#f3f4f6', marginVertical: 2 }} />
        </View>
      ) : null}

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <Pressable
          onPress={() => setExpanded((e) => !e)}
          accessibilityRole="button"
          accessibilityLabel={expanded ? 'Hide summary' : 'Show summary'}
          hitSlop={8}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text style={{ fontSize: 13, color: '#6b7280' }}>Total</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
              {expanded ? <ChevronDown size={14} color={BRAND} strokeWidth={2.5} /> : <ChevronRight size={14} color={BRAND} strokeWidth={2.5} />}
              <Text style={{ fontSize: 12, color: BRAND, fontWeight: '600' }}>
                {expanded ? 'Hide' : 'Details'}
              </Text>
            </View>
          </View>
        </Pressable>
        <Text style={{ fontSize: 20, fontWeight: '800', color: '#111827' }}>{fmt(total)}</Text>
      </View>

      {/* Checkout button — 3 states, web parity (mobile only had 2 before) */}
      <Pressable
        onPress={onCheckout}
        disabled={blocked}
        accessibilityRole="button"
        accessibilityLabel={
          hasShippingIssue
            ? 'Choose a shipping method to proceed'
            : hasStockIssue
              ? 'Fix stock issues to checkout'
              : 'Proceed to checkout'
        }
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: blocked ? '#d1d5db' : BRAND,
            height: 52,
            borderRadius: 999,
            gap: 8,
            shadowColor: blocked ? 'transparent' : BRAND,
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: blocked ? 0 : 0.3,
            shadowRadius: 12,
            elevation: blocked ? 0 : 4,
          }}
        >
          {hasShippingIssue ? (
            <Truck size={18} color={blocked ? '#9ca3af' : '#fff'} />
          ) : (
            <CreditCard size={18} color={blocked ? '#9ca3af' : '#fff'} />
          )}
          <Text style={{ color: blocked ? '#9ca3af' : '#fff', fontSize: 16, fontWeight: '700' }}>
            {hasShippingIssue
              ? 'Choose a shipping method to proceed'
              : hasStockIssue
                ? 'Fix Stock Issues'
                : 'Proceed to Checkout'}
          </Text>
        </View>
      </Pressable>
    </View>
  );
}

// ─── Sync notification banner ────────────────────────────────────────────────
function SyncBanner({
  results,
  onDismiss,
  isSyncing,
}: {
  results: StockSyncResult[];
  onDismiss: () => void;
  isSyncing: boolean;
}) {
  const oosCount = results.filter((r) => r.stockStatus === 'out_of_stock').length;
  const lowCount = results.filter((r) => r.stockStatus === 'low_stock').length;
  const priceCount = results.filter((r) => r.priceChanged).length;
  const qtyCount = results.filter((r) => r.qtyAdjusted).length;
  const backCount = results.filter((r) => r.wasOutOfStock).length;

  const lines: string[] = [];
  if (oosCount > 0) lines.push(`${oosCount} ${oosCount === 1 ? 'item is' : 'items are'} now out of stock`);
  if (lowCount > 0) lines.push(`${lowCount} ${lowCount === 1 ? 'item has' : 'items have'} low stock`);
  if (qtyCount > 0) lines.push(`${qtyCount} ${qtyCount === 1 ? 'quantity was' : 'quantities were'} auto-adjusted`);
  if (priceCount > 0) lines.push(`${priceCount} ${priceCount === 1 ? 'price has' : 'prices have'} changed`);
  if (backCount > 0) lines.push(`${backCount} ${backCount === 1 ? 'item is' : 'items are'} back in stock`);

  if (lines.length === 0) return null;

  const hasIssues = oosCount > 0 || qtyCount > 0;
  const bgColor = hasIssues ? '#fef2f2' : priceCount > 0 ? '#fffbeb' : '#f0fdf4';
  const borderColor = hasIssues ? '#fecaca' : priceCount > 0 ? '#fde68a' : '#bbf7d0';
  const iconColor = hasIssues ? '#dc2626' : priceCount > 0 ? '#d97706' : '#16a34a';

  return (
    <View
      style={[cs.syncBanner, { backgroundColor: bgColor, borderColor }]}
      accessibilityRole="alert"
    >
      <View style={cs.syncBannerInner}>
        <AlertCircle size={16} color={iconColor} style={cs.syncBannerIcon} />
        <View style={cs.syncBannerContent}>
          <Text style={cs.syncBannerTitle}>
            {isSyncing ? 'Updating cart...' : 'Cart updated'}
          </Text>
          {lines.map((line) => (
            <Text key={line} style={cs.syncBannerLine}>{'• '}{line}</Text>
          ))}
        </View>
        <Pressable
          onPress={onDismiss}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Dismiss notification"
          accessibilityHint="Hides the stock update banner"
          style={cs.syncBannerDismiss}
        >
          <X size={16} color="#9ca3af" />
        </Pressable>
      </View>
    </View>
  );
}

// ─── Hoisted styles ───────────────────────────────────────────────────────────
const cs = StyleSheet.create({
  offersBlock: { marginTop: 12 },
  offersLabel: {
    fontSize: 10.5,
    fontWeight: '800',
    color: Palette.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  offersLoadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  offersEmptyRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  offersEmptyText: { flex: 1, fontSize: 12, color: Palette.textSubtle },
  offerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: Palette.outlineSubtle,
  },
  offerText: { flex: 1, fontSize: 12, color: Palette.text, lineHeight: 16 },
  offerCodeChip: {
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Palette.brandBorder,
    backgroundColor: Palette.onBrand,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  offerCodeText: { fontSize: 11, fontWeight: '800', color: '#E01A1B', letterSpacing: 0.5 },

  freeShipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: Radius.md,
    backgroundColor: Palette.secondaryContainer,
    borderWidth: 1,
    borderColor: 'rgba(22,163,74,0.25)',
  },
  freeShipText: { flex: 1, fontSize: 12.5, fontWeight: '700', color: Palette.secondary },

  syncingRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 10, backgroundColor: '#eff6ff', borderRadius: 12,
  },
  syncingText: { fontSize: 12, fontWeight: '600', color: '#2563eb' },

  bannerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 6,
    borderTopLeftRadius: 14, borderTopRightRadius: 14,
  },
  bannerOos: { backgroundColor: '#fef2f2' },
  bannerOver: { backgroundColor: '#fffbeb' },
  bannerLow: { backgroundColor: '#fff7ed' },
  bannerTextOos: { fontSize: 11, fontWeight: '700', color: '#dc2626' },
  bannerTextOver: { fontSize: 11, fontWeight: '700', color: '#92400e' },
  bannerTextLow: { fontSize: 11, fontWeight: '700', color: '#9a3412' },

  priceBannerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 5,
  },
  priceBannerUp: { backgroundColor: '#fef2f2' },
  priceBannerDown: { backgroundColor: '#f0fdf4' },
  priceTextUp: { fontSize: 11, fontWeight: '700', color: '#dc2626' },
  priceTextDown: { fontSize: 11, fontWeight: '700', color: '#16a34a' },

  syncBanner: { borderRadius: 12, borderWidth: 1, padding: 12 },
  syncBannerInner: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  syncBannerIcon: { marginTop: 1 },
  syncBannerContent: { flex: 1 },
  syncBannerTitle: { fontSize: 13, fontWeight: '700', color: '#111827', marginBottom: 4 },
  syncBannerLine: { fontSize: 11, color: '#374151', lineHeight: 17 },
  syncBannerDismiss: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },

  // Tag row (category / rating / material / discount) — web parity, new
  tagRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6, flexWrap: 'wrap' },
  categoryChip: { backgroundColor: Palette.onBrand, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  categoryChipText: { fontSize: 10, fontWeight: '700', color: '#E01A1B' },
  ratingChip: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  ratingChipText: { fontSize: 10.5, fontWeight: '700', color: '#374151' },
  ratingChipCount: { fontSize: 10, color: '#9ca3af' },
  materialChip: { backgroundColor: '#f0fdf4', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  materialChipText: { fontSize: 10, fontWeight: '700', color: '#16a34a' },
  discountChip: { backgroundColor: '#f3f4f6', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  discountChipText: { fontSize: 10, fontWeight: '700', color: '#374151' },

  // Offer badge on price row — web parity, new
  offerBadge: { backgroundColor: '#E01A1B', borderRadius: 999, paddingHorizontal: 6, paddingVertical: 1.5 },
  offerBadgeText: { fontSize: 9, fontWeight: '800', color: '#fff' },

  // Shipping method rows — web parity, new
  shipSelectRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#fde68a',
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
  },
  shipSelectText: { fontSize: 12, fontWeight: '700', color: '#92400e' },
  shipSelectRequired: { fontSize: 12, fontWeight: '700', color: '#E01A1B' },
  shipInfoRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb',
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
  },
  shipInfoText: { fontSize: 12, color: '#374151', flex: 1 },
  shipInfoBold: { fontWeight: '700', color: '#111827' },
  shipChangeText: { fontSize: 12, fontWeight: '700', color: '#E01A1B' },

  // Meta row (variant + stock)
  metaRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap',
  },
  variantChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#f3f4f6', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2,
  },
  colorDot: {
    width: 8, height: 8, borderRadius: 4, borderWidth: 1, borderColor: '#e5e7eb',
  },
  variantText: { fontSize: 11, fontWeight: '600', color: '#374151' },

  stockChip: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  stockChipOk: { backgroundColor: '#f0fdf4' },
  stockChipLow: { backgroundColor: '#fff7ed' },
  stockChipOos: { backgroundColor: '#fef2f2' },
  stockText: { fontSize: 10, fontWeight: '700' },
  stockTextOk: { color: '#16a34a' },
  stockTextLow: { color: '#ea580c' },
  stockTextOos: { color: '#dc2626' },

  // Trust badges card — web parity, new
  trustCard: {
    backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#e5e7eb',
    padding: 16, gap: 12,
  },
  trustRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  trustText: { fontSize: 12.5, color: '#4b5563', flex: 1 },
});