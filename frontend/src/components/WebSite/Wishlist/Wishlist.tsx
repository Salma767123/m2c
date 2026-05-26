'use client';

import { useState, useEffect } from 'react';
import { Heart, ShoppingCart, Share2, Trash2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { showSuccessToast, showErrorToast } from '@/lib/toast-utils';
import { wishlistService, WishlistItem } from '@/services/wishlistService';
import { cartService } from '@/services/cartService';
import { userAuthService } from '@/services/userAuthService';
import Image from 'next/image';
import { formatPrice, getRegionalPrice, getRegionalOriginalPrice } from '@/lib/currency';

const Wishlist = () => {
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const authStatus = userAuthService.isAuthenticated();
    setIsAuthenticated(authStatus);

    if (!authStatus) {
      setIsLoading(false);
      return;
    }

    loadWishlist();
  }, []);

  const loadWishlist = async () => {
    try {
      setIsLoading(true);

      // Load from backend for authenticated users
      const response = await wishlistService.getWishlist();
      if (response.success && response.data) {
        setWishlistItems(response.data.items);
      }
    } catch (error) {
      console.error('Error loading wishlist:', error);
      showErrorToast('Load Failed', 'Unable to load wishlist');
    } finally {
      setIsLoading(false);
    }
  };

  const removeFromWishlist = async (productId: string) => {
    try {
      await wishlistService.removeFromWishlist(productId);
      setWishlistItems(items => items.filter(item => item.productId !== productId));
      showSuccessToast('Removed', 'Item removed from wishlist');
    } catch (error) {
      console.error('Error removing from wishlist:', error);
      showErrorToast('Failed', 'Unable to remove item from wishlist');
    }
  };

  const addToCart = async (productId: string, productName: string) => {
    try {
      await cartService.addToCart(productId, 1);
      showSuccessToast('Added to Cart!', `${productName} has been added to your cart.`);
    } catch (error) {
      console.error('Error adding to cart:', error);
      showErrorToast('Failed to Add', 'Unable to add item to cart. Please try again.');
    }
  };

  const [isSharing, setIsSharing] = useState(false);

  const shareWishlist = async () => {
    try {
      setIsSharing(true);
      const shareToken = await wishlistService.getShareToken();
      const url = `${window.location.origin}/wishlist/shared/${shareToken}`;
      const productNames = wishlistItems
        .filter(item => item.product)
        .map(item => item.product!.name)
        .slice(0, 5);
      const text = productNames.length > 0
        ? `Check out my wishlist: ${productNames.join(', ')}${wishlistItems.length > 5 ? ` and ${wishlistItems.length - 5} more` : ''}`
        : 'Check out my wishlist!';

      if (navigator.share) {
        await navigator.share({ title: 'My Wishlist', text, url });
      } else {
        await navigator.clipboard.writeText(url);
        showSuccessToast('Link Copied!', 'Shareable wishlist link has been copied to clipboard.');
      }
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        showErrorToast('Share Failed', 'Unable to share wishlist. Please try again.');
      }
    } finally {
      setIsSharing(false);
    }
  };

  const shareProduct = (productId: string, productName: string) => {
    try {
      const url = `${window.location.origin}/products/${productId}`;
      if (navigator.share) {
        navigator.share({
          title: productName,
          text: `Check out this amazing product: ${productName}`,
          url: url,
        });
      } else {
        navigator.clipboard.writeText(url);
        showSuccessToast('Link Copied!', 'Product link has been copied to clipboard.');
      }
    } catch (error) {
      showErrorToast('Share Failed', 'Unable to share product. Please try again.');
    }
  };

  if (isLoading) {
    /* Skeleton mirrors the Order-style list layout */
    return (
      <div className="min-h-screen bg-slate-50 py-4 sm:py-6 lg:py-8 font-sans">
        <div className="max-w-7xl xl:max-w-420 mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
          <div className="mb-5 sm:mb-6 lg:mb-8 space-y-2">
            <div className="h-8 sm:h-10 w-40 sm:w-56 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 w-64 bg-gray-100 rounded animate-pulse" />
          </div>
          <div className="space-y-4 sm:space-y-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-5 lg:p-6">
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="w-24 h-24 sm:w-28 sm:h-28 lg:w-32 lg:h-32 bg-gray-200 rounded-lg animate-pulse shrink-0" />
                  <div className="flex-1 space-y-2 sm:space-y-3">
                    <div className="h-5 w-3/4 bg-gray-200 rounded animate-pulse" />
                    <div className="h-4 w-1/2 bg-gray-100 rounded animate-pulse" />
                    <div className="h-6 w-24 bg-gray-200 rounded animate-pulse" />
                    <div className="h-9 w-full bg-gray-200 rounded animate-pulse mt-3" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (wishlistItems.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 py-4 sm:py-6 lg:py-8 font-sans">
        <div className="max-w-7xl xl:max-w-420 mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-5 sm:mb-6 lg:mb-8">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <Heart className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 text-red-500 fill-current shrink-0" />
                <div className="min-w-0">
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 mb-1 sm:mb-2">My Wishlist</h1>
                  <p className="text-sm sm:text-base text-slate-600">Items you've saved for later</p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xl sm:text-2xl font-bold text-slate-900">0</p>
                <p className="text-xs sm:text-sm text-slate-600">Total Items</p>
              </div>
            </div>
          </div>

          {/* Empty State */}
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 lg:p-12 text-center">
            <Heart className="w-14 h-14 sm:w-16 sm:h-16 lg:w-20 lg:h-20 text-slate-300 mx-auto mb-4 sm:mb-6" />
            <h3 className="text-lg sm:text-xl lg:text-2xl font-semibold text-slate-900 mb-2">Your Wishlist is Empty</h3>
            <p className="text-sm sm:text-base text-slate-600 mb-5 sm:mb-6 max-w-md mx-auto">
              Save items you love to your wishlist and never lose track of them.
            </p>
            <Link
              href="/products"
              className="inline-flex items-center gap-2 bg-gray-800 text-white px-5 sm:px-6 py-2.5 sm:py-3 rounded-lg sm:rounded-xl hover:bg-gray-900 transition-colors font-semibold text-sm sm:text-base"
            >
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              Start Shopping
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-4 sm:py-6 lg:py-8 font-sans">
      <div className="max-w-7xl xl:max-w-420 mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
        {/* Header — Order-page style */}
        <div className="mb-5 sm:mb-6 lg:mb-8">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <Heart className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 text-red-500 fill-current shrink-0" />
              <div className="min-w-0">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 mb-1 sm:mb-2 truncate">My Wishlist</h1>
                <p className="text-sm sm:text-base text-slate-600">Items you've saved for later</p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xl sm:text-2xl font-bold text-slate-900">{wishlistItems.length}</p>
              <p className="text-xs sm:text-sm text-slate-600">Total Items</p>
            </div>
          </div>
        </div>

        {/* Top Actions */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mb-5 sm:mb-6 lg:mb-8">
          <button
            onClick={shareWishlist}
            disabled={isSharing || wishlistItems.length === 0}
            className="flex items-center justify-center gap-2 px-4 py-2.5 sm:py-3 text-sm sm:text-base bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Share2 className="w-4 h-4" />
            {isSharing ? 'Generating Link...' : 'Share Wishlist'}
          </button>
          <Link
            href="/products"
            className="flex items-center justify-center gap-2 px-4 py-2.5 sm:py-3 text-sm sm:text-base bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors"
          >
            <ShoppingCart className="w-4 h-4" />
            Continue Shopping
          </Link>
        </div>

        {/* Wishlist Items — Order-style list */}
        <div className="space-y-4 sm:space-y-6">
          {wishlistItems.map((item) => {
            if (!item.product) return null;
            const inStock = item.product.inStock;
            const productHref = `/products/${item.product?.slug || item.productId}`;
            const regionalPrice = getRegionalPrice(item.product);
            const regionalOriginalPrice = getRegionalOriginalPrice(item.product) || item.product.originalPrice;

            return (
              <div key={item.id} className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-5 lg:p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-3 sm:gap-4">
                  {/* Product Image */}
                  <Link
                    href={productHref}
                    className="relative w-24 h-24 sm:w-28 sm:h-28 lg:w-32 lg:h-32 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 shrink-0"
                  >
                    <Image
                      src={item.product.image || '/placeholder.png'}
                      alt={item.product.name}
                      fill
                      sizes="(max-width: 640px) 96px, (max-width: 1024px) 112px, 128px"
                      className="object-cover"
                    />
                    {item.product.discount ? (
                      <div className="absolute top-1 left-1 bg-gray-800 text-white px-1.5 py-0.5 rounded text-[10px] sm:text-xs font-semibold">
                        {item.product.discount}% OFF
                      </div>
                    ) : null}
                  </Link>

                  {/* Product Details */}
                  <div className="flex-1 min-w-0">
                    {/* Status badge — Out of Stock, only if applicable */}
                    {!inStock && (
                      <div className="flex items-center gap-1.5 mb-2 px-2.5 py-1 bg-red-50 rounded-lg w-fit">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                        <span className="text-xs font-semibold text-red-600">Out of Stock</span>
                      </div>
                    )}

                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0 flex-1">
                        <span className="inline-block text-xs bg-blue-100 text-blue-700 px-2 py-0.5 sm:py-1 rounded-full mb-1.5">
                          {item.product.category}
                        </span>
                        <h3 className="text-base sm:text-lg font-semibold text-slate-900 break-words">
                          <Link href={productHref} className="hover:text-gray-600 transition-colors">
                            {item.product.name}
                          </Link>
                        </h3>
                      </div>
                    </div>

                    {/* Rating */}
                    {item.product.rating != null && item.product.rating > 0 ? (
                      <div className="flex items-center gap-1 mb-2">
                        {[...Array(5)].map((_, i) => (
                          <span
                            key={i}
                            className={`text-sm ${i < Math.floor(item.product!.rating || 0) ? 'text-yellow-400' : 'text-gray-300'}`}
                          >
                            ★
                          </span>
                        ))}
                        <span className="ml-1 text-xs sm:text-sm text-slate-600">
                          {item.product.rating} ({item.product.reviews || 0})
                        </span>
                      </div>
                    ) : null}

                    {/* Price */}
                    <div className="flex items-baseline flex-wrap gap-x-2 gap-y-1 mb-2">
                      <span className="text-lg sm:text-xl font-bold text-slate-900">
                        {formatPrice(regionalPrice)}
                      </span>
                      {regionalOriginalPrice && regionalOriginalPrice > regionalPrice ? (
                        <span className="text-xs sm:text-sm text-slate-500 line-through">
                          {formatPrice(regionalOriginalPrice)}
                        </span>
                      ) : null}
                    </div>

                    {/* Date Added */}
                    <p className="text-xs text-slate-500 mb-3 sm:mb-4">
                      Added on {new Date(item.createdAt).toLocaleDateString()}
                    </p>

                    {/* Action Buttons — Add to Cart on its own row on mobile, then Share + Remove paired */}
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-3 sm:pt-4 border-t border-slate-200">
                      {item.product.hasVariants ? (
                        <Link href={productHref} className="w-full sm:w-auto">
                          <button className="w-full flex items-center justify-center gap-2 px-3 sm:px-4 py-2 text-sm bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors whitespace-nowrap">
                            <ShoppingCart className="w-4 h-4" />
                            Choose Options
                          </button>
                        </Link>
                      ) : (
                        <button
                          onClick={() => addToCart(item.productId, item.product!.name)}
                          disabled={!inStock}
                          className={`w-full sm:w-auto flex items-center justify-center gap-2 px-3 sm:px-4 py-2 text-sm rounded-lg transition-colors whitespace-nowrap ${inStock
                            ? 'bg-gray-800 text-white hover:bg-gray-900'
                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                        >
                          <ShoppingCart className="w-4 h-4" />
                          {inStock ? 'Add to Cart' : 'Out of Stock'}
                        </button>
                      )}

                      {/* Share + Remove — paired in a row on mobile, then `contents` flattens at sm: so they sit beside Add to Cart on desktop */}
                      <div className="flex gap-2 sm:contents">
                        <button
                          onClick={() => shareProduct(item.productId, item.product!.name)}
                          aria-label="Share product"
                          className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 sm:px-4 py-2 text-sm bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
                        >
                          <Share2 className="w-4 h-4" />
                          <span>Share</span>
                        </button>

                        <button
                          onClick={() => removeFromWishlist(item.productId)}
                          aria-label="Remove from wishlist"
                          className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 sm:px-4 py-2 text-sm bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>Remove</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Wishlist Tips */}
        <div className="mt-6 sm:mt-8 lg:mt-12 bg-white rounded-xl sm:rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-5 lg:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-slate-900 mb-3 sm:mb-4">Wishlist Tips</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5 lg:gap-6">
            <div className="text-center">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Heart className="w-5 h-5 sm:w-6 sm:h-6 text-slate-600" />
              </div>
              <h4 className="font-medium text-slate-900 mb-1 sm:mb-2 text-sm sm:text-base">Save for Later</h4>
              <p className="text-xs sm:text-sm text-slate-600">
                Click the heart icon on any product to save it to your wishlist
              </p>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Share2 className="w-5 h-5 sm:w-6 sm:h-6 text-slate-600" />
              </div>
              <h4 className="font-medium text-slate-900 mb-1 sm:mb-2 text-sm sm:text-base">Share with Friends</h4>
              <p className="text-xs sm:text-sm text-slate-600">
                Share your wishlist with family and friends for gift ideas
              </p>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <ShoppingCart className="w-5 h-5 sm:w-6 sm:h-6 text-slate-600" />
              </div>
              <h4 className="font-medium text-slate-900 mb-1 sm:mb-2 text-sm sm:text-base">Quick Add to Cart</h4>
              <p className="text-xs sm:text-sm text-slate-600">
                Easily move items from your wishlist to your shopping cart
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Wishlist;
