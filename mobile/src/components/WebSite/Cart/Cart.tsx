import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { calculateLogistics, type LogisticsConfig } from '@/lib/logistics';
import { getRegionalPrice, formatPrice as fmtCurrency } from '@/lib/currency';
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
} from 'lucide-react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { cartService } from '@/services/cartService';
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

// ─── Types ────────────────────────────────────────────────────────────────────
interface CartItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  originalPrice?: number;
  images: string[];
  category: string;
  inStock: boolean;
  availableStock?: number;
  quantity: number;
  discount?: number;
  gstPercentage?: number;
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

  // Promo
  const [promoCode, setPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState('');
  const [discountAmount, setDiscountAmount] = useState(0);
  const [couponMeta, setCouponMeta] = useState<{ discountType: string; discountValue: number; maxDiscountAmount?: number } | null>(null);
  const [applyingCoupon, setApplyingCoupon] = useState(false);

  useEffect(() => {
    fetchCart();
    loadSavedCoupon();
    syncStock();
  }, []);

  // When sync completes, merge live product data into local cartItems (uses ALL results, not just meaningful)
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

              // Images: prefer variant images, fall back to product images
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

              // Price: use live product/variant price, not stale cart price
              const livePrice = hasVariant
                ? getRegionalPrice(item.variant as any)
                : getRegionalPrice(item.product as any);

              // Stock: variant stock takes priority
              const liveStock = hasVariant
                ? item.variant.stock
                : (item.product?.availableStock ?? item.product?.totalStock);

              // Original price & discount: variant overrides product
              const liveOriginalPrice = hasVariant
                ? (item.variant.originalPrice ?? item.product?.originalPrice)
                : item.product?.originalPrice;
              const liveDiscount = hasVariant
                ? (item.variant.discount ?? item.product?.discount)
                : item.product?.discount;

              // Build variant display info — use variant data if present,
              // otherwise show product's singleUnit attributes (base variant)
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
                price: livePrice,
                originalPrice: liveOriginalPrice,
                images: imgArray,
                category: item.product?.category || '',
                inStock: liveStock > 0 && (item.product?.inStock ?? true),
                availableStock: liveStock,
                quantity: item.quantity,
                discount: liveDiscount,
                gstPercentage: item.product?.gstPercentage,
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
              items.push({
                id: ci.id,
                productId: ci.productId,
                name: p.name,
                price: getRegionalPrice(p as any),
                originalPrice: p.originalPrice,
                images: url ? [url] : [],
                category: p.category || '',
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
    if (qty < 1) { removeItem(id); return; }

    // 1. Optimistic: update local state instantly
    setCartItems((prev) => prev.map((i) => (i.id === id ? { ...i, quantity: qty } : i)));

    // 2. Debounce API call — if user taps rapidly, only the last value is sent
    if (pendingUpdates.current[id]) clearTimeout(pendingUpdates.current[id]);
    pendingUpdates.current[id] = setTimeout(async () => {
      delete pendingUpdates.current[id];
      try {
        if (isAuthenticated) await cartService.updateCartItem(id, qty);
        else await cartService.updateLocalCartItem(id, qty);
        refreshCart(); // sync badge count
      } catch {
        // Rollback on failure — re-fetch real state
        showErrorToast('Error', 'Failed to update quantity');
        fetchCart();
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
          // Optimistic remove
          const prev = [...cartItems];
          setCartItems((items) => items.filter((i) => i.id !== id));
          try {
            if (isAuthenticated) await cartService.removeFromCart(id);
            else await cartService.removeFromLocalCart(id);
            refreshCart();
            showSuccessToast('Removed', 'Item removed from cart');
          } catch {
            // Rollback
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
          maxDiscountAmount: res.data.minPurchaseAmount, // backend returns maxDiscountAmount here
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

  // Calculate logistics-based shipping
  const shippingCost = useMemo(() => {
    let cost = 0;
    for (const item of cartItems) {
      const config = (item as any).product?.logisticsConfig;
      if (config) {
        const result = calculateLogistics(config as LogisticsConfig, item.quantity);
        cost += result.totalShippingCost;
      }
    }
    return cost;
  }, [cartItems]);

  // Recalculate discount from coupon metadata when subtotal changes
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
            style={{ width: 88, height: 88, borderRadius: 44, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}
          >
            <ShoppingCart size={40} color="#d1d5db" />
          </View>
          <Text style={{ fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 6 }}>
            Your cart is empty
          </Text>
          <Text style={{ fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 20, marginBottom: 24 }}>
            {"Looks like you haven't added anything yet."}
          </Text>
          <Pressable onPress={() => router.push('/(tabs)')} accessibilityRole="button">
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
              <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>Start Shopping</Text>
              <ArrowRight size={16} color="#fff" />
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
        contentContainerStyle={{ padding: 16, paddingBottom: 16, gap: 10 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#111827" />}
      >
        {/* Sync notification banner */}
        {syncResult.length > 0 ? (
          <SyncBanner results={syncResult} onDismiss={clearSyncResult} isSyncing={isSyncing} />
        ) : null}

        {/* Syncing indicator */}
        {isSyncing && syncResult.length === 0 ? (
          <View style={cs.syncingRow}>
            <RefreshCw size={14} color="#2563eb" />
            <Text style={cs.syncingText}>Checking stock & prices...</Text>
          </View>
        ) : null}

        {/* Items — compact single-row cards */}
        {cartItems.map((item) => {
          const oos = !item.inStock;
          const overStock = !oos && item.availableStock != null && item.quantity > item.availableStock;
          const lowStock = !oos && !overStock && item.availableStock != null && item.availableStock > 0 && item.availableStock <= 5;
          const incOff = oos || (item.availableStock != null && item.quantity >= item.availableStock);

          // Check if this item has a sync result with changes (match by itemId to avoid variant mix-up)
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
              {/* Stock warning — slim inline */}
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

              {/* Price change notification — per item */}
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
                {/* Image — 64px compact */}
                <Pressable
                  onPress={() => router.push(`/(any)/products/${item.productId}` as any)}
                  accessibilityRole="button"
                  accessibilityLabel={`View ${item.name}`}
                >
                  <View
                    style={{ width: 64, height: 64, borderRadius: 10, overflow: 'hidden', backgroundColor: '#f3f4f6', opacity: oos ? 0.4 : 1 }}
                  >
                    {item.images.length > 0 ? (
                      <Image source={{ uri: item.images[0] }} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={200} />
                    ) : (
                      <View style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
                        <Package size={20} color="#d1d5db" />
                      </View>
                    )}
                  </View>
                </Pressable>

                {/* Info + controls — all in one column */}
                <View style={{ flex: 1 }}>
                  {/* Name row + trash */}
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 2 }}>
                    <Text
                      style={{ flex: 1, fontSize: 13, fontWeight: '700', color: '#111827', lineHeight: 17, marginRight: 8 }}
                      numberOfLines={2}
                    >
                      {item.name}
                    </Text>
                    <Pressable onPress={() => removeItem(item.id)} accessibilityRole="button" accessibilityLabel="Remove" hitSlop={8}>
                      <View style={{ padding: 4 }}>
                        <Trash2 size={14} color="#9ca3af" />
                      </View>
                    </Pressable>
                  </View>

                  {/* Variant / Product attributes + stock */}
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

                  {/* Price + stepper + line total */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    {/* Price */}
                    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
                      <Text style={{ fontSize: 14, fontWeight: '800', color: '#111827' }}>{fmt(item.price)}</Text>
                      {item.originalPrice ? (
                        <Text style={{ fontSize: 10, color: '#dc2626', textDecorationLine: 'line-through' }}>{fmt(item.originalPrice)}</Text>
                      ) : null}
                    </View>

                    {/* Compact stepper */}
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: '#f3f4f6',
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: '#e5e7eb',
                      }}
                    >
                      <Pressable onPress={() => updateQty(item.id, item.quantity - 1)} disabled={oos} accessibilityRole="button" hitSlop={4}>
                        <View style={{ width: 30, height: 28, alignItems: 'center', justifyContent: 'center', opacity: oos ? 0.3 : 1 }}>
                          <Minus size={12} color="#111827" strokeWidth={2.5} />
                        </View>
                      </Pressable>
                      <Text style={{ minWidth: 22, textAlign: 'center', fontSize: 13, fontWeight: '800', color: '#111827' }}>
                        {item.quantity}
                      </Text>
                      <Pressable onPress={() => updateQty(item.id, item.quantity + 1)} disabled={incOff} accessibilityRole="button" hitSlop={4}>
                        <View style={{ width: 30, height: 28, alignItems: 'center', justifyContent: 'center', opacity: incOff ? 0.3 : 1 }}>
                          <Plus size={12} color="#111827" strokeWidth={2.5} />
                        </View>
                      </Pressable>
                    </View>

                    {/* Line total */}
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#374151' }}>
                      {fmt(item.price * item.quantity)}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          );
        })}

        {/* Bag add-on */}
        <BagSelector
          selectedBagId={selectedBag?.id ?? null}
          onSelect={setSelectedBag}
        />

        {/* Promo code */}
        <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#e5e7eb' }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 10 }}>
            <Tag size={13} color="#374151" /> Promo Code
          </Text>
          {appliedPromo ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f0fdf4', borderRadius: 10, padding: 12 }}>
              <View>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#16a34a' }}>{`"${appliedPromo}" applied!`}</Text>
                <Text style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>You saved {fmt(discountAmount)}</Text>
              </View>
              <Pressable onPress={removeCoupon} accessibilityRole="button" hitSlop={8}>
                <X size={16} color="#6b7280" />
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
              <Pressable onPress={applyCoupon} disabled={applyingCoupon} accessibilityRole="button">
                <View
                  style={{
                    backgroundColor: applyingCoupon ? '#6b7280' : '#111827',
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
        </View>

      </ScrollView>

      {/* Sticky bottom — summary + checkout, always visible */}
      <StickyCheckout
        subtotal={subtotal}
        shipping={shippingCost}
        tax={tax}
        discount={effectiveDiscount}
        bagCost={bagCost}
        bagName={selectedBag?.name}
        total={total}
        hasStockIssue={hasStockIssue}
        onCheckout={handleCheckout}
      />
    </View>
  );
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
      <Text style={{ fontSize: 24, fontWeight: '800', color: '#111827' }}>My Cart</Text>
      <Text style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>
        {count > 0 ? `${count} ${count === 1 ? 'item' : 'items'}` : 'Your shopping cart'}
      </Text>
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
  onCheckout: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const bottomInsets = useSafeAreaInsets();

  return (
    <View
      style={{
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#e5e7eb',
        paddingHorizontal: 16,
        paddingTop: 10,
        paddingBottom: Math.max(bottomInsets.bottom, 16) + 60,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
        elevation: 10,
      }}
    >
      {/* Expandable summary breakdown */}
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

      {/* Total row + expand toggle */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <Pressable
          onPress={() => setExpanded((e) => !e)}
          accessibilityRole="button"
          accessibilityLabel={expanded ? 'Hide summary' : 'Show summary'}
          hitSlop={8}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text style={{ fontSize: 13, color: '#6b7280' }}>Total</Text>
            <Text style={{ fontSize: 11, color: '#2563eb', fontWeight: '600' }}>
              {expanded ? '▾ Hide' : '▸ Details'}
            </Text>
          </View>
        </Pressable>
        <Text style={{ fontSize: 20, fontWeight: '800', color: '#111827' }}>{fmt(total)}</Text>
      </View>

      {/* Checkout button */}
      <Pressable
        onPress={onCheckout}
        disabled={hasStockIssue}
        accessibilityRole="button"
        accessibilityLabel={hasStockIssue ? 'Fix stock issues to checkout' : 'Proceed to checkout'}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: hasStockIssue ? '#d1d5db' : '#111827',
            height: 52,
            borderRadius: 14,
            gap: 8,
          }}
        >
          <CreditCard size={18} color={hasStockIssue ? '#9ca3af' : '#fff'} />
          <Text style={{ color: hasStockIssue ? '#9ca3af' : '#fff', fontSize: 16, fontWeight: '700' }}>
            {hasStockIssue ? 'Fix Stock Issues' : 'Proceed to Checkout'}
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

// ─── Hoisted styles for sync UI ──────────────────────────────────────────────
const cs = StyleSheet.create({
  // Syncing indicator
  syncingRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 10, backgroundColor: '#eff6ff', borderRadius: 12,
  },
  syncingText: { fontSize: 12, fontWeight: '600', color: '#2563eb' },

  // Stock warning banners (per-item)
  bannerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 6,
    borderTopLeftRadius: 14, borderTopRightRadius: 14,
  },
  bannerOos: { backgroundColor: '#fef2f2' },
  bannerOver: { backgroundColor: '#fffbeb' },
  bannerLow: { backgroundColor: '#fff7ed' },
  bannerTextOos: { fontSize: 10, fontWeight: '700', color: '#dc2626' },
  bannerTextOver: { fontSize: 10, fontWeight: '700', color: '#92400e' },
  bannerTextLow: { fontSize: 10, fontWeight: '700', color: '#9a3412' },

  // Price change banner (per-item)
  priceBannerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 5,
  },
  priceBannerUp: { backgroundColor: '#fef2f2' },
  priceBannerDown: { backgroundColor: '#f0fdf4' },
  priceTextUp: { fontSize: 10, fontWeight: '700', color: '#dc2626' },
  priceTextDown: { fontSize: 10, fontWeight: '700', color: '#16a34a' },

  // SyncBanner component
  syncBanner: { borderRadius: 12, borderWidth: 1, padding: 12 },
  syncBannerInner: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  syncBannerIcon: { marginTop: 1 },
  syncBannerContent: { flex: 1 },
  syncBannerTitle: { fontSize: 13, fontWeight: '700', color: '#111827', marginBottom: 4 },
  syncBannerLine: { fontSize: 11, color: '#374151', lineHeight: 17 },
  syncBannerDismiss: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },

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
  variantText: { fontSize: 10, fontWeight: '600', color: '#374151' },

  // Stock chips
  stockChip: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  stockChipOk: { backgroundColor: '#f0fdf4' },
  stockChipLow: { backgroundColor: '#fff7ed' },
  stockChipOos: { backgroundColor: '#fef2f2' },
  stockText: { fontSize: 9, fontWeight: '700' },
  stockTextOk: { color: '#16a34a' },
  stockTextLow: { color: '#ea580c' },
  stockTextOos: { color: '#dc2626' },
});
