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
  Loader2
} from "lucide-react"
import ShippingForm from "./CheckoutProcess/ShippingForm"
import PaymentForm from "./CheckoutProcess/PaymentForm"
import ReviewOrder from "./CheckoutProcess/ReviewOrder"
import cartService, { CartItem } from "@/services/cartService"
import orderService from "@/services/orderService"
import paymentService from "@/services/paymentService"
import { userProfileService } from "@/services/userProfileService"
import { userAuthService } from "@/services/userAuthService"
import { paymentSettingsService, PublicPaymentSettings } from "@/services/paymentSettingsService"

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
  const [loading, setLoading] = useState(true)
  const [placingOrder, setPlacingOrder] = useState(false)
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const [paymentSettings, setPaymentSettings] = useState<PublicPaymentSettings | null>(null)

  const [formData, setFormData] = useState<CheckoutFormData>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
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

        // Split name into first and last name
        const nameParts = userData.name?.split(' ') || ['', '']
        const firstName = nameParts[0] || ''
        const lastName = nameParts.slice(1).join(' ') || ''

        // Pre-fill form with user data
        setFormData(prev => ({
          ...prev,
          firstName,
          lastName,
          email: userData.email,
          phone: userData.phoneNumber || '',
          address: userData.address || '',
          city: userData.city || '',
          state: userData.state || '',
          zipCode: userData.zipCode || '',
          country: userData.country || 'United States'
        }))
      }
    } catch (err: any) {
      console.error('Failed to load user profile:', err)
      // Don't show error to user, just log it
      // User can still manually enter address
    }
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

  const calculateTotals = () => {
    const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    const shipping = freeShippingApplied ? 0 : 0 // Free shipping if applied, otherwise standard free shipping
    const tax = cartItems.reduce((sum, item) => {
      const itemSubtotal = item.price * item.quantity
      const gstRate = item.product?.gstPercentage ? item.product.gstPercentage / 100 : 0
      return sum + (itemSubtotal * gstRate)
    }, 0)
    // Calculate total with discount, ensure >= 0
    const total = Math.max(0, subtotal + shipping + tax - discountAmount)

    setOrderSummary({
      subtotal,
      shipping,
      tax,
      discount: discountAmount,
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
        freeShipping: freeShippingApplied
      })

      if (response.success && response.data) {
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

  const renderShippingForm = () => (
    <ShippingForm formData={formData} updateFormData={updateFormData} />
  )

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
                      if (currentStep < 3) {
                        setCurrentStep(currentStep + 1)
                      } else {
                        handlePlaceOrder()
                      }
                    }}
                    disabled={
                      placingOrder ||
                      cartItems.some(item =>
                        item.product?.inStock === false ||
                        (item.product?.availableStock !== undefined && item.quantity > item.product?.availableStock)
                      )
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
                            {item.variant && (
                              <div className="flex items-center gap-2 text-xs text-slate-500 ml-2">
                                <span className="flex items-center gap-1">
                                  {item.variant.colorHex && (
                                    <span
                                      className="w-2.5 h-2.5 rounded-full border border-slate-300 inline-block"
                                      style={{ backgroundColor: item.variant.colorHex }}
                                    />
                                  )}
                                  {item.variant.color}
                                </span>
                                <span>|</span>
                                <span>Size: {item.variant.size}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <span className="font-medium text-slate-900">${(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                    )
                  })}
                </div>

                <div className="space-y-4 mb-6 border-t border-slate-200 pt-4">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Subtotal</span>
                    <span className="font-medium">${orderSummary.subtotal.toFixed(2)}</span>
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
                        `$${orderSummary.shipping.toFixed(2)}`
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Tax (GST)</span>
                    <span className="font-medium">${orderSummary.tax.toFixed(2)}</span>
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
                            <span>${itemTax.toFixed(2)}</span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                  {orderSummary.discount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount</span>
                      <span className="font-medium">-${orderSummary.discount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="border-t border-slate-200 pt-4">
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total</span>
                      <span>${orderSummary.total.toFixed(2)}</span>
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
