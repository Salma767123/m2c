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

      // Check for out of stock items — matching web checkout exactly
      const hasOutOfStock = cartItems.some(
        (item) =>
          item.product?.inStock === false ||
          (item.product?.availableStock !== undefined && item.quantity > item.product?.availableStock)
      );
      if (hasOutOfStock) {
        const errorMsg = 'Some items in your cart are out of stock or exceed available quantity. Please return to the cart to remove them.';
        setError(errorMsg);
        showErrorToast('Stock Issue', errorMsg);
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
    <View
      style={{
        backgroundColor: '#ffffff',
        borderRadius: 20,
        paddingHorizontal: 20,
        paddingVertical: 18,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 3,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        {steps.map((step, index) => {
          const isActive = currentStep === step.id;
          const isCompleted = currentStep > step.id;
          const isLast = index === steps.length - 1;

          return (
            <React.Fragment key={step.id}>
              <View style={{ alignItems: 'center', flex: 1 }}>
                {/* Step circle */}
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    backgroundColor: isCompleted ? '#16a34a' : isActive ? '#1a1a2e' : '#f3f4f6',
                    borderWidth: isActive && !isCompleted ? 2 : 0,
                    borderColor: '#1a1a2e',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 8,
                    shadowColor: isActive || isCompleted ? '#000' : 'transparent',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.15,
                    shadowRadius: 6,
                    elevation: isActive || isCompleted ? 4 : 0,
                  }}
                >
                  {isCompleted ? (
                    <CheckCircle size={24} color="#ffffff" />
                  ) : (
                    <step.icon size={22} color={isActive ? '#ffffff' : '#9ca3af'} />
                  )}
                </View>

                {/* Step label */}
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: isActive || isCompleted ? '700' : '600',
                    color: isActive || isCompleted ? '#111827' : '#9ca3af',
                    textAlign: 'center',
                  }}
                >
                  {step.name}
                </Text>
              </View>

              {/* Connector line */}
              {!isLast && (
                <View
                  style={{
                    height: 2,
                    flex: 0.5,
                    backgroundColor: isCompleted ? '#16a34a' : '#e5e7eb',
                    marginBottom: 32,
                    marginHorizontal: 4,
                  }}
                />
              )}
            </React.Fragment>
          );
        })}
      </View>
    </View>
  );

  if (loading) {
    return (
      <View className="flex-1 bg-slate-50 items-center justify-center p-8">
        <View className="w-20 h-20 rounded-full bg-white items-center justify-center mb-5 shadow-xl">
          <ActivityIndicator size="large" color="#1a1a2e" />
        </View>
        <Text className="text-[18px] font-bold text-gray-900 mb-1.5">Loading Checkout</Text>
        <Text className="text-sm text-gray-500 text-center">Preparing your order details...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-slate-50"
    >
      {/* Header */}
      <View
        className={`bg-[#1a1a2e] ${Platform.OS === 'ios' ? 'pt-[50px]' : 'pt-5'} pb-5 px-5 shadow-xl`}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          className="flex-row items-center mb-4"
          activeOpacity={0.7}
        >
          <View className="w-8 h-8 rounded-full bg-white/15 items-center justify-center mr-2.5">
            <ArrowLeft size={18} color="#ffffff" />
          </View>
          <Text className="text-gray-300 text-sm font-semibold">
            Back to Cart
          </Text>
        </TouchableOpacity>

        <Text className="text-[28px] font-extrabold text-white mb-1.5 tracking-tight">
          Secure Checkout
        </Text>
        <Text className="text-sm text-gray-400 leading-5">
          Complete your purchase securely with encrypted payment
        </Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {renderStepIndicator()}

        {/* Main Checkout Card */}
        <View
          className="bg-white rounded-[24px] overflow-hidden mb-4 shadow-md"
        >
          {/* Card Header */}
          <View className="bg-[#1a1a2e] px-6 py-4.5 flex-row items-center justify-between">
            <View className="flex-row items-center gap-3">
              <View className="w-10 h-10 rounded-xl bg-white/15 items-center justify-center">
                {currentStep === 1 && <Truck size={20} color="#f59e0b" />}
                {currentStep === 2 && <CreditCard size={20} color="#f59e0b" />}
                {currentStep === 3 && <CheckCircle size={20} color="#f59e0b" />}
              </View>
              <View>
                <Text style={{ fontSize: 18, fontWeight: '800', color: '#ffffff' }}>
                  {currentStep === 1 && 'Shipping Information'}
                  {currentStep === 2 && 'Payment Method'}
                  {currentStep === 3 && 'Review Your Order'}
                </Text>
                <Text style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>
                  Step {currentStep} of {steps.length}
                </Text>
              </View>
            </View>
          </View>

          {/* Card Content */}
          <View style={{ padding: 24 }}>
            {error && (
              <View
                style={{
                  marginBottom: 20,
                  padding: 16,
                  backgroundColor: '#fef2f2',
                  borderRadius: 16,
                  borderWidth: 1.5,
                  borderColor: '#fecaca',
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  gap: 12,
                }}
              >
                <View
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    backgroundColor: '#fee2e2',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ color: '#dc2626', fontSize: 16, fontWeight: '700' }}>!</Text>
                </View>
                <Text style={{ flex: 1, fontSize: 13, color: '#dc2626', lineHeight: 20, fontWeight: '600' }}>
                  {error}
                </Text>
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
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                marginTop: 28,
                paddingTop: 24,
                borderTopWidth: 1,
                borderTopColor: '#f1f5f9',
                gap: 12,
              }}
            >
              <TouchableOpacity
                onPress={() => setCurrentStep(Math.max(1, currentStep - 1))}
                disabled={currentStep === 1 || placingOrder}
                style={{
                  flex: 1,
                  paddingVertical: 16,
                  paddingHorizontal: 20,
                  borderRadius: 16,
                  borderWidth: 2,
                  borderColor: currentStep === 1 || placingOrder ? '#e5e7eb' : '#1a1a2e',
                  backgroundColor: '#ffffff',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: currentStep === 1 || placingOrder ? 0.4 : 1,
                }}
                activeOpacity={0.7}
              >
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: '700',
                    color: currentStep === 1 || placingOrder ? '#9ca3af' : '#1a1a2e',
                  }}
                >
                  Previous
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleContinue}
                disabled={placingOrder}
                style={{
                  flex: 1.5,
                  paddingVertical: 16,
                  paddingHorizontal: 20,
                  borderRadius: 16,
                  backgroundColor: placingOrder ? '#9ca3af' : '#1a1a2e',
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  shadowColor: '#1a1a2e',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: placingOrder ? 0 : 0.3,
                  shadowRadius: 12,
                  elevation: placingOrder ? 0 : 6,
                }}
                activeOpacity={0.85}
              >
                {placingOrder && <ActivityIndicator size="small" color="#ffffff" />}
                <Text style={{ fontSize: 15, fontWeight: '800', color: '#ffffff', letterSpacing: 0.3 }}>
                  {currentStep === 3
                    ? placingOrder
                      ? 'Processing...'
                      : 'Place Order'
                    : 'Continue'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* ── Order Summary ─────────────────────────────────────────────── */}
        <View
          style={{
            backgroundColor: '#ffffff',
            borderRadius: 24,
            overflow: 'hidden',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.08,
            shadowRadius: 16,
            elevation: 6,
            marginBottom: 16,
          }}
        >
          {/* Header with gradient effect */}
          <View
            style={{
              backgroundColor: '#1a1a2e',
              paddingHorizontal: 24,
              paddingVertical: 18,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  backgroundColor: 'rgba(245,158,11,0.2)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Package size={18} color="#f59e0b" />
              </View>
              <Text style={{ color: '#ffffff', fontSize: 18, fontWeight: '800' }}>
                Order Summary
              </Text>
            </View>
            <View
              style={{
                backgroundColor: 'rgba(255,255,255,0.15)',
                borderRadius: 16,
                paddingHorizontal: 12,
                paddingVertical: 5,
              }}
            >
              <Text style={{ color: '#f3f4f6', fontSize: 12, fontWeight: '700' }}>
                {cartItems.length} item{cartItems.length !== 1 ? 's' : ''}
              </Text>
            </View>
          </View>

          <View style={{ padding: 24 }}>
            {/* ── Cart Items Preview ─────────────────────────────────────── */}
            <View style={{ marginBottom: 20 }}>
              {cartItems.map((item, idx) => {
                const hasVariantImg =
                  (item.variant as any)?.images && (item.variant as any).images.length > 0;
                const displayImg = hasVariantImg
                  ? (item.variant as any).images[0]
                  : item.product?.images?.[0]?.url;

                const isLastItem = idx === cartItems.length - 1;

                return (
                  <View
                    key={item.id}
                    style={{
                      flexDirection: 'row',
                      gap: 14,
                      paddingBottom: 16,
                      marginBottom: isLastItem ? 0 : 16,
                      borderBottomWidth: isLastItem ? 0 : 1,
                      borderBottomColor: '#f1f5f9',
                    }}
                  >
                    {/* Product image */}
                    <View
                      style={{
                        width: 70,
                        height: 70,
                        borderRadius: 16,
                        backgroundColor: '#f9fafb',
                        overflow: 'hidden',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderWidth: 1,
                        borderColor: '#e5e7eb',
                      }}
                    >
                      {displayImg ? (
                        <Image
                          source={{ uri: displayImg }}
                          style={{ width: 70, height: 70 }}
                          resizeMode="cover"
                        />
                      ) : (
                        <Package size={26} color="#d1d5db" />
                      )}
                    </View>

                    {/* Details */}
                    <View style={{ flex: 1, justifyContent: 'center' }}>
                      <Text
                        style={{
                          fontSize: 15,
                          fontWeight: '700',
                          color: '#111827',
                          marginBottom: 6,
                          lineHeight: 20,
                        }}
                        numberOfLines={2}
                      >
                        {item.product?.name || 'Product'}
                      </Text>

                      {/* Qty + variant row */}
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 6 }}>
                        <View style={{ backgroundColor: '#f3f4f6', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                          <Text style={{ fontSize: 11, color: '#6b7280', fontWeight: '600' }}>
                            Qty: {item.quantity}
                          </Text>
                        </View>
                        {(item.variant as any)?.color && (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#f3f4f6', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                            {(item.variant as any).colorHex && (
                              <View
                                style={{
                                  width: 12,
                                  height: 12,
                                  borderRadius: 6,
                                  backgroundColor: (item.variant as any).colorHex,
                                  borderWidth: 1,
                                  borderColor: '#e5e7eb',
                                }}
                              />
                            )}
                            <Text style={{ fontSize: 11, color: '#6b7280', fontWeight: '600' }}>
                              {(item.variant as any).color}
                            </Text>
                          </View>
                        )}
                        {(item.variant as any)?.size && (
                          <View style={{ backgroundColor: '#f3f4f6', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                            <Text style={{ fontSize: 11, color: '#6b7280', fontWeight: '600' }}>
                              {(item.variant as any).size}
                            </Text>
                          </View>
                        )}
                      </View>

                      {/* Stock warnings */}
                      {item.product?.inStock === false && (
                        <View style={{ backgroundColor: '#fef2f2', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, alignSelf: 'flex-start' }}>
                          <Text style={{ fontSize: 11, color: '#dc2626', fontWeight: '700' }}>
                            Out of Stock
                          </Text>
                        </View>
                      )}
                      {item.product?.availableStock !== undefined &&
                        item.quantity > item.product.availableStock && (
                          <View style={{ backgroundColor: '#fffbeb', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, alignSelf: 'flex-start' }}>
                            <Text style={{ fontSize: 11, color: '#d97706', fontWeight: '700' }}>
                              Only {item.product.availableStock} available
                            </Text>
                          </View>
                        )}
                    </View>

                    {/* Line total */}
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: '800',
                        color: '#111827',
                        alignSelf: 'center',
                      }}
                    >
                      ${(item.price * item.quantity).toFixed(2)}
                    </Text>
                  </View>
                );
              })}
            </View>

            {/* ── Price breakdown ───────────────────────────────────────── */}
            <View
              style={{
                borderTopWidth: 2,
                borderTopColor: '#f1f5f9',
                paddingTop: 18,
                gap: 12,
              }}
            >
              {/* Subtotal */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 15, color: '#6b7280', fontWeight: '600' }}>Subtotal</Text>
                <Text style={{ fontSize: 15, fontWeight: '700', color: '#111827' }}>
                  ${orderSummary.subtotal.toFixed(2)}
                </Text>
              </View>

              {/* Shipping */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 15, color: '#6b7280', fontWeight: '600' }}>Shipping</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  {orderSummary.shipping === 0 && (
                    <View style={{ backgroundColor: '#dcfce7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                      <Text style={{ fontSize: 10, color: '#16a34a', fontWeight: '800' }}>FREE</Text>
                    </View>
                  )}
                  <Text
                    style={{
                      fontSize: 15,
                      fontWeight: '700',
                      color: orderSummary.shipping === 0 ? '#16a34a' : '#111827',
                    }}
                  >
                    {orderSummary.shipping === 0 ? '$0.00' : `$${orderSummary.shipping.toFixed(2)}`}
                  </Text>
                </View>
              </View>

              {/* GST */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 15, color: '#6b7280', fontWeight: '600' }}>Tax (GST)</Text>
                <Text style={{ fontSize: 15, fontWeight: '700', color: '#111827' }}>
                  ${orderSummary.tax.toFixed(2)}
                </Text>
              </View>

              {/* GST per-product breakdown */}
              {cartItems.some((item) => item.product?.gstPercentage) && (
                <View style={{ backgroundColor: '#f9fafb', borderRadius: 12, padding: 12, gap: 4 }}>
                  {cartItems.map((item) => {
                    if (!item.product?.gstPercentage) return null;
                    const itemSubtotal = item.price * item.quantity;
                    const itemTax = itemSubtotal * (item.product.gstPercentage / 100);
                    return (
                      <View
                        key={item.id}
                        style={{ flexDirection: 'row', justifyContent: 'space-between' }}
                      >
                        <Text
                          style={{ fontSize: 11, color: '#9ca3af', flex: 1, marginRight: 8, fontWeight: '600' }}
                          numberOfLines={1}
                        >
                          {item.product.name} ({item.product.gstPercentage}%)
                        </Text>
                        <Text style={{ fontSize: 11, color: '#9ca3af', fontWeight: '700' }}>
                          ${itemTax.toFixed(2)}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              )}

              {/* Discount */}
              {orderSummary.discount > 0 && (
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    backgroundColor: '#f0fdf4',
                    padding: 12,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: '#bbf7d0',
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <CheckCircle size={16} color="#16a34a" />
                    <Text style={{ fontSize: 15, color: '#16a34a', fontWeight: '700' }}>Discount</Text>
                  </View>
                  <Text style={{ fontSize: 15, fontWeight: '800', color: '#16a34a' }}>
                    -${orderSummary.discount.toFixed(2)}
                  </Text>
                </View>
              )}

              {/* Total row */}
              <View
                style={{
                  borderTopWidth: 2,
                  borderTopColor: '#e5e7eb',
                  paddingTop: 16,
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: 6,
                  backgroundColor: '#fafafa',
                  padding: 16,
                  borderRadius: 16,
                  marginHorizontal: -4,
                }}
              >
                <View>
                  <Text style={{ fontSize: 14, color: '#6b7280', fontWeight: '600', marginBottom: 2 }}>
                    Total Amount
                  </Text>
                  <Text style={{ fontSize: 18, fontWeight: '900', color: '#111827', letterSpacing: -0.5 }}>
                    ${orderSummary.total.toFixed(2)}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ fontSize: 10, color: '#9ca3af', fontWeight: '600' }}>
                    incl. all taxes
                  </Text>
                </View>
              </View>
            </View>

            {/* ── Security Trust Badges ────────────────────────────────── */}
            <View
              style={{
                borderTopWidth: 1,
                borderTopColor: '#f1f5f9',
                paddingTop: 20,
                marginTop: 20,
                gap: 12,
              }}
            >
              {[
                { icon: Lock, color: '#16a34a', bg: '#f0fdf4', label: 'SSL Encrypted — your data is safe' },
                { icon: Shield, color: '#2563eb', bg: '#eff6ff', label: 'Money Back Guarantee' },
                { icon: Truck, color: '#7c3aed', bg: '#faf5ff', label: 'Free shipping on this order' },
              ].map(({ icon: Icon, color, bg, label }) => (
                <View key={label} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 12,
                      backgroundColor: bg,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Icon size={16} color={color} />
                  </View>
                  <Text style={{ fontSize: 13, color: '#6b7280', flex: 1, fontWeight: '600' }}>
                    {label}
                  </Text>
                </View>
              ))}
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
