"use client"

import { Heart, ShoppingCart, Trash2, Star, Eye } from 'lucide-react'
import { products } from '@/components/mockData/products'

interface WishlistItem {
  id: string
  name: string
  price: number
  originalPrice?: number
  image: string
  rating: number
  reviews: number
  inStock: boolean
  category: string
  addedDate: string
}

export default function Wishlist() {
  const wishlistItems: WishlistItem[] = products.map((product) => ({
    id: product.id,
    name: product.name,
    price: product.price,
    originalPrice: product.originalPrice,
    image: product.images[0],
    rating: product.rating,
    reviews: product.reviews,
    inStock: product.inStock,
    category: product.category,
    addedDate: new Date().toISOString().split('T')[0]
  }))

  const removeFromWishlist = (itemId: string) => {
    // Handle remove from wishlist
    console.log('Remove item:', itemId)
  }

  const addToCart = (itemId: string) => {
    // Handle add to cart
    console.log('Add to cart:', itemId)
  }

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, index) => (
      <Star
        key={index}
        className={`w-4 h-4 ${
          index < Math.floor(rating)
            ? 'text-yellow-400 fill-current'
            : 'text-slate-300'
        }`}
      />
    ))
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-5 lg:p-6">
      <div className="flex items-center flex-wrap gap-2 sm:gap-3 mb-5 sm:mb-6">
        <Heart className="w-5 h-5 sm:w-6 sm:h-6 text-red-500 fill-current shrink-0" />
        <h2 className="text-lg sm:text-xl font-bold text-slate-900">My Wishlist</h2>
        <span className="bg-gray-100 text-gray-800 text-xs sm:text-sm font-medium px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full">
          {wishlistItems.length} items
        </span>
      </div>

      {wishlistItems.length === 0 ? (
        <div className="text-center py-10 sm:py-12">
          <Heart className="w-14 h-14 sm:w-16 sm:h-16 text-slate-300 mx-auto mb-3 sm:mb-4" />
          <h3 className="text-base sm:text-lg font-semibold text-slate-900 mb-2">Your wishlist is empty</h3>
          <p className="text-sm sm:text-base text-slate-600 mb-5 sm:mb-6">Save items you love to your wishlist</p>
          <button className="bg-blue-600 text-white px-5 sm:px-6 py-2.5 sm:py-3 rounded-lg hover:bg-blue-700 transition-colors text-sm sm:text-base">
            Start Shopping
          </button>
        </div>
      ) : (
        /* Order-page style list — image left, content right */
        <div className="space-y-3 sm:space-y-4">
          {wishlistItems.map((item) => (
            <div key={item.id} className="bg-white border border-slate-200 rounded-xl p-3 sm:p-4 lg:p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3 sm:gap-4">
                {/* Image */}
                <div className="relative w-20 h-20 sm:w-24 sm:h-24 lg:w-28 lg:h-28 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                  {item.originalPrice && (
                    <div className="absolute top-1 left-1 bg-gray-700 text-white px-1.5 py-0.5 rounded text-[10px] sm:text-xs font-semibold">
                      Sale
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  {/* Out of stock badge */}
                  {!item.inStock && (
                    <div className="flex items-center gap-1.5 mb-2 px-2.5 py-1 bg-red-50 rounded-lg w-fit">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                      <span className="text-xs font-semibold text-red-600">Out of Stock</span>
                    </div>
                  )}

                  <span className="inline-block text-xs text-slate-500 bg-slate-100 px-2 py-0.5 sm:py-1 rounded-full mb-1.5">
                    {item.category}
                  </span>
                  <h3 className="font-semibold text-slate-900 mb-2 text-sm sm:text-base break-words">{item.name}</h3>

                  {/* Rating */}
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex items-center gap-0.5">
                      {renderStars(item.rating)}
                    </div>
                    <span className="text-xs sm:text-sm text-slate-600">
                      {item.rating} ({item.reviews})
                    </span>
                  </div>

                  {/* Price */}
                  <div className="flex items-baseline flex-wrap gap-x-2 gap-y-1 mb-2">
                    <span className="text-lg sm:text-xl font-bold text-slate-900">${item.price}</span>
                    {item.originalPrice && (
                      <span className="text-xs sm:text-sm text-slate-500 line-through">${item.originalPrice}</span>
                    )}
                  </div>

                  {/* Added Date */}
                  <p className="text-xs text-slate-500 mb-3">
                    Added on {new Date(item.addedDate).toLocaleDateString()}
                  </p>

                  {/* Actions — Add to Cart on its own row on mobile, then View + Remove paired */}
                  <div className="flex flex-col sm:flex-row gap-2 pt-3 border-t border-slate-100">
                    <button
                      onClick={() => addToCart(item.id)}
                      disabled={!item.inStock}
                      className={`w-full sm:w-auto flex items-center justify-center gap-2 px-3 sm:px-4 py-2 text-sm rounded-lg transition-colors ${item.inStock
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-slate-300 text-slate-500 cursor-not-allowed'}`}
                    >
                      <ShoppingCart className="w-4 h-4" />
                      {item.inStock ? 'Add to Cart' : 'Out of Stock'}
                    </button>
                    <div className="flex gap-2 sm:contents">
                      <button
                        aria-label="View product"
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 sm:px-4 py-2 text-sm bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                        <span>View</span>
                      </button>
                      <button
                        onClick={() => removeFromWishlist(item.id)}
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
          ))}
        </div>
      )}

      {/* Wishlist Actions */}
      {wishlistItems.length > 0 && (
        <div className="mt-6 sm:mt-8 pt-5 sm:pt-6 border-t border-slate-200">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-between items-stretch sm:items-center">
            <div className="text-xs sm:text-sm text-slate-600 text-center sm:text-left">
              {wishlistItems.filter(item => item.inStock).length} of {wishlistItems.length} items in stock
            </div>
            <div className="flex flex-wrap gap-2 sm:gap-3">
              <button className="flex-1 sm:flex-none px-3 sm:px-4 py-2 text-sm bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors">
                Clear Wishlist
              </button>
              <button className="flex-1 sm:flex-none px-3 sm:px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                Add All to Cart
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
