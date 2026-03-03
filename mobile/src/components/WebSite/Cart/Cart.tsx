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
} from 'react-native';
import {
  ShoppingCart,
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
} from 'lucide-react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { cartService } from '@/services/cartService';
import { couponService } from '@/services/couponService';
import { publicProductService } from '@/services/publicProductService';
import { userAuthService } from '@/services/userAuthService';
import { showSuccessToast, showErrorToast } from '@/lib/toast-utils';

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
  material?: string;
  discount?: number;
  gstPercentage?: number;
}

interface OrderSummary {
  subtotal: number;
  shipping: number;
  tax: number;
  discount: number;
  total: number;
}

export default function Cart() {
  const [cartItems, setCartItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState('');
  const [discountAmount, setDiscountAmount] = useState(0);

  useEffect(() => {
    fetchCart();
    loadSavedCoupon();
  }, []);

  const loadSavedCoupon = async () => {
    try {
      const savedCoupon = await AsyncStorage.getItem('appliedCoupon');
      if (savedCoupon) {
        const { code, discountAmount } = JSON.parse(savedCoupon);
        setAppliedPromo(code);
        setDiscountAmount(discountAmount);
      }
    } catch (e) {
      await AsyncStorage.removeItem('appliedCoupon');
    }
  };

  const fetchCart = async () => {
    try {
      setLoading(true);
      const authenticated = await userAuthService.isAuthenticated();
      setIsAuthenticated(authenticated);

      if (!authenticated) {
        // Fetch from local storage for guest users
        const localCart = await cartService.getLocalCart();
        const itemsPromises = localCart.map(async (item: any) => {
          try {
            const productRes = await publicProductService.getProduct(item.productId);
            if (productRes.success && productRes.data) {
              const product = productRes.data;
              return {
                id: item.id,
                productId: item.productId,
                name: product.name,
                price: product.adminFixedPrice || product.basePrice,
                originalPrice: product.originalPrice,
                images: product.images.map((img: any) => img.url),
                category: product.category,
                rating: product.rating,
                reviews: product.reviews,
                inStock: product.inStock,
                quantity: item.quantity,
                description: product.description,
                material: product.material,
                discount: product.discount,
                gstPercentage: product.gstPercentage,
              };
            }
          } catch (err) {
            console.error(`Failed to fetch product ${item.productId}`, err);
          }
          return null;
        });

        const resolvedItems = await Promise.all(itemsPromises);
        const items = resolvedItems.filter((item: any) => item !== null) as OrderItem[];
        setCartItems(items);
      } else {
        // Fetch from backend for authenticated users
        const response = await cartService.getCart();
        if (response.success && response.data) {
          const items = response.data.items.map((item: any) => ({
            id: item.id,
            productId: item.productId,
            name: item.product?.name || 'Unknown Product',
            price: item.price,
            originalPrice: item.product?.originalPrice,
            images: item.product?.images?.map((img: any) => img.url) || [],
            category: item.product?.category || '',
            rating: item.product?.rating,
            reviews: item.product?.reviews,
            inStock: item.product?.inStock ?? true,
            quantity: item.quantity,
            description: item.product?.description,
            material: item.product?.material,
            discount: item.product?.discount,
            gstPercentage: item.product?.gstPercentage,
          }));
          setCartItems(items);
        }
      }
    } catch (error) {
      console.error('Failed to fetch cart:', error);
      showErrorToast('Error', 'Failed to load cart items');
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = async (id: string, productId: string, newQuantity: number) => {
    if (newQuantity < 1) {
      removeItem(id, productId);
      return;
    }

    try {
      if (!isAuthenticated) {
        cartService.updateLocalCartItem(productId, newQuantity);
        setCartItems((items) =>
          items.map((item) =>
            item.productId === productId ? { ...item, quantity: newQuantity } : item
          )
        );
        showSuccessToast('Updated', 'Cart item quantity updated');
        return;
      }

      await cartService.updateCartItem(id, newQuantity);
      setCartItems((items) =>
        items.map((item) => (item.id === id ? { ...item, quantity: newQuantity } : item))
      );
      showSuccessToast('Updated', 'Cart item quantity updated');
    } catch (error) {
      console.error('Failed to update quantity:', error);
      showErrorToast('Error', 'Failed to update quantity');
    }
  };

  const removeItem = async (id: string, productId: string) => {
    Alert.alert('Remove Item', 'Are you sure you want to remove this item?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            if (!isAuthenticated) {
              cartService.removeFromLocalCart(productId);
              setCartItems((items) => items.filter((item) => item.productId !== productId));
              showSuccessToast('Removed', 'Item removed from cart');
              return;
            }

            await cartService.removeFromCart(id);
            setCartItems((items) => items.filter((item) => item.id !== id));
            showSuccessToast('Removed', 'Item removed from cart');
          } catch (error) {
            console.error('Failed to remove item:', error);
            showErrorToast('Error', 'Failed to remove item');
          }
        },
      },
    ]);
  };

  const applyPromoCode = async () => {
    if (!promoCode.trim()) {
      showErrorToast('Error', 'Please enter a promo code');
      return;
    }

    try {
      const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const response = await couponService.applyCoupon(promoCode, subtotal);

      if (response.success && response.data) {
        setAppliedPromo(response.data.code);
        setDiscountAmount(response.data.discountAmount);
        setPromoCode('');
        showSuccessToast(
          'Success',
          `Coupon "${response.data.code}" applied! You saved $${response.data.discountAmount.toFixed(2)}`
        );

        await AsyncStorage.setItem(
          'appliedCoupon',
          JSON.stringify({
            code: response.data.code,
            discountAmount: response.data.discountAmount,
          })
        );
      } else {
        throw new Error(response.message || 'Invalid coupon');
      }
    } catch (error: any) {
      console.error('Coupon error:', error);
      setAppliedPromo('');
      setDiscountAmount(0);
      await AsyncStorage.removeItem('appliedCoupon');
      showErrorToast('Error', error.message || 'Failed to apply coupon');
    }
  };

  const removeCoupon = async () => {
    setAppliedPromo('');
    setDiscountAmount(0);
    await AsyncStorage.removeItem('appliedCoupon');
    showSuccessToast('Removed', 'Coupon removed');
  };

  const calculateSummary = (): OrderSummary => {
    const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const shipping = 0;
    const discount = discountAmount;

    const tax = cartItems.reduce((sum, item) => {
      const itemSubtotal = item.price * item.quantity;
      const gstRate = item.gstPercentage ? item.gstPercentage / 100 : 0;
      return sum + itemSubtotal * gstRate;
    }, 0);

    const total = subtotal + shipping + tax - discount;

    return { subtotal, shipping, tax, discount, total: total > 0 ? total : 0 };
  };

  const handleCheckout = () => {
    if (!isAuthenticated) {
      Alert.alert('Login Required', 'Please login to proceed with checkout', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Login', onPress: () => router.push('/(auth)/Login') },
      ]);
      return;
    }

    if (cartItems.length === 0) {
      showErrorToast('Empty Cart', 'Please add items to your cart');
      return;
    }

    // Navigate to checkout
    router.push('/(any)/checkout');
  };

  if (loading) {
    return (
      <View className="flex-1 bg-gray-50 items-center justify-center">
        <ActivityIndicator size="large" color="#000000" />
        <Text className="text-gray-600 mt-4">Loading cart...</Text>
      </View>
    );
  }

  const summary = calculateSummary();

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white px-4 py-6 border-b border-gray-200">
        <Text className="text-2xl font-bold text-gray-900">Shopping Cart</Text>
        <Text className="text-gray-600 mt-1">Review your items and proceed to checkout</Text>
      </View>

      {cartItems.length === 0 ? (
        <View className="flex-1 items-center justify-center p-6">
          <ShoppingCart size={64} color="#d1d5db" />
          <Text className="text-2xl font-bold text-gray-900 mt-4 mb-2">Your cart is empty</Text>
          <Text className="text-gray-600 text-center mb-6">
            Add some items to get started
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)')}
            className="bg-black rounded-xl px-8 py-4"
          >
            <Text className="text-white font-bold text-lg">Continue Shopping</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 20 }}>
          {/* Cart Items */}
          <View className="p-4">
            <View className="bg-white rounded-2xl border border-gray-200 overflow-hidden mb-4">
              <View className="px-4 py-3 bg-[#222222] flex-row items-center justify-between">
                <Text className="text-lg font-bold text-white">Cart Items</Text>
                <View className="bg-white px-3 py-1 rounded-full">
                  <Text className="text-[#313131] text-sm font-medium">
                    {cartItems.length} items
                  </Text>
                </View>
              </View>

              {cartItems.map((item, index) => (
                <View
                  key={item.id}
                  className={`p-4 ${index < cartItems.length - 1 ? 'border-b border-gray-200' : ''}`}
                >
                  <View className="flex-row">
                    {/* Product Image */}
                    <View className="shrink-0">
                      {item.images && item.images.length > 0 ? (
                        <Image
                          source={{ uri: item.images[0] }}
                          className="w-24 h-24 rounded-xl border border-gray-200"
                          resizeMode="cover"
                        />
                      ) : (
                        <View className="w-24 h-24 items-center justify-center bg-gray-100 rounded-xl border border-gray-200">
                          <Package size={32} color="#9ca3af" />
                        </View>
                      )}
                    </View>

                    {/* Product Details */}
                    <View className="flex-1 ml-4">
                      <View className="flex-row justify-between items-start mb-2">
                        <View className="flex-1 mr-2">
                          <Text className="text-base font-bold text-gray-900 mb-1">
                            {item.name}
                          </Text>
                          {item.description && (
                            <Text className="text-xs text-gray-600 mb-2" numberOfLines={2}>
                              {item.description}
                            </Text>
                          )}
                          <View className="flex-row flex-wrap gap-2 mb-2">
                            <View className="bg-blue-100 px-2 py-1 rounded-full">
                              <Text className="text-xs text-blue-700">{item.category}</Text>
                            </View>
                            {item.rating !== undefined && (
                              <View className="flex-row items-center gap-1">
                                <Star size={12} color="#fbbf24" fill="#fbbf24" />
                                <Text className="text-xs text-gray-600">{item.rating}</Text>
                                <Text className="text-xs text-gray-500">
                                  ({item.reviews || 0})
                                </Text>
                              </View>
                            )}
                          </View>
                          <View className="flex-row flex-wrap gap-2">
                            {item.material && (
                              <View className="bg-green-100 px-2 py-1 rounded-full">
                                <Text className="text-xs text-green-700">{item.material}</Text>
                              </View>
                            )}
                            {item.discount && (
                              <View className="bg-gray-100 px-2 py-1 rounded-full">
                                <Text className="text-xs text-gray-700 font-semibold">
                                  Save {item.discount}%
                                </Text>
                              </View>
                            )}
                          </View>
                        </View>
                        <TouchableOpacity
                          onPress={() => removeItem(item.id, item.productId)}
                          className="p-2"
                        >
                          <Trash2 size={18} color="#9ca3af" />
                        </TouchableOpacity>
                      </View>

                      {/* Price and Quantity */}
                      <View className="flex-row items-center justify-between mt-3">
                        <View className="flex-row items-center gap-2">
                          <Text className="text-lg font-bold text-gray-900">
                            ${item.price.toFixed(2)}
                          </Text>
                          {item.originalPrice && (
                            <Text className="text-sm text-gray-500 line-through">
                              ${item.originalPrice.toFixed(2)}
                            </Text>
                          )}
                        </View>

                        <View className="flex-row items-center border border-gray-300 rounded-lg">
                          <TouchableOpacity
                            onPress={() =>
                              updateQuantity(item.id, item.productId, item.quantity - 1)
                            }
                            disabled={!item.inStock}
                            className="p-2"
                          >
                            <Minus size={16} color={item.inStock ? '#374151' : '#d1d5db'} />
                          </TouchableOpacity>
                          <Text className="px-3 py-2 font-medium text-gray-900">
                            {item.quantity}
                          </Text>
                          <TouchableOpacity
                            onPress={() =>
                              updateQuantity(item.id, item.productId, item.quantity + 1)
                            }
                            disabled={!item.inStock}
                            className="p-2"
                          >
                            <Plus size={16} color={item.inStock ? '#374151' : '#d1d5db'} />
                          </TouchableOpacity>
                        </View>
                      </View>

                      {!item.inStock && (
                        <Text className="text-xs text-red-600 font-medium mt-2">
                          Out of Stock
                        </Text>
                      )}
                    </View>
                  </View>
                </View>
              ))}
            </View>

            {/* Promo Code */}
            <View className="bg-white rounded-2xl border border-gray-200 p-4 mb-4">
              <Text className="text-base font-bold text-gray-900 mb-3">Promo Code</Text>
              <View className="flex-row gap-2">
                <TextInput
                  placeholder="Enter promo code"
                  value={promoCode}
                  onChangeText={setPromoCode}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-xl bg-white"
                />
                <TouchableOpacity
                  onPress={applyPromoCode}
                  className="px-6 py-3 bg-[#222222] rounded-xl items-center justify-center"
                >
                  <Text className="text-white font-medium">Apply</Text>
                </TouchableOpacity>
              </View>
              {appliedPromo && (
                <View className="mt-3 flex-row items-center justify-between bg-green-50 p-3 rounded-lg border border-green-100">
                  <View className="flex-row items-center gap-2 flex-1">
                    <CheckCircle size={18} color="#16a34a" />
                    <View className="flex-1">
                      <Text className="text-sm font-medium text-green-600">
                        Code "{appliedPromo}" applied!
                      </Text>
                      <Text className="text-xs text-green-700">
                        You saved ${discountAmount.toFixed(2)}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity onPress={removeCoupon} className="p-1">
                    <Trash2 size={16} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Order Summary */}
            <View className="bg-white rounded-2xl border border-gray-200 overflow-hidden mb-4">
              <View className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                <Text className="text-lg font-bold text-gray-900">Order Summary</Text>
              </View>

              <View className="p-4">
                <View className="space-y-3 mb-4">
                  <View className="flex-row justify-between mb-2">
                    <Text className="text-gray-600">Subtotal</Text>
                    <Text className="font-medium text-gray-900">
                      ${summary.subtotal.toFixed(2)}
                    </Text>
                  </View>
                  <View className="flex-row justify-between mb-2">
                    <Text className="text-gray-600">Shipping</Text>
                    <Text className="font-medium text-gray-900">
                      {summary.shipping === 0 ? 'Free' : `$${summary.shipping.toFixed(2)}`}
                    </Text>
                  </View>
                  <View className="flex-row justify-between mb-2">
                    <Text className="text-gray-600">Tax (GST)</Text>
                    <Text className="font-medium text-gray-900">${summary.tax.toFixed(2)}</Text>
                  </View>
                  {summary.discount > 0 && (
                    <View className="flex-row justify-between mb-2">
                      <Text className="text-green-600">Discount</Text>
                      <Text className="font-medium text-green-600">
                        -${summary.discount.toFixed(2)}
                      </Text>
                    </View>
                  )}
                  <View className="flex-row justify-between border-t border-gray-200 pt-3">
                    <Text className="text-lg font-bold text-gray-900">Total</Text>
                    <Text className="text-lg font-bold text-gray-900">
                      ${summary.total.toFixed(2)}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  onPress={handleCheckout}
                  className="bg-[#313131] rounded-xl py-4 flex-row items-center justify-center mb-4"
                >
                  <CreditCard size={20} color="#ffffff" />
                  <Text className="text-white font-bold text-base ml-2">
                    Proceed to Checkout
                  </Text>
                  <ArrowRight size={16} color="#ffffff" className="ml-1" />
                </TouchableOpacity>

                {/* Trust Badges */}
                <View className="space-y-3 pt-4 border-t border-gray-200">
                  <View className="flex-row items-center gap-3">
                    <Shield size={18} color="#16a34a" />
                    <Text className="text-sm text-gray-600 flex-1">
                      Secure checkout with SSL encryption
                    </Text>
                  </View>
                  <View className="flex-row items-center gap-3">
                    <Truck size={18} color="#2563eb" />
                    <Text className="text-sm text-gray-600 flex-1">
                      Free shipping on orders over $100
                    </Text>
                  </View>
                  <View className="flex-row items-center gap-3">
                    <Package size={18} color="#9333ea" />
                    <Text className="text-sm text-gray-600 flex-1">30-day return policy</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      )}
    </View>
  );
}
