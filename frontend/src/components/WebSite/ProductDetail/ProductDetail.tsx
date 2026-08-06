'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { productService, Product, ProductVariant } from '@/services/productService';
import { publicProductService, type PublicProduct } from '@/services/publicProductService';
import ProductCard from '@/components/WebSite/ProductCard/ProductCard';
import { cartService } from '@/services/cartService';
import { userAuthService } from '@/services/userAuthService';
import { Star, Heart, Truck, Shield, RotateCcw, Package, Plane, Ship, AlertTriangle, Info, Box, Check, User, Award, Clock, ShoppingCart, ChevronDown, Tag, Search, ThumbsUp, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { hasManufacturerInfo, manufacturerDisplayName } from '@/lib/manufacturerInfo';
import { useToast } from '@/hooks/use-toast';
import { showSuccessToast, showErrorToast, showWarningToast } from '@/lib/toast-utils';
import { wishlistService } from '@/services/wishlistService';
import { trackProductView } from '@/services/analyticsService';
import reviewService from '@/services/reviewService';
import { getCountryName, getCountryFlag } from '@/components/WebSite/CheckOut/CheckoutProcess/constants';
import Image from 'next/image';
import { formatPrice, getRegionalPrice, getRegionalOriginalPrice, isVisibleInRegion, getCurrency, getRegion, convertINRtoUSD } from '@/lib/currency';
import { transportModeLabel, isSurfaceRegion, type Courier } from '@/lib/couriers';
import { courierService } from '@/services/courierService';
import { applyOfferToPrice, offerEndsLabel, type ActiveOffer, type PublicOffer } from '@/lib/offers';
import { offerService } from '@/services/offerService';
import { couponService, type PopupCoupon } from '@/services/couponService';
import { calculateLogistics, formatWeight, formatDimensions, LogisticsConfig } from '@/lib/logistics';
import PromotionalPopup from '@/components/WebSite/PromotionalPopup/PromotionalPopup';
import Reveal from '@/components/WebSite/Shared/Reveal';
import CourierBadge from '@/components/Shared/CourierBadge';
import FeaturedProducts from '@/components/WebSite/Featured/Products';
// Same care-symbol catalogue the vendor picks from on the product form, so the
// storefront shows the exact icons they selected.
import { CARE_INSTRUCTIONS, CareIcon, CATEGORY_COLORS } from '@/components/VendorDashboard/Products/CareInstructionModal';

interface ProductDetailProps {
  productSlug: string;
}

const ProductDetail = ({ productSlug }: ProductDetailProps) => {
  const [product, setProduct] = useState<Product | null>(null);
  // "You may also like" — same-category products, fetched once the product loads.
  const [relatedProducts, setRelatedProducts] = useState<PublicProduct[]>([]);
  // Live store promotions for the promo banner below related products.
  const [promoOffers, setPromoOffers] = useState<PublicOffer[]>([]);
  // A category coupon (highest-priority promo in the sticky rail's Offers card).
  const [categoryCoupon, setCategoryCoupon] = useState<PopupCoupon | null>(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showAllDetails, setShowAllDetails] = useState(false);
  // Active tab in the product-information panel (Description / Specifications / …).
  const [activeInfoTab, setActiveInfoTab] = useState<string>('description');
  const [isImageHovered, setIsImageHovered] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [imageRef, setImageRef] = useState<HTMLImageElement | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [transportOverride, setTransportOverride] = useState<'AIR' | 'SHIP' | null>(null);
  // Courier partner chosen for this line. Required before checkout whenever the
  // product ships. Cleared when the transport mode changes (the list is mode-specific).
  const [selectedCourier, setSelectedCourier] = useState<string | null>(null);

  // Deep-link from the cart: "?selectShipping=1&cartItem=<id>" means the shopper
  // came here specifically to choose a shipping method for a line already in their
  // cart. We scroll to + highlight the Shipping card and, on save, write the choice
  // back to that cart line and return them to the cart.
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnCartItemId = searchParams.get('cartItem');
  const shouldSelectShipping = searchParams.get('selectShipping') === '1';
  const shippingCardRef = useRef<HTMLDivElement | null>(null);
  const [highlightShipping, setHighlightShipping] = useState(false);
  const [savingShipping, setSavingShipping] = useState(false);
  // Reviews
  const [reviews, setReviews] = useState<{ id: string; rating: number; comment?: string; images?: string[]; createdAt: string; user?: { name: string; image?: string | null; country?: string | null } }[]>([]);
  const [showReviews] = useState(true); // reviews are always shown
  const [loadingReviews, setLoadingReviews] = useState(true);
  // Review toolbar state (all client-side over the fetched list)
  const [reviewSort, setReviewSort] = useState<'newest' | 'oldest' | 'highest' | 'lowest'>('newest');
  const [reviewStar, setReviewStar] = useState<number>(0); // 0 = all
  const [reviewSearch, setReviewSearch] = useState('');
  const [reviewShown, setReviewShown] = useState(5); // Load-more window
  const [helpfulIds, setHelpfulIds] = useState<Set<string>>(new Set());
  const [lightbox, setLightbox] = useState<{ images: string[]; index: number } | null>(null);
  const [showMakerModal, setShowMakerModal] = useState(false);

  // Reviews are always shown — load them automatically once the product is known.
  useEffect(() => {
    const pid = product?.id;
    if (!pid) return;
    let cancelled = false;
    setLoadingReviews(true);
    reviewService.getProductReviews(pid)
      .then((res) => { if (!cancelled && res.success && res.data) setReviews(res.data); })
      .catch(() => { /* ignore */ })
      .finally(() => { if (!cancelled) setLoadingReviews(false); });
    return () => { cancelled = true; };
  }, [product?.id]);

  // Client-side search + star-filter + sort over the fetched review list.
  const filteredReviews = useMemo(() => {
    const q = reviewSearch.trim().toLowerCase();
    const list = reviews.filter((r) => {
      if (reviewStar && Math.round(r.rating || 0) !== reviewStar) return false;
      if (q && !`${r.comment || ''} ${r.user?.name || ''}`.toLowerCase().includes(q)) return false;
      return true;
    });
    return [...list].sort((a, b) => {
      if (reviewSort === 'highest') return (b.rating || 0) - (a.rating || 0);
      if (reviewSort === 'lowest') return (a.rating || 0) - (b.rating || 0);
      const d = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return reviewSort === 'oldest' ? d : -d;
    });
  }, [reviews, reviewSort, reviewStar, reviewSearch]);

  // Reset the load-more window whenever the filters change.
  useEffect(() => { setReviewShown(5); }, [reviewSort, reviewStar, reviewSearch]);

  // Close the manufacturer modal on Escape.
  useEffect(() => {
    if (!showMakerModal) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowMakerModal(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showMakerModal]);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        const response = await productService.getPublicProduct(productSlug);

        if (response.success && response.data) {
          setProduct(response.data);

          // Track product view for analytics heat map
          let source = 'direct';
          try {
            const ref = typeof document !== 'undefined' ? document.referrer : '';
            if (ref) {
              if (ref.includes('/categories')) source = 'category';
              else if (ref.includes('/search')) source = 'search';
              else if (ref.includes('/products')) source = 'related';
              else {
                try {
                  if (new URL(ref).pathname === '/') source = 'home';
                } catch {/* ignore bad URL */}
              }
            }
          } catch {/* keep default 'direct' */}

          const viewedKey = `m2c_viewed_${response.data.id}`;
          if (!sessionStorage.getItem(viewedKey)) {
            sessionStorage.setItem(viewedKey, '1');
            trackProductView({
              productId: response.data.id,
              productName: response.data.name,
              category: response.data.category,
              source,
            });
          }
        }
      } catch (error) {
        console.error('Failed to fetch product:', error);
        showErrorToast('Error', 'Failed to load product details');
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [productSlug]);

  // Live store promotions (offers page feed). Purely additive — the banner hides
  // itself when there are no active offers.
  useEffect(() => {
    let cancelled = false;
    offerService.getActiveOffers()
      .then((offers) => { if (!cancelled) setPromoOffers(Array.isArray(offers) ? offers.slice(0, 6) : []); })
      .catch(() => { if (!cancelled) setPromoOffers([]); });
    return () => { cancelled = true; };
  }, []);

  // Category coupon (marked show-as-popup) — the top-priority promo for this product.
  useEffect(() => {
    if (!product?.category) { setCategoryCoupon(null); return; }
    let cancelled = false;
    couponService.getPopupCoupon(product.category)
      .then((c) => { if (!cancelled) setCategoryCoupon(c); })
      .catch(() => { if (!cancelled) setCategoryCoupon(null); });
    return () => { cancelled = true; };
  }, [product?.category]);

  // Related products — matched by category → sub-category → recent, then ordered
  // to surface the same fabric type first. Broadening the net (instead of category
  // only) means the section reliably populates even when a category is sparse.
  useEffect(() => {
    if (!product?.id) { setRelatedProducts([]); return; }
    let cancelled = false;
    const subCat = (product as { subCategory?: string }).subCategory;
    (async () => {
      const seen = new Map<string, PublicProduct>();
      const add = (items?: PublicProduct[]) => {
        (items || []).forEach((p) => { if (p.id !== product.id && !seen.has(p.id)) seen.set(p.id, p); });
      };
      try {
        if (product.category) {
          const r = await publicProductService.getProducts({ category: product.category, limit: 12 });
          if (r.success) add(r.data?.items);
        }
        if (seen.size < 4 && subCat) {
          const r = await publicProductService.getProducts({ subCategory: subCat, limit: 12 });
          if (r.success) add(r.data?.items);
        }
        // Fallback so the section isn't empty when the category is sparse.
        if (seen.size < 4) {
          const r = await publicProductService.getProducts({ limit: 12, sortBy: 'createdAt', sortOrder: 'desc' });
          if (r.success) add(r.data?.items);
        }
        let list = Array.from(seen.values());
        // Prefer the same fabric type (closest match) first.
        if (product.fabricType) {
          const ft = product.fabricType;
          list = list.sort((a, b) => Number(b.fabricType === ft) - Number(a.fabricType === ft));
        }
        if (!cancelled) setRelatedProducts(list.slice(0, 4));
      } catch {
        if (!cancelled) setRelatedProducts([]);
      }
    })();
    return () => { cancelled = true; };
  }, [product?.id, product?.category, product?.fabricType]);

  // Check wishlist status after product loads
  useEffect(() => {
    if (!product?.id) return;
    wishlistService.isInWishlist(product.id).then(setIsWishlisted).catch(() => {});
  }, [product?.id]);

  // Smart logistics calculation (must be before any conditional returns)
  const logisticsResult = useMemo(() => {
    if (!product?.logisticsConfig) return null;
    return calculateLogistics(product.logisticsConfig as LogisticsConfig, quantity, transportOverride || undefined, getRegion());
  }, [product?.logisticsConfig, quantity, transportOverride]);

  // Admin-managed couriers, loaded once for this region (also primes the registry so
  // courierName resolves this order's courier later in the cart/checkout).
  const [allCouriers, setAllCouriers] = useState<Courier[]>([]);
  useEffect(() => {
    courierService.getActiveCouriers(getRegion()).then(setAllCouriers).catch(() => setAllCouriers([]));
  }, []);

  // Courier partners available for this shopper's region + chosen transport mode. When
  // the product has selected specific couriers (logisticsConfig.courierIds), restrict to
  // those; otherwise (legacy products) show all region+mode couriers. AIR vs SHIP narrows.
  const courierOptions = useMemo(() => {
    if (!logisticsResult) return [];
    const region = getRegion();
    const mode = logisticsResult.selectedTransport;
    const picked = (product?.logisticsConfig as { courierIds?: string[] } | undefined)?.courierIds;
    return allCouriers.filter((c) =>
      c.region === region &&
      c.modes.includes(mode) &&
      (!picked || picked.length === 0 || picked.includes(c.id))
    );
  }, [allCouriers, logisticsResult, product?.logisticsConfig]);

  // Whenever the transport mode changes, drop a courier that no longer belongs to the
  // new list (e.g. picked an AIR courier, then switched to SHIP).
  useEffect(() => {
    if (selectedCourier && !courierOptions.some((c) => c.id === selectedCourier)) {
      setSelectedCourier(null);
    }
  }, [courierOptions, selectedCourier]);

  // Arrived from the cart to pick a shipping method: scroll the Shipping card into
  // view and pulse a highlight so it's obvious what to do. MUST stay above the early
  // returns below — a hook after a conditional return changes hook order across
  // renders (Rules of Hooks). The guard lives inside the effect, not around it.
  useEffect(() => {
    if (!shouldSelectShipping || !product?.logisticsConfig) return;
    const t = setTimeout(() => {
      shippingCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightShipping(true);
      setTimeout(() => setHighlightShipping(false), 2600);
    }, 300);
    return () => clearTimeout(t);
  }, [shouldSelectShipping, product?.logisticsConfig]);

  if (loading) {
    /*
      Skeleton mirrors the product detail layout: 2-column grid with an
      aspect-square main image + thumbnails on the left and the title /
      rating / price / details / stock / shipping stack on the right.
      Same outer max-w-360 container so the page doesn't reflow when the
      fetch resolves.
    */
    return (
      <div className="max-w-7xl xl:max-w-420 mx-auto px-3 sm:px-4 md:px-6 lg:px-8 pt-1 pb-4 sm:pb-6 lg:pb-8">
        <div className="flex items-center gap-2 mb-4 sm:mb-6 overflow-hidden">
          <div className="h-4 w-12 bg-gray-200 rounded animate-pulse shrink-0" />
          <div className="h-4 w-4 bg-gray-100 rounded animate-pulse shrink-0" />
          <div className="h-4 w-20 bg-gray-200 rounded animate-pulse shrink-0" />
          <div className="h-4 w-4 bg-gray-100 rounded animate-pulse shrink-0" />
          <div className="h-4 w-32 bg-gray-200 rounded animate-pulse shrink-0" />
        </div>
        <div className="bg-white rounded-2xl overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
            {/* Image column skeleton */}
            <div className="p-4 sm:p-6 lg:p-12 bg-linear-to-br from-gray-50 to-white">
              <div className="aspect-square bg-gray-200 rounded-xl animate-pulse mb-4 sm:mb-6" />
              <div className="flex gap-2 sm:gap-3 overflow-x-auto scrollbar-hide">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="w-14 h-14 sm:w-20 sm:h-20 bg-gray-200 rounded-lg animate-pulse shrink-0" />
                ))}
              </div>
            </div>

            {/* Details column skeleton */}
            <div className="p-4 sm:p-6 lg:p-12 space-y-4 sm:space-y-6">
              {/* Title */}
              <div className="space-y-3">
                <div className="h-9 w-3/4 bg-gray-200 rounded animate-pulse" />
                <div className="h-9 w-1/2 bg-gray-200 rounded animate-pulse" />
              </div>

              {/* Rating row */}
              <div className="flex items-center gap-2">
                <div className="h-5 w-28 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-20 bg-gray-100 rounded animate-pulse" />
              </div>

              {/* Price card */}
              <div className="border border-gray-100 rounded-xl p-5 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-28 bg-gray-200 rounded animate-pulse" />
                  <div className="h-6 w-20 bg-gray-100 rounded animate-pulse" />
                  <div className="h-6 w-20 bg-gray-200 rounded animate-pulse" />
                </div>
                <div className="h-3 w-32 bg-gray-100 rounded animate-pulse" />
              </div>

              {/* Product details card */}
              <div className="border border-gray-100 rounded-xl p-5 space-y-4">
                <div className="h-5 w-32 bg-gray-200 rounded animate-pulse" />
                <div className="flex items-center gap-3">
                  <div className="h-4 w-16 bg-gray-100 rounded animate-pulse" />
                  <div className="w-7 h-7 bg-gray-200 rounded-full animate-pulse" />
                  <div className="h-8 w-32 bg-gray-200 rounded animate-pulse" />
                </div>
              </div>

              {/* Stock card */}
              <div className="border border-gray-100 rounded-xl p-5 space-y-2">
                <div className="h-5 w-40 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-64 bg-gray-100 rounded animate-pulse" />
              </div>

              {/* Shipping card */}
              <div className="border border-gray-100 rounded-xl p-5 space-y-3">
                <div className="flex justify-between items-center">
                  <div className="h-5 w-40 bg-gray-200 rounded animate-pulse" />
                  <div className="h-6 w-24 bg-gray-100 rounded-full animate-pulse" />
                </div>
                <div className="flex justify-between">
                  <div className="h-4 w-24 bg-gray-100 rounded animate-pulse" />
                  <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
                </div>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div className="h-12 bg-gray-200 rounded-lg animate-pulse" />
                  <div className="h-12 bg-gray-100 rounded-lg animate-pulse" />
                </div>
              </div>

              {/* Add to cart button */}
              <div className="h-12 w-full bg-gray-200 rounded-lg animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product || !isVisibleInRegion((product as any).priceVisibility)) {
    return (
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-10 sm:py-12 lg:py-16">
        <div className="text-center">
          <h1 className="font-playfair text-2xl sm:text-3xl lg:text-4xl font-semibold text-[#1a1a1a] mb-3 sm:mb-4 tracking-tight">Product Not Available</h1>
          <p className="text-sm sm:text-base text-gray-600 mb-5 sm:mb-8">This product is not available in your region or no longer exists.</p>
          <a href="/products" className="btn-shine inline-flex items-center justify-center bg-[#e01a1b] text-white px-6 py-3 text-sm sm:text-base rounded-full font-semibold hover:bg-[#c41617] shadow-[0_6px_20px_rgba(224,26,27,0.3)] hover:shadow-[0_12px_30px_rgba(224,26,27,0.45)] hover:-translate-y-0.5 transition-all duration-300">
            Back to Products
          </a>
        </div>
      </div>
    );
  }

  // Filter variants by region visibility
  const visibleVariants = product.variants?.filter(
    (v: any) => isVisibleInRegion(v.priceVisibility)
  ) || [];

  // Get images - use variant images if variant is selected, otherwise use product images
  const displayImages = selectedVariant?.images && selectedVariant.images.length > 0
    ? selectedVariant.images.map((url: string) => ({ url, isPrimary: false }))
    : product.images || [];

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!imageRef) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    setMousePosition({ x, y });
  };

  const handleMouseEnter = () => {
    setIsImageHovered(true);
  };

  const handleMouseLeave = () => {
    setIsImageHovered(false);
  };

  const handleAddToCart = async () => {
    if (!product) return;

    // Check if user is authenticated
    const isAuthenticated = userAuthService.isAuthenticated();

    if (!isAuthenticated) {
      showErrorToast('Login Required', 'Please login to add items to cart');
      // Redirect to login page after a short delay
      setTimeout(() => {
        window.location.href = '/login';
      }, 1500);
      return;
    }

    // A shipping product must have a courier chosen — it travels with the order.
    if (product.logisticsConfig && logisticsResult && !selectedCourier) {
      showErrorToast('Courier required', 'Please choose a courier partner before adding to cart.');
      shippingCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightShipping(true);
      setTimeout(() => setHighlightShipping(false), 2600);
      return;
    }

    try {
      // Add to cart via API — carry the shipping choice so the line lands ready to
      // check out (both are re-validated server-side at order time).
      await cartService.addToCart(product.id, quantity, selectedVariant?.id,
        logisticsResult
          ? { transportType: logisticsResult.selectedTransport, courier: selectedCourier }
          : undefined
      );

      const variantInfo = selectedVariant ? ` (${[selectedVariant.size, selectedVariant.color].filter(Boolean).join(" - ")})` : 
        (product.singleUnitSize || product.singleUnitColor ? ` (${[product.singleUnitSize, product.singleUnitColor].filter(Boolean).join(' - ')})` : '');

      showSuccessToast(
        'Added to Cart!',
        `${quantity} x ${product.name}${variantInfo} has been added to your cart.`
      );

      // Reset quantity after adding
      setQuantity(1);
    } catch (error: any) {
      console.error('Error adding to cart:', error);
      showErrorToast('Failed to Add', error.message || 'Unable to add item to cart. Please try again.');
    }
  };

  // Persist the chosen method to the originating cart line, then go back to the cart.
  const handleSaveShippingAndReturn = async () => {
    if (!returnCartItemId || !logisticsResult) return;
    if (!selectedCourier) {
      showErrorToast('Courier required', 'Please choose a courier partner before continuing.');
      return;
    }
    setSavingShipping(true);
    try {
      await cartService.setShipping(returnCartItemId, logisticsResult.selectedTransport, selectedCourier);
      showSuccessToast('Shipping method saved', 'Returning you to your cart.');
      router.push('/cart');
    } catch (error: any) {
      showErrorToast('Could not save', error?.message || 'Please try again.');
      setSavingShipping(false);
    }
  };

  // Handle quantity increment — cap at available stock
  const handleIncrement = () => {
    setQuantity(prev => (prev < availableStock ? prev + 1 : prev));
  };

  // Handle quantity decrement
  const handleDecrement = () => {
    if (quantity > 1) {
      setQuantity(prev => prev - 1);
    }
  };

  // Handle manual quantity input
  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '') {
      setQuantity(0 as any); // temporary empty state while typing
      return;
    }
    const num = parseInt(value, 10);
    if (!isNaN(num) && num >= 0) {
      if (num > availableStock) {
        showWarningToast('Stock Limit', `Only ${availableStock} ${product?.uom || 'pcs'} available in stock`);
        setQuantity(availableStock);
      } else {
        setQuantity(num);
      }
    }
  };

  // On blur, ensure quantity is at least 1
  const handleQuantityBlur = () => {
    if (!quantity || quantity < 1) {
      setQuantity(1);
    }
  };

  // Buy Now — same guards as Add to Cart, add the line, then jump straight to checkout.
  const handleBuyNow = async () => {
    if (!product) return;

    if (!userAuthService.isAuthenticated()) {
      showErrorToast('Login Required', 'Please login to continue to checkout');
      setTimeout(() => { window.location.href = '/login'; }, 1500);
      return;
    }

    // A shipping product must have a courier chosen — it travels with the order.
    if (product.logisticsConfig && logisticsResult && !selectedCourier) {
      showErrorToast('Courier required', 'Please choose a courier partner before checking out.');
      shippingCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightShipping(true);
      setTimeout(() => setHighlightShipping(false), 2600);
      return;
    }

    try {
      await cartService.addToCart(product.id, quantity, selectedVariant?.id,
        logisticsResult
          ? { transportType: logisticsResult.selectedTransport, courier: selectedCourier }
          : undefined
      );
      router.push('/checkout');
    } catch (error: any) {
      showErrorToast('Checkout Failed', error?.message || 'Unable to proceed to checkout. Please try again.');
    }
  };

  const handleWishlistToggle = async () => {
    if (!product) return;

    const isAuthenticated = userAuthService.isAuthenticated();

    if (!isAuthenticated) {
      showErrorToast('Login Required', 'Please login to add items to your wishlist');
      // Redirect to login page after a short delay
      setTimeout(() => {
        window.location.href = '/login';
      }, 1500);
      return;
    }

    // Optimistic update — UI changes instantly
    const wasWishlisted = isWishlisted;
    setIsWishlisted(!wasWishlisted);

    try {
      if (wasWishlisted) {
        await wishlistService.removeFromWishlist(product.id);
        showSuccessToast('Removed from Wishlist', `${product.name} has been removed from your wishlist.`);
      } else {
        await wishlistService.addToWishlist(product.id);
        showSuccessToast('Added to Wishlist!', `${product.name} has been saved to your wishlist.`);
      }
    } catch (error: any) {
      if (error.message?.includes('already in wishlist')) {
        setIsWishlisted(true);
      } else {
        setIsWishlisted(wasWishlisted);
        showErrorToast('Wishlist Error', 'Unable to update wishlist. Please try again.');
      }
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-5 h-5 ${i < Math.floor(rating)
          ? 'text-yellow-400 fill-current'
          : i < rating
            ? 'text-yellow-400 fill-current opacity-50'
            : 'text-gray-300'
          }`}
      />
    ));
  };

  // Get available stock based on selected variant or base stock
  const availableStock = selectedVariant
    ? selectedVariant.stock
    : (product.inventory?.baseStock ?? product.totalStock ?? 0);

  // A variant product is still purchasable through its BASE unit (the "Default
  // Variant" card, selectedVariant === null) — that is a valid selection, not an
  // empty one. So the only truly un-buyable state is a variant product whose base
  // has no stock AND every variant is hidden in this region: nothing to sell.
  const baseHasStock = (product.inventory?.baseStock ?? product.totalStock ?? 0) > 0;
  const nothingBuyable = product.hasVariants && visibleVariants.length === 0 && !baseHasStock;
  // A shipping product needs a courier before it can be added — see the shipping card.
  const courierMissing = !!(product.logisticsConfig && logisticsResult) && !selectedCourier;

  // Get current price based on region + selected variant
  const currentPrice = selectedVariant
    ? getRegionalPrice(selectedVariant)
    : getRegionalPrice(product);
  const originalPrice = selectedVariant
    ? getRegionalOriginalPrice(selectedVariant) ?? selectedVariant.originalPrice
    : getRegionalOriginalPrice(product) ?? product.originalPrice;

  // Automatic offer for this product (attached by the backend). It targets the product
  // (or its category/store), so it applies whether or not a variant is selected. The
  // effective price is the offer applied to the current selling price; the pre-offer
  // price becomes the strike-through. Checkout re-resolves this server-side.
  const activeOffer: ActiveOffer | undefined = (product as { activeOffer?: ActiveOffer }).activeOffer;
  const offeredPrice = activeOffer
    ? applyOfferToPrice(currentPrice, activeOffer, getCurrency(), quantity, convertINRtoUSD)
    : currentPrice;
  const hasOfferSaving = activeOffer != null && offeredPrice < currentPrice;
  const offerEnds = activeOffer ? offerEndsLabel(activeOffer.endsAt) : null;

  // Get current image URL
  const currentImageUrl = displayImages[selectedImage]?.url;

  // "Why choose this?" reasons — derived from real product/vendor data, used in the
  // hero rail (under the manufacturer card). Items with no backing data are skipped.
  const whyChoose: { icon: any; title: string; desc: string }[] = [];
  if (product.dispatchTimeline) whyChoose.push({ icon: Truck, title: 'Fast Dispatch', desc: 'Fast delivery' });
  if (logisticsResult && logisticsResult.totalShippingCost === 0) whyChoose.push({ icon: Ship, title: 'Free Shipping', desc: 'No shipping charge on this item' });
  if (product.hasVariants && visibleVariants.length > 0) whyChoose.push({ icon: Box, title: 'Multiple Options', desc: `${visibleVariants.length} variant${visibleVariants.length === 1 ? '' : 's'} to choose from` });
  if (availableStock > 0) whyChoose.push({ icon: Check, title: 'In Stock', desc: `${availableStock} unit${availableStock === 1 ? '' : 's'} available now` });
  if (hasManufacturerInfo(product.manufacturerInfo)) {
    const m = product.manufacturerInfo!;
    const detail = (m.experience && m.experience.trim())
      ? `${m.experience} of experience`
      : (m.role && m.role.trim() ? m.role : `Crafted by ${manufacturerDisplayName(m)}`);
    whyChoose.push({ icon: Award, title: 'Trusted Manufacturer', desc: detail });
  }

  return (
    <>
      <PromotionalPopup category={product.category} />

      <div className="bg-gray-50 min-h-screen font-sans">
        {/* Custom styles for image magnification */}
        <style jsx>{`
          .product-info-container {
            position: relative;
          }
          @media (min-width: 1024px) {
            .product-info-container {
              min-height: 600px;
            }
          }

          /* Smooth transitions for image switching */
          .magnify-image {
            animation: fadeIn 0.3s ease-in-out;
          }

          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }

          /* Gentle float for the CTA banner image collage (GPU-friendly). */
          .cta-float { animation: ctaFloat 5s ease-in-out infinite; will-change: transform; }
          .cta-float-2 { animation: ctaFloat 6.5s ease-in-out infinite; animation-delay: 0.8s; will-change: transform; }
          @keyframes ctaFloat { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-9px); } }
          @media (prefers-reduced-motion: reduce) {
            .cta-float, .cta-float-2 { animation: none; }
          }
        `}</style>

        <div className="max-w-7xl xl:max-w-420 mx-auto px-3 sm:px-4 md:px-6 lg:px-8 pt-1 pb-4 sm:pb-6 lg:pb-8">
          <div className="bg-white rounded-xl sm:rounded-2xl overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
              {/* Product Images */}
              <div className="lg:col-span-4 p-3 sm:p-4 lg:p-6 bg-linear-to-br from-[#faf9f7] to-white">
                <div className="lg:sticky lg:top-8">
                  {/*
                    Gallery — vertical thumbnail rail beside the image on desktop,
                    horizontal strip beneath it on mobile. One markup drives both:
                    DOM order is [thumbs, image]; `flex-col-reverse` puts the image
                    on top for mobile, `lg:flex-row` puts the rail on the left.
                  */}
                  <div className="flex flex-col-reverse lg:flex-row gap-3 sm:gap-4">
                    {/* Image Thumbnails */}
                    {displayImages.length > 1 && (
                      <div className="flex lg:flex-col gap-2 sm:gap-3 overflow-x-auto lg:overflow-visible scrollbar-hide shrink-0 -mx-1 px-1 lg:mx-0 lg:px-0">
                        {displayImages.map((image: any, index: number) => (
                          <button
                            key={index}
                            onClick={() => setSelectedImage(index)}
                            onMouseEnter={() => setSelectedImage(index)}
                            className={`relative w-14 h-14 sm:w-16 sm:h-16 lg:w-[68px] lg:h-[68px] rounded-xl overflow-hidden transition-all duration-300 shrink-0 lg:hover:scale-105 ring-1 ${selectedImage === index
                              ? 'ring-2 ring-[#e01a1b] shadow-[0_6px_18px_rgba(224,26,27,0.28)]'
                              : 'ring-black/[0.08] hover:ring-[#e01a1b]/40 hover:shadow-md'
                              }`}
                          >
                            {image.url ? (
                              <Image
                                src={image.url}
                                alt={`${product.name} ${index + 1}`}
                                width={80}
                                height={80}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-gray-100">
                                <Package className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" />
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Main Image with Custom Magnification */}
                    <div
                      className="flex-1 min-w-0 aspect-square bg-white rounded-2xl overflow-hidden ring-1 ring-black/5 shadow-[0_8px_30px_rgba(0,0,0,0.08)] relative lg:cursor-crosshair"
                      onMouseMove={handleMouseMove}
                      onMouseEnter={handleMouseEnter}
                      onMouseLeave={handleMouseLeave}
                    >
                      {currentImageUrl ? (
                        <Image
                          ref={setImageRef}
                          src={currentImageUrl}
                          alt={product.name}
                          width={600}
                          height={600}
                          className="w-full h-full object-cover transition-opacity duration-300"
                          style={{ opacity: isImageHovered ? 0.8 : 1 }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-100">
                          <Package className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 text-gray-400" />
                        </div>
                      )}

                      {/* Lens overlay — desktop only */}
                      {isImageHovered && currentImageUrl && (
                        <div
                          className="hidden lg:block absolute w-24 h-24 border-2 border-[#e01a1b] bg-transparent pointer-events-none rounded-lg"
                          style={{
                            left: `${mousePosition.x}%`,
                            top: `${mousePosition.y}%`,
                            transform: 'translate(-50%, -50%)',
                          }}
                        />
                      )}
                    </div>
                  </div>

                  {/* Variant selector — lives under the gallery so picking a variant
                      sits next to the imagery it swaps, and the buy panel on the
                      right stays focused on price + purchase. */}
                  {product.hasVariants && visibleVariants.length > 0 && (
                    <div className="mt-5 sm:mt-6">
                      <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2 sm:mb-3 break-words">
                        Select Variant: {selectedVariant ? `${[selectedVariant.size, selectedVariant.color].filter(Boolean).join(" - ")}` :
                          ([product.singleUnitSize, product.singleUnitColor].filter(Boolean).join(' - ') || 'Base Variant')}
                      </h3>
                      <div className="grid grid-cols-2 gap-2">
                        {/* Default Variant Option */}
                        <button
                          onClick={() => {
                            setSelectedVariant(null);
                            setSelectedImage(0);
                            setQuantity(1);
                          }}
                          className={`group relative p-2 rounded-xl border text-left overflow-hidden transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-[#e01a1b]/30 ${!selectedVariant
                            ? 'border-[#e01a1b] bg-[#e01a1b]/[0.04] ring-1 ring-[#e01a1b]/20 shadow-sm'
                            : 'border-gray-200/90 bg-white hover:border-gray-300 hover:shadow-[0_2px_10px_-4px_rgba(0,0,0,0.15)]'
                            }`}
                        >
                          {/* Selected tick — replaces the loud ring/scale with a quiet marker */}
                          {!selectedVariant && (
                            <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-[#e01a1b] text-white flex items-center justify-center shadow-sm">
                              <Check className="w-2.5 h-2.5" strokeWidth={3} />
                            </span>
                          )}
                          <div className="flex items-start gap-2 min-w-0">
                            {/* Product Main Image Preview */}
                            {product.images && product.images.length > 0 && (
                              <div className="w-8 h-8 rounded-lg overflow-hidden border border-gray-200/80 shrink-0 bg-gray-50">
                                <Image
                                  src={product.images.find(img => img.isPrimary)?.url || product.images[0].url}
                                  alt="Default"
                                  width={48}
                                  height={48}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            )}

                            <div className="min-w-0 flex-1 pr-3.5">
                              {/* Name + colour swatch share a line to keep the card short */}
                              <div className="flex items-center gap-1.5 min-w-0">
                                {product.singleUnitColorHex && (
                                  <span
                                    className="w-2.5 h-2.5 rounded-full border border-black/10 shrink-0"
                                    style={{ backgroundColor: product.singleUnitColorHex }}
                                    title={product.singleUnitColor}
                                  />
                                )}
                                <span className="font-semibold text-gray-900 text-[13px] leading-tight truncate">
                                  {product.singleUnitSize ? product.singleUnitSize : (product.singleUnitColor ? product.singleUnitColor : 'Base Variant')}
                                </span>
                              </div>
                              {/* Price — the one thing that must stay loud */}
                              <div className="flex items-baseline gap-1.5 flex-wrap mt-1">
                                <span className="text-lg font-extrabold text-gray-900 leading-none tracking-tight">{formatPrice(getRegionalPrice(product))}</span>
                                {getRegionalOriginalPrice(product) && getRegionalOriginalPrice(product)! > getRegionalPrice(product) && (
                                  <span className="text-[11px] text-gray-400 line-through">{formatPrice(getRegionalOriginalPrice(product)!)}</span>
                                )}
                              </div>
                              <div className="text-[10px] font-medium text-gray-400 mt-1 uppercase tracking-wide">
                                {(product.inventory?.baseStock ?? product.totalStock ?? 0) > 0
                                  ? `${product.inventory?.baseStock ?? product.totalStock} in stock`
                                  : 'Out of stock'}
                              </div>
                            </div>
                          </div>
                        </button>
                        {visibleVariants.map((variant) => (
                          <button
                            key={variant.id}
                            onClick={() => {
                              if (selectedVariant?.id === variant.id) {
                                setSelectedVariant(null); // Deselect if already selected
                              } else {
                                setSelectedVariant(variant);
                              }
                              setSelectedImage(0); // Reset to first image
                              setQuantity(1); // Reset quantity on variant change
                            }}
                            className={`group relative p-2 rounded-xl border text-left overflow-hidden transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-[#e01a1b]/30 ${selectedVariant?.id === variant.id
                              ? 'border-[#e01a1b] bg-[#e01a1b]/[0.04] ring-1 ring-[#e01a1b]/20 shadow-sm'
                              : 'border-gray-200/90 bg-white hover:border-gray-300 hover:shadow-[0_2px_10px_-4px_rgba(0,0,0,0.15)]'
                              }`}
                          >
                            {selectedVariant?.id === variant.id && (
                              <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-[#e01a1b] text-white flex items-center justify-center shadow-sm">
                                <Check className="w-2.5 h-2.5" strokeWidth={3} />
                              </span>
                            )}
                            <div className="flex items-start gap-2 min-w-0">
                              {/* Variant Image Preview in Selector */}
                              {variant.images && variant.images.length > 0 && (
                                <div className="w-8 h-8 rounded-lg overflow-hidden border border-gray-200/80 shrink-0 bg-gray-50">
                                  <Image
                                    src={variant.images[0]}
                                    alt={variant.variantName || variant.color || 'Variant'}
                                    width={48}
                                    height={48}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              )}
                              <div className="min-w-0 flex-1 pr-3.5">
                                {/* Name + colour swatch share a line to keep the card short */}
                                <div className="flex items-center gap-1.5 min-w-0">
                                  {variant.colorHex && (
                                    <span
                                      className="w-2.5 h-2.5 rounded-full border border-black/10 shrink-0"
                                      style={{ backgroundColor: variant.colorHex }}
                                      title={variant.color}
                                    />
                                  )}
                                  <span className="font-semibold text-gray-900 text-[13px] leading-tight truncate">
                                    {variant.variantName || variant.color}
                                  </span>
                                </div>
                                {/* Price — the one thing that must stay loud */}
                                <div className="flex items-baseline gap-1.5 flex-wrap mt-1">
                                  <span className="text-lg font-extrabold text-gray-900 leading-none tracking-tight">{formatPrice(getRegionalPrice(variant))}</span>
                                  {getRegionalOriginalPrice(variant) && getRegionalOriginalPrice(variant)! > getRegionalPrice(variant) && (
                                    <span className="text-[11px] text-gray-400 line-through">{formatPrice(getRegionalOriginalPrice(variant)!)}</span>
                                  )}
                                  {variant.discount && variant.discount > 0 && (
                                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-1 py-px rounded whitespace-nowrap">
                                      {variant.discount}% off
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] font-medium text-gray-400 mt-1 uppercase tracking-wide">
                                  {variant.stock > 0 ? `${variant.stock} in stock` : 'Out of stock'}
                                </div>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              </div>

              {/* Product Info - Shows magnified image when hovering (desktop only) */}
              <div className="product-info-container lg:col-span-5 relative p-3 sm:p-4 lg:p-6 lg:pl-4">
                {/* Magnified Image Overlay - Desktop only (hover-driven). lg:hidden on mobile so info always shows. */}
                {isImageHovered && currentImageUrl && (
                  <div className="hidden lg:flex w-full h-full items-center justify-center bg-white rounded-r-2xl">
                    <div className="w-full h-160 bg-white rounded-xl border-2 border-gray-200 shadow-2xl overflow-hidden">
                      <div
                        className="w-full h-full bg-cover bg-no-repeat transition-all duration-150"
                        style={{
                          backgroundImage: `url(${currentImageUrl})`,
                          backgroundPosition: `${mousePosition.x}% ${mousePosition.y}%`,
                          backgroundSize: '300%',
                        }}
                      />
                    </div>
                  </div>
                )}
                {/* Normal Product Info Content — always shown on mobile; hidden on lg when hovering */}
                <div className={`space-y-2 sm:space-y-3 ${isImageHovered ? 'lg:hidden' : ''}`}>
                    {/* Header Section */}
                    <div className="pb-0">
                      <div className="flex items-start justify-between gap-3 mb-1.5 sm:mb-2">
                        <div className="flex-1 min-w-0">
                          <h1 className="font-playfair text-lg sm:text-xl md:text-2xl lg:text-3xl font-semibold text-[#1a1a1a] mb-2 sm:mb-2.5 leading-tight break-words tracking-tight">{product.name}</h1>
                        </div>
                        <button
                          onClick={handleWishlistToggle}
                          aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
                          className={`p-2 sm:p-3 rounded-full transition-colors shrink-0 ${isWishlisted ? 'bg-red-50 hover:bg-red-100' : 'bg-gray-50 hover:bg-gray-100'}`}
                        >
                          <Heart className={`w-5 h-5 sm:w-6 sm:h-6 ${isWishlisted ? 'fill-current text-red-500' : 'text-gray-400'}`} />
                        </button>
                      </div>

                      {/* Rating */}
                      <div className="flex items-center flex-wrap gap-2 sm:gap-x-4 sm:gap-y-2 mb-1 sm:mb-1.5">
                        <div className="flex items-center space-x-0.5 sm:space-x-1">
                          {renderStars(product.rating || 0)}
                        </div>
                        <span className="text-xs sm:text-sm text-gray-600 font-medium">
                          {product.rating || 0} ({product.reviews || 0} reviews)
                        </span>
                        {product.reviews != null && product.reviews > 0 ? (
                          <button
                            onClick={() => document.getElementById('customer-reviews')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                            className="text-xs sm:text-sm text-[#e01a1b] hover:text-[#c41617] cursor-pointer font-medium"
                          >
                            See all reviews
                          </button>
                        ) : null}
                      </div>

                      {/* Price moved into the purchase panel (below quantity / stock / dispatch) */}
                    </div>

                    {/* Purchase Options — the variant selector now lives under the
                        gallery, so this column is a simple stack at full width. */}
                    <div className="space-y-4">

                      {/* Single Unit Size and Color - Show only if NO variants */}
                      {!product.hasVariants && (product.singleUnitSize || product.singleUnitColor) && (
                        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                          <h3 className="text-lg font-semibold text-gray-900 mb-3">Product Details</h3>
                          <div className="space-y-2">
                            {product.singleUnitSize && (
                              <div className="flex items-center space-x-3">
                                <span className="text-sm font-medium text-gray-600 w-16">Size:</span>
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-white border border-gray-300 text-gray-900">
                                  {product.singleUnitSize}
                                </span>
                              </div>
                            )}
                            {product.singleUnitColor && (
                              <div className="flex items-center space-x-3">
                                <span className="text-sm font-medium text-gray-600 w-16">Color:</span>
                                <div className="flex items-center space-x-2">
                                  {product.singleUnitColorHex && (
                                    <div
                                      className="w-6 h-6 rounded-full border-2 border-gray-300 shadow-sm"
                                      style={{ backgroundColor: product.singleUnitColorHex }}
                                    />
                                  )}
                                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-white border border-gray-300 text-gray-900">
                                    {product.singleUnitColor}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Purchase Panel - Full Width to Match Price Section */}
                      <div className="xl:sticky xl:top-8 flex flex-col bg-white p-4 rounded-2xl ring-1 ring-black/[0.07]">
                        {/* Price — shown at the top of the purchase panel (order-first) */}
                        <div className="order-first bg-[#fdfdfd] rounded-xl sm:rounded-2xl ring-1 ring-black/[0.06] p-4 mb-3">
                          {activeOffer && (
                            <div className="flex items-center flex-wrap gap-2 mb-2">
                              <span className="inline-flex items-center gap-1 rounded-full bg-linear-to-r from-[#e01a1b] to-[#ff5a36] px-2.5 py-1 text-[11px] sm:text-xs font-bold tracking-wide text-white shadow-sm">
                                {activeOffer.badge}
                              </span>
                              <span className="text-xs sm:text-sm text-gray-700 font-medium">{activeOffer.title}</span>
                              {offerEnds && (
                                <span className="text-[11px] text-[#e01a1b] font-semibold">· {offerEnds}</span>
                              )}
                            </div>
                          )}
                          <div className="flex items-baseline flex-wrap gap-x-2 sm:gap-x-3 gap-y-1">
                            <span className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">{formatPrice(offeredPrice || 0)}</span>
                            {hasOfferSaving ? (
                              <>
                                <span className="text-base sm:text-lg lg:text-xl text-gray-500 line-through">{formatPrice(currentPrice)}</span>
                                <span className="bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 px-2 py-0.5 sm:px-3 sm:py-1 rounded-full text-xs sm:text-sm font-semibold">
                                  Save {formatPrice(currentPrice - offeredPrice)}
                                </span>
                              </>
                            ) : originalPrice && originalPrice > currentPrice ? (
                              <>
                                <span className="text-base sm:text-lg lg:text-xl text-gray-500 line-through">{formatPrice(originalPrice)}</span>
                                <span className="bg-gray-100 text-gray-800 px-2 py-0.5 sm:px-3 sm:py-1 rounded-full text-xs sm:text-sm font-semibold">
                                  Save {formatPrice(originalPrice - currentPrice)}
                                </span>
                              </>
                            ) : null}
                          </div>
                        </div>
                        {/* Stock Status */}
                        <div className="order-1 mb-3">
                          {availableStock > 0 ? (
                            <div className="flex items-center space-x-2">
                              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                              <span className="text-green-600 font-bold text-base">In stock</span>
                              <span className="text-gray-600 text-sm">({availableStock} available)</span>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-2">
                              <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
                              <span className="text-red-500 font-bold text-base">Out of Stock</span>
                            </div>
                          )}
                        </div>

                        {/* Dispatch Timeline */}
                        {product.dispatchTimeline && (
                          <div className="order-2 bg-[#fff1f1] p-2 rounded-lg mb-3">
                            <div className="text-xs text-gray-700">
                              <span className="font-semibold">Dispatch: </span>
                              {product.dispatchTimeline.processingDays} days processing + {product.dispatchTimeline.shippingDays} days shipping
                              <span className="text-[#e01a1b] font-semibold ml-1">
                                (Total: {product.dispatchTimeline.totalDays} days)
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Smart Logistics Section */}
                        {logisticsResult && product.logisticsConfig && (
                          <div
                            ref={shippingCardRef}
                            id="shipping-logistics"
                            className={`order-5 bg-white border rounded-xl p-4 mt-4 space-y-3 transition-all duration-500 ${
                              highlightShipping
                                ? 'border-[#e01a1b] ring-4 ring-[#e01a1b]/25 shadow-lg'
                                : 'border-gray-200'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                                <Truck className="w-4 h-4 text-[#e01a1b]" />
                                Shipping & Logistics
                              </h3>
                              {logisticsResult.recommendedTransport === logisticsResult.selectedTransport && (
                                <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">
                                  Recommended
                                </span>
                              )}
                            </div>

                            {/* Total Weight */}
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">Total Weight</span>
                              <span className="font-semibold text-gray-900">
                                {formatWeight(logisticsResult.totalWeightKg)}
                                <span className="text-xs text-gray-500 ml-1">
                                  ({quantity} x {formatWeight(logisticsResult.unitWeightKg)}/unit)
                                </span>
                              </span>
                            </div>

                            {/* Transport Toggle */}
                            {(product.logisticsConfig as LogisticsConfig).transportTypes.length > 1 && (
                              <div className="flex gap-2">
                                {(product.logisticsConfig as LogisticsConfig).transportTypes.map((type) => {
                                  const isSelected = logisticsResult.selectedTransport === type;
                                  const isRecommended = logisticsResult.recommendedTransport === type;
                                  return (
                                    <button
                                      key={type}
                                      onClick={() => setTransportOverride(type)}
                                      aria-label={`Select ${transportModeLabel(type, getRegion())} shipping`}
                                      aria-pressed={isSelected}
                                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg border-2 text-sm font-semibold transition-all duration-200 ${
                                        isSelected
                                          ? 'border-[#e01a1b] bg-[#fff1f1] text-[#c41617] ring-2 ring-[#e01a1b]/25'
                                          : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#e01a1b]/40'
                                      }`}
                                    >
                                      {type === 'AIR' ? <Plane className="w-4 h-4" /> : isSurfaceRegion(getRegion()) ? <Truck className="w-4 h-4" /> : <Ship className="w-4 h-4" />}
                                      {transportModeLabel(type, getRegion())}
                                      {isRecommended && !isSelected && (
                                        <span className="text-[9px] bg-green-100 text-green-600 px-1.5 py-0.5 rounded font-bold">Best</span>
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            )}

                            {/* Single transport display */}
                            {(product.logisticsConfig as LogisticsConfig).transportTypes.length === 1 && (
                              <div className="flex items-center gap-2 py-2 px-3 rounded-lg bg-[#fff1f1] border border-[#ffc1c1] text-sm font-semibold text-[#c41617]">
                                {logisticsResult.selectedTransport === 'AIR' ? <Plane className="w-4 h-4" /> : isSurfaceRegion(getRegion()) ? <Truck className="w-4 h-4" /> : <Ship className="w-4 h-4" />}
                                {transportModeLabel(logisticsResult.selectedTransport, getRegion())}
                              </div>
                            )}

                            {/* Courier partner — region- and mode-specific. Required
                                before checkout: the chosen carrier travels with the
                                order to fulfilment/admin. */}
                            {courierOptions.length > 0 && (
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                                    {getRegion() === 'IN' ? 'Domestic courier' : 'International courier'}
                                  </span>
                                  {!selectedCourier && (
                                    <span className="text-[10px] font-semibold text-[#e01a1b]">Required</span>
                                  )}
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {courierOptions.map((c) => {
                                    const isSelected = selectedCourier === c.id;
                                    return (
                                      <button
                                        key={c.id}
                                        type="button"
                                        onClick={() => setSelectedCourier(c.id)}
                                        aria-pressed={isSelected}
                                        aria-label={`Select ${c.name}`}
                                        title={c.name}
                                        className={`group/courier relative p-1 rounded-lg border transition-all duration-200 ${
                                          isSelected
                                            ? 'border-[#e01a1b] bg-[#fff1f1] ring-1 ring-[#e01a1b]/25'
                                            : 'border-gray-200 bg-white hover:border-gray-300'
                                        }`}
                                      >
                                        <CourierBadge courier={c} className="w-9 h-9 rounded-md" codeClassName="text-[10px]" />
                                        {isSelected && (
                                          <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-[#e01a1b] flex items-center justify-center ring-2 ring-white">
                                            <Check className="w-2.5 h-2.5 text-white" />
                                          </span>
                                        )}
                                        {/* Name tooltip on hover/focus */}
                                        <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-[11px] font-medium text-white opacity-0 group-hover/courier:opacity-100 group-focus/courier:opacity-100 transition-opacity duration-150 z-20">
                                          {c.name}
                                        </span>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/* Delivery & Cost */}
                            <div className="grid grid-cols-2 gap-3">
                              <div className="bg-gray-50 rounded-lg p-2.5 text-center">
                                <div className="text-xs text-gray-500 mb-0.5">Delivery Time</div>
                                <div className="text-sm font-bold text-gray-900">{logisticsResult.deliveryDays} days</div>
                              </div>
                              <div className="bg-gray-50 rounded-lg p-2.5 text-center">
                                <div className="text-xs text-gray-500 mb-0.5">Shipping Cost</div>
                                <div className="text-sm font-bold text-gray-900">
                                  {logisticsResult.totalShippingCost === 0
                                    ? 'FREE'
                                    : formatPrice(getCurrency() === 'USD' ? convertINRtoUSD(logisticsResult.totalShippingCost) : logisticsResult.totalShippingCost)}
                                </div>
                              </div>
                            </div>

                            {/* Dimensions */}
                            {(product.logisticsConfig as LogisticsConfig).dimensions && (
                              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                <Box className="w-3.5 h-3.5" />
                                <span>Dimensions: {formatDimensions((product.logisticsConfig as LogisticsConfig).dimensions)}</span>
                              </div>
                            )}

                            {/* Max weight warning */}
                            {logisticsResult.exceedsMaxWeight && (
                              <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-2.5 text-xs text-red-700">
                                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                                <span>
                                  Total weight ({formatWeight(logisticsResult.totalWeightKg)}) exceeds the maximum limit of {formatWeight(logisticsResult.maxWeightKg)}. Please reduce quantity or contact support.
                                </span>
                              </div>
                            )}

                            {/* Notes */}
                            {(product.logisticsConfig as LogisticsConfig).notes && (
                              <div className="flex items-start gap-1.5 text-xs text-gray-500">
                                <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                                <span>{(product.logisticsConfig as LogisticsConfig).notes}</span>
                              </div>
                            )}

                            {/* Save & return — only when the shopper came here from the
                                cart to fill in this line's shipping method. */}
                            {returnCartItemId && (
                              <button
                                onClick={handleSaveShippingAndReturn}
                                disabled={savingShipping || !selectedCourier}
                                className="w-full mt-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-[#e01a1b] text-white text-sm font-semibold hover:bg-[#c41617] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                              >
                                <Check className="w-4 h-4" />
                                {savingShipping
                                  ? 'Saving…'
                                  : !selectedCourier
                                    ? 'Select a courier to continue'
                                    : `Use ${logisticsResult.selectedTransport === 'AIR' ? 'Air' : 'Sea'} & return to cart`}
                              </button>
                            )}
                          </div>
                        )}

                        {/* Action Buttons */}
                        {availableStock > 0 && (
                          <>
                            {/* Quantity Selector — shown below price / stock / dispatch (order-3) */}
                            <div className="order-3 flex items-center justify-center flex-wrap gap-2 sm:gap-3 mb-3">
                              <span className="text-sm font-semibold text-gray-700">Quantity:</span>
                              <button
                                onClick={handleDecrement}
                                disabled={quantity <= 1}
                                aria-label="Decrease quantity"
                                className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center border-2 border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                              >
                                <span className="text-xl font-semibold">−</span>
                              </button>
                              <input
                                type="number"
                                inputMode="numeric"
                                min={1}
                                max={availableStock}
                                value={quantity || ''}
                                onChange={handleQuantityChange}
                                onBlur={handleQuantityBlur}
                                aria-label="Quantity"
                                className="w-16 sm:w-20 text-center font-bold text-base sm:text-lg border-2 border-gray-300 rounded-lg py-1 focus:outline-none focus:ring-2 focus:ring-[#e01a1b]/40 focus:border-[#e01a1b] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              />
                              <button
                                onClick={handleIncrement}
                                disabled={quantity >= availableStock}
                                aria-label="Increase quantity"
                                className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center border-2 border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                              >
                                <span className="text-xl font-semibold">+</span>
                              </button>
                              <span className="text-sm font-medium text-gray-500">{product?.uom || 'pcs'}</span>
                            </div>

                              {/* Add to Cart / Buy Now — below the Shipping & Logistics block */}
                              <div className="order-6 w-full mt-4">
                                <div className="flex gap-2">
                                  <button
                                    onClick={handleAddToCart}
                                    disabled={nothingBuyable || courierMissing}
                                    className="flex-1 flex justify-center items-center bg-white text-[#e01a1b] ring-2 ring-[#e01a1b] hover:bg-[#fff1f1] hover:-translate-y-0.5 py-3 px-4 rounded-full font-bold uppercase transition-all duration-300 active:scale-95 text-xs tracking-[1.5px] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                                  >
                                    {nothingBuyable ? 'Not available' : 'Add to cart'}
                                  </button>
                                  <button
                                    onClick={handleBuyNow}
                                    disabled={nothingBuyable || courierMissing}
                                    className="btn-shine flex-1 flex justify-center items-center bg-[#e01a1b] text-white hover:bg-[#c41617] shadow-[0_6px_20px_rgba(224,26,27,0.3)] hover:shadow-[0_12px_30px_rgba(224,26,27,0.45)] hover:-translate-y-0.5 py-3 px-4 rounded-full font-bold uppercase transition-all duration-300 active:scale-95 text-xs tracking-[1.5px] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                                  >
                                    Buy Now
                                  </button>
                                </div>
                                {nothingBuyable ? (
                                  <p className="text-xs text-amber-700 mt-2 text-center">
                                    This product isn&apos;t available in your region right now.
                                  </p>
                                ) : courierMissing && (
                                  <p className="text-xs text-amber-700 mt-2 text-center">
                                    Select a courier partner to continue.
                                  </p>
                                )}
                              </div>
                            </>
                          )}
                      </div>
                    </div>
                  </div>
              </div>

              {/* Right rail — order summary + manufacturer. Fills the space beside
                  the buy box on desktop; hidden on smaller screens where the buy
                  box and the "Meet the Maker" section below cover the same ground. */}
              <aside className="hidden lg:flex lg:col-span-3 flex-col gap-5 self-start lg:sticky lg:top-8 p-3 sm:p-4 lg:p-6 lg:pl-2">
                {/* Card 1 — live order summary, reflects quantity + selected transport */}
                {availableStock > 0 && (() => {
                  const unit = offeredPrice || 0;
                  const subtotal = unit * (quantity || 0);
                  const shipINR = logisticsResult ? logisticsResult.totalShippingCost : null;
                  const shipDisplay = shipINR == null ? null : (getCurrency() === 'USD' ? convertINRtoUSD(shipINR) : shipINR);
                  const total = subtotal + (shipDisplay || 0);
                  return (
                    <div className="bg-white rounded-2xl ring-1 ring-black/[0.07] p-5">
                      <h3 className="font-playfair text-lg font-semibold text-[#1a1a1a] mb-4 tracking-tight flex items-center gap-2">
                        <ShoppingCart className="w-4 h-4 text-[#e01a1b]" /> Order Summary
                      </h3>
                      <div className="space-y-2.5 text-sm">
                        <div className="flex items-center justify-between text-gray-600">
                          <span>Unit price</span>
                          <span className="font-semibold text-gray-900 tabular-nums">{formatPrice(unit)}</span>
                        </div>
                        <div className="flex items-center justify-between text-gray-600">
                          <span>Quantity</span>
                          <span className="font-semibold text-gray-900 tabular-nums">{quantity} {product?.uom || 'pcs'}</span>
                        </div>
                        <div className="flex items-center justify-between text-gray-600">
                          <span>Subtotal</span>
                          <span className="font-semibold text-gray-900 tabular-nums">{formatPrice(subtotal)}</span>
                        </div>
                        <div className="flex items-center justify-between text-gray-600">
                          <span className="flex items-center gap-1.5">
                            Shipping
                            {logisticsResult && (
                              <span className="inline-flex items-center gap-1 text-[10px] text-gray-400">
                                {logisticsResult.selectedTransport === 'AIR' ? <Plane className="w-3 h-3" /> : isSurfaceRegion(getRegion()) ? <Truck className="w-3 h-3" /> : <Ship className="w-3 h-3" />}
                                {logisticsResult.selectedTransport === 'AIR' ? 'Air' : isSurfaceRegion(getRegion()) ? 'Road' : 'Sea'}
                              </span>
                            )}
                          </span>
                          <span className="font-semibold text-gray-900 tabular-nums">
                            {shipDisplay == null ? '—' : shipDisplay === 0 ? 'FREE' : formatPrice(shipDisplay)}
                          </span>
                        </div>
                        {logisticsResult && (
                          <div className="flex items-center justify-between text-gray-600">
                            <span>Delivery</span>
                            <span className="font-semibold text-gray-900">{logisticsResult.deliveryDays} days</span>
                          </div>
                        )}
                        <div className="h-px w-full bg-gray-200 my-1.5" />
                        <div className="flex items-center justify-between">
                          <span className="text-base font-bold text-gray-900">Total</span>
                          <span className="text-lg font-extrabold text-[#e01a1b] tabular-nums">{formatPrice(total)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Card 2 — manufacturer / "meet the maker" */}
                {hasManufacturerInfo(product.manufacturerInfo) && (() => {
                  const m = product.manufacturerInfo!;
                  const name = manufacturerDisplayName(m);
                  return (
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => setShowMakerModal(true)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setShowMakerModal(true); } }}
                      className="group cursor-pointer bg-white rounded-2xl ring-1 ring-black/[0.07] p-5 transition-all duration-300 hover:shadow-[0_16px_44px_rgba(0,0,0,0.15)] hover:ring-[#e01a1b]/25 hover:-translate-y-0.5"
                    >
                      <div className="flex items-start justify-between gap-3 mb-4">
                        <div>
                          <h3 className="font-playfair text-lg font-semibold text-[#1a1a1a] mb-0.5 tracking-tight">Manufacturer</h3>
                          <p className="text-xs text-gray-500">The hands behind this product</p>
                        </div>
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#e01a1b] opacity-80 group-hover:opacity-100 transition-opacity shrink-0 whitespace-nowrap">
                          View profile <ChevronRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
                        </span>
                      </div>
                      <div className="flex items-start gap-4">
                        <div className="shrink-0">
                          {m.photo ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={m.photo} alt={name || 'Manufacturer'} className="w-16 h-16 rounded-full object-cover ring-4 ring-[#e01a1b]/10 border border-gray-100" />
                          ) : (
                            <div className="w-16 h-16 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-300">
                              <User className="w-7 h-7" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          {name && <p className="font-playfair text-base font-semibold text-[#1a1a1a] tracking-tight break-words">{name}</p>}
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {m.role && m.role.trim() && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#e01a1b]/[0.06] text-[#e01a1b] text-[11px] font-semibold">
                                <Award className="w-3 h-3" /> {m.role}
                              </span>
                            )}
                            {m.experience && m.experience.trim() && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-100 text-gray-700 text-[11px] font-semibold">
                                <Clock className="w-3 h-3" /> {m.experience}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      {m.description && m.description.trim() && (
                        <p className="mt-3 text-[13px] text-gray-600 leading-relaxed whitespace-pre-line line-clamp-3">{m.description}</p>
                      )}
                    </div>
                  );
                })()}

                {/* Card 3 — Why choose this? (sits under the manufacturer info) */}
                {whyChoose.length > 0 && (
                  <div className="bg-white rounded-2xl ring-1 ring-black/[0.07] p-4">
                    <h3 className="font-playfair text-base font-semibold text-[#1a1a1a] tracking-tight mb-2">Why choose this?</h3>
                    <div className="space-y-0.5">
                      {whyChoose.map((w, i) => {
                        const Icon = w.icon;
                        return (
                          <div key={i} className="group flex items-start gap-2.5 rounded-xl p-1.5 transition-all duration-300 hover:bg-gray-50">
                            <span className="flex items-center justify-center w-7 h-7 rounded-full bg-[#e01a1b]/[0.08] text-[#e01a1b] shrink-0 transition-transform duration-300 group-hover:scale-110"><Icon className="w-3.5 h-3.5" /></span>
                            <div className="min-w-0">
                              <h4 className="text-[13px] font-semibold text-gray-900 leading-tight">{w.title}</h4>
                              <p className="text-[12px] text-gray-500 leading-snug">{w.desc}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </aside>
            </div>
          </div>

          {/* ══ Product information — tabbed panel + sticky info rail ══ */}
          {(() => {
            const fs: Record<string, any> = (product.fabricSpecifications && typeof product.fabricSpecifications === 'object')
              ? (product.fabricSpecifications as Record<string, any>) : {};
            const FS_LABELS: Record<string, string> = {
              weightValue: 'Fabric Weight', gsm: 'GSM', length: 'Length', breadth: 'Breadth',
              weave: 'Type of Weave', composition: 'Composition',
            };
            const FS_UNITS: Record<string, string> = { weightValue: 'g', length: 'cm', breadth: 'cm', gsm: 'GSM' };
            const specItems: { label: string; value: string }[] = [];
            if (product.baseSku) specItems.push({ label: 'Product Code', value: product.baseSku });
            if (product.category) specItems.push({ label: 'Category', value: product.category });
            if (!product.hasVariants && product.singleUnitSize) specItems.push({ label: 'Size', value: product.singleUnitSize });
            if (!product.hasVariants && product.singleUnitColor) specItems.push({ label: 'Color', value: product.singleUnitColor });
            if (product.material) specItems.push({ label: 'Material', value: product.material });
            if (product.fabricType) specItems.push({ label: 'Fabric', value: product.fabricType });
            if (product.dimensions) specItems.push({ label: 'Dimensions', value: product.dimensions });
            if (product.weight) specItems.push({ label: 'Weight', value: `${product.weight}${product.weightUnit && !/[a-z]/i.test(String(product.weight)) ? ` ${product.weightUnit}` : ''}` });
            Object.entries(fs)
              .filter(([k]) => !['careInstructions', 'weightUnit', 'basis', 'type'].includes(k))
              .filter(([, v]) => v != null && String(v).trim() !== '')
              .forEach(([k, v]) => {
                const label = FS_LABELS[k] ?? k.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());
                const unit = FS_UNITS[k];
                const raw = Array.isArray(v) ? v.join(', ') : String(v);
                const value = unit && /^[\d.,\s]+$/.test(raw.trim()) ? `${raw} ${unit}` : raw;
                specItems.push({ label, value });
              });
            if (product.hasVariants) specItems.push({ label: 'Variants', value: String(visibleVariants.length) });
            specItems.push({ label: 'Availability', value: availableStock > 0 ? `In stock (${availableStock})` : 'Out of stock' });
            const careList: string[] = Array.isArray(fs.careInstructions) ? fs.careInstructions : [];
            // "Why choose this?" now lives in the hero rail (under the manufacturer);
            // this rail carries only the Offers card.

            // Rail "Offers" promo — priority order:
            //   1) a coupon for this product's category (highest),
            //   2) an offer that targets this product / category,
            //   3) otherwise a store offer, deterministic per product so different
            //      products surface different promos.
            type RailPromo = { kind: 'coupon' | 'offer'; image?: string | null; badge: string; title: string; desc?: string | null; code?: string; endsLabel?: string | null; savingLabel?: string | null };
            let railPromo: RailPromo | null = null;
            if (categoryCoupon) {
              const badge = categoryCoupon.discountType === 'PERCENTAGE'
                ? `${categoryCoupon.discountValue}% OFF`
                : `${formatPrice(categoryCoupon.discountValue)} OFF`;
              railPromo = {
                kind: 'coupon',
                image: categoryCoupon.popupImage,
                badge,
                title: categoryCoupon.popupTitle || 'Special Coupon',
                desc: categoryCoupon.popupMessage || categoryCoupon.description || null,
                code: categoryCoupon.code,
              };
            }
            if (!railPromo && activeOffer) {
              railPromo = {
                kind: 'offer',
                image: null,
                badge: activeOffer.badge,
                title: activeOffer.title,
                desc: activeOffer.description ?? null,
                endsLabel: offerEnds,
                savingLabel: hasOfferSaving ? `Save ${formatPrice(currentPrice - (offeredPrice || 0))}/unit` : null,
              };
            }
            if (!railPromo && promoOffers.length > 0) {
              const matched = promoOffers.find((o) =>
                (o.scope === 'PRODUCT' && o.productIds?.includes(product.id)) ||
                (o.scope === 'CATEGORY' && o.categoryNames?.includes(product.category))
              );
              const hash = product.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
              const chosen = matched || promoOffers[hash % promoOffers.length];
              if (chosen) {
                railPromo = {
                  kind: 'offer',
                  image: chosen.bannerImage,
                  badge: chosen.badge,
                  title: chosen.title,
                  desc: chosen.description ?? null,
                  endsLabel: chosen.endsAt ? offerEndsLabel(chosen.endsAt) : null,
                  savingLabel: null,
                };
              }
            }


            const hasDescription = !!(product.description || (product.tags && product.tags.length));
            const hasShipping = !!product.dispatchTimeline;

            const tabs: { id: string; label: string }[] = [];
            if (hasDescription) tabs.push({ id: 'description', label: 'Description' });
            if (specItems.length > 0) tabs.push({ id: 'specs', label: 'Specifications' });
            if (careList.length > 0) tabs.push({ id: 'care', label: 'Care Instructions' });
            if (hasShipping) tabs.push({ id: 'shipping', label: 'Shipping' });
            if (tabs.length === 0) return null;
            const active = tabs.some((t) => t.id === activeInfoTab) ? activeInfoTab : tabs[0].id;
            const cardBase = 'bg-white rounded-2xl ring-1 ring-black/[0.05]';

            return (
              <div className="mt-6 sm:mt-8">
                {/* Live offer ribbon for this product */}
                {activeOffer && (
                  <div className="mb-5 flex items-center gap-3 rounded-2xl bg-linear-to-r from-[#e01a1b] to-[#ff5a36] text-white p-4 shadow-[0_10px_30px_-8px_rgba(224,26,27,0.5)]">
                    <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/20 shrink-0"><Tag className="w-5 h-5" /></span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="rounded-full bg-white/25 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">{activeOffer.badge}</span>
                        <span className="text-sm font-bold">{activeOffer.title}</span>
                      </div>
                      {activeOffer.description && <p className="text-[12px] text-white/90 mt-0.5 leading-snug">{activeOffer.description}</p>}
                    </div>
                    {offerEnds && <span className="text-[11px] font-semibold whitespace-nowrap bg-white/15 rounded-full px-2.5 py-1">{offerEnds}</span>}
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
                  {/* ── LEFT: tabbed content ── */}
                  <div className={`lg:col-span-2 ${cardBase} overflow-hidden`}>
                    {/* Tab bar */}
                    <div className="flex gap-1 border-b border-gray-100 px-2 sm:px-3 overflow-x-auto scrollbar-hide">
                      {tabs.map((t) => {
                        const isActive = t.id === active;
                        return (
                          <button
                            key={t.id}
                            onClick={() => setActiveInfoTab(t.id)}
                            className={`relative whitespace-nowrap px-3 sm:px-4 py-3 text-[13px] sm:text-sm font-semibold transition-colors ${isActive ? 'text-[#e01a1b]' : 'text-gray-500 hover:text-gray-800'}`}
                          >
                            {t.label}
                            {isActive && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-[#e01a1b]" />}
                          </button>
                        );
                      })}
                    </div>

                    {/* Tab content */}
                    <div className="p-5 sm:p-6">
                      <Reveal key={active}>
                        {active === 'description' && (
                          <div>
                            {product.description && (
                              <>
                                <p className={`text-sm text-gray-600 leading-relaxed whitespace-pre-line ${showAllDetails ? '' : 'line-clamp-6'}`}>{product.description}</p>
                                {product.description.length > 260 && (
                                  <button onClick={() => setShowAllDetails(!showAllDetails)} className="mt-2 inline-flex items-center gap-1 text-[13px] font-semibold text-[#e01a1b] hover:text-[#c41617]">
                                    {showAllDetails ? 'Read less' : 'Read more'}
                                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAllDetails ? 'rotate-180' : ''}`} />
                                  </button>
                                )}
                              </>
                            )}
                            {product.tags && product.tags.length > 0 && (
                              <div className="mt-4 flex flex-wrap gap-2">
                                {product.tags.map((tag, i) => (
                                  <span key={i} className="inline-flex items-center gap-1 rounded-full bg-[#e01a1b]/[0.06] text-[#e01a1b] px-3 py-1 text-xs font-semibold">
                                    <Check className="w-3 h-3" /> {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {active === 'specs' && (
                          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-10">
                            {specItems.map((s, i) => (
                              <div key={i} className="flex items-center gap-3 py-2.5 border-b border-gray-100">
                                <dt className="text-[13px] text-gray-500 whitespace-nowrap">{s.label}</dt>
                                <span className="flex-1 border-b border-dotted border-gray-300/80" />
                                <dd className="text-[13px] font-semibold text-gray-900 whitespace-nowrap text-right">{s.value}</dd>
                              </div>
                            ))}
                          </dl>
                        )}

                        {active === 'care' && (
                          <div className="flex flex-wrap gap-2.5">
                            {careList.map((instruction, index) => {
                              const item = CARE_INSTRUCTIONS.find((c) => c.label === instruction);
                              const iconColor = item ? CATEGORY_COLORS[item.category] || 'text-gray-500' : 'text-gray-400';
                              return (
                                <span key={index} className="group inline-flex items-center gap-2 pl-2 pr-3.5 py-2 rounded-full bg-white ring-1 ring-gray-200 text-gray-700 text-[13px] font-semibold shadow-sm transition-all duration-300 hover:ring-[#e01a1b]/30 hover:shadow-md hover:-translate-y-0.5">
                                  {item ? (
                                    <span className={`flex items-center justify-center w-6 h-6 rounded-full bg-gray-50 shrink-0 ${iconColor} transition-transform duration-300 group-hover:scale-110`}><CareIcon paths={item.paths} className="w-4 h-4" /></span>
                                  ) : (
                                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 text-gray-500 text-[10px] font-bold shrink-0">{index + 1}</span>
                                  )}
                                  {instruction}
                                </span>
                              );
                            })}
                          </div>
                        )}

                        {active === 'shipping' && product.dispatchTimeline && (
                          <div className="space-y-3">
                            <div className="flex items-center gap-3 rounded-xl bg-[#fff5f5] ring-1 ring-[#ffdede] p-3.5">
                              <span className="flex items-center justify-center w-9 h-9 rounded-full bg-[#e01a1b]/10 text-[#e01a1b] shrink-0"><Truck className="w-4 h-4" /></span>
                              <div>
                                <p className="text-[13px] font-semibold text-gray-900">Dispatch in {product.dispatchTimeline.totalDays} days</p>
                                <p className="text-[12px] text-gray-500">{product.dispatchTimeline.processingDays} days processing + {product.dispatchTimeline.shippingDays} days shipping</p>
                              </div>
                            </div>
                            {logisticsResult && (
                              <div className="grid grid-cols-2 gap-3">
                                <div className="rounded-xl bg-gray-50 ring-1 ring-gray-100 p-3 text-center">
                                  <p className="text-[11px] text-gray-500 mb-0.5">Delivery Time</p>
                                  <p className="text-sm font-bold text-gray-900">{logisticsResult.deliveryDays} days</p>
                                </div>
                                <div className="rounded-xl bg-gray-50 ring-1 ring-gray-100 p-3 text-center">
                                  <p className="text-[11px] text-gray-500 mb-0.5">Shipping</p>
                                  <p className="text-sm font-bold text-gray-900">{logisticsResult.totalShippingCost === 0 ? 'FREE' : formatPrice(getCurrency() === 'USD' ? convertINRtoUSD(logisticsResult.totalShippingCost) : logisticsResult.totalShippingCost)}</p>
                                </div>
                              </div>
                            )}
                            <p className="text-[12px] text-gray-500">Shipping method and final delivery estimate are confirmed in the purchase panel above.</p>
                          </div>
                        )}
                      </Reveal>
                    </div>
                  </div>

                  {/* ── RIGHT: sticky rail — Offers (Why-choose now lives under the manufacturer) ── */}
                  <div className="lg:sticky lg:top-8 flex flex-col gap-5">
                    {/* Offers — priority: category coupon → product/category offer → store offer */}
                    {railPromo && (railPromo.image ? (
                      /* Full-bleed image background with the promo overlaid. */
                      <div className="group/promo relative overflow-hidden rounded-2xl min-h-[210px] flex flex-col justify-end text-white shadow-[0_12px_38px_-14px_rgba(0,0,0,0.5)] ring-1 ring-black/10 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_48px_-16px_rgba(224,26,27,0.45)]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={railPromo.image} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover transition-transform duration-[900ms] ease-out group-hover/promo:scale-105" />
                        <div className="absolute inset-0 bg-linear-to-t from-black/85 via-black/45 to-black/15" />
                        <span className="absolute left-4 top-4 inline-flex items-center rounded-full bg-[#e01a1b] text-white text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 shadow-md">{railPromo.badge}</span>
                        <span className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-white/20 backdrop-blur-sm px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide">
                          <Tag className="w-3 h-3" /> {railPromo.kind === 'coupon' ? 'Coupon' : 'Offer'}
                        </span>
                        <div className="relative p-4">
                          <h4 className="text-base font-bold leading-tight drop-shadow-sm">{railPromo.title}</h4>
                          {railPromo.desc && <p className="mt-0.5 text-[12px] text-white/85 leading-snug line-clamp-2">{railPromo.desc}</p>}
                          {railPromo.code && (
                            <div className="mt-2.5 flex items-center gap-2">
                              <code className="flex-1 rounded-lg border border-dashed border-white/60 bg-white/15 backdrop-blur-sm px-3 py-1.5 text-center text-sm font-bold tracking-[0.15em] text-white">{railPromo.code}</code>
                              <button
                                type="button"
                                onClick={() => { try { navigator.clipboard?.writeText(railPromo!.code!); showSuccessToast('Copied', `Coupon ${railPromo!.code} copied`); } catch { /* clipboard unavailable */ } }}
                                className="rounded-lg bg-white px-3 py-2 text-xs font-bold text-[#e01a1b] transition-colors hover:bg-white/90"
                              >
                                Copy
                              </button>
                            </div>
                          )}
                          {(railPromo.savingLabel || railPromo.endsLabel) && (
                            <div className="mt-2 flex items-center justify-between gap-2">
                              {railPromo.savingLabel ? <span className="rounded-full bg-emerald-500/90 px-2 py-0.5 text-[11px] font-bold text-white">{railPromo.savingLabel}</span> : <span />}
                              {railPromo.endsLabel && <span className="rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-semibold text-white/90 whitespace-nowrap">{railPromo.endsLabel}</span>}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      /* No image — clean branded card. */
                      <div className={`${cardBase} overflow-hidden transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_44px_-16px_rgba(224,26,27,0.4)]`}>
                        <div className="flex items-center gap-2 bg-linear-to-r from-[#fff5f5] to-white px-5 py-3 border-b border-[#ffe1e1]">
                          <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-[#e01a1b]/10 text-[#e01a1b]"><Tag className="w-4 h-4" /></span>
                          <h3 className="font-playfair text-base font-semibold text-[#1a1a1a] tracking-tight">{railPromo.kind === 'coupon' ? 'Coupon' : 'Offer'}</h3>
                        </div>
                        <div className="p-5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="inline-flex items-center rounded-full bg-[#e01a1b] text-white text-[10px] font-bold uppercase tracking-wide px-2 py-0.5">{railPromo.badge}</span>
                            <span className="text-sm font-bold text-[#1a1a1a]">{railPromo.title}</span>
                          </div>
                          {railPromo.desc && <p className="mt-1 text-[12px] text-gray-600 leading-snug">{railPromo.desc}</p>}
                          {railPromo.code && (
                            <div className="mt-3 flex items-center gap-2">
                              <code className="flex-1 rounded-lg border border-dashed border-[#e01a1b]/50 bg-[#fff5f5] px-3 py-1.5 text-center text-sm font-bold tracking-[0.15em] text-[#e01a1b]">{railPromo.code}</code>
                              <button
                                type="button"
                                onClick={() => { try { navigator.clipboard?.writeText(railPromo!.code!); showSuccessToast('Copied', `Coupon ${railPromo!.code} copied`); } catch { /* clipboard unavailable */ } }}
                                className="rounded-lg bg-[#e01a1b] px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#c41617]"
                              >
                                Copy
                              </button>
                            </div>
                          )}
                          {(railPromo.savingLabel || railPromo.endsLabel) && (
                            <div className="mt-2 flex items-center justify-between gap-2">
                              {railPromo.savingLabel ? <span className="text-[12px] font-bold text-emerald-700">{railPromo.savingLabel}</span> : <span />}
                              {railPromo.endsLabel && <span className="text-[11px] font-semibold text-[#e01a1b] whitespace-nowrap">{railPromo.endsLabel}</span>}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Meet the Maker — manufacturer information */}
          {hasManufacturerInfo(product.manufacturerInfo) && (() => {
            const m = product.manufacturerInfo!
            const name = manufacturerDisplayName(m)
            return (
              <div className="lg:hidden mt-6 sm:mt-8 bg-white rounded-xl sm:rounded-2xl ring-1 ring-black/[0.06] p-4 sm:p-6 lg:p-8">
                <Reveal>
                  <h3 className="font-playfair text-xl sm:text-2xl font-semibold text-[#1a1a1a] mb-1 tracking-tight">Meet the Maker</h3>
                  <p className="text-sm text-gray-500 mb-5 sm:mb-6">The hands behind this product</p>
                </Reveal>
                <div className="flex flex-col sm:flex-row sm:items-start gap-5 sm:gap-6">
                  {/* Photo */}
                  <div className="shrink-0 mx-auto sm:mx-0">
                    {m.photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={m.photo}
                        alt={name || 'Manufacturer'}
                        className="w-28 h-28 sm:w-32 sm:h-32 rounded-full object-cover ring-4 ring-[#e01a1b]/10 border border-gray-100 shadow-sm"
                      />
                    ) : (
                      <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-300">
                        <User className="w-12 h-12" />
                      </div>
                    )}
                  </div>

                  {/* Text */}
                  <div className="flex-1 min-w-0 text-center sm:text-left">
                    {name && (
                      <p className="font-playfair text-lg sm:text-xl font-semibold text-[#1a1a1a] tracking-tight">{name}</p>
                    )}
                    {(m.role || m.experience) && (
                      <div className="mt-2.5 flex flex-wrap justify-center sm:justify-start gap-2">
                        {m.role && m.role.trim() && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#e01a1b]/[0.06] text-[#e01a1b] text-xs font-semibold">
                            <Award className="w-3.5 h-3.5" /> {m.role}
                          </span>
                        )}
                        {m.experience && m.experience.trim() && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-semibold">
                            <Clock className="w-3.5 h-3.5" /> {m.experience} experience
                          </span>
                        )}
                      </div>
                    )}
                    {m.description && m.description.trim() && (
                      <p className="mt-4 text-sm sm:text-[15px] text-gray-600 leading-relaxed whitespace-pre-line">{m.description}</p>
                    )}
                  </div>
                </div>
              </div>
            )
          })()}

          {/* Customer Reviews */}
          {showReviews && (
            <div id="customer-reviews" className="mt-6 sm:mt-8 bg-white rounded-xl sm:rounded-2xl ring-1 ring-gray-100 p-4 sm:p-5 lg:p-6 scroll-mt-48">
              <div className="flex items-center justify-between gap-3 mb-4 sm:mb-5">
                <h3 className="font-playfair text-lg sm:text-xl font-semibold text-[#1a1a1a] tracking-tight">Customer Reviews</h3>
                <button
                  onClick={() => { window.location.href = userAuthService.isAuthenticated() ? '/order' : '/login'; }}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#e01a1b] px-3.5 py-1.5 text-xs sm:text-[13px] font-semibold text-white hover:bg-[#c41617] transition-colors shrink-0"
                >
                  <Star className="w-3.5 h-3.5" /> {userAuthService.isAuthenticated() ? 'Write a Review' : 'Sign in to Review'}
                </button>
              </div>
              {loadingReviews ? (
                /* Skeleton mirrors the review list — 3 review-row placeholders. */
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="border-b border-gray-100 pb-4 space-y-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse" />
                        <div className="space-y-1">
                          <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
                          <div className="h-3 w-20 bg-gray-100 rounded animate-pulse" />
                        </div>
                      </div>
                      <div className="h-4 w-full bg-gray-100 rounded animate-pulse" />
                      <div className="h-4 w-3/4 bg-gray-100 rounded animate-pulse" />
                    </div>
                  ))}
                </div>
              ) : reviews.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center py-10">
                  <div className="flex items-center gap-0.5 mb-3">
                    {[1, 2, 3, 4, 5].map((i) => <Star key={i} className="w-6 h-6 text-gray-200" />)}
                  </div>
                  <p className="text-sm font-semibold text-gray-700">No reviews yet</p>
                  <p className="mt-1 text-xs text-gray-400">Be the first customer to review this product.</p>
                  <button
                    onClick={() => { window.location.href = userAuthService.isAuthenticated() ? '/order' : '/login'; }}
                    className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-[#e01a1b] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#c41617] transition-colors"
                  >
                    <Star className="w-3.5 h-3.5" /> {userAuthService.isAuthenticated() ? 'Write a Review' : 'Sign in to Review'}
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 lg:items-start">
                    {/* ── Left column — rating chart ── */}
                    {(() => {
                      const total = reviews.length;
                      const avg = total ? reviews.reduce((s, r) => s + (r.rating || 0), 0) / total : 0;
                      const withText = reviews.filter((r) => r.comment && r.comment.trim()).length;
                      const dist = [5, 4, 3, 2, 1].map((star) => ({ star, count: reviews.filter((r) => Math.round(r.rating || 0) === star).length }));
                      return (
                        <div className="lg:w-64 xl:w-72 shrink-0">
                          <div className="rounded-xl bg-gray-50 ring-1 ring-gray-100 p-4 sm:p-5 lg:sticky lg:top-24">
                            <div className="flex items-baseline gap-1">
                              <span className="text-4xl sm:text-5xl font-extrabold text-gray-900 leading-none">{avg.toFixed(1)}</span>
                              <span className="text-sm text-gray-400">/5</span>
                            </div>
                            <div className="flex items-center gap-0.5 mt-2">
                              {[1, 2, 3, 4, 5].map((i) => <Star key={i} className={`w-4 h-4 ${i <= Math.round(avg) ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}`} />)}
                            </div>
                            <div className="mt-1 text-[12px] text-gray-500">{total} rating{total === 1 ? '' : 's'}{withText > 0 ? ` • ${withText} review${withText === 1 ? '' : 's'}` : ''}</div>
                            <div className="mt-4 space-y-1">
                              {dist.map(({ star, count }) => {
                                const active = reviewStar === star;
                                return (
                                  <button
                                    key={star}
                                    onClick={() => setReviewStar(active ? 0 : star)}
                                    className="group flex w-full items-center gap-2 rounded-md px-1 py-0.5 hover:bg-white transition-colors"
                                  >
                                    <span className={`text-[11px] w-7 shrink-0 text-left ${active ? 'text-[#e01a1b] font-semibold' : 'text-gray-500'}`}>{star}★</span>
                                    <div className="flex-1 h-2 rounded-full bg-gray-200 overflow-hidden">
                                      <div className={`h-full rounded-full transition-all duration-500 ${active ? 'bg-[#e01a1b]' : 'bg-amber-400 group-hover:bg-amber-500'}`} style={{ width: `${total ? (count / total) * 100 : 0}%` }} />
                                    </div>
                                    <span className="text-[11px] text-gray-400 w-6 text-right shrink-0">{count}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* ── Right column — reviews (scrollable) ── */}
                    <div className="flex-1 min-w-0">
                      {/* Toolbar — search + sort */}
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 mb-3">
                        <div className="relative flex-1">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input
                            value={reviewSearch}
                            onChange={(e) => setReviewSearch(e.target.value)}
                            placeholder="Search reviews..."
                            className="w-full rounded-full border border-gray-200 bg-gray-50 pl-9 pr-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#e01a1b]/15 focus:border-[#e01a1b]/40 transition"
                          />
                        </div>
                        <select
                          value={reviewSort}
                          onChange={(e) => setReviewSort(e.target.value as typeof reviewSort)}
                          className="rounded-full border border-gray-200 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#e01a1b]/15 focus:border-[#e01a1b]/40 transition cursor-pointer"
                        >
                          <option value="newest">Newest first</option>
                          <option value="oldest">Oldest first</option>
                          <option value="highest">Highest rated</option>
                          <option value="lowest">Lowest rated</option>
                        </select>
                      </div>

                      {/* Star filter chips */}
                      <div className="flex flex-wrap items-center gap-1.5 mb-3">
                        {[0, 5, 4, 3, 2, 1].map((s) => {
                          const active = reviewStar === s;
                          return (
                            <button
                              key={s}
                              onClick={() => setReviewStar(s)}
                              className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold transition-colors ${active ? 'bg-[#e01a1b] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                            >
                              {s === 0 ? 'All' : <>{s}<Star className={`w-3 h-3 ${active ? 'fill-white' : 'fill-amber-400 text-amber-400'}`} /></>}
                            </button>
                          );
                        })}
                      </div>

                      {/* Scrollable review list with thin separators */}
                      {filteredReviews.length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-8">No reviews match your filters.</p>
                      ) : (
                        <div className="max-h-[30rem] overflow-y-auto pr-2 -mr-2 divide-y divide-gray-100">
                          {filteredReviews.slice(0, reviewShown).map((review) => {
                            const countryName = getCountryName(review.user?.country);
                            const flag = countryName ? getCountryFlag(review.user?.country) : '';
                            const imgs = (review.images || []).filter(Boolean);
                            const helped = helpfulIds.has(review.id);
                            return (
                              <div key={review.id} className="py-4 first:pt-0">
                                <div className="flex items-start gap-3">
                                  {review.user?.image ? (
                                    <Image src={review.user.image} alt="" width={36} height={36} className="w-9 h-9 rounded-full object-cover ring-1 ring-black/5 shrink-0" />
                                  ) : (
                                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center shrink-0">
                                      <span className="text-sm font-bold text-gray-500">{(review.user?.name || 'C')[0].toUpperCase()}</span>
                                    </div>
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="font-semibold text-gray-900 text-sm truncate">{review.user?.name || 'Customer'}</span>
                                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                                        <Check className="w-3 h-3" /> Verified Purchase
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-gray-400">
                                      <span className="flex items-center gap-0.5">
                                        {[1, 2, 3, 4, 5].map((i) => <Star key={i} className={`w-3.5 h-3.5 ${i <= review.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}`} />)}
                                      </span>
                                      <span>{new Date(review.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                      {countryName && <span className="border-l border-gray-200 pl-2">{flag ? `${flag} ` : ''}{countryName}</span>}
                                    </div>
                                    {review.comment && (
                                      <p className="mt-2 text-sm text-gray-600 leading-relaxed whitespace-pre-line">{review.comment}</p>
                                    )}
                                    {imgs.length > 0 && (
                                      <div className="mt-2.5 flex flex-wrap gap-2">
                                        {imgs.map((src, idx) => (
                                          <button
                                            key={idx}
                                            onClick={() => setLightbox({ images: imgs, index: idx })}
                                            className="relative w-16 h-16 rounded-lg overflow-hidden ring-1 ring-gray-200 hover:ring-[#e01a1b]/50 transition-all group"
                                          >
                                            <Image src={src} alt="" fill sizes="64px" className="object-cover transition-transform duration-300 group-hover:scale-110" />
                                          </button>
                                        ))}
                                      </div>
                                    )}
                                    <div className="mt-2.5">
                                      <button
                                        onClick={() => setHelpfulIds((prev) => { const n = new Set(prev); if (n.has(review.id)) n.delete(review.id); else n.add(review.id); return n; })}
                                        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold transition-colors ${helped ? 'border-[#e01a1b]/30 bg-[#fff1f1] text-[#e01a1b]' : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700'}`}
                                      >
                                        <ThumbsUp className={`w-3.5 h-3.5 ${helped ? 'fill-[#e01a1b]' : ''}`} /> {helped ? 'Marked helpful' : 'Helpful'}
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Load more */}
                      {filteredReviews.length > reviewShown && (
                        <div className="mt-4 flex justify-center">
                          <button
                            onClick={() => setReviewShown((n) => n + 5)}
                            className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 px-5 py-2 text-sm font-semibold text-gray-700 hover:border-[#e01a1b]/40 hover:text-[#e01a1b] hover:bg-[#fff1f1] transition-colors"
                          >
                            Load more reviews <span className="text-gray-400">({filteredReviews.length - reviewShown})</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Review image lightbox */}
          {lightbox && (
            <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
              <button onClick={() => setLightbox(null)} className="absolute top-4 right-4 text-white/80 hover:text-white p-2" aria-label="Close"><X className="w-6 h-6" /></button>
              {lightbox.images.length > 1 && (
                <button onClick={(e) => { e.stopPropagation(); setLightbox((l) => l ? { ...l, index: (l.index - 1 + l.images.length) % l.images.length } : l); }} className="absolute left-3 sm:left-6 text-white/80 hover:text-white p-2" aria-label="Previous"><ChevronLeft className="w-7 h-7" /></button>
              )}
              <div className="relative max-w-3xl w-full h-[70vh] sm:h-[80vh]" onClick={(e) => e.stopPropagation()}>
                <Image src={lightbox.images[lightbox.index]} alt="" fill sizes="90vw" className="object-contain" />
              </div>
              {lightbox.images.length > 1 && (
                <>
                  <button onClick={(e) => { e.stopPropagation(); setLightbox((l) => l ? { ...l, index: (l.index + 1) % l.images.length } : l); }} className="absolute right-3 sm:right-6 text-white/80 hover:text-white p-2" aria-label="Next"><ChevronRight className="w-7 h-7" /></button>
                  <div className="absolute bottom-5 left-1/2 -translate-x-1/2 text-white/70 text-xs font-medium">{lightbox.index + 1} / {lightbox.images.length}</div>
                </>
              )}
            </div>
          )}

          {/* Manufacturer "Meet the Maker" modal */}
          {showMakerModal && hasManufacturerInfo(product.manufacturerInfo) && (() => {
            const m = product.manufacturerInfo!;
            const name = manufacturerDisplayName(m);
            return (
              <div
                className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
                onClick={() => setShowMakerModal(false)}
              >
                <div
                  className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
                  onClick={(e) => e.stopPropagation()}
                  role="dialog"
                  aria-modal="true"
                  aria-label="Manufacturer profile"
                >
                  {/* Brand header band with overlapping avatar */}
                  <div className="relative h-24 bg-gradient-to-br from-[#e01a1b] to-[#a31314]">
                    <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_20%_20%,white_0,transparent_45%)]" />
                    <button
                      onClick={() => setShowMakerModal(false)}
                      className="absolute top-3 right-3 text-white/80 hover:text-white p-1.5 rounded-full hover:bg-white/15 transition-colors"
                      aria-label="Close"
                    >
                      <X className="w-5 h-5" />
                    </button>
                    <div className="absolute -bottom-10 left-1/2 -translate-x-1/2">
                      {m.photo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={m.photo} alt={name || 'Manufacturer'} className="w-20 h-20 rounded-full object-cover ring-4 ring-white shadow-md" />
                      ) : (
                        <div className="w-20 h-20 rounded-full bg-gray-100 ring-4 ring-white shadow-md flex items-center justify-center text-gray-300">
                          <User className="w-9 h-9" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Body */}
                  <div className="pt-14 pb-6 px-6 text-center">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-[#e01a1b] font-semibold mt-2">The hands behind this product</p>
                    {name && <h3 className="font-playfair text-xl font-semibold text-[#1a1a1a] tracking-tight mt-1">{name}</h3>}

                    {(m.role?.trim() || m.experience?.trim()) && (
                      <div className="mt-3 flex flex-wrap justify-center gap-2">
                        {m.role && m.role.trim() && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#e01a1b]/[0.06] text-[#e01a1b] text-xs font-semibold">
                            <Award className="w-3.5 h-3.5" /> {m.role}
                          </span>
                        )}
                        {m.experience && m.experience.trim() && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-semibold">
                            <Clock className="w-3.5 h-3.5" /> {m.experience}
                          </span>
                        )}
                      </div>
                    )}

                    {m.description && m.description.trim() && (
                      <>
                        <div className="mt-5 mb-3 flex items-center gap-3">
                          <span className="h-px flex-1 bg-gray-100" />
                          <span className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">About</span>
                          <span className="h-px flex-1 bg-gray-100" />
                        </div>
                        <p className="text-left text-sm text-gray-600 leading-relaxed whitespace-pre-line max-h-[40vh] overflow-y-auto pr-1">{m.description}</p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* You may also like — same-category products (hidden when none) */}
          {relatedProducts.length > 0 && (
            <div className="mt-6 sm:mt-8">
              <div className="flex items-end justify-between gap-4 mb-4 sm:mb-6">
                <div>
                  <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#e01a1b] mb-1">
                    <span className="h-px w-6 bg-[#e01a1b]" /> More to explore
                  </span>
                  <h3 className="font-playfair text-xl sm:text-2xl font-semibold text-[#1a1a1a] tracking-tight">You may also like</h3>
                </div>
                <a
                  href={`/products?category=${encodeURIComponent(product.category || '')}`}
                  className="hidden sm:inline-flex items-center gap-1 text-sm font-semibold text-[#e01a1b] hover:text-[#c41617] whitespace-nowrap"
                >
                  View all
                  <ChevronDown className="w-4 h-4 -rotate-90" />
                </a>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
                {relatedProducts.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            </div>
          )}


        </div >

        {/* Featured products — full-width section, same as the home page */}
        <FeaturedProducts />
      </div >
    </>
  );
};

export default ProductDetail;
