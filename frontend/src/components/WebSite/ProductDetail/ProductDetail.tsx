'use client';

import { useState, useEffect } from 'react';
import Breadcrumb from '../Navigation/Breadcrumb';
import LoadingSpinner from '@/components/UI/LoadingSpinner';
import { productService, Product, ProductVariant } from '@/services/productService';
import { cartService } from '@/services/cartService';
import { userAuthService } from '@/services/userAuthService';
import { Star, Heart, Truck, Shield, RotateCcw, Package } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { showSuccessToast, showErrorToast, showWarningToast } from '@/lib/toast-utils';
import { wishlistService } from '@/services/wishlistService';
import { trackProductView } from '@/services/analyticsService';
import reviewService from '@/services/reviewService';
import Image from 'next/image';
import { formatPrice } from '@/lib/currency';
import PromotionalPopup from '@/components/WebSite/PromotionalPopup/PromotionalPopup';

interface ProductDetailProps {
  productSlug: string;
}

const ProductDetail = ({ productSlug }: ProductDetailProps) => {
  const [product, setProduct] = useState<Product | null>(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showAllDetails, setShowAllDetails] = useState(false);
  const [isImageHovered, setIsImageHovered] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [imageRef, setImageRef] = useState<HTMLImageElement | null>(null);
  const [quantity, setQuantity] = useState(1);

  // Reviews
  const [reviews, setReviews] = useState<any[]>([]);
  const [showReviews, setShowReviews] = useState(false);
  const [loadingReviews, setLoadingReviews] = useState(false);

  const fetchReviews = async () => {
    if (reviews.length > 0) { setShowReviews(true); return; }
    setLoadingReviews(true);
    try {
      const res = await reviewService.getProductReviews(product?.id || productSlug);
      if (res.success && res.data) setReviews(res.data);
    } catch { /* ignore */ }
    setLoadingReviews(false);
    setShowReviews(true);
  };

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        const response = await productService.getPublicProduct(productSlug);

        if (response.success && response.data) {
          setProduct(response.data);

          // Track product view for analytics heat map
          let source = 'direct';
          try {
            const ref = typeof document !== 'undefined' ? document.referrer : '';
            if (ref) {
              if (ref.includes('/categories')) source = 'category';
              else if (ref.includes('/search')) source = 'search';
              else if (ref.includes('/products')) source = 'related';
              else {
                try {
                  if (new URL(ref).pathname === '/') source = 'home';
                } catch {/* ignore bad URL */}
              }
            }
          } catch {/* keep default 'direct' */}

          trackProductView({
            productId: response.data.id,
            productName: response.data.name,
            category: response.data.category,
            source,
          });
        }
      } catch (error) {
        console.error('Failed to fetch product:', error);
        showErrorToast('Error', 'Failed to load product details');
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [productSlug]);

  // Check wishlist status after product loads
  useEffect(() => {
    if (!product?.id) return;
    wishlistService.isInWishlist(product.id).then(setIsWishlisted).catch(() => {});
  }, [product?.id]);

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
      await cartService.addToCart(product.id, quantity, selectedVariant?.id);

      const variantInfo = selectedVariant ? ` (${selectedVariant.size} - ${selectedVariant.color})` : 
        (product.singleUnitSize || product.singleUnitColor ? ` (${[product.singleUnitSize, product.singleUnitColor].filter(Boolean).join(' - ')})` : '');

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

  // Handle quantity increment — cap at available stock
  const handleIncrement = () => {
    setQuantity(prev => (prev < availableStock ? prev + 1 : prev));
  };

  // Handle quantity decrement
  const handleDecrement = () => {
    if (quantity > 1) {
      setQuantity(prev => prev - 1);
    }
  };

  // Handle manual quantity input
  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '') {
      setQuantity(0 as any); // temporary empty state while typing
      return;
    }
    const num = parseInt(value, 10);
    if (!isNaN(num) && num >= 0) {
      if (num > availableStock) {
        showWarningToast('Stock Limit', `Only ${availableStock} ${product?.uom || 'pcs'} available in stock`);
        setQuantity(availableStock);
      } else {
        setQuantity(num);
      }
    }
  };

  // On blur, ensure quantity is at least 1
  const handleQuantityBlur = () => {
    if (!quantity || quantity < 1) {
      setQuantity(1);
    }
  };

  const handleBuyNow = () => {
    if (!product) return;

    try {
      const variantInfo = selectedVariant ? ` (${selectedVariant.size} - ${selectedVariant.color})` : 
        (product.singleUnitSize || product.singleUnitColor ? ` (${[product.singleUnitSize, product.singleUnitColor].filter(Boolean).join(' - ')})` : '');
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

  const handleWishlistToggle = async () => {
    if (!product) return;

    const isAuthenticated = userAuthService.isAuthenticated();

    if (!isAuthenticated) {
      showErrorToast('Login Required', 'Please login to add items to your wishlist');
      // Redirect to login page after a short delay
      setTimeout(() => {
        window.location.href = '/login';
      }, 1500);
      return;
    }

    // Optimistic update — UI changes instantly
    const wasWishlisted = isWishlisted;
    setIsWishlisted(!wasWishlisted);

    try {
      if (wasWishlisted) {
        await wishlistService.removeFromWishlist(product.id);
        showSuccessToast('Removed from Wishlist', `${product.name} has been removed from your wishlist.`);
      } else {
        await wishlistService.addToWishlist(product.id);
        showSuccessToast('Added to Wishlist!', `${product.name} has been saved to your wishlist.`);
      }
    } catch (error: any) {
      if (error.message?.includes('already in wishlist')) {
        setIsWishlisted(true);
      } else {
        setIsWishlisted(wasWishlisted);
        showErrorToast('Wishlist Error', 'Unable to update wishlist. Please try again.');
      }
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-5 h-5 ${i < Math.floor(rating)
          ? 'text-yellow-400 fill-current'
          : i < rating
            ? 'text-yellow-400 fill-current opacity-50'
            : 'text-gray-300'
          }`}
      />
    ));
  };

  // Get available stock based on selected variant or base stock
  const availableStock = selectedVariant
    ? selectedVariant.stock
    : (product.inventory?.baseStock ?? product.totalStock ?? 0);

  // Get current price based on selected variant or admin fixed price or base price
  const currentPrice = selectedVariant
    ? (selectedVariant.adminFixedPrice ?? selectedVariant.price)
    : (product.adminFixedPrice ?? product.basePrice);
  const originalPrice = selectedVariant
    ? selectedVariant.originalPrice
    : product.originalPrice;

  // Get current image URL
  const currentImageUrl = displayImages[selectedImage]?.url;

  return (
    <>
      <PromotionalPopup category={product.category} />
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
                          className={`w-20 h-20 rounded-2xl overflow-hidden border-2 transition-all duration-300 transform hover:scale-105 ${selectedImage === index
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
                          className={`p-3 rounded-full transition-colors ${isWishlisted ? 'bg-red-50 hover:bg-red-100' : 'bg-gray-50 hover:bg-gray-100'}`}
                        >
                          <Heart className={`w-6 h-6 ${isWishlisted ? 'fill-current text-red-500' : 'text-gray-400'}`} />
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
                          <button
                            onClick={fetchReviews}
                            className="text-sm text-blue-600 hover:text-blue-800 cursor-pointer font-medium"
                          >
                            {showReviews ? 'Hide reviews' : 'See all reviews'}
                          </button>
                        )}
                      </div>

                      {/* Price */}
                      <div className="bg-[#fdfdfd] rounded-2xl shadow-md p-6">
                        <div className="flex items-baseline space-x-3 mb-2">
                          <span className="text-4xl font-bold text-gray-900">{formatPrice(currentPrice || 0)}</span>
                          {originalPrice && originalPrice > currentPrice && (
                            <>
                              <span className="text-xl text-gray-500 line-through">{formatPrice(originalPrice)}</span>
                              <span className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm font-semibold">
                                Save {formatPrice(originalPrice - currentPrice)}
                              </span>
                            </>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">Price includes all taxes</p>
                      </div>
                    </div>

                    {/* Variants and Purchase Options */}
                    <div className="space-y-4">
                      {/* Variants Section */}
                      {product.hasVariants && product.variants && product.variants.length > 0 && (
                        <div className="max-w-md">
                          <h3 className="text-lg font-semibold text-gray-900 mb-3">
                            Select Variant: {selectedVariant ? `${selectedVariant.size} - ${selectedVariant.color}` : 
                              ([product.singleUnitSize, product.singleUnitColor].filter(Boolean).join(' - ') || 'Base Variant')}
                          </h3>
                          <div className="grid grid-cols-2 gap-2">
                            {/* Default Variant Option */}
                            <button
                              onClick={() => {
                                setSelectedVariant(null);
                                setSelectedImage(0);
                                setQuantity(1);
                              }}
                              className={`p-3 border-2 rounded-lg transition-all duration-300 text-left transform hover:scale-105 ${!selectedVariant
                                ? 'border-blue-500 shadow-lg ring-2 ring-blue-200'
                                : 'border-gray-200 hover:border-gray-300 hover:shadow-md bg-white'
                                }`}
                            >
                              <div className="flex items-start gap-3">
                                {/* Product Main Image Preview */}
                                {product.images && product.images.length > 0 && (
                                  <div className="w-12 h-12 rounded-md overflow-hidden border border-gray-200 shrink-0">
                                    <Image
                                      src={product.images.find(img => img.isPrimary)?.url || product.images[0].url}
                                      alt="Default"
                                      width={48}
                                      height={48}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                )}

                                <div>
                                  <div className="font-semibold text-gray-900 text-sm">
                                    {product.singleUnitSize ? product.singleUnitSize : (product.singleUnitColor ? product.singleUnitColor : 'Base Variant')}
                                  </div>
                                  <div className="flex items-center flex-wrap gap-2 mt-1">
                                    {product.singleUnitColorHex && (
                                      <div
                                        className="w-4 h-4 rounded-full border border-gray-300 shrink-0"
                                        style={{ backgroundColor: product.singleUnitColorHex }}
                                        title={product.singleUnitColor}
                                      />
                                    )}
                                    {product.singleUnitColor && (
                                      <span className="text-xs text-gray-600">{product.singleUnitColor}</span>
                                    )}
                                  </div>
                                  <div className="text-lg font-bold text-gray-900 mt-1">{formatPrice(product.adminFixedPrice ?? product.basePrice)}</div>
                                  {product.originalPrice && product.originalPrice > (product.adminFixedPrice ?? product.basePrice) && (
                                    <span className="text-xs text-gray-400 line-through">{formatPrice(product.originalPrice)}</span>
                                  )}
                                  <div className="text-xs text-gray-500">
                                    {(product.inventory?.baseStock ?? product.totalStock ?? 0) > 0
                                      ? `${product.inventory?.baseStock ?? product.totalStock} in stock`
                                      : 'Out of stock'}
                                  </div>
                                </div>
                              </div>
                            </button>
                            {product.variants.map((variant) => (
                              <button
                                key={variant.id}
                                onClick={() => {
                                  if (selectedVariant?.id === variant.id) {
                                    setSelectedVariant(null); // Deselect if already selected
                                  } else {
                                    setSelectedVariant(variant);
                                  }
                                  setSelectedImage(0); // Reset to first image
                                  setQuantity(1); // Reset quantity on variant change
                                }}
                                className={`p-3 border-2 rounded-lg transition-all duration-300 text-left transform hover:scale-105 ${selectedVariant?.id === variant.id
                                  ? 'border-blue-500 shadow-lg ring-2 ring-blue-200'
                                  : 'border-gray-200 hover:border-gray-300 hover:shadow-md bg-white'
                                  }`}
                              >
                                <div className="flex items-start gap-3">
                                  {/* Variant Image Preview in Selector */}
                                  {variant.images && variant.images.length > 0 && (
                                    <div className="w-12 h-12 rounded-md overflow-hidden border border-gray-200 shrink-0">
                                      <Image
                                        src={variant.images[0]}
                                        alt={`${variant.size} ${variant.color}`}
                                        width={48}
                                        height={48}
                                        className="w-full h-full object-cover"
                                      />
                                    </div>
                                  )}
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
                                    <div className="flex items-center gap-1 mt-1">
                                      <span className="text-lg font-bold text-gray-900">{formatPrice(variant.adminFixedPrice ?? variant.price)}</span>
                                      {variant.originalPrice && variant.originalPrice > (variant.adminFixedPrice ?? variant.price) && (
                                        <span className="text-xs text-gray-400 line-through">{formatPrice(variant.originalPrice)}</span>
                                      )}
                                      {variant.discount && variant.discount > 0 && (
                                        <span className="text-xs text-green-600 font-medium">{variant.discount}% off</span>
                                      )}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      {variant.stock > 0 ? `${variant.stock} in stock` : 'Out of stock'}
                                    </div>
                                  </div>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Single Unit Size and Color - Show only if NO variants */}
                      {!product.hasVariants && (product.singleUnitSize || product.singleUnitColor) && (
                        <div className="max-w-md bg-gray-50 rounded-lg p-4 border border-gray-200">
                          <h3 className="text-lg font-semibold text-gray-900 mb-3">Product Details</h3>
                          <div className="space-y-2">
                            {product.singleUnitSize && (
                              <div className="flex items-center space-x-3">
                                <span className="text-sm font-medium text-gray-600 w-16">Size:</span>
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-white border border-gray-300 text-gray-900">
                                  {product.singleUnitSize}
                                </span>
                              </div>
                            )}
                            {product.singleUnitColor && (
                              <div className="flex items-center space-x-3">
                                <span className="text-sm font-medium text-gray-600 w-16">Color:</span>
                                <div className="flex items-center space-x-2">
                                  {product.singleUnitColorHex && (
                                    <div
                                      className="w-6 h-6 rounded-full border-2 border-gray-300 shadow-sm"
                                      style={{ backgroundColor: product.singleUnitColorHex }}
                                    />
                                  )}
                                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-white border border-gray-300 text-gray-900">
                                    {product.singleUnitColor}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Purchase Panel - Full Width to Match Price Section */}
                      <div className="bg-linear-to-br from-gray-50 to-white p-4 rounded-xl shadow-lg border border-gray-100">
                        {/* Stock Status */}
                        <div className="mb-3">
                          {availableStock > 0 ? (
                            <div className="flex items-center space-x-2">
                              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                              <span className="text-green-600 font-bold text-base">In stock</span>
                              <span className="text-gray-600 text-sm">({availableStock} available)</span>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-2">
                              <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
                              <span className="text-red-500 font-bold text-base">Out of Stock</span>
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
                        {availableStock > 0 && (
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
                              <input
                                type="number"
                                min={1}
                                max={availableStock}
                                value={quantity || ''}
                                onChange={handleQuantityChange}
                                onBlur={handleQuantityBlur}
                                className="w-20 text-center font-bold text-lg border-2 border-gray-300 rounded-lg py-1 focus:outline-none focus:ring-2 focus:ring-gray-700 focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              />
                              <button
                                onClick={handleIncrement}
                                disabled={quantity >= availableStock}
                                className="w-10 h-10 flex items-center justify-center border-2 border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                              >
                                <span className="text-xl font-semibold">+</span>
                              </button>
                              <span className="text-sm font-medium text-gray-500">{product?.uom || 'pcs'}</span>
                            </div>

                            <div className="mt-4 w-full">
                              <button
                                onClick={handleAddToCart}
                                className="w-full flex justify-center mx-auto bg-gray-900 border border-gray-900 text-white hover:bg-white hover:text-gray-900 shadow-md py-3 px-6 rounded-lg font-bold uppercase transition duration-300 transform active:scale-95 text-xs tracking-[1.5px]"
                              >
                                  Add to cart
                                </button>
                              </div>
                            </>
                          )}
                      </div>
                    </div>
                  </div>
                )}
              </div >
            </div >
          </div >

          {/* Product Details Section */}
          < div className="mt-12 bg-white rounded-2xl shadow-lg p-8" >
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
                {(!product.hasVariants) && product.singleUnitSize && (
                  <div className="flex justify-between py-3 border-b border-gray-100">
                    <span className="font-semibold text-gray-700">Size</span>
                    <span className="text-gray-600">{product.singleUnitSize}</span>
                  </div>
                )}
                {(!product.hasVariants) && product.singleUnitColor && (
                  <div className="flex justify-between py-3 border-b border-gray-100">
                    <span className="font-semibold text-gray-700">Color</span>
                    <span className="text-gray-600">{product.singleUnitColor}</span>
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
          </div >

          {/* Care Instructions */}
          {
            product.fabricSpecifications &&
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
            )
          }

          {/* Customer Reviews */}
          {showReviews && (
            <div className="mt-8 bg-white rounded-2xl shadow-lg p-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">Customer Reviews</h3>
              {loadingReviews ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
                  <span className="ml-3 text-gray-500">Loading reviews...</span>
                </div>
              ) : reviews.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No reviews yet</p>
              ) : (
                <div className="space-y-4">
                  {reviews.map((review: any) => (
                    <div key={review.id} className="bg-gray-50 rounded-xl p-5">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center">
                            <span className="text-sm font-bold text-gray-600">
                              {(review.user?.name || 'C')[0].toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900 text-sm">{review.user?.name || 'Customer'}</p>
                            <p className="text-xs text-gray-400">
                              {new Date(review.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-0.5">
                          {[1, 2, 3, 4, 5].map((i) => (
                            <Star
                              key={i}
                              className={`w-4 h-4 ${i <= review.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}`}
                            />
                          ))}
                        </div>
                      </div>
                      {review.comment && (
                        <p className="text-gray-600 text-sm leading-relaxed">{review.comment}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {showReviews && reviews.length > 0 && (
                <button
                  onClick={() => setShowReviews(false)}
                  className="mt-4 text-sm text-gray-500 hover:text-gray-700 font-medium"
                >
                  Hide reviews
                </button>
              )}
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
        </div >
      </div >
    </>
  );
};

export default ProductDetail;
