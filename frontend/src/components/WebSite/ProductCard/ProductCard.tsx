'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Product as ServiceProduct } from '@/services/productService';
import { PublicProduct } from '@/services/publicProductService';
import { Product as MockProduct } from '@/components/mockData/products';
import { Star, ShoppingCart, Heart } from 'lucide-react';
import { cartService } from '@/services/cartService';
import { wishlistService } from '@/services/wishlistService';
import { userAuthService } from '@/services/userAuthService';
import { showSuccessToast, showErrorToast } from '@/lib/toast-utils';
import { formatPrice, getRegionalPrice, getRegionalOriginalPrice, isVisibleInRegion } from '@/lib/currency';
import type { ActiveOffer } from '@/lib/offers';

interface ProductCardProps {
  product: ServiceProduct | PublicProduct | MockProduct;
}

const ProductCard = ({ product }: ProductCardProps) => {
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [quantity, setQuantity] = useState(1);

  // Check if user is authenticated
  const isAuthenticated = userAuthService.isAuthenticated();

  // Check wishlist status from cache + listen for changes
  useEffect(() => {
    if (!isAuthenticated) return;

    // Initial check from cache (instant) then preload if needed
    setIsInWishlist(wishlistService.isInWishlistSync(product.id));
    wishlistService.preloadIds().then(ids => setIsInWishlist(ids.has(product.id)));

    // Listen for wishlist changes from other components
    const handler = (e: Event) => {
      const ids = (e as CustomEvent).detail.ids as string[];
      setIsInWishlist(ids.includes(product.id));
    };
    window.addEventListener('wishlist-changed', handler);
    return () => window.removeEventListener('wishlist-changed', handler);
  }, [product.id, isAuthenticated]);

  // Handle Add to Cart
  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent navigation to product page
    e.stopPropagation();

    // Check if user is authenticated
    if (!isAuthenticated) {
      showErrorToast('Login Required', 'Please login to add items to cart');
      // Redirect to login page after a short delay
      setTimeout(() => {
        window.location.href = '/login';
      }, 1500);
      return;
    }

    if (!isActuallyInStock) {
      showErrorToast('Out of Stock', 'This product is currently out of stock');
      return;
    }

    setIsAddingToCart(true);

    try {
      // Add to cart via API
      await cartService.addToCart(product.id, quantity);
      showSuccessToast('Added to Cart', `${quantity} x ${product.name} added to your cart`);
      // Reset quantity after adding
      setQuantity(1);
    } catch (error: any) {
      console.error('Error adding to cart:', error);
      showErrorToast('Failed', error.message || 'Unable to add item to cart');
    } finally {
      setIsAddingToCart(false);
    }
  };

  // Handle quantity increment — cap at available stock
  const handleIncrement = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setQuantity(prev => (prev < currentStock ? prev + 1 : prev));
  };

  // Handle quantity decrement
  const handleDecrement = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (quantity > 1) {
      setQuantity(prev => prev - 1);
    }
  };

  // Handle Wishlist Toggle
  const handleToggleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent navigation to product page
    e.stopPropagation();

    // Check if user is authenticated
    if (!isAuthenticated) {
      showErrorToast('Login Required', 'Please login to add items to wishlist');
      // Redirect to login page after a short delay
      setTimeout(() => {
        window.location.href = '/login';
      }, 1500);
      return;
    }

    // Optimistic update — UI changes instantly
    const wasInWishlist = isInWishlist;
    setIsInWishlist(!wasInWishlist);

    try {
      if (wasInWishlist) {
        await wishlistService.removeFromWishlist(product.id);
        showSuccessToast('Removed', `${product.name} removed from wishlist`);
      } else {
        await wishlistService.addToWishlist(product.id);
        showSuccessToast('Added', `${product.name} added to wishlist`);
      }
    } catch (error: any) {
      if (error.message?.includes('already in wishlist')) {
        setIsInWishlist(true);
      } else {
        // Revert on failure
        setIsInWishlist(wasInWishlist);
        showErrorToast('Failed', error.message || 'Unable to update wishlist');
      }
    }
  };

  // Type guard to check if it's a ServiceProduct or PublicProduct (from API)
  const isServiceProduct = (p: any): p is ServiceProduct | PublicProduct => {
    return 'basePrice' in p || 'adminFixedPrice' in p;
  };

  // Get the primary image or first image
  let primaryImage: string | undefined;

  // Check if images is an array and has items
  if (product.images && Array.isArray(product.images) && product.images.length > 0) {
    const firstImage = product.images[0];

    // Check if it's an object with url property (ServiceProduct)
    if (typeof firstImage === 'object' && firstImage !== null && 'url' in firstImage) {
      const images = product.images as Array<{ url: string; isPrimary: boolean }>;
      const primaryImg = images.find(img => img.isPrimary && img.url && img.url.trim() !== '');
      const firstImg = images.find(img => img.url && img.url.trim() !== '');
      primaryImage = primaryImg?.url || firstImg?.url;
    }
    // Check if it's a string (MockProduct)
    else if (typeof firstImage === 'string') {
      const images = product.images as string[];
      primaryImage = images.find(img => img && img.trim() !== '');
    }
  }

  // Fallback placeholder image
  const placeholderImage = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400"%3E%3Crect width="400" height="400" fill="%23f3f4f6"/%3E%3Cpath d="M200 150 L250 200 L200 250 L150 200 Z" fill="%239ca3af"/%3E%3Ccircle cx="200" cy="200" r="60" fill="none" stroke="%239ca3af" stroke-width="4"/%3E%3C/svg%3E';

  const imageUrl = primaryImage || placeholderImage;

  // Get price - use regional price (priceINR/priceUSD) → adminFixedPrice → basePrice
  let displayPrice: number | undefined;

  if (isServiceProduct(product)) {
    displayPrice = getRegionalPrice(product);
  } else {
    // For mock products, use price property
    displayPrice = (product as any).price;
  }

  // Compute region-aware original price (e.g. originalPriceUSD for US region)
  const regionalOriginalPrice = isServiceProduct(product)
    ? getRegionalOriginalPrice(product as any)
    : (product as any).originalPrice ?? null;

  // Hide product if not visible in current region
  if (!isVisibleInRegion((product as any).priceVisibility)) return null;

  // Derive actual stock — use totalStock, treat negative as 0
  const currentStock = isServiceProduct(product)
    ? Math.max(product.totalStock ?? 0, 0)
    : (product as any).stock ?? 1; // Default to 1 for mock products without stock specified

  const isActuallyInStock = currentStock > 0;

  // Automatic offer (attached by the backend for PublicProduct). When present it
  // defines the effective price and the strike-through, taking precedence over the
  // product's own MRP discount so the two never stack visually.
  const activeOffer: ActiveOffer | undefined = (product as PublicProduct).activeOffer;
  const effectivePrice = activeOffer ? activeOffer.offerPrice : displayPrice;
  const strikePrice = activeOffer ? activeOffer.originalPrice : regionalOriginalPrice;

  const savings = strikePrice && strikePrice > (effectivePrice || 0)
    ? strikePrice - (effectivePrice || 0)
    : null;

  return (
    <Link href={`/products/${product.slug || product.id}`} className="block h-full">
      {/* Gradient frame — a hairline at rest, brand-lit on hover. The 1px padding
          creates the border so the inner card keeps a clean white surface. */}
      <div className="group relative h-full rounded-[1.4rem] p-px bg-linear-to-b from-black/[0.08] via-black/[0.04] to-black/[0.08] shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:from-[#e01a1b]/60 hover:via-[#e01a1b]/25 hover:to-[#ff6b3d]/50 hover:shadow-[0_18px_40px_-20px_rgba(224,26,27,0.16)] hover:-translate-y-2 transition-all duration-500 cursor-pointer">
        {/* Ambient glow bloom behind the card on hover — kept very faint so it
            reads as a soft lift, not a red halo. */}
        <div className="pointer-events-none absolute -inset-2 -z-10 rounded-[1.7rem] bg-[#e01a1b]/0 blur-xl transition-all duration-500 group-hover:bg-[#e01a1b]/4" />

        <div className="relative h-full flex flex-col bg-white font-sans rounded-[1.35rem] overflow-hidden">
          {/* Media */}
          <div className="relative h-36 sm:h-40 md:h-48 w-full overflow-hidden shrink-0 bg-[radial-gradient(120%_100%_at_50%_0%,#faf9f7_0%,#eceae6_100%)]">
            <Image
              src={imageUrl}
              alt={product.name}
              fill
              sizes="(max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
              className="object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-[1.14]"
              unoptimized={!primaryImage} // Don't optimize placeholder SVG
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = placeholderImage;
              }}
            />

            {/* Bottom scrim — grounds the image and deepens on hover */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-linear-to-t from-black/25 to-transparent opacity-70 transition-opacity duration-500 group-hover:opacity-100" />

            {/* Sheen sweep across the image on hover */}
            <div className="pointer-events-none absolute inset-0 -translate-x-full skew-x-12 bg-linear-to-r from-transparent via-white/30 to-transparent transition-transform duration-[1000ms] ease-out group-hover:translate-x-full" />

            {activeOffer ? (
              <div className="absolute top-3 left-3 z-10 rounded-full bg-linear-to-r from-[#e01a1b] to-[#ff5a36] px-2.5 py-1 text-[11px] font-bold tracking-wide text-white shadow-[0_6px_18px_rgba(224,26,27,0.5)] ring-1 ring-white/40">
                {activeOffer.badge}
              </div>
            ) : product.discount ? (
              <div className="absolute top-3 left-3 z-10 rounded-full bg-linear-to-r from-[#e01a1b] to-[#ff5a36] px-2.5 py-1 text-[11px] font-bold tracking-wide text-white shadow-[0_6px_18px_rgba(224,26,27,0.5)] ring-1 ring-white/40">
                {product.discount}% OFF
              </div>
            ) : null}

            {/* Wishlist Button — frosted glass pill */}
            <button
              onClick={handleToggleWishlist}
              disabled={false}
              className={`absolute top-3 right-3 p-2 sm:p-2.5 rounded-full backdrop-blur-md ring-1 transition-all duration-300 hover:scale-110 active:scale-95 ${isInWishlist
                ? 'bg-[#e01a1b] text-white ring-[#e01a1b] shadow-[0_6px_16px_rgba(224,26,27,0.45)]'
                : 'bg-white/70 text-gray-700 ring-white/60 hover:bg-white hover:text-[#e01a1b]'
                } disabled:opacity-50 disabled:cursor-not-allowed shadow-md z-10`}
              title={isInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
            >
              <Heart
                className={`w-4 h-4 sm:w-[18px] sm:h-[18px] ${isInWishlist ? 'fill-current' : ''}`}
              />
            </button>

            {/* Category — sits on the image so the body can lead with the product */}
            <div className="absolute bottom-3 left-3 z-10 inline-flex items-center gap-1.5 rounded-full bg-white/85 backdrop-blur-md px-2.5 py-1 ring-1 ring-black/5 shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-[#e01a1b]" />
              <span className="text-[10px] uppercase tracking-[0.14em] text-[#1a1a1a] font-bold">
                {product.category}
              </span>
            </div>

            {!isActuallyInStock && (
              <div className="absolute bottom-3 right-3 bg-white/85 backdrop-blur-md text-[#1a1a1a] px-2.5 py-1 rounded-full text-xs font-semibold ring-1 ring-black/10 z-10">
                Out of Stock
              </div>
            )}
          </div>

          {/* Body */}
          <div className="p-3 sm:p-3.5 flex flex-col grow justify-between">
            {/* Top content - flexible */}
            <div className="grow">
              <h3 className="font-playfair text-sm sm:text-base font-semibold text-[#1a1a1a] mb-1 break-words tracking-tight transition-colors duration-300 group-hover:text-[#e01a1b]">
                {product.name}
              </h3>

              <div className="flex items-center mb-2">
                <div className="flex items-center flex-wrap gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${i < Math.floor(product.rating || 0) ? 'text-[#f5a524] fill-current' : 'text-gray-200 fill-current'
                        }`}
                    />
                  ))}
                  <span className="ml-1 text-[11px] text-gray-500">
                    {product.rating || 0} ({product.reviews || 0})
                  </span>
                </div>
              </div>

              {/* Price — the hero of the card: large, bold sans + tabular figures
                  so the digits stay crisp and evenly spaced. */}
              <div className="flex items-end justify-between gap-2 flex-wrap">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-xl sm:text-2xl leading-none font-extrabold text-[#1a1a1a] tracking-tight tabular-nums">
                    {formatPrice(effectivePrice || 0)}
                  </span>
                  {strikePrice && strikePrice > (effectivePrice || 0) ? (
                    <span className="text-sm text-gray-400 line-through tabular-nums">
                      {formatPrice(strikePrice)}
                    </span>
                  ) : null}
                </div>
                {savings ? (
                  <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 ring-1 ring-emerald-200 tabular-nums">
                    Save {formatPrice(savings)}
                  </span>
                ) : null}
              </div>
            </div>

            {/* Bottom content - fixed at bottom */}
            <div className="shrink-0">
              {/* Hairline divider for a refined split */}
              <div className="h-px w-full bg-linear-to-r from-transparent via-gray-200 to-transparent my-2.5" />

              {/* Quantity + Add to Cart */}
              <div className="flex items-center gap-2">
                {isActuallyInStock && (
                  <div className="inline-flex items-center shrink-0 rounded-full ring-1 ring-gray-200 bg-gray-50/80 p-0.5">
                    <button
                      onClick={handleDecrement}
                      disabled={quantity <= 1}
                      aria-label="Decrease quantity"
                      className="w-7 h-7 flex items-center justify-center rounded-full text-gray-600 hover:bg-white hover:text-[#e01a1b] hover:shadow-sm disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-all duration-200"
                    >
                      <span className="text-base font-semibold leading-none">−</span>
                    </button>
                    <span className="w-7 text-center font-semibold text-sm text-[#1a1a1a] tabular-nums">{quantity}</span>
                    <button
                      onClick={handleIncrement}
                      aria-label="Increase quantity"
                      className="w-7 h-7 flex items-center justify-center rounded-full text-gray-600 hover:bg-white hover:text-[#e01a1b] hover:shadow-sm transition-all duration-200"
                    >
                      <span className="text-base font-semibold leading-none">+</span>
                    </button>
                  </div>
                )}

                <button
                  onClick={handleAddToCart}
                  disabled={!isActuallyInStock || isAddingToCart || (isActuallyInStock && quantity > currentStock)}
                  className={`btn-shine group/btn flex-1 py-2 px-3 sm:px-4 rounded-full font-semibold text-xs sm:text-sm transition-all duration-300 flex items-center justify-center gap-2 ${isActuallyInStock
                    ? 'bg-linear-to-r from-[#e01a1b] to-[#ff4d2d] text-white shadow-[0_8px_22px_-6px_rgba(224,26,27,0.6)] hover:shadow-[0_16px_34px_-8px_rgba(224,26,27,0.75)] hover:brightness-110 active:scale-[0.97]'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed ring-1 ring-gray-200'
                    } disabled:cursor-not-allowed`}
                >
                  <ShoppingCart className="w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform duration-300 group-hover/btn:scale-110" />
                  {isAddingToCart ? 'Adding...' : isActuallyInStock ? 'Add to Cart' : 'Out of Stock'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default ProductCard;
