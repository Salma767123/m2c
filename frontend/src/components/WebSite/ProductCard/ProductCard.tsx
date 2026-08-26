'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Product as ServiceProduct } from '@/services/productService';
import { PublicProduct } from '@/services/publicProductService';
import { Product as MockProduct } from '@/components/mockData/products';
import { ShoppingCart, Heart, Sparkles } from 'lucide-react';
import { FaceIcon, positiveFace } from '@/components/WebSite/Shared/FaceRating';
import { cartService } from '@/services/cartService';
import { wishlistService } from '@/services/wishlistService';
import { userAuthService } from '@/services/userAuthService';
import { showSuccessToast, showErrorToast } from '@/lib/toast-utils';
import { formatPrice, getRegionalPrice, getRegionalOriginalPrice, isVisibleInRegion } from '@/lib/currency';
import type { ActiveOffer } from '@/lib/offers';

interface ProductCardProps {
  product: ServiceProduct | PublicProduct | MockProduct;
  /**
   * Presentation only — no behaviour, data or handler differs between the two.
   *
   * 'grid' (the default) is the original card, byte-identical to what it has
   * always rendered. The products page, product detail and the notice board all
   * use it and are unaffected by this prop existing.
   *
   * 'showcase' is the homepage Featured treatment: larger name in the brand
   * serif, quieter price, a resting shadow so the card reads as an object, one
   * promo badge instead of three coloured elements, no quantity stepper, and an
   * Add to Cart that sits calm at rest and fills brand red on hover. The point
   * is that four of these in a row read as four products, not four red bars.
   */
  variant?: 'grid' | 'showcase';
}

