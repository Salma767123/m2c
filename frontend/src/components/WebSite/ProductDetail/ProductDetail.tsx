'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { productService, Product, ProductVariant } from '@/services/productService';
import { publicProductService, type PublicProduct } from '@/services/publicProductService';
import ProductCard from '@/components/WebSite/ProductCard/ProductCard';
import { cartService } from '@/services/cartService';
import { userAuthService } from '@/services/userAuthService';
import { Heart, Truck, Shield, RotateCcw, Package, Plane, Ship, AlertTriangle, Info, Box, Check, User, Award, Clock, ChevronDown, Tag, Search, ThumbsUp, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { hasManufacturerInfo, manufacturerDisplayName } from '@/lib/manufacturerInfo';
import { useToast } from '@/hooks/use-toast';
import { showSuccessToast, showErrorToast, showWarningToast } from '@/lib/toast-utils';
import { wishlistService } from '@/services/wishlistService';
import { trackProductView } from '@/services/analyticsService';
import { recordRecentlyViewed } from '@/lib/browsingHistory';
import reviewService from '@/services/reviewService';
import { getCountryName, getCountryFlag } from '@/components/WebSite/CheckOut/CheckoutProcess/constants';
import Image from 'next/image';
import { formatPrice, getRegionalPrice, getRegionalOriginalPrice, isVisibleInRegion, getCurrency, getRegion, convertINRtoUSD } from '@/lib/currency';
import { transportModeLabel, isSurfaceRegion, type Courier } from '@/lib/couriers';
import { FaceIcon, FACE_LABELS, positiveFace, lovedPercent, type FaceValue } from '@/components/WebSite/Shared/FaceRating';
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
          // Keep a client-side "recently viewed" list for the empty-cart page.
          recordRecentlyViewed(response.data.id);
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

  // A short table of the facts a shopper checks before buying, shown in the
  // hero beside the image. Amazon does the same and keeps the full list further
  // down the page -- here that is the Specifications tab, which builds its own
  // longer set including fabric specs, product code and availability. Six rows
  // is the cap; past that it stops being a glance and becomes the tab again.
  //
  // A plain const, not useMemo: this sits below the loading/not-found returns
  // above, so a hook here would be called on some renders and not others.
  const keyFacts = (() => {
    const out: { label: string; value: string; hex?: string | null }[] = [];
    const add = (label: string, value?: string | null, hex?: string | null) => {
      if (value != null && String(value).trim() !== '') out.push({ label, value: String(value), hex });
    };
    // Size and colour belong to the variant when there is one, and the variant
    // picker under the gallery already says which is selected.
    if (!product.hasVariants) {
      add('Size', product.singleUnitSize);
      add('Color', product.singleUnitColor, product.singleUnitColorHex);
    }
    add('Material', product.material);
    add('Fabric', product.fabricType);
    add('Dimensions', product.dimensions);
    if (product.weight) {
      const unit = product.weightUnit && !/[a-z]/i.test(String(product.weight)) ? ` ${product.weightUnit}` : '';
      add('Weight', `${product.weight}${unit}`);
    }
    add('Sold as', product.uom);
    return out.slice(0, 6);
  })();

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

      <div className="bg-[#f9f5f2] min-h-screen font-sans">
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
          {/* Breadcrumb, above the card rather than inside the middle column.
              It is page-level furniture -- where you are in the catalogue --
              so it belongs over the whole hero, not in one of its three
              columns where it read as a caption on the title. */}
          {(product.category || product.subCategory) && (
            <nav aria-label="Breadcrumb" className="mb-2.5 flex flex-wrap items-center gap-1 text-[11px] text-gray-500 sm:text-xs">
              <Link href="/" className="transition-colors hover:text-[#e01a1b]">Home</Link>
              {product.category && (
                <>
                  <ChevronRight aria-hidden className="h-3 w-3 shrink-0 text-gray-300" />
                  <Link
                    href={`/products?category=${encodeURIComponent(product.category)}`}
                    className="transition-colors hover:text-[#e01a1b]"
                  >
                    {product.category}
                  </Link>
                </>
              )}
              {product.subCategory && (
                <>
                  <ChevronRight aria-hidden className="h-3 w-3 shrink-0 text-gray-300" />
                  <span className="font-medium text-gray-700">{product.subCategory}</span>
                </>
              )}
            </nav>
          )}
          <div className="bg-white rounded-xl sm:rounded-2xl overflow-clip">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
              {/* Product Images */}
              <div className="lg:col-span-4 p-3 sm:p-4 lg:p-6 bg-linear-to-br from-[#faf9f7] to-white">
                <div className="lg:sticky lg:top-40">
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
                          <div className="flex items-center gap-2.5 min-w-0">
                            {/* Product Main Image Preview */}
                            {product.images && product.images.length > 0 && (
                              <div className="h-10 w-10 rounded-lg overflow-hidden ring-1 ring-gray-200/80 shrink-0 bg-gray-50">
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
                                    className="h-4 w-4 rounded-full shrink-0 ring-1 ring-black/15 ring-offset-1 ring-offset-white"
                                    style={{ backgroundColor: product.singleUnitColorHex }}
                                    title={product.singleUnitColor}
                                  />
                                )}
                                <span className="font-semibold text-gray-900 text-[13px] leading-tight truncate">
                                  {product.singleUnitSize ? product.singleUnitSize : (product.singleUnitColor ? product.singleUnitColor : 'Base Variant')}
                                </span>
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
                            <div className="flex items-center gap-2.5 min-w-0">
                              {/* Variant Image Preview in Selector */}
                              {variant.images && variant.images.length > 0 && (
                                <div className="h-10 w-10 rounded-lg overflow-hidden ring-1 ring-gray-200/80 shrink-0 bg-gray-50">
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
                                      className="h-4 w-4 rounded-full shrink-0 ring-1 ring-black/15 ring-offset-1 ring-offset-white"
                                      style={{ backgroundColor: variant.colorHex }}
                                      title={variant.color}
                                    />
                                  )}
                                  <span className="font-semibold text-gray-900 text-[13px] leading-tight truncate">
                                    {variant.variantName || variant.color}
                                  </span>
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

                      {/* Rating. The listing payload carries an average and a
                          count but no per-star breakdown, so the percentage
                          version of this line lives in the reviews section
                          below, which loads the reviews themselves. Here it is
                          a face and a count -- and no face at all when the
                          score is not one we would advertise. */}
                      <div className="flex items-center flex-wrap gap-2 sm:gap-x-4 sm:gap-y-2 mb-1 sm:mb-1.5">
                        {(() => {
                          const n = product.reviews || 0;
                          const face = positiveFace(Number(product.rating) || 0);
                          if (n === 0) return <span className="text-[13px] font-medium text-gray-400 sm:text-sm">No reviews yet</span>;
                          return (
                            <span className="inline-flex items-center gap-1.5">
                              {face && <FaceIcon value={face} className="h-5 w-5" />}
                              <span className="text-[13px] font-semibold text-gray-700 sm:text-sm">
                                {face ? <><span className="tabular-nums">{n}</span> loved this</> : <><span className="tabular-nums">{n}</span> review{n === 1 ? '' : 's'}</>}
                              </span>
                            </span>
                          );
                        })()}
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

                      {/* The headline price. It stays in this column -- Amazon
                          keeps the big figure with the product facts and repeats a
                          compact one in the buy box, because by the time you have
                          read the details the number you are committing to should
                          be beside the button, not a column away. */}
                      <div className="bg-[#fdfdfd] rounded-xl sm:rounded-2xl ring-1 ring-black/[0.06] p-4 mb-3">
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

                      {/* About this item -- the opening of the description, with the
                          rest a click away in the tab below rather than repeated
                          here. Amazon leads with this; we had the text but buried
                          all of it under a tab the shopper had to go looking for. */}
                      {product.description && (
                        <div>
                          <h2 className="mb-2 text-[14px] font-bold uppercase tracking-[0.08em] text-gray-900">About this item</h2>
                          <p className="line-clamp-4 whitespace-pre-line text-[14.5px] leading-relaxed text-gray-600 sm:text-[15px]">{product.description}</p>
                          <button
                            type="button"
                            onClick={() => document.getElementById('product-information')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                            className="mt-2 inline-flex items-center gap-1 text-[14px] font-semibold text-[#e01a1b] transition-colors hover:text-[#c41617]"
                          >
                            Read full description
                            <ChevronRight className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}

                      {/* The facts, as a table rather than the grey box that used to
                          sit here. That box only appeared for products WITHOUT
                          variants, so a product like this one -- four variants --
                          showed no specification at all in the hero. */}
                      {keyFacts.length > 0 && (
                        <div>
                          <h2 className="mb-2.5 text-[14px] font-bold uppercase tracking-[0.08em] text-gray-900">Product details</h2>
                          <dl className="divide-y divide-gray-100 overflow-hidden rounded-xl ring-1 ring-black/[0.06]">
                            {keyFacts.map((f) => (
                              <div key={f.label} className="flex items-start gap-3 bg-white px-4 py-3 text-[14.5px]">
                                <dt className="w-24 shrink-0 text-gray-500 sm:w-28">{f.label}</dt>
                                <dd className="flex min-w-0 flex-1 items-center gap-2 font-medium text-gray-900">
                                  {f.hex && (
                                    <span
                                      aria-hidden
                                      className="inline-block h-3.5 w-3.5 shrink-0 rounded-full border border-gray-300"
                                      style={{ backgroundColor: f.hex }}
                                    />
                                  )}
                                  <span className="break-words">{f.value}</span>
                                </dd>
                              </div>
                            ))}
                          </dl>
                        </div>
                      )}

                    </div>
                  </div>
              </div>

              {/* ══ Buy box ══
                  One column holding the whole purchase decision: price, stock,
                  how it ships, what that costs, quantity, and the two buttons.
                  The page used to split them -- actions in the middle column, a
                  read-only Order Summary beside it -- so the running total was
                  never next to the button it described, and choosing Air vs Sea
                  changed a figure in a different column from the control.

                  It is no longer `hidden lg:flex`. That matters now: the actions
                  live in here, so hiding the rail below lg would have taken Add
                  to Cart off every phone. Below lg it simply stacks under the
                  product facts. */}
              <aside className="flex flex-col gap-5 self-start p-3 sm:p-4 lg:col-span-3 lg:sticky lg:top-40 lg:p-6 lg:pl-2">
                <div className="rounded-2xl bg-white p-4 ring-1 ring-black/[0.07] sm:p-5">
                  {/* The asking price again, compact, at the top of the box. */}
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 pb-3">
                    <span className="text-2xl font-bold tabular-nums text-gray-900">{formatPrice(offeredPrice || 0)}</span>
                    {hasOfferSaving ? (
                      <span className="text-sm tabular-nums text-gray-500 line-through">{formatPrice(currentPrice)}</span>
                    ) : originalPrice && originalPrice > currentPrice ? (
                      <span className="text-sm tabular-nums text-gray-500 line-through">{formatPrice(originalPrice)}</span>
                    ) : null}
                    <span className="text-xs text-gray-500">/ {product?.uom || 'pcs'}</span>
                  </div>
                    {/* Stock Status */}
                    <div className="mb-3">
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
                      <div className="bg-[#fff1f1] p-2 rounded-lg mb-3">
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
                          <div className="rounded-lg bg-[#faf7f3] p-2.5 text-center">
                            <div className="text-xs text-gray-500 mb-0.5">Delivery Time</div>
                            <div className="text-sm font-bold text-gray-900">{logisticsResult.deliveryDays} days</div>
                          </div>
                          <div className="rounded-lg bg-[#faf7f3] p-2.5 text-center">
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

                        {/* CBM (volumetric) breakdown — auto-calculated per unit,
                            then scaled to the chosen quantity. */}
                        {(product.logisticsConfig as LogisticsConfig).dimensions && (() => {
                          const d = (product.logisticsConfig as LogisticsConfig).dimensions!;
                          const unit = (d.unit || 'CM').toUpperCase();
                          const toM = (v: number) => (unit === 'IN' ? v * 0.0254 : v / 100);
                          const perUnit = toM(d.length) * toM(d.width) * toM(d.height);
                          const total = perUnit * quantity;
                          const formula = unit === 'IN' ? '× 2.54³ ÷ 1,000,000' : '÷ 1000 ÷ 1000';
                          return (
                            <div className="rounded-lg border border-[#f0e8df] bg-[#faf7f3]/70 p-3 text-xs">
                              <div className="mb-1.5 flex items-center justify-between">
                                <span className="flex items-center gap-1.5 font-semibold text-gray-700">
                                  <Box className="h-3.5 w-3.5" /> CBM (Volumetric)
                                </span>
                                <span className="font-bold tabular-nums text-gray-900">{total.toFixed(4)} m³</span>
                              </div>
                              <div className="space-y-0.5 text-[11px] leading-relaxed text-gray-500">
                                <div>
                                  Per unit: {d.length} × {d.width} × {d.height} {formula} ={' '}
                                  <span className="font-medium tabular-nums text-gray-700">{perUnit.toFixed(4)} m³</span>
                                </div>
                                <div>
                                  Total: {perUnit.toFixed(4)} × {quantity} {quantity === 1 ? 'unit' : 'units'} ={' '}
                                  <span className="font-medium tabular-nums text-gray-700">{total.toFixed(4)} m³</span>
                                </div>
                              </div>
                            </div>
                          );
                        })()}

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

                  {availableStock > 0 && (
                    <>
                          {/* Quantity Selector — shown below price / stock / dispatch (order-3) */}
                          <div className="flex items-center justify-center flex-wrap gap-2 sm:gap-3 mb-3">
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

                  {/* The running total, directly above the buttons instead of in a
                      separate card beside them. Quantity and the freight choice both
                      move this figure, so it belongs next to the controls that change
                      it -- which is exactly what the old split layout could not do. */}
                  {availableStock > 0 && (() => {
                    const unit = offeredPrice || 0;
                    const subtotal = unit * (quantity || 0);
                    const shipINR = logisticsResult ? logisticsResult.totalShippingCost : null;
                    const shipDisplay = shipINR == null ? null : (getCurrency() === 'USD' ? convertINRtoUSD(shipINR) : shipINR);
                    const total = subtotal + (shipDisplay || 0);
                    return (
                      <div className="mt-4 space-y-2 border-t border-gray-100 pt-4 text-sm">
                        <div className="flex items-center justify-between text-gray-600">
                          <span>Subtotal <span className="text-gray-400">({quantity} {product?.uom || 'pcs'})</span></span>
                          <span className="font-semibold tabular-nums text-gray-900">{formatPrice(subtotal)}</span>
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
                          <span className="font-semibold tabular-nums text-gray-900">
                            {shipDisplay == null ? '—' : shipDisplay === 0 ? 'FREE' : formatPrice(shipDisplay)}
                          </span>
                        </div>
                        {logisticsResult && (
                          <div className="flex items-center justify-between text-gray-600">
                            <span>Delivery</span>
                            <span className="font-semibold text-gray-900">{logisticsResult.deliveryDays} days</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between border-t border-gray-100 pt-2">
                          <span className="text-base font-bold text-gray-900">Total</span>
                          <span className="text-xl font-extrabold tabular-nums text-[#e01a1b]">{formatPrice(total)}</span>
                        </div>
                      </div>
                    );
                  })()}
                            {/* Add to Cart / Buy Now — below the Shipping & Logistics block */}
                            <div className="w-full mt-4">
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

              </aside>
            </div>
          </div>

          {/* Why choose this -- four across the full width, under the hero.
              It has now been in the buy-box rail (where it made that column the
              tallest and killed the sticky) and in the middle column (where it
              was a narrow card with white space either side of it). It is four
              short facts; four short facts want a row, not a column. */}
          {whyChoose.length > 0 && (
            // The column count follows the number of facts. Fixed at four, a
            // product with two of them left half the row empty -- which is the
            // white space this block was moved here to stop making.
            <div className={`mt-4 grid grid-cols-2 gap-3 sm:mt-5 ${
              whyChoose.length <= 2 ? 'lg:grid-cols-2' : whyChoose.length === 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-4'
            }`}>
              {whyChoose.map((w, i) => {
                const Icon = w.icon;
                return (
                  <div key={i} className="flex items-start gap-3 rounded-xl bg-white p-4 ring-1 ring-black/[0.06] sm:rounded-2xl">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#e01a1b]/[0.08] text-[#e01a1b]">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-[14.5px] font-semibold leading-tight text-gray-900">{w.title}</h3>
                      <p className="mt-1 text-[13px] leading-snug text-gray-500">{w.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ══ Product information ══ */}
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
            // Shipping tab shows admin-configured logistics only (delivery time +
            // shipping cost). The vendor's dispatch timeline is intentionally not shown.
            const hasShipping = !!(logisticsResult || product.logisticsConfig);

            // Nothing known about this product at all: skip the band rather than
            // render an empty card. This used to be `tabs.length === 0`, back when
            // each of these sections was a tab.
            if (!hasDescription && specItems.length === 0 && careList.length === 0 && !hasShipping) return null;

            return (
              <div className="mt-4 space-y-4 sm:mt-5 sm:space-y-5">
                {/* ══ Offers & coupons ══
                    A savings panel, not a list. It was two flat rows repeating
                    what the price block already said, and before that it was
                    the same thing twice on one page. The three things a
                    shopper actually wants here are: what is already off, what
                    else could come off, and what would I end up paying -- so
                    the panel leads with the last of those. */}
                {(activeOffer || categoryCoupon) && (() => {
                  // What the coupon would take off on top of the offer price.
                  // Deliberately labelled as a checkout estimate: this is a
                  // CATEGORY coupon, and whether it clears its own minimum-order
                  // and eligibility rules is decided server-side at checkout, not
                  // here. Quoting it as a firm price would be inventing a promise.
                  const withCoupon = (() => {
                    if (!categoryCoupon || !offeredPrice) return null;
                    const off = categoryCoupon.discountType === 'PERCENTAGE'
                      ? offeredPrice * (categoryCoupon.discountValue / 100)
                      : categoryCoupon.discountValue;
                    const p = Math.round(Math.max(0, offeredPrice - off) * 100) / 100;
                    return p < offeredPrice ? p : null;
                  })();
                  const couponBadge = categoryCoupon
                    ? (categoryCoupon.discountType === 'PERCENTAGE'
                        ? `${categoryCoupon.discountValue}% OFF`
                        : `${formatPrice(categoryCoupon.discountValue)} OFF`)
                    : null;
                  return (
                    <div className="overflow-hidden rounded-xl bg-white ring-1 ring-black/[0.06] sm:rounded-2xl">
                      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-[#f4dad6] bg-linear-to-r from-[#fff7f5] via-[#fffbfa] to-white px-5 py-4 sm:px-6">
                        <h2 className="inline-flex items-center gap-2.5 font-playfair text-lg font-semibold tracking-tight text-[#1a1a1a] sm:text-xl">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#e01a1b]/[0.09] text-[#e01a1b]">
                            <Tag className="h-4 w-4" />
                          </span>
                          Offers &amp; coupons
                        </h2>
                        {withCoupon != null && (
                          <span className="text-right">
                            <span className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-[#a1948a]">With the coupon below</span>
                            <span className="text-xl font-extrabold tabular-nums text-[#157f4a] sm:text-2xl">{formatPrice(withCoupon)}</span>
                            <span className="block text-[12px] text-gray-400 sm:ml-1.5 sm:inline">at checkout, if it applies</span>
                          </span>
                        )}
                      </div>
                      <div className="divide-y divide-gray-100">
                        {activeOffer && (
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-2.5 px-4 py-4 sm:gap-x-4 sm:px-6">
                            {/* ActiveOffer carries no artwork of its own -- only the
                                store-wide PublicOffer does -- so this row wears its
                                badge as the tile rather than an image that would
                                have been undefined on every product. */}
                            <span className="flex h-11 w-14 shrink-0 items-center justify-center rounded-lg bg-[#fff1f1] text-[11px] font-extrabold text-[#e01a1b] ring-1 ring-[#f4dad6] sm:h-12 sm:w-16">
                              {activeOffer.badge}
                            </span>
                            {/* basis-40 is a floor, not a width. flex-1 on its own let
                                this block be squeezed to whatever the tile and the two
                                money spans left over -- about 30px on a phone, which is
                                why every single word wrapped onto its own line. */}
                            <div className="min-w-0 flex-1 basis-40">
                              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                <span className="text-[15px] font-bold text-[#1a1a1a] sm:text-base">{activeOffer.title}</span>
                                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 ring-1 ring-emerald-200">Already applied</span>
                              </div>
                              <p className="mt-0.5 text-[13.5px] leading-snug text-gray-500 sm:text-sm">
                                {activeOffer.description || 'Included in the price shown above.'}
                              </p>
                            </div>
                            {/* The money and the deadline take a line of their own on a
                                phone rather than competing with the copy for the same one. */}
                            {(hasOfferSaving || offerEnds) && (
                              <div className="flex w-full items-center justify-between gap-3 border-t border-gray-100 pt-2.5 sm:w-auto sm:justify-end sm:border-0 sm:pt-0">
                                {hasOfferSaving ? (
                                  <span className="text-[15px] font-bold tabular-nums text-[#157f4a]">
                                    &minus;{formatPrice(currentPrice - offeredPrice)}
                                    <span className="ml-1 text-[12px] font-medium text-gray-400">/ {product?.uom || 'unit'}</span>
                                  </span>
                                ) : <span />}
                                {offerEnds && <span className="text-[12.5px] font-semibold text-[#e01a1b]">{offerEnds}</span>}
                              </div>
                            )}
                          </div>
                        )}
                        {categoryCoupon && (
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-2.5 px-4 py-4 sm:gap-x-4 sm:px-6">
                            {categoryCoupon.popupImage ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={categoryCoupon.popupImage} alt="" loading="lazy" className="h-11 w-14 shrink-0 rounded-lg object-cover ring-1 ring-black/5 sm:h-12 sm:w-16" />
                            ) : (
                              <span className="flex h-11 w-14 shrink-0 items-center justify-center rounded-lg bg-[#eefaf3] text-[11px] font-extrabold text-[#157f4a] ring-1 ring-emerald-200 sm:h-12 sm:w-16">
                                {couponBadge}
                              </span>
                            )}
                            <div className="min-w-0 flex-1 basis-40">
                              <p className="text-[15px] font-bold text-[#1a1a1a] sm:text-base">{categoryCoupon.popupTitle || 'Coupon'}</p>
                              <p className="mt-0.5 text-[13.5px] leading-snug text-gray-500 sm:text-sm">
                                {categoryCoupon.popupMessage || categoryCoupon.description || 'Enter this code in the cart.'}
                              </p>
                            </div>
                            <div className="flex w-full items-center gap-2 border-t border-gray-100 pt-2.5 sm:w-auto sm:border-0 sm:pt-0">
                              <code className="flex-1 rounded-lg border border-dashed border-[#e01a1b]/45 bg-[#fff7f5] px-3.5 py-2 text-center text-[14px] font-bold tracking-[0.18em] text-[#e01a1b] sm:flex-none sm:text-left">{categoryCoupon.code}</code>
                              <button
                                type="button"
                                onClick={() => { try { navigator.clipboard?.writeText(categoryCoupon.code); showSuccessToast('Copied', `Coupon ${categoryCoupon.code} copied`); } catch { /* clipboard unavailable */ } }}
                                className="rounded-lg bg-[#e01a1b] px-3.5 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-[#c41617]"
                              >
                                Copy
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* ══ Product information — stacked, full width, no tabs ══
                    It was a 2/3 tab panel beside a 1/3 promo rail, which meant
                    three of the four things this page knows about the product
                    were hidden behind a click, and the widest surface on the
                    page was spent on a promo card. Everything is open now, one
                    section per hairline, and the body type is a step larger --
                    13px in a 900px-wide column was hard to read. */}
                <div id="product-information" className="scroll-mt-40 divide-y divide-gray-100 overflow-hidden rounded-xl bg-white ring-1 ring-black/[0.06] sm:rounded-2xl">
                  {hasDescription && (
                    <section className="px-5 py-6 sm:px-6 sm:py-7 lg:px-8">
                      <h2 className="font-playfair text-xl font-semibold tracking-tight text-[#1a1a1a] sm:text-2xl">Product description</h2>
                      {product.description && (
                        <>
                          <p className={`mt-3 max-w-4xl whitespace-pre-line text-[15px] leading-7 text-gray-600 sm:text-base ${showAllDetails ? '' : 'line-clamp-6'}`}>{product.description}</p>
                          {product.description.length > 260 && (
                            <button
                              onClick={() => setShowAllDetails(!showAllDetails)}
                              className="mt-2.5 inline-flex items-center gap-1 text-[14px] font-semibold text-[#e01a1b] hover:text-[#c41617]"
                            >
                              {showAllDetails ? 'Read less' : 'Read more'}
                              <ChevronDown className={`h-4 w-4 transition-transform ${showAllDetails ? 'rotate-180' : ''}`} />
                            </button>
                          )}
                        </>
                      )}
                      {product.tags && product.tags.length > 0 && (
                        <div className="mt-4 flex flex-wrap gap-2">
                          {product.tags.map((tag, i) => (
                            <span key={i} className="inline-flex items-center gap-1.5 rounded-full bg-[#e01a1b]/[0.06] px-3 py-1.5 text-[13px] font-semibold text-[#e01a1b]">
                              <Check className="h-3.5 w-3.5" /> {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </section>
                  )}

                  {specItems.length > 0 && (
                    <section className="px-5 py-6 sm:px-6 sm:py-7 lg:px-8">
                      <h2 className="font-playfair text-xl font-semibold tracking-tight text-[#1a1a1a] sm:text-2xl">Specifications</h2>
                      <dl className="mt-3 grid grid-cols-1 gap-x-12 sm:grid-cols-2 lg:gap-x-16">
                        {specItems.map((s, i) => (
                          <div key={i} className="flex items-center gap-3 border-b border-gray-100 py-3">
                            <dt className="whitespace-nowrap text-[14.5px] text-gray-500">{s.label}</dt>
                            <span className="flex-1 border-b border-dotted border-gray-300/80" />
                            <dd className="whitespace-nowrap text-right text-[14.5px] font-semibold text-gray-900">{s.value}</dd>
                          </div>
                        ))}
                      </dl>
                    </section>
                  )}

                  {careList.length > 0 && (
                    <section className="px-5 py-6 sm:px-6 sm:py-7 lg:px-8">
                      <h2 className="font-playfair text-xl font-semibold tracking-tight text-[#1a1a1a] sm:text-2xl">Care instructions</h2>
                      <div className="mt-3 flex flex-wrap gap-2.5">
                        {careList.map((instruction, index) => {
                          const item = CARE_INSTRUCTIONS.find((c) => c.label === instruction);
                          const iconColor = item ? CATEGORY_COLORS[item.category] || 'text-gray-500' : 'text-gray-400';
                          return (
                            <span key={index} className="group inline-flex items-center gap-2 rounded-full bg-white py-2 pl-2 pr-4 text-[14px] font-semibold text-gray-700 shadow-sm ring-1 ring-gray-200 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:ring-[#e01a1b]/30">
                              {item ? (
                                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#faf7f3] ${iconColor} transition-transform duration-300 group-hover:scale-110`}><CareIcon paths={item.paths} className="h-4 w-4" /></span>
                              ) : (
                                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-100 text-[11px] font-bold text-gray-500">{index + 1}</span>
                              )}
                              {instruction}
                            </span>
                          );
                        })}
                      </div>
                    </section>
                  )}

                  {hasShipping && (
                  <section className="px-5 py-6 sm:px-6 sm:py-7 lg:px-8">
                    <h2 className="font-playfair text-xl font-semibold tracking-tight text-[#1a1a1a] sm:text-2xl">Shipping</h2>
                    {logisticsResult ? (
                      <div className="mt-3 grid grid-cols-2 gap-3 sm:max-w-md">
                        <div className="rounded-xl bg-[#faf7f3] p-4 text-center ring-1 ring-[#f0e8df]">
                          <p className="text-[12.5px] text-gray-500">Delivery time</p>
                          <p className="mt-0.5 text-[17px] font-bold text-gray-900">{logisticsResult.deliveryDays} days</p>
                        </div>
                        <div className="rounded-xl bg-[#faf7f3] p-4 text-center ring-1 ring-[#f0e8df]">
                          <p className="text-[12.5px] text-gray-500">Shipping</p>
                          <p className="mt-0.5 text-[17px] font-bold text-gray-900">{logisticsResult.totalShippingCost === 0 ? 'FREE' : formatPrice(getCurrency() === 'USD' ? convertINRtoUSD(logisticsResult.totalShippingCost) : logisticsResult.totalShippingCost)}</p>
                        </div>
                      </div>
                    ) : null}
                    <p className="mt-3 max-w-4xl text-[14px] leading-relaxed text-gray-500">
                      Shipping method and final delivery estimate are confirmed in the purchase panel above.
                    </p>
                  </section>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Meet the Maker — manufacturer information */}
          {hasManufacturerInfo(product.manufacturerInfo) && (() => {
            const m = product.manufacturerInfo!
            const name = manufacturerDisplayName(m)
            return (
              <div className="mt-6 sm:mt-8 bg-white rounded-xl sm:rounded-2xl ring-1 ring-black/[0.06] p-4 sm:p-6 lg:p-8">
                {/* The action moved down here with the section. It used to live on
                    the rail card in the buy box -- that card is gone, and losing
                    the only way into the maker's full profile with it would have
                    been a regression, not a tidy-up. */}
                <Reveal>
                  <div className="mb-5 flex items-start justify-between gap-4 sm:mb-6">
                    <div>
                      <h3 className="font-playfair text-xl sm:text-2xl font-semibold text-[#1a1a1a] mb-1 tracking-tight">Meet the Maker</h3>
                      <p className="text-sm text-gray-500">The hands behind this product</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowMakerModal(true)}
                      className="group inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-semibold text-[#e01a1b] ring-1 ring-[#e01a1b]/25 transition-colors hover:bg-[#fff1f1]"
                    >
                      View profile
                      <ChevronRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
                    </button>
                  </div>
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
                      <p className="mt-4 max-w-3xl text-sm sm:text-[15px] text-gray-600 leading-relaxed whitespace-pre-line">{m.description}</p>
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
                  {userAuthService.isAuthenticated() ? 'Write a Review' : 'Sign in to Review'}
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
                  <div className="mb-3 flex items-center gap-1.5">
                    {/* In colour, not muted. Everywhere else on this page a face
                        stands in for a rating, and `muted` is how an unselected
                        one steps back. Here there is no rating to report -- these
                        are a preview of the one-tap question the button below
                        opens -- so greying them just made the invitation look
                        disabled. */}
                    {([5, 4, 3, 2, 1] as FaceValue[]).map((v) => <FaceIcon key={v} value={v} className="h-7 w-7" />)}
                  </div>
                  <p className="text-sm font-semibold text-gray-700">No reviews yet</p>
                  <p className="mt-1 text-xs text-gray-400">Be the first customer to review this product.</p>
                  <button
                    onClick={() => { window.location.href = userAuthService.isAuthenticated() ? '/order' : '/login'; }}
                    className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-[#e01a1b] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#c41617] transition-colors"
                  >
                    {userAuthService.isAuthenticated() ? 'Write a Review' : 'Sign in to Review'}
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
                      const ratings = reviews.map((r) => r.rating || 0);
                      const loved = lovedPercent(ratings);
                      // Two separate gates, and both have to pass before a face goes up.
                      //
                      //  wellRated  - is this a score we would advertise at all? Without
                      //               it, six reviews averaging 3.2 with one 5 among them
                      //               still put a big happy face over "1 loved this".
                      //  enough     - a percentage needs a sample before it means
                      //               anything. "100% loved it" off one review reads as
                      //               invented, which is the same argument the listing
                      //               badge uses for showing a count instead.
                      const wellRated = positiveFace(avg) !== null;
                      const enough = total >= 5;
                      const showPct = wellRated && enough && loved >= 50;
                      // Too few reviews for a percentage, but still a score worth
                      // showing: the face says it in a word instead of a number.
                      // No lovedN condition -- that was left over from when this hero
                      // was a COUNT of five-star reviews. The word comes from the
                      // average, so three reviews all at "Liked it" should say exactly
                      // that rather than fall through to a blank card.
                      const showWord = wellRated && !enough;
                      const wordFace = positiveFace(avg) as FaceValue;
                      return (
                        <div className="lg:w-64 xl:w-72 shrink-0">
                          <div className="rounded-xl bg-[#faf7f3] ring-1 ring-[#f0e8df] p-4 sm:p-5 lg:sticky lg:top-24">
                            {/* A big number is only earned when it says something the
                                line under it does not. "1" over "1 rating - 1 review"
                                printed the same digit three times and read as a score
                                out of nothing; and the no-face case was a bare "6" over
                                "6 ratings", which is the same problem without the face.
                                So the hero is a percentage when there is a sample to
                                support one, a word when there is not, and nothing at all
                                when there is nothing worth saying -- the bars below carry
                                it from there. */}
                            {showPct ? (
                              <>
                                <div className="flex items-center gap-2.5">
                                  {/* Always the top face: the number beside it counts
                                      that face and nothing else. Taking it from the
                                      average let the Liked-it face sit next to "loved". */}
                                  <FaceIcon value={5} className="h-11 w-11 shrink-0" />
                                  <span className="text-3xl font-extrabold leading-none text-gray-900 sm:text-4xl">
                                    <span className="tabular-nums">{loved}</span>%
                                  </span>
                                </div>
                                <div className="mt-1.5 text-[13px] font-semibold text-gray-700">loved it</div>
                              </>
                            ) : showWord ? (
                              <div className="flex items-center gap-2.5">
                                <FaceIcon value={wordFace} className="h-11 w-11 shrink-0" />
                                <span className="text-xl font-extrabold leading-tight text-gray-900 sm:text-2xl">{FACE_LABELS[wordFace]}</span>
                              </div>
                            ) : null}
                            <div className={`text-[12px] text-gray-500 ${showPct || showWord ? 'mt-1.5' : ''}`}>{total} rating{total === 1 ? '' : 's'}{withText > 0 ? ` • ${withText} review${withText === 1 ? '' : 's'}` : ''}</div>
                            <div className="mt-4 space-y-1">
                              {dist.map(({ star, count }) => {
                                const active = reviewStar === star;
                                return (
                                  <button
                                    key={star}
                                    onClick={() => setReviewStar(active ? 0 : star)}
                                    className="group flex w-full items-center gap-2 rounded-md px-1 py-0.5 hover:bg-white transition-colors"
                                  >
                                    <FaceIcon value={star as FaceValue} className="h-4 w-4 shrink-0" />
                                    <span className={`w-[4.6rem] shrink-0 text-left text-[11px] ${active ? 'font-semibold text-[#e01a1b]' : 'text-gray-500'}`}>{FACE_LABELS[star as FaceValue]}</span>
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
                          <option value="highest">Most loved</option>
                          <option value="lowest">Least loved</option>
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
                              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                                active
                                  ? (s === 0 ? 'bg-[#e01a1b] text-white' : 'bg-[#fff1f1] text-[#c41617] ring-1 ring-[#e01a1b]/40')
                                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                              }`}
                            >
                              {s === 0 ? 'All' : (
                                <>
                                  <FaceIcon value={s as FaceValue} className="h-4 w-4" />
                                  {FACE_LABELS[s as FaceValue]}
                                </>
                              )}
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
                                      {/* Inside the reviews list a low score DOES
                                          show its own face -- the rule against sad
                                          faces is about merchandising surfaces, not
                                          about hiding what a customer actually said. */}
                                      <span className="inline-flex items-center gap-1.5">
                                        <FaceIcon value={(Math.min(5, Math.max(1, Math.round(review.rating))) || 3) as FaceValue} className="h-4 w-4" />
                                        <span className="font-semibold text-gray-600">{FACE_LABELS[(Math.min(5, Math.max(1, Math.round(review.rating))) || 3) as FaceValue]}</span>
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
