"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import Link from "next/link"
import Image from "next/image"
import { cartService } from "@/services/cartService"
import { wishlistService } from "@/services/wishlistService"
import { couponService } from "@/services/couponService"
import { publicProductService, PublicProduct } from "@/services/publicProductService"
import { getRecentSearches, getRecentlyViewed } from "@/lib/browsingHistory"
import { userAuthService } from "@/services/userAuthService"
import { showSuccessToast, showErrorToast } from "@/lib/toast-utils"
import { formatPrice, getRegionalPrice, getRegionalOriginalPrice, getCurrency, getRegion, convertINRtoUSD } from "@/lib/currency"
import { applyOfferToPrice, type ActiveOffer } from "@/lib/offers"
import { calculateLogistics, type LogisticsConfig } from "@/lib/logistics"
import { courierName } from "@/lib/couriers"
import Reveal from "@/components/WebSite/Shared/Reveal"
import ProductCard from "@/components/WebSite/ProductCard/ProductCard"
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  Truck,
  Star,
  Heart,
  Share2,
  ArrowRight,
  Package,
  Clock,
  CheckCircle,
  Sparkles,
  TrendingUp,
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
  const [similarProducts, setSimilarProducts] = useState<PublicProduct[]>([])

  // Empty-cart discovery rails.
  const [suggested, setSuggested] = useState<PublicProduct[]>([])
  const [topSelling, setTopSelling] = useState<PublicProduct[]>([])
  const [recentlyViewed, setRecentlyViewed] = useState<PublicProduct[]>([])
  const emptyRailsLoaded = useRef(false)

  const pendingUpdates = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  // While true, cart-changed events are ignored — set by the cart's own
  // mutations so a self-triggered event doesn't refetch over the optimistic
  // update. External adds (e.g. a similar product) arrive while it's false.
  const suppressRefetch = useRef(false)
  const suppressCartEvents = () => {
    suppressRefetch.current = true
    setTimeout(() => { suppressRefetch.current = false }, 1500)
  }

  // Similar products — same-category items as what's in the cart (excludes the
  // cart items themselves). Keyed by product+category so it doesn't refetch when
  // only quantities change; falls back to recent products if categories are sparse.
  const cartSignature = cartItems.map((i) => `${i.productId}:${i.category || ''}`).sort().join('|')
  useEffect(() => {
    if (cartItems.length === 0) { setSimilarProducts([]); return }
    let cancelled = false
    const run = async () => {
      const cats = Array.from(new Set(cartItems.map((i) => i.category).filter(Boolean))) as string[]
      const inCart = new Set(cartItems.map((i) => i.productId))
      try {
        let pool: PublicProduct[] = []
        if (cats.length) {
          const results = await Promise.all(
            cats.slice(0, 4).map((c) =>
              publicProductService
                .getProducts({ category: c, limit: 8 })
                .then((r) => (r.success && r.data ? r.data.items : []))
                .catch(() => [] as PublicProduct[]),
            ),
          )
          pool = results.flat()
        }
        // Fallback so the rail isn't empty when categories are sparse.
        if (pool.length === 0) {
          const r = await publicProductService.getProducts({ limit: 8, sortBy: 'createdAt', sortOrder: 'desc' })
          pool = r.success && r.data ? r.data.items : []
        }
        const seen = new Set<string>()
        const list = pool.filter((p) => {
          if (inCart.has(p.id) || seen.has(p.id)) return false
          seen.add(p.id)
          return true
        }).slice(0, 6)
        if (!cancelled) setSimilarProducts(list)
      } catch {
        if (!cancelled) setSimilarProducts([])
      }
    }
    run()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartSignature])

  // When the cart is empty, populate the three discovery rails:
  //   · Suggested for You — from the user's last search term, else random picks
  //   · Top Selling       — the "Top Selling" tagged catalogue
  //   · Recently Viewed   — products the user recently opened
  useEffect(() => {
    if (loading || cartItems.length > 0 || emptyRailsLoaded.current) return
    emptyRailsLoaded.current = true
    let cancelled = false

    const shuffle = <T,>(arr: T[]): T[] => {
      const a = [...arr]
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
          ;[a[i], a[j]] = [a[j], a[i]]
      }
      return a
    }

    const run = async () => {
      // Suggested — last search term, else a random sample of the catalogue.
      const searches = getRecentSearches()
      let sug: PublicProduct[] = []
      if (searches.length) {
        const r = await publicProductService.getProducts({ search: searches[0], limit: 8 }).catch(() => null)
        sug = r?.success && r.data ? r.data.items : []
      }
      if (sug.length === 0) {
        const r = await publicProductService.getProducts({ limit: 18, sortBy: 'createdAt', sortOrder: 'desc' }).catch(() => null)
        sug = shuffle(r?.success && r.data ? r.data.items : [])
      }
      if (!cancelled) setSuggested(sug.slice(0, 6))

      // Top Selling.
      const ts = await publicProductService.getTopSellingProducts(6).catch(() => null)
      if (!cancelled) setTopSelling(ts?.success && ts.data ? ts.data.items : [])

      // Recently viewed — resolve stored ids to live products.
      const ids = getRecentlyViewed().slice(0, 8)
      if (ids.length) {
        const results = await Promise.all(
          ids.map((id) =>
            publicProductService.getProduct(id).then((r) => (r.success ? r.data : null)).catch(() => null),
          ),
        )
        if (!cancelled) setRecentlyViewed(results.filter(Boolean).slice(0, 6) as PublicProduct[])
      }
    }
    run()
    return () => { cancelled = true }
  }, [loading, cartItems.length])

  const loadCart = useCallback(async (silent = false) => {
      try {
        if (!silent) setLoading(true)
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
        if (!silent) setLoading(false)
        setIsHydrated(true)
      }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => { loadCart() }, [loadCart])

  // Refresh when the cart changes elsewhere (e.g. adding a similar product below).
  // Self-triggered events are ignored — those already update state optimistically.
  useEffect(() => {
    const onCartChanged = () => {
      if (suppressRefetch.current) return
      loadCart(true)
    }
    window.addEventListener('cart-changed', onCartChanged)
    return () => window.removeEventListener('cart-changed', onCartChanged)
  }, [loadCart])

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
      <div className="min-h-screen bg-[#f9f5f2] py-4 sm:py-6 lg:py-8 font-sans">
        <div className="max-w-7xl xl:max-w-420 mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
          <div className="mb-5 sm:mb-6 lg:mb-8">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                {/* The same mark as the loaded masthead, unanimated. The
                    skeleton exists so the page does not jump when the cart
                    arrives, which it would if the two headers differed. */}
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-linear-to-b from-[#fdf1ef] to-[#f9e3df] ring-1 ring-[#f2d9d3] sm:h-14 sm:w-14">
                  <ShoppingCart className="h-6 w-6 text-[#e01a1b] sm:h-7 sm:w-7" strokeWidth={1.9} />
                </span>
                <div className="min-w-0">
                  <h1 className="font-playfair text-2xl sm:text-3xl lg:text-4xl font-semibold text-[#1a1a1a] mb-1 sm:mb-2">Shopping Cart</h1>
                  <p className="text-sm sm:text-base text-[#6b625b]">Review your items and proceed to checkout</p>
                </div>
              </div>
            </div>
          </div>
          <div className="animate-pulse space-y-3 sm:space-y-4">
            <div className="h-24 sm:h-32 bg-[#ece7e0] rounded-xl sm:rounded-2xl"></div>
            <div className="h-24 sm:h-32 bg-[#ece7e0] rounded-xl sm:rounded-2xl"></div>
            <div className="h-24 sm:h-32 bg-[#ece7e0] rounded-xl sm:rounded-2xl"></div>
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
    suppressCartEvents() // ignore the cart-changed we are about to cause
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

  const removeItem = async (id: string, opts?: { silent?: boolean }) => {
    suppressCartEvents() // ignore the cart-changed we are about to cause
    try {
      if (!isAuthenticated) {
        cartService.removeFromLocalCart(id)
        setCartItems(items => items.filter(item => item.id !== id))
        if (!opts?.silent) showSuccessToast('Removed', 'Item removed from cart')
        return
      }

      // Remove via API
      await cartService.removeFromCart(id)
      setCartItems(items => items.filter(item => item.id !== id))
      if (!opts?.silent) showSuccessToast('Removed', 'Item removed from cart')
      } catch (error: unknown) {
        console.error('Failed to remove item:', error)
        showErrorToast('Error', 'Failed to remove item')
      }

  }

  // Move a cart line to the wishlist: ensure it's in the wishlist (add only if
  // it isn't already there), then remove it from the cart.
  const moveToWishlist = async (item: OrderItem) => {
    try {
      if (isAuthenticated) {
        const inList = wishlistService.isInWishlistSync(item.productId)
          || (await wishlistService.isInWishlist(item.productId))
        if (!inList) await wishlistService.addToWishlist(item.productId)
      } else {
        wishlistService.addToLocalWishlist(item.productId)
      }
    } catch (error) {
      console.error('Failed to move item to wishlist:', error)
      showErrorToast('Error', 'Could not move item to wishlist')
      return
    }
    await removeItem(item.id, { silent: true })
    showSuccessToast('Moved to Wishlist', `${item.name} moved to your wishlist`)
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
    <div className="min-h-screen bg-[#f9f5f2] py-4 sm:py-6 lg:py-8 font-sans">
      <style>{`
        /* ── The count leaving the cart ────────────────────────────────
           Two halves of one gesture, played whenever the number of lines
           changes: the basket rocks as though something has just been
           dropped into it, and the count comes out from underneath it,
           small and to the left, arriving where it sits.

           They are tied together by a React key on the item count, so both
           elements remount and replay the moment the count changes and at
           no other time. Nothing is scheduled, nothing is timed out, and
           there is no state to leave behind if the page unmounts mid-play.

           Transform only. Both animate composited properties, so neither
           can reflow the masthead or move the heading beside them.
           (No backticks in here — this is a JS template literal.) */
        @keyframes cartRock {
          0%   { transform: rotate(0deg) scale(1) }
          20%  { transform: rotate(-9deg) scale(1.07) }
          44%  { transform: rotate(7deg) scale(1.04) }
          68%  { transform: rotate(-3deg) scale(1.015) }
          100% { transform: rotate(0deg) scale(1) }
        }
        .cart-mark {
          animation: cartRock 620ms cubic-bezier(0.34, 1.56, 0.64, 1) both;
          /* Low, so the badge tips on its bottom edge like something with
             weight in it, rather than spinning about its middle. */
          transform-origin: 50% 82%;
        }

        /* Starts small, low and tucked left — behind the basket — then
           travels out to rest. The overshoot at 62% is what makes it read
           as being tipped out rather than merely faded in. */
        @keyframes countOut {
          0%   { transform: translate(-14px, 4px) scale(0.5); opacity: 0 }
          62%  { transform: translate(0, 0) scale(1.12); opacity: 1 }
          100% { transform: translate(0, 0) scale(1); opacity: 1 }
        }
        .cart-count {
          animation: countOut 520ms 90ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        /* Anyone who has asked not to be moved gets both, instantly and
           in place. The fill mode is "both", so the resting frame is the one
           that sticks and nothing is left mid-rock or invisible.
           (Note the wording: a backtick here would close this very
           template literal, which is exactly how this block broke once.) */
        @media (prefers-reduced-motion: reduce) {
          .cart-mark, .cart-count { animation: none }
        }
      `}</style>

      <div className="max-w-7xl xl:max-w-420 mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
        {/* Header — Order-page style with icon + count */}
        <div className="mb-5 sm:mb-6 lg:mb-8">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              {/* A mark, not a loose glyph.
                  A bare 28px basket is thin for the one symbol this page is
                  named after, and `items-center` was centring it across a
                  TWO-LINE block — so it came to rest in the gap between the
                  title and the line under it, touching neither. Given a chip
                  of its own it has a size and a position: tall enough to span
                  both lines, and aligned to them rather than to the space
                  between them.

                  The chip is what rocks now. The glyph alone had barely any
                  area to move, so the gesture was easy to miss; a 56px badge
                  tilting on its lower edge is the same movement, legible. */}
              <span
                key={'cart-mark-' + cartItems.length}
                className="cart-mark flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-linear-to-b from-[#fdf1ef] to-[#f9e3df] ring-1 ring-[#f2d9d3] sm:h-14 sm:w-14"
              >
                <ShoppingCart className="h-6 w-6 text-[#e01a1b] sm:h-7 sm:w-7" strokeWidth={1.9} />
              </span>
              <div className="min-w-0">
                {/* The count sits with the title, not at the far edge of the
                    masthead. Pinned right it was a lone figure across a wide
                    empty band, related to nothing beside it; here it reads as
                    part of the heading it is counting. */}
                <div className="mb-1 flex flex-wrap items-center gap-x-3 gap-y-1 sm:mb-2">
                  <h1 className="font-playfair text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-tight text-[#1a1a1a]">Shopping Cart</h1>
                  <span
                    key={'cart-count-' + cartItems.length}
                    className="cart-count inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#6b625b] ring-1 ring-[#efe6df] sm:text-[13px]"
                  >
                    <span className="font-bold tabular-nums text-[#c41617]">{cartItems.length}</span>
                    Items
                  </span>
                </div>
                <p className="text-sm sm:text-base text-[#6b625b]">Review your items and proceed to checkout</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6 lg:gap-8">
          {/* Cart Items — Order-page style: each item its own card with gaps between */}
          <div className="lg:col-span-2">
            {cartItems.length > 0 && (
              <div className="grid grid-cols-1 gap-2.5 sm:gap-3 lg:gap-4">
                {cartItems.map((item) => (
                  <div key={item.id} className="group @container rounded-xl bg-white p-3.5 shadow-[0_1px_2px_rgba(90,60,40,0.05)] ring-1 ring-[#efe6df] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_34px_-18px_rgba(110,75,45,0.32)] hover:ring-[#e5d8cd] sm:rounded-2xl sm:p-4">
                    {/* One row, five things: picture, description, actions,
                          quantity, money.

                          Flex rather than grid, because the honest answer
                          changes with the room available and flex-wrap says so
                          without me naming every width. Given about 800px of
                          card the five sit on one line and the description
                          absorbs the slack, so the buttons, the stepper and the
                          figures land at the same x on every card and the eye
                          reads straight down each one. Below that the quantity
                          and money pair drops to a second line rather than
                          crushing the name.

                          What this replaced pooled ALL the slack in one place:
                          the description column ran 672px holding about 250px
                          of text, so a 330px hole opened between "Size: 38 x 42
                          cm" and the buttons, while the stepper sat stacked
                          under the price instead of beside it. The same content
                          over five columns spends that width instead of leaving
                          it lying there. */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-3 sm:gap-x-5">
                        {/* Product Image */}
                      <div className="shrink-0">
                        {item.images && item.images.length > 0 ? (
                          /* The frame crops and the picture moves inside it, so
                             the card's own geometry never changes on hover —
                             a photo that grew the box would nudge every line
                             below it. */
                          <div className="h-14 w-14 overflow-hidden rounded-lg ring-1 ring-[#efe6df] sm:h-16 sm:w-16 sm:rounded-xl md:h-20 md:w-20">
                            <Image
                              src={item.images[0]}
                              alt={item.name}
                              width={96}
                              height={96}
                              className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.07]"
                            />
                          </div>
                        ) : (
                          <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-[#f6f1ea] ring-1 ring-[#efe6df] sm:h-16 sm:w-16 sm:rounded-xl md:h-20 md:w-20">
                            <Package className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-[#c9aeab]" />
                          </div>
                        )}
                      </div>

                      {/* Product Details — the one flexible column. Everything after
                          it is sized to its content, so all the slack in the
                          row collects here and the columns to the right stay
                          put from card to card. */}
                      <div className="min-w-0 flex-1 basis-[13rem] @min-[36rem]:grow-2">
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

                        {/* Name, chips, then one strip that carries the
                            variants and the buttons together.

                            It was five stacked bands: the name, a row that
                            only ever held a rating, the discount badge on a
                            row of its own, the variants, and the buttons under
                            those — in a card whose right half was empty. The
                            chips share a row now and colour/size sit beside
                            the actions rather than above them, which takes
                            roughly a third of the height out of every line
                            without dropping a single word. */}
                        <h3 className="text-sm font-semibold text-[#1a1a1a] break-words sm:text-base">{item.name}</h3>

                        {/* The rating chip appears on its own the moment a
                            product is reviewed — the condition is the live
                            review count, so no edit here is ever needed.

                            What this replaced showed a filled star beside
                            "(0)" on everything, because rating comes back null
                            for all but one product in the catalogue and
                            {item.rating} rendered as nothing. That reads as a
                            score of nought rather than as an absence of one,
                            which is the worse of the two lies.

                            Guarded as a whole row, not chip by chip: an empty
                            flex box still carries its top margin, which is a
                            gap under the name of every unrated line. */}
                        {(((item.reviews ?? 0) > 0 && item.rating) || (item.discount != null && item.discount > 0)) && (
                          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 sm:gap-2">
                            {(item.reviews ?? 0) > 0 && item.rating ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-[#fdf8ee] px-2 py-0.5 text-xs font-semibold text-[#8a6a2f] ring-1 ring-[#f0e3c8]">
                                <Star className="h-3 w-3 fill-current text-[#e8a33d]" />
                                {item.rating}
                                <span className="font-medium text-[#b0a087]">({item.reviews})</span>
                              </span>
                            ) : null}
                            {item.discount != null && item.discount > 0 ? (
                              <span className="inline-flex items-center rounded-full bg-[#fdf1ef] px-2 py-0.5 text-xs font-semibold text-[#c41617] ring-1 ring-[#f4dcd7]">
                                Save {item.discount}%
                              </span>
                            ) : null}
                          </div>
                        )}

                        {/* Colour and size. flex-wrap with nowrap per pair: as a
                            plain flex row the label and the value competed for
                            one cramped line on a phone and the VALUE lost —
                            "Size: Set of 8" came out as three stacked lines.
                            Wrapping between pairs and never inside one keeps
                            each fact whole. */}
                        {item.variantDetails && (item.variantDetails.color || item.variantDetails.size) && (
                          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs font-medium text-[#4a423c] sm:text-sm">
                            {item.variantDetails.color && (
                              <div className="flex items-center gap-2 whitespace-nowrap">
                                <span className="text-[#8a807a]">Color:</span>
                                <div className="flex items-center gap-1">
                                  {item.variantDetails.colorHex && (
                                    <div
                                      className="w-3 h-3 rounded-full border border-[#e3dbd1]"
                                      style={{ backgroundColor: item.variantDetails.colorHex }}
                                    />
                                  )}
                                  <span>{item.variantDetails.color}</span>
                                </div>
                              </div>
                            )}
                            {item.variantDetails.size && (
                              <div className="flex items-center gap-2 whitespace-nowrap">
                                <span className="text-[#8a807a]">Size:</span>
                                <span>{item.variantDetails.size}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* ── Actions ──────────────────────────────────────
                          A column of their own now rather than a tail on the
                          end of the variants line. Because the description
                          absorbs the slack these land at the same x on every
                          card, instead of wherever that card's size text
                          happened to stop. */}
                      <div className="flex shrink-0 items-center gap-1.5 @min-[36rem]:grow">
                        <button
                          onClick={() => moveToWishlist(item)}
                          aria-label="Move to wishlist"
                          title="Move this item to your wishlist and remove it from the cart"
                          className="inline-flex items-center gap-1.5 rounded-full ring-1 ring-[#efe6df] px-2.5 py-1.5 text-xs font-semibold text-[#6b625b] transition-colors hover:bg-[#fdf1ef] hover:text-[#c41617] hover:ring-[#f4dcd7]"
                        >
                          <Heart className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Move to Wishlist</span>
                          <span className="sm:hidden">Wishlist</span>
                        </button>
                        <button
                          onClick={() => removeItem(item.id)}
                          aria-label="Remove item"
                          title="Remove from cart"
                          className="rounded-full p-1.5 text-[#b3a99f] transition-colors hover:bg-[#fdf1ef] hover:text-[#c41617]"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* ── Quantity and money ─────────────────────────────
                          The stepper beside the figures rather than stacked
                          above them. Two questions — how many, and how much —
                          asked together, and side by side they cost one row
                          instead of two.

                          They travel as a pair: when the card is too narrow for
                          five columns this is the piece that drops to a second
                          line, and it takes its rule with it, so a phone still
                          gets the money set apart from the description exactly
                          as it was. Reversed there, because the total belongs
                          on the left under the name it refers to.

                          Two thresholds, not one. At 36rem of card the pair
                          stops being a full-width footer and tucks to the
                          right. It only starts taking a share of the leftover
                          width at 54rem — the point past which it is certain
                          of a place on the first line. Growing it any earlier
                          would fling the stepper and the price to opposite
                          edges of a line they had been pushed down onto, with
                          the stepper stranded under the photograph. */}
                      <div className="flex basis-full flex-row-reverse flex-wrap items-center justify-between gap-3 border-t border-[#f0e8df] pt-2.5 @min-[36rem]:ml-auto @min-[36rem]:basis-auto @min-[36rem]:flex-row @min-[36rem]:gap-4 @min-[54rem]:grow @min-[36rem]:border-0 @min-[36rem]:pt-0">
                        {/* How many */}
                        <div className="flex shrink-0 flex-wrap items-center gap-2 sm:gap-3">
                          {!item.inStock ? (
                            <span className="text-xs sm:text-sm text-red-600 font-medium bg-red-50 px-2 py-1 rounded">Out of Stock</span>
                          ) : (item.availableStock !== undefined && item.quantity > item.availableStock) ? (
                            <span className="text-xs sm:text-sm text-amber-600 font-medium bg-amber-50 px-2 py-1 rounded">
                              Only {item.availableStock} in stock
                            </span>
                          ) : null}
                          <div className="flex items-center overflow-hidden rounded-full ring-1 ring-[#e9ded2]">
                            <button
                              onClick={() => updateQuantity(item.id, item.productId, item.quantity - 1)}
                              aria-label="Decrease quantity"
                              className="p-1.5 text-[#6b625b] transition-colors hover:bg-[#fdf1ef] hover:text-[#c41617] disabled:cursor-not-allowed disabled:opacity-30"
                              disabled={!item.inStock || item.quantity <= 1}
                            >
                              <Minus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            </button>
                            <span className="px-3 py-1 text-sm font-semibold tabular-nums text-[#1a1a1a] sm:px-3.5 sm:text-base">{item.quantity}</span>
                            <button
                              onClick={() => updateQuantity(item.id, item.productId, item.quantity + 1)}
                              aria-label="Increase quantity"
                              className="p-1.5 text-[#6b625b] transition-colors hover:bg-[#fdf1ef] hover:text-[#c41617] disabled:cursor-not-allowed disabled:opacity-30"
                              disabled={!item.inStock || (item.availableStock != null && item.quantity >= item.availableStock)}
                            >
                              <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            </button>
                          </div>
                        </div>

                        {/* How much.

                            The big figure is what this LINE costs, not what one
                            of them costs. It was the unit price, with the line
                            total underneath behind a "LINE TOTAL" label — so
                            the largest number on the card was never the number
                            the customer was checking, and the one that was
                            arrived wearing a caption explaining itself.
                            Promoting the total removes both problems.

                            The struck price scales with it, or the comparison
                            would be a line total against a single unit's
                            original — a discount several times larger than the
                            real one.

                            A floor on the width so the steppers to its left
                            line up as well, rather than shifting a few px per
                            card with the number of digits in the price. */}
                        <div className="flex shrink-0 flex-col items-start gap-0.5 @min-[36rem]:min-w-[8.5rem] @min-[36rem]:items-end @min-[36rem]:text-right">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xl font-bold tabular-nums text-[#1a1a1a] sm:text-[22px]">{formatPrice(item.price * item.quantity)}</span>
                            {item.offerStrikePrice ? (
                              <span className="text-xs sm:text-sm text-[#8a807a] line-through tabular-nums">{formatPrice(item.offerStrikePrice * item.quantity)}</span>
                            ) : item.originalPrice ? (
                              <span className="text-xs sm:text-sm text-[#8a807a] line-through tabular-nums">{formatPrice(item.originalPrice * item.quantity)}</span>
                            ) : null}
                            {item.activeOffer && (
                              <span className="inline-flex items-center rounded-full bg-linear-to-r from-[#e01a1b] to-[#ff5a36] px-2 py-0.5 text-[10px] font-bold text-white">
                                {item.activeOffer.badge}
                              </span>
                            )}
                          </div>

                          {/* The unit price, now the small print. Only where
                              there is more than one — at a quantity of one it
                              would sit directly beneath an identical figure and
                              say the same thing twice. */}
                          {item.quantity > 1 && (
                            <span className="text-xs font-medium tabular-nums text-[#8a807a]">
                              {formatPrice(item.price)} each
                            </span>
                          )}
                        </div>
                      </div>

                      {/* ── Shipping ─────────────────────────────────────
                          Its own full-width line, since it is about the line as a
                          whole and is wider than any one column holds.

                          Guarded on the wrapper, not just inside it: rendered
                          unconditionally it left an empty box carrying a top
                          margin under every line that has no shipping choice —
                          which, in the current catalogue, is all of them. */}
                      {transportOptionsFor(item).length >= 1 && (
                      <div className="basis-full">
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
                              <div className="mt-3 inline-flex items-center gap-2 rounded-lg border border-[#efeae3] bg-[#faf7f3] px-3.5 py-2.5">
                                <Truck className="w-4 h-4 text-[#8a807a]" />
                                <span className="text-xs font-medium text-[#4a423c]">
                                  Shipping: <span className="font-semibold text-[#1a1a1a]">{mode === 'AIR' ? 'Air' : 'Sea'}</span>
                                  {days ? <span className="text-[#b3a99f]"> · {days} days</span> : null}
                                  {item.courier ? <span className="text-[#b3a99f]"> · </span> : null}
                                  {item.courier ? <span className="font-semibold text-[#1a1a1a]">{courierName(item.courier)}</span> : null}
                                </span>
                                <Link href={shippingHref} className="text-xs font-semibold text-[#e01a1b] hover:underline ml-1">
                                  Change
                                </Link>
                              </div>
                            )
                          })()}
                      </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Empty State — Order-page style polished card */}
            {cartItems.length === 0 && (
              <Reveal className="bg-white rounded-2xl ring-1 ring-black/5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] p-6 sm:p-8 lg:p-12 text-center">
                <ShoppingCart className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 text-[#d9d0c6] mx-auto mb-3 sm:mb-4" />
                <h3 className="font-playfair text-lg sm:text-xl font-semibold text-[#1a1a1a] mb-2">Your cart is empty</h3>
                <p className="text-sm sm:text-base text-[#6b625b] mb-5 sm:mb-6">Add some items to get started</p>
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
              {/* ── Summary ──────────────────────────────────────────────
                  Promo code and totals in ONE card, not two stacked ones.
                  They are a single job — work out what this costs — and
                  splitting them put a heading, a border and a shadow between
                  a customer and the only number they are looking for. */}
              <div className="overflow-hidden rounded-xl bg-white shadow-[0_1px_2px_rgba(90,60,40,0.05)] ring-1 ring-[#efe6df] sm:rounded-2xl lg:sticky lg:top-8">
              <div className="border-b border-[#f0e8df] p-4 sm:p-5 lg:p-6">
                <h3 className="font-playfair text-base sm:text-lg font-semibold text-[#1a1a1a] mb-3 sm:mb-4">Promo Code</h3>
                <div className="flex gap-2 sm:gap-3">
                  <input
                    type="text"
                    placeholder="Enter promo code"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value)}
                    className="flex-1 min-w-0 px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border border-[#e3dbd1] rounded-lg sm:rounded-xl focus:ring-2 focus:ring-[#e01a1b]/40 focus:border-[#e01a1b] outline-none"
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

                <div className="border-b border-[#f0e8df] bg-linear-to-r from-[#faf5ef] to-white px-4 py-3 sm:px-6 sm:py-4">
                  <h2 className="font-playfair text-lg sm:text-xl font-semibold text-[#1a1a1a]">Order Summary</h2>
                </div>

                <div className="p-4 sm:p-5 lg:p-6">
                  <div className="space-y-4 mb-6">
                    <div className="flex justify-between">
                      <span className="text-[#6b625b]">Subtotal</span>
                      <span className="font-medium tabular-nums text-[#1a1a1a]">{formatPrice(summary.subtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#6b625b]">Shipping</span>
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
                      <span className="text-[#6b625b]">Tax (GST)</span>
                      <span className="font-medium tabular-nums text-[#1a1a1a]">{formatPrice(summary.tax)}</span>
                    </div>
                    {summary.discount > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span>Discount</span>
                        <span className="font-medium">-{formatPrice(summary.discount)}</span>
                      </div>
                    )}
                    <div className="border-t border-[#f0e8df] pt-4">
                      <div className="flex items-baseline justify-between font-bold text-[#1a1a1a]">
                        <span className="text-base sm:text-lg">Total</span>
                        <span className="text-xl tabular-nums sm:text-2xl">{formatPrice(summary.total)}</span>
                      </div>
                    </div>
                  </div>

                  {cartItems.some(needsTransportChoice) ? (
                    <button
                      disabled
                      className="w-full bg-[#e8e2d9] text-[#8a807a] font-semibold py-4 px-6 rounded-xl shadow-none flex items-center justify-center gap-2 mb-4 cursor-not-allowed"
                    >
                      <Truck className="w-5 h-5" />
                      Choose a shipping method to proceed
                    </button>
                  ) : cartItems.some(item => !item.inStock || (item.availableStock !== undefined && item.quantity > item.availableStock)) ? (
                    <button
                      disabled
                      className="w-full bg-[#e8e2d9] text-[#8a807a] font-semibold py-4 px-6 rounded-xl shadow-none flex items-center justify-center gap-2 mb-4 cursor-not-allowed"
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

                  {/* What this basket saved, as one figure.

                      Every line already shows its own struck price, but nobody
                      adds six of them up in their head — so the total is the
                      one piece of arithmetic worth doing for the customer, and
                      it is the last thing they read before the button.

                      It is measured against what each line is struck through
                      at, which is exactly the number printed beside it, plus
                      whatever a promo code took off. Nothing is asserted here
                      that is not already visible further up the page, which is
                      why it needs no policy behind it to stay true — unlike a
                      shipping or returns claim, it cannot quietly go stale.

                      Hidden entirely at zero rather than announcing a saving
                      of nothing: a full-price basket should say nothing at
                      all. */}
                  {(() => {
                    const listTotal = cartItems.reduce((sum, item) => {
                      const list = item.offerStrikePrice ?? item.originalPrice ?? item.price
                      return sum + (list > item.price ? list : item.price) * item.quantity
                    }, 0)
                    const saved = (listTotal - summary.subtotal) + summary.discount
                    if (listTotal <= 0 || saved < 0.01) return null
                    const pct = Math.round((saved / listTotal) * 100)
                    return (
                      <div className="mt-1 border-t border-[#f0e8df] pt-4 text-center">
                        <p className="text-xs font-medium text-[#6b625b] sm:text-[13px]">
                          You&apos;re saving{' '}
                          <span className="font-bold tabular-nums text-green-700">{formatPrice(saved)}</span>
                          {pct > 0 ? <span className="tabular-nums text-[#8a807a]"> ({pct}%)</span> : null}
                          {' '}on this order
                        </p>
                      </div>
                    )
                  })()}
                </div>
              </div>

              {/* Recently Viewed - Removed for now, can be added later with proper backend integration */}
            </div>
          )}
        </div>

        {/* Similar Products — driven by the categories of items in the cart */}
        {similarProducts.length > 0 && (
          <section className="mt-8 sm:mt-10 lg:mt-12">
            <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
              <Package className="w-6 h-6 sm:w-7 sm:h-7 text-[#e01a1b] shrink-0" />
              <div>
                <h2 className="font-playfair text-xl sm:text-2xl font-semibold text-[#1a1a1a]">You Might Also Like</h2>
                <p className="text-xs sm:text-sm text-[#6b625b]">Similar products based on your cart</p>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5 sm:gap-3">
              {similarProducts.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </section>
        )}

        {/* Empty-cart discovery rails */}
        {cartItems.length === 0 && (
          <>
            {[
              { key: 'sug', title: 'Suggested for You', subtitle: 'Picks based on what you’ve been searching for', Icon: Sparkles, items: suggested },
              { key: 'top', title: 'Top Selling', subtitle: 'Most loved by our customers', Icon: TrendingUp, items: topSelling },
              { key: 'rv', title: 'Recently Viewed', subtitle: 'Pick up where you left off', Icon: Clock, items: recentlyViewed },
            ].filter((s) => s.items.length > 0).map((s) => (
              <section key={s.key} className="mt-8 sm:mt-10 lg:mt-12">
                <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
                  <s.Icon className="w-6 h-6 sm:w-7 sm:h-7 text-[#e01a1b] shrink-0" />
                  <div>
                    <h2 className="font-playfair text-xl sm:text-2xl font-semibold text-[#1a1a1a]">{s.title}</h2>
                    <p className="text-xs sm:text-sm text-[#6b625b]">{s.subtitle}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5 sm:gap-3">
                  {s.items.map((p) => (
                    <ProductCard key={p.id} product={p} />
                  ))}
                </div>
              </section>
            ))}
          </>
        )}
      </div>
    </div>
  )
}
