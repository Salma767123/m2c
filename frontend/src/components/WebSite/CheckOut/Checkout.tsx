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
import { formatPrice, getCurrency, getRegionalPrice } from '@/lib/currency'
import bagTypeService from "@/services/bagTypeService"
import ShippingForm from "./CheckoutProcess/ShippingForm"
import PaymentForm from "./CheckoutProcess/PaymentForm"
import ReviewOrder from "./CheckoutProcess/ReviewOrder"
import AddressSelector from "./CheckoutProcess/AddressSelector"
import cartService, { CartItem } from "@/services/cartService"
import orderService from "@/services/orderService"
import paymentService from "@/services/paymentService"
import { userProfileService } from "@/services/userProfileService"
import { userAuthService } from "@/services/userAuthService"
import { paymentSettingsService, PublicPaymentSettings } from "@/services/paymentSettingsService"
import { addressService, MAX_SAVED_ADDRESSES, type SavedAddress, type AddressPayload } from "@/services/addressService"

// Declare Razorpay type for TypeScript
declare global {
  interface Window {
    Razorpay: any;
  }
}

export interface CheckoutFormData {
  // Shipping Information
  firstName: string
  lastName: string
  email: string
  phone: string
  address: string
  addressLine2: string
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
    lastName: "",
    email: "",
    phone: "",
    address: "",
    addressLine2: "",
    city: "",
    state: "",
    zipCode: "",
    country: "United States",
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

  const [selectedBagTypeId, setSelectedBagTypeId] = useState<string | null>(null)
  const [bagTypeName, setBagTypeName] = useState("")
  const [bagTypePrice, setBagTypePrice] = useState(0)

  const [orderSummary, setOrderSummary] = useState({
    subtotal: 0,
    shipping: 0,
    tax: 0,
    discount: 0,
    bagCost: 0,
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

    // Load selected bag type — use localStorage for ID, then re-validate price from API
    const savedBag = localStorage.getItem('selectedBagType')
    if (savedBag) {
      try {
        const { id, name, price } = JSON.parse(savedBag)
        setSelectedBagTypeId(id)
        setBagTypeName(name)
        setBagTypePrice(price) // Temporary — will be corrected below from API

        // Re-fetch the bag type from API to get the correct regional price
        bagTypeService.getActiveBagTypes().then(res => {
          if (res.success && res.data) {
            const liveBag = res.data.find(b => b.id === id)
            if (liveBag) {
              const correctPrice = getRegionalPrice({ basePrice: liveBag.price, priceINR: liveBag.priceINR, priceUSD: liveBag.priceUSD })
              setBagTypeName(liveBag.name)
              setBagTypePrice(correctPrice)
              // Update localStorage with correct price
              localStorage.setItem('selectedBagType', JSON.stringify({ id: liveBag.id, name: liveBag.name, price: correctPrice }))
            } else {
              // Bag no longer active — clear selection
              setSelectedBagTypeId(null)
              setBagTypeName('')
              setBagTypePrice(0)
              localStorage.removeItem('selectedBagType')
            }
          }
        }).catch(() => { /* keep localStorage value as fallback */ })
      } catch {
        localStorage.removeItem('selectedBagType')
      }
    }
  }, [])

  useEffect(() => {
    calculateTotals()
  }, [cartItems, formData.shippingMethod, discountAmount, bagTypePrice])

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

        // Split name into first and last name
        const nameParts = userData.name?.split(' ') || ['', '']
        const firstName = nameParts[0] || ''
        const lastName = nameParts.slice(1).join(' ') || ''

