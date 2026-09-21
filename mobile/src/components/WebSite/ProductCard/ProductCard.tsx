import React, { memo, useCallback, useEffect, useRef, useState } from "react";
import { View, Text, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { Heart, ShoppingCart } from "lucide-react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { userAuthService } from "@/services/userAuthService";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { Product as ServiceProduct } from "@/services/productService";
import { PublicProduct } from "@/services/publicProductService";
import { showSuccessToast, showErrorToast } from "@/lib/toast-utils";
import { ActiveOffer } from "@/lib/offers";
import {
  getRegionalPrice,
  getRegionalOriginalPrice,
  isVisibleInRegion,
  formatPrice as fmtCurrency,
} from "@/lib/currency";
import { FaceRatingRow } from "@/components/WebSite/Shared/FaceRating";
import { Fonts } from "@/constants/theme";

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
    const imgs = product.images as { url: string; isPrimary: boolean }[];
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
  const [isAdded, setIsAdded] = useState(false);
  const [isTogglingWishlist, setIsTogglingWishlist] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // "Added" is a 1.8s confirmation on the CTA. Kept in a ref so unmounting
  // mid-countdown — tapping through to the product, or the list re-filtering —
  // cancels it instead of setting state on a component that is gone.
  const addedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (addedTimer.current) clearTimeout(addedTimer.current);
    },
    [],
  );

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
  const regionalOriginalPrice = getRegionalOriginalPrice(product as any);
  const activeOffer: ActiveOffer | undefined = (product as PublicProduct).activeOffer;
  const effectivePrice = activeOffer ? activeOffer.offerPrice : displayPrice;
  const strikePrice = activeOffer
    ? activeOffer.originalPrice
    : regionalOriginalPrice ?? undefined;

  // Percent off, derived from the two prices actually on screen.
  const discountPct =
    strikePrice && effectivePrice && strikePrice > effectivePrice
      ? Math.round((1 - effectivePrice / strikePrice) * 100)
      : null;

  // Fallback for payloads that carry only `discount`. That field is a flat
  // CURRENCY amount, not a percent, so it gets its own label — rendering it as
  // "12% OFF" when it means "₹12 off" is the kind of wrong that sells at the
  // wrong price. Formatted through fmtCurrency so USD storefronts read right.
  const rawDiscount = (product as any).discount;
  const discountAmount =
    discountPct === null && typeof rawDiscount === "number" && rawDiscount > 0
      ? rawDiscount
      : null;

  const isActuallyInStock = isServiceProduct(product)
    ? (product.totalStock ?? 0) > 0
    : (product as any).inStock !== false;
  const hasVariants = isServiceProduct(product) ? !!(product as any).hasVariants : false;

  // Region visibility decides whether this card renders at all, but the check
  // CANNOT short-circuit here: the three useCallback hooks below would then be
  // skipped on hidden products and React would see a different hook count
  // between renders. Evaluated now, applied after every hook has run.
  const hiddenInRegion = !isVisibleInRegion((product as any).priceVisibility);

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
      setIsAdded(true);
      if (addedTimer.current) clearTimeout(addedTimer.current);
      addedTimer.current = setTimeout(() => setIsAdded(false), 1800);
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

  if (hiddenInRegion) return null;

  return (
    <Pressable
      onPress={openDetails}
      accessibilityRole="button"
      accessibilityLabel={`${product.name}, ${fmtCurrency(effectivePrice)}${
        !isActuallyInStock ? ", out of stock" : ""
      }`}
      /* Plain style: s.card carries this card's white fill, border and
         radius, so a dropped style function strips the card itself. */
      android_ripple={{ color: "rgba(15,23,42,0.06)" }}
      style={s.card}
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
        {discountPct ? (
          <View style={s.discountPill}>
            <Text style={s.discountText}>{discountPct}% OFF</Text>
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
        {/* Name + rating grow, so the price and the button stay bottom-aligned
            across a row no matter how many lines each name takes. The web does
            the same thing — "Meta block grows so the price + action stay
            bottom-aligned across cards".

            Without it, a two-line name next to a one-line name pushed that
            card's price and Add to Cart button roughly 20pt lower than its
            neighbour's, which is visible on every row with mixed name lengths. */}
        <View style={s.meta}>
          {/* Two lines, matching the web's `line-clamp-2`. At one line a name as
              ordinary as "Multi Mono Checked Terry Towel" truncated mid-word. */}
          <Text numberOfLines={2} style={s.name}>
            {product.name}
          </Text>

          {/* FaceRating — shows face + rating when rating >= 3.5, otherwise review count */}
          <FaceRatingRow
            rating={Number((product as any).rating) || 0}
            reviewCount={Number((product as any).reviews) || 0}
            size={13}
          />
        </View>

        {/* Price row — effective price from activeOffer if present */}
        <View style={s.priceRow}>
          <Text style={s.price}>{fmtCurrency(effectivePrice)}</Text>
          {strikePrice && strikePrice > effectivePrice ? (
            <Text style={s.originalPrice}>{fmtCurrency(strikePrice)}</Text>
          ) : null}
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
            <>
              {/* The web pairs the label with a cart glyph at h-3.5 (14px). */}
              <ShoppingCart
                size={14}
                color={isActuallyInStock ? "#ffffff" : "#9ca3af"}
                strokeWidth={2}
              />
              <Text style={[s.ctaText, !isActuallyInStock && s.ctaTextDisabled]}>
                {isAdded
                  ? "Added"
                  : !isActuallyInStock
                    ? "Unavailable"
                    : hasVariants
                      ? "Choose Options"
                      : "Add to Cart"}
              </Text>
            </>
          )}
        </Pressable>
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  /* Geometry and colour are the web's `showcase` variant — the one the home
     page actually renders (frontend ProductCard.tsx). Mobile had been built to
     the `grid` variant instead, which is why the cards read differently from
     the site: grid is a cool-neutral listing card, showcase is a warm one
     designed to sit on the home page's linen ground. The warm ring and the
     resting shadow are the web's stated reason — "a white card on a near-white
     page has nothing separating it from the surface". */
  card: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#e3d7c9",
    shadowColor: "#4a3226",
    shadowOpacity: 0.45,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 13,
    elevation: 3,
  },
  // aspect-[5/4]. Was 1.15, so every product image on the home page was
  // cropped to a slightly different frame than the site shows.
  imageWrap: { position: "relative", width: "100%", aspectRatio: 1.25, backgroundColor: "#f3f1ee" },
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
  discountText: { fontFamily: Fonts.sansBold, color: "#fff", fontSize: 10, fontWeight: "800" },

  outOfStockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  outOfStockPill: { backgroundColor: "rgba(31,41,55,0.9)", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  outOfStockText: { fontFamily: Fonts.sansBold, color: "#fff", fontSize: 10, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase" },

  // `flex: 1` so the info block takes whatever height is left under the image;
  // `meta` then grows inside it and the price + CTA settle at the bottom.
  info: { padding: 10, flex: 1 },
  meta: { flexGrow: 1 },
  // Poppins 600 at 13px, not Outfit Bold at 13.5 — the web sets product names
  // in the display face (`font-playfair`, which resolves to Poppins) and drops
  // the weight to 600 in showcase. `leading-snug` and `tracking-tight`
  // resolved against 13px give 17.9 and -0.325.
  name: {
    fontFamily: Fonts.heading,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 17.9,
    letterSpacing: -0.325,
    color: "#1a1a1a",
    marginBottom: 8,
    /* Always two lines tall, whether the name needs one or two.
       The `meta` flexGrow above bottom-aligns the price and button, but that
       only works when the cards themselves are stretched to a common height —
       true in the wrapped grid rows, NOT inside a horizontal rail, where each
       card is only as tall as its own content. Reserving the second line makes
       every card identical by construction instead of by layout, so the prices
       and the Add to Cart buttons line up in both. 2 × 17.9 lineHeight. */
    minHeight: 35.8,
  },

  priceRow: { flexDirection: "row", alignItems: "baseline", gap: 6, marginBottom: 10 },
  // Showcase deliberately drops the price's weight (600, not extrabold): "In
  // the grid the price is the hero — correct for a listing. In a handpicked
  // showcase the product is."
  price: {
    fontFamily: Fonts.sansSemibold,
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: -0.4,
    color: "#1a1a1a",
  },
  originalPrice: {
    fontFamily: Fonts.sans,
    fontSize: 11,
    color: "#8a7d72",
    textDecorationLine: "line-through",
  },

  /* One Add to Cart button, everywhere.
     The web has two: a solid red one on its listing grid and a calm cream one
     in the home showcase, because on a desktop "four solid red slabs side by
     side were the loudest shape in the section". Carrying both into the app
     meant the same button changed colour depending on which screen you reached
     it from, which on a phone — where you meet one card at a time rather than
     a full row at once — reads as inconsistency rather than as restraint.

     36pt rather than the web's 28/32: this is the primary action on the card,
     and the project's own ctaPill.ts puts the thumb floor at 44. A listing
     card cannot spare 44, but it can spare more than 28. */
  cta: {
    height: 36,
    borderRadius: 8,
    backgroundColor: "#e01a1b",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  ctaDisabled: { backgroundColor: "#f3f4f6" },
  ctaText: {
    fontFamily: Fonts.sansSemibold,
    color: "#ffffff",
    fontSize: 12.5,
    fontWeight: "600",
  },
  ctaTextDisabled: { color: "#9ca3af" },
});


const ProductCard = memo(ProductCardImpl);
ProductCard.displayName = "ProductCard";
export { ProductCard };
export default ProductCard;