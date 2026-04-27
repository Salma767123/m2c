import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, type ViewStyle } from 'react-native';

/* ── Shimmer Skeleton Primitive ───────────────────────────────────────────── */
interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Skeleton({ width = '100%', height = 16, borderRadius = 8, style }: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 800, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        sk.base,
        { width: width as any, height, borderRadius, opacity },
        style,
      ]}
    />
  );
}

/* ── Pre-built skeleton layouts for common screens ────────────────────────── */

/** Cart item skeleton — matches Cart.tsx item card layout */
export function CartItemSkeleton() {
  return (
    <View style={sk.cartCard}>
      <View style={sk.cartRow}>
        <Skeleton width={64} height={64} borderRadius={10} />
        <View style={sk.cartInfo}>
          <Skeleton width="70%" height={14} />
          <Skeleton width="40%" height={10} style={sk.mt6} />
          <View style={sk.cartPriceRow}>
            <Skeleton width={60} height={16} />
            <Skeleton width={80} height={28} borderRadius={8} />
            <Skeleton width={50} height={14} />
          </View>
        </View>
      </View>
    </View>
  );
}

export function CartSkeleton() {
  return (
    <View style={sk.screenPad}>
      <CartItemSkeleton />
      <CartItemSkeleton />
      <CartItemSkeleton />
      {/* Promo code skeleton */}
      <View style={sk.promoCard}>
        <Skeleton width={100} height={14} />
        <View style={sk.promoRow}>
          <Skeleton width="65%" height={44} borderRadius={10} />
          <Skeleton width="30%" height={44} borderRadius={10} />
        </View>
      </View>
    </View>
  );
}

/** Wishlist item skeleton */
export function WishlistItemSkeleton() {
  return (
    <View style={sk.cartCard}>
      <View style={sk.cartRow}>
        <Skeleton width={64} height={64} borderRadius={10} />
        <View style={sk.cartInfo}>
          <Skeleton width="75%" height={14} />
          <View style={sk.cartPriceRow}>
            <Skeleton width={60} height={16} />
            <Skeleton width={60} height={30} borderRadius={8} />
          </View>
        </View>
      </View>
    </View>
  );
}

export function WishlistSkeleton() {
  return (
    <View style={sk.screenPad}>
      <WishlistItemSkeleton />
      <WishlistItemSkeleton />
      <WishlistItemSkeleton />
      <WishlistItemSkeleton />
    </View>
  );
}

/** Product detail skeleton */
export function ProductDetailSkeleton() {
  return (
    <View style={sk.detailRoot}>
      {/* Hero image */}
      <Skeleton width="100%" height={360} borderRadius={0} />
      {/* Thumbnails */}
      <View style={sk.thumbRow}>
        <Skeleton width={64} height={64} borderRadius={12} />
        <Skeleton width={64} height={64} borderRadius={12} />
        <Skeleton width={64} height={64} borderRadius={12} />
      </View>
      {/* Header */}
      <View style={sk.detailPad}>
        <Skeleton width={100} height={10} style={sk.mt8} />
        <Skeleton width="85%" height={22} style={sk.mt10} />
        <Skeleton width={120} height={14} style={sk.mt10} />
        {/* Price card */}
        <View style={sk.priceCard}>
          <Skeleton width={140} height={30} />
          <Skeleton width={80} height={12} style={sk.mt6} />
        </View>
        {/* Variants */}
        <Skeleton width={120} height={14} style={sk.mt16} />
        <View style={sk.variantRow}>
          <Skeleton width={150} height={210} borderRadius={16} />
          <Skeleton width={150} height={210} borderRadius={16} />
        </View>
      </View>
    </View>
  );
}

/** Order card skeleton */
export function OrderCardSkeleton() {
  return (
    <View style={sk.orderCard}>
      <View style={sk.orderHeader}>
        <Skeleton width={100} height={12} />
        <Skeleton width={70} height={24} borderRadius={6} />
      </View>
      <View style={sk.orderBody}>
        <Skeleton width={48} height={48} borderRadius={8} />
        <View style={sk.orderInfo}>
          <Skeleton width="70%" height={14} />
          <Skeleton width="40%" height={11} style={sk.mt6} />
        </View>
        <Skeleton width={60} height={14} />
      </View>
    </View>
  );
}

export function OrdersSkeleton() {
  return (
    <View style={sk.screenPad}>
      <OrderCardSkeleton />
      <OrderCardSkeleton />
      <OrderCardSkeleton />
    </View>
  );
}

/** Profile skeleton */
export function ProfileSkeleton() {
  return (
    <View style={sk.screenPad}>
      {/* Avatar + name */}
      <View style={sk.profileTop}>
        <Skeleton width={80} height={80} borderRadius={40} />
        <View style={sk.profileInfo}>
          <Skeleton width={150} height={18} />
          <Skeleton width={200} height={13} style={sk.mt6} />
          <Skeleton width={100} height={11} style={sk.mt6} />
        </View>
      </View>
      {/* Menu items */}
      <View style={sk.profileMenu}>
        <Skeleton width="100%" height={48} borderRadius={12} />
        <Skeleton width="100%" height={48} borderRadius={12} />
        <Skeleton width="100%" height={48} borderRadius={12} />
        <Skeleton width="100%" height={48} borderRadius={12} />
      </View>
      {/* Form fields */}
      <View style={sk.profileForm}>
        <Skeleton width={80} height={12} />
        <Skeleton width="100%" height={44} borderRadius={10} style={sk.mt6} />
        <Skeleton width={80} height={12} style={sk.mt16} />
        <Skeleton width="100%" height={44} borderRadius={10} style={sk.mt6} />
        <Skeleton width={80} height={12} style={sk.mt16} />
        <Skeleton width="100%" height={44} borderRadius={10} style={sk.mt6} />
      </View>
    </View>
  );
}

/** Checkout skeleton */
export function CheckoutSkeleton() {
  return (
    <View style={sk.screenPad}>
      <Skeleton width={160} height={18} />
      <Skeleton width="100%" height={44} borderRadius={10} style={sk.mt10} />
      <Skeleton width="100%" height={44} borderRadius={10} style={sk.mt10} />
      <Skeleton width="100%" height={44} borderRadius={10} style={sk.mt10} />
      <Skeleton width={120} height={18} style={sk.mt16} />
      <Skeleton width="100%" height={44} borderRadius={10} style={sk.mt10} />
      <Skeleton width="100%" height={44} borderRadius={10} style={sk.mt10} />
      <View style={sk.checkoutSummary}>
        <Skeleton width="100%" height={14} />
        <Skeleton width="100%" height={14} style={sk.mt8} />
        <Skeleton width="100%" height={14} style={sk.mt8} />
        <Skeleton width="100%" height={52} borderRadius={14} style={sk.mt16} />
      </View>
    </View>
  );
}

/* ── Styles ────────────────────────────────────────────────────────────────── */
const sk = StyleSheet.create({
  base: { backgroundColor: '#e5e7eb' },

  // Spacing helpers
  mt6: { marginTop: 6 },
  mt8: { marginTop: 8 },
  mt10: { marginTop: 10 },
  mt16: { marginTop: 16 },

  // Screen padding
  screenPad: { padding: 16, gap: 10 },

  // Cart / Wishlist items
  cartCard: {
    backgroundColor: '#ffffff', borderRadius: 14, padding: 12,
    borderWidth: 1, borderColor: '#f3f4f6',
  },
  cartRow: { flexDirection: 'row', gap: 12 },
  cartInfo: { flex: 1, gap: 6 },
  cartPriceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },

  // Promo
  promoCard: {
    backgroundColor: '#ffffff', borderRadius: 16, padding: 16, gap: 10,
    borderWidth: 1, borderColor: '#f3f4f6',
  },
  promoRow: { flexDirection: 'row', gap: 10 },

  // Product detail
  detailRoot: { backgroundColor: '#f8fafc' },
  thumbRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 12 },
  detailPad: { paddingHorizontal: 20, paddingTop: 8 },
  priceCard: {
    backgroundColor: '#f3f4f6', borderRadius: 16, padding: 16, marginTop: 16,
  },
  variantRow: { flexDirection: 'row', gap: 12, marginTop: 12 },

  // Orders
  orderCard: {
    backgroundColor: '#ffffff', borderRadius: 14, padding: 14, gap: 12,
    borderWidth: 1, borderColor: '#f3f4f6',
  },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderBody: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  orderInfo: { flex: 1, gap: 4 },

  // Profile
  profileTop: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 8 },
  profileInfo: { flex: 1 },
  profileMenu: { gap: 8, marginTop: 16 },
  profileForm: { marginTop: 20 },

  // Checkout
  checkoutSummary: { marginTop: 24, padding: 16, backgroundColor: '#f9fafb', borderRadius: 14 },
});
