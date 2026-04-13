import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, Image, TouchableOpacity,
  Dimensions, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Star, Heart, Truck, Shield, RotateCcw, Package,
  ChevronDown, ChevronUp, ShoppingCart, Tag,
} from 'lucide-react-native';
import { PublicProduct } from '@/services/publicProductService';
import { cartService } from '@/services/cartService';
import { wishlistService } from '@/services/wishlistService';
import { userAuthService } from '@/services/userAuthService';
import { showSuccessToast, showErrorToast } from '@/lib/toast-utils';

const { width } = Dimensions.get('window');

interface ProductDetailProps {
  product: PublicProduct;
  productId: string;
}

export default function ProductDetail({ product, productId }: ProductDetailProps) {
  const router = useRouter();
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState<any>(null);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [isTogglingWishlist, setIsTogglingWishlist] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [showAllDetails, setShowAllDetails] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const auth = await userAuthService.isAuthenticated();
        if (!mounted) return;
        const inWl = auth
          ? await wishlistService.isInWishlist(productId)
          : await wishlistService.isInLocalWishlist(productId);
        if (mounted) setIsWishlisted(inWl);
      } catch { /* ignore */ }
    })();
    return () => { mounted = false; };
  }, [productId]);

  // ── Derived values ─────────────────────────────────────────────────────
  const displayImages = selectedVariant?.images?.length > 0
    ? selectedVariant.images.map((url: string) => ({ url }))
    : product.images || [];

  const currentPrice = selectedVariant?.price || product.adminFixedPrice || product.basePrice;
  const originalPrice = product.originalPrice;
  const currentImageUrl = displayImages[selectedImage]?.url;
  const savings = originalPrice && originalPrice > currentPrice ? originalPrice - currentPrice : 0;

  const currentStock = selectedVariant
    ? selectedVariant.stock
    : (product.inventory?.currentStock ?? (product.hasVariants ? 0 : product.totalStock) ?? 0);
  const isActuallyInStock = product.inStock && currentStock > 0;

  // ── Helpers ────────────────────────────────────────────────────────────
  const fmt = (n: number) => `₹${n.toFixed(2)}`;

  const renderStars = (rating: number) =>
    [0, 1, 2, 3, 4].map(i => (
      <Star
        key={i}
        size={16}
        color={i < Math.floor(rating) ? '#f59e0b' : '#e5e7eb'}
        fill={i < Math.floor(rating) ? '#f59e0b' : 'transparent'}
      />
    ));

  // ── Handlers ───────────────────────────────────────────────────────────
  const handleAddToCart = async () => {
    const auth = await userAuthService.isAuthenticated();
    if (!auth) {
      showErrorToast('Login Required', 'Please login to add items');
      setTimeout(() => router.push('/(auth)/Login' as any), 1200);
      return;
    }
    setIsAddingToCart(true);
    try {
      await cartService.addToCart(product.id, quantity, selectedVariant?.id);
      const variantInfo = selectedVariant
        ? ` (${selectedVariant.size} - ${selectedVariant.color})`
        : '';
      showSuccessToast('Added to Cart!', `${quantity} × ${product.name}${variantInfo}`);
      setQuantity(1);
    } catch (e: any) {
      showErrorToast('Failed', e.message || 'Unable to add item');
    } finally {
      setIsAddingToCart(false);
    }
  };

  const handleToggleWishlist = async () => {
    const auth = await userAuthService.isAuthenticated();
    if (!auth) {
      showErrorToast('Login Required', 'Please login to use wishlist');
      setTimeout(() => router.push('/(auth)/Login' as any), 1200);
      return;
    }
    setIsTogglingWishlist(true);
    try {
      if (isWishlisted) {
        await wishlistService.removeFromWishlist(product.id);
        setIsWishlisted(false);
        showSuccessToast('Removed', `${product.name} removed from wishlist`);
      } else {
        await wishlistService.addToWishlist(product.id);
        setIsWishlisted(true);
        showSuccessToast('Saved!', `${product.name} added to wishlist`);
      }
    } catch (e: any) {
      showErrorToast('Failed', e.message || 'Unable to update wishlist');
    } finally {
      setIsTogglingWishlist(false);
    }
  };

  return (
    <ScrollView className="flex-1 bg-slate-50" showsVerticalScrollIndicator={false}>

      {/* ── Hero Image ─────────────────────────────────────────────────────── */}
      <View className="bg-white">
        {/* Main image */}
        <View className="bg-gray-100" style={{ height: width }}>
          {currentImageUrl ? (
            <Image
              source={{ uri: currentImageUrl }}
              style={{ width, height: width }}
              resizeMode="cover"
            />
          ) : (
            <View className="flex-1 items-center justify-center">
              <Package size={80} color="#d1d5db" />
            </View>
          )}

          {/* Discount ribbon */}
          {product.discount && product.discount > 0 && (
            <View className="absolute top-4 left-0 bg-[#1a1a2e] px-3.5 py-1 rounded-r-lg">
              <Text className="text-amber-400 font-extrabold text-xs">
                {product.discount}% OFF
              </Text>
            </View>
          )}

          {/* Out of stock badge */}
          {!isActuallyInStock && (
            <View className="absolute top-4 right-4 bg-gray-500/85 rounded-lg px-3 py-1">
              <Text className="text-white font-bold text-xs">Out of Stock</Text>
            </View>
          )}

          {/* Wishlist FAB */}
          <TouchableOpacity
            onPress={handleToggleWishlist}
            disabled={isTogglingWishlist}
            activeOpacity={0.8}
            className="absolute bottom-4 right-4 w-12 h-12 rounded-full items-center justify-center"
            style={{
              backgroundColor: isWishlisted ? '#ef4444' : '#ffffff',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 3 },
              shadowOpacity: 0.2,
              shadowRadius: 6,
              elevation: 5,
            }}
          >
            {isTogglingWishlist
              ? <ActivityIndicator size="small" color={isWishlisted ? '#fff' : '#ef4444'} />
              : <Heart
                  size={22}
                  color={isWishlisted ? '#ffffff' : '#ef4444'}
                  fill={isWishlisted ? '#ffffff' : 'transparent'}
                />
            }
          </TouchableOpacity>
        </View>

        {/* Thumbnail strip */}
        {displayImages.length > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 14, paddingVertical: 12, gap: 8 }}
          >
            {displayImages.map((img: any, idx: number) => (
              <TouchableOpacity
                key={idx}
                onPress={() => setSelectedImage(idx)}
                activeOpacity={0.8}
                className="w-16 h-16 rounded-xl overflow-hidden"
                style={{
                  borderWidth: 2.5,
                  borderColor: selectedImage === idx ? '#1a1a2e' : '#e5e7eb',
                }}
              >
                {img.url ? (
                  <Image source={{ uri: img.url }} className="w-full h-full" resizeMode="cover" />
                ) : (
                  <View className="flex-1 items-center justify-center bg-gray-100">
                    <Package size={20} color="#d1d5db" />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>

      {/* ── Product Header ──────────────────────────────────────────────────── */}
      <View className="bg-white mt-2 px-4.5 pt-5 pb-1">
        {/* Category breadcrumb */}
        {product.category && (
          <Text className="text-[11px] font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
            {product.category}{product.subCategory ? ` › ${product.subCategory}` : ''}
          </Text>
        )}

        {/* Product name */}
        <Text className="text-[22px] font-extrabold text-gray-900 leading-[30px] mb-3">
          {product.name}
        </Text>

        {/* Star rating row */}
        <View className="flex-row items-center mb-4">
          <View className="flex-row mr-2">{renderStars(product.rating || 0)}</View>
          <Text className="text-[13px] font-bold text-gray-700">
            {(product.rating ?? 0).toFixed(1)}
          </Text>
          <Text className="text-[13px] text-gray-400 ml-1">
            ({product.reviews ?? 0} reviews)
          </Text>
        </View>

        {/* Price card */}
        <View
          className="bg-white rounded-2xl p-4 mb-4 shadow-sm"
          style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius: 8,
            elevation: 3,
          }}
        >
          <View className="flex-row items-baseline flex-wrap gap-2">
            <Text className="text-[32px] font-black text-gray-900">{fmt(currentPrice)}</Text>
            {savings > 0 && (
              <>
                <Text className="text-[18px] text-gray-400 line-through">{fmt(originalPrice!)}</Text>
                <View className="bg-green-50 rounded-lg px-2 py-0.5">
                  <Text className="text-[13px] font-bold text-green-700">Save {fmt(savings)}</Text>
                </View>
              </>
            )}
          </View>
          <Text className="text-xs text-gray-500 mt-1">Price includes all taxes</Text>
        </View>
      </View>

      {/* ── Variants ────────────────────────────────────────────────────────── */}
      {product.hasVariants && product.variants && product.variants.length > 0 && (
        <View className="bg-white mt-2 px-4.5 py-4.5">
          <Text className="text-base font-bold text-gray-900 mb-3">
            Select Variant:{' '}
            <Text className="text-gray-500 font-medium">
              {selectedVariant
                ? `${selectedVariant.size} — ${selectedVariant.color}`
                : 'Choose one'}
            </Text>
          </Text>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
            {/* Base variant */}
            <TouchableOpacity
              onPress={() => { setSelectedVariant(null); setSelectedImage(0); }}
              activeOpacity={0.85}
              className="w-[140px] p-3 rounded-2xl"
              style={{
                borderWidth: 2,
                borderColor: !selectedVariant ? '#1a1a2e' : '#e5e7eb',
                backgroundColor: !selectedVariant ? '#f0f9ff' : '#ffffff',
              }}
            >
              {product.images && product.images.length > 0 && (
                <Image
                  source={{ uri: product.images.find(i => i.isPrimary)?.url || product.images[0].url }}
                  className="w-full h-[72px] rounded-xl mb-2"
                  resizeMode="cover"
                />
              )}
              <Text className="text-xs font-bold text-gray-900">
                {product.singleUnitSize || product.singleUnitColor || 'Base Variant'}
              </Text>
              {product.singleUnitColor && (
                <View className="flex-row items-center mt-1 gap-1">
                  {product.singleUnitColorHex && (
                    <View
                      className="w-3.5 h-3.5 rounded-full border border-gray-200"
                      style={{ backgroundColor: product.singleUnitColorHex }}
                    />
                  )}
                  <Text className="text-[10px] text-gray-500">{product.singleUnitColor}</Text>
                </View>
              )}
              <Text className="text-sm font-extrabold text-gray-900 mt-1.5">
                {fmt(product.adminFixedPrice || product.basePrice)}
              </Text>
              <Text
                className="text-[10px] mt-0.5"
                style={{
                  color: (product.inventory?.currentStock ?? product.totalStock) > 0
                    ? '#16a34a' : '#ef4444',
                }}
              >
                {(product.inventory?.currentStock ?? product.totalStock) > 0
                  ? `${product.inventory?.currentStock ?? product.totalStock} in stock`
                  : 'Out of stock'}
              </Text>
            </TouchableOpacity>

            {/* Named variants */}
            {product.variants.map((variant: any) => (
              <TouchableOpacity
                key={variant.id}
                onPress={() => {
                  setSelectedVariant(selectedVariant?.id === variant.id ? null : variant);
                  setSelectedImage(0);
                }}
                activeOpacity={0.85}
                className="w-[140px] p-3 rounded-2xl"
                style={{
                  borderWidth: 2,
                  borderColor: selectedVariant?.id === variant.id ? '#1a1a2e' : '#e5e7eb',
                  backgroundColor: selectedVariant?.id === variant.id ? '#f0f9ff' : '#ffffff',
                }}
              >
                {variant.images?.length > 0 && (
                  <Image
                    source={{ uri: variant.images[0] }}
                    className="w-full h-[72px] rounded-xl mb-2"
                    resizeMode="cover"
                  />
                )}
                <Text className="text-xs font-bold text-gray-900">{variant.size}</Text>
                <View className="flex-row items-center mt-1 gap-1">
                  {variant.colorHex && (
                    <View
                      className="w-3.5 h-3.5 rounded-full border border-gray-200"
                      style={{ backgroundColor: variant.colorHex }}
                    />
                  )}
                  <Text className="text-[10px] text-gray-500">{variant.color}</Text>
                </View>
                <Text className="text-sm font-extrabold text-gray-900 mt-1.5">
                  {fmt(variant.price)}
                </Text>
                <Text
                  className="text-[10px] mt-0.5"
                  style={{ color: variant.stock > 0 ? '#16a34a' : '#ef4444' }}
                >
                  {variant.stock > 0 ? `${variant.stock} in stock` : 'Out of stock'}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* ── Single-unit specs (no variants) ─────────────────────────────────── */}
      {!product.hasVariants && (product.singleUnitSize || product.singleUnitColor) && (
        <View className="bg-white mt-2 px-4.5 py-4">
          <Text className="text-[15px] font-bold text-gray-900 mb-3">Product Specs</Text>

          {product.singleUnitSize && (
            <View className="flex-row items-center mb-2">
              <Text className="text-[13px] font-semibold text-gray-500 w-14">Size</Text>
              <View className="bg-white border-[1.5px] border-gray-200 rounded-full px-3.5 py-1">
                <Text className="text-[13px] font-bold text-gray-900">{product.singleUnitSize}</Text>
              </View>
            </View>
          )}

          {product.singleUnitColor && (
            <View className="flex-row items-center">
              <Text className="text-[13px] font-semibold text-gray-500 w-14">Color</Text>
              <View className="flex-row items-center gap-2">
                {product.singleUnitColorHex && (
                  <View
                    className="w-[22px] h-[22px] rounded-full border-2 border-gray-200"
                    style={{ backgroundColor: product.singleUnitColorHex }}
                  />
                )}
                <View className="bg-white border-[1.5px] border-gray-200 rounded-full px-3.5 py-1">
                  <Text className="text-[13px] font-bold text-gray-900">{product.singleUnitColor}</Text>
                </View>
              </View>
            </View>
          )}
        </View>
      )}

      {/* ── Purchase Panel ──────────────────────────────────────────────────── */}
      <View className="bg-white mt-2 px-4.5 py-4.5">
        {/* Stock status */}
        <View className="flex-row items-center mb-3">
          <View
            className="w-2.5 h-2.5 rounded-full mr-2"
            style={{ backgroundColor: isActuallyInStock ? '#22c55e' : '#6b7280' }}
          />
          {isActuallyInStock ? (
            <>
              <Text className="text-sm font-bold text-green-700">In stock</Text>
              <Text className="text-[13px] text-gray-500 ml-1.5">({currentStock} available)</Text>
            </>
          ) : (
            <Text className="text-sm font-bold text-red-600">Out of Stock</Text>
          )}
        </View>

        {/* Dispatch timeline */}
        {product.dispatchTimeline && (
          <View className="bg-blue-50 rounded-xl p-3 mb-4 flex-row items-center gap-2">
            <Truck size={16} color="#2563eb" />
            <Text className="text-xs text-blue-800 flex-1">
              <Text className="font-bold">Dispatch: </Text>
              {product.dispatchTimeline.processingDays}d processing + {product.dispatchTimeline.shippingDays}d shipping{' '}
              <Text className="font-bold">(Total: {product.dispatchTimeline.totalDays} days)</Text>
            </Text>
          </View>
        )}

        {isActuallyInStock && (
          <>
            {/* Quantity selector */}
            <View className="flex-row items-center justify-center gap-3 mb-4">
              <Text className="text-sm font-bold text-gray-700">Quantity:</Text>
              <View className="flex-row items-center bg-gray-100 rounded-xl overflow-hidden">
                <TouchableOpacity
                  onPress={() => setQuantity(q => Math.max(1, q - 1))}
                  disabled={quantity <= 1}
                  className="px-4 py-2.5"
                >
                  <Text
                    className="text-xl font-bold"
                    style={{ color: quantity <= 1 ? '#d1d5db' : '#111827' }}
                  >
                    −
                  </Text>
                </TouchableOpacity>
                <Text className="text-[17px] font-extrabold text-gray-900 min-w-[40px] text-center">
                  {quantity}
                </Text>
                <TouchableOpacity
                  onPress={() => setQuantity(q => q + 1)}
                  className="px-4 py-2.5"
                >
                  <Text className="text-xl font-bold text-gray-900">+</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Add to Cart — full-width, single button */}
            <TouchableOpacity
              onPress={handleAddToCart}
              disabled={isAddingToCart}
              activeOpacity={0.85}
              className="py-4 rounded-2xl border-[2.5px] border-[#1a1a2e] bg-[#1a1a2e] flex-row items-center justify-center gap-2"
              style={{
                shadowColor: '#1a1a2e',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 5,
              }}
            >
              {isAddingToCart
                ? <ActivityIndicator size="small" color="#f59e0b" />
                : <ShoppingCart size={20} color="#f59e0b" />
              }
              <Text className="text-base font-extrabold text-white tracking-wide">
                {isAddingToCart ? 'Adding…' : 'Add to Cart'}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* ── Product Details ─────────────────────────────────────────────────── */}
      <View className="bg-white mt-2 px-4.5 py-5">
        <Text className="text-[18px] font-extrabold text-gray-900 mb-4">Product Details</Text>

        {/* Spec rows */}
        {[
          { label: 'Category',     value: product.category },
          { label: 'Sub Category', value: product.subCategory },
          { label: 'Material',     value: product.material },
          { label: 'Fabric Type',  value: product.fabricType },
          { label: 'Dimensions',   value: product.dimensions },
          { label: 'Weight',       value: product.weight },
          ...(showAllDetails && product.hasVariants
            ? [{ label: 'Available Variants', value: String(product.variants?.length || 0) }]
            : []),
        ]
          .filter(r => r.value)
          .map(({ label, value }) => (
            <View
              key={label}
              className="flex-row justify-between py-3 border-b border-gray-50"
            >
              <Text className="text-[13px] font-bold text-gray-700">{label}</Text>
              <Text className="text-[13px] text-gray-500 max-w-[55%] text-right">{value}</Text>
            </View>
          ))}

        {/* About this item */}
        {product.description && (
          <View className="mt-4">
            <Text className="text-[15px] font-bold text-gray-900 mb-2">About this item</Text>
            <Text className="text-[13px] text-gray-600 leading-[22px]">{product.description}</Text>
          </View>
        )}

        {/* Tags */}
        {product.tags && product.tags.length > 0 && (
          <View className="mt-3.5">
            <View className="flex-row items-center gap-1.5 mb-2">
              <Tag size={13} color="#6b7280" />
              <Text className="text-[13px] font-bold text-gray-700">Tags</Text>
            </View>
            <View className="flex-row flex-wrap gap-1.5">
              {product.tags.map((tag, i) => (
                <View key={i} className="bg-gray-100 rounded-full px-3 py-1">
                  <Text className="text-xs text-gray-700">{tag}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Fabric Specifications */}
        {product.fabricSpecifications && typeof product.fabricSpecifications === 'object' && (
          <View className="mt-3.5">
            <Text className="text-[13px] font-bold text-gray-700 mb-2">Fabric Specifications</Text>
            {Object.entries(product.fabricSpecifications).map(([key, value]) => {
              if (key === 'careInstructions') return null;
              return (
                <View key={key} className="flex-row items-start mb-1.5">
                  <View className="w-[7px] h-[7px] rounded-full bg-blue-500 mt-[5px] mr-2.5" />
                  <Text className="text-[13px] text-gray-600 flex-1">
                    <Text className="font-bold">{key.replace(/([A-Z])/g, ' $1').trim()}: </Text>
                    {Array.isArray(value) ? value.join(', ') : String(value)}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        {/* See more / less */}
        <TouchableOpacity
          onPress={() => setShowAllDetails(v => !v)}
          className="flex-row items-center mt-3.5"
          activeOpacity={0.7}
        >
          {showAllDetails
            ? <ChevronUp size={15} color="#2563eb" />
            : <ChevronDown size={15} color="#2563eb" />
          }
          <Text className="text-blue-600 font-semibold text-[13px] ml-1">
            {showAllDetails ? 'See less' : 'See more'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Care Instructions ───────────────────────────────────────────────── */}
      {product.fabricSpecifications &&
        typeof product.fabricSpecifications === 'object' &&
        'careInstructions' in product.fabricSpecifications &&
        Array.isArray((product.fabricSpecifications as any).careInstructions) &&
        (product.fabricSpecifications as any).careInstructions.length > 0 && (
          <View className="bg-white mt-2 px-4.5 py-5">
            <Text className="text-[18px] font-extrabold text-gray-900 mb-3.5">Care Instructions</Text>
            {(product.fabricSpecifications as any).careInstructions.map((instr: string, i: number) => (
              <View key={i} className="flex-row items-start bg-gray-50 rounded-xl p-3 mb-2">
                <View className="w-6 h-6 rounded-full bg-[#1a1a2e] items-center justify-center mr-3">
                  <Text className="text-amber-400 text-[11px] font-extrabold">{i + 1}</Text>
                </View>
                <Text className="text-[13px] text-gray-700 flex-1 leading-5">{instr}</Text>
              </View>
            ))}
          </View>
        )}

      {/* ── Why choose this product ─────────────────────────────────────────── */}
      <View className="bg-white mt-2 px-4.5 py-5 mb-6">
        <Text className="text-[18px] font-extrabold text-gray-900 mb-3.5">
          Why choose this product?
        </Text>
        {[
          {
            icon: Truck, color: '#16a34a', bg: '#f0fdf4',
            title: 'Fast Dispatch',
            subtitle: product.dispatchTimeline
              ? `Ships in ${product.dispatchTimeline.totalDays} days`
              : 'Quick delivery',
          },
          {
            icon: Shield, color: '#2563eb', bg: '#eff6ff',
            title: 'Quality Guarantee',
            subtitle: 'Premium materials and craftsmanship',
          },
          {
            icon: RotateCcw, color: '#9333ea', bg: '#faf5ff',
            title: '30-Day Returns',
            subtitle: 'Easy returns and exchanges',
          },
        ].map(({ icon: Icon, color, bg, title, subtitle }) => (
          <View
            key={title}
            className="flex-row items-center rounded-2xl p-3.5 mb-2.5"
            style={{ backgroundColor: bg }}
          >
            <View
              className="w-11 h-11 rounded-xl items-center justify-center mr-3.5"
              style={{ backgroundColor: color + '20' }}
            >
              <Icon size={22} color={color} />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-bold text-gray-900">{title}</Text>
              <Text className="text-xs text-gray-500 mt-0.5">{subtitle}</Text>
            </View>
          </View>
        ))}
      </View>

    </ScrollView>
  );
}
