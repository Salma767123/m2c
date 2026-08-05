"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import Image from "next/image"
import { cartService } from "@/services/cartService"
import { couponService } from "@/services/couponService"
import { publicProductService, PublicProduct } from "@/services/publicProductService"
import { userAuthService } from "@/services/userAuthService"
import { showSuccessToast, showErrorToast } from "@/lib/toast-utils"
import { formatPrice, getRegionalPrice, getRegionalOriginalPrice, getCurrency, getRegion, convertINRtoUSD } from "@/lib/currency"
import { applyOfferToPrice, type ActiveOffer } from "@/lib/offers"
import { calculateLogistics, type LogisticsConfig } from "@/lib/logistics"
import { courierName } from "@/lib/couriers"
import Reveal from "@/components/WebSite/Shared/Reveal"
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  Truck,
  Shield,
  Star,
  Heart,
  Share2,
  ArrowRight,
  Package,
  Clock,
  CheckCircle,
} from "lucide-react"

interface OrderItem {
  id: string
  productId: string
  name: string
  price: number
  originalPrice?: number
  /** Automatic offer applied to this line + the pre-offer price to strike through. */
  activeOffer?: ActiveOffer
  offerStrikePrice?: number
  images: string[]
  category: string
  rating?: number
  reviews?: number
  inStock: boolean
  quantity: number
  description?: string
  availableStock?: number
  material?: string
  discount?: number
  gstPercentage?: number
  /** Chosen shipping mode for this line. Required when the product offers a choice. */
  transportType?: 'AIR' | 'SHIP' | null
  /** Chosen courier partner id (see lib/couriers). Required for shipping products. */
  courier?: string | null
  variantDetails?: {
    size: string
    color: string
    colorHex?: string
    sku: string
  }
}

interface OrderSummary {
  subtotal: number
  shipping: number
  tax: number
  discount: number
  total: number
}

