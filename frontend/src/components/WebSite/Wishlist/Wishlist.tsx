'use client';

import { useState, useEffect } from 'react';
import { Heart, ShoppingCart, Share2, Trash2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { showSuccessToast, showErrorToast } from '@/lib/toast-utils';
import { wishlistService, WishlistItem } from '@/services/wishlistService';
import { cartService } from '@/services/cartService';
import { userAuthService } from '@/services/userAuthService';
import Image from 'next/image';

const Wishlist = () => {
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const authStatus = userAuthService.isAuthenticated();
    setIsAuthenticated(authStatus);
    
    if (!authStatus) {
      // Not authenticated - redirect to login
      showErrorToast('Login Required', 'Please login to view your wishlist');
      setTimeout(() => {
        window.location.href = '/login';
      }, 1500);
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
    } catch (error: any) {
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
    } catch (error: any) {
      console.error('Error removing from wishlist:', error);
      showErrorToast('Failed', 'Unable to remove item from wishlist');
    }
  };

  const addToCart = async (productId: string, productName: string) => {
    try {
      await cartService.addToCart(productId, 1);
      showSuccessToast('Added to Cart!', `${productName} has been added to your cart.`);
    } catch (error: any) {
      console.error('Error adding to cart:', error);
      showErrorToast('Failed to Add', 'Unable to add item to cart. Please try again.');
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
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading wishlist...</p>
        </div>
      </div>
    );
  }

  if (wishlistItems.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
          <div className="text-gray-400 mb-6">
            <Heart className="w-24 h-24 mx-auto" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Your Wishlist is Empty</h1>
          <p className="text-gray-600 mb-8">
            Save items you love to your wishlist and never lose track of them.
          </p>
          <Link
            href="/products"
            className="bg-gray-800 text-white px-8 py-3 rounded-lg hover:bg-gray-900 transition-colors font-semibold inline-flex items-center"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Start Shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className='bg-white font-sans'>
      {/* Hero Section */}
      <section className="relative py-42" style={{ backgroundImage: 'url(/assets/images/categories/cb7.png)', backgroundSize: 'cover', backgroundPosition: 'center' }}>
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl lg:text-5xl font-bold text-white mb-4">
              My Wishlist
            </h1>
            <p className="text-xl text-white/90">
              Your saved items ({wishlistItems.length})
            </p>
          </div>
        </div>
      </section>

      <div className="max-w-420 mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Wishlist Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              Saved Items
            </h2>
            <p className="text-gray-600">
              Items you've saved for later
            </p>
          </div>
          
          <div className="flex space-x-4 mt-4 sm:mt-0">
            <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              Share Wishlist
            </button>
            <Link
              href="/products"
              className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors"
            >
              Continue Shopping
            </Link>
          </div>
        </div>

        {/* Wishlist Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {wishlistItems.map((item) => {
            if (!item.product) return null;
            
            return (
              <div key={item.id} className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                {/* Product Image */}
                <div className="relative h-64">
                  <Image
                    src={item.product.image || '/placeholder.png'}
                    alt={item.product.name}
                    fill
                    className="object-cover"
                  />
                  {item.product.discount && (
                    <div className="absolute top-2 left-2 bg-gray-800 text-white px-2 py-1 rounded text-sm font-semibold">
                      {item.product.discount}% OFF
                    </div>
                  )}
                  {!item.product.inStock && (
                    <div className="absolute top-2 right-2 bg-gray-500 text-white px-2 py-1 rounded text-sm">
                      Out of Stock
                    </div>
                  )}
                  
                  {/* Remove from Wishlist */}
                  <button
                    onClick={() => removeFromWishlist(item.productId)}
                    className="absolute top-2 right-2 p-2 bg-white rounded-full shadow-md hover:bg-gray-50 transition-colors"
                  >
                    <Heart className="w-5 h-5 text-red-500 fill-current" />
                  </button>
                </div>

                {/* Product Info */}
                <div className="p-4">
                  <div className="mb-2">
                    <span className="text-sm text-gray-600 font-medium">{item.product.category}</span>
                  </div>
                  
                  <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                    <Link href={`/products/${item.productId}`} className="hover:text-gray-600 transition-colors">
                      {item.product.name}
                    </Link>
                  </h3>
                  
                  {/* Rating */}
                  {item.product.rating && (
                    <div className="flex items-center mb-2">
                      <div className="flex items-center">
                        {[...Array(5)].map((_, i) => (
                          <span
                            key={i}
                            className={`text-sm ${
                              i < Math.floor(item.product!.rating || 0) ? 'text-yellow-400' : 'text-gray-300'
                            }`}
                          >
                            ★
                          </span>
                        ))}
                        <span className="ml-2 text-sm text-gray-600">
                          {item.product.rating} ({item.product.reviews || 0})
                        </span>
                      </div>
                    </div>
                  )}
                  
                  {/* Price */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <span className="text-xl font-bold text-gray-900">
                        ${item.product.basePrice.toFixed(2)}
                      </span>
                      {item.product.originalPrice && (
                        <span className="text-sm text-gray-500 line-through">
                          ${item.product.originalPrice.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Date Added */}
                  <p className="text-xs text-gray-500 mb-3">
                    Added on {new Date(item.createdAt).toLocaleDateString()}
                  </p>
                  
                  {/* Action Buttons */}
                  <div className="flex space-x-2">
                    <button
                      onClick={() => addToCart(item.productId, item.product!.name)}
                      disabled={!item.product.inStock}
                      className={`flex-1 py-2 px-3 rounded text-sm font-medium transition-colors ${
                        item.product.inStock
                          ? 'bg-gray-800 text-white hover:bg-gray-900'
                          : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      <ShoppingCart className="w-4 h-4 inline mr-1" />
                      {item.product.inStock ? 'Add to Cart' : 'Out of Stock'}
                    </button>
                    
                    <button
                      onClick={() => shareProduct(item.productId, item.product!.name)}
                      className="p-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                    >
                      <Share2 className="w-4 h-4 text-gray-600" />
                    </button>
                    
                    <button
                      onClick={() => removeFromWishlist(item.productId)}
                      className="p-2 border border-gray-300 rounded hover:bg-gray-50 hover:border-gray-300 transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-gray-600 hover:text-gray-600" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Wishlist Tips */}
        <div className="mt-12 bg-white rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Wishlist Tips</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Heart className="w-6 h-6 text-gray-600" />
              </div>
              <h4 className="font-medium text-gray-900 mb-2">Save for Later</h4>
              <p className="text-sm text-gray-600">
                Click the heart icon on any product to save it to your wishlist
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Share2 className="w-6 h-6 text-gray-600" />
              </div>
              <h4 className="font-medium text-gray-900 mb-2">Share with Friends</h4>
              <p className="text-sm text-gray-600">
                Share your wishlist with family and friends for gift ideas
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <ShoppingCart className="w-6 h-6 text-gray-600" />
              </div>
              <h4 className="font-medium text-gray-900 mb-2">Quick Add to Cart</h4>
              <p className="text-sm text-gray-600">
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
