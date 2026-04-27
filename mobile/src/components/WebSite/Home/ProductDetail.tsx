import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import {
  View, Text, ScrollView, Pressable,
  ActivityIndicator, useWindowDimensions, StyleSheet,
  type NativeSyntheticEvent, type NativeScrollEvent,
} from 'react-native';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Star, Heart, Truck, Shield, RotateCcw, Package,
  ChevronDown, ChevronUp, ShoppingCart, Tag, Check,
} from 'lucide-react-native';
import { PublicProduct } from '@/services/publicProductService';
import { cartService } from '@/services/cartService';
import { wishlistService } from '@/services/wishlistService';
import { userAuthService } from '@/services/userAuthService';
import { showSuccessToast, showErrorToast } from '@/lib/toast-utils';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';



interface ProductDetailProps {
  product: PublicProduct;
  productId: string;
}

export default function ProductDetail({ product, productId }: ProductDetailProps) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { refreshCart, addToCart: addToGlobalCart } = useCart();
  const {
    isInWishlist: checkIsInWishlist,
    addToWishlist: addToGlobalWishlist,
    removeFromWishlist: removeFromGlobalWishlist,
  } = useWishlist();
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState<any>(null);
  const [isTogglingWishlist, setIsTogglingWishlist] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [showAllDetails, setShowAllDetails] = useState(false);

  // Use the global state for initial UI state
  const isWishlisted = checkIsInWishlist(productId);

  // ── Derived values ─────────────────────────────────────────────────────
  const displayImages = selectedVariant?.images?.length > 0
    ? selectedVariant.images.map((url: string) => ({ url }))
    : product.images || [];

  const currentPrice = selectedVariant
    ? (selectedVariant.adminFixedPrice ?? selectedVariant.price)
    : (product.adminFixedPrice ?? product.basePrice);
  const originalPrice = selectedVariant
    ? selectedVariant.originalPrice
    : product.originalPrice;
  const currentImageUrl = displayImages[selectedImage]?.url;
  const savings = originalPrice && originalPrice > currentPrice ? originalPrice - currentPrice : 0;

  const currentStock = selectedVariant
    ? selectedVariant.stock
    : (product.inventory?.baseStock ?? (product.hasVariants ? 0 : product.totalStock) ?? 0);
  const isActuallyInStock = product.inStock && currentStock > 0;

  const hasCareInstructions =
    product.fabricSpecifications != null &&
    typeof product.fabricSpecifications === 'object' &&
    'careInstructions' in product.fabricSpecifications &&
    Array.isArray((product.fabricSpecifications as any).careInstructions) &&
    (product.fabricSpecifications as any).careInstructions.length > 0;

  // ── Helpers ────────────────────────────────────────────────────────────
  const fmt = (n: number) => `$${n.toFixed(2)}`;

  const renderStars = (rating: number) =>
    [0, 1, 2, 3, 4].map(i => (
      <Star
        key={i}
        size={16}
        color={i < Math.floor(rating) ? '#111827' : '#e5e7eb'}
        fill={i < Math.floor(rating) ? '#111827' : 'transparent'}
      />
    ));

  // ── Handlers ───────────────────────────────────────────────────────────
  const handleAddToCart = async () => {
    const auth = await userAuthService.isAuthenticated();
    if (!auth) {
      showErrorToast('Login Required', 'Please login to add items to cart');
      setTimeout(() => router.push('/(auth)/Login' as any), 1500);
      return;
    }

    setIsAddingToCart(true);
    try {
      if (typeof Haptics !== 'undefined') {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      
      // Use optimistic context method
      await addToGlobalCart(product.id, quantity, selectedVariant?.id);

      const variantInfo = selectedVariant
        ? ` (${selectedVariant.size} - ${selectedVariant.color})`
        : (product.singleUnitSize || product.singleUnitColor 
            ? ` (${[product.singleUnitSize, product.singleUnitColor].filter(Boolean).join(' - ')})` 
            : '');

      showSuccessToast(
        'Added to Cart!',
        `${quantity} x ${product.name}${variantInfo} has been added to your cart.`
      );
      
      setQuantity(1);
    } catch (e: any) {
      console.error('Error adding to cart:', e);
      showErrorToast('Failed to Add', e.message || 'Unable to add item to cart. Please try again.');
    } finally {
      setIsAddingToCart(false);
    }
  };

  const handleToggleWishlist = async () => {
    try {
      if (isTogglingWishlist) return;

      const auth = await userAuthService.isAuthenticated();
      if (!auth) {
        showErrorToast('Login Required', 'Please login to manage your wishlist');
        setTimeout(() => router.push('/(auth)/Login' as any), 1500);
        return;
      }

      setIsTogglingWishlist(true);

      const impactStyle = isWishlisted ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light;
      if (typeof Haptics !== 'undefined') await Haptics.impactAsync(impactStyle);

      if (isWishlisted) {
        await removeFromGlobalWishlist(product.id);
        showSuccessToast('Removed', 'Product removed from wishlist');
      } else {
        await addToGlobalWishlist(product.id);
        showSuccessToast('Wishlisted', 'Product saved — choose variant when ready to buy');
      }
    } catch (e: any) {
      showErrorToast('Error', e.message || 'Unable to update wishlist');
    } finally {
      setIsTogglingWishlist(false);
    }
  };

  const handleBuyNow = async () => {
    const auth = await userAuthService.isAuthenticated();
    if (!auth) {
      showErrorToast('Login Required', 'Please login to checkout');
      setTimeout(() => router.push('/(auth)/Login' as any), 1500);
      return;
    }

    try {
      if (typeof Haptics !== 'undefined') {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      }
      // Logic for Buy Now usually involves adding to cart then redirecting
      await cartService.addToCart(product.id, quantity, selectedVariant?.id);
      showSuccessToast('Proceeding to Checkout', `Taking you to checkout with ${product.name}.`);
      router.push('/(any)/cart' as any); // Redirecting to cart/checkout
    } catch (e: any) {
      showErrorToast('Checkout Failed', 'Unable to proceed to checkout. Please try again.');
    }
  };

  // ── Variant selection handlers (stable refs) ──────────────────────────
  const handleSelectBaseVariant = useCallback(async () => {
    if (typeof Haptics !== 'undefined') await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedVariant(null);
    setSelectedImage(0);
    setQuantity(1);
  }, []);

  const handleSelectVariant = useCallback(async (variant: any) => {
    if (typeof Haptics !== 'undefined') await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedVariant((prev: any) => prev?.id === variant.id ? null : variant);
    setSelectedImage(0);
    setQuantity(1);
  }, []);

  const handleImageScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const newIndex = Math.round(e.nativeEvent.contentOffset.x / width);
    setSelectedImage((prev) => (newIndex !== prev ? newIndex : prev));
  }, [width]);

  const handleToggleDetails = useCallback(() => {
    setShowAllDetails((v) => !v);
  }, []);

  const handleDecrement = useCallback(() => {
    setQuantity((q: number) => Math.max(1, q - 1));
  }, []);

  const handleIncrement = useCallback(() => {
    setQuantity((q: number) => Math.min(currentStock, q + 1));
  }, [currentStock]);

  return (
    <View className="flex-1 bg-slate-50">
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >

      {/* ── Hero Image ─────────────────────────────────────────────────────── */}
      <View className="bg-white">
        {/* Main image carousel */}
        <View className="bg-gray-100" style={{ height: Math.min(width, 500) }}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={handleImageScroll}
          >
            {displayImages.length > 0 ? (
              displayImages.map((img: any, idx: number) => (
                <View key={idx} style={{ width, height: Math.min(width, 500) }} className="bg-white">
                  <Image
                    source={{ uri: img.url }}
                    transition={300}
                    contentFit="contain"
                    style={{ width, height: Math.min(width, 500) }}
                    placeholder={null}
                    accessibilityLabel={`Product image ${idx + 1}`}
                  />
                </View>
              ))
            ) : (
              <View style={{ width, height: Math.min(width, 500) }} className="items-center justify-center">
                <Package size={80} color="#d1d5db" />
              </View>
            )}
          </ScrollView>

          {/* Discount ribbon */}
          {product.discount != null && product.discount > 0 ? (
            <View className="absolute top-4 left-0 bg-[#111827] px-3.5 py-1.5 rounded-r-xl z-10" style={s.discountRibbon}>
              <Text className="text-white font-extrabold text-xs tracking-wide">
                {product.discount}% OFF
              </Text>
            </View>
          ) : null}

          {/* Out of stock overlay */}
          {!isActuallyInStock ? (
            <View className="absolute top-4 right-4 bg-black/70 rounded-xl px-3.5 py-1.5 z-10">
              <Text className="text-white font-bold text-xs">Out of Stock</Text>
            </View>
          ) : null}

          {/* Pagination dots */}
          {displayImages.length > 1 ? (
            <View className="absolute bottom-4 left-0 right-0 flex-row justify-center gap-1.5 z-10">
              {displayImages.map((_: any, idx: number) => (
                <View
                  key={idx}
                  style={[
                    s.paginationDot,
                    selectedImage === idx ? s.paginationDotActive : s.paginationDotInactive,
                  ]}
                />
              ))}
            </View>
          ) : null}

          {/* Wishlist FAB */}
          <Pressable
            onPress={handleToggleWishlist}
            disabled={isTogglingWishlist}
            accessibilityRole="button"
            accessibilityLabel={isWishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'}
            accessibilityHint="Double tap to toggle wishlist"
            style={s.wishlistFab}
            className="absolute bottom-6 right-6 w-12 h-12 rounded-full bg-white items-center justify-center z-20"
          >
            {isTogglingWishlist ? (
              <ActivityIndicator size="small" color="#ef4444" />
            ) : (
              <Heart
                size={22}
                color={isWishlisted ? '#ef4444' : '#6b7280'}
                fill={isWishlisted ? '#ef4444' : 'transparent'}
              />
            )}
          </Pressable>
        </View>

        {/* Thumbnail strip */}
        {displayImages.length > 1 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.thumbnailStrip}
          >
            {displayImages.map((img: any, idx: number) => (
              <Pressable
                key={idx}
                onPress={() => setSelectedImage(idx)}
                accessibilityRole="button"
                accessibilityLabel={`View image ${idx + 1}`}
              >
                <View
                  className="w-16 h-16 rounded-xl overflow-hidden"
                  style={[
                    s.thumbnail,
                    selectedImage === idx ? s.thumbnailActive : s.thumbnailInactive,
                  ]}
                >
                  {img.url ? (
                    <Image
                      source={{ uri: img.url }}
                      style={s.thumbnailImage}
                      contentFit="cover"
                      transition={200}
                    />
                  ) : (
                    <View className="flex-1 items-center justify-center bg-gray-100">
                      <Package size={20} color="#d1d5db" />
                    </View>
                  )}
                </View>
              </Pressable>
            ))}
          </ScrollView>
        ) : null}
      </View>

      {/* ── Product Header ──────────────────────────────────────────────────── */}
      <View className="bg-white mt-2 px-5 pt-5 pb-4">
        {/* Category breadcrumb */}
        {product.category ? (
          <View className="flex-row items-center mb-2">
            <Text className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">
              {product.category}{product.subCategory ? ` › ${product.subCategory}` : ''}
            </Text>
          </View>
        ) : null}

        {/* Product name */}
        <Text className="text-[22px] font-extrabold text-gray-900 leading-[28px] mb-3">
          {product.name}
        </Text>

        {/* Star rating row */}
        <View className="flex-row items-center mb-5">
          <View className="flex-row gap-0.5 mr-2">{renderStars(product.rating || 0)}</View>
          <Text className="text-[13px] font-bold text-gray-800">
            {(product.rating ?? 0).toFixed(1)}
          </Text>
          <Text className="text-[13px] text-gray-400 ml-1">
            ({product.reviews ?? 0})
          </Text>
        </View>

        {/* Price block */}
        <View className="bg-gray-50 rounded-2xl px-4 py-4" style={s.priceCard}>
          <View className="flex-row items-baseline flex-wrap gap-2.5">
            <Text className="text-[30px] font-black text-gray-900">{fmt(currentPrice)}</Text>
            {savings > 0 ? (
              <>
                <Text className="text-base text-gray-400 line-through">{fmt(originalPrice!)}</Text>
                <View className="bg-green-100 rounded-lg px-2.5 py-1">
                  <Text className="text-[12px] font-bold text-green-700">Save {fmt(savings)}</Text>
                </View>
              </>
            ) : null}
          </View>
          <Text className="text-[11px] text-gray-400 mt-1.5">Inclusive of all taxes</Text>
        </View>
      </View>

      {/* ── Variants ────────────────────────────────────────────────────────── */}
      {product.hasVariants && product.variants && product.variants.length > 0 ? (
        <View className="bg-white mt-2 px-5 py-5">
          {/* Header */}
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-[15px] font-bold text-gray-900">Select Variant</Text>
            {selectedVariant ? (
              <View className="bg-gray-900 rounded-full px-3 py-1 flex-row items-center gap-1.5">
                {selectedVariant.colorHex ? (
                  <View
                    className="w-2.5 h-2.5 rounded-full"
                    style={[variantStyles.selectedChipDot, { backgroundColor: selectedVariant.colorHex }]}
                  />
                ) : null}
                <Text className="text-[11px] font-semibold text-white">
                  {selectedVariant.size}{selectedVariant.color ? ` · ${selectedVariant.color}` : ''}
                </Text>
              </View>
            ) : (
              <Text className="text-[12px] text-gray-400">Choose an option</Text>
            )}
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={variantStyles.scrollContent}
          >
            <View className="flex-row gap-3">
              {/* Base variant */}
              <VariantCard
                isSelected={!selectedVariant}
                imageUri={product.images?.length > 0
                  ? (product.images.find(i => i.isPrimary)?.url || product.images[0].url)
                  : undefined}
                label={product.singleUnitSize || product.singleUnitColor || 'Base Unit'}
                colorName={product.singleUnitColor || 'Base'}
                colorHex={product.singleUnitColorHex}
                price={fmt(product.adminFixedPrice || product.basePrice)}
                stock={product.inventory?.baseStock ?? (product.hasVariants ? 0 : product.totalStock)}
                onPress={handleSelectBaseVariant}
                accessibilityLabel="Select Base Variant"
                accessibilityHint="Selects the base product option"
              />

              {/* Named variants */}
              {product.variants.map((variant: any) => {
                const variantPrice = variant.adminFixedPrice ?? variant.price;
                const hasDiscount = variant.originalPrice != null && variant.originalPrice > variantPrice;
                return (
                  <VariantCard
                    key={variant.id}
                    isSelected={selectedVariant?.id === variant.id}
                    imageUri={variant.images?.length > 0 ? variant.images[0] : undefined}
                    label={variant.size || 'Standard'}
                    colorName={variant.color || 'Default'}
                    colorHex={variant.colorHex}
                    price={fmt(variantPrice)}
                    originalPrice={hasDiscount ? fmt(variant.originalPrice) : undefined}
                    discountPercent={hasDiscount && variant.discount > 0 ? variant.discount : undefined}
                    stock={variant.stock}
                    onPress={() => handleSelectVariant(variant)}
                    accessibilityLabel={`Select ${variant.size || 'Standard'} ${variant.color || ''} variant`}
                    accessibilityHint={
                      selectedVariant?.id === variant.id
                        ? 'Currently selected, tap to deselect'
                        : 'Double tap to select this variant'
                    }
                  />
                );
              })}
            </View>
          </ScrollView>
        </View>
      ) : null}

      {/* ── Product Specs (For non-variant items) ────────────────────────── */}
      {!product.hasVariants && (product.singleUnitSize || product.singleUnitColor) ? (
        <View className="bg-white mt-2 px-5 py-5">
          <Text className="text-[15px] font-bold text-gray-900 mb-3">Product Attributes</Text>

          <View className="flex-row flex-wrap gap-2.5">
            {product.singleUnitSize ? (
              <View className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 flex-row items-center">
                <Text className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mr-2">Size</Text>
                <Text className="text-[13px] font-semibold text-gray-900">{product.singleUnitSize}</Text>
              </View>
            ) : null}

            {product.singleUnitColor ? (
              <View className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 flex-row items-center">
                <Text className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mr-2">Color</Text>
                <View className="flex-row items-center gap-1.5">
                  {product.singleUnitColorHex ? (
                    <View
                      className="w-3.5 h-3.5 rounded-full"
                      style={[s.colorDot, { backgroundColor: product.singleUnitColorHex }]}
                    />
                  ) : null}
                  <Text className="text-[13px] font-semibold text-gray-900">{product.singleUnitColor}</Text>
                </View>
              </View>
            ) : null}
          </View>
        </View>
      ) : null}

      {/* ── Purchase Panel ──────────────────────────────────────────────────── */}
      <View className="bg-white mt-2 px-5 py-5">
        {/* Stock status */}
        <View className="flex-row items-center mb-4">
          <View
            className="w-2 h-2 rounded-full mr-2"
            style={isActuallyInStock ? s.stockDotIn : s.stockDotOut}
          />
          {isActuallyInStock ? (
            <View className="flex-row items-center">
              <Text className="text-sm font-bold text-green-700">In Stock</Text>
              <View className="w-1 h-1 rounded-full bg-gray-300 mx-2" />
              <Text className="text-[13px] text-gray-500">{currentStock} available</Text>
            </View>
          ) : (
            <Text className="text-sm font-bold text-red-600">Out of Stock</Text>
          )}
        </View>

        {/* Dispatch timeline */}
        {product.dispatchTimeline ? (
          <View className="bg-blue-50/70 rounded-2xl p-3.5 flex-row items-center gap-3">
            <View className="w-9 h-9 rounded-xl bg-blue-100 items-center justify-center">
              <Truck size={18} color="#2563eb" />
            </View>
            <View className="flex-1">
              <Text className="text-[13px] font-semibold text-gray-900">
                Delivery in {product.dispatchTimeline.totalDays} days
              </Text>
              <Text className="text-[11px] text-gray-500 mt-0.5">
                {product.dispatchTimeline.processingDays}d processing + {product.dispatchTimeline.shippingDays}d shipping
              </Text>
            </View>
          </View>
        ) : null}
      </View>

      {/* ── Product Details ─────────────────────────────────────────────────── */}
      <View className="bg-white mt-2 px-5 py-5">
        <Text className="text-[17px] font-bold text-gray-900 mb-4">Product Details</Text>

        {/* Spec table */}
        <View className="mb-5">
          {SPEC_FIELDS.map((field, idx) => {
            const value = (product as any)[field.key];
            return value ? (
              <View key={field.key} className="flex-row items-center py-3" style={idx > 0 ? s.specRowBorder : undefined}>
                <Text className="w-[110px] text-[12px] font-semibold text-gray-400 uppercase tracking-wide">{field.label}</Text>
                <Text className="flex-1 text-[13px] font-semibold text-gray-800 text-right">{value}</Text>
              </View>
            ) : null;
          })}
        </View>

        {/* Description & Specs expandable */}
        <View className="bg-gray-50 rounded-2xl p-4">
          <Pressable
            onPress={handleToggleDetails}
            accessibilityRole="button"
            accessibilityLabel={showAllDetails ? 'Collapse details' : 'Expand details'}
            accessibilityState={{ expanded: showAllDetails }}
            className="flex-row items-center justify-between"
          >
            <Text className="text-[15px] font-bold text-gray-900">Specs & Info</Text>
            <View className="flex-row items-center bg-white px-3 py-1.5 rounded-full border border-gray-200">
              <Text className="text-[11px] font-bold text-gray-600 mr-1">
                {showAllDetails ? 'Less' : 'More'}
              </Text>
              {showAllDetails ? <ChevronUp size={14} color="#6b7280" /> : <ChevronDown size={14} color="#6b7280" />}
            </View>
          </Pressable>

          {showAllDetails ? (
            <View className="mt-4">
              {/* Description */}
              <View className="mb-4">
                <Text className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Description</Text>
                <Text className="text-[13px] text-gray-600 leading-[22px]">{product.description}</Text>
              </View>

              {/* Fabric Specs */}
              {product.fabricSpecifications ? (
                <View className="pt-4 border-t border-gray-200/60">
                  <Text className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Specifications</Text>
                  {Object.entries(product.fabricSpecifications).map(([key, value]) => {
                    if (key === 'careInstructions') return null;
                    return (
                      <View key={key} className="flex-row items-start mb-2.5">
                        <View className="w-1.5 h-1.5 rounded-full bg-gray-900 mt-[7px] mr-2.5" />
                        <Text className="text-[13px] text-gray-600 flex-1">
                          <Text className="font-semibold capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}: </Text>
                          {Array.isArray(value) ? value.join(', ') : String(value)}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              ) : null}

              {/* Tags */}
              {product.tags != null && product.tags.length > 0 ? (
                <View className="pt-4 border-t border-gray-200/60">
                  <Text className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Tags</Text>
                  <View className="flex-row flex-wrap gap-2">
                    {product.tags.map((tag, i) => (
                      <View key={i} className="bg-white px-3 py-1.5 rounded-full border border-gray-200">
                        <Text className="text-[11px] font-semibold text-gray-500">{tag}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ) : null}
            </View>
          ) : (
            <Text className="text-[13px] text-gray-500 leading-5 mt-3" numberOfLines={2}>
              {product.description}
            </Text>
          )}
        </View>
      </View>

      {/* ── Care Instructions ───────────────────────────────────────────────── */}
      {hasCareInstructions ? (
        <View className="bg-white mt-2 px-5 py-5">
          <Text className="text-[15px] font-bold text-gray-900 mb-4">Care Instructions</Text>
          {(product.fabricSpecifications as any).careInstructions.map((instr: string, i: number) => (
            <View key={i} className="flex-row items-start bg-gray-50 rounded-2xl p-3.5 mb-2">
              <View className="w-6 h-6 rounded-full bg-gray-900 items-center justify-center mr-3" style={s.careStepBadge}>
                <Text className="text-white text-[11px] font-bold">{i + 1}</Text>
              </View>
              <Text className="text-[13px] text-gray-600 flex-1 leading-[20px]">{instr}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {/* ── Why choose this product ─────────────────────────────────────────── */}
      <View className="bg-white mt-2 px-5 py-5">
        <Text className="text-[15px] font-bold text-gray-900 mb-4">
          Why choose this product?
        </Text>
        {WHY_CHOOSE_ITEMS.map(({ icon: Icon, color, bgColor, iconBg, title, subtitle, dynamicSubtitle }) => (
          <View
            key={title}
            className="flex-row items-center rounded-2xl p-3.5 mb-2"
            style={{ backgroundColor: bgColor }}
          >
            <View
              className="w-10 h-10 rounded-xl items-center justify-center mr-3"
              style={{ backgroundColor: iconBg }}
            >
              <Icon size={20} color={color} />
            </View>
            <View className="flex-1">
              <Text className="text-[13px] font-bold text-gray-900">{title}</Text>
              <Text className="text-[11px] text-gray-500 mt-0.5">
                {dynamicSubtitle
                  ? (product.dispatchTimeline ? `Ships in ${product.dispatchTimeline.totalDays} days` : subtitle)
                  : subtitle}
              </Text>
            </View>
          </View>
        ))}
      </View>

      </ScrollView>

      {/* ── Sticky Action Bar ─────────────────────────────────────────────── */}
      {isActuallyInStock ? (
        <View
          className="bg-white border-t border-gray-100 px-4 py-3 flex-row items-center gap-3"
          style={{ paddingBottom: Math.max(insets.bottom, 16) }}
        >
          {/* Quantity selector */}
          <View className="flex-row items-center bg-gray-100 rounded-xl" style={s.qtyContainer}>
            <Pressable
              onPress={handleDecrement}
              disabled={quantity <= 1}
              accessibilityRole="button"
              accessibilityLabel="Decrease quantity"
              accessibilityHint="Reduces item quantity by one"
              style={s.qtyButton}
              className="items-center justify-center"
            >
              <Text className="text-lg font-bold" style={quantity <= 1 ? s.qtyTextDisabled : s.qtyTextEnabled}>
                {'\u2212'}
              </Text>
            </Pressable>
            <View className="min-w-[36px] items-center">
              <Text className="text-[15px] font-extrabold text-gray-900">{quantity}</Text>
            </View>
            <Pressable
              onPress={handleIncrement}
              disabled={quantity >= currentStock}
              accessibilityRole="button"
              accessibilityLabel="Increase quantity"
              accessibilityHint="Increases item quantity by one"
              style={s.qtyButton}
              className="items-center justify-center"
            >
              <Text className="text-lg font-bold" style={quantity >= currentStock ? s.qtyTextDisabled : s.qtyTextEnabled}>
                {'+'}
              </Text>
            </Pressable>
          </View>

          {/* Add to Cart */}
          <Pressable
            onPress={handleAddToCart}
            disabled={isAddingToCart}
            accessibilityRole="button"
            accessibilityLabel={`Add ${quantity} to cart for ${fmt(currentPrice * quantity)}`}
            accessibilityHint="Double tap to add items to your cart"
            style={s.addToCartButton}
            className="flex-1 bg-gray-900 h-12 rounded-xl flex-row items-center justify-center gap-2"
          >
            {isAddingToCart ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <ShoppingCart size={18} color="#ffffff" />
            )}
            <Text className="text-[14px] font-bold text-white">
              {isAddingToCart ? 'Adding…' : `Add to Cart · ${fmt(currentPrice * quantity)}`}
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

/* ── VariantCard (memoized to avoid re-renders in horizontal list) ──────── */
interface VariantCardProps {
  isSelected: boolean;
  imageUri?: string;
  label: string;
  colorName: string;
  colorHex?: string;
  price: string;
  originalPrice?: string;
  discountPercent?: number;
  stock: number;
  onPress: () => void;
  accessibilityLabel: string;
  accessibilityHint: string;
}

const VariantCard = memo(function VariantCard({
  isSelected,
  imageUri,
  label,
  colorName,
  colorHex,
  price,
  originalPrice,
  discountPercent,
  stock,
  onPress,
  accessibilityLabel,
  accessibilityHint,
}: VariantCardProps) {
  const inStock = stock > 0;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ selected: isSelected }}
      className="flex-shrink-0"
    >
      <View
        className="rounded-2xl overflow-hidden"
        style={[
          variantStyles.card,
          isSelected ? variantStyles.cardSelected : variantStyles.cardDefault,
          inStock ? null : variantStyles.cardOutOfStock,
        ]}
      >
        {/* Image */}
        <View style={variantStyles.imageContainer} className="items-center justify-center">
          {imageUri ? (
            <Image
              source={{ uri: imageUri }}
              style={variantStyles.image}
              contentFit="contain"
              transition={200}
            />
          ) : (
            <Package size={28} color="#d1d5db" />
          )}

          {/* Selected badge */}
          {isSelected ? (
            <View className="absolute top-2 right-2 rounded-full items-center justify-center" style={variantStyles.checkBadge}>
              <Check size={13} color="#ffffff" strokeWidth={3} />
            </View>
          ) : null}

          {/* Discount tag */}
          {discountPercent != null && discountPercent > 0 ? (
            <View className="absolute top-2 left-2 rounded-md px-1.5 py-0.5" style={variantStyles.discountBadge}>
              <Text style={variantStyles.discountText}>
                {`-${discountPercent}%`}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Info */}
        <View className="px-3 py-2.5 flex-1 justify-between">
          <View>
            <Text className="text-[13px] font-semibold text-gray-900" numberOfLines={1}>
              {label}
            </Text>
            <View className="flex-row items-center mt-1 gap-1.5" style={variantStyles.colorRow}>
              {colorHex ? (
                <View
                  className="w-3 h-3 rounded-full"
                  style={[variantStyles.colorSwatch, { backgroundColor: colorHex }]}
                />
              ) : null}
              <Text className="text-[11px] text-gray-500">{colorName}</Text>
            </View>
          </View>

          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-[14px] font-bold text-gray-900">{price}</Text>
              {originalPrice ? (
                <Text className="text-[10px] text-gray-400 line-through">{originalPrice}</Text>
              ) : null}
            </View>
            <View
              className="rounded-full px-1.5 py-0.5"
              style={inStock ? variantStyles.stockBadgeIn : variantStyles.stockBadgeOut}
            >
              <Text style={inStock ? variantStyles.stockTextIn : variantStyles.stockTextOut}>
                {inStock ? `${stock} left` : 'Sold out'}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </Pressable>
  );
});

/* ── Hoisted styles (created once, never re-allocated) ─────────────────── */
const variantStyles = StyleSheet.create({
  scrollContent: { paddingRight: 16 },
  selectedChipDot: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  card: { width: 150, height: 210 },
  cardSelected: { borderWidth: 2, borderColor: '#111827', backgroundColor: '#fafafa' },
  cardDefault: { borderWidth: 1.5, borderColor: '#f3f4f6', backgroundColor: '#ffffff' },
  cardOutOfStock: { opacity: 0.5 },
  imageContainer: { height: 100, backgroundColor: '#f9fafb' },
  image: { width: '100%', height: '100%' },
  checkBadge: { width: 22, height: 22, backgroundColor: '#111827' },
  discountBadge: { backgroundColor: '#dcfce7' },
  discountText: { fontSize: 9, fontWeight: '700', color: '#16a34a' },
  colorRow: { height: 16 },
  colorSwatch: { borderWidth: 1, borderColor: '#e5e7eb' },
  stockBadgeIn: { backgroundColor: '#f0fdf4' },
  stockBadgeOut: { backgroundColor: '#fef2f2' },
  stockTextIn: { fontSize: 9, fontWeight: '600', color: '#16a34a' },
  stockTextOut: { fontSize: 9, fontWeight: '600', color: '#ef4444' },
});

/* ── Hoisted constants (allocated once, shared across all instances) ────── */
const SPEC_FIELDS: { key: string; label: string }[] = [
  { key: 'category', label: 'Category' },
  { key: 'subCategory', label: 'Sub Category' },
  { key: 'material', label: 'Material' },
  { key: 'fabricType', label: 'Fabric Type' },
  { key: 'dimensions', label: 'Dimensions' },
  { key: 'weight', label: 'Weight' },
];

const WHY_CHOOSE_ITEMS: {
  icon: any; color: string; bgColor: string; iconBg: string;
  title: string; subtitle: string; dynamicSubtitle?: boolean;
}[] = [
  {
    icon: Truck, color: '#16a34a', bgColor: '#f0fdf4', iconBg: '#dcfce7',
    title: 'Fast Dispatch', subtitle: 'Quick delivery', dynamicSubtitle: true,
  },
  {
    icon: Shield, color: '#2563eb', bgColor: '#eff6ff', iconBg: '#dbeafe',
    title: 'Quality Guarantee', subtitle: 'Premium materials and craftsmanship',
  },
  {
    icon: RotateCcw, color: '#7c3aed', bgColor: '#f5f3ff', iconBg: '#ede9fe',
    title: '30-Day Returns', subtitle: 'Easy returns and exchanges',
  },
];

/* ── Global hoisted styles ─────────────────────────────────────────────── */
const s = StyleSheet.create({
  // Hero
  discountRibbon: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  paginationDot: { height: 6, borderRadius: 3 },
  paginationDotActive: { width: 20, backgroundColor: '#111827' },
  paginationDotInactive: { width: 6, backgroundColor: '#d1d5db' },
  wishlistFab: {
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12, shadowRadius: 8, elevation: 6,
    borderWidth: 1, borderColor: '#f3f4f6',
  },
  thumbnailStrip: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  thumbnail: { borderWidth: 2.5 },
  thumbnailActive: { borderColor: '#111827' },
  thumbnailInactive: { borderColor: '#e5e7eb' },
  thumbnailImage: { width: '100%', height: '100%' },

  // Product header
  priceCard: { borderWidth: 1, borderColor: '#f3f4f6' },

  // Specs
  colorDot: { borderWidth: 1, borderColor: '#e5e7eb' },
  specRowBorder: { borderTopWidth: 1, borderTopColor: '#f3f4f6' },

  // Purchase panel
  stockDotIn: { backgroundColor: '#22c55e' },
  stockDotOut: { backgroundColor: '#9ca3af' },

  // Care
  careStepBadge: { minWidth: 24 },

  // Sticky bar
  qtyContainer: { height: 48 },
  qtyButton: { width: 44, height: 48 },
  qtyTextEnabled: { color: '#111827' },
  qtyTextDisabled: { color: '#9ca3af' },
  addToCartButton: { shadowColor: '#111827', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 6, elevation: 4 },
});
