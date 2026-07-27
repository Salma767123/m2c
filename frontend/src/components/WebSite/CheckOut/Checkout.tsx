"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  CreditCard,
  ArrowLeft,
  CheckCircle,
  Truck,
  Lock,
  Shield,
  Loader2,
  ShoppingBag
} from "lucide-react"
import { calculateLogistics, type LogisticsConfig } from "@/lib/logistics"
import { formatPrice, getCurrency, getRegionalPrice, convertUSDtoINR, convertINRtoUSD } from '@/lib/currency'
import ShippingForm from "./CheckoutProcess/ShippingForm"
import PaymentForm from "./CheckoutProcess/PaymentForm"
import ReviewOrder from "./CheckoutProcess/ReviewOrder"
import AddressSelector from "./CheckoutProcess/AddressSelector"
import Reveal from "@/components/WebSite/Shared/Reveal"
import cartService, { CartItem } from "@/services/cartService"
import orderService, { CreateOrderParams } from "@/services/orderService"
import { stashRecentOrder } from "@/lib/recentOrder"
import paymentService from "@/services/paymentService"
import { userProfileService } from "@/services/userProfileService"
import { userAuthService } from "@/services/userAuthService"
import { paymentSettingsService, PublicPaymentSettings } from "@/services/paymentSettingsService"
import { addressService, MAX_SAVED_ADDRESSES, type SavedAddress, type AddressPayload } from "@/services/addressService"
import { DEFAULT_COUNTRY_ISO, normalizeCountryToIso, toE164, formatPhoneAsYouType, validatePhone } from "./CheckoutProcess/constants"

// Declare Razorpay type for TypeScript
declare global {
  interface Window {
    Razorpay: any;
  }
}

/**
 * Split a stored full name into first / middle / last. The first token is the
 * first name, the last token is the last name, and anything between is treated
 * as the middle name (so "A B C D" → first "A", middle "B C", last "D").
 */
function splitFullName(full?: string | null): { firstName: string; middleName: string; lastName: string } {
  const parts = String(full || "").trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return { firstName: "", middleName: "", lastName: "" }
  if (parts.length === 1) return { firstName: parts[0], middleName: "", lastName: "" }
  return {
    firstName: parts[0],
    middleName: parts.slice(1, -1).join(" "),
    lastName: parts[parts.length - 1],
  }
}

/** Compose first / middle / last back into a single stored name. */
function joinFullName(firstName: string, middleName: string, lastName: string): string {
  return [firstName, middleName, lastName].map((s) => (s || "").trim()).filter(Boolean).join(" ")
}

export interface CheckoutFormData {
  // Shipping Information
  firstName: string
  middleName: string
  lastName: string
  email: string
  phone: string
  address: string
  addressLine2: string
  addressLine3: string
  landmark: string
  city: string
  state: string
  zipCode: string
  country: string

  // Payment Information
  paymentMethod: "razorpay" | "payu"
  cardNumber: string
  expiryDate: string
  cvv: string
  cardName: string
  upiId: string

  // Options
  saveInfo: boolean
  sameAsBilling: boolean
  shippingMethod: string
}