const ProductCard = ({ product, variant = 'grid' }: ProductCardProps) => {
  const showcase = variant === 'showcase';
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

  // Single consolidated discount figure — drives both the image badge and the
  // price accent so promo info is shown once, not repeated across pills.
  const discountPct = strikePrice && effectivePrice && strikePrice > effectivePrice
    ? Math.round((1 - effectivePrice / strikePrice) * 100)
    : (typeof (product as any).discount === 'number' && (product as any).discount > 0 ? (product as any).discount : null);

  // Actual money saved (auto-calculated from the effective vs. original price).
  const savingsAmount = strikePrice && effectivePrice && strikePrice > effectivePrice
    ? strikePrice - effectivePrice
    : null;

  const ratingValue = Number(product.rating) || 0;
  // null when the score is not one worth advertising; the badge then shows
  // the plain review count instead of a face.
  const badgeFace = positiveFace(ratingValue);
  const reviewCount = Number(product.reviews) || 0;
  const hasReviews = reviewCount > 0;

  return (
    <Link href={`/products/${product.slug || product.id}`} className="block h-full">
      {/* Borderless editorial tile — the image and content define the card, not a
          frame. No border, no rest shadow; a whisper of elevation on hover only.

          'showcase' breaks that one rule deliberately: on the homepage the cards
          sit on a warm linen ground, and with no resting shadow a white card on
          a near-white page has nothing separating it from the surface — it stops
          reading as an object. The warm-toned ring and shadow give it a table to
          sit on. */}
      <div
        className={`group relative h-full flex flex-col overflow-hidden bg-white font-sans transition-all duration-300 ease-out hover:-translate-y-1 cursor-pointer ${showcase
          ? 'rounded-[16px] ring-1 ring-[#e3d7c9] shadow-[0_10px_26px_-18px_rgba(74,50,38,0.45)] hover:ring-[#cdb9a5] hover:shadow-[0_26px_48px_-24px_rgba(74,50,38,0.55)]'
          : 'rounded-[14px] ring-1 ring-black/[0.06] hover:ring-black/[0.09] hover:shadow-[0_14px_30px_-18px_rgba(0,0,0,0.25)]'
          }`}
      >
        {/* ── Image: the visual hero ─────────────────────────────────────── */}
        <div className="relative aspect-[5/4] w-full shrink-0 overflow-hidden bg-[radial-gradient(120%_100%_at_50%_0%,#faf9f7_0%,#ece9e4_100%)]">
          <Image
            src={imageUrl}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, (max-width: 1536px) 25vw, 20vw"
            className="object-cover transition-transform duration-[900ms] ease-out group-hover:scale-[1.03]"
            unoptimized={!primaryImage}
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = placeholderImage;
            }}
          />

          {/* Single, compact promo accent — top-left.
              Showcase swaps the green for brand oxblood: green is the only
              foreign colour in the palette, and paired with the green savings
              pill below it put two of them on every card. */}
          {discountPct ? (
            <span
              className={`absolute top-1.5 left-1.5 z-10 rounded-md text-[9px] font-bold tabular-nums text-white sm:top-2 sm:left-2 sm:text-[10px] ${showcase
                ? 'bg-[#22c55e] px-1.5 py-0.5 shadow-[0_0_10px_rgba(34,197,94,0.7)]'
                : 'bg-[#22c55e] px-1.5 py-0.5 shadow-[0_0_4px_rgba(34,197,94,0.35)]'
                }`}
            >
              −{discountPct}%
            </span>
          ) : null}

          {/* Rating — compact metric pinned to the image's bottom-left corner */}
          {hasReviews ? (
            <div className="absolute bottom-1.5 left-1.5 z-10 inline-flex items-center gap-0.5 rounded-md bg-gradient-to-r from-[#F5A524] to-[#F59E0B] px-1 py-0.5 text-[9.5px] leading-none text-white shadow-[0_2px_9px_rgba(245,158,11,0.5)] sm:bottom-2 sm:left-2 sm:gap-1 sm:px-1.5 sm:text-[11px]">
              <span className="font-bold tabular-nums">{ratingValue.toFixed(1)}</span>
              <Sparkles className="h-2.5 w-2.5 fill-white text-white sm:h-3 sm:w-3" strokeWidth={1.5} />
              <span className="tabular-nums text-white/85">{reviewCount}</span>
            </div>
          ) : (
            <div className="absolute bottom-1.5 left-1.5 z-10 inline-flex items-center rounded-md bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide leading-none text-white shadow-[0_2px_9px_rgba(99,102,241,0.5)] sm:bottom-2 sm:left-2 sm:px-2 sm:text-[10.5px]">
              New
            </div>
          )}

          {/* Wishlist — compact glyph on a subtle frosted disc so it stays clearly
              visible over both light and dark product photos. */}
          <button
            onClick={handleToggleWishlist}
            aria-label={isInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
            title={isInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
            // 28px on a phone rather than 32. It sits over the photo of a card
            // that is itself only ~163px wide, and at 32 it was taking a fifth
            // of that width off the product. Still past the 24px minimum for a
            // touch target, and the tap area is the button, not the glyph.
            className={`absolute top-1.5 right-1.5 z-10 grid h-7 w-7 place-items-center rounded-full backdrop-blur-sm shadow-md transition-all duration-300 hover:scale-105 active:scale-90 focus:outline-none sm:top-2 sm:right-2 sm:h-8 sm:w-8 ${isInWishlist
              ? 'bg-[#e01a1b] ring-1 ring-[#e01a1b]'
              : 'bg-white ring-1 ring-[#e01a1b]/30 hover:ring-[#e01a1b]/60'
              }`}
          >
            <Heart
              className={`h-4 w-4 transition-all duration-300 sm:h-[18px] sm:w-[18px] ${isInWishlist
                ? 'fill-white text-white scale-110'
                : 'fill-[#e01a1b]/10 text-[#e01a1b]'
                }`}
              strokeWidth={2.2}
            />
          </button>

          {!isActuallyInStock && (
            <div className="absolute inset-0 z-10 grid place-items-center bg-white/45 backdrop-blur-[1px]">
              <span className="rounded-md bg-[#1a1a1a]/85 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white">
                Out of Stock
              </span>
            </div>
          )}
        </div>

        {/* ── Body: Product → Rating → Price → Action ───────────────────────

            Every size below steps up at sm, because these cards are laid out
            two to a row on a phone. On a 375px viewport that is grid-cols-2
            inside px-4 with a gap-4 between — about 163px of card, and 135px
            of content once the showcase padding is taken off. The desktop
            sizes were being asked to fit in a bit over half the width they
            were drawn for, which is what broke "Save $2.65" across two lines
            mid-amount. */}
        <div className={`flex grow flex-col ${showcase ? 'p-2.5 sm:p-4' : 'p-2 sm:p-2.5'}`}>
          {/* Meta block grows so the price + action stay bottom-aligned across cards */}
          <div className="grow">
            {/* Showcase raises the name and drops the price's weight below it.
                In the grid the price is the hero — correct for a listing. In a
                handpicked showcase the product is, and a 14px name under a 20px
                extrabold price inverts that. */}
            <h3
              className={`font-playfair font-semibold leading-snug tracking-tight text-[#1a1a1a] line-clamp-2 transition-colors duration-300 group-hover:text-[#e01a1b] ${showcase ? 'text-[13px] sm:text-[17px]' : 'text-[12px] sm:text-sm'
                }`}
            >
              {product.name}
            </h3>
          </div>

          {/* Price — the financial hero.
              One line where there is room for one, and a clean second line
              where there is not. It was a nowrap row before, so on a phone the
              savings had nowhere to go but inside itself: the span narrowed
              and "Save $2.65" broke after "Save", leaving a bare "$2.65" on
              its own line reading like a third price. Wrapping the ROW and
              refusing to wrap the AMOUNTS puts the break where it belongs.

              ml-auto only from sm. Pushed right on a wrapped line the savings
              would sit alone against the far edge, which reads as a stray. */}
          <div className={`flex flex-wrap items-baseline gap-x-2 gap-y-0.5 ${showcase ? 'mt-2 sm:mt-2.5' : 'mt-1.5 sm:mt-2'}`}>
            <span
              className={`whitespace-nowrap leading-none tracking-tight tabular-nums text-[#1a1a1a] ${showcase ? 'text-[16px] sm:text-[21px] font-semibold' : 'text-base sm:text-xl font-extrabold'
                }`}
            >
              {formatPrice(effectivePrice || 0)}
            </span>
            {strikePrice && strikePrice > (effectivePrice || 0) ? (
              <span className={`whitespace-nowrap line-through tabular-nums ${showcase ? 'text-[11px] text-[#8a7d72] sm:text-[12.5px]' : 'text-[10.5px] text-gray-400 sm:text-xs'}`}>
                {formatPrice(strikePrice)}
              </span>
            ) : null}
            {savingsAmount ? (
              // Savings stays — it is the whole pitch of a markdowns store — but
              // in showcase it loses the green pill and becomes plain oxblood
              // text, so the card carries one accent colour instead of three.
              <span
                className={`whitespace-nowrap tabular-nums sm:ml-auto ${showcase
                  ? 'text-[10px] font-bold text-[#16a34a] [text-shadow:0_0_8px_rgba(34,197,94,0.55)] sm:text-[11.5px]'
                  : 'rounded bg-[#22c55e]/12 px-1 py-0.5 text-[9.5px] font-bold text-[#15803d] sm:px-1.5 sm:text-[10.5px]'
                  }`}
              >
                Save {formatPrice(savingsAmount)}
              </span>
            ) : null}
          </div>

          {/* Action — one integrated row, moderate radius.
              Showcase drops the stepper: a quantity control belongs on the
              detail page, and on a listing card it eats width and adds noise
              beside three other controls. Adding still works, one at a time.

              The grid variant keeps its stepper, but stacked rather than
              alongside: basis-full puts the button on its own line under it.

              Side by side it did not fit at ANY width, which is why the label
              was arriving as "Add to Ca". The grid gets denser as the viewport
              grows — 2 columns on a phone, 6 at xl — so the card stays between
              about 166px and 192px the whole way up. Take off the padding and
              the stepper's ~76px and the button is left with 65-95px for a
              label plus an icon that need roughly 90px. There is no breakpoint
              where the row wins, so there is no breakpoint to unstack at. */}
          <div className={`flex flex-wrap items-center gap-1.5 sm:gap-2 ${showcase ? 'mt-2.5 sm:mt-3' : 'mt-2 sm:mt-2.5'}`}>
            {isActuallyInStock && !showcase && (
              <div className="inline-flex shrink-0 items-center rounded-md ring-1 ring-gray-200 bg-gray-50/70">
                <button
                  onClick={handleDecrement}
                  disabled={quantity <= 1}
                  aria-label="Decrease quantity"
                  className="grid h-7 w-6 place-items-center rounded-l-md text-gray-500 transition-colors duration-200 hover:text-[#e01a1b] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-gray-500 sm:h-8 sm:w-7"
                >
                  <span className="text-[15px] font-semibold leading-none sm:text-base">−</span>
                </button>
                <span className="w-4 text-center text-[13px] font-semibold tabular-nums text-[#1a1a1a] sm:w-5 sm:text-sm">{quantity}</span>
                <button
                  onClick={handleIncrement}
                  aria-label="Increase quantity"
                  className="grid h-7 w-6 place-items-center rounded-r-md text-gray-500 transition-colors duration-200 hover:text-[#e01a1b] sm:h-8 sm:w-7"
                >
                  <span className="text-[15px] font-semibold leading-none sm:text-base">+</span>
                </button>
              </div>
            )}

            <button
              onClick={handleAddToCart}
              disabled={!isActuallyInStock || isAddingToCart || (isActuallyInStock && quantity > currentStock)}
              // Showcase keeps the button calm at rest and fills brand red on
              // hover. Four solid red slabs side by side were the loudest shape
              // in the section — louder than the products they were selling.
              // Not a hover-reveal: that leaves touch devices with no visible
              // buy affordance at all.
              className={`group/btn flex min-w-0 flex-1 basis-full items-center justify-center gap-1 whitespace-nowrap font-semibold transition-all duration-300 disabled:cursor-not-allowed sm:gap-1.5 ${showcase ? 'h-8 rounded-lg px-2 text-[11.5px] sm:h-10 sm:px-4 sm:text-[13px]' : 'btn-shine h-7 rounded-md px-2 text-[11px] sm:h-8 sm:px-3 sm:text-xs'
                } ${isActuallyInStock
                  ? showcase
                    ? 'bg-[#fbf4ec] text-[#7a0f10] ring-1 ring-[#e2d1bd] hover:bg-[#e01a1b] hover:text-white hover:ring-[#e01a1b] hover:shadow-[0_10px_22px_-10px_rgba(224,26,27,0.65)] active:scale-[0.98]'
                    : 'bg-[#e01a1b] text-white hover:brightness-[1.06] active:scale-[0.98]'
                  : showcase
                    ? 'cursor-not-allowed bg-[#f5f0ea] text-[#a89a8d] ring-1 ring-[#e8ded2]'
                    : 'cursor-not-allowed bg-gray-100 text-gray-400 ring-1 ring-gray-200'
                }`}
            >
              <ShoppingCart className="h-3.5 w-3.5 shrink-0 transition-transform duration-300 group-hover/btn:scale-110 sm:h-4 sm:w-4" />
              {isAddingToCart ? 'Adding…' : isActuallyInStock ? 'Add to Cart' : 'Unavailable'}
            </button>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default ProductCard;
