import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { ShoppingCart, Heart, Plus, Minus } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { cartService } from '@/services/cartService';
import { wishlistService } from '@/services/wishlistService';
import { userAuthService } from '@/services/userAuthService';
import { Product as ServiceProduct } from '@/services/productService';
import { PublicProduct } from '@/services/publicProductService';
import { showSuccessToast, showErrorToast } from '@/lib/toast-utils';

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
  'basePrice' in p || 'adminFixedPrice' in p;

function getPrimaryImage(product: Product): string | undefined {
  if (!product.images || !Array.isArray(product.images) || product.images.length === 0)
    return undefined;
  const first = product.images[0];
  if (typeof first === 'object' && first !== null && 'url' in first) {
    const imgs = product.images as Array<{ url: string; isPrimary: boolean }>;
    return (
      imgs.find(i => i.isPrimary && i.url?.trim())?.url ||
      imgs.find(i => i.url?.trim())?.url
    );
  }
  if (typeof first === 'string') {
    return (product.images as string[]).find(i => i?.trim());
  }
  return undefined;
}

function getDisplayPrice(product: Product): number {
  if (isServiceProduct(product)) {
    return product.adminFixedPrice != null ? product.adminFixedPrice : product.basePrice;
  }
  return (product as any).price ?? 0;
}