export default function Checkout() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [shippingValid, setShippingValid] = useState(false)
  const [loading, setLoading] = useState(true)
  const [placingOrder, setPlacingOrder] = useState(false)
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const [paymentSettings, setPaymentSettings] = useState<PublicPaymentSettings | null>(null)

  // Saved addresses state
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([])
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null)
  const [useNewAddress, setUseNewAddress] = useState(false)
  const [saveNewAddressToBook, setSaveNewAddressToBook] = useState(false)
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null)

  const [formData, setFormData] = useState<CheckoutFormData>({
    firstName: "",
    middleName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    addressLine2: "",
    addressLine3: "",
    landmark: "",
    city: "",
    state: "",
    zipCode: "",
    country: DEFAULT_COUNTRY_ISO,
    paymentMethod: "razorpay", // Default to razorpay, will be updated based on available gateways
    cardNumber: "",
    expiryDate: "",
    cvv: "",
    cardName: "",
    upiId: "",
    saveInfo: false,
    sameAsBilling: true,
    shippingMethod: "standard"
  })

  // Shipping costs
  const shippingCosts: Record<string, number> = {
    standard: 0,
    express: 9.99,
    overnight: 24.99
  }

  const [discountAmount, setDiscountAmount] = useState(0)
  const [couponCode, setCouponCode] = useState("")
  const [freeShippingApplied, setFreeShippingApplied] = useState(false)
  const [freeShippingMessage, setFreeShippingMessage] = useState("")

  const [orderSummary, setOrderSummary] = useState({
    subtotal: 0,
    shipping: 0,
    tax: 0,
    discount: 0,
    total: 0
  })

  useEffect(() => {
    fetchCart()
    fetchUserProfile()
    fetchSavedAddresses()
    fetchPaymentSettings()
    loadRazorpayScript()

    // Load applied coupon
    const savedCoupon = localStorage.getItem('appliedCoupon')
    if (savedCoupon) {
      try {
        const { code, discountAmount, freeShipping, freeShippingMessage } = JSON.parse(savedCoupon)
        setCouponCode(code || "")
        setDiscountAmount(discountAmount || 0)
        setFreeShippingApplied(freeShipping || false)
        setFreeShippingMessage(freeShippingMessage || "")
      } catch (e) {
        console.error("Failed to parse coupon", e)
      }
    }

  }, [])

  useEffect(() => {
    calculateTotals()
  }, [cartItems, formData.shippingMethod, discountAmount])

  const fetchCart = async () => {
    try {
      setLoading(true)
      const response = await cartService.getCart()
      if (response.success && response.data) {
        setCartItems(response.data.items)
        const hasOutOfStock = response.data.items.some((item: any) =>
          item.product?.inStock === false ||
          (item.product?.availableStock !== undefined && item.quantity > item.product?.availableStock)
        );
        if (hasOutOfStock) {
          setError("Some items in your cart are out of stock or have insufficient quantity. Please return to the cart to remove them.")
        }
      }
    } catch (err: any) {
      setError("Failed to load cart items")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const fetchUserProfile = async () => {
    try {
      if (!userAuthService.isAuthenticated()) {
        return; // Don't fetch profile for guests
      }

      const response = await userProfileService.getProfile()
      if (response.success && response.data) {
        const userData = response.data

        // Split the stored full name into first / middle / last.
        const { firstName, middleName, lastName } = splitFullName(userData.name)

        // Pre-fill personal info only. Shipping address is sourced from saved addresses
        // (see fetchSavedAddresses) so it isn't overridden by legacy flat User.address fields.
        // Only carry over the profile phone if it parses cleanly for the current country —
        // otherwise we'd surface a "invalid phone" error on a field the user hasn't touched.
        setFormData(prev => {
          const incomingPhone = userData.phoneNumber || ''
          const candidatePhone = prev.phone || incomingPhone
          const reformatted = candidatePhone
            ? formatPhoneAsYouType(candidatePhone, prev.country || DEFAULT_COUNTRY_ISO)
            : ''
          const usePhone = reformatted && validatePhone(reformatted, prev.country || DEFAULT_COUNTRY_ISO)
            ? reformatted
            : prev.phone
          return {
            ...prev,
            firstName: prev.firstName || firstName,
            middleName: prev.middleName || middleName,
            lastName: prev.lastName || lastName,
            email: userData.email,
            phone: usePhone,
          }
        })
      }
    } catch (err: any) {
      console.error('Failed to load user profile:', err)
      // Don't show error to user, just log it
      // User can still manually enter address
    }
  }

  const fetchSavedAddresses = async () => {
    try {
      if (!userAuthService.isAuthenticated()) return
      const list = await addressService.list()
      setSavedAddresses(list)
      // Auto-select default if user has addresses; otherwise go straight to new-address entry
      const def = list.find((a) => a.isDefault) || list[0]
      if (def) {
        setSelectedAddressId(def.id)
        setUseNewAddress(false)
        applySavedAddressToForm(def)
      } else {
        setUseNewAddress(true)
      }
    } catch (err) {
      console.error("Failed to load saved addresses:", err)
      setUseNewAddress(true)
    }
  }

  const applySavedAddressToForm = (addr: SavedAddress) => {
    const { firstName, middleName, lastName } = splitFullName(addr.name)
    const countryIso = normalizeCountryToIso(addr.country)
    const displayPhone = addr.phone ? formatPhoneAsYouType(addr.phone, countryIso) : ""
    setFormData((prev) => ({
      ...prev,
      firstName,
      middleName,
      lastName,
      phone: displayPhone || prev.phone,
      address: addr.address || "",
      addressLine2: addr.addressLine2 || "",
      addressLine3: addr.addressLine3 || "",
      landmark: addr.landmark || "",
      city: addr.city || "",
      state: addr.state || "",
      zipCode: addr.zipCode || "",
      country: countryIso,
    }))
  }

  const handleSelectSavedAddress = (id: string) => {
    const addr = savedAddresses.find((a) => a.id === id)
    if (!addr) return
    setSelectedAddressId(id)
    setUseNewAddress(false)
    setSaveNewAddressToBook(false)
    applySavedAddressToForm(addr)
  }

  const handleEditAddress = (id: string) => {
    const addr = savedAddresses.find((a) => a.id === id)
    if (!addr) return
    setEditingAddressId(id)
    setSelectedAddressId(id)
    setUseNewAddress(true)
    setSaveNewAddressToBook(false)
    applySavedAddressToForm(addr)
  }

  const handleChooseNewAddress = () => {
    setUseNewAddress(true)
    setSelectedAddressId(null)
    setEditingAddressId(null)
    // Clear shipping fields so the user enters fresh data; keep email so it's not lost
    setFormData((prev) => ({
      ...prev,
      firstName: "",
      middleName: "",
      lastName: "",
      phone: "",
      address: "",
      addressLine2: "",
      addressLine3: "",
      landmark: "",
      city: "",
      state: "",
      zipCode: "",
      country: DEFAULT_COUNTRY_ISO,
    }))
  }

  // True when Step 1 can proceed: either a saved address is selected, or the new-address form is valid.
  const canAdvanceShipping = useNewAddress ? shippingValid : !!selectedAddressId

  // The server rejects an order whose line has an unresolved shipping mode, so
  // block here too — reaching /checkout directly must not bypass the cart's choice.
  const itemsMissingTransport = cartItems.filter((item) => {
    const types = (item.product as any)?.logisticsConfig?.transportTypes
    return Array.isArray(types) && types.length > 1 && !(item as any).transportType
  })

  // If the user opted to save a new address to the address book, persist it before advancing.
  // A save failure is surfaced but does NOT block checkout — the user should still be able to complete the order.
  const handleShippingStepAdvance = async () => {
    const isAuthed = userAuthService.isAuthenticated()

    // Editing an existing saved address — update it in the address book
    if (useNewAddress && editingAddressId && isAuthed) {
      try {
        const existing = savedAddresses.find(a => a.id === editingAddressId)
        const payload: AddressPayload = {
          type: existing?.type || "home",
          name: joinFullName(formData.firstName, formData.middleName, formData.lastName),
          phone: toE164(formData.phone, formData.country),
          address: formData.address,
          addressLine2: formData.addressLine2 || undefined,
          addressLine3: formData.addressLine3 || undefined,
          landmark: formData.landmark || undefined,
          city: formData.city,
          state: formData.state,
          zipCode: formData.zipCode,
          country: formData.country,
          isDefault: existing?.isDefault || false,
        }
        const updated = await addressService.update(editingAddressId, payload)
        setSavedAddresses((prev) => prev.map(a => a.id === editingAddressId ? updated : a))
        setSelectedAddressId(editingAddressId)
        setEditingAddressId(null)
        setUseNewAddress(false)
      } catch (err: any) {
        console.error("Failed to update address:", err)
        // Warn but do not block checkout — the form data is still valid for shipping
        setError(err?.message || "Could not update address — your changes will still be used for this order")
      }
    }
    // Saving a new address to the address book
    else if (
      useNewAddress &&
      saveNewAddressToBook &&
      isAuthed &&
      savedAddresses.length < MAX_SAVED_ADDRESSES
    ) {
      try {
        const payload: AddressPayload = {
          type: "home",
          name: joinFullName(formData.firstName, formData.middleName, formData.lastName),
          phone: toE164(formData.phone, formData.country),
          address: formData.address,
          addressLine2: formData.addressLine2 || undefined,
          addressLine3: formData.addressLine3 || undefined,
          landmark: formData.landmark || undefined,
          city: formData.city,
          state: formData.state,
          zipCode: formData.zipCode,
          country: formData.country,
          isDefault: savedAddresses.length === 0,
        }
        const created = await addressService.create(payload)
        setSavedAddresses((prev) => [created, ...prev])
        setSelectedAddressId(created.id)
        setSaveNewAddressToBook(false)
      } catch (err: any) {
        console.error("Failed to save address to book:", err)
        // Warn but do not block checkout — the form data is still valid for shipping
        setError(err?.message || "Could not save address to your address book — your details will still be used for this order")
      }
    }
    setCurrentStep((s) => s + 1)
  }

  const fetchPaymentSettings = async () => {
    try {
      const response = await paymentSettingsService.getPublicPaymentSettings()
      if (response.success && response.data) {
        setPaymentSettings(response.data)

        // Set default payment method based on what's enabled
        if (response.data.razorpayEnabled) {
          setFormData(prev => ({ ...prev, paymentMethod: 'razorpay' }))
        } else if (response.data.payuEnabled) {
          setFormData(prev => ({ ...prev, paymentMethod: 'payu' }))
        } else {
          // If no payment gateway is enabled, show error
          setError('No payment gateway is configured. Please contact support.')
        }
      }
    } catch (err: any) {
      console.error('Failed to load payment settings:', err)
      setError('Unable to load payment options. Please try again later.')
    }
  }

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      // Check if script already loaded
      if (window.Razorpay) {
        resolve(true)
        return
      }

      const script = document.createElement('script')
      script.src = 'https://checkout.razorpay.com/v1/checkout.js'
      script.onload = () => resolve(true)
      script.onerror = () => resolve(false)
      document.body.appendChild(script)
    })
  }

  /** Resolve the correct regional price for a checkout cart item */
  const getItemPrice = (item: CartItem) => {
    // Use variant regional pricing if variant exists, otherwise product pricing
    if (item.variant) {
      return getRegionalPrice(item.variant as any)
    }
    if (item.product) {
      return getRegionalPrice(item.product as any)
    }
    // Fallback to stored cart price
    return item.price
  }

  const calculateTotals = () => {
    // Round PER LINE, exactly as the server does (orderController: each itemTotal
    // is round2'd before being added to subtotal). Summing raw floats here and
    // rounding once at the end drifts a cent or two from the server's figure —
    // and since this total is what Razorpay charges while the server's is what
    // the invoice states, that gap is a real payment/invoice mismatch.
    const r2line = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100
    const subtotal = cartItems.reduce((sum, item) => sum + r2line(getItemPrice(item) * item.quantity), 0)
    // Calculate logistics-based shipping from product configs. The per-kg rates
    // are stored in RUPEES, so a USD order must convert — otherwise a ₹50 charge
    // would display as $50. Mirrors utils/logistics.js on the server, which is
    // what actually charges it.
    let logisticsShippingInr = 0;
    if (!freeShippingApplied) {
      for (const item of cartItems) {
        const config = (item.product as any)?.logisticsConfig;
        if (config) {
          // Price with the mode chosen in the cart; fall back to the only option
          // when there is no choice. Matches orderController's resolution exactly.
          const types = Array.isArray(config.transportTypes) ? config.transportTypes : [];
          const mode = ((item as any).transportType || types[0]) as 'AIR' | 'SHIP' | undefined;
          const result = calculateLogistics(config as LogisticsConfig, item.quantity, mode);
          logisticsShippingInr += result.totalShippingCost;
        }
      }
    }
    const shipping = freeShippingApplied
      ? 0
      : r2line(getCurrency() === 'USD' ? convertINRtoUSD(logisticsShippingInr) : logisticsShippingInr);
    // Same per-line rounding and same base (the rounded line total) the server
    // uses, so the tax shown here equals the tax the server will store.
    const tax = cartItems.reduce((sum, item) => {
      const itemSubtotal = r2line(getItemPrice(item) * item.quantity)
      const gstRate = item.product?.gstPercentage ? item.product.gstPercentage / 100 : 0
      return sum + r2line(itemSubtotal * gstRate)
    }, 0)

    // Round every component to 2dp BEFORE summing, mirroring the server
    // (orderController `round2`). Each line is displayed to 2dp, so summing the
    // raw floats produced a total that didn't match the lines shown above it
    // (e.g. 16.76 + 2.01 − 1.68 displayed as 17.10 instead of 17.09) and the
    // same drift then carried onto the invoice and the payment amount.
    const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100
    const roundedSubtotal = r2(subtotal)
    const roundedShipping = r2(shipping)
    const roundedTax = r2(tax)
    const roundedDiscount = r2(discountAmount)

    // Calculate total with discount, ensure >= 0
    const total = Math.max(
      0,
      r2(roundedSubtotal + roundedShipping + roundedTax - roundedDiscount)
    )

    setOrderSummary({
      subtotal: roundedSubtotal,
      shipping: roundedShipping,
      tax: roundedTax,
      discount: roundedDiscount,
      total
    })
  }

  const updateFormData = <K extends keyof CheckoutFormData>(field: K, value: CheckoutFormData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handlePlaceOrder = async () => {
    try {
      setPlacingOrder(true)
      setError(null)

      // Validate payment gateway is configured
      if (!paymentSettings?.razorpayEnabled && !paymentSettings?.payuEnabled) {
        setError('No payment gateway is configured. Please contact support.')
        setPlacingOrder(false)
        return
      }

      // Check for out of stock items
      const hasOutOfStock = cartItems.some((item) =>
        item.product?.inStock === false ||
        (item.product?.availableStock !== undefined && item.quantity > item.product?.availableStock)
      );
      if (hasOutOfStock) {
        setError("Some items in your cart are out of stock. Please return to the cart to remove them.");
        setPlacingOrder(false);
        return;
      }

      const shippingAddress = {
        firstName: formData.firstName,
        middleName: formData.middleName || "",
        lastName: formData.lastName,
        email: formData.email,
        phone: toE164(formData.phone, formData.country),
        street: formData.address,
        addressLine2: formData.addressLine2 || "",
        addressLine3: formData.addressLine3 || "",
        landmark: formData.landmark || "",
        city: formData.city,
        state: formData.state,
        zipCode: formData.zipCode,
        country: formData.country,
      }

      // Handle Razorpay payment
      if (formData.paymentMethod === 'razorpay') {
        await handleRazorpayPayment(shippingAddress)
      } else if (formData.paymentMethod === 'payu') {
        await handlePayUPayment(shippingAddress)
      } else {
        setError('Invalid payment method selected')
        setPlacingOrder(false)
      }

    } catch (err: any) {
      console.error(err)
      setError(err.message || "An error occurred while processing payment")
      setPlacingOrder(false)
    }
  }

  const handleRazorpayPayment = async (shippingAddress: any) => {
    try {
      // Check if Razorpay script is loaded
      if (!window.Razorpay) {
        const loaded = await loadRazorpayScript()
        if (!loaded) {
          throw new Error('Failed to load Razorpay SDK. Please check your internet connection.')
        }
      }

      // Create Razorpay order. Send the currency the total is actually quoted
      // in — the server converts USD → INR before charging. Hardcoding 'INR'
      // here charged a USD figure as rupees (a $9.39 order collected ₹9.39).
      const orderResponse = await paymentService.createRazorpayOrder(
        orderSummary.total,
        getCurrency()
      )

      if (!orderResponse.success) {
        throw new Error('Failed to initialize payment')
      }

      const { orderId, amount, currency, keyId } = orderResponse.data

      // Razorpay options
      const options = {
        key: keyId,
        amount: amount,
        currency: currency,
        name: 'M2C Marketplace',
        description: 'Order Payment',
        order_id: orderId,
        prefill: {
          name: `${formData.firstName} ${formData.lastName}`,
          email: formData.email,
          contact: formData.phone
        },
        theme: {
          color: '#222222'
        },
        handler: async function (response: any) {
          try {
            // Signature verification now happens inline inside createOrder
            // (one round trip instead of two — saves a Vercel cold-start
            // hop after the Razorpay handler fires).
            await createOrderAfterPayment(
              shippingAddress,
              response.razorpay_payment_id,
              response.razorpay_order_id,
              response.razorpay_signature,
            )
          } catch (error: any) {
            setError(error.message || 'Payment verification failed')
            setPlacingOrder(false)
          }
        },
        modal: {
          ondismiss: function () {
            setPlacingOrder(false)
            setError('Payment cancelled by user')
          }
        }
      }

      const razorpay = new window.Razorpay(options)
      razorpay.open()

    } catch (error: any) {
      throw error
    }
  }

  const handlePayUPayment = async (shippingAddress: any) => {
    // PayU integration - to be implemented
    setError('PayU payment is not yet implemented')
    setPlacingOrder(false)
  }

  const createOrderAfterPayment = async (
    shippingAddress: CreateOrderParams['shippingAddress'],
    paymentId: string,
    razorpayOrderId?: string,
    razorpaySignature?: string,
  ) => {
    try {
      const response = await orderService.createOrder({
        shippingAddress,
        paymentMethod: formData.paymentMethod,
        paymentId,
        razorpayOrderId,
        razorpaySignature,
        shippingCost: orderSummary.shipping,
        tax: orderSummary.tax,
        discount: orderSummary.discount,
        freeShipping: freeShippingApplied,
        // Required: the server re-validates this coupon and derives the discount
        // from it. Omitting it makes the server compute a zero discount, which
        // then fails the payment-amount reconciliation.
        couponCode: couponCode || undefined,
        currency: getCurrency(),
      })

      if (response.success && response.data) {
        // Hand the order off via sessionStorage so the confirmation page can
        // render immediately without re-fetching what we already have.
        stashRecentOrder(response.data)
        localStorage.removeItem('appliedCoupon')
        router.push(`/order-confirmation?id=${response.data.id}`)
      } else {
        localStorage.removeItem('appliedCoupon')
        router.push("/order-confirmation")
      }
    } catch (error: any) {
      throw new Error(error.message || 'Failed to create order')
    } finally {
      setPlacingOrder(false)
    }
  }

  const steps = [
    { id: 1, name: "Shipping", icon: Truck },
    { id: 2, name: "Payment", icon: CreditCard },
    { id: 3, name: "Review", icon: CheckCircle }
  ]

  const renderStepIndicator = () => (
    <div className="max-w-2xl mx-auto flex items-center justify-between sm:justify-center mb-5 sm:mb-6 lg:mb-8 bg-[#fdfdfd] px-3 sm:px-4 py-3 sm:py-4 rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      {steps.map((step, index) => (
        <div key={step.id} className="flex items-center min-w-0">
          <div className={`flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 shrink-0 transition-colors ${currentStep >= step.id
            ? "bg-[#e01a1b] border-[#e01a1b] text-white"
            : "border-slate-300 text-slate-400"
            }`}>
            {currentStep > step.id ? (
              <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" />
            ) : (
              <step.icon className="w-4 h-4 sm:w-5 sm:h-5" />
            )}
          </div>
          {/* Label: hidden on mobile, shown sm+; on mobile only show label for the active step */}
          <span className={`ml-2 text-xs sm:text-sm font-medium truncate ${currentStep >= step.id ? "text-[#e01a1b]" : "text-slate-400"} ${currentStep === step.id ? "inline" : "hidden sm:inline"}`}>
            {step.name}
          </span>
          {index < steps.length - 1 && (
            <div className={`flex-1 sm:flex-none sm:w-16 h-0.5 mx-2 sm:mx-4 min-w-4 ${currentStep > step.id ? "bg-[#e01a1b]" : "bg-slate-300"
              }`} />
          )}
        </div>
      ))}
    </div>
  )

  const renderShippingForm = () => {
    const canSaveMore = savedAddresses.length < MAX_SAVED_ADDRESSES
    const isAuthed = userAuthService.isAuthenticated()
    return (
      <div className="space-y-6">
        {savedAddresses.length > 0 && (
          <AddressSelector
            addresses={savedAddresses}
            selectedId={selectedAddressId}
            useNewAddress={useNewAddress}
            onSelect={handleSelectSavedAddress}
            onChooseNew={handleChooseNewAddress}
            onEdit={handleEditAddress}
            disabled={placingOrder}
          />
        )}

        {useNewAddress && (
          <>
            {savedAddresses.length > 0 && (
              <div className="border-t border-slate-200 pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-playfair text-base font-semibold text-[#1a1a1a]">
                    {editingAddressId ? "Edit shipping address" : "Enter new shipping address"}
                  </h3>
                  {editingAddressId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingAddressId(null)
                        setUseNewAddress(false)
                        if (selectedAddressId) {
                          const addr = savedAddresses.find(a => a.id === selectedAddressId)
                          if (addr) applySavedAddressToForm(addr)
                        }
                      }}
                      className="px-4 py-1.5 text-sm font-medium text-slate-700 bg-slate-100 border border-slate-300 rounded-lg hover:bg-slate-200 transition-colors"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            )}
            <ShippingForm
              formData={formData}
              updateFormData={updateFormData}
              disabled={placingOrder}
              onValidityChange={setShippingValid}
            />
            {isAuthed && !editingAddressId && canSaveMore && (
              <label className="flex items-center gap-3 cursor-pointer select-none pt-2">
                <input
                  type="checkbox"
                  checked={saveNewAddressToBook}
                  onChange={(e) => setSaveNewAddressToBook(e.target.checked)}
                  disabled={placingOrder}
                  className="w-4 h-4 accent-[#e01a1b]"
                />
                <span className="text-sm text-slate-700">
                  Save this address to my address book
                  <span className="text-slate-400 ml-1">
                    ({savedAddresses.length}/{MAX_SAVED_ADDRESSES} used)
                  </span>
                </span>
              </label>
            )}
            {isAuthed && !canSaveMore && (
              <p className="text-xs text-slate-500 pt-2">
                You&apos;ve reached the {MAX_SAVED_ADDRESSES}-address limit — this address won&apos;t be saved to your address book.
              </p>
            )}
          </>
        )}
      </div>
    )
  }

  const renderPaymentForm = () => (
    <PaymentForm formData={formData} updateFormData={updateFormData} paymentSettings={paymentSettings} />
  )

  const renderReview = () => (
    <ReviewOrder formData={formData} />
  )

  if (loading) {
    /* Skeleton mirrors the checkout layout (form on left, order summary on right). */
    return (
      <div className="min-h-screen bg-slate-50 py-4 sm:py-6 lg:py-8">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="lg:col-span-2 space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 lg:p-6 space-y-3">
                <div className="h-5 w-40 bg-gray-200 rounded animate-pulse" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                  {Array.from({ length: 4 }).map((_, j) => (
                    <div key={j} className="space-y-2">
                      <div className="h-3 w-20 bg-gray-100 rounded animate-pulse" />
                      <div className="h-10 w-full bg-gray-200 rounded animate-pulse" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 lg:p-6 space-y-4 h-fit">
            <div className="h-5 w-32 bg-gray-200 rounded animate-pulse" />
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex gap-3 items-center">
                <div className="w-12 h-12 bg-gray-200 rounded-lg animate-pulse shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse" />
                  <div className="h-3 w-1/2 bg-gray-100 rounded animate-pulse" />
                </div>
              </div>
            ))}
            <div className="border-t border-gray-100 pt-4 space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex justify-between">
                  <div className="h-4 w-20 bg-gray-100 rounded animate-pulse" />
                  <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
                </div>
              ))}
            </div>
            <div className="h-11 w-full bg-gray-200 rounded-lg animate-pulse" />
          </div>
        </div>
      </div>
    )
  }

  if (!loading && cartItems.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center max-w-md mx-auto p-8">
          <ShoppingBag className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h2 className="font-playfair text-2xl font-semibold text-[#1a1a1a] mb-2">Your cart is empty</h2>
          <p className="text-slate-500 mb-6">Add some items to your cart before proceeding to checkout.</p>
          <Link href="/products">
            <button className="btn-shine inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#e01a1b] text-white rounded-full hover:bg-[#c41617] shadow-[0_6px_20px_rgba(224,26,27,0.3)] hover:shadow-[0_12px_30px_rgba(224,26,27,0.45)] hover:-translate-y-0.5 transition-all duration-300 font-semibold">
              Browse Products
            </button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 py-4 sm:py-6 lg:py-8 font-sans">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
        {/* Header — Order-page style with icon */}
        <Reveal className="mb-5 sm:mb-6 lg:mb-8">
          <Link href="/cart">
            <button className="flex items-center gap-2 text-sm sm:text-base text-slate-600 hover:text-[#e01a1b] transition-colors mb-3 sm:mb-4">
              <ArrowLeft className="w-4 h-4" />
              Back to Cart
            </button>
          </Link>
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Lock className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 text-[#e01a1b] shrink-0" />
            <div className="min-w-0">
              <h1 className="font-playfair text-2xl sm:text-3xl lg:text-4xl font-semibold text-[#1a1a1a] mb-1 sm:mb-2">Checkout</h1>
              <p className="text-sm sm:text-base text-slate-600">Complete your purchase securely</p>
            </div>
          </div>
        </Reveal>

        {renderStepIndicator()}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6 lg:gap-8">
          {/* Checkout Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-[#c41617] bg-linear-to-r from-[#e01a1b] to-[#c41617]">
                <h2 className="font-playfair text-lg sm:text-xl font-semibold text-[#fffff4]">
                  {currentStep === 1 && "Shipping Information"}
                  {currentStep === 2 && "Payment Information"}
                  {currentStep === 3 && "Review Your Order"}
                </h2>
              </div>

              <div className="p-4 sm:p-5 lg:p-6">
                {error && (
                  <div className="mb-4 p-3 sm:p-4 bg-red-50 text-red-600 rounded-lg border border-red-200 text-sm">
                    {error}
                  </div>
                )}

                {currentStep === 1 && renderShippingForm()}
                {currentStep === 2 && renderPaymentForm()}
                {currentStep === 3 && renderReview()}

                {/* Navigation Buttons */}
                <div className="flex justify-between gap-3 mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-slate-200">
                  <button
                    onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
                    disabled={currentStep === 1 || placingOrder}
                    className="px-4 sm:px-6 py-2.5 sm:py-3 border border-slate-300 text-slate-700 font-medium rounded-lg sm:rounded-xl hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm sm:text-base"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => {
                      if (currentStep === 1 && !canAdvanceShipping) {
                        return;
                      }
                      if (currentStep < 3) {
                        if (currentStep === 1) {
                          void handleShippingStepAdvance()
                        } else {
                          setCurrentStep(currentStep + 1)
                        }
                      } else {
                        handlePlaceOrder()
                      }
                    }}
                    disabled={
                      placingOrder ||
                      cartItems.some(item =>
                        item.product?.inStock === false ||
                        (item.product?.availableStock !== undefined && item.quantity > item.product?.availableStock)
                      ) ||
                      itemsMissingTransport.length > 0 ||
                      (currentStep === 1 && !canAdvanceShipping)
                    }
                    className="btn-shine px-5 sm:px-6 lg:px-8 py-2.5 sm:py-3 bg-[#e01a1b] hover:bg-[#c41617] text-white font-semibold rounded-full transition-all duration-300 hover:-translate-y-0.5 shadow-[0_6px_20px_rgba(224,26,27,0.3)] hover:shadow-[0_12px_30px_rgba(224,26,27,0.45)] disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:translate-y-0 flex items-center gap-2 text-sm sm:text-base"
                  >
                    {placingOrder && <Loader2 className="w-4 h-4 animate-spin" />}
                    {currentStep === 3 ? (placingOrder ? "Placing Order..." : "Place Order") : "Continue"}
                  </button>
                  {/* A disabled button with no reason is a dead end — say what's wrong
                      and where to fix it. */}
                  {itemsMissingTransport.length > 0 && (
                    <p className="text-xs text-amber-700 mt-2 text-right">
                      Choose a shipping method for{" "}
                      {itemsMissingTransport.map((i) => i.product?.name).filter(Boolean).join(", ")} in your{" "}
                      <Link href="/cart" className="font-semibold underline">cart</Link>.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-slate-200 overflow-hidden lg:sticky lg:top-8">
              <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200 bg-linear-to-r from-slate-50 to-white">
                <h2 className="font-playfair text-lg sm:text-xl font-semibold text-[#1a1a1a]">Order Summary</h2>
              </div>

              <div className="p-4 sm:p-5 lg:p-6">

                {/* Cart Items Preview (Optional) */}
                <div className="mb-6 space-y-4 max-h-60 overflow-y-auto pr-2">
                  {cartItems.map((item) => {
                    const hasVariantImg = item.variant?.images && item.variant.images.length > 0;
                    const displayImgUrl = hasVariantImg
                      ? item.variant?.images?.[0]
                      : item.product?.images?.[0]?.url;

                    const itemColor = item.variant?.color || item.product?.singleUnitColor;
                    const itemSize = item.variant?.size || item.product?.singleUnitSize;
                    const itemColorHex = item.variant?.colorHex || item.product?.singleUnitColorHex;

                    return (
                      <div key={item.id} className="flex gap-3 text-sm border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                        <div className="w-16 h-16 bg-gray-100 rounded-md shrink-0 overflow-hidden">
                          {displayImgUrl ? (
                            <img src={displayImgUrl} alt={item.product?.name || "Product"} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">No Img</div>
                          )}
                        </div>
                        <div className="flex-1 flex flex-col justify-between">
                          <p className="font-medium text-slate-900 break-words">{item.product?.name || "Product"}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-slate-500">Qty: {item.quantity}</span>
                            {(itemColor || itemSize) && (
                              <div className="flex items-center gap-2 text-xs text-slate-500 ml-2">
                                {itemColor && (
                                  <span className="flex items-center gap-1">
                                    {itemColorHex && (
                                      <span
                                        className="w-2.5 h-2.5 rounded-full border border-slate-300 inline-block"
                                        style={{ backgroundColor: itemColorHex }}
                                      />
                                    )}
                                    {itemColor}
                                  </span>
                                )}
                                {itemColor && itemSize && <span>|</span>}
                                {itemSize && <span>Size: {itemSize}</span>}
                              </div>
                            )}
                          </div>
                        </div>
                        <span className="font-medium text-slate-900">{formatPrice(getItemPrice(item) * item.quantity)}</span>
                      </div>
                    )
                  })}
                </div>

                <div className="space-y-4 mb-6 border-t border-slate-200 pt-4">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Subtotal</span>
                    <span className="font-medium">{formatPrice(orderSummary.subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Shipping</span>
                    <span className="font-medium">
                      {orderSummary.shipping === 0 ? (
                        <span className="text-green-600 flex items-center gap-1">
                          <Truck className="w-4 h-4" />
                          Free
                        </span>
                      ) : (
                        `${formatPrice(orderSummary.shipping)}`
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Tax (GST)</span>
                    <span className="font-medium">{formatPrice(orderSummary.tax)}</span>
                  </div>
                  {orderSummary.discount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount</span>
                      <span className="font-medium">-{formatPrice(orderSummary.discount)}</span>
                    </div>
                  )}
                  <div className="border-t border-slate-200 pt-4">
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total</span>
                      <span>{formatPrice(orderSummary.total)}</span>
                    </div>
                    {/*
                      Our Razorpay account settles in INR, so a USD order is
                      converted server-side before the payment is created.
                      Say so here — otherwise the gateway suddenly quoting
                      rupees reads as a wrong amount. Same rate the server
                      uses, so the figure matches the actual charge.
                    */}
                    {getCurrency() === 'USD' && orderSummary.total > 0 && (
                      <p className="mt-1.5 text-xs text-slate-500">
                        Charged as {formatPrice(convertUSDtoINR(orderSummary.total), 'INR')} — billed in INR at today&apos;s exchange rate.
                      </p>
                    )}
                  </div>
                </div>

                {/* Security Badges */}
                <div className="space-y-3 pt-4 border-t border-slate-200">
                  <div className="flex items-center gap-3 text-sm text-slate-600">
                    <Lock className="w-4 h-4 text-green-600" />
                    <span>SSL Encrypted Checkout</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-slate-600">
                    <Shield className="w-4 h-4 text-blue-600" />
                    <span>Money Back Guarantee</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
