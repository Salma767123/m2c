import React, { useState, useEffect } from 'react';
import { getCurrency, getRegionalPrice, formatPrice as fmtCurrency } from '@/lib/currency';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Modal,
  StatusBar,
} from 'react-native';
import {
  CreditCard,
  ArrowLeft,
  CheckCircle,
  Check,
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
import AddressSelector from './CheckoutProcess/AddressSelector';
import { cartService, CartItem } from '@/services/cartService';
import orderService, { CreateOrderParams } from '@/services/orderService';
import { stashRecentOrder } from '@/lib/recentOrder';
import paymentService from '@/services/paymentService';
import { paymentSettingsService, PublicPaymentSettings } from '@/services/paymentSettingsService';
import { userProfileService } from '@/services/userProfileService';
import { addressService, MAX_SAVED_ADDRESSES, type SavedAddress } from '@/services/addressService';
import { userAuthService } from '@/services/userAuthService';
import { showSuccessToast, showErrorToast } from '@/lib/toast-utils';
import { CheckoutSkeleton } from '@/components/ui/Skeleton';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  DEFAULT_COUNTRY_ISO,
  EMAIL_REGEX,
  NAME_REGEX,
  normalizeCountryToIso,
  toE164,
  validatePhone,
  validatePostalCode,
  getPostalRule,
  getCountry,
  getStates,
} from './CheckoutProcess/constants';

