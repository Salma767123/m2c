import React, { memo, useCallback, useEffect, useState } from "react";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import { ShoppingCart, Heart, Star, Minus, Plus } from "lucide-react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { cartService } from "@/services/cartService";
import { wishlistService } from "@/services/wishlistService";
import { userAuthService } from "@/services/userAuthService";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { Product as ServiceProduct } from "@/services/productService";
import { PublicProduct } from "@/services/publicProductService";
import { showSuccessToast, showErrorToast } from "@/lib/toast-utils";
import { getRegionalPrice, formatPrice as fmtCurrency } from "@/lib/currency";

// ─── Types ─────────────────────────────────────────────────────────────────────
interface MockProduct {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  discount?: number;
  images?: string[];
  rating?: number;
  reviews?: number;
  inStock: boolean;
  category?: string;
  description?: string;
}

type Product = ServiceProduct | MockProduct | PublicProduct;

// ─── Helpers ───────────────────────────────────────────────────────────────────
const isServiceProduct = (p: any): p is ServiceProduct =>
  "basePrice" in p || "adminFixedPrice" in p;

function getPrimaryImage(product: Product): string | undefined {
  if (
    !product.images ||
    !Array.isArray(product.images) ||
    product.images.length === 0
  )
    return undefined;
  const first = product.images[0];
  if (typeof first === "object" && first !== null && "url" in first) {
    const imgs = product.images as Array<{ url: string; isPrimary: boolean }>;
    return (
      imgs.find((i) => i.isPrimary && i.url?.trim())?.url ||
      imgs.find((i) => i.url?.trim())?.url
    );
  }
  if (typeof first === "string") {
    return (product.images as string[]).find((i) => i?.trim());
  }
  return undefined;
}

function getDisplayPrice(product: Product): number {
  if (isServiceProduct(product)) {
    return getRegionalPrice(product as any);
  }
  return (product as any).price ?? 0;
}

function getCurrentStock(product: Product): number {
  if (isServiceProduct(product)) {
    // For variant products, totalStock is sum of all variants — not usable
    // as a per-variant limit. Return it only for non-variant products.
    // Variant products use the stepper-disabled path (hasVariants = true),
    // so this value only gates the "in stock" boolean check.
    return Math.max(product.totalStock ?? 0, 0);
  }
  return (product as any).stock ?? 1;
}

// ─── Component ────────────────────────────────────────────────────────────────
interface ProductCardProps {
  product: Product;
  // Optional overrides — when provided, these are called instead of the
  // default internal service calls. Used by wishlist / cart screens that
  // need to react optimistically (e.g. remove the card from the list).
  onAddToCart?: (productId: string, quantity: number) => void | Promise<void>;
  onToggleWishlist?: (productId: string) => void | Promise<void>;
}