        // Pre-fill personal info only. Shipping address is sourced from saved addresses
        // (see fetchSavedAddresses) so it isn't overridden by legacy flat User.address fields.
        setFormData(prev => ({
          ...prev,
          firstName: prev.firstName || firstName,
          lastName: prev.lastName || lastName,
          email: userData.email,
          phone: prev.phone || userData.phoneNumber || '',
        }))
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
    const nameParts = (addr.name || "").trim().split(/\s+/)
    const firstName = nameParts[0] || ""
    const lastName = nameParts.slice(1).join(" ") || ""
    setFormData((prev) => ({
      ...prev,
      firstName,
      lastName,
      phone: addr.phone || prev.phone,
      address: addr.address || "",
      addressLine2: addr.addressLine2 || "",
      city: addr.city || "",
      state: addr.state || "",
      zipCode: addr.zipCode || "",
      country: addr.country || "United States",
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
      lastName: "",
      phone: "",
      address: "",
      addressLine2: "",
      city: "",
      state: "",
      zipCode: "",
      country: "United States",
    }))
  }

  // True when Step 1 can proceed: either a saved address is selected, or the new-address form is valid.
  const canAdvanceShipping = useNewAddress ? shippingValid : !!selectedAddressId

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
          name: `${formData.firstName} ${formData.lastName}`.trim(),
          phone: formData.phone,
          address: formData.address,
          addressLine2: formData.addressLine2 || undefined,
          city: formData.city,
          state: formData.state,
          zipCode: formData.zipCode,
          country: "United States",
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
          name: `${formData.firstName} ${formData.lastName}`.trim(),
          phone: formData.phone,
          address: formData.address,
          addressLine2: formData.addressLine2 || undefined,
          city: formData.city,
          state: formData.state,
          zipCode: formData.zipCode,
          country: "United States",
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
    const subtotal = cartItems.reduce((sum, item) => sum + (getItemPrice(item) * item.quantity), 0)
    // Calculate logistics-based shipping from product configs
    let logisticsShipping = 0;
    if (!freeShippingApplied) {
      for (const item of cartItems) {
        const config = (item.product as any)?.logisticsConfig;
        if (config) {
          const result = calculateLogistics(config as LogisticsConfig, item.quantity);
          logisticsShipping += result.totalShippingCost;
        }
      }
    }
    const shipping = freeShippingApplied ? 0 : logisticsShipping;
    const tax = cartItems.reduce((sum, item) => {
      const itemSubtotal = getItemPrice(item) * item.quantity
      const gstRate = item.product?.gstPercentage ? item.product.gstPercentage / 100 : 0
      return sum + (itemSubtotal * gstRate)
    }, 0)
    // Calculate total with discount + bag cost, ensure >= 0
    const total = Math.max(0, subtotal + shipping + tax - discountAmount + bagTypePrice)

    setOrderSummary({
      subtotal,
      shipping,
      tax,
      discount: discountAmount,
      bagCost: bagTypePrice,
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
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        street: formData.address,
        addressLine2: formData.addressLine2 || "",
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

      // Create Razorpay order
      const orderResponse = await paymentService.createRazorpayOrder(
        orderSummary.total,
        'INR'
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
            // Verify payment
            const verifyResponse = await paymentService.verifyRazorpayPayment(
              response.razorpay_order_id,
              response.razorpay_payment_id,
              response.razorpay_signature
            )

            if (verifyResponse.success) {
              // Create order after successful payment
              await createOrderAfterPayment(shippingAddress, response.razorpay_payment_id)
            } else {
              throw new Error('Payment verification failed')
            }
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

  const createOrderAfterPayment = async (shippingAddress: any, paymentId: string) => {
    try {
      const response = await orderService.createOrder({
        shippingAddress,
        paymentMethod: formData.paymentMethod,
        paymentId,
        shippingCost: orderSummary.shipping,
        tax: orderSummary.tax,
        discount: orderSummary.discount,
        freeShipping: freeShippingApplied,
        bagTypeId: selectedBagTypeId || undefined,
        currency: getCurrency(),
      })

      if (response.success && response.data) {
        localStorage.removeItem('appliedCoupon')
        localStorage.removeItem('selectedBagType')
        router.push(`/order-confirmation?id=${response.data.id}`)
      } else {
        localStorage.removeItem('appliedCoupon')
        localStorage.removeItem('selectedBagType')
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
    <div className="max-w-2xl mx-auto flex items-center justify-center mb-8 bg-[#fdfdfd] px-4 py-4 rounded-xl shadow-sm border border-slate-200">
      {steps.map((step, index) => (
        <div key={step.id} className="flex items-center">
          <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${currentStep >= step.id
            ? "bg-gray-800 border-gray-800 text-white"
            : "border-slate-300 text-slate-400"
            }`}>
            {currentStep > step.id ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <step.icon className="w-5 h-5" />
            )}
          </div>
          <span className={`ml-2 text-sm font-medium ${currentStep >= step.id ? "text-gray-800" : "text-slate-400"
            }`}>
            {step.name}
          </span>
          {index < steps.length - 1 && (
            <div className={`w-16 h-0.5 mx-4 ${currentStep > step.id ? "bg-gray-800" : "bg-slate-300"
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
                  <h3 className="text-sm font-semibold text-slate-900">
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
                  className="w-4 h-4 accent-gray-800"
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
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-gray-800" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/cart">
            <button className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-4">
              <ArrowLeft className="w-4 h-4" />
              Back to Cart
            </button>
          </Link>
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Checkout</h1>
          <p className="text-slate-600">Complete your purchase securely</p>
        </div>

        {renderStepIndicator()}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Checkout Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 bg-linear-to-r from-gray-700 to-gray-800">
                <h2 className="text-xl font-bold text-[#fffff4]">
                  {currentStep === 1 && "Shipping Information"}
                  {currentStep === 2 && "Payment Information"}
                  {currentStep === 3 && "Review Your Order"}
                </h2>
              </div>

              <div className="p-6">
                {error && (
                  <div className="mb-4 p-4 bg-red-50 text-red-600 rounded-lg border border-red-200 text-sm">
                    {error}
                  </div>
                )}

                {currentStep === 1 && renderShippingForm()}
                {currentStep === 2 && renderPaymentForm()}
                {currentStep === 3 && renderReview()}

                {/* Navigation Buttons */}
                <div className="flex justify-between mt-8 pt-6 border-t border-slate-200">
                  <button
                    onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
                    disabled={currentStep === 1 || placingOrder}
                    className="px-6 py-3 border border-slate-300 text-slate-700 font-medium rounded-xl hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
                      (currentStep === 1 && !canAdvanceShipping)
                    }
                    className="px-8 py-3 bg-linear-to-r from-gray-700 to-gray-800 hover:from-gray-800 hover:to-gray-900 text-white font-semibold rounded-xl transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-md hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {placingOrder && <Loader2 className="w-4 h-4 animate-spin" />}
                    {currentStep === 3 ? (placingOrder ? "Placing Order..." : "Place Order") : "Continue"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden sticky top-8">
              <div className="px-6 py-4 border-b border-slate-200 bg-linear-to-r from-slate-50 to-white">
                <h2 className="text-xl font-bold text-slate-900">Order Summary</h2>
              </div>

              <div className="p-6">

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
                          <p className="font-medium text-slate-900 line-clamp-1">{item.product?.name || "Product"}</p>
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

                  {/* Bag Add-on */}
                  {bagTypeName && bagTypePrice > 0 && (
                    <div className="flex items-center justify-between px-1 py-2 text-sm text-slate-600">
                      <div className="flex items-center gap-2">
                        <ShoppingBag className="w-4 h-4 text-amber-600" />
                        <span>Bag: {bagTypeName}</span>
                      </div>
                      <span className="font-medium text-slate-900">{formatPrice(bagTypePrice)}</span>
                    </div>
                  )}
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
                  {/* GST Breakdown by Product */}
                  {cartItems.some(item => item.product?.gstPercentage) && (
                    <div className="pl-4 space-y-1">
                      {cartItems.map((item) => {
                        if (!item.product?.gstPercentage) return null
                        const itemSubtotal = item.price * item.quantity
                        const itemTax = itemSubtotal * (item.product.gstPercentage / 100)
                        return (
                          <div key={item.id} className="flex justify-between text-xs text-slate-500">
                            <span className="truncate max-w-[150px]">{item.product.name} ({item.product.gstPercentage}%)</span>
                            <span>{formatPrice(itemTax)}</span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                  {orderSummary.discount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount</span>
                      <span className="font-medium">-{formatPrice(orderSummary.discount)}</span>
                    </div>
                  )}
                  {orderSummary.bagCost > 0 && (
                    <div className="flex justify-between">
                      <span className="text-slate-600">Bag ({bagTypeName})</span>
                      <span className="font-medium">{formatPrice(orderSummary.bagCost)}</span>
                    </div>
                  )}
                  <div className="border-t border-slate-200 pt-4">
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total</span>
                      <span>{formatPrice(orderSummary.total)}</span>
                    </div>
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
