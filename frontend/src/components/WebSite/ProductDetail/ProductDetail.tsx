'use client';

import { useState, useEffect } from 'react';
import Breadcrumb from '../Navigation/Breadcrumb';
import LoadingSpinner from '@/components/UI/LoadingSpinner';
import { productService, Product } from '@/services/productService';
import { cartService } from '@/services/cartService';
import { userAuthService } from '@/services/userAuthService';
import { Star, Heart, Truck, Shield, RotateCcw, Package } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { showSuccessToast, showErrorToast } from '@/lib/toast-utils';
import Image from 'next/image';

interface ProductDetailProps {
  productId: string;
}

const ProductDetail = ({ productId }: ProductDetailProps) => {
  const [product, setProduct] = useState<Product | null>(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState<any>(null);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showAllDetails, setShowAllDetails] = useState(false);
  const [isImageHovered, setIsImageHovered] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [imageRef, setImageRef] = useState<HTMLImageElement | null>(null);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        const response = await productService.getPublicProduct(productId);
        
        if (response.success && response.data) {
          setProduct(response.data);
          // Set first variant as default if product has variants
          if (response.data.hasVariants && response.data.variants && response.data.variants.length > 0) {
            setSelectedVariant(response.data.variants[0]);
          }
        }
      } catch (error) {
        console.error('Failed to fetch product:', error);
        showErrorToast('Error', 'Failed to load product details');
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [productId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Product Not Found</h1>
          <p className="text-gray-600 mb-8">The product you're looking for doesn't exist or is no longer available.</p>
          <a href="/products" className="bg-amber-600 text-white px-6 py-3 rounded-lg hover:bg-amber-700 transition-colors">
            Back to Products
          </a>
        </div>
      </div>
    );
  }

  // Get images - use variant images if variant is selected, otherwise use product images
  const displayImages = selectedVariant?.images && selectedVariant.images.length > 0
    ? selectedVariant.images.map((url: string) => ({ url, isPrimary: false }))
    : product.images || [];

  const breadcrumbItems = [
    { label: 'Home', href: '/' },
    { label: 'Products', href: '/products' },
    { label: product.category, href: `/products?category=${encodeURIComponent(product.category)}` },
    { label: product.name, href: '#', current: true }
  ];

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
    
    try {
      // Add to cart via API
      await cartService.addToCart(product.id, quantity);
      
      const variantInfo = selectedVariant ? ` (${selectedVariant.size} - ${selectedVariant.color})` : '';
      
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

  // Handle quantity increment
  const handleIncrement = () => {
    setQuantity(prev => prev + 1);
  };

  // Handle quantity decrement
  const handleDecrement = () => {
    if (quantity > 1) {
      setQuantity(prev => prev - 1);
    }
  };

  const handleBuyNow = () => {
    if (!product) return;
    
    try {
      const variantInfo = selectedVariant ? ` (${selectedVariant.size} - ${selectedVariant.color})` : '';
      console.log(`Buy now ${product.name}${variantInfo}`);
      
      showSuccessToast(
        'Proceeding to Checkout', 
        `Taking you to checkout with ${product.name}${variantInfo}.`
      );
      
      // Redirect to checkout page
      // window.location.href = '/checkout';
    } catch (error) {
      showErrorToast('Checkout Failed', 'Unable to proceed to checkout. Please try again.');
    }
  };

  const handleWishlistToggle = () => {
    if (!product) return;
    
    try {
      setIsWishlisted(!isWishlisted);
      
      if (!isWishlisted) {
        showSuccessToast(
          'Added to Wishlist!', 
          `${product.name} has been saved to your wishlist.`
        );
      } else {
        showSuccessToast(
          'Removed from Wishlist', 
          `${product.name} has been removed from your wishlist.`
        );
      }
    } catch (error) {
      showErrorToast('Wishlist Error', 'Unable to update wishlist. Please try again.');
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-5 h-5 ${
          i < Math.floor(rating) 
            ? 'text-yellow-400 fill-current' 
            : i < rating 
            ? 'text-yellow-400 fill-current opacity-50' 
            : 'text-gray-300'
        }`}
      />
    ));
  };

  // Get current price based on selected variant or admin fixed price or base price
  const currentPrice = selectedVariant?.price || product.adminFixedPrice || product.basePrice;
  const originalPrice = product.originalPrice;

  // Get current image URL
  const currentImageUrl = displayImages[selectedImage]?.url;

  return (
    <>
      {/* Breadcrumb */}
      <div className="bg-white">
        <div className="max-w-7xl xl:max-w-420 mx-auto px-4 sm:px-6 lg:px-8 xl:px-0 py-4">
          <Breadcrumb items={breadcrumbItems} />
        </div>
      </div>

      <div className="bg-gray-50 min-h-screen font-sans">
        {/* Custom styles for image magnification */}
        <style jsx>{`
          .product-info-container {
            position: relative;
            min-height: 600px;
          }
          
          /* Smooth transitions for image switching */
          .magnify-image {
            animation: fadeIn 0.3s ease-in-out;
          }
          
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
        `}</style>
        
        <div className="max-w-360 mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-2xl overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
              {/* Product Images */}
              <div className="p-8 lg:p-12 bg-linear-to-br from-gray-50 to-white">
                <div className="sticky top-8">
                  {/* Main Image with Custom Magnification */}
                  <div 
                    className="aspect-square bg-white rounded-xl overflow-hidden mb-6 border border-gray-100 relative cursor-crosshair"
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
                        className="object-cover transition-opacity duration-300"
                        style={{ opacity: isImageHovered ? 0.8 : 1 }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-100">
                        <Package className="w-24 h-24 text-gray-400" />
                      </div>
                    )}
                    
                    {/* Lens overlay */}
                    {isImageHovered && currentImageUrl && (
                      <div
                        className="absolute w-24 h-24 border-2 border-blue-500 bg-transparent bg-opacity-30 pointer-events-none rounded-lg"
                        style={{
                          left: `${mousePosition.x}%`,
                          top: `${mousePosition.y}%`,
                          transform: 'translate(-50%, -50%)',
                        }}
                      />
                    )}
                  </div>
                  
                  {/* Image Thumbnails with Enhanced Hover */}
                  {displayImages.length > 1 && (
                    <div className="flex space-x-4 justify-center">
                      {displayImages.map((image: any, index: number) => (
                        <button
                          key={index}
                          onClick={() => setSelectedImage(index)}
                          onMouseEnter={() => setSelectedImage(index)}
                          className={`w-20 h-20 rounded-2xl overflow-hidden border-2 transition-all duration-300 transform hover:scale-105 ${
                            selectedImage === index 
                              ? 'border-blue-500 ring-4 ring-blue-200 shadow-lg' 
                              : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
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
                              <Package className="w-8 h-8 text-gray-400" />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Product Info - Shows magnified image when hovering */}
              <div className="product-info-container relative p-8 lg:p-12">
                {/* Magnified Image Overlay - Shows when image is hovered */}
                {isImageHovered && currentImageUrl ? (
                  <div className="w-full h-full flex items-center justify-center bg-white rounded-r-2xl">
                    <div className="w-full max-w-lxl h-160 bg-white rounded-xl border-2 border-gray-200 shadow-2xl overflow-hidden">
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
                ) : (
                  /* Normal Product Info Content */
                  <div className="space-y-8">
                  {/* Header Section */}
                  <div className="border-b border-gray-100 pb-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-3 leading-tight">{product.name}</h1>
                      </div>
                      <button 
                        onClick={handleWishlistToggle}
                        className="p-3 rounded-full bg-gray-50 hover:bg-gray-100 transition-colors"
                      >
                        <Heart className={`w-6 h-6 ${isWishlisted ? 'fill-current text-gray-500' : 'text-gray-400'}`} />
                      </button>
                    </div>

                    {/* Rating */}
                    <div className="flex items-center space-x-4 mb-6">
                      <div className="flex items-center space-x-1">
                        {renderStars(product.rating || 0)}
                      </div>
                      <span className="text-sm text-gray-600 font-medium">
                        {product.rating || 0} ({product.reviews || 0} reviews)
                      </span>
                      {product.reviews && product.reviews > 0 && (
                        <span className="text-sm text-blue-600 hover:text-blue-800 cursor-pointer font-medium">
                          See all reviews
                        </span>
                      )}
                    </div>

                    {/* Price */}
                    <div className="bg-[#fdfdfd] rounded-2xl shadow-md p-6">
                      <div className="flex items-baseline space-x-3 mb-2">
                        <span className="text-4xl font-bold text-gray-900">${currentPrice?.toFixed(2)}</span>
                        {originalPrice && originalPrice > currentPrice && (
                          <>
                            <span className="text-xl text-gray-500 line-through">${originalPrice.toFixed(2)}</span>
                            <span className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm font-semibold">
                              Save ${(originalPrice - currentPrice).toFixed(2)}
                            </span>
                          </>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">Price includes all taxes</p>
                      {product.minimumOrderQuantity && product.minimumOrderQuantity > 1 && (
                        <p className="text-sm text-amber-600 mt-2">
                          Minimum order: {product.minimumOrderQuantity} units
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Variants and Purchase Options */}
                  <div className="space-y-4">
                    {/* Variants Section */}
                    {product.hasVariants && product.variants && product.variants.length > 0 && (
                      <div className="max-w-md">
                        <h3 className="text-lg font-semibold text-gray-900 mb-3">
                          Select Variant: {selectedVariant ? `${selectedVariant.size} - ${selectedVariant.color}` : 'Choose one'}
                        </h3>
                        <div className="grid grid-cols-2 gap-2">
                          {product.variants.map((variant) => (
                            <button
                              key={variant.id}
                              onClick={() => {
                                setSelectedVariant(variant);
                                setSelectedImage(0); // Reset to first image when variant changes
                              }}
                              className={`p-3 border-2 rounded-lg transition-all duration-300 text-left transform hover:scale-105 ${
                                selectedVariant?.id === variant.id
                                  ? 'border-blue-500 shadow-lg ring-2 ring-blue-200'
                                  : 'border-gray-200 hover:border-gray-300 hover:shadow-md bg-white'
                              }`}
                            >
                              <div>
                                <div className="font-semibold text-gray-900 text-sm">{variant.size}</div>
                                <div className="flex items-center space-x-2 mt-1">
                                  {variant.colorHex && (
                                    <div 
                                      className="w-4 h-4 rounded-full border border-gray-300"
                                      style={{ backgroundColor: variant.colorHex }}
                                    />
                                  )}
                                  <span className="text-xs text-gray-600">{variant.color}</span>
                                </div>
                                <div className="text-lg font-bold text-gray-900 mt-1">${variant.price.toFixed(2)}</div>
                                <div className="text-xs text-gray-500">
                                  {variant.stock > 0 ? `${variant.stock} in stock` : 'Out of stock'}
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Purchase Panel - Full Width to Match Price Section */}
                    <div className="bg-linear-to-br from-gray-50 to-white p-4 rounded-xl shadow-lg border border-gray-100">
                      {/* Stock Status */}
                      <div className="mb-3">
                        {product.inStock && (!selectedVariant || selectedVariant.stock > 0) ? (
                          <div className="flex items-center space-x-2">
                            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                            <span className="text-green-600 font-bold text-base">In stock</span>
                            {selectedVariant && (
                              <span className="text-gray-600 text-sm">({selectedVariant.stock} available)</span>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2">
                            <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
                            <span className="text-gray-600 font-bold text-base">Out of Stock</span>
                          </div>
                        )}
                      </div>

                      {/* Dispatch Timeline */}
                      {product.dispatchTimeline && (
                        <div className="bg-blue-50 p-2 rounded-lg mb-3">
                          <div className="text-xs text-gray-700">
                            <span className="font-semibold">Dispatch: </span>
                            {product.dispatchTimeline.processingDays} days processing + {product.dispatchTimeline.shippingDays} days shipping
                            <span className="text-blue-600 font-semibold ml-1">
                              (Total: {product.dispatchTimeline.totalDays} days)
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Action Buttons */}
                      {product.inStock && (!selectedVariant || selectedVariant.stock > 0) && (
                        <>
                          {/* Quantity Selector */}
                          <div className="flex items-center justify-center gap-3 mb-3">
                            <span className="text-sm font-semibold text-gray-700">Quantity:</span>
                            <button
                              onClick={handleDecrement}
                              disabled={quantity <= 1}
                              className="w-10 h-10 flex items-center justify-center border-2 border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              <span className="text-xl font-semibold">−</span>
                            </button>
                            <span className="w-16 text-center font-bold text-lg">{quantity}</span>
                            <button
                              onClick={handleIncrement}
                              className="w-10 h-10 flex items-center justify-center border-2 border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
                            >
                              <span className="text-xl font-semibold">+</span>
                            </button>
                          </div>
                          
                          <div className="flex space-x-2">
                            <button
                              onClick={handleAddToCart}
                              disabled={product.hasVariants && !selectedVariant}
                              className="flex-1 bg-white text-black border-2 border-gray-700 py-2.5 px-3 rounded-lg hover:bg-gray-700 hover:text-white transition-all duration-300 font-semibold text-sm shadow-lg transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Add to cart
                            </button>
                            <button
                              onClick={handleBuyNow}
                              disabled={product.hasVariants && !selectedVariant}
                              className="flex-1 bg-[#1d1d1d] text-white py-2.5 px-3 rounded-lg hover:from-orange-600 hover:to-gray-600 transition-all duration-300 font-semibold text-sm shadow-lg transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Buy Now
                            </button>
                          </div>
                        </>
                      )}
                      {product.hasVariants && !selectedVariant && (
                        <p className="text-xs text-amber-600 mt-2 text-center">Please select a variant</p>
                      )}
                    </div>
                  </div>
                </div>
                )}
              </div>
            </div>
          </div>

          {/* Product Details Section */}
          <div className="mt-12 bg-white rounded-2xl shadow-lg p-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">Product details</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-4">
                {/* Always show available details */}
                {product.category && (
                  <div className="flex justify-between py-3 border-b border-gray-100">
                    <span className="font-semibold text-gray-700">Category</span>
                    <span className="text-gray-600">{product.category}</span>
                  </div>
                )}
                {product.subCategory && (
                  <div className="flex justify-between py-3 border-b border-gray-100">
                    <span className="font-semibold text-gray-700">Sub Category</span>
                    <span className="text-gray-600">{product.subCategory}</span>
                  </div>
                )}
                {product.material && (
                  <div className="flex justify-between py-3 border-b border-gray-100">
                    <span className="font-semibold text-gray-700">Material</span>
                    <span className="text-gray-600">{product.material}</span>
                  </div>
                )}
                {product.fabricType && (
                  <div className="flex justify-between py-3 border-b border-gray-100">
                    <span className="font-semibold text-gray-700">Fabric Type</span>
                    <span className="text-gray-600">{product.fabricType}</span>
                  </div>
                )}
                {product.dimensions && (
                  <div className="flex justify-between py-3 border-b border-gray-100">
                    <span className="font-semibold text-gray-700">Dimensions</span>
                    <span className="text-gray-600">{product.dimensions}</span>
                  </div>
                )}
                {product.weight && (
                  <div className="flex justify-between py-3 border-b border-gray-100">
                    <span className="font-semibold text-gray-700">Weight</span>
                    <span className="text-gray-600">{product.weight}</span>
                  </div>
                )}
                
                {/* Show additional details only when expanded */}
                {showAllDetails && (
                  <>
                    {product.hasVariants && (
                      <div className="flex justify-between py-3 border-b border-gray-100">
                        <span className="font-semibold text-gray-700">Available Variants</span>
                        <span className="text-gray-600">{product.variants?.length || 0}</span>
                      </div>
                    )}
                    {product.bulkPricingEnabled && (
                      <div className="flex justify-between py-3 border-b border-gray-100">
                        <span className="font-semibold text-gray-700">Bulk Pricing</span>
                        <span className="text-green-600 font-semibold">Available</span>
                      </div>
                    )}
                    {product.minimumOrderQuantity && (
                      <div className="flex justify-between py-3 border-b border-gray-100">
                        <span className="font-semibold text-gray-700">Min Order Quantity</span>
                        <span className="text-gray-600">{product.minimumOrderQuantity} units</span>
                      </div>
                    )}
                    {product.maximumOrderQuantity && (
                      <div className="flex justify-between py-3 border-b border-gray-100">
                        <span className="font-semibold text-gray-700">Max Order Quantity</span>
                        <span className="text-gray-600">{product.maximumOrderQuantity} units</span>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div>
                {/* About this item */}
                <h4 className="text-xl font-bold text-gray-900 mb-4">About this item</h4>
                <div className="prose prose-sm text-gray-600">
                  <p>{product.description}</p>
                </div>
                
                {/* Tags */}
                {product.tags && product.tags.length > 0 && (
                  <div className="mt-4">
                    <h5 className="text-sm font-semibold text-gray-700 mb-2">Tags:</h5>
                    <div className="flex flex-wrap gap-2">
                      {product.tags.map((tag, index) => (
                        <span 
                          key={index}
                          className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-xs font-medium"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Fabric Specifications */}
                {product.fabricSpecifications && typeof product.fabricSpecifications === 'object' && (
                  <div className="mt-4">
                    <h5 className="text-sm font-semibold text-gray-700 mb-2">Fabric Specifications:</h5>
                    <ul className="space-y-2">
                      {Object.entries(product.fabricSpecifications).map(([key, value]) => (
                        <li key={key} className="flex items-start">
                          <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 shrink-0"></span>
                          <span className="text-gray-600 text-sm">
                            <span className="font-medium capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}:</span> {Array.isArray(value) ? value.join(', ') : String(value)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
            
            {/* See Less/More Toggle */}
            <div className="mt-6">
              <button 
                onClick={() => setShowAllDetails(!showAllDetails)}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center"
              >
                <span className="mr-1">{showAllDetails ? '▲' : '▼'}</span>
                {showAllDetails ? 'See less' : 'See more'}
              </button>
            </div>
          </div>

          {/* Care Instructions */}
          {product.fabricSpecifications && 
           typeof product.fabricSpecifications === 'object' && 
           'careInstructions' in product.fabricSpecifications &&
           Array.isArray((product.fabricSpecifications as any).careInstructions) &&
           (product.fabricSpecifications as any).careInstructions.length > 0 && (
            <div className="mt-8 bg-white rounded-2xl shadow-lg p-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">Care Instructions</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(product.fabricSpecifications as any).careInstructions.map((instruction: string, index: number) => (
                  <div key={index} className="flex items-start space-x-3 p-4 bg-gray-50 rounded-xl">
                    <span className="w-6 h-6 bg-gray-700 text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                      {index + 1}
                    </span>
                    <span className="text-gray-700">{instruction}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Features */}
          <div className="mt-8 bg-white rounded-2xl shadow-lg p-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">Why choose this product?</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex items-center space-x-4 p-4 bg-green-50 rounded-xl">
                <Truck className="w-8 h-8 text-green-600" />
                <div>
                  <h4 className="font-semibold text-gray-900">Fast Dispatch</h4>
                  <p className="text-sm text-gray-600">
                    {product.dispatchTimeline 
                      ? `Ships in ${product.dispatchTimeline.totalDays} days`
                      : 'Quick delivery'}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-4 p-4 bg-blue-50 rounded-xl">
                <Shield className="w-8 h-8 text-blue-600" />
                <div>
                  <h4 className="font-semibold text-gray-900">Quality Guarantee</h4>
                  <p className="text-sm text-gray-600">Premium materials and craftsmanship</p>
                </div>
              </div>
              <div className="flex items-center space-x-4 p-4 bg-purple-50 rounded-xl">
                <RotateCcw className="w-8 h-8 text-purple-600" />
                <div>
                  <h4 className="font-semibold text-gray-900">30-Day Returns</h4>
                  <p className="text-sm text-gray-600">Easy returns and exchanges</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ProductDetail;