function getCurrentStock(product: Product): number {
  if (isServiceProduct(product)) {
    return (
      product.inventory?.currentStock ??
      (product.hasVariants ? 0 : product.totalStock) ??
      0
    );
  }
  return (product as any).stock ?? 1;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function ProductCard({ product }: { product: Product }) {
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [isTogglingWishlist, setIsTogglingWishlist] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const auth = await userAuthService.isAuthenticated();
        if (!mounted) return;
        setIsAuthenticated(auth);
        const inWl = auth
          ? await wishlistService.isInWishlist(product.id)
          : await wishlistService.isInLocalWishlist(product.id);
        if (mounted) setIsInWishlist(inWl);
      } catch { /* ignore */ }
    })();
    return () => { mounted = false; };
  }, [product.id]);

  const imageUrl = getPrimaryImage(product);
  const displayPrice = getDisplayPrice(product);
  const currentStock = getCurrentStock(product);
  const isActuallyInStock = product.inStock && currentStock > 0;

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleAddToCart = async () => {
    if (!isAuthenticated) {
      showErrorToast('Login Required', 'Please login to add items to cart');
      setTimeout(() => router.push('/(auth)/Login' as any), 1200);
      return;
    }
    if (!isActuallyInStock) {
      showErrorToast('Out of Stock', 'This product is currently out of stock');
      return;
    }
    setIsAddingToCart(true);
    try {
      await cartService.addToCart(product.id, quantity);
      showSuccessToast('Added to Cart', `${quantity} × ${product.name} added`);
      setQuantity(1);
    } catch (e: any) {
      showErrorToast('Failed', e.message || 'Unable to add item to cart');
    } finally {
      setIsAddingToCart(false);
    }
  };

  const handleToggleWishlist = async () => {
    if (!isAuthenticated) {
      showErrorToast('Login Required', 'Please login to use wishlist');
      setTimeout(() => router.push('/(auth)/Login' as any), 1200);
      return;
    }
    setIsTogglingWishlist(true);
    try {
      if (isInWishlist) {
        await wishlistService.removeFromWishlist(product.id);
        setIsInWishlist(false);
        showSuccessToast('Removed', `${product.name} removed from wishlist`);
      } else {
        await wishlistService.addToWishlist(product.id);
        setIsInWishlist(true);
        showSuccessToast('Saved', `${product.name} added to wishlist`);
      }
    } catch (e: any) {
      showErrorToast('Failed', e.message || 'Unable to update wishlist');
    } finally {
      setIsTogglingWishlist(false);
    }
  };

  return (
    <TouchableOpacity
      onPress={() => router.push(`(any)/products/${product.id}` as any)}
      activeOpacity={0.93}
      style={{
        backgroundColor: '#ffffff',
        borderRadius: 14,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#e5e5e5',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 3,
        flex: 1,
      }}
    >
      {/* ── Image Area ──────────────────────────────────────────────────────── */}
      <View style={{ position: 'relative', height: 150, backgroundColor: '#f5f5f5' }}>
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
          />
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ShoppingCart size={40} color="#d4d4d4" />
          </View>
        )}


        {/* Wishlist button — top RIGHT */}
        <TouchableOpacity
          onPress={handleToggleWishlist}
          disabled={isTogglingWishlist}
          activeOpacity={0.8}
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            width: 34,
            height: 34,
            borderRadius: 17,
            backgroundColor: 'rgba(255,255,255,0.94)',
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: isInWishlist ? '#fca5a5' : '#e5e5e5',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.12,
            shadowRadius: 4,
            elevation: 3,
          }}
        >
          <Heart
            size={15}
            color={isInWishlist ? '#ef4444' : '#737373'}
            fill={isInWishlist ? '#ef4444' : 'transparent'}
          />
        </TouchableOpacity>

        {/* Bottom strip — OUT OF STOCK or DISCOUNT */}
        {(!isActuallyInStock || (product.discount && product.discount > 0)) && (
          <View
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              backgroundColor: !isActuallyInStock ? 'rgba(0,0,0,0.80)' : 'rgba(0,0,0,0.68)',
              paddingVertical: 5,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: '#ffffff', fontSize: 11, fontWeight: '800', letterSpacing: 0.6 }}>
              {!isActuallyInStock ? 'OUT OF STOCK' : `${product.discount}% OFF`}
            </Text>
          </View>
        )}

        {/* Out of stock dim overlay */}
        {!isActuallyInStock && (
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(255,255,255,0.4)',
            }}
          />
        )}
      </View>

      {/* ── Info Area ───────────────────────────────────────────────────────── */}
      <View style={{ padding: 11, flex: 1 }}>
        {/* Category */}
        {product.category ? (
          <Text
            style={{
              fontSize: 9,
              fontWeight: '600',
              color: '#a3a3a3',
              marginBottom: 3,
              textTransform: 'uppercase',
              letterSpacing: 0.8,
            }}
          >
            {product.category}
          </Text>
        ) : null}

        {/* Product name */}
        <Text
          numberOfLines={2}
          style={{
            fontSize: 13,
            fontWeight: '700',
            color: '#0a0a0a',
            lineHeight: 18,
            minHeight: 36,
            marginBottom: 8,
          }}
        >
          {product.name}
        </Text>

        {/* Price row */}
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, marginBottom: 10 }}>
          {/* Sale price */}
          <Text style={{ fontSize: 17, fontWeight: '800', color: '#0a0a0a' }}>
            ₹{displayPrice.toFixed(2)}
          </Text>

          {/* Original price — red, strikethrough */}
          {product.originalPrice && product.originalPrice > displayPrice && (
            <Text
              style={{
                fontSize: 12,
                color: '#dc2626',
                textDecorationLine: 'line-through',
                fontWeight: '500',
              }}
            >
              ₹{product.originalPrice.toFixed(2)}
            </Text>
          )}
        </View>

        {/* Quantity stepper — only when in stock */}
        {/* {isActuallyInStock && (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: 10,
              gap: 6,
            }}
          >
            <Text style={{ fontSize: 11, color: '#737373', fontWeight: '600' }}>Qty:</Text>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: '#f5f5f5',
                borderRadius: 7,
                borderWidth: 1,
                borderColor: '#e5e5e5',
                overflow: 'hidden',
              }}
            >
              <TouchableOpacity
                onPress={() => setQuantity(q => Math.max(1, q - 1))}
                disabled={quantity <= 1}
                style={{ paddingHorizontal: 9, paddingVertical: 5 }}
              >
                <Minus size={12} color={quantity <= 1 ? '#d4d4d4' : '#404040'} />
              </TouchableOpacity>
              <Text
                style={{
                  paddingHorizontal: 10,
                  fontSize: 13,
                  fontWeight: '700',
                  color: '#0a0a0a',
                  borderLeftWidth: 1,
                  borderRightWidth: 1,
                  borderColor: '#e5e5e5',
                }}
              >
                {quantity}
              </Text>
              <TouchableOpacity
                onPress={() => setQuantity(q => q + 1)}
                style={{ paddingHorizontal: 9, paddingVertical: 5 }}
              >
                <Plus size={12} color="#404040" />
              </TouchableOpacity>
            </View>
          </View>
        )} */}

        {/* Add to Cart button */}
        <TouchableOpacity
          onPress={handleAddToCart}
          disabled={!isActuallyInStock || isAddingToCart}
          activeOpacity={0.85}
          style={{
            backgroundColor: isActuallyInStock ? '#0a0a0a' : '#e5e5e5',
            borderRadius: 9,
            paddingVertical: 11,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
          }}
        >
          {isAddingToCart ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <ShoppingCart size={14} color={isActuallyInStock ? '#ffffff' : '#a3a3a3'} />
          )}
          <Text
            style={{
              color: isActuallyInStock ? '#ffffff' : '#a3a3a3',
              fontSize: 12,
              fontWeight: '700',
              letterSpacing: 0.3,
            }}
          >
            {isAddingToCart ? 'Adding…' : isActuallyInStock ? 'Add to Cart' : 'Out of Stock'}
          </Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}