function ProductCardImpl({
  product,
  onAddToCart,
  onToggleWishlist,
}: ProductCardProps) {
  const router = useRouter();
  const { refreshCart, addToCart: addToGlobalCart } = useCart();
  const {
    isInWishlist: isInGlobalWishlist,
    addToWishlist: addToGlobalWishlist,
    removeFromWishlist: removeFromGlobalWishlist,
  } = useWishlist();
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [isTogglingWishlist, setIsTogglingWishlist] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Wishlist state is read from the global context — no duplicate fetch per card.
  const isInWishlist = isInGlobalWishlist(product.id);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const auth = await userAuthService.isAuthenticated();
        if (mounted) setIsAuthenticated(auth);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const imageUrl = getPrimaryImage(product);
  const displayPrice = getDisplayPrice(product);
  const currentStock = getCurrentStock(product);
  const isActuallyInStock = currentStock > 0;
  const reviews = product.reviews ?? 0;
  // Variant products require a size/color pick — the grid card can't do that,
  // so tapping "Add to Cart" routes to the detail screen instead of hitting
  // the cart API (which would 400 with "Insufficient stock" because no
  // variantId is attached).
  const hasVariants = isServiceProduct(product)
    ? !!(product as any).hasVariants
    : false;

  // ── Handlers ──────────────────────────────────────────────────────────────
  const openDetails = useCallback(() => {
    router.push(`(any)/products/${product.id}` as any);
  }, [product.id, router]);

  const handleAddToCart = useCallback(async () => {
    // Variant products need size/color picked on the detail page; quick-add
    // from a thumbnail can't pass a variantId and the backend rejects it.
    if (hasVariants) {
      openDetails();
      return;
    }
    if (!isAuthenticated) {
      showErrorToast("Login required", "Please login to add items to cart");
      setTimeout(() => router.push("/(auth)/Login" as any), 1200);
      return;
    }
    if (!isActuallyInStock) {
      showErrorToast("Out of stock", "This product is currently out of stock");
      return;
    }
    setIsAddingToCart(true);
    try {
      if (typeof Haptics !== "undefined")
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      if (onAddToCart) {
        await onAddToCart(product.id, quantity);
      } else {
        // Use the new optimistic context method
        await addToGlobalCart(product.id, quantity);
        showSuccessToast(
          "Added to Cart!",
          `${quantity} × ${product.name} has been added to your cart.`,
        );
      }
      setQuantity(1);
    } catch (e: any) {
      showErrorToast("Failed", e.message || "Unable to add item to cart");
    } finally {
      setIsAddingToCart(false);
    }
  }, [
    hasVariants,
    openDetails,
    isAuthenticated,
    isActuallyInStock,
    onAddToCart,
    product.id,
    product.name,
    quantity,
    addToGlobalCart,
    router,
  ]);

  const handleToggleWishlist = useCallback(async () => {
    const auth = await userAuthService.isAuthenticated();
    if (!auth) {
      showErrorToast("Login Required", "Please login to manage your wishlist");
      setTimeout(() => router.push("/(auth)/Login" as any), 1500);
      return;
    }

    setIsTogglingWishlist(true);
    try {
      if (onToggleWishlist) {
        await onToggleWishlist(product.id);
        return;
      }
      if (typeof Haptics !== "undefined")
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (isInWishlist) {
        await removeFromGlobalWishlist(product.id);
        showSuccessToast(
          "Removed",
          `${product.name} has been removed from your wishlist.`,
        );
      } else {
        await addToGlobalWishlist(product.id);
        showSuccessToast(
          "Added to Wishlist!",
          `${product.name} has been saved to your wishlist.`,
        );
      }
    } catch (e: any) {
      showErrorToast("Failed", e.message || "Unable to update wishlist");
    } finally {
      setIsTogglingWishlist(false);
    }
  }, [
    addToGlobalWishlist,
    isInWishlist,
    onToggleWishlist,
    product.id,
    product.name,
    removeFromGlobalWishlist,
    router,
  ]);

  const inc = useCallback(() => {
    setQuantity((q) =>
      currentStock > 0 ? Math.min(currentStock, q + 1) : q + 1,
    );
  }, [currentStock]);
  const dec = useCallback(() => {
    setQuantity((q) => Math.max(1, q - 1));
  }, []);

  return (
    <View className="flex-1">
      <Pressable
        onPress={openDetails}
        accessibilityRole="button"
        accessibilityLabel={`${product.name}${product.category ? `, ${product.category}` : ""}, $${displayPrice.toFixed(
          2,
        )}${!isActuallyInStock ? ", out of stock" : ""}`}
        android_ripple={{ color: "rgba(15,23,42,0.05)" }}
        className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm active:scale-[0.99] transition-all flex-1"
      >
        {/* ── Image Area ──────────────────────────────────────────────────────── */}
        <View
          className="relative bg-white"
          style={{ aspectRatio: 1, width: "100%" }}
        >
          {imageUrl ? (
            <Image
              source={{ uri: imageUrl }}
              style={{ width: "100%", height: "100%" }}
              contentFit="contain"
              transition={300}
              accessibilityIgnoresInvertColors
            />
          ) : (
            <View
              style={{
                width: "100%",
                height: "100%",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ShoppingCart size={32} color="#94a3b8" />
            </View>
          )}

          {/* Discount badge */}
          {product.discount && product.discount > 0 ? (
            <View className="absolute top-2.5 left-2.5 bg-[#111827] px-2 py-1 rounded-md">
              <Text className="text-white text-[10px] font-black tracking-widest uppercase">
                {product.discount}% OFF
              </Text>
            </View>
          ) : null}

          {/* Wishlist button — top RIGHT */}
          <Pressable
            onPress={handleToggleWishlist}
            disabled={isTogglingWishlist}
            className={`absolute top-2.5 right-2.5 w-9 h-9 rounded-full items-center justify-center shadow-sm ${
              isInWishlist ? "bg-red-500" : "bg-white/90"
            }`}
          >
            <Heart
              size={16}
              color={isInWishlist ? "#ffffff" : "#111827"}
              fill={isInWishlist ? "#ffffff" : "transparent"}
              strokeWidth={2.5}
            />
          </Pressable>

          {/* Out of stock overlay */}
          {!isActuallyInStock && (
            <View className="absolute inset-0 bg-white/40 items-center justify-center">
              <View className="bg-gray-800/90 px-3 py-1.5 rounded-full">
                <Text className="text-white text-[10px] font-bold tracking-widest uppercase">
                  Out of Stock
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* ── Info Area — tight stacking, no justify-between gap ───────────── */}
        <View className="p-3">
          {product.category ? (
            <Text className="text-[11px] font-medium text-gray-600 mb-1">
              {product.category}
            </Text>
          ) : null}

          <Text
            numberOfLines={2}
            className="text-sm font-bold text-[#111827] leading-tight mb-1.5 min-h-[36px]"
          >
            {product.name}
          </Text>

          {/* Rating row — plain yellow stars + gray count, matches web */}
          <View className="flex-row items-center mb-1.5">
            {Array.from({ length: 5 }).map((_, i) => {
              const filled = i < Math.floor(product.rating ?? 0);
              return (
                <Star
                  key={i}
                  size={12}
                  color={filled ? "#facc15" : "#d1d5db"}
                  fill={filled ? "#facc15" : "transparent"}
                  strokeWidth={2}
                />
              );
            })}
            <Text className="text-gray-600 text-[11px] ml-1">
              {product.rating ?? 0} ({reviews})
            </Text>
          </View>

          {/* Price row — matches web: price + strikethrough original + discount pill */}
          <View className="flex-row items-center flex-wrap gap-1.5 mb-2.5">
            <Text className="text-lg font-black text-[#111827]">
              {fmtCurrency(displayPrice)}
            </Text>
            {product.originalPrice ? (
              <Text className="text-xs text-red-500 line-through font-medium opacity-80">
                {fmtCurrency(product.originalPrice)}
              </Text>
            ) : null}
            {product.discount && product.discount > 0 ? (
              <View style={{ backgroundColor: '#1A2830', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                <Text style={{ color: '#ffffff', fontSize: 10, fontWeight: '700' }}>
                  {product.discount}% OFF
                </Text>
              </View>
            ) : null}
          </View>

          {/* Quantity stepper — ALWAYS rendered so every card in a row has
            identical height. Dimmed for variant/out-of-stock products.
            + disabled when quantity reaches available stock.
            - disabled when quantity is at minimum (1). */}
          {(() => {
            const stepperOff = hasVariants || !isActuallyInStock;
            const decOff = stepperOff || quantity <= 1;
            const incOff = stepperOff || quantity >= currentStock;
            return (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  alignSelf: 'flex-start',
                  backgroundColor: '#f9fafb',
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: '#e5e7eb',
                  marginBottom: 8,
                  opacity: stepperOff ? 0.4 : 1,
                }}
              >
                <Pressable
                  onPress={dec}
                  disabled={decOff}
                  accessibilityRole="button"
                  accessibilityLabel="Decrease quantity"
                  hitSlop={4}
                >
                  <View
                    style={{
                      width: 38,
                      height: 36,
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: decOff ? 0.35 : 1,
                    }}
                  >
                    <Minus size={14} color="#111827" strokeWidth={2.5} />
                  </View>
                </Pressable>
                <Text
                  style={{
                    minWidth: 28,
                    textAlign: 'center',
                    fontSize: 14,
                    fontWeight: '800',
                    color: '#111827',
                  }}
                >
                  {quantity}
                </Text>
                <Pressable
                  onPress={inc}
                  disabled={incOff}
                  accessibilityRole="button"
                  accessibilityLabel={
                    incOff && !stepperOff
                      ? `Maximum stock reached (${currentStock})`
                      : 'Increase quantity'
                  }
                  hitSlop={4}
                >
                  <View
                    style={{
                      width: 38,
                      height: 36,
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: incOff ? 0.35 : 1,
                    }}
                  >
                    <Plus size={14} color="#111827" strokeWidth={2.5} />
                  </View>
                </Pressable>
              </View>
            );
          })()}

          <Pressable
            onPress={handleAddToCart}
            disabled={!isActuallyInStock || isAddingToCart}
            accessibilityRole="button"
            accessibilityLabel={
              !isActuallyInStock
                ? 'Out of stock'
                : hasVariants
                  ? 'Choose options — select size or color'
                  : 'Add to cart'
            }
          >
            <View
              style={{
                width: '100%',
                height: 44,
                borderRadius: 12,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: !isActuallyInStock ? '#f3f4f6' : '#111827',
              }}
            >
              {isAddingToCart ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <ShoppingCart
                    size={16}
                    color={isActuallyInStock ? '#ffffff' : '#94a3b8'}
                    strokeWidth={2.5}
                  />
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: '700',
                      marginLeft: 6,
                      color: isActuallyInStock ? '#ffffff' : '#94a3b8',
                    }}
                  >
                    {!isActuallyInStock
                      ? 'Out of Stock'
                      : hasVariants
                        ? 'Choose Options'
                        : 'Add to Cart'}
                  </Text>
                </>
              )}
            </View>
          </Pressable>
        </View>
      </Pressable>
    </View>
  );
}

const ProductCard = memo(ProductCardImpl);
ProductCard.displayName = "ProductCard";
export { ProductCard };
export default ProductCard;
