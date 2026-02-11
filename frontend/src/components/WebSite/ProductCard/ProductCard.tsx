'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Product as ServiceProduct } from '@/services/productService';
import { Product as MockProduct } from '@/components/mockData/products';
import { Star, Package } from 'lucide-react';

interface ProductCardProps {
  product: ServiceProduct | MockProduct;
}

const ProductCard = ({ product }: ProductCardProps) => {
  // Type guard to check if it's a ServiceProduct (from API)
  const isServiceProduct = (p: any): p is ServiceProduct => {
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

  return (
    <Link href={`/products/${product.id}`} className="block h-full">
      <div className="bg-white font-sans rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300 h-full flex flex-col cursor-pointer">
        <div className="relative h-45 sm:h-75 w-full overflow-hidden shrink-0 bg-gradient-to-br from-gray-100 to-gray-200">
          <Image
            src={imageUrl}
            alt={product.name}
            width={400}
            height={400}
            className="object-cover"
            unoptimized={!primaryImage} // Don't optimize placeholder SVG
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = placeholderImage;
            }}
          />
          {product.discount && (
            <div className="absolute top-2 left-2 bg-gray-800 text-white px-2 py-1 rounded text-sm font-semibold">
              {product.discount}% OFF
            </div>
          )}
          {!product.inStock && (
            <div className="absolute top-2 right-2 bg-gray-500 text-white px-2 py-1 rounded text-sm">
              Out of Stock
            </div>
          )}
        </div>
        
        <div className="p-4 flex flex-col grow justify-between">
          {/* Top content - flexible */}
          <div className="grow">
            <div className="mb-1">
              <span className="text-xs sm:text-sm text-gray-600 font-medium">{product.category}</span>
            </div>
            
            <h3 className="text-sm sm:text-lg font-semibold text-gray-900 mb-2 line-clamp-2 min-h-10 sm:min-h-12">
              {product.name}
            </h3>
            
            <div className="flex items-center mb-2">
              <div className="flex items-center">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-2 sm:w-4 h-2 sm:h-4 ${
                      i < Math.floor(product.rating || 0) ? 'text-yellow-400 fill-current' : 'text-gray-300'
                    }`}
                  />
                ))}
                <span className="ml-2 text-xs sm:text-sm text-gray-600">
                  {product.rating || 0} ({product.reviews || 0} reviews)
                </span>
              </div>
            </div>
          </div>
          
          {/* Bottom content - fixed at bottom */}
          <div className="shrink-0">
            <div className="flex items-center space-x-2">
              <span className="text-xl font-bold text-gray-900">
                ${displayPrice?.toFixed(2) || '0.00'}
              </span>
              {product.originalPrice && (
                <div className="flex items-center space-x-1 gap-2">
                  <span className="text-xs sm:text-sm text-red-600 line-through">
                    ${product.originalPrice.toFixed(2)}
                  </span>
                  {product.discount && (
                    <span className="hidden sm:flex text-xs bg-[#1A2830] text-white px-2 py-1 rounded-md font-semibold">
                      Save {product.discount}%
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default ProductCard;
