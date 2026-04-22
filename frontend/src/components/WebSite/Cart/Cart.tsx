"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { cartService } from "@/services/cartService"
import { couponService } from "@/services/couponService"
import { publicProductService, PublicProduct } from "@/services/publicProductService"
import { userAuthService } from "@/services/userAuthService"
import bagTypeService, { BagType } from "@/services/bagTypeService"
import { showSuccessToast, showErrorToast } from "@/lib/toast-utils"
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
  ShoppingBag
} from "lucide-react"

interface OrderItem {
  id: string
  productId: string
  name: string
  price: number
  originalPrice?: number
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
  bagCost: number
  total: number
}

export default function Order() {
  const [cartItems, setCartItems] = useState<OrderItem[]>([])
  const [isHydrated, setIsHydrated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [availableBagTypes, setAvailableBagTypes] = useState<BagType[]>([])
  const [selectedBagTypeId, setSelectedBagTypeId] = useState<string | null>(null)

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
                let finalPrice = product.adminFixedPrice || product.basePrice;
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

                return {
                  id: item.id, // Use local cart item ID
                  productId: item.productId,
                  name: product.name,
                  price: finalPrice,
                  originalPrice: product.originalPrice,
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
                  variantDetails
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
              const hasVariantImg = item.variant?.images && item.variant.images.length > 0;
              const hasProductImg = item.product?.images && item.product.images.length > 0;

              const imgArray = hasVariantImg
                ? item.variant.images
                : (hasProductImg ? item.product.images.map((img: any) => img.url) : []);

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
                variantDetails: item.variant ? {
                  size: item.variant.size,
                  color: item.variant.color,
                  colorHex: item.variant.colorHex,
                  sku: item.variant.sku
                } : (item.product?.singleUnitSize || item.product?.singleUnitColor) ? {
                  size: item.product.singleUnitSize || '',
                  color: item.product.singleUnitColor || '',
                  colorHex: item.product.singleUnitColorHex,
                  sku: item.product.baseSku || ''
                } : undefined
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

  // Fetch bag types and restore selection (restore AFTER fetch to validate against active list)
  useEffect(() => {
    const loadBagTypes = async () => {
      const response = await bagTypeService.getActiveBagTypes()
      if (response.success && response.data) {
        setAvailableBagTypes(response.data)

        // Restore selection from localStorage, validate against fetched list
        const savedBag = localStorage.getItem('selectedBagType')
        if (savedBag) {
          try {
            const { id } = JSON.parse(savedBag)
            const stillActive = response.data.find(b => b.id === id)
            if (stillActive) {
              setSelectedBagTypeId(id)
            } else {
              localStorage.removeItem('selectedBagType') // bag was deleted/deactivated
            }
          } catch {
            localStorage.removeItem('selectedBagType')
          }
        }
      }
    }
    loadBagTypes()
  }, [])

  const handleBagSelection = (bagTypeId: string | null) => {
    setSelectedBagTypeId(bagTypeId)
    if (bagTypeId) {
      const bag = availableBagTypes.find(b => b.id === bagTypeId)
      if (bag) {
        localStorage.setItem('selectedBagType', JSON.stringify({ id: bag.id, name: bag.name, price: bag.price }))
      }
    } else {
      localStorage.removeItem('selectedBagType')
    }
  }

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
      <div className="min-h-screen bg-slate-50 py-8 font-sans">
        <div className="max-w-7xl xl:max-w-420 mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-slate-900 mb-2">Shopping Cart</h1>
            <p className="text-slate-600">Review your items and proceed to checkout</p>
          </div>
          <div className="animate-pulse">
            <div className="h-32 bg-slate-200 rounded-2xl mb-4"></div>
            <div className="h-32 bg-slate-200 rounded-2xl mb-4"></div>
            <div className="h-32 bg-slate-200 rounded-2xl"></div>
          </div>
        </div>
      </div>
    )
  }

  const updateQuantity = async (id: string, productId: string, newQuantity: number) => {
    if (newQuantity < 1) {
      removeItem(id)
      return
    }

    try {
      if (!isAuthenticated) {
        cartService.updateLocalCartItem(id, newQuantity)
        setCartItems(items =>
          items.map(item =>
            item.id === id ? { ...item, quantity: newQuantity } : item
          )
        )
        showSuccessToast('Updated', 'Cart item quantity updated')
        return
      }

      // Update via API
      await cartService.updateCartItem(id, newQuantity)
      setCartItems(items =>
        items.map(item =>
          item.id === id ? { ...item, quantity: newQuantity } : item
        )
      )
      showSuccessToast('Updated', 'Cart item quantity updated')
      } catch (error: unknown) {
        console.error('Failed to update quantity:', error)
        showErrorToast('Error', 'Failed to update quantity')
      }
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

      const response = await couponService.applyCoupon(promoCode, subtotal)

      if (response.success && response.data) {
        setAppliedPromo(response.data.code)
        // Ensure discount doesn't exceed total (though backend handles this, good to be safe)
        setDiscountAmount(response.data.discountAmount)
        setPromoCode("") // Clear input field
        showSuccessToast("Success", `Coupon "${response.data.code}" applied! You saved $${response.data.discountAmount.toFixed(2)}`)

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
    const shipping = freeShippingApplied ? 0 : 0 // Free shipping or standard free shipping
    const discount = discountAmount

    // Calculate tax based on individual product GST percentages
    const tax = cartItems.reduce((sum, item) => {
      const itemSubtotal = item.price * item.quantity
      const gstRate = item.gstPercentage ? item.gstPercentage / 100 : 0
      return sum + (itemSubtotal * gstRate)
    }, 0)

    // Bag add-on cost
    const selectedBag = availableBagTypes.find(b => b.id === selectedBagTypeId)
    const bagCost = selectedBag ? selectedBag.price : 0

    const total = subtotal + shipping + tax - discount + bagCost

    return { subtotal, shipping, tax, discount, bagCost, total: total > 0 ? total : 0 }
  }

  const summary = calculateSummary()

  return (
    <div className="min-h-screen bg-slate-50 py-8 font-sans">
      <div className="max-w-7xl xl:max-w-420 mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Shopping Cart</h1>
          <p className="text-slate-600">Review your items and proceed to checkout</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 bg-[#222222]">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-[#fffff4]">Cart Items</h2>
                  <span className="bg-white text-[#313131] text-sm font-medium px-3 py-1 rounded-full">
                    {cartItems.length} items
                  </span>
                </div>
              </div>

              <div className="divide-y divide-slate-200">
                {cartItems.map((item) => (
                  <div key={item.id} className="p-6">
                    <div className="flex items-start gap-4">
                      {/* Product Image */}
                      <div className="shrink-0">
                        {item.images && item.images.length > 0 ? (
                          <img
                            src={item.images[0]}
                            alt={item.name}
                            className="w-24 h-24 object-cover rounded-xl border border-slate-200"
                          />
                        ) : (
                          <div className="w-24 h-24 flex items-center justify-center bg-gray-100 rounded-xl border border-slate-200">
                            <Package className="w-8 h-8 text-gray-400" />
                          </div>
                        )}
                      </div>

                      {/* Product Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="text-lg font-semibold text-slate-900 mb-1">{item.name}</h3>
                            <p className="text-sm text-slate-600 mb-2">{item.description}</p>
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                                {item.category}
                              </span>
                              {item.rating !== undefined && (
                                <div className="flex items-center gap-1">
                                  <Star className="w-4 h-4 text-yellow-400 fill-current" />
                                  <span className="text-sm text-slate-600">{item.rating}</span>
                                  <span className="text-sm text-slate-500">({item.reviews || 0})</span>
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {item.material && (
                                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                                  {item.material}
                                </span>
                              )}
                              {item.discount && (
                                <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full font-semibold">
                                  Save {item.discount}%
                                </span>
                              )}
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
                            className="p-2 text-slate-400 hover:text-gray-500 transition-colors"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>

                        {/* Price and Quantity */}
                        <div className="flex items-center justify-between mt-4">
                          <div className="flex items-center gap-2">
                            <span className="text-xl font-bold text-slate-900">${item.price.toFixed(2)}</span>
                            {item.originalPrice && (
                              <span className="text-sm text-slate-500 line-through">${item.originalPrice.toFixed(2)}</span>
                            )}
                          </div>

                          <div className="flex items-center gap-3">
                            {!item.inStock ? (
                              <span className="text-sm text-red-600 font-medium bg-red-50 px-2 py-1 rounded">Out of Stock</span>
                            ) : (item.availableStock !== undefined && item.quantity > item.availableStock) ? (
                              <span className="text-sm text-amber-600 font-medium bg-amber-50 px-2 py-1 rounded">
                                Only {item.availableStock} in stock
                              </span>
                            ) : null}
                            <div className="flex items-center border border-slate-300 rounded-lg">
                              <button
                                onClick={() => updateQuantity(item.id, item.productId, item.quantity - 1)}
                                className="p-2 hover:bg-slate-100 transition-colors"
                                disabled={!item.inStock}
                              >
                                <Minus className="w-4 h-4" />
                              </button>
                              <span className="px-4 py-2 font-medium">{item.quantity}</span>
                              <button
                                onClick={() => updateQuantity(item.id, item.productId, item.quantity + 1)}
                                className="p-2 hover:bg-slate-100 transition-colors"
                                disabled={!item.inStock}
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {cartItems.length === 0 && (
                <div className="p-12 text-center">
                  <ShoppingCart className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-slate-900 mb-2">Your cart is empty</h3>
                  <p className="text-slate-600 mb-6">Add some items to get started</p>
                  <Link href="/products">
                    <button className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors">
                      Continue Shopping
                    </button>
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Order Summary */}
          {cartItems.length > 0 && (
            <div className="lg:col-span-1">
              {/* Promo Code */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Promo Code</h3>
                <div className="flex gap-3">
                  <input
                    type="text"
                    placeholder="Enter promo code"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value)}
                    className="flex-1 px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                  />
                  <button
                    onClick={applyPromoCode}
                    className="px-6 py-3 bg-[#222222] hover:bg-[#313131] text-white font-medium rounded-xl transition-colors"
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
                        <span className="text-xs text-green-700">You saved ${discountAmount.toFixed(2)}</span>
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

              {/* Bag Add-on */}
              {availableBagTypes.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
                  <div className="flex items-center gap-2 mb-4">
                    <ShoppingBag className="w-5 h-5 text-slate-700" />
                    <h3 className="text-lg font-semibold text-slate-900">Add a Bag</h3>
                  </div>
                  <div className="space-y-3">
                    {/* No bag option */}
                    <button
                      onClick={() => handleBagSelection(null)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                        !selectedBagTypeId
                          ? 'border-[#222222] bg-slate-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        !selectedBagTypeId ? 'border-[#222222]' : 'border-slate-300'
                      }`}>
                        {!selectedBagTypeId && <div className="w-2 h-2 rounded-full bg-[#222222]" />}
                      </div>
                      <span className="text-sm text-slate-600">No bag needed</span>
                    </button>

                    {availableBagTypes.map(bag => (
                      <button
                        key={bag.id}
                        onClick={() => handleBagSelection(bag.id)}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                          selectedBagTypeId === bag.id
                            ? 'border-[#222222] bg-slate-50'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                          selectedBagTypeId === bag.id ? 'border-[#222222]' : 'border-slate-300'
                        }`}>
                          {selectedBagTypeId === bag.id && <div className="w-2 h-2 rounded-full bg-[#222222]" />}
                        </div>
                        {bag.image ? (
                          <img src={bag.image} alt={bag.name} className="w-10 h-10 object-cover rounded-lg border border-slate-200 shrink-0" />
                        ) : (
                          <div className="w-10 h-10 bg-slate-100 rounded-lg border border-slate-200 flex items-center justify-center shrink-0">
                            <ShoppingBag className="w-5 h-5 text-slate-400" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900">{bag.name}</p>
                          {bag.description && <p className="text-xs text-slate-500 truncate">{bag.description}</p>}
                        </div>
                        <span className="text-sm font-bold text-slate-900 shrink-0">${bag.price.toFixed(2)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden sticky top-8">
                <div className="px-6 py-4 border-b border-slate-200 bg-linear-to-r from-slate-50 to-white">
                  <h2 className="text-xl font-bold text-slate-900">Order Summary</h2>
                </div>

                <div className="p-6">
                  <div className="space-y-4 mb-6">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Subtotal</span>
                      <span className="font-medium">${summary.subtotal.toFixed(2)}</span>
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
                          `$${summary.shipping.toFixed(2)}`
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Tax (GST)</span>
                      <span className="font-medium">${summary.tax.toFixed(2)}</span>
                    </div>
                    {/* GST Breakdown by Product */}
                    {cartItems.some(item => item.gstPercentage) && (
                      <div className="pl-4 space-y-1">
                        {cartItems.map((item) => {
                          if (!item.gstPercentage) return null
                          const itemSubtotal = item.price * item.quantity
                          const itemTax = itemSubtotal * (item.gstPercentage / 100)
                          return (
                            <div key={item.id} className="flex justify-between text-xs text-slate-500">
                              <span className="truncate max-w-[150px]">{item.name} ({item.gstPercentage}%)</span>
                              <span>${itemTax.toFixed(2)}</span>
                            </div>
                          )
                        })}
                      </div>
                    )}
                    {summary.discount > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span>Discount</span>
                        <span className="font-medium">-${summary.discount.toFixed(2)}</span>
                      </div>
                    )}
                    {summary.bagCost > 0 && (
                      <div className="flex justify-between">
                        <span className="text-slate-600">
                          Bag ({availableBagTypes.find(b => b.id === selectedBagTypeId)?.name})
                        </span>
                        <span className="font-medium">${summary.bagCost.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="border-t border-slate-200 pt-4">
                      <div className="flex justify-between text-lg font-bold">
                        <span>Total</span>
                        <span>${summary.total.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  {cartItems.some(item => !item.inStock || (item.availableStock !== undefined && item.quantity > item.availableStock)) ? (
                    <button
                      disabled
                      className="w-full bg-slate-300 text-slate-500 font-semibold py-4 px-6 rounded-xl shadow-none flex items-center justify-center gap-2 mb-4 cursor-not-allowed"
                    >
                      <CreditCard className="w-5 h-5" />
                      Remove out of stock items to proceed
                    </button>
                  ) : (
                    <Link href="/checkout">
                      <button className="w-full bg-[#313131] text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center gap-2 group mb-4">
                        <CreditCard className="w-5 h-5" />
                        Proceed to Checkout
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
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
                      <Truck className="w-5 h-5 text-blue-600" />
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
