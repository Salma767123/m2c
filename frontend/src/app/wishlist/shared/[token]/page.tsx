'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/WebSite/Header/Header';
import Footer from '@/components/WebSite/Footer/Footer';
import Breadcrumb from '@/components/WebSite/Navigation/Breadcrumb';
import { wishlistService, WishlistItem } from '@/services/wishlistService';
import { Heart, ShoppingCart, Star } from 'lucide-react';

export default function SharedWishlistPage() {
  const params = useParams();
  const token = params.token as string;
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [ownerName, setOwnerName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchSharedWishlist = async () => {
      try {
        setIsLoading(true);
        const data = await wishlistService.getSharedWishlist(token);
        setItems(data.items);
        setOwnerName(data.ownerName);
      } catch (err: any) {
        setError(err.message || 'Wishlist not found');
      } finally {
        setIsLoading(false);
      }
    };

    if (token) fetchSharedWishlist();
  }, [token]);

  const breadcrumbItems = [
    { label: 'Wishlist', href: '/wishlist' },
    { label: `${ownerName}'s Wishlist` }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <Breadcrumb items={breadcrumbItems} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {isLoading ? (
          <div className="text-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-800 mx-auto" />
            <p className="mt-4 text-gray-500">Loading wishlist...</p>
          </div>
        ) : error ? (
          <div className="text-center py-16">
            <Heart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Wishlist Not Found</h2>
            <p className="text-gray-600 mb-6">This wishlist link may have expired or doesn't exist.</p>
            <Link href="/products" className="px-6 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors">
              Browse Products
            </Link>
          </div>
        ) : (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
              <div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-1">
                  {ownerName}&apos;s Wishlist
                </h2>
                <p className="text-gray-600">{items.length} item{items.length !== 1 ? 's' : ''} saved</p>
              </div>
              <Link
                href="/products"
                className="mt-4 sm:mt-0 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors inline-block"
              >
                Browse Products
              </Link>
            </div>

            {items.length === 0 ? (
              <div className="text-center py-16">
                <Heart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-gray-700">This wishlist is empty</h3>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {items.map((item) => {
                  if (!item.product) return null;
                  const product = item.product;

                  return (
                    <div key={item.id} className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow flex flex-col h-full">
                      <Link href={`/products/${product.slug || product.id}`}>
                        <div className="relative h-64">
                          <img
                            src={product.image || '/assets/images/placeholder.jpg'}
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                          {product.discount && product.discount > 0 && (
                            <span className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">
                              {product.discount}% OFF
                            </span>
                          )}
                          {!product.inStock && (
                            <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
                              <span className="bg-white text-gray-800 px-3 py-1 rounded text-sm font-medium">Out of Stock</span>
                            </div>
                          )}
                        </div>
                      </Link>

                      <div className="p-4 flex flex-col flex-1">
                        <div className="flex-1">
                          <Link href={`/products/${product.slug || product.id}`}>
                            <h3 className="font-medium text-gray-900 mb-1 line-clamp-2 hover:text-gray-700">{product.name}</h3>
                          </Link>
                          <p className="text-xs text-gray-500 mb-2">{product.category}</p>

                          {product.rating && product.rating > 0 && (
                            <div className="flex items-center gap-1 mb-2">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star key={i} className={`w-3 h-3 ${i < Math.floor(product.rating!) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} />
                              ))}
                              {product.reviews !== undefined && <span className="text-xs text-gray-500 ml-1">({product.reviews})</span>}
                            </div>
                          )}

                          <div className="flex items-center gap-2">
                            <span className="text-lg font-bold text-gray-900">
                              ${(product.adminFixedPrice ?? product.basePrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                            {product.originalPrice && product.originalPrice > (product.adminFixedPrice ?? product.basePrice) && (
                              <span className="text-sm text-gray-400 line-through">
                                ${product.originalPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            )}
                          </div>
                        </div>

                        <Link
                          href={`/products/${product.slug || product.id}`}
                          className="mt-3 w-full py-2 px-3 rounded-lg text-sm font-medium bg-gray-800 text-white hover:bg-gray-900 transition-colors text-center flex items-center justify-center gap-1.5"
                        >
                          <ShoppingCart className="w-4 h-4" />
                          View Product
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      <Footer />
    </div>
  );
}
