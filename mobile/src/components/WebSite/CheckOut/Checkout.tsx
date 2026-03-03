import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import {
  CreditCard,
  ArrowLeft,
  CheckCircle,
  Truck,
  Lock,
  Shield,
  Package,
  X,
} from 'lucide-react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WebView } from 'react-native-webview';
import ShippingForm from './CheckoutProcess/ShippingForm';
import PaymentForm from './CheckoutProcess/PaymentForm';
import ReviewOrder from './CheckoutProcess/ReviewOrder';
import { cartService, CartItem } from '@/services/cartService';
import orderService, { CreateOrderParams } from '@/services/orderService';
import paymentService from '@/services/paymentService';
import { paymentSettingsService, PublicPaymentSettings } from '@/services/paymentSettingsService';
import { userProfileService } from '@/services/userProfileService';
import { showSuccessToast, showErrorToast } from '@/lib/toast-utils';

export interface CheckoutFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  paymentMethod: 'razorpay' | 'payu';
  saveInfo: boolean;
  sameAsBilling: boolean;
  shippingMethod: string;
}

export default function Checkout() {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [paymentSettings, setPaymentSettings] = useState<PublicPaymentSettings | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentHtml, setPaymentHtml] = useState('');
  const [currentShippingAddress, setCurrentShippingAddress] = useState<any>(null);

  const [formData, setFormData] = useState<CheckoutFormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'United States',
    paymentMethod: 'razorpay',
    saveInfo: false,
    sameAsBilling: true,
    shippingMethod: 'standard',
  });

  const [discountAmount, setDiscountAmount] = useState(0);

  const [orderSummary, setOrderSummary] = useState({
    subtotal: 0,
    shipping: 0,
    tax: 0,
    discount: 0,
    total: 0,
  });

  useEffect(() => {
    fetchCart();
    fetchUserProfile();
    fetchPaymentSettings();
    loadSavedCoupon();
  }, []);

  useEffect(() => {
    calculateTotals();
  }, [cartItems, formData.shippingMethod, discountAmount]);

  const fetchCart = async () => {
    try {
      setLoading(true);
      console.log('Fetching cart...');
      const response = await cartService.getCart();
      console.log('Cart response:', response);
      
      if (response.success && response.data) {
        console.log('Cart items:', response.data.items);
        setCartItems(response.data.items);
      } else {
        console.warn('No cart data received');
      }
    } catch (err: any) {
      console.error('Cart fetch error:', err);
      setError('Failed to load cart items');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserProfile = async () => {
    try {
      const response = await userProfileService.getProfile();
      if (response.success && response.data) {
        const userData = response.data;

        // Split name into first and last name
        const nameParts = userData.name?.split(' ') || ['', ''];
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';

        // Pre-fill form with user data
        setFormData((prev) => ({
          ...prev,
          firstName,
          lastName,
          email: userData.email,
          phone: userData.phoneNumber || '',
          address: userData.address || '',
          city: userData.city || '',
          state: userData.state || '',
          zipCode: userData.zipCode || '',
          country: userData.country || 'United States',
        }));
      }
    } catch (err: any) {
      console.error('Failed to load user profile:', err);
      // Don't show error to user, just log it
    }
  };

  const fetchPaymentSettings = async () => {
    try {
      const response = await paymentSettingsService.getPublicPaymentSettings();
      if (response.success && response.data) {
        setPaymentSettings(response.data);

        // Set default payment method based on what's enabled
        if (response.data.razorpayEnabled) {
          setFormData((prev) => ({ ...prev, paymentMethod: 'razorpay' }));
        } else if (response.data.payuEnabled) {
          setFormData((prev) => ({ ...prev, paymentMethod: 'payu' }));
        } else {
          setError('No payment gateway is configured. Please contact support.');
        }
      }
    } catch (err: any) {
      console.error('Failed to load payment settings:', err);
      setError('Unable to load payment options. Please try again later.');
    }
  };

  const loadSavedCoupon = async () => {
    try {
      const savedCoupon = await AsyncStorage.getItem('appliedCoupon');
      if (savedCoupon) {
        const { discountAmount } = JSON.parse(savedCoupon);
        setDiscountAmount(discountAmount);
      }
    } catch (e) {
      console.error('Failed to parse coupon', e);
    }
  };

  const calculateTotals = () => {
    const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const shipping = 0;
    const tax = cartItems.reduce((sum, item) => {
      const itemSubtotal = item.price * item.quantity;
      const gstRate = item.product?.gstPercentage ? item.product.gstPercentage / 100 : 0;
      return sum + itemSubtotal * gstRate;
    }, 0);
    const total = Math.max(0, subtotal + shipping + tax - discountAmount);

    setOrderSummary({
      subtotal,
      shipping,
      tax,
      discount: discountAmount,
      total,
    });
  };

  const updateFormData = <K extends keyof CheckoutFormData>(
    field: K,
    value: CheckoutFormData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const validateShippingForm = (): boolean => {
    if (!formData.firstName?.trim()) {
      showErrorToast('Required Field', 'Please enter your first name');
      return false;
    }
    if (!formData.lastName?.trim()) {
      showErrorToast('Required Field', 'Please enter your last name');
      return false;
    }
    if (!formData.email?.trim()) {
      showErrorToast('Required Field', 'Please enter your email address');
      return false;
    }
    if (!formData.phone?.trim()) {
      showErrorToast('Required Field', 'Please enter your phone number');
      return false;
    }
    if (!formData.address?.trim()) {
      showErrorToast('Required Field', 'Please enter your address');
      return false;
    }
    if (!formData.city?.trim()) {
      showErrorToast('Required Field', 'Please enter your city');
      return false;
    }
    if (!formData.state?.trim()) {
      showErrorToast('Required Field', 'Please enter your state');
      return false;
    }
    if (!formData.zipCode?.trim()) {
      showErrorToast('Required Field', 'Please enter your ZIP code');
      return false;
    }
    return true;
  };

  const handleContinue = () => {
    if (currentStep === 1) {
      // Validate shipping form before moving to payment
      if (!validateShippingForm()) {
        return;
      }
    }
    
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    } else {
      handlePlaceOrder();
    }
  };

  const handlePlaceOrder = async () => {
    try {
      setPlacingOrder(true);
      setError(null);

      console.log('=== Starting Order Placement ===');
      console.log('Form data:', formData);
      console.log('Cart items:', cartItems);
      console.log('Order summary:', orderSummary);

      // Validate form (should already be validated, but double-check)
      if (!validateShippingForm()) {
        setPlacingOrder(false);
        return;
      }

      // Validate cart has items
      if (cartItems.length === 0) {
        const errorMsg = 'Your cart is empty';
        console.error('Cart validation error:', errorMsg);
        showErrorToast('Empty Cart', errorMsg);
        setPlacingOrder(false);
        return;
      }

      // Validate payment gateway is configured
      if (!paymentSettings?.razorpayEnabled && !paymentSettings?.payuEnabled) {
        const errorMsg = 'No payment gateway is configured. Please contact support.';
        console.error('Payment gateway error:', errorMsg);
        setError(errorMsg);
        showErrorToast('Configuration Error', errorMsg);
        setPlacingOrder(false);
        return;
      }

      const shippingAddress = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        street: formData.address,
        city: formData.city,
        state: formData.state,
        zipCode: formData.zipCode,
        country: formData.country,
      };

      console.log('Shipping address:', shippingAddress);
      console.log('Payment method:', formData.paymentMethod);

      // Handle Razorpay payment
      if (formData.paymentMethod === 'razorpay') {
        await handleRazorpayPayment(shippingAddress);
      } else if (formData.paymentMethod === 'payu') {
        await handlePayUPayment(shippingAddress);
      } else {
        const errorMsg = 'Invalid payment method selected';
        console.error('Payment method error:', errorMsg);
        setError(errorMsg);
        showErrorToast('Invalid Payment', errorMsg);
        setPlacingOrder(false);
      }
    } catch (err: any) {
      console.error('Order placement error:', err);
      const errorMsg = err.message || 'An error occurred while processing payment';
      setError(errorMsg);
      showErrorToast('Error', errorMsg);
      setPlacingOrder(false);
    }
  };

  const handleRazorpayPayment = async (shippingAddress: any) => {
    try {
      console.log('Starting Razorpay payment...');
      console.log('Order total:', orderSummary.total);
      
      // Store shipping address for later use
      setCurrentShippingAddress(shippingAddress);
      
      // Create Razorpay order
      const orderResponse = await paymentService.createRazorpayOrder(
        orderSummary.total,
        'INR'
      );

      console.log('Razorpay order response:', orderResponse);

      if (!orderResponse.success) {
        throw new Error('Failed to initialize payment');
      }

      const { orderId, amount, currency, keyId } = orderResponse.data;

      console.log('Razorpay order created:', { orderId, amount, currency, keyId });

      // Create HTML for Razorpay checkout in WebView
      const checkoutHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
          <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
          <style>
            body {
              margin: 0;
              padding: 20px;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              background: #f9fafb;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
            }
            .container {
              text-align: center;
              background: white;
              padding: 30px;
              border-radius: 12px;
              box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }
            .loading {
              color: #666;
              font-size: 16px;
            }
            .spinner {
              border: 3px solid #f3f3f3;
              border-top: 3px solid #222;
              border-radius: 50%;
              width: 40px;
              height: 40px;
              animation: spin 1s linear infinite;
              margin: 20px auto;
            }
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="spinner"></div>
            <div class="loading">Opening Razorpay Checkout...</div>
          </div>
          <script>
            try {
              var options = {
                "key": "${keyId}",
                "amount": ${amount},
                "currency": "${currency}",
                "name": "M2C Marketplace",
                "description": "Order Payment",
                "order_id": "${orderId}",
                "prefill": {
                  "name": "${formData.firstName} ${formData.lastName}",
                  "email": "${formData.email}",
                  "contact": "${formData.phone}"
                },
                "theme": {
                  "color": "#222222"
                },
                "handler": function (response) {
                  // Payment successful
                  window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'success',
                    data: response
                  }));
                },
                "modal": {
                  "ondismiss": function() {
                    // Payment cancelled
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                      type: 'cancelled'
                    }));
                  }
                }
              };
              
              var rzp = new Razorpay(options);
              
              rzp.on('payment.failed', function (response) {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'failed',
                  error: response.error
                }));
              });
              
              rzp.open();
            } catch (error) {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'error',
                message: error.message || 'Failed to open Razorpay'
              }));
            }
          </script>
        </body>
        </html>
      `;

      setPaymentHtml(checkoutHtml);
      setShowPaymentModal(true);
      
    } catch (error: any) {
      console.error('Razorpay payment error:', error);
      setPlacingOrder(false);
      const errorMsg = error.message || 'Failed to initialize payment';
      setError(errorMsg);
      showErrorToast('Payment Error', errorMsg);
      throw error;
    }
  };

  const handleWebViewMessage = async (event: any) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);
      console.log('WebView message:', message);

      setShowPaymentModal(false);

      if (message.type === 'success') {
        // Payment successful
        const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = message.data;
        
        try {
          // Verify payment with backend
          console.log('Verifying payment...');
          const verifyResponse = await paymentService.verifyRazorpayPayment(
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature
          );

          console.log('Verification response:', verifyResponse);

          if (verifyResponse.success) {
            // Create order after successful payment verification
            console.log('Creating order...');
            await createOrderAfterPayment(currentShippingAddress, razorpay_payment_id);
          } else {
            throw new Error('Payment verification failed');
          }
        } catch (error: any) {
          console.error('Payment verification error:', error);
          setError(error.message || 'Payment verification failed');
          showErrorToast('Verification Failed', error.message || 'Payment verification failed');
          setPlacingOrder(false);
        }
      } else if (message.type === 'cancelled') {
        setError('Payment cancelled by user');
        showErrorToast('Payment Cancelled', 'You cancelled the payment');
        setPlacingOrder(false);
      } else if (message.type === 'failed') {
        const errorMsg = message.error?.description || 'Payment failed';
        setError(errorMsg);
        showErrorToast('Payment Failed', errorMsg);
        setPlacingOrder(false);
      } else if (message.type === 'error') {
        setError(message.message || 'An error occurred');
        showErrorToast('Error', message.message || 'An error occurred');
        setPlacingOrder(false);
      }
    } catch (error: any) {
      console.error('Error handling WebView message:', error);
      setError('Failed to process payment response');
      showErrorToast('Error', 'Failed to process payment response');
      setPlacingOrder(false);
    }
  };

  const handlePayUPayment = async (shippingAddress: any) => {
    setError('PayU payment is not yet implemented');
    setPlacingOrder(false);
  };

  const createOrderAfterPayment = async (shippingAddress: any, paymentId: string) => {
    try {
      console.log('=== Creating Order After Payment ===');
      console.log('Shipping address:', shippingAddress);
      console.log('Payment ID:', paymentId);
      
      const orderParams: CreateOrderParams = {
        shippingAddress,
        paymentMethod: formData.paymentMethod,
        paymentId,
        shippingCost: orderSummary.shipping,
        tax: orderSummary.tax,
        discount: orderSummary.discount,
      };

      console.log('Order params:', orderParams);

      const response = await orderService.createOrder(orderParams);

      console.log('Order creation response:', response);

      if (response.success && response.data) {
        await AsyncStorage.removeItem('appliedCoupon');
        showSuccessToast('Order Placed!', 'Your order has been placed successfully');
        console.log('Navigating to order:', response.data.id);
        router.push(`/(tabs)/orders/${response.data.id}`);
      } else {
        await AsyncStorage.removeItem('appliedCoupon');
        showSuccessToast('Order Placed!', 'Your order has been placed successfully');
        console.log('Navigating to orders list');
        router.push('/(tabs)/orders');
      }
    } catch (error: any) {
      console.error('Order creation error:', error);
      throw new Error(error.message || 'Failed to create order');
    } finally {
      setPlacingOrder(false);
    }
  };

  const steps = [
    { id: 1, name: 'Shipping', icon: Truck },
    { id: 2, name: 'Payment', icon: CreditCard },
    { id: 3, name: 'Review', icon: CheckCircle },
  ];

  const renderStepIndicator = () => (
    <View className="bg-white px-4 py-4 rounded-xl shadow-sm border border-gray-200 mb-6">
      <View className="flex-row items-center justify-between">
        {steps.map((step, index) => (
          <View key={step.id} className="flex-row items-center flex-1">
            <View
              className={`w-10 h-10 rounded-full border-2 items-center justify-center ${
                currentStep >= step.id
                  ? 'bg-gray-800 border-gray-800'
                  : 'border-gray-300 bg-white'
              }`}
            >
              {currentStep > step.id ? (
                <CheckCircle size={20} color="#ffffff" />
              ) : (
                <step.icon size={20} color={currentStep >= step.id ? '#ffffff' : '#9ca3af'} />
              )}
            </View>
            <Text
              className={`ml-2 text-xs font-bold ${
                currentStep >= step.id ? 'text-gray-800' : 'text-gray-400'
              }`}
            >
              {step.name}
            </Text>
            {index < steps.length - 1 && (
              <View
                className={`flex-1 h-0.5 mx-2 ${
                  currentStep > step.id ? 'bg-gray-800' : 'bg-gray-300'
                }`}
              />
            )}
          </View>
        ))}
      </View>
    </View>
  );

  if (loading) {
    return (
      <View className="flex-1 bg-gray-50 items-center justify-center">
        <ActivityIndicator size="large" color="#000000" />
        <Text className="text-gray-600 mt-4">Loading checkout...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-gray-50"
    >
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 20 }}>
        <View className="p-4">
          {/* Header */}
          <TouchableOpacity
            onPress={() => router.back()}
            className="flex-row items-center mb-4"
          >
            <ArrowLeft size={20} color="#6b7280" />
            <Text className="text-gray-600 ml-2">Back to Cart</Text>
          </TouchableOpacity>

          <Text className="text-3xl font-bold text-gray-900 mb-2">Checkout</Text>
          <Text className="text-gray-600 mb-6">Complete your purchase securely</Text>

          {renderStepIndicator()}

          {/* Checkout Form */}
          <View className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mb-4">
            <View className="px-6 py-4 border-b border-gray-200 bg-gray-800">
              <Text className="text-xl font-bold text-white">
                {currentStep === 1 && 'Shipping Information'}
                {currentStep === 2 && 'Payment Information'}
                {currentStep === 3 && 'Review Your Order'}
              </Text>
            </View>

            <View className="p-6">
              {error && (
                <View className="mb-4 p-4 bg-red-50 rounded-xl border border-red-200">
                  <Text className="text-sm text-red-600">{error}</Text>
                </View>
              )}

              {currentStep === 1 && (
                <ShippingForm formData={formData} updateFormData={updateFormData} />
              )}
              {currentStep === 2 && (
                <PaymentForm
                  formData={formData}
                  updateFormData={updateFormData}
                  paymentSettings={paymentSettings}
                />
              )}
              {currentStep === 3 && <ReviewOrder formData={formData} />}

              {/* Navigation Buttons */}
              <View className="flex-row justify-between mt-8 pt-6 border-t border-gray-200">
                <TouchableOpacity
                  onPress={() => setCurrentStep(Math.max(1, currentStep - 1))}
                  disabled={currentStep === 1 || placingOrder}
                  className="px-6 py-3 border border-gray-300 rounded-xl"
                  style={{ opacity: currentStep === 1 || placingOrder ? 0.5 : 1 }}
                >
                  <Text className="text-gray-700 font-bold">Previous</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleContinue}
                  disabled={placingOrder}
                  className="px-8 py-3 bg-gray-800 rounded-xl flex-row items-center"
                  style={{ opacity: placingOrder ? 0.7 : 1 }}
                >
                  {placingOrder && <ActivityIndicator size="small" color="#ffffff" />}
                  <Text className="text-white font-bold ml-2">
                    {currentStep === 3
                      ? placingOrder
                        ? 'Placing Order...'
                        : 'Place Order'
                      : 'Continue'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Order Summary */}
          <View className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <View className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <Text className="text-xl font-bold text-gray-900">Order Summary</Text>
            </View>

            <View className="p-6">
              {/* Cart Items Preview */}
              <View className="mb-6 space-y-3 gap-3">
                {cartItems.map((item) => (
                  <View key={item.id} className="flex-row gap-3">
                    <View className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden">
                      {item.product?.images?.[0]?.url ? (
                        <Image
                          source={{ uri: item.product.images[0].url }}
                          className="w-full h-full"
                          resizeMode="cover"
                        />
                      ) : (
                        <View className="w-full h-full items-center justify-center">
                          <Package size={20} color="#9ca3af" />
                        </View>
                      )}
                    </View>
                    <View className="flex-1">
                      <Text className="font-bold text-gray-900" numberOfLines={1}>
                        {item.product?.name || 'Product'}
                      </Text>
                      <Text className="text-sm text-gray-500">Qty: {item.quantity}</Text>
                    </View>
                    <Text className="font-bold text-gray-900">
                      ${(item.price * item.quantity).toFixed(2)}
                    </Text>
                  </View>
                ))}
              </View>

              <View className="space-y-4 gap-4 mb-6 border-t border-gray-200 pt-4">
                <View className="flex-row justify-between">
                  <Text className="text-gray-600">Subtotal</Text>
                  <Text className="font-bold">${orderSummary.subtotal.toFixed(2)}</Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-gray-600">Shipping</Text>
                  <Text className="font-bold">
                    {orderSummary.shipping === 0 ? 'Free' : `$${orderSummary.shipping.toFixed(2)}`}
                  </Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-gray-600">Tax (GST)</Text>
                  <Text className="font-bold">${orderSummary.tax.toFixed(2)}</Text>
                </View>
                {orderSummary.discount > 0 && (
                  <View className="flex-row justify-between">
                    <Text className="text-green-600">Discount</Text>
                    <Text className="font-bold text-green-600">
                      -${orderSummary.discount.toFixed(2)}
                    </Text>
                  </View>
                )}
                <View className="border-t border-gray-200 pt-4">
                  <View className="flex-row justify-between">
                    <Text className="text-lg font-bold">Total</Text>
                    <Text className="text-lg font-bold">${orderSummary.total.toFixed(2)}</Text>
                  </View>
                </View>
              </View>

              {/* Security Badges */}
              <View className="space-y-3 gap-3 pt-4 border-t border-gray-200">
                <View className="flex-row items-center">
                  <Lock size={16} color="#16a34a" />
                  <Text className="text-sm text-gray-600 ml-3">SSL Encrypted Checkout</Text>
                </View>
                <View className="flex-row items-center">
                  <Shield size={16} color="#2563eb" />
                  <Text className="text-sm text-gray-600 ml-3">Money Back Guarantee</Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Payment Modal with WebView */}
      <Modal
        visible={showPaymentModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          setShowPaymentModal(false);
          setPlacingOrder(false);
        }}
      >
        <View className="flex-1 bg-white">
          <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
            <Text className="text-lg font-bold">Complete Payment</Text>
            <TouchableOpacity
              onPress={() => {
                setShowPaymentModal(false);
                setPlacingOrder(false);
                showErrorToast('Payment Cancelled', 'You cancelled the payment');
              }}
              className="p-2"
            >
              <X size={24} color="#666" />
            </TouchableOpacity>
          </View>
          <WebView
            source={{ html: paymentHtml }}
            onMessage={handleWebViewMessage}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            startInLoadingState={true}
            renderLoading={() => (
              <View className="flex-1 items-center justify-center">
                <ActivityIndicator size="large" color="#000000" />
                <Text className="text-gray-600 mt-4">Loading payment gateway...</Text>
              </View>
            )}
          />
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}
