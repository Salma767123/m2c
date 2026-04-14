import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  TextInput,
  ActivityIndicator,
  StatusBar,
  Platform,
} from 'react-native';
import {
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  Truck,
  Shield,
  Star,
  Package,
  CheckCircle,
  ArrowRight,
  Tag,
  RotateCcw,
  AlertCircle,
  ChevronLeft,
} from 'lucide-react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { cartService } from '@/services/cartService';
import { couponService } from '@/services/couponService';
import { publicProductService } from '@/services/publicProductService';
import { userAuthService } from '@/services/userAuthService';
import { showSuccessToast, showErrorToast } from '@/lib/toast-utils';

// ─── Types ────────────────────────────────────────────────────────────────────
interface OrderItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  originalPrice?: number;
  images: string[];
  category: string;
  rating?: number;
  reviews?: number;
  inStock: boolean;
  quantity: number;
  description?: string;
  availableStock?: number;
  material?: string;
  discount?: number;
  gstPercentage?: number;
  variantDetails?: {
    size: string;
    color: string;
    colorHex?: string;
    sku?: string;
  };
}

interface OrderSummary {
  subtotal: number;
  shipping: number;
  tax: number;
  discount: number;
  total: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n: number) => `₹${n.toFixed(2)}`;

// ─── Component ────────────────────────────────────────────────────────────────
export default function Cart() {
  const [cartItems, setCartItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState('');
  const [discountAmount, setDiscountAmount] = useState(0);
  const [applyingCoupon, setApplyingCoupon] = useState(false);

  useEffect(() => {
    fetchCart();
    loadSavedCoupon();
  }, []);

  // ── Data ────────────────────────────────────────────────────────────────────
  const loadSavedCoupon = async () => {
    try {
      const saved = await AsyncStorage.getItem('appliedCoupon');
      if (saved) {
        const { code, discountAmount: da } = JSON.parse(saved);
        setAppliedPromo(code);
        setDiscountAmount(da);
      }
    } catch {
      await AsyncStorage.removeItem('appliedCoupon');
    }
  };

  const fetchCart = async () => {
    try {
      setLoading(true);
      const authenticated = await userAuthService.isAuthenticated();
      setIsAuthenticated(authenticated);

      if (!authenticated) {
        const localCart = await cartService.getLocalCart();
        const promises = localCart.map(async (item: any) => {
          try {
            const res = await publicProductService.getProduct(item.productId);
            if (res.success && res.data) {
              const p = res.data;
              // Resolve variant if present
              let variantDetails: OrderItem['variantDetails'] = undefined;
              let finalPrice = p.adminFixedPrice || p.basePrice;
              let finalImages = p.images.map((img: any) => img.url);
              let finalStock = p.totalStock;
              if (item.variantId && p.variants) {
                const v = p.variants.find((vv: any) => vv.id === item.variantId);
                if (v) {
                  variantDetails = { size: v.size, color: v.color, colorHex: v.colorHex, sku: v.sku };
                  finalPrice = v.price;
                  finalStock = v.stock;
                  if (v.images?.length > 0) finalImages = v.images;
                }
              }
              return {
                id: item.id,
                productId: item.productId,
                name: p.name,
                price: finalPrice,
                originalPrice: p.originalPrice,
                images: finalImages,
                category: p.category,
                rating: p.rating,
                reviews: p.reviews,
                inStock: p.inStock,
                availableStock: finalStock,
                quantity: item.quantity,
                description: p.description,
                material: p.material,
                discount: p.discount,
                gstPercentage: p.gstPercentage,
                variantDetails,
              };
            }
          } catch { /* skip broken product */ }
          return null;
        });
        const resolved = await Promise.all(promises);
        setCartItems(resolved.filter(Boolean) as OrderItem[]);
      } else {
        const response = await cartService.getCart();
        if (response.success && response.data) {
          setCartItems(
            response.data.items.map((item: any) => {
              const hasVariantImg = item.variant?.images && item.variant.images.length > 0;
              const hasProductImg = item.product?.images && item.product.images.length > 0;
              const imgArray = hasVariantImg
                ? item.variant.images
                : hasProductImg
                ? item.product.images.map((img: any) => img.url)
                : [];
              return {
                id: item.id,
                productId: item.productId,
                name: item.product?.name || 'Unknown Product',
                price: item.price,
                originalPrice: item.product?.originalPrice,
                images: imgArray,
                category: item.product?.category || '',
                rating: item.product?.rating,
                reviews: item.product?.reviews,
                inStock: item.product?.inStock ?? true,
                availableStock: item.variant?.stock ?? item.product?.availableStock,
                quantity: item.quantity,
                description: item.product?.description,
                material: item.product?.material,
                discount: item.product?.discount,
                gstPercentage: item.product?.gstPercentage,
                variantDetails: item.variant
                  ? {
                      size: item.variant.size,
                      color: item.variant.color,
                      colorHex: item.variant.colorHex,
                      sku: item.variant.sku,
                    }
                  : undefined,
              };
            })
          );
        }
      }
    } catch {
      showErrorToast('Error', 'Failed to load cart items');
    } finally {
      setLoading(false);
    }
  };

  // ── Cart actions ─────────────────────────────────────────────────────────────
  const updateQuantity = async (id: string, productId: string, newQty: number) => {
    if (newQty < 1) { removeItem(id); return; }
    try {
      if (!isAuthenticated) {
        await cartService.updateLocalCartItem(id, newQty);
        setCartItems(prev => prev.map(i => i.id === id ? { ...i, quantity: newQty } : i));
        showSuccessToast('Updated', 'Cart item quantity updated');
      } else {
        await cartService.updateCartItem(id, newQty);
        setCartItems(prev => prev.map(i => i.id === id ? { ...i, quantity: newQty } : i));
        showSuccessToast('Updated', 'Cart item quantity updated');
      }
    } catch {
      showErrorToast('Error', 'Failed to update quantity');
    }
  };

  const removeItem = (id: string) => {
    Alert.alert('Remove Item', 'Remove this item from your cart?', [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            if (!isAuthenticated) {
              await cartService.removeFromLocalCart(id);
              setCartItems(prev => prev.filter(i => i.id !== id));
            } else {
              await cartService.removeFromCart(id);
              setCartItems(prev => prev.filter(i => i.id !== id));
            }
            showSuccessToast('Removed', 'Item removed from cart');
          } catch {
            showErrorToast('Error', 'Failed to remove item');
          }
        },
      },
    ]);
  };

  const applyPromoCode = async () => {
    if (!promoCode.trim()) { showErrorToast('Error', 'Please enter a promo code'); return; }
    try {
      setApplyingCoupon(true);
      const subtotal = cartItems.reduce((s, i) => s + i.price * i.quantity, 0);
      const response = await couponService.applyCoupon(promoCode, subtotal);
      if (response.success && response.data) {
        setAppliedPromo(response.data.code);
        setDiscountAmount(response.data.discountAmount);
        setPromoCode('');
        await AsyncStorage.setItem('appliedCoupon', JSON.stringify({
          code: response.data.code,
          discountAmount: response.data.discountAmount,
        }));
        showSuccessToast('Applied!', `Coupon "${response.data.code}" saved you ${fmt(response.data.discountAmount)}`);
      } else {
        throw new Error(response.message || 'Invalid coupon');
      }
    } catch (e: any) {
      setAppliedPromo(''); setDiscountAmount(0);
      await AsyncStorage.removeItem('appliedCoupon');
      showErrorToast('Invalid Coupon', e.message || 'Failed to apply coupon');
    } finally {
      setApplyingCoupon(false);
    }
  };

  const removeCoupon = async () => {
    setAppliedPromo(''); setDiscountAmount(0);
    await AsyncStorage.removeItem('appliedCoupon');
    showSuccessToast('Removed', 'Coupon removed');
  };

  // ── Summary ──────────────────────────────────────────────────────────────────
  const calculateSummary = (): OrderSummary => {
    const subtotal = cartItems.reduce((s, i) => s + i.price * i.quantity, 0);
    const tax = cartItems.reduce((s, i) => {
      return s + i.price * i.quantity * (i.gstPercentage ? i.gstPercentage / 100 : 0);
    }, 0);
    const total = Math.max(0, subtotal + tax - discountAmount);
    return { subtotal, shipping: 0, tax, discount: discountAmount, total };
  };

  const hasStockIssue = cartItems.some(
    i => i.inStock === false || (i.availableStock !== undefined && i.quantity > i.availableStock)
  );

  const handleCheckout = () => {
    if (!isAuthenticated) {
      Alert.alert('Login Required', 'Please login to proceed with checkout', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Login', onPress: () => router.push('/(auth)/Login') },
      ]);
      return;
    }
    if (hasStockIssue) {
      showErrorToast('Stock Issue', 'Remove out-of-stock items before checkout');
      return;
    }
    router.push('/(any)/checkout');
  };

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View className="flex-1 bg-gray-50 items-center justify-center">
        <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
        <ActivityIndicator size="large" color="#000000" />
        <Text className="text-gray-500 mt-3 text-sm">Loading your cart…</Text>
      </View>
    );
  }

  const summary = calculateSummary();

  // ── Empty state ──────────────────────────────────────────────────────────────
  if (cartItems.length === 0) {
    return (
      <View className="flex-1 bg-gray-50">
        <StatusBar barStyle="light-content" backgroundColor="#000000" />

        {/* Header */}
        <View className={`bg-black ${Platform.OS === 'ios' ? 'pt-0' : 'pt-4'} pb-5 px-5`}>
          <Text className="text-white text-2xl font-extrabold tracking-tight">My Cart</Text>
          <Text className="text-gray-400 text-xs mt-0.5">0 items</Text>
        </View>

        <View className="flex-1 items-center justify-center p-8">
          {/* Empty bag illustration */}
          <View className="w-24 h-24 rounded-full bg-gray-100 items-center justify-center mb-6">
            <ShoppingBag size={48} color="#d1d5db" />
          </View>
          <Text className="text-2xl font-extrabold text-gray-900 mb-2 text-center">
            Your cart is empty
          </Text>
          <Text className="text-sm text-gray-500 text-center leading-5 mb-8">
            Looks like you haven't added anything yet.{'\n'}Start shopping to fill it up!
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)')}
            activeOpacity={0.85}
            className="bg-black px-8 py-4 rounded-2xl flex-row items-center gap-2"
          >
            <Text className="text-white text-base font-bold">Start Shopping</Text>
            <ArrowRight size={18} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Main cart ─────────────────────────────────────────────────────────────────
  return (
    <View className="flex-1 bg-gray-50">
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      {/* ── Page Header ─────────────────────────────────────────────────────── */}
      <View className={`bg-black ${Platform.OS === 'ios' ? 'pt-0' : 'pt-4'} pb-5 px-5`}>
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-white text-2xl font-extrabold tracking-tight">My Cart</Text>
            <Text className="text-gray-400 text-xs mt-0.5">
              {cartItems.length} item{cartItems.length !== 1 ? 's' : ''}
            </Text>
          </View>
          {/* Item count chip */}
          <View className="bg-gray-200 rounded-full px-3.5 py-1.5">
            <Text className="text-black font-extrabold text-xs">{cartItems.length}</Text>
          </View>
        </View>

        {/* Subtotal preview strip */}
        <View className="bg-white/10 rounded-xl px-4 py-2.5 mt-3.5 flex-row justify-between items-center">
          <Text className="text-gray-300 text-xs">Subtotal</Text>
          <Text className="text-white text-lg font-extrabold">{fmt(summary.subtotal)}</Text>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Cart Items ────────────────────────────────────────────────────── */}
        <View className="px-4 pt-4">

          {cartItems.map((item, index) => {
            const isLast = index === cartItems.length - 1;
            const isOutOfStock = !item.inStock;
            const isOverStock = item.availableStock !== undefined && item.quantity > item.availableStock;
            const hasIssue = isOutOfStock || isOverStock;

            return (
              <View
                key={item.id}
                className={`bg-white rounded-[20px] overflow-hidden shadow-sm ${isLast ? '' : 'mb-3'} border-[1.5px] ${hasIssue ? 'border-gray-400' : 'border-transparent'}`}
              >
                {/* Stock issue banner */}
                {hasIssue && (
                  <View className="flex-row items-center gap-1.5 px-3.5 py-1.5 bg-gray-100">
                    <AlertCircle size={13} color="#374151" />
                    <Text className="text-xs font-semibold text-gray-700">
                      {isOutOfStock ? 'Out of Stock' : `Only ${item.availableStock} available — reduce quantity`}
                    </Text>
                  </View>
                )}

                {/* ── SECTION 1: 25% image | 75% info ───────────────────── */}
                <View className="p-4 flex-row gap-3">

                  {/* Left 25% — Product image */}
                  <View className="w-[25%] relative">
                    {item.images?.length > 0 ? (
                      <Image
                        source={{ uri: item.images[0] }}
                        className="w-full aspect-square rounded-2xl bg-gray-100"
                        resizeMode="cover"
                      />
                    ) : (
                      <View className="w-full aspect-square rounded-2xl bg-gray-100 items-center justify-center">
                        <Package size={28} color="#d1d5db" />
                      </View>
                    )}
                    {/* Discount badge */}
                    {item.discount && item.discount > 0 && (
                      <View className="absolute top-1 left-1 bg-gray-800 rounded-md px-1 py-0.5">
                        <Text className="text-white text-[9px] font-extrabold">-{item.discount}%</Text>
                      </View>
                    )}
                  </View>

                  {/* Right 75% — Name row + delete + Tags */}
                  <View className="flex-1">
                    {/* Name row + delete button */}
                    <View className="flex-row items-start justify-between mb-1.5">
                      <Text
                        className="flex-1 text-[15px] font-bold text-gray-900 leading-5 mr-2"
                        numberOfLines={2}
                      >
                        {item.name}
                      </Text>
                      <TouchableOpacity
                        onPress={() => removeItem(item.id)}
                        className="p-1 -mt-0.5"
                        activeOpacity={0.7}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Trash2 size={17} color="#374151" />
                      </TouchableOpacity>
                    </View>

                    {/* Tags row: category · material · rating */}
                    <View className="flex-row flex-wrap gap-1.5">
                      {item.category ? (
                        <View className="bg-gray-100 px-2 py-0.5 rounded-md">
                          <Text className="text-[11px] text-gray-700 font-semibold">{item.category}</Text>
                        </View>
                      ) : null}
                      {item.material ? (
                        <View className="bg-gray-100 px-2 py-0.5 rounded-md">
                          <Text className="text-[11px] text-gray-700 font-semibold">{item.material}</Text>
                        </View>
                      ) : null}
                      {item.rating !== undefined && (
                        <View className="flex-row items-center gap-0.5 bg-gray-100 px-1.5 py-0.5 rounded-md">
                          <Star size={10} color="#6b7280" fill="#6b7280" />
                          <Text className="text-[11px] text-gray-700 font-semibold">
                            {item.rating} ({item.reviews ?? 0})
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>

                {/* ── SECTION 2: Full-width Variant details ──────────────── */}
                {item.variantDetails && (
                  <View className="flex-row items-center gap-4 px-4 py-2.5 bg-gray-50 border-t border-gray-100">
                    {/* Color */}
                    <View className="flex-row items-center gap-1.5">
                      <Text className="text-[11px] text-gray-500 font-medium">Color:</Text>
                      <View className="flex-row items-center gap-1">
                        {item.variantDetails.colorHex && (
                          <View
                            className="w-3.5 h-3.5 rounded-full border border-gray-300"
                            style={{ backgroundColor: item.variantDetails.colorHex }}
                          />
                        )}
                        <Text className="text-[12px] font-semibold text-gray-800">
                          {item.variantDetails.color}
                        </Text>
                      </View>
                    </View>

                    {/* Divider */}
                    <View className="w-px h-3.5 bg-gray-300" />

                    {/* Size */}
                    <View className="flex-row items-center gap-1.5">
                      <Text className="text-[11px] text-gray-500 font-medium">Size:</Text>
                      <View className="bg-white border border-gray-200 rounded-lg px-2 py-0.5">
                        <Text className="text-[12px] font-bold text-gray-800">
                          {item.variantDetails.size}
                        </Text>
                      </View>
                    </View>

                    {/* SKU if available */}
                    {item.variantDetails.sku && (
                      <>
                        <View className="w-px h-3.5 bg-gray-300" />
                        <Text className="text-[10px] text-gray-400 font-medium">
                          SKU: {item.variantDetails.sku}
                        </Text>
                      </>
                    )}
                  </View>
                )}

                {/* ── Price + Qty stepper + Line total ───────────────────── */}
                <View className="px-4 pt-3 pb-4">
                  <View className="flex-row items-center justify-between">
                    {/* Price stack */}
                    <View>
                      <Text className="text-[17px] font-extrabold text-gray-900">
                        {fmt(item.price)}
                      </Text>
                      {item.originalPrice && item.originalPrice > item.price && (
                        <Text className="text-xs text-gray-400 line-through">
                          {fmt(item.originalPrice)}
                        </Text>
                      )}
                    </View>

                    {/* Qty stepper */}
                    <View className="flex-row items-center bg-gray-100 rounded-xl overflow-hidden">
                      <TouchableOpacity
                        onPress={() => updateQuantity(item.id, item.productId, item.quantity - 1)}
                        disabled={!item.inStock}
                        className="px-3 py-2"
                        activeOpacity={0.7}
                      >
                        <Minus size={15} color={item.inStock ? '#374151' : '#d1d5db'} />
                      </TouchableOpacity>
                      <View className="px-2.5">
                        <Text className="text-[15px] font-bold text-gray-900 min-w-[18px] text-center">
                          {item.quantity}
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => updateQuantity(item.id, item.productId, item.quantity + 1)}
                        disabled={!item.inStock}
                        className="px-3 py-2"
                        activeOpacity={0.7}
                      >
                        <Plus size={15} color={item.inStock ? '#374151' : '#d1d5db'} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Line total */}
                  <Text className="text-xs text-gray-500 mt-1.5 text-right">
                    Item total:{' '}
                    <Text className="font-bold text-gray-700">{fmt(item.price * item.quantity)}</Text>
                  </Text>
                </View>

              </View>
            );
          })}

          {/* ── Promo Code ────────────────────────────────────────────────── */}
          <View className="bg-white rounded-[20px] mt-4 p-4.5 shadow-sm p-4">
            {/* Section title */}
            <View className="flex-row items-center gap-2 mb-3.5">
              <View className="w-8 h-8 bg-gray-100 rounded-xl items-center justify-center">
                <Tag size={15} color="#374151" />
              </View>
              <Text className="text-[15px] font-bold text-gray-900">Promo Code</Text>
            </View>

            {appliedPromo ? (
              <View className="bg-gray-100 rounded-2xl p-3.5 border-[1.5px] border-gray-300 flex-row items-center justify-between">
                <View className="flex-row items-center gap-2.5 flex-1">
                  <CheckCircle size={20} color="#374151" />
                  <View>
                    <Text className="text-sm font-bold text-gray-800">"{appliedPromo}" applied!</Text>
                    <Text className="text-xs text-gray-600 mt-0.5">
                      You saved {fmt(discountAmount)} 🎉
                    </Text>
                  </View>
                </View>
                <TouchableOpacity onPress={removeCoupon} activeOpacity={0.7} className="p-1">
                  <Trash2 size={16} color="#374151" />
                </TouchableOpacity>
              </View>
            ) : (
              <View className="flex-row gap-2.5">
                <View className="flex-1 flex-row items-center bg-gray-50 border-[1.5px] border-gray-200 rounded-2xl px-3.5">
                  <TextInput
                    placeholder="Enter promo code"
                    value={promoCode}
                    onChangeText={setPromoCode}
                    autoCapitalize="characters"
                    className="flex-1 py-3 text-sm text-gray-900 tracking-wider"
                    placeholderTextColor="#9ca3af"
                    returnKeyType="done"
                    onSubmitEditing={applyPromoCode}
                  />
                </View>
                <TouchableOpacity
                  onPress={applyPromoCode}
                  disabled={applyingCoupon}
                  activeOpacity={0.85}
                  className={`rounded-2xl px-5 items-center justify-center min-w-[72px] ${applyingCoupon ? 'bg-gray-400' : 'bg-black'}`}
                >
                  {applyingCoupon
                    ? <ActivityIndicator size="small" color="#ffffff" />
                    : <Text className="text-white text-sm font-bold">Apply</Text>
                  }
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* ── Order Summary ─────────────────────────────────────────────── */}
          <View className="bg-white rounded-[20px] mt-3.5 overflow-hidden shadow-sm">
            {/* Summary header */}
            <View className="bg-black px-4.5 py-3.5 p-4">
              <Text className="text-white text-base font-extrabold">Order Summary</Text>
            </View>

            <View className="p-4">
              {/* Line items */}
              {[
                { label: 'Subtotal',  value: fmt(summary.subtotal),  special: false },
                { label: 'Shipping',  value: summary.shipping === 0 ? 'FREE' : fmt(summary.shipping), special: summary.shipping === 0 },
                { label: 'Tax (GST)', value: fmt(summary.tax),        special: false },
              ].map(({ label, value, special }) => (
                <View key={label} className="flex-row justify-between mb-3">
                  <Text className="text-sm text-gray-500">{label}</Text>
                  <Text className={`text-sm font-semibold ${special ? 'text-gray-900 font-extrabold' : 'text-gray-700'}`}>{value}</Text>
                </View>
              ))}

              {/* GST breakdown per product */}
              {cartItems.some(i => i.gstPercentage) && (
                <View className="bg-gray-50 rounded-xl p-2.5 mb-3">
                  {cartItems.map(i => {
                    if (!i.gstPercentage) return null;
                    const tax = i.price * i.quantity * (i.gstPercentage / 100);
                    return (
                      <View key={i.id} className="flex-row justify-between mb-1">
                        <Text className="text-[11px] text-gray-400 flex-1 mr-2" numberOfLines={1}>
                          {i.name} ({i.gstPercentage}%)
                        </Text>
                        <Text className="text-[11px] text-gray-400">{fmt(tax)}</Text>
                      </View>
                    );
                  })}
                </View>
              )}

              {/* Discount */}
              {summary.discount > 0 && (
                <View className="flex-row justify-between mb-3 bg-gray-100 p-2.5 rounded-xl border border-gray-200">
                  <View className="flex-row items-center gap-1.5">
                    <Tag size={13} color="#374151" />
                    <Text className="text-sm text-gray-700 font-semibold">Coupon Discount</Text>
                  </View>
                  <Text className="text-sm text-gray-900 font-bold">-{fmt(summary.discount)}</Text>
                </View>
              )}

              {/* Divider */}
              <View className="h-px bg-gray-100 mb-3.5" />

              {/* Grand total */}
              <View className="flex-row justify-between items-center mb-5">
                <Text className="text-base font-extrabold text-gray-900">Total</Text>
                <Text className="text-[22px] font-black text-black">{fmt(summary.total)}</Text>
              </View>

              {/* ── Checkout button ── */}
              {hasStockIssue ? (
                <View className="bg-gray-100 rounded-2xl py-4 flex-row items-center justify-center gap-2 mb-4">
                  <AlertCircle size={18} color="#9ca3af" />
                  <Text className="text-gray-400 font-bold text-sm">
                    Remove out-of-stock items to proceed
                  </Text>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={handleCheckout}
                  activeOpacity={0.88}
                  className="bg-black rounded-2xl py-4 flex-row items-center justify-center gap-2.5 mb-4"
                  style={{ shadowColor: '#000000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 6 }}
                >
                  <CreditCard size={20} color="#ffffff" />
                  <Text className="text-white text-base font-extrabold tracking-wide">
                    Proceed to Checkout
                  </Text>
                  <ArrowRight size={18} color="#ffffff" />
                </TouchableOpacity>
              )}

              {/* Trust badges */}
              <View className="gap-2.5">
                {[
                  { icon: Shield,    color: '#374151', label: 'SSL encrypted & secure checkout' },
                  { icon: Truck,     color: '#374151', label: 'Free shipping on orders over ₹999' },
                  { icon: RotateCcw, color: '#374151', label: '30-day hassle-free return policy' },
                ].map(({ icon: Icon, color, label }) => (
                  <View key={label} className="flex-row items-center gap-2.5">
                    <View className="w-7 h-7 rounded-lg items-center justify-center bg-gray-100">
                      <Icon size={14} color={color} />
                    </View>
                    <Text className="text-xs text-gray-500 flex-1">{label}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
