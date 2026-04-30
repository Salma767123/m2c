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
import { formatPrice } from '@/lib/currency';

interface ProductCardProps {
  product: ServiceProduct | PublicProduct | MockProduct;
}

const ProductCard = ({ product }: ProductCardProps) => {
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [isTogglingWishlist, setIsTogglingWishlist] = useState(false);
  const [quantity, setQuantity] = useState(1);

  // Check if user is authenticated
  const isAuthenticated = userAuthService.isAuthenticated();

  // Check if product is in wishlist on mount
  useEffect(() => {
    if (isAuthenticated) {
      // For authenticated users, check via API (can be implemented later)
      setIsInWishlist(false);
    } else {
      // Not authenticated - wishlist status is false
      setIsInWishlist(false);
    }
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

    setIsTogglingWishlist(true);

    try {
      // Toggle via API
      if (isInWishlist) {
        await wishlistService.removeFromWishlist(product.id);
        setIsInWishlist(false);
        showSuccessToast('Removed', `${product.name} removed from wishlist`);
      } else {
        await wishlistService.addToWishlist(product.id);
        setIsInWishlist(true);
        showSuccessToast('Added', `${product.name} added to wishlist`);
      }
    } catch (error: any) {
      console.error('Error toggling wishlist:', error);
      showErrorToast('Failed', error.message || 'Unable to update wishlist');
    } finally {
      setIsTogglingWishlist(false);
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

  // Get price - use adminFixedPrice if available, otherwise basePrice or price
  let displayPrice: number | undefined;

  if (isServiceProduct(product)) {
    // For API products, prioritize adminFixedPrice, then basePrice
    // Use nullish coalescing to handle 0 values correctly
    displayPrice = product.adminFixedPrice !== null && product.adminFixedPrice !== undefined
      ? product.adminFixedPrice
      : product.basePrice;
  } else {
    // For mock products, use price property
    displayPrice = (product as any).price;
  }

  // Derive actual stock — use totalStock, treat negative as 0
  const currentStock = isServiceProduct(product)
    ? Math.max(product.totalStock ?? 0, 0)
    : (product as any).stock ?? 1; // Default to 1 for mock products without stock specified

  const isActuallyInStock = currentStock > 0;

  return (
    <Link href={`/products/${product.id}`} className="block h-full">
      <div className="bg-white font-sans rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300 h-full flex flex-col cursor-pointer">
        <div className="relative h-48 sm:h-64 md:h-72 w-full overflow-hidden shrink-0 bg-linear-to-br from-gray-100 to-gray-200">
          <Image
            src={imageUrl}
            alt={product.name}
            fill
            className="object-cover"
            unoptimized={!primaryImage} // Don't optimize placeholder SVG
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = placeholderImage;
            }}
          />
          {product.discount && (
            <div className="absolute top-2 left-2 bg-gray-800 text-white px-2 py-1 rounded text-xs sm:text-sm font-semibold">
              {product.discount}% OFF
            </div>
          )}

          {/* Wishlist Button */}
          <button
            onClick={handleToggleWishlist}
            disabled={isTogglingWishlist}
            className={`absolute top-2 right-2 p-1.5 sm:p-2 rounded-full transition-all duration-200 ${isInWishlist
              ? 'bg-red-500 text-white hover:bg-red-600'
              : 'bg-white/90 text-gray-700 hover:bg-white hover:text-red-500'
              } disabled:opacity-50 disabled:cursor-not-allowed shadow-md z-10`}
            title={isInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
          >
            <Heart
              className={`w-4 h-4 sm:w-5 sm:h-5 ${isInWishlist ? 'fill-current' : ''}`}
            />
          </button>

          {!isActuallyInStock && (
            <div className="absolute top-2 right-12 sm:right-14 bg-gray-500 text-white px-2 py-1 rounded text-xs sm:text-sm z-0">
              Out of Stock
            </div>
          )}
        </div>

        <div className="p-3 sm:p-4 flex flex-col grow justify-between">
          {/* Top content - flexible */}
          <div className="grow">
            <div className="mb-1">
              <span className="text-xs text-gray-600 font-medium">{product.category}</span>
            </div>

            <h3 className="text-sm sm:text-base md:text-lg font-semibold text-gray-900 mb-2 line-clamp-2 min-h-[2.5rem] sm:min-h-[3rem]">
              {product.name}
            </h3>

            <div className="flex items-center mb-2">
              <div className="flex items-center flex-wrap gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-3 h-3 sm:w-4 sm:h-4 ${i < Math.floor(product.rating || 0) ? 'text-yellow-400 fill-current' : 'text-gray-300'
                      }`}
                  />
                ))}
                <span className="ml-1 text-xs text-gray-600">
                  {product.rating || 0} ({product.reviews || 0})
                </span>
              </div>
            </div>
          </div>

          {/* Bottom content - fixed at bottom */}
          <div className="shrink-0">
            <div className="flex items-center justify-between mb-2 sm:mb-3 flex-wrap gap-1">
              <div className="flex items-center space-x-1 sm:space-x-2">
                <span className="text-lg sm:text-xl font-bold text-gray-900">
                  {formatPrice(displayPrice || 0)}
                </span>
                {product.originalPrice && (
                  <span className="text-xs text-red-600 line-through">
                    {formatPrice(product.originalPrice)}
                  </span>
                )}
              </div>
              {product.discount && (
                <span className="text-xs bg-[#1A2830] text-white px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md font-semibold">
                  {product.discount}% OFF
                </span>
              )}
            </div>

            {/* Quantity Selector */}
            {isActuallyInStock && (
              <div className="flex items-center gap-2 mb-2">
                <button
                  onClick={handleDecrement}
                  disabled={quantity <= 1}
                  className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <span className="text-base sm:text-lg font-semibold">−</span>
                </button>
                <span className="w-8 sm:w-12 text-center font-semibold text-sm sm:text-base">{quantity}</span>
                <button
                  onClick={handleIncrement}
                  className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center border border-gray-300 rounded hover:bg-gray-100 transition-colors"
                >
                  <span className="text-base sm:text-lg font-semibold">+</span>
                </button>
              </div>
            )}

            {/* Add to Cart Button */}
            <button
              onClick={handleAddToCart}
              disabled={!isActuallyInStock || isAddingToCart || (isActuallyInStock && quantity > currentStock)}
              className={`w-full py-2 sm:py-2.5 px-3 sm:px-4 rounded-lg font-semibold text-xs sm:text-sm transition-all duration-200 flex items-center justify-center gap-1 sm:gap-2 ${isActuallyInStock
                ? 'bg-gray-800 text-white hover:bg-gray-900 active:scale-95'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <ShoppingCart className="w-3 h-3 sm:w-4 sm:h-4" />
              {isAddingToCart ? 'Adding...' : isActuallyInStock ? 'Add to Cart' : 'Out of Stock'}
            </button>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default ProductCard;
