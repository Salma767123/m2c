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
  // Type guard to check if it's a ServiceProduct
  const isServiceProduct = (p: any): p is ServiceProduct => {
    return 'vendorId' in p && 'createdAt' in p;
  };

  // Get the primary image or first image
  let primaryImage: string | undefined;
  
  if (isServiceProduct(product)) {
    // Service product with ProductImage[] structure
    primaryImage = product.images?.find(img => img.isPrimary)?.url || 
                   product.images?.[0]?.url;
  } else {
    // Mock product with string[] structure
    primaryImage = product.images?.[0];
  }

  // Get price - handle both basePrice and price
  const displayPrice = isServiceProduct(product) ? product.basePrice : product.price;

  return (
    <Link href={`/products/${product.id}`} className="block h-full">
      <div className="bg-white font-sans rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300 h-full flex flex-col cursor-pointer">
        <div className="relative h-45 sm:h-75 w-full overflow-hidden shrink-0 bg-gradient-to-br from-gray-100 to-gray-200">
          {primaryImage ? (
            <Image
              src={primaryImage}
              alt={product.name}
              fill
              className="object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package className="w-16 h-16 text-gray-400" />
            </div>
          )}
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
