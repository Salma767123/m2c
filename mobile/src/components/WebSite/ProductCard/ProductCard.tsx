import React, { memo, useCallback, useEffect, useState } from "react";
import { View, Text, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { Heart, ShoppingCart } from "lucide-react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { cartService } from "@/services/cartService";
import { userAuthService } from "@/services/userAuthService";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { Product as ServiceProduct } from "@/services/productService";
import { PublicProduct } from "@/services/publicProductService";
import { showSuccessToast, showErrorToast } from "@/lib/toast-utils";
import {
  getRegionalPrice,
  getRegionalOriginalPrice,
  formatPrice as fmtCurrency,
} from "@/lib/currency";

// ─── Types ─────────────────────────────────────────────────────────────────
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

const isServiceProduct = (p: any): p is ServiceProduct =>
  "basePrice" in p || "adminFixedPrice" in p;

function getPrimaryImage(product: Product): string | undefined {
  if (!product.images || !Array.isArray(product.images) || product.images.length === 0)
    return undefined;
  const first = product.images[0];
  if (typeof first === "object" && first !== null && "url" in first) {
    const imgs = product.images as Array<{ url: string; isPrimary: boolean }>;
    return imgs.find((i) => i.isPrimary && i.url?.trim())?.url ||
      imgs.find((i) => i.url?.trim())?.url;
  }
  if (typeof first === "string") {
    return (product.images as string[]).find((i) => i?.trim());
  }
  return undefined;
}

function getDisplayPrice(product: Product): number {
  if (isServiceProduct(product)) return getRegionalPrice(product as any);
  return (product as any).price ?? 0;
}

// ─── Component ───────────────────────────────────────────────────────────
interface ProductCardProps {
  product: Product;
  onAddToCart?: (productId: string, quantity: number) => void | Promise<void>;
  onToggleWishlist?: (productId: string) => void | Promise<void>;
}

function ProductCardImpl({ product, onAddToCart, onToggleWishlist }: ProductCardProps) {
  const router = useRouter();
  const { addToCart: addToGlobalCart } = useCart();
  const {
    isInWishlist: isInGlobalWishlist,
    addToWishlist: addToGlobalWishlist,
    removeFromWishlist: removeFromGlobalWishlist,
  } = useWishlist();

  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [isTogglingWishlist, setIsTogglingWishlist] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const isInWishlist = isInGlobalWishlist(product.id);

  useEffect(() => {
    let mounted = true;
    userAuthService
      .isAuthenticated()
      .then((auth) => {
        if (mounted) setIsAuthenticated(auth);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  const imageUrl = getPrimaryImage(product);
  const displayPrice = getDisplayPrice(product);
  const originalPrice = getRegionalOriginalPrice(product as any);
  const isActuallyInStock = isServiceProduct(product)
    ? (product.totalStock ?? 0) > 0
    : (product as any).inStock !== false;
  const hasVariants = isServiceProduct(product) ? !!(product as any).hasVariants : false;

  const openDetails = useCallback(() => {
    router.push(`(any)/products/${product.id}` as any);
  }, [product.id, router]);

  const handleAddToCart = useCallback(async () => {
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
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      if (onAddToCart) {
        await onAddToCart(product.id, 1);
      } else {
        await addToGlobalCart(product.id, 1);
        showSuccessToast("Added to Cart!", `${product.name} has been added to your cart.`);
      }
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
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (isInWishlist) {
        await removeFromGlobalWishlist(product.id);
        showSuccessToast("Removed", `${product.name} has been removed from your wishlist.`);
      } else {
        await addToGlobalWishlist(product.id);
        showSuccessToast("Added to Wishlist!", `${product.name} has been saved to your wishlist.`);
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

  return (
    <Pressable
      onPress={openDetails}
      accessibilityRole="button"
      accessibilityLabel={`${product.name}, ${fmtCurrency(displayPrice)}${
        !isActuallyInStock ? ", out of stock" : ""
      }`}
      style={({ pressed }) => [s.card, pressed && { opacity: 0.96 }]}
    >
      {/* ── Image area ─────────────────────────────────────────────── */}
      <View style={s.imageWrap}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={s.image} contentFit="cover" transition={300} />
        ) : (
          <View style={[s.image, s.imageFallback]}>
            <ShoppingCart size={28} color="#94a3b8" />
          </View>
        )}

        {/* Wishlist — top LEFT */}
        <Pressable
          onPress={handleToggleWishlist}
          disabled={isTogglingWishlist}
          hitSlop={6}
          style={s.heartChip}
        >
          <Heart
            size={15}
            color={isInWishlist ? "#E01A1B" : "#111827"}
            fill={isInWishlist ? "#E01A1B" : "transparent"}
            strokeWidth={2.2}
          />
        </Pressable>

        {/* Discount badge — top RIGHT */}
        {product.discount && product.discount > 0 ? (
          <View style={s.discountPill}>
            <Text style={s.discountText}>₹{product.discount} OFF</Text>
          </View>
        ) : null}

        {!isActuallyInStock && (
          <View style={s.outOfStockOverlay}>
            <View style={s.outOfStockPill}>
              <Text style={s.outOfStockText}>Out of Stock</Text>
            </View>
          </View>
        )}
      </View>

      {/* ── Info area ──────────────────────────────────────────────── */}
      <View style={s.info}>
        <Text numberOfLines={1} style={s.name}>
          {product.name}
        </Text>

        {/* Price row */}
        <View style={s.priceRow}>
          <Text style={s.price}>{fmtCurrency(displayPrice)}</Text>
          {originalPrice ? <Text style={s.originalPrice}>{fmtCurrency(originalPrice)}</Text> : null}
        </View>

        {/* Add to Cart */}
        <Pressable
          onPress={handleAddToCart}
          disabled={!isActuallyInStock || isAddingToCart}
          style={[s.cta, !isActuallyInStock && s.ctaDisabled]}
        >
          {isAddingToCart ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={s.ctaText}>
              {!isActuallyInStock ? "Out of Stock" : hasVariants ? "Choose Options" : "Add to Cart"}
            </Text>
          )}
        </Pressable>
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#f1f5f9",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  imageWrap: { position: "relative", width: "100%", aspectRatio: 1.15, backgroundColor: "#fff" },
  image: { width: "100%", height: "100%" },
  imageFallback: { alignItems: "center", justifyContent: "center" },

  heartChip: {
    position: "absolute",
    top: 8,
    left: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(255,255,255,0.92)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  discountPill: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "#16a34a",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  discountText: { color: "#fff", fontSize: 10, fontWeight: "800" },

  outOfStockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  outOfStockPill: { backgroundColor: "rgba(31,41,55,0.9)", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  outOfStockText: { color: "#fff", fontSize: 10, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase" },

  info: { padding: 10 },
  name: { fontSize: 13.5, fontWeight: "700", color: "#111827", marginBottom: 8 },

  priceRow: { flexDirection: "row", alignItems: "baseline", gap: 6, marginBottom: 10 },
  price: { fontSize: 16, fontWeight: "800", color: "#111827" },
  originalPrice: { fontSize: 12, color: "#9ca3af", textDecorationLine: "line-through" },

  cta: {
    height: 40,
    borderRadius: 10,
    backgroundColor: "#E01A1B",
    alignItems: "center",
    justifyContent: "center",
  },
  ctaDisabled: { backgroundColor: "#e5e7eb" },
  ctaText: { color: "#fff", fontSize: 13, fontWeight: "700" },
});

const ProductCard = memo(ProductCardImpl);
ProductCard.displayName = "ProductCard";
export { ProductCard };
export default ProductCard;