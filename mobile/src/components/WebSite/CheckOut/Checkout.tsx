import React, { useState, useEffect } from 'react';
import { getCurrency, getRegion, getRegionalPrice, formatPrice as fmtCurrency } from '@/lib/currency';
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
import { LinearGradient } from 'expo-linear-gradient';
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
import { couponService } from '@/services/couponService';
import { showSuccessToast, showErrorToast } from '@/lib/toast-utils';
import { CheckoutSkeleton } from '@/components/ui/Skeleton';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Fonts } from '@/constants/theme';
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

  const [showAllItems, setShowAllItems] = useState(false);

  // Saved addresses
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [useNewAddress, setUseNewAddress] = useState(true);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [saveNewAddressToBook, setSaveNewAddressToBook] = useState(false);

  // Bag add-on (persisted from Cart page)
  const [bagName, setBagName] = useState('');
  const [bagCost, setBagCost] = useState(0);
  const [freeShippingApplied, setFreeShippingApplied] = useState(false);

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

  /**
   * Whether an admin free-shipping offer applies to this order.
   *
   * Deliberately the same call the cart makes
   * (couponService.applyFreeShippingOffer → /coupons/apply-free-shipping), so
   * the two screens cannot disagree about whether the customer qualified.
   * A failure means "no offer", which is also what the cart assumes.
   */
  useEffect(() => {
    let cancelled = false;
    const subtotal = orderSummary.subtotal;
    if (subtotal <= 0) return;

    (async () => {
      try {
        const userData = await userAuthService.getUserData();
        if (!userData?.id || cancelled) return;
        const res = await couponService.applyFreeShippingOffer(userData.id, subtotal);
        if (!cancelled && res.success && (res.data as any)?.freeShipping) {
          setFreeShippingApplied(true);
        }
      } catch {
        /* no offer available — expected */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [orderSummary.subtotal]);

  const calculateTotals = () => {
    const subtotal = cartItems.reduce((sum, item) => {
      const hasVariant = !!(item as any).variant;
      const price = hasVariant
        ? getRegionalPrice((item as any).variant as any)
        : getRegionalPrice((item.product || { basePrice: item.price }) as any);
      return sum + price * item.quantity;
    }, 0);
    const shipping = 0;

    /*
     * GST, on the amount actually being charged — the same three corrections
     * the cart needed: the coupon comes off BEFORE tax (each line taking its
     * pro-rata share), tax is an `.in` concern and zero elsewhere, and every
     * line rounds to 2dp before summing, mirroring the server's `round2`.
     * Without these, the figure shown here disagreed with what was billed.
     */
    const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
    const tax =
      getRegion() !== 'IN'
        ? 0
        : cartItems.reduce((sum, item) => {
            const hasVariant = !!(item as any).variant;
            const price = hasVariant
              ? getRegionalPrice((item as any).variant as any)
              : getRegionalPrice((item.product || { basePrice: item.price }) as any);
            const gross = r2(price * item.quantity);
            const couponShare = subtotal > 0 ? (gross / subtotal) * discountAmount : 0;
            const net = Math.max(0, gross - couponShare);
            const gstRate = item.product?.gstPercentage ? item.product.gstPercentage / 100 : 0;
            return sum + r2(net * gstRate);
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
        // The web sends this; mobile was creating orders that qualified for
        // free shipping without recording that they had.
        freeShipping: freeShippingApplied,
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

  // Step indicator: warm palette from frontend Checkout.tsx.
  //   completed = green (#1f7a4d), active = red (#e01a1b), inactive = warm grey (#f1e9e2 / #a2968b)
  const renderStepIndicator = () => (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 32,
        gap: 12,
      }}
    >
      {steps.map((step, index) => {
        const isCompleted = currentStep > step.id;
        const isActive = currentStep === step.id;
        const isLast = index === steps.length - 1;

        const circleBg = isCompleted ? '#1f7a4d' : isActive ? '#e01a1b' : '#f1e9e2';
        const circleText = isCompleted || isActive ? '#ffffff' : '#a2968b';
        const textColor = isCompleted ? '#6b625b' : isActive ? '#1a1a1a' : '#a2968b';
        const connectorColor = isCompleted ? '#1f7a4d' : '#eadfd4';

        return (
          <React.Fragment key={step.id}>
            <View style={{ alignItems: 'center', flex: 1 }}>
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: circleBg,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {isCompleted ? (
                  <CheckCircle size={16} color="#ffffff" />
                ) : (
                  <Text style={{ fontSize: 12, fontWeight: '700', color: circleText }}>{step.id}</Text>
                )}
              </View>
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: isActive ? '700' : '600',
                  color: textColor,
                  marginTop: 6,
                  textAlign: 'center',
                }}
              >
                {step.name}
              </Text>
            </View>

            {!isLast && (
              <View style={{ flex: 1, height: 2, backgroundColor: connectorColor, marginHorizontal: 4 }} />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#faf6f2' }}>
        <CheckoutSkeleton />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: '#faf6f2' }}
    >
      {/* Header — white, matches app */}
      <View
        style={{
          backgroundColor: '#ffffff',
          paddingHorizontal: 8,
          paddingTop: safeInsets.top + 8,
          paddingBottom: 8,
          borderBottomWidth: 1,
          borderBottomColor: '#e5dbd0',
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
          <ArrowLeft size={22} color="#1a1a1a" />
        </Pressable>
        <View style={{ flex: 1, marginLeft: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            {/* Lock icon in gradient circle, matching the web checkout header */}
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                backgroundColor: '#ffffff',
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: '#f2d9d3',
                shadowColor: '#fff',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.5,
                shadowRadius: 2,
                elevation: 1,
              }}
            >
              <Lock size={18} color="#E01A1B" />
            </View>
            <View>
              <Text style={{ fontSize: 18, fontWeight: '600', color: '#1a1a1a', fontFamily: Fonts.heading }}>
                Checkout
              </Text>
              <Text style={{ fontSize: 13, color: '#6b625b', marginTop: 2 }}>
                Complete your purchase securely
              </Text>
            </View>
          </View>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {renderStepIndicator()}

        {/* Step heading — eyebrow + name, matching the web masthead */}
        <View style={{ marginBottom: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{ width: 24, height: 1, backgroundColor: '#e01a1b' }} />
            <Text
              style={{
                fontSize: 11,
                fontWeight: '700',
                color: '#c41617',
                textTransform: 'uppercase',
                letterSpacing: 1.98,
              }}
            >
              Step {currentStep} of {steps.length}
            </Text>
          </View>
          <Text
            style={{
              fontSize: 20,
              fontWeight: '600',
              color: '#1a1a1a',
              marginTop: 8,
              fontFamily: Fonts.heading,
              letterSpacing: -0.5,
            }}
          >
            {currentStep === 1 && 'Shipping Information'}
            {currentStep === 2 && 'Payment Information'}
            {currentStep === 3 && 'Review Your Order'}
          </Text>
        </View>

        {/* Main Checkout Card */}
        <View
          style={{
            backgroundColor: '#ffffff',
            borderRadius: 16,
            overflow: 'hidden',
            marginBottom: 16,
            shadowColor: '#785032',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.03,
            shadowRadius: 4,
            elevation: 1,
            borderWidth: 1,
            borderColor: '#efe4d6',
          }}
        >
          {/* Card Content */}
          <View style={{ padding: 24 }}>
            {error && (
              <View
                style={{
                  marginBottom: 20,
                  padding: 16,
                  backgroundColor: '#fdf1ef',
                  borderRadius: 16,
                  borderWidth: 1.5,
                  borderColor: '#f2d0cd',
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
                <Text style={{ flex: 1, fontSize: 13, color: '#c41617', lineHeight: 20, fontWeight: '600' }}>
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
                    disabled={placingOrder}
                  />
                ) : null}

                {/* Shipping form — shown when using new address or editing */}
                {useNewAddress ? (
                  <>
                    {savedAddresses.length > 0 ? (
                  <View style={{ borderTopWidth: 1, borderTopColor: '#f0e8df', paddingTop: 16 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: '#1a1a1a', fontFamily: Fonts.heading }}>
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
                          <View style={{ paddingHorizontal: 16, minHeight: 44, backgroundColor: '#f3ece5', borderRadius: 10, borderWidth: 1, borderColor: '#e5dbd0', alignItems: 'center', justifyContent: 'center' }}>
                            <Text style={{ fontSize: 13, fontWeight: '600', color: '#4a423c' }}>Cancel</Text>
                          </View>
                        </Pressable>
                      ) : null}
                    </View>
                  </View>
                ) : null}
                <ShippingForm formData={formData} updateFormData={updateFormData} disabled={placingOrder} showAllErrors={shippingSubmitCount > 0} submitAttempt={shippingSubmitCount} />
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
                        borderWidth: 2, borderColor: saveNewAddressToBook ? '#E01A1B' : '#e5dbd0',
                        backgroundColor: saveNewAddressToBook ? '#E01A1B' : '#fff',
                        alignItems: 'center', justifyContent: 'center',
                      }}>
                        {saveNewAddressToBook ? <Check size={14} color="#fff" strokeWidth={3} /> : null}
                      </View>
                      <Text style={{ fontSize: 13, color: '#4a423c', flex: 1 }}>
                        Save this address to my address book
                        <Text style={{ color: '#8a807a' }}> ({savedAddresses.length}/{MAX_SAVED_ADDRESSES} used)</Text>
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
                 disabled={placingOrder}
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
                  borderTopColor: '#f0e8df',
                  gap: 12,
                }}
              >
                {/* Previous: hidden on first step, matching the web */}
                {currentStep > 1 ? (
                  <Pressable
                    onPress={() => setCurrentStep(Math.max(1, currentStep - 1))}
                    disabled={placingOrder}
                    accessibilityRole="button"
                    accessibilityLabel="Go to previous step"
                    accessibilityState={{ disabled: placingOrder }}
                    style={{ flex: 1 }}
                  >
                    <View
                      style={{
                        height: 52,
                        borderRadius: 999,
                        borderWidth: 1,
                        borderColor: '#e5dbd0',
                        backgroundColor: '#ffffff',
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: placingOrder ? 0.4 : 1,
                      }}
                    >
                      <Text style={{ fontSize: 14, fontWeight: '600', color: '#6b625b' }}>
                        Previous
                      </Text>
                    </View>
                  </Pressable>
                ) : (
                  <View style={{ flex: 1 }} />
                )}

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
                      borderRadius: 999,
                      backgroundColor: placingOrder ? '#9ca3af' : '#E01A1B',
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      shadowColor: placingOrder ? 'transparent' : '#e01a1b',
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.15,
                      shadowRadius: 8,
                      elevation: 2,
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

        {/* ── The order ──────────────────────────────────────────────────
            A card: white, with a warm hairline and a soft shadow, sticky from
            lg so it follows you down the steps. */}
        <View
          style={{
            backgroundColor: '#ffffff',
            borderRadius: 16,
            overflow: 'hidden',
            shadowColor: '#785032',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.03,
            shadowRadius: 4,
            elevation: 1,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: '#efe4d6',
          }}
        >
          {/* Weave texture — subtle grid pattern, matching the web's absolute inset-0 opacity-[0.03] */}
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'transparent',
              opacity: 0.03,
              pointerEvents: 'none',
            }}
            pointerEvents="none"
          >
            {[...Array(10)].map((_, i) => (
              <View
                key={`w-h-${i}`}
                style={{
                  position: 'absolute',
                  left: i * 20,
                  top: 0,
                  bottom: 0,
                  width: 1,
                  backgroundColor: '#8a6a49',
                }}
              />
            ))}
            {[...Array(15)].map((_, i) => (
              <View
                key={`w-v-${i}`}
                style={{
                  position: 'absolute',
                  top: i * 12,
                  left: 0,
                  right: 0,
                  height: 1,
                  backgroundColor: '#8a6a49',
                }}
              />
            ))}
          </View>

          <View style={{ position: 'relative', padding: 24 }}>
            {/* Summary header */}
            <View
              style={{
                paddingHorizontal: 4,
                paddingBottom: 16,
                borderBottomWidth: 1,
                borderBottomColor: '#eee2d2',
                marginBottom: 16,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Text style={{ fontSize: 18, fontWeight: '600', color: '#1a1a1a', fontFamily: Fonts.heading, letterSpacing: -0.3 }}>
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
                <Text style={{ color: '#6b625b', fontSize: 12, fontWeight: '700' }}>
                  {cartItems.length} item{cartItems.length !== 1 ? 's' : ''}
                </Text>
              </View>
            </View>

            {/* Cart Items Preview */}
            <View style={{ marginBottom: 20 }}>
              {(showAllItems ? cartItems : cartItems.slice(0, 3)).map((item, idx) => {
                const hasVariantImg =
                  (item.variant as any)?.images && (item.variant as any).images.length > 0;
                const displayImg = hasVariantImg
                  ? (item.variant as any).images[0]
                  : item.product?.images?.[0]?.url;

                const isLastItem = idx === (showAllItems ? cartItems.length - 1 : Math.min(cartItems.length - 1, 2));

                return (
                  <View
                    key={item.id}
                    style={{
                      flexDirection: 'row',
                      gap: 12,
                      paddingBottom: 16,
                      marginBottom: isLastItem ? 0 : 16,
                      borderBottomWidth: isLastItem ? 0 : 1,
                      borderBottomColor: '#f1f5f9',
                    }}
                  >
                    {/* Product image — 56px to match web's 14×14mm thumbnail */}
                    <View
                      accessible
                      accessibilityLabel={`Image of ${item.product?.name || 'product'}`}
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: 8,
                        backgroundColor: '#f9fafb',
                        overflow: 'hidden',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderWidth: 1,
                        borderColor: '#ece0cf',
                      }}
                    >
                      {displayImg ? (
                        <Image
                          source={{ uri: displayImg }}
                          style={{ width: 56, height: 56 }}
                          resizeMode="cover"
                        />
                      ) : (
                        <Package size={20} color="#d1d5db" />
                      )}

                      {/* Quantity badge — overlapping the image corner, like the web */}
                      <View
                        style={{
                          position: 'absolute',
                          top: -4,
                          right: -4,
                          minWidth: 20,
                          height: 20,
                          borderRadius: 10,
                          backgroundColor: '#2f1e1a',
                          alignItems: 'center',
                          justifyContent: 'center',
                          paddingHorizontal: 4,
                          borderWidth: 2,
                          borderColor: '#ffffff',
                        }}
                      >
                        <Text style={{ fontSize: 10, fontWeight: '700', color: '#ffffff' }}>{item.quantity}</Text>
                      </View>
                    </View>

                    {/* Details */}
                    <View style={{ flex: 1, justifyContent: 'center' }}>
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: '500',
                          color: '#1a1a1a',
                          lineHeight: 20,
                        }}
                        numberOfLines={2}
                      >
                        {item.product?.name || 'Product'}
                      </Text>

                      {/* Variant info */}
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                        <View style={{ backgroundColor: '#f3f4f6', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                          <Text style={{ fontSize: 11, color: '#6b625b', fontWeight: '600' }}>
                            Qty: {item.quantity}
                          </Text>
                        </View>
                        {(item.variant as any)?.color && (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#f3f4f6', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                            {(item.variant as any).colorHex && (
                              <View
                                style={{
                                  width: 10,
                                  height: 10,
                                  borderRadius: 5,
                                  backgroundColor: (item.variant as any).colorHex,
                                  borderWidth: 1,
                                  borderColor: '#e5e7eb',
                                }}
                              />
                            )}
                            <Text style={{ fontSize: 11, color: '#6b625b', fontWeight: '600' }}>
                              {(item.variant as any).color}
                            </Text>
                          </View>
                        )}
                        {(item.variant as any)?.size && (
                          <View style={{ backgroundColor: '#f3f4f6', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                            <Text style={{ fontSize: 11, color: '#6b625b', fontWeight: '600' }}>
                              {(item.variant as any).size}
                            </Text>
                          </View>
                        )}
                      </View>

                      {/* Offer badge, matching web */}
                      {(item.product as any)?.activeOffer && (
                        <Text
                          style={{
                            fontSize: 10,
                            fontWeight: '800',
                            color: '#c41617',
                            backgroundColor: '#fdf1ef',
                            borderRadius: 999,
                            paddingHorizontal: 6,
                            paddingVertical: 2,
                            marginTop: 4,
                            alignSelf: 'flex-start',
                          }}
                        >
                          {(item.product as any).activeOffer.badge}
                        </Text>
                      )}

                      {/* Stock warnings */}
                      {item.product?.inStock === false && (
                        <View style={{ backgroundColor: '#fef2f2', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, alignSelf: 'flex-start', marginTop: 4 }}>
                          <Text style={{ fontSize: 11, color: '#dc2626', fontWeight: '700' }}>
                            Out of Stock
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
                            fontSize: 14,
                            fontWeight: '700',
                            color: '#1a1a1a',
                            alignSelf: 'center',
                            fontFamily: Fonts.sansSemibold,
                          }}
                        >
                          {fmtCurrency(linePrice * item.quantity)}
                        </Text>
                      );
                    })()}
                  </View>
                );
              })}

              {/* Show all / show fewer toggle, matching the web button */}
              {!showAllItems && cartItems.length > 3 && (
                <Pressable
                  onPress={() => setShowAllItems(true)}
                  accessibilityRole="button"
                  accessibilityLabel={`Show all ${cartItems.length} items`}
                >
                  <View
                    style={{
                      minHeight: 44,
                      alignSelf: 'stretch',
                      marginTop: 4,
                      paddingHorizontal: 16,
                      paddingVertical: 10,
                      backgroundColor: '#f8f2eb',
                      borderRadius: 999,
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexDirection: 'row',
                      gap: 6,
                      borderWidth: 1,
                      borderColor: '#e8dccd',
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#4a423c' }}>
                      Show all {cartItems.length} items
                    </Text>
                  </View>
                </Pressable>
              )}
              {showAllItems && cartItems.length > 3 && (
                <Pressable
                  onPress={() => setShowAllItems(false)}
                  accessibilityRole="button"
                  accessibilityLabel="Show fewer items"
                >
                  <View
                    style={{
                      minHeight: 44,
                      alignSelf: 'stretch',
                      marginTop: 4,
                      paddingHorizontal: 16,
                      paddingVertical: 10,
                      backgroundColor: '#f8f2eb',
                      borderRadius: 999,
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexDirection: 'row',
                      gap: 6,
                      borderWidth: 1,
                      borderColor: '#e8dccd',
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#4a423c' }}>
                      Show fewer items
                    </Text>
                  </View>
                </Pressable>
              )}
            </View>

            {/* ── Price breakdown ───────────────────────────────────────── */}
            <View
              style={{
                borderTopWidth: 2,
                borderTopColor: '#eee2d2',
                paddingTop: 18,
                gap: 12,
              }}
            >
              {/* Subtotal */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 15, color: '#6b625b', fontWeight: '600' }}>Subtotal</Text>
                <Text style={{ fontSize: 15, fontWeight: '600', color: '#1a1a1a', fontFamily: Fonts.sansSemibold }}>
                  {fmtCurrency(orderSummary.subtotal)}
                </Text>
              </View>

              {/* Shipping */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 15, color: '#6b625b', fontWeight: '600' }}>Shipping</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  {orderSummary.shipping === 0 && (
                    <View style={{ backgroundColor: '#dcfce7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                      <Text style={{ fontSize: 10, color: '#16a34a', fontWeight: '800' }}>FREE</Text>
                    </View>
                  )}
                  <Text
                    style={{
                      fontSize: 15,
                      fontWeight: '600',
                      color: orderSummary.shipping === 0 ? '#16a34a' : '#1a1a1a',
                      fontFamily: Fonts.sansSemibold,
                    }}
                  >
                    {orderSummary.shipping === 0 ? fmtCurrency(0) : fmtCurrency(orderSummary.shipping)}
                  </Text>
                </View>
              </View>

              {/* GST — `.in` only, matching the calculation above and the web,
                  which shows the taxable amount and tax on that storefront
                  alone. These rows used to print "Tax (GST) $0.00" on .com. */}
              {getRegion() === 'IN' ? (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 15, color: '#6b625b', fontWeight: '600' }}>Tax (GST)</Text>
                  <Text style={{ fontSize: 15, fontWeight: '600', color: '#1a1a1a', fontFamily: Fonts.sansSemibold }}>
                    {fmtCurrency(orderSummary.tax)}
                  </Text>
                </View>
              ) : null}

              {/* GST per-product breakdown */}
              {getRegion() === 'IN' && cartItems.some((item) => item.product?.gstPercentage) && (
                <View style={{ backgroundColor: '#f9fafb', borderRadius: 12, padding: 12, gap: 4 }}>
                  {cartItems.map((item) => {
                    if (!item.product?.gstPercentage) return null;
                    const hasVariant = !!(item as any).variant;
                    const itemPrice = hasVariant
                      ? getRegionalPrice((item as any).variant as any)
                      : getRegionalPrice((item.product || { basePrice: item.price }) as any);
                    // Net of this line's share of the coupon, so these rows sum
                    // to the Tax (GST) figure rather than overshooting it.
                    const gross = itemPrice * item.quantity;
                    const share =
                      orderSummary.subtotal > 0
                        ? (gross / orderSummary.subtotal) * orderSummary.discount
                        : 0;
                    const itemTax =
                      Math.max(0, gross - share) * (item.product.gstPercentage / 100);
                    return (
                      <View
                        key={item.id}
                        style={{ flexDirection: 'row', justifyContent: 'space-between' }}
                      >
                        <Text
                          style={{ fontSize: 11, color: '#6b625b', flex: 1, marginRight: 8, fontWeight: '600' }}
                          numberOfLines={1}
                        >
                          {item.product.name} ({item.product.gstPercentage}%)
                        </Text>
                        <Text style={{ fontSize: 11, color: '#6b625b', fontWeight: '700' }}>
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
                  <Text style={{ fontSize: 15, color: '#6b625b', fontWeight: '600' }}>Bag ({bagName})</Text>
                  <Text style={{ fontSize: 15, fontWeight: '600', color: '#1a1a1a', fontFamily: Fonts.sansSemibold }}>
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
                    backgroundColor: '#fdf1ef',
                    padding: 12,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: '#f4dcd7',
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <CheckCircle size={16} color="#1f7a4d" />
                    <Text style={{ fontSize: 15, color: '#1f7a4d', fontWeight: '700' }}>Discount</Text>
                  </View>
                  <Text style={{ fontSize: 15, fontWeight: '800', color: '#1f7a4d' }}>
                    -{fmtCurrency(orderSummary.discount)}
                  </Text>
                </View>
              )}

              {/* Total row — dark warm gradient, matching the web's one dark object */}
              <View
                style={{
                  marginTop: 16,
                  borderRadius: 16,
                  overflow: 'hidden',
                }}
              >
                <LinearGradient
                  colors={['#2f1e1a', '#1f1312']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    padding: 16,
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <View>
                    <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', fontWeight: '600' }}>
                      Total
                    </Text>
                    <Text style={{ fontSize: 22, fontWeight: '700', color: '#ffffff', marginTop: 2, fontFamily: Fonts.heading, letterSpacing: -0.5 }}>
                      {fmtCurrency(orderSummary.total)}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', fontWeight: '600' }}>
                      incl. all taxes
                    </Text>
                  </View>
                </LinearGradient>
                <View
                  style={{
                    shadowColor: '#462819',
                    shadowOffset: { width: 0, height: 14 },
                    shadowOpacity: 0.4,
                    shadowRadius: 34,
                    elevation: 8,
                  }}
                />
              </View>
            </View>

            {/* ── Security Trust Badges ────────────────────────────────── */}
            <View
              style={{
                borderTopWidth: 1,
                borderTopColor: '#eee2d2',
                paddingTop: 20,
                marginTop: 20,
                gap: 12,
              }}
            >
              {[
                { icon: Lock, color: '#1f7a4d', bg: '#f0fdf4', label: 'SSL Encrypted — your data is safe' },
                { icon: Shield, color: '#2563eb', bg: '#eff6ff', label: 'Money Back Guarantee' },
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
                  <Text style={{ fontSize: 13, color: '#6b625b', flex: 1, fontWeight: '600' }}>
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
                <X size={22} color="#6b625b" />
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
                <ActivityIndicator size="large" color="#E01A1B" />
                <Text style={{ color: '#6b625b', marginTop: 16, fontSize: 14, fontWeight: '600' }}>Loading payment gateway...</Text>
              </View>
            )}
          />
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}