export interface CheckoutFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  addressLine2: string;
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
  const safeInsets = useSafeAreaInsets();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [shippingSubmitCount, setShippingSubmitCount] = useState(0);
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
    addressLine2: '',
    city: '',
    state: '',
    zipCode: '',
    country: DEFAULT_COUNTRY_ISO,
    paymentMethod: 'razorpay',
    saveInfo: false,
    sameAsBilling: true,
    shippingMethod: 'standard',
  });

  const [discountAmount, setDiscountAmount] = useState(0);

  // Saved addresses
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [useNewAddress, setUseNewAddress] = useState(true);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [saveNewAddressToBook, setSaveNewAddressToBook] = useState(false);

  // Bag add-on (persisted from Cart page)
  const [bagName, setBagName] = useState('');
  const [bagCost, setBagCost] = useState(0);

  const [orderSummary, setOrderSummary] = useState({
    subtotal: 0,
    shipping: 0,
    tax: 0,
    discount: 0,
    bagCost: 0,
    total: 0,
  });

  useEffect(() => {
    fetchCart();
    fetchUserProfile();
    fetchPaymentSettings();
    fetchSavedAddresses();
    loadSavedCoupon();
    loadSavedBag();
  }, []);

  useEffect(() => {
    calculateTotals();
  }, [cartItems, formData.shippingMethod, discountAmount, bagCost]);

  const loadSavedBag = async () => {
    try {
      const saved = await AsyncStorage.getItem('selectedBagType');
      if (saved) {
        const { name, price, priceINR, priceUSD } = JSON.parse(saved);
        setBagName(name);
        setBagCost(getRegionalPrice({ basePrice: price, priceINR, priceUSD }));
      }
    } catch { /* ignore */ }
  };

  const fetchCart = async () => {
    try {
      setLoading(true);
      const response = await cartService.getCart();
      if (response.success && response.data) {
        setCartItems(response.data.items);
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
          country: normalizeCountryToIso(userData.country),
        }));
      }
    } catch (err: any) {
      console.error('Failed to load user profile:', err);
      // Don't show error to user, just log it
    }
  };

  const fetchSavedAddresses = async () => {
    try {
      const auth = await userAuthService.isAuthenticated();
      if (!auth) return;
      const list = await addressService.list();
      setSavedAddresses(list);
      const def = list.find((a) => a.isDefault) || list[0];
      if (def) {
        setSelectedAddressId(def.id);
        setUseNewAddress(false);
        applySavedAddressToForm(def);
      } else {
        setUseNewAddress(true);
      }
    } catch {
      setUseNewAddress(true);
    }
  };

  const applySavedAddressToForm = (addr: SavedAddress) => {
    const nameParts = (addr.name || '').trim().split(/\s+/);
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';
    const countryIso = normalizeCountryToIso(addr.country);
    setFormData((prev) => ({
      ...prev,
      firstName,
      lastName,
      phone: addr.phone || prev.phone,
      address: addr.address || '',
      addressLine2: addr.addressLine2 || '',
      city: addr.city || '',
      state: addr.state || '',
      zipCode: addr.zipCode || '',
      country: countryIso,
    }));
  };

  const handleSelectSavedAddress = (id: string) => {
    const addr = savedAddresses.find((a) => a.id === id);
    if (!addr) return;
    setSelectedAddressId(id);
    setUseNewAddress(false);
    setSaveNewAddressToBook(false);
    applySavedAddressToForm(addr);
  };

  const handleEditAddress = (id: string) => {
    const addr = savedAddresses.find((a) => a.id === id);
    if (!addr) return;
    setEditingAddressId(id);
    setSelectedAddressId(id);
    setUseNewAddress(true);
    setSaveNewAddressToBook(false);
    applySavedAddressToForm(addr);
  };

  const handleChooseNewAddress = () => {
    setUseNewAddress(true);
    setSelectedAddressId(null);
    setEditingAddressId(null);
    setFormData((prev) => ({
      ...prev,
      firstName: '',
      lastName: '',
      phone: '',
      address: '',
      addressLine2: '',
      city: '',
      state: '',
      zipCode: '',
      country: DEFAULT_COUNTRY_ISO,
    }));
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
    const subtotal = cartItems.reduce((sum, item) => {
      const hasVariant = !!(item as any).variant;
      const price = hasVariant
        ? getRegionalPrice((item as any).variant as any)
        : getRegionalPrice((item.product || { basePrice: item.price }) as any);
      return sum + price * item.quantity;
    }, 0);
    const shipping = 0;
    const tax = cartItems.reduce((sum, item) => {
      const hasVariant = !!(item as any).variant;
      const price = hasVariant
        ? getRegionalPrice((item as any).variant as any)
        : getRegionalPrice((item.product || { basePrice: item.price }) as any);
      const itemSubtotal = price * item.quantity;
      const gstRate = item.product?.gstPercentage ? item.product.gstPercentage / 100 : 0;
      return sum + itemSubtotal * gstRate;
    }, 0);
    const total = Math.max(0, subtotal + shipping + tax - discountAmount + bagCost);

    setOrderSummary({
      subtotal,
      shipping,
      tax,
      discount: discountAmount,
      bagCost,
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
    // If a saved address is selected (not using new address), skip field validation
    if (!useNewAddress && selectedAddressId) return true;

    const iso = (formData.country || DEFAULT_COUNTRY_ISO).toUpperCase();
    const postalRule = getPostalRule(iso);
    const stateList = getStates(iso);

    if (!formData.firstName?.trim()) {
      showErrorToast('Required Field', 'Please enter your first name');
      return false;
    }
    if (formData.firstName.trim().length < 2 || formData.firstName.trim().length > 50) {
      showErrorToast('Invalid Name', 'First name must be 2-50 characters');
      return false;
    }
    if (!NAME_REGEX.test(formData.firstName.trim())) {
      showErrorToast('Invalid Name', 'First name can only contain letters, spaces, and hyphens');
      return false;
    }

    if (!formData.lastName?.trim()) {
      showErrorToast('Required Field', 'Please enter your last name');
      return false;
    }
    if (formData.lastName.trim().length < 2 || formData.lastName.trim().length > 50) {
      showErrorToast('Invalid Name', 'Last name must be 2-50 characters');
      return false;
    }
    if (!NAME_REGEX.test(formData.lastName.trim())) {
      showErrorToast('Invalid Name', 'Last name can only contain letters, spaces, and hyphens');
      return false;
    }

    if (!formData.email?.trim()) {
      showErrorToast('Required Field', 'Please enter your email address');
      return false;
    }
    if (!EMAIL_REGEX.test(formData.email.trim())) {
      showErrorToast('Invalid Email', 'Please enter a valid email address');
      return false;
    }

    if (!formData.phone?.trim()) {
      showErrorToast('Required Field', 'Please enter your phone number');
      return false;
    }
    if (!validatePhone(formData.phone, iso)) {
      showErrorToast('Invalid Phone', `Enter a valid phone number for ${getCountry(iso)?.name ?? 'the selected country'}`);
      return false;
    }

    if (!formData.address?.trim()) {
      showErrorToast('Required Field', 'Please enter your address');
      return false;
    }
    if (formData.address.trim().length < 3 || formData.address.trim().length > 100) {
      showErrorToast('Invalid Address', 'Address must be 3-100 characters');
      return false;
    }

    if (formData.addressLine2 && formData.addressLine2.trim().length > 100) {
      showErrorToast('Invalid Address', 'Address Line 2 must be 100 characters or less');
      return false;
    }

    if (!formData.country) {
      showErrorToast('Required Field', 'Please select your country');
      return false;
    }

    if (!formData.city?.trim()) {
      showErrorToast('Required Field', 'Please enter your city');
      return false;
    }
    if (formData.city.trim().length < 2 || formData.city.trim().length > 50) {
      showErrorToast('Invalid City', 'City must be 2-50 characters');
      return false;
    }

    if (!formData.state?.trim()) {
      showErrorToast('Required Field', stateList.length > 0 ? 'Please select your state' : 'Please enter your state / region');
      return false;
    }

    if (!formData.zipCode?.trim()) {
      showErrorToast('Required Field', `Please enter your ${postalRule.label.toLowerCase()}`);
      return false;
    }
    if (!validatePostalCode(formData.zipCode, iso)) {
      showErrorToast('Invalid ' + postalRule.label, `Enter a valid ${postalRule.label.toLowerCase()} (e.g. ${postalRule.placeholder})`);
      return false;
    }

    return true;
  };

  const validatePaymentStep = (): boolean => {
    if (!formData.paymentMethod) {
      showErrorToast('Payment Required', 'Please select a payment method');
      return false;
    }
    if (!paymentSettings?.razorpayEnabled && !paymentSettings?.payuEnabled) {
      showErrorToast('Unavailable', 'No payment gateway is configured. Please contact support.');
      return false;
    }
    if (formData.paymentMethod === 'razorpay' && !paymentSettings?.razorpayEnabled) {
      showErrorToast('Unavailable', 'Razorpay is not available. Please choose another method.');
      return false;
    }
    if (formData.paymentMethod === 'payu' && !paymentSettings?.payuEnabled) {
      showErrorToast('Unavailable', 'PayU is not available. Please choose another method.');
      return false;
    }
    return true;
  };

  const handleContinue = () => {
    if (currentStep === 1) {
      if (!useNewAddress && !selectedAddressId) {
        showErrorToast('Address Required', 'Please select a shipping address or enter a new one');
        return;
      }
      if (!validateShippingForm()) {
        setShippingSubmitCount((c) => c + 1);
        return;
      }
    }

    if (currentStep === 2) {
      if (!validatePaymentStep()) {
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
        phone: toE164(formData.phone, formData.country),
        street: formData.address,
        addressLine2: formData.addressLine2,
        city: formData.city,
        state: formData.state,
        zipCode: formData.zipCode,
        country: formData.country,
      };


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
      
      // Store shipping address for later use
      setCurrentShippingAddress(shippingAddress);
      
      // Create Razorpay order
      const orderResponse = await paymentService.createRazorpayOrder(
        orderSummary.total,
        'INR'
      );


      if (!orderResponse.success) {
        throw new Error('Failed to initialize payment');
      }

      const { orderId, amount, currency, keyId } = orderResponse.data;


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

      setShowPaymentModal(false);

      if (message.type === 'success') {
        // Payment successful
        const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = message.data;

        try {
          // Signature verification now happens inline inside createOrder
          // (one round trip instead of two — saves a Vercel cold-start hop).
          await createOrderAfterPayment(
            currentShippingAddress,
            razorpay_payment_id,
            razorpay_order_id,
            razorpay_signature,
          );
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

  const createOrderAfterPayment = async (
    shippingAddress: CreateOrderParams['shippingAddress'],
    paymentId: string,
    razorpayOrderId?: string,
    razorpaySignature?: string,
  ) => {
    try {

      const orderParams: CreateOrderParams = {
        shippingAddress,
        paymentMethod: formData.paymentMethod,
        paymentId,
        razorpayOrderId,
        razorpaySignature,
        shippingCost: orderSummary.shipping,
        tax: orderSummary.tax,
        discount: orderSummary.discount,
        currency: getCurrency(),
      };


      const response = await orderService.createOrder(orderParams);


      if (response.success && response.data) {
        // Hand the order off via AsyncStorage so the confirmation screen can
        // render immediately without re-fetching what we already have.
        await stashRecentOrder(response.data);
        await AsyncStorage.removeItem('appliedCoupon');
        await AsyncStorage.removeItem('selectedBagType');
        showSuccessToast('Order Placed!', 'Your order has been placed successfully');
        router.replace(`/(any)/order-confirmation?id=${response.data.id}` as any);
      } else {
        await AsyncStorage.removeItem('appliedCoupon');
        await AsyncStorage.removeItem('selectedBagType');
        showSuccessToast('Order Placed!', 'Your order has been placed successfully');
        router.replace('/(tabs)/orders' as any);
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
              <View
                style={{ alignItems: 'center', flex: 1 }}
                accessibilityLabel={`Step ${step.id}: ${step.name}, ${isCompleted ? 'completed' : isActive ? 'current step' : 'upcoming'}`}
                accessibilityRole="text"
              >
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
      <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
        <CheckoutSkeleton />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-slate-50"
    >
      {/* Header — white, matches app */}
      <View
        style={{
          backgroundColor: '#ffffff',
          paddingHorizontal: 8,
          paddingTop: safeInsets.top + 8,
          paddingBottom: 8,
          borderBottomWidth: 1,
          borderBottomColor: '#e5e7eb',
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Back to cart"
          accessibilityHint="Returns to your shopping cart"
          hitSlop={8}
          style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
        >
          <ArrowLeft size={22} color="#111827" />
        </Pressable>
        <View style={{ flex: 1, marginLeft: 4 }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#111827' }}>Checkout</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
            <Lock size={12} color="#16a34a" />
            <Text style={{ fontSize: 13, color: '#16a34a', fontWeight: '600' }}>Secure payment</Text>
          </View>
        </View>
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
          <View
            style={{
              backgroundColor: '#f9fafb',
              paddingHorizontal: 20,
              paddingVertical: 14,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottomWidth: 1,
              borderBottomColor: '#e5e7eb',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  backgroundColor: '#111827',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {currentStep === 1 ? <Truck size={18} color="#fff" /> : null}
                {currentStep === 2 ? <CreditCard size={18} color="#fff" /> : null}
                {currentStep === 3 ? <CheckCircle size={18} color="#fff" /> : null}
              </View>
              <View>
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827' }}>
                  {currentStep === 1 ? 'Shipping' : currentStep === 2 ? 'Payment' : 'Review'}
                </Text>
                <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 1 }}>
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
              <View style={{ gap: 20 }}>
                {/* Saved addresses */}
                {savedAddresses.length > 0 ? (
                  <AddressSelector
                    addresses={savedAddresses}
                    selectedId={selectedAddressId}
                    useNewAddress={useNewAddress}
                    onSelect={handleSelectSavedAddress}
                    onChooseNew={handleChooseNewAddress}
                    onEdit={handleEditAddress}
                  />
                ) : null}

                {/* Shipping form — shown when using new address or editing */}
                {useNewAddress ? (
                  <>
                    {savedAddresses.length > 0 ? (
                      <View style={{ borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingTop: 16 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                          <Text style={{ fontSize: 14, fontWeight: '700', color: '#0f172a' }}>
                            {editingAddressId ? 'Edit shipping address' : 'Enter new shipping address'}
                          </Text>
                          {editingAddressId ? (
                            <Pressable
                              onPress={() => {
                                setEditingAddressId(null);
                                setUseNewAddress(false);
                                if (selectedAddressId) {
                                  const addr = savedAddresses.find((a) => a.id === selectedAddressId);
                                  if (addr) applySavedAddressToForm(addr);
                                }
                              }}
                              accessibilityRole="button"
                              accessibilityLabel="Cancel editing"
                            >
                              <View style={{ paddingHorizontal: 16, minHeight: 44, backgroundColor: '#f1f5f9', borderRadius: 10, borderWidth: 1, borderColor: '#cbd5e1', alignItems: 'center', justifyContent: 'center' }}>
                                <Text style={{ fontSize: 13, fontWeight: '600', color: '#475569' }}>Cancel</Text>
                              </View>
                            </Pressable>
                          ) : null}
                        </View>
                      </View>
                    ) : null}
                    <ShippingForm formData={formData} updateFormData={updateFormData} showAllErrors={shippingSubmitCount > 0} submitAttempt={shippingSubmitCount} />
                    {/* Save to address book checkbox */}
                    {!editingAddressId && savedAddresses.length < MAX_SAVED_ADDRESSES ? (
                      <Pressable
                        onPress={() => setSaveNewAddressToBook(!saveNewAddressToBook)}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: saveNewAddressToBook }}
                        accessibilityLabel="Save this address to my address book"
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 }}>
                          <View style={{
                            width: 20, height: 20, borderRadius: 4,
                            borderWidth: 2, borderColor: saveNewAddressToBook ? '#111827' : '#cbd5e1',
                            backgroundColor: saveNewAddressToBook ? '#111827' : '#fff',
                            alignItems: 'center', justifyContent: 'center',
                          }}>
                            {saveNewAddressToBook ? <Check size={14} color="#fff" strokeWidth={3} /> : null}
                          </View>
                          <Text style={{ fontSize: 13, color: '#475569', flex: 1 }}>
                            Save this address to my address book
                            <Text style={{ color: '#94a3b8' }}> ({savedAddresses.length}/{MAX_SAVED_ADDRESSES} used)</Text>
                          </Text>
                        </View>
                      </Pressable>
                    ) : null}
                  </>
                ) : null}
              </View>
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
              <Pressable
                onPress={() => setCurrentStep(Math.max(1, currentStep - 1))}
                disabled={currentStep === 1 || placingOrder}
                accessibilityRole="button"
                accessibilityLabel="Go to previous step"
                accessibilityState={{ disabled: currentStep === 1 || placingOrder }}
                style={{ flex: 1 }}
              >
                <View
                  style={{
                    height: 52,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: '#e5e7eb',
                    backgroundColor: '#ffffff',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: currentStep === 1 || placingOrder ? 0.4 : 1,
                  }}
                >
                  <Text style={{ fontSize: 15, fontWeight: '700', color: '#111827' }}>Previous</Text>
                </View>
              </Pressable>

              <Pressable
                onPress={handleContinue}
                disabled={placingOrder}
                accessibilityRole="button"
                accessibilityLabel={currentStep === 3 ? (placingOrder ? 'Processing order' : 'Place order') : 'Continue to next step'}
                accessibilityState={{ disabled: placingOrder }}
                style={{ flex: 1.5 }}
              >
                <View
                  style={{
                    height: 52,
                    borderRadius: 14,
                    backgroundColor: placingOrder ? '#9ca3af' : '#111827',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                  }}
                >
                  {placingOrder ? <ActivityIndicator size="small" color="#ffffff" /> : null}
                  <Text style={{ fontSize: 15, fontWeight: '700', color: '#ffffff' }}>
                    {currentStep === 3
                      ? placingOrder
                        ? 'Processing...'
                        : 'Place Order'
                      : 'Continue'}
                  </Text>
                </View>
              </Pressable>
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
          {/* Summary header */}
          <View
            style={{
              backgroundColor: '#f9fafb',
              paddingHorizontal: 20,
              paddingVertical: 14,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottomWidth: 1,
              borderBottomColor: '#e5e7eb',
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827' }}>
              Order Summary
            </Text>
            <View
              style={{
                backgroundColor: '#e5e7eb',
                borderRadius: 12,
                paddingHorizontal: 10,
                paddingVertical: 4,
              }}
            >
              <Text style={{ color: '#374151', fontSize: 12, fontWeight: '700' }}>
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
                      accessible
                      accessibilityLabel={`Image of ${item.product?.name || 'product'}`}
                      style={{
                        width: 80,
                        height: 80,
                        borderRadius: 14,
                        backgroundColor: '#f9fafb',
                        overflow: 'hidden',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderWidth: 1,
                        borderColor: '#f3f4f6',
                      }}
                    >
                      {displayImg ? (
                        <Image
                          source={{ uri: displayImg }}
                          style={{ width: 80, height: 80 }}
                          resizeMode="contain"
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
                    {(() => {
                      const hasVariant = !!(item as any).variant;
                      const linePrice = hasVariant
                        ? getRegionalPrice((item as any).variant as any)
                        : getRegionalPrice((item.product || { basePrice: item.price }) as any);
                      return (
                        <Text
                          style={{
                            fontSize: 16,
                            fontWeight: '800',
                            color: '#111827',
                            alignSelf: 'center',
                          }}
                        >
                          {fmtCurrency(linePrice * item.quantity)}
                        </Text>
                      );
                    })()}
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
                  {fmtCurrency(orderSummary.subtotal)}
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
                    {orderSummary.shipping === 0 ? fmtCurrency(0) : fmtCurrency(orderSummary.shipping)}
                  </Text>
                </View>
              </View>

              {/* GST */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 15, color: '#6b7280', fontWeight: '600' }}>Tax (GST)</Text>
                <Text style={{ fontSize: 15, fontWeight: '700', color: '#111827' }}>
                  {fmtCurrency(orderSummary.tax)}
                </Text>
              </View>

              {/* GST per-product breakdown */}
              {cartItems.some((item) => item.product?.gstPercentage) && (
                <View style={{ backgroundColor: '#f9fafb', borderRadius: 12, padding: 12, gap: 4 }}>
                  {cartItems.map((item) => {
                    if (!item.product?.gstPercentage) return null;
                    const hasVariant = !!(item as any).variant;
                    const itemPrice = hasVariant
                      ? getRegionalPrice((item as any).variant as any)
                      : getRegionalPrice((item.product || { basePrice: item.price }) as any);
                    const itemSubtotal = itemPrice * item.quantity;
                    const itemTax = itemSubtotal * (item.product.gstPercentage / 100);
                    return (
                      <View
                        key={item.id}
                        style={{ flexDirection: 'row', justifyContent: 'space-between' }}
                      >
                        <Text
                          style={{ fontSize: 11, color: '#6b7280', flex: 1, marginRight: 8, fontWeight: '600' }}
                          numberOfLines={1}
                        >
                          {item.product.name} ({item.product.gstPercentage}%)
                        </Text>
                        <Text style={{ fontSize: 11, color: '#6b7280', fontWeight: '700' }}>
                          {fmtCurrency(itemTax)}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              )}

              {/* Bag add-on */}
              {orderSummary.bagCost > 0 && (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 15, color: '#6b7280', fontWeight: '600' }}>Bag ({bagName})</Text>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: '#111827' }}>
                    {fmtCurrency(orderSummary.bagCost)}
                  </Text>
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
                    -{fmtCurrency(orderSummary.discount)}
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
                  backgroundColor: '#f8fafc',
                  padding: 16,
                  borderRadius: 14,
                }}
              >
                <View>
                  <Text style={{ fontSize: 14, color: '#6b7280', fontWeight: '600', marginBottom: 2 }}>
                    Total Amount
                  </Text>
                  <Text style={{ fontSize: 18, fontWeight: '900', color: '#111827', letterSpacing: -0.5 }}>
                    {fmtCurrency(orderSummary.total)}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ fontSize: 11, color: '#6b7280', fontWeight: '600' }}>
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
        <View style={{ flex: 1, backgroundColor: '#fff' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#e5e7eb', backgroundColor: '#f9fafb' }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#111827' }}>Complete Payment</Text>
            <Pressable
              onPress={() => {
                setShowPaymentModal(false);
                setPlacingOrder(false);
                showErrorToast('Payment Cancelled', 'You cancelled the payment');
              }}
              accessibilityRole="button"
              accessibilityLabel="Cancel payment"
              hitSlop={6}
            >
              <View style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
                <X size={22} color="#6b7280" />
              </View>
            </Pressable>
          </View>
          <WebView
            source={{ html: paymentHtml }}
            onMessage={handleWebViewMessage}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            startInLoadingState={true}
            renderLoading={() => (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator size="large" color="#111827" />
                <Text style={{ color: '#6b7280', marginTop: 16, fontSize: 14, fontWeight: '600' }}>Loading payment gateway...</Text>
              </View>
            )}
          />
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}