export default function Order() {
  const [cartItems, setCartItems] = useState<OrderItem[]>([])
  const [isHydrated, setIsHydrated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  const pendingUpdates = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  useEffect(() => {
    const fetchCart = async () => {
      try {
        setLoading(true)
        const authenticated = userAuthService.isAuthenticated()
        setIsAuthenticated(authenticated)

        if (!authenticated) {
          // Fetch from local storage for guest users
          const localCart = cartService.getLocalCart()
          const itemsPromises = localCart.map(async (item) => {
            try {
              const productRes = await publicProductService.getProduct(item.productId)
              if (productRes.success && productRes.data) {
                const product = productRes.data

                // If local cart has variantId, find the variant data inside the public product
                let variantDetails = undefined;
                let finalPrice = getRegionalPrice(product as any);
                let finalImages = product.images.map(img => img.url);
                let stock = product.totalStock;

                if (item.variantId && product.variants) {
                  const foundVariant = product.variants.find((v: any) => v.id === item.variantId);
                  if (foundVariant) {
                    variantDetails = {
                      size: foundVariant.size,
                      color: foundVariant.color,
                      colorHex: foundVariant.colorHex,
                      sku: foundVariant.sku
                    };
                    finalPrice = foundVariant.price;
                    stock = foundVariant.stock;
                    if (foundVariant.images && foundVariant.images.length > 0) {
                      finalImages = foundVariant.images;
                    }
                  }
                } else if ((product as any).singleUnitSize || (product as any).singleUnitColor) {
                  variantDetails = {
                    size: (product as any).singleUnitSize || '',
                    color: (product as any).singleUnitColor || '',
                    colorHex: (product as any).singleUnitColorHex,
                    sku: product.baseSku
                  };
                }

                // Automatic offer (attached by the public product endpoint).
                const activeOffer: ActiveOffer | undefined = (product as any).activeOffer;
                const effectivePrice = activeOffer
                  ? applyOfferToPrice(finalPrice, activeOffer, getCurrency(), item.quantity, convertINRtoUSD)
                  : finalPrice;
                const offerStrikePrice = activeOffer && effectivePrice < finalPrice ? finalPrice : undefined;

                return {
                  id: item.id, // Use local cart item ID
                  productId: item.productId,
                  name: product.name,
                  price: effectivePrice,
                  originalPrice: getRegionalOriginalPrice(product as any) ?? undefined,
                  activeOffer,
                  offerStrikePrice,
                  images: finalImages,
                  category: product.category,
                  rating: product.rating,
                  reviews: product.reviews,
                  inStock: product.inStock,
                  quantity: item.quantity,
                  availableStock: stock,
                  description: product.description,
                  material: product.material,
                  discount: product.discount,
                  gstPercentage: product.gstPercentage,
                  variantDetails,
                  product: product,
                }
              }
            } catch (err) {
              console.error(`Failed to fetch product ${item.productId}`, err)
            }
            return null
          })

          const resolvedItems = await Promise.all(itemsPromises)
          const items = resolvedItems.filter((item) => item !== null) as OrderItem[]
          setCartItems(items)
        } else {
          // Fetch from backend for authenticated users
          const response = await cartService.getCart()
          if (response.success && response.data) {
            const items = response.data.items.map((item: any) => {
              const hasVariant = !!item.variant;
              const hasVariantImg = hasVariant && item.variant.images?.length > 0;
              const hasProductImg = item.product?.images?.length > 0;

              const imgArray = hasVariantImg
                ? item.variant.images
                : (hasProductImg ? item.product.images.map((img: any) => img.url) : []);

              // Use live regional pricing
              const livePrice = hasVariant
                ? getRegionalPrice(item.variant as any)
                : getRegionalPrice(item.product as any);

              // Variant stock takes priority
              const liveStock = hasVariant
                ? item.variant.stock
                : (item.product?.availableStock ?? item.product?.totalStock);

              // Variant-specific discount/originalPrice (region-aware)
              const liveOriginalPrice = hasVariant
                ? getRegionalOriginalPrice(item.variant as any) ?? getRegionalOriginalPrice(item.product as any)
                : getRegionalOriginalPrice(item.product as any);
              const liveDiscount = hasVariant
                ? (item.variant.discount ?? item.product?.discount)
                : item.product?.discount;

              // Automatic offer (attached by the backend). Bake it into `price` so the
              // subtotal, tax and coupon math all use exactly what checkout will charge.
              const activeOffer: ActiveOffer | undefined = item.product?.activeOffer;
              const effectivePrice = activeOffer
                ? applyOfferToPrice(livePrice, activeOffer, getCurrency(), item.quantity, convertINRtoUSD)
                : livePrice;
              const offerStrikePrice = activeOffer && effectivePrice < livePrice ? livePrice : undefined;

              return {
                id: item.id,
                productId: item.productId,
                name: item.product?.name || 'Unknown Product',
                price: effectivePrice,
                originalPrice: liveOriginalPrice ?? undefined,
                activeOffer,
                offerStrikePrice,
                images: imgArray,
                category: item.product?.category || '',
                rating: item.product?.rating,
                reviews: item.product?.reviews,
                inStock: liveStock > 0 && (item.product?.inStock ?? true),
                availableStock: liveStock,
                quantity: item.quantity,
                description: item.product?.description,
                material: item.product?.material,
                discount: liveDiscount,
                gstPercentage: item.product?.gstPercentage,
                transportType: item.transportType ?? null,
                courier: item.courier ?? null,
                variantDetails: hasVariant ? {
                  size: item.variant.size,
                  color: item.variant.color,
                  colorHex: item.variant.colorHex,
                  sku: item.variant.sku
                } : (item.product?.singleUnitSize || item.product?.singleUnitColor) ? {
                  size: item.product.singleUnitSize || '',
                  color: item.product.singleUnitColor || '',
                  colorHex: item.product.singleUnitColorHex,
                  sku: item.product.baseSku || ''
                } : undefined,
                product: item.product || null,
              }
            })
            setCartItems(items)
          }
        }
      } catch (error) {
        console.error('Failed to fetch cart:', error)
        showErrorToast('Error', 'Failed to load cart items')
      } finally {
        setLoading(false)
        setIsHydrated(true)
      }
    }

    fetchCart()
  }, [])

  const [promoCode, setPromoCode] = useState("")
  const [appliedPromo, setAppliedPromo] = useState("")
  const [discountAmount, setDiscountAmount] = useState(0)
  const [freeShippingApplied, setFreeShippingApplied] = useState(false)
  const [freeShippingMessage, setFreeShippingMessage] = useState("")

  useEffect(() => {
    const savedCoupon = localStorage.getItem('appliedCoupon')
    if (savedCoupon) {
      try {
        const { code, discountAmount, freeShipping, freeShippingMessage } = JSON.parse(savedCoupon)
        setAppliedPromo(code)
        setDiscountAmount(discountAmount || 0)
        setFreeShippingApplied(freeShipping || false)
        setFreeShippingMessage(freeShippingMessage || "")
      } catch {
        localStorage.removeItem('appliedCoupon')
      }
    }
    
    // Check for free shipping offers automatically
    checkFreeShippingOffers()
  }, [cartItems, isAuthenticated]) // Add dependencies

  // Check free shipping offers automatically
  const checkFreeShippingOffers = async () => {
    if (!isAuthenticated) return // Only for authenticated users
    
    try {
      const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
      const userData = JSON.parse(localStorage.getItem('userData') || '{}')
      
      if (userData.id && subtotal > 0) {
        const response = await couponService.applyFreeShippingOffer(userData.id, subtotal)
        
        if (response.success && response.data?.freeShipping) {
          setFreeShippingApplied(true)
          setFreeShippingMessage(response.message || "Free shipping available!")
          
          // Save free shipping info
          const currentCoupon = localStorage.getItem('appliedCoupon')
          const couponData = currentCoupon ? JSON.parse(currentCoupon) : {}
          localStorage.setItem('appliedCoupon', JSON.stringify({
            ...couponData,
            freeShipping: true,
            freeShippingMessage: response.message
          }))
        }
      }
    } catch (error) {
      console.warn('Free shipping check failed:', error)
    }
  }

  if (!isHydrated || loading) {
    return (
      <div className="min-h-screen bg-slate-50 py-4 sm:py-6 lg:py-8 font-sans">
        <div className="max-w-7xl xl:max-w-420 mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
          <div className="mb-5 sm:mb-6 lg:mb-8">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <ShoppingCart className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 text-[#e01a1b] shrink-0" />
                <div className="min-w-0">
                  <h1 className="font-playfair text-2xl sm:text-3xl lg:text-4xl font-semibold text-[#1a1a1a] mb-1 sm:mb-2">Shopping Cart</h1>
                  <p className="text-sm sm:text-base text-slate-600">Review your items and proceed to checkout</p>
                </div>
              </div>
            </div>
          </div>
          <div className="animate-pulse space-y-3 sm:space-y-4">
            <div className="h-24 sm:h-32 bg-slate-200 rounded-xl sm:rounded-2xl"></div>
            <div className="h-24 sm:h-32 bg-slate-200 rounded-xl sm:rounded-2xl"></div>
            <div className="h-24 sm:h-32 bg-slate-200 rounded-xl sm:rounded-2xl"></div>
          </div>
        </div>
      </div>
    )
  }

  /** Transport modes a product offers. >1 means the customer must choose. */
  const transportOptionsFor = (item: OrderItem): Array<'AIR' | 'SHIP'> => {
    const types = (item as any).product?.logisticsConfig?.transportTypes
    return Array.isArray(types) ? types : []
  }

  /** A line still needs a shipping decision (transport and/or courier) before checkout. */
  const needsTransportChoice = (item: OrderItem) => {
    const opts = transportOptionsFor(item)
    if (opts.length === 0) return false // no logistics — nothing to choose
    if (opts.length > 1 && !item.transportType) return true // must pick a mode
    return !item.courier // shipping products must have a courier
  }

  const updateQuantity = (id: string, productId: string, newQuantity: number) => {
    if (newQuantity < 1) {
      removeItem(id)
      return
    }

    // Clamp to available stock
    const item = cartItems.find(i => i.id === id)
    if (item?.availableStock != null && newQuantity > item.availableStock) {
      newQuantity = item.availableStock
    }
    if (item && newQuantity === item.quantity) return

    // Optimistic update — instant UI feedback
    setCartItems(items =>
      items.map(i => i.id === id ? { ...i, quantity: newQuantity } : i)
    )

    // Debounce API call — rapid clicks coalesce into one request
    if (pendingUpdates.current[id]) clearTimeout(pendingUpdates.current[id])
    pendingUpdates.current[id] = setTimeout(async () => {
      delete pendingUpdates.current[id]
      try {
        if (isAuthenticated) {
          await cartService.updateCartItem(id, newQuantity)
        } else {
          cartService.updateLocalCartItem(id, newQuantity)
        }
      } catch {
        // Rollback on failure — re-fetch cart
        showErrorToast('Error', 'Failed to update quantity')
        const response = await cartService.getCart()
        if (response.success && response.data) {
          // Re-run the mapping (simplified — just update quantity)
          setCartItems(items =>
            items.map(i => {
              const serverItem = response.data!.items.find((s: { id: string; quantity: number }) => s.id === i.id)
              return serverItem ? { ...i, quantity: serverItem.quantity } : i
            })
          )
        }
      }
    }, 400)
  }

  const removeItem = async (id: string) => {
    try {
      if (!isAuthenticated) {
        cartService.removeFromLocalCart(id)
        setCartItems(items => items.filter(item => item.id !== id))
        showSuccessToast('Removed', 'Item removed from cart')
        return
      }

      // Remove via API
      await cartService.removeFromCart(id)
      setCartItems(items => items.filter(item => item.id !== id))
      showSuccessToast('Removed', 'Item removed from cart')
      } catch (error: unknown) {
        console.error('Failed to remove item:', error)
        showErrorToast('Error', 'Failed to remove item')
      }
  }

  const applyPromoCode = async () => {
    if (!promoCode.trim()) {
      showErrorToast("Error", "Please enter a promo code")
      return;
    }

    try {
      // Calculate subtotal for validation
      const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)

      const response = await couponService.applyCoupon(promoCode, subtotal, getCurrency())

      if (response.success && response.data) {
        setAppliedPromo(response.data.code)
        // Ensure discount doesn't exceed total (though backend handles this, good to be safe)
        setDiscountAmount(response.data.discountAmount)
        setPromoCode("") // Clear input field
        showSuccessToast("Success", `Coupon "${response.data.code}" applied! You saved ${formatPrice(response.data.discountAmount)}`)

        // Save to local storage for Checkout page to retrieve
        localStorage.setItem('appliedCoupon', JSON.stringify({
          code: response.data.code,
          discountAmount: response.data.discountAmount,
          freeShipping: response.data.freeShipping || false,
          freeShippingMessage: response.data.freeShipping ? "Free shipping included!" : ""
        }))
      } else {
        throw new Error(response.message || "Invalid coupon")
      }
      } catch (error: unknown) {
        console.error("Coupon error:", error)
        setAppliedPromo("")
        setDiscountAmount(0)
        localStorage.removeItem('appliedCoupon')
        const errorMessage = error instanceof Error ? error.message : "Failed to apply coupon"
        showErrorToast("Error", errorMessage)
      }
  }

  // Remove coupon
  const removeCoupon = () => {
    setAppliedPromo("")
    setDiscountAmount(0)
    setFreeShippingApplied(false)
    setFreeShippingMessage("")
    localStorage.removeItem('appliedCoupon')
    showSuccessToast("Removed", "Coupon removed")
  }

  const calculateSummary = (): OrderSummary => {
    const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    // Calculate logistics-based shipping from product configs
    // Per-kg rates are stored in RUPEES — convert for a USD cart so the figure
    // matches what checkout quotes and what the server charges.
    let logisticsShippingInr = 0
    if (!freeShippingApplied) {
      for (const item of cartItems) {
        const config = (item as any).product?.logisticsConfig
        if (config) {
          // Price with the mode the customer picked; fall back to the only option
          // when there is no choice. Matches orderController's resolution exactly.
          const types = Array.isArray(config.transportTypes) ? config.transportTypes : []
          const mode = (item.transportType || types[0]) as 'AIR' | 'SHIP' | undefined
          const result = calculateLogistics(config as LogisticsConfig, item.quantity, mode, getRegion())
          logisticsShippingInr += result.totalShippingCost
        }
      }
    }
    const shipping = freeShippingApplied
      ? 0
      : (getCurrency() === 'USD' ? convertINRtoUSD(logisticsShippingInr) : logisticsShippingInr)
    const discount = discountAmount

    // Calculate tax based on individual product GST percentages
    const tax = cartItems.reduce((sum, item) => {
      const itemSubtotal = item.price * item.quantity
      const gstRate = item.gstPercentage ? item.gstPercentage / 100 : 0
      return sum + (itemSubtotal * gstRate)
    }, 0)

    const total = subtotal + shipping + tax - discount

    return { subtotal, shipping, tax, discount, total: total > 0 ? total : 0 }
  }

  const summary = calculateSummary()

  return (
    <div className="min-h-screen bg-slate-50 py-4 sm:py-6 lg:py-8 font-sans">
      <div className="max-w-7xl xl:max-w-420 mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
        {/* Header — Order-page style with icon + count */}
        <div className="mb-5 sm:mb-6 lg:mb-8">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <ShoppingCart className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 text-[#e01a1b] shrink-0" />
              <div className="min-w-0">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 mb-1 sm:mb-2">Shopping Cart</h1>
                <p className="text-sm sm:text-base text-slate-600">Review your items and proceed to checkout</p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xl sm:text-2xl font-bold text-slate-900">{cartItems.length}</p>
              <p className="text-xs sm:text-sm text-slate-600">Items</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6 lg:gap-8">
          {/* Cart Items — Order-page style: each item its own card with gaps between */}
          <div className="lg:col-span-2">
            {cartItems.length > 0 && (
              <div className="space-y-3 sm:space-y-4 lg:space-y-6">
                {cartItems.map((item) => (
                  <div key={item.id} className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-5 lg:p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-start gap-3 sm:gap-4">
                      {/* Product Image */}
                      <div className="shrink-0">
                        {item.images && item.images.length > 0 ? (
                          <Image
                            src={item.images[0]}
                            alt={item.name}
                            width={96}
                            height={96}
                            className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 object-cover rounded-lg sm:rounded-xl border border-slate-200"
                          />
                        ) : (
                          <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 flex items-center justify-center bg-gray-100 rounded-lg sm:rounded-xl border border-slate-200">
                            <Package className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-gray-400" />
                          </div>
                        )}
                      </div>

                      {/* Product Details */}
                      <div className="flex-1 min-w-0">
                        {/* Stock/price warnings */}
                        {!item.inStock ? (
                          <div className="flex items-center gap-1.5 mb-2 px-2.5 py-1.5 bg-red-50 rounded-lg w-fit">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                            <span className="text-xs font-semibold text-red-600">Out of Stock — remove to checkout</span>
                          </div>
                        ) : item.availableStock != null && item.availableStock > 0 && item.availableStock <= 5 ? (
                          <div className="flex items-center gap-1.5 mb-2 px-2.5 py-1.5 bg-amber-50 rounded-lg w-fit">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            <span className="text-xs font-semibold text-amber-700">Low stock — only {item.availableStock} left</span>
                          </div>
                        ) : null}

                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="min-w-0 flex-1">
                            <h3 className="text-base sm:text-lg font-semibold text-slate-900 mb-1 break-words">{item.name}</h3>
                            <p className="hidden sm:block text-sm text-slate-600 mb-2 line-clamp-2">{item.description}</p>
                            <div className="flex items-center flex-wrap gap-1.5 sm:gap-2 mb-2">
                              <span className="text-xs bg-[#e01a1b]/10 text-[#e01a1b] px-2 py-0.5 sm:py-1 rounded-full">
                                {item.category}
                              </span>
                              {item.rating !== undefined && (
                                <div className="flex items-center gap-1">
                                  <Star className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-yellow-400 fill-current" />
                                  <span className="text-xs sm:text-sm text-slate-600">{item.rating}</span>
                                  <span className="text-xs sm:text-sm text-slate-500">({item.reviews || 0})</span>
                                </div>
                              )}
                            </div>
                            <div className="flex items-center flex-wrap gap-1.5 sm:gap-2">
                              {item.material && (
                                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 sm:py-1 rounded-full">
                                  {item.material}
                                </span>
                              )}
                              {item.discount != null && item.discount > 0 ? (
                                <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 sm:py-1 rounded-full font-semibold">
                                  Save {item.discount}%
                                </span>
                              ) : null}
                            </div>
                            {item.variantDetails && (item.variantDetails.color || item.variantDetails.size) && (
                              <div className="flex gap-4 mt-2 mb-2 text-sm text-slate-700 font-medium border-t border-slate-100 pt-2">
                                {item.variantDetails.color && (
                                  <div className="flex items-center gap-2">
                                    <span className="text-slate-500">Color:</span>
                                    <div className="flex items-center gap-1">
                                      {item.variantDetails.colorHex && (
                                        <div
                                          className="w-3 h-3 rounded-full border border-slate-300"
                                          style={{ backgroundColor: item.variantDetails.colorHex }}
                                        />
                                      )}
                                      <span>{item.variantDetails.color}</span>
                                    </div>
                                  </div>
                                )}
                                {item.variantDetails.size && (
                                  <div className="flex items-center gap-2">
                                    <span className="text-slate-500">Size:</span>
                                    <span>{item.variantDetails.size}</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => removeItem(item.id)}
                            aria-label="Remove item"
                            className="p-1.5 sm:p-2 text-slate-400 hover:text-gray-500 transition-colors shrink-0"
                          >
                            <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                          </button>
                        </div>

                        {/* Price and Quantity */}
                        <div className="flex items-center justify-between flex-wrap gap-3 mt-3 sm:mt-4">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-lg sm:text-xl font-bold text-slate-900">{formatPrice(item.price)}</span>
                            {item.offerStrikePrice ? (
                              <span className="text-xs sm:text-sm text-slate-500 line-through">{formatPrice(item.offerStrikePrice)}</span>
                            ) : item.originalPrice ? (
                              <span className="text-xs sm:text-sm text-slate-500 line-through">{formatPrice(item.originalPrice)}</span>
                            ) : null}
                            {item.activeOffer && (
                              <span className="inline-flex items-center rounded-full bg-linear-to-r from-[#e01a1b] to-[#ff5a36] px-2 py-0.5 text-[10px] font-bold text-white">
                                {item.activeOffer.badge}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center flex-wrap gap-2 sm:gap-3">
                            {!item.inStock ? (
                              <span className="text-xs sm:text-sm text-red-600 font-medium bg-red-50 px-2 py-1 rounded">Out of Stock</span>
                            ) : (item.availableStock !== undefined && item.quantity > item.availableStock) ? (
                              <span className="text-xs sm:text-sm text-amber-600 font-medium bg-amber-50 px-2 py-1 rounded">
                                Only {item.availableStock} in stock
                              </span>
                            ) : null}
                            <div className="flex items-center border border-slate-300 rounded-lg">
                              <button
                                onClick={() => updateQuantity(item.id, item.productId, item.quantity - 1)}
                                aria-label="Decrease quantity"
                                className="p-1.5 sm:p-2 hover:bg-slate-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                disabled={!item.inStock || item.quantity <= 1}
                              >
                                <Minus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                              </button>
                              <span className="px-3 sm:px-4 py-1 sm:py-2 font-medium text-sm sm:text-base">{item.quantity}</span>
                              <button
                                onClick={() => updateQuantity(item.id, item.productId, item.quantity + 1)}
                                aria-label="Increase quantity"
                                className="p-1.5 sm:p-2 hover:bg-slate-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                disabled={!item.inStock || (item.availableStock != null && item.quantity >= item.availableStock)}
                              >
                                <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                              </button>
                            </div>
                          </div>

                          {/* Shipping method — only when the product actually offers a
                              choice. AIR and SHIP carry different rates and delivery
                              windows, so this changes what the customer pays. */}
                          {transportOptionsFor(item).length >= 1 && (() => {
                            // The rate/delivery + courier choice lives on the product page
                            // (its Shipping card). The cart deep-links there — highlighting
                            // that card — and the product page writes the choice back to
                            // this line and returns here.
                            const cfg = (item as any).product?.logisticsConfig || {}
                            const shippingHref = `/products/${item.productId}?selectShipping=1&cartItem=${item.id}`
                            if (needsTransportChoice(item)) {
                              return (
                                <Link
                                  href={shippingHref}
                                  className="mt-3 inline-flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3.5 py-2.5 text-xs font-semibold text-amber-800 hover:bg-amber-100 transition-colors"
                                >
                                  <Truck className="w-4 h-4" />
                                  Select shipping method
                                  <span className="text-red-500">*</span>
                                  <ArrowRight className="w-3.5 h-3.5" />
                                </Link>
                              )
                            }
                            const mode = item.transportType || (Array.isArray(cfg.transportTypes) ? cfg.transportTypes[0] : undefined)
                            const days = mode === 'AIR' ? cfg.airDeliveryDays : cfg.shipDeliveryDays
                            return (
                              <div className="mt-3 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/70 px-3.5 py-2.5">
                                <Truck className="w-4 h-4 text-slate-500" />
                                <span className="text-xs font-medium text-slate-700">
                                  Shipping: <span className="font-semibold text-slate-900">{mode === 'AIR' ? 'Air' : 'Sea'}</span>
                                  {days ? <span className="text-slate-400"> · {days} days</span> : null}
                                  {item.courier ? <span className="text-slate-400"> · </span> : null}
                                  {item.courier ? <span className="font-semibold text-slate-900">{courierName(item.courier)}</span> : null}
                                </span>
                                <Link href={shippingHref} className="text-xs font-semibold text-[#e01a1b] hover:underline ml-1">
                                  Change
                                </Link>
                              </div>
                            )
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Empty State — Order-page style polished card */}
            {cartItems.length === 0 && (
              <Reveal className="bg-white rounded-2xl ring-1 ring-black/5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] p-6 sm:p-8 lg:p-12 text-center">
                <ShoppingCart className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 text-slate-300 mx-auto mb-3 sm:mb-4" />
                <h3 className="font-playfair text-lg sm:text-xl font-semibold text-[#1a1a1a] mb-2">Your cart is empty</h3>
                <p className="text-sm sm:text-base text-slate-600 mb-5 sm:mb-6">Add some items to get started</p>
                <Link href="/products">
                  <button className="btn-shine inline-flex items-center justify-center gap-2 bg-[#e01a1b] text-white px-6 py-3 text-sm sm:text-base rounded-full font-semibold hover:bg-[#c41617] shadow-[0_6px_20px_rgba(224,26,27,0.3)] hover:shadow-[0_12px_30px_rgba(224,26,27,0.45)] hover:-translate-y-0.5 transition-all duration-300">
                    Continue Shopping
                  </button>
                </Link>
              </Reveal>
            )}
          </div>

          {/* Order Summary */}
          {cartItems.length > 0 && (
            <div className="lg:col-span-1">
              {/* Promo Code */}
              <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-5 lg:p-6 mb-4 sm:mb-6">
                <h3 className="font-playfair text-base sm:text-lg font-semibold text-[#1a1a1a] mb-3 sm:mb-4">Promo Code</h3>
                <div className="flex gap-2 sm:gap-3">
                  <input
                    type="text"
                    placeholder="Enter promo code"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value)}
                    className="flex-1 min-w-0 px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border border-slate-300 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-[#e01a1b]/40 focus:border-[#e01a1b] outline-none"
                  />
                  <button
                    onClick={applyPromoCode}
                    className="px-4 sm:px-6 py-2.5 sm:py-3 bg-[#1a1a1a] hover:bg-[#e01a1b] text-white font-medium rounded-lg sm:rounded-xl transition-colors text-sm sm:text-base shrink-0"
                  >
                    Apply
                  </button>
                </div>
                {appliedPromo && (
                  <div className="mt-3 flex items-center justify-between text-green-600 bg-green-50 p-3 rounded-lg border border-green-100">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5" />
                      <div>
                        <span className="font-medium block">Code &quot;{appliedPromo}&quot; applied!</span>
                        <span className="text-xs text-green-700">You saved {formatPrice(discountAmount)}</span>
                      </div>
                    </div>
                    <button
                      onClick={removeCoupon}
                      className="text-red-500 hover:text-red-700 p-1 hover:bg-white rounded-full transition-colors"
                      title="Remove coupon"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
                
                {freeShippingApplied && !appliedPromo && (
                  <div className="mt-3 flex items-center justify-between text-blue-600 bg-blue-50 p-3 rounded-lg border border-blue-100">
                    <div className="flex items-center gap-2">
                      <Truck className="w-5 h-5" />
                      <div>
                        <span className="font-medium block">Free Shipping Available!</span>
                        <span className="text-xs text-blue-700">{freeShippingMessage}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>


              <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-slate-200 overflow-hidden lg:sticky lg:top-8">
                <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200 bg-linear-to-r from-slate-50 to-white">
                  <h2 className="font-playfair text-lg sm:text-xl font-semibold text-[#1a1a1a]">Order Summary</h2>
                </div>

                <div className="p-4 sm:p-5 lg:p-6">
                  <div className="space-y-4 mb-6">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Subtotal</span>
                      <span className="font-medium">{formatPrice(summary.subtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Shipping</span>
                      <span className="font-medium">
                        {summary.shipping === 0 ? (
                          <span className="text-green-600 flex items-center gap-1">
                            <Truck className="w-4 h-4" />
                            Free
                          </span>
                        ) : (
                          `${formatPrice(summary.shipping)}`
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Tax (GST)</span>
                      <span className="font-medium">{formatPrice(summary.tax)}</span>
                    </div>
                    {summary.discount > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span>Discount</span>
                        <span className="font-medium">-{formatPrice(summary.discount)}</span>
                      </div>
                    )}
                    <div className="border-t border-slate-200 pt-4">
                      <div className="flex justify-between text-lg font-bold">
                        <span>Total</span>
                        <span>{formatPrice(summary.total)}</span>
                      </div>
                    </div>
                  </div>

                  {cartItems.some(needsTransportChoice) ? (
                    <button
                      disabled
                      className="w-full bg-slate-300 text-slate-500 font-semibold py-4 px-6 rounded-xl shadow-none flex items-center justify-center gap-2 mb-4 cursor-not-allowed"
                    >
                      <Truck className="w-5 h-5" />
                      Choose a shipping method to proceed
                    </button>
                  ) : cartItems.some(item => !item.inStock || (item.availableStock !== undefined && item.quantity > item.availableStock)) ? (
                    <button
                      disabled
                      className="w-full bg-slate-300 text-slate-500 font-semibold py-4 px-6 rounded-xl shadow-none flex items-center justify-center gap-2 mb-4 cursor-not-allowed"
                    >
                      <CreditCard className="w-5 h-5" />
                      Remove out of stock items to proceed
                    </button>
                  ) : (
                    <Link href="/checkout">
                      <button className="btn-shine w-full bg-[#e01a1b] text-white font-semibold py-4 px-6 rounded-full hover:bg-[#c41617] shadow-[0_6px_20px_rgba(224,26,27,0.3)] hover:shadow-[0_12px_30px_rgba(224,26,27,0.45)] hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center gap-2 group mb-4">
                        <CreditCard className="w-5 h-5" />
                        Proceed to Checkout
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
                      </button>
                    </Link>
                  )}

                  {/* Trust Badges */}
                  <div className="space-y-3 pt-4 border-t border-slate-200">
                    <div className="flex items-center gap-3 text-sm text-slate-600">
                      <Shield className="w-5 h-5 text-green-600" />
                      <span>Secure checkout with SSL encryption</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-slate-600">
                      <Truck className="w-5 h-5 text-[#e01a1b]" />
                      <span>Free shipping on orders over $100</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-slate-600">
                      <Package className="w-5 h-5 text-purple-600" />
                      <span>30-day return policy</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recently Viewed - Removed for now, can be added later with proper backend integration */}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
