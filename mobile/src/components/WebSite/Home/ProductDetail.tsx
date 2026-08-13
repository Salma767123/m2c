import React, { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import {
  View, Text, ScrollView, Pressable,
  ActivityIndicator, useWindowDimensions, StyleSheet, Modal,
  type NativeSyntheticEvent, type NativeScrollEvent, type LayoutChangeEvent,
} from 'react-native';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  Star, Heart, Truck, Package,
  ChevronDown, ShoppingCart, Tag, Check,
  Plane, Ship as ShipIcon, AlertTriangle, Info, Box,
  User, Award, Clock, X, Copy,
} from 'lucide-react-native';
import { calculateLogistics, formatWeight, formatDimensions, type LogisticsConfig } from '@/lib/logistics';
import {
  getRegionalPrice, getRegionalOriginalPrice, formatPrice as fmtCurrency,
  isVisibleInRegion, getRegion, getCurrency, convertINRtoUSD,
} from '@/lib/currency';
import { PublicProduct, publicProductService } from '@/services/publicProductService';
import { cartService } from '@/services/cartService';
import { couponService, type PopupCoupon } from '@/services/couponService';
import { offerService } from '@/services/offerService';
import { getCouriers, type Courier, transportModeLabel, isSurfaceRegion } from '@/lib/couriers';
import { courierService } from '@/services/courierService';
import { userAuthService } from '@/services/userAuthService';
import { showSuccessToast, showErrorToast } from '@/lib/toast-utils';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import { applyOfferToPrice, offerEndsLabel, type ActiveOffer, type PublicOffer } from '@/lib/offers';
import { hasManufacturerInfo, manufacturerDisplayName } from '@/lib/manufacturerInfo';
import ProductReviews from '@/components/WebSite/Review/ProductReviews';
import PromotionalPopup from '@/components/WebSite/PromotionalPopup/PromotionalPopup';
import CourierBadge from '@/components/Shared/CourierBadge';
import { ProductCard } from '@/components/WebSite/ProductCard/ProductCard';
import { Palette, Fonts } from '@/constants/theme';

interface ProductDetailProps {
  product: PublicProduct;
  productId: string;
}

export default function ProductDetail({ product, productId }: ProductDetailProps) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
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
  const [transportOverride, setTransportOverride] = useState<'AIR' | 'SHIP' | null>(null);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [isBuying, setIsBuying] = useState(false);
  const [showMakerModal, setShowMakerModal] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('description');
  const [showAllDetails, setShowAllDetails] = useState(false);
  const [relatedProducts, setRelatedProducts] = useState<PublicProduct[]>([]);
  const [promoOffers, setPromoOffers] = useState<PublicOffer[]>([]);
  const [categoryCoupon, setCategoryCoupon] = useState<PopupCoupon | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const reviewsY = useRef(0);

  // ── "Select shipping for a cart line" mode ──────────────────────────────
  const params = useLocalSearchParams<{
    selectShipping?: string;
    cartItem?: string;
    currentTransport?: string;
    currentCourier?: string;
  }>();
  const isEditingCartShipping = params.selectShipping === '1' && !!params.cartItem;
  const [selectedCourier, setSelectedCourier] = useState<string | null>(null);
  const [savingShipping, setSavingShipping] = useState(false);

  const isWishlisted = checkIsInWishlist(productId);

  // ── Derived values ─────────────────────────────────────────────────────
  const displayImages = selectedVariant?.images?.length > 0
    ? selectedVariant.images.map((url: string) => ({ url }))
    : product.images || [];

  const currentPrice = selectedVariant
    ? getRegionalPrice(selectedVariant as any)
    : getRegionalPrice(product as any);
  const originalPrice = selectedVariant
    ? getRegionalOriginalPrice(selectedVariant as any)
    : getRegionalOriginalPrice(product as any);

  const logisticsResult = useMemo(() => {
    if (!product.logisticsConfig) return null;
    return calculateLogistics(product.logisticsConfig as LogisticsConfig, quantity, transportOverride || undefined, getRegion());
  }, [product.logisticsConfig, quantity, transportOverride]);
  const savings = originalPrice && originalPrice > currentPrice ? originalPrice - currentPrice : 0;

  const currentStock = selectedVariant
    ? selectedVariant.stock
    : (product.inventory?.baseStock ?? (product.hasVariants ? 0 : product.totalStock) ?? 0);
  const isActuallyInStock = product.inStock && currentStock > 0;

  const visibleVariants = (product.variants || []).filter((v: any) => isVisibleInRegion(v.priceVisibility));
  const baseHasStock = (product.inventory?.baseStock ?? product.totalStock ?? 0) > 0;
  const nothingBuyable = product.hasVariants && visibleVariants.length === 0 && !baseHasStock;
  const courierMissing = !!(product.logisticsConfig && logisticsResult) && !selectedCourier;

  // ── Active offer (backend-attached) ────────────────────────────────────
  const activeOffer: ActiveOffer | undefined = product.activeOffer;
  const offeredPrice = activeOffer
    ? applyOfferToPrice(currentPrice, activeOffer, getCurrency(), quantity, convertINRtoUSD)
    : currentPrice;
  const hasOfferSaving = activeOffer != null && offeredPrice < currentPrice;
  const offerEnds = activeOffer ? offerEndsLabel(activeOffer.endsAt) : null;

  const fmt = (n: number) => fmtCurrency(n);
  // Shipping costs are stored in INR server-side — convert for USD storefronts.
  const fmtShip = (inr: number) => fmt(getCurrency() === 'USD' ? convertINRtoUSD(inr) : inr);

  const renderStars = (rating: number) =>
    [0, 1, 2, 3, 4].map(i => (
      <Star
        key={i}
        size={16}
        color={i < Math.floor(rating) ? '#f59e0b' : '#e5e7eb'}
        fill={i < Math.floor(rating) ? '#f59e0b' : 'transparent'}
      />
    ));

  const goReviews = () => scrollRef.current?.scrollTo({ y: Math.max(0, reviewsY.current - 8), animated: true });
  const onReviewsLayout = (e: LayoutChangeEvent) => { reviewsY.current = e.nativeEvent.layout.y; };

  // ── Offers / coupon / related data loads ───────────────────────────────
  useEffect(() => {
    let cancelled = false;
    offerService.getActiveOffers()
      .then((offers) => { if (!cancelled) setPromoOffers(Array.isArray(offers) ? offers.slice(0, 6) : []); })
      .catch(() => { if (!cancelled) setPromoOffers([]); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!product.category) { setCategoryCoupon(null); return; }
    let cancelled = false;
    couponService.getPopupCoupon(product.category)
      .then((c) => { if (!cancelled) setCategoryCoupon(c); })
      .catch(() => { if (!cancelled) setCategoryCoupon(null); });
    return () => { cancelled = true; };
  }, [product.category]);

  useEffect(() => {
    if (!product.id) { setRelatedProducts([]); return; }
    let cancelled = false;
    const subCat = product.subCategory;
    (async () => {
      const seen = new Map<string, PublicProduct>();
      const add = (items?: PublicProduct[]) => {
        (items || []).forEach((p) => { if (p.id !== product.id && !seen.has(p.id)) seen.set(p.id, p); });
      };
      try {
        if (product.category) {
          const r = await publicProductService.getProducts({ category: product.category, limit: 12 });
          if (r.success) add(r.data?.items);
        }
        if (seen.size < 4 && subCat) {
          const r = await publicProductService.getProducts({ subCategory: subCat, limit: 12 });
          if (r.success) add(r.data?.items);
        }
        if (seen.size < 4) {
          const r = await publicProductService.getProducts({ limit: 12, sortBy: 'createdAt', sortOrder: 'desc' });
          if (r.success) add(r.data?.items);
        }
        let list = Array.from(seen.values());
        if (product.fabricType) {
          const ft = product.fabricType;
          list = list.sort((a, b) => Number(b.fabricType === ft) - Number(a.fabricType === ft));
        }
        if (!cancelled) setRelatedProducts(list.slice(0, 4));
      } catch {
        if (!cancelled) setRelatedProducts([]);
      }
    })();
    return () => { cancelled = true; };
  }, [product.id, product.category, product.subCategory, product.fabricType]);

  // ── Cart-edit mode: preselect from cart params ──────────────────────────
  useEffect(() => {
    if (!isEditingCartShipping) return;
    if (params.currentTransport) setTransportOverride(params.currentTransport as 'AIR' | 'SHIP');
    if (params.currentCourier) setSelectedCourier(params.currentCourier);
  }, [isEditingCartShipping, params.currentTransport, params.currentCourier]);

  // ── Courier list management ────────────────────────────────────────────
  // Admin-managed couriers, loaded once for this region (also primes the registry so
  // courierName()/courierById() resolve ids later in cart/orders).
  const [allCouriers, setAllCouriers] = useState<Courier[]>([]);
  useEffect(() => {
    courierService.getActiveCouriers(getRegion()).then(setAllCouriers).catch(() => setAllCouriers([]));
  }, []);

  // Courier partners available for this shopper's region + chosen transport mode. When
  // the product has selected specific couriers (logisticsConfig.courierIds), restrict to
  // those; otherwise (legacy products) show all region+mode couriers. Falls back to the
  // static slug catalogue if the DB list isn't loaded (offline / fetch failure).
  const courierOptions = useMemo(() => {
    if (!logisticsResult) return [];
    const region = getRegion();
    const mode = logisticsResult.selectedTransport;
    const picked = (product.logisticsConfig as { courierIds?: string[] } | undefined)?.courierIds;
    const source = allCouriers.length > 0 ? allCouriers : getCouriers(region, mode);
    return source.filter((c) =>
      c.region === region &&
      c.modes.includes(mode) &&
      (!picked || picked.length === 0 || picked.includes(c.id))
    );
  }, [allCouriers, logisticsResult, product.logisticsConfig]);

  // Drop a courier that no longer belongs to the current mode list.
  useEffect(() => {
    if (selectedCourier && !courierOptions.some((c) => c.id === selectedCourier)) {
      setSelectedCourier(null);
    }
  }, [courierOptions, selectedCourier]);

  // ── Handle confirming shipping for cart edit mode ───────────────────────
  const handleConfirmShipping = async () => {
    if (!params.cartItem || !logisticsResult) return;
    setSavingShipping(true);
    try {
      const mode = transportOverride || logisticsResult.selectedTransport;
      const auth = await userAuthService.isAuthenticated();
      const updates = { transportType: mode, courier: selectedCourier };
      if (auth) {
        await cartService.updateCartItemShipping(params.cartItem, updates);
      } else {
        await cartService.updateLocalCartItemShipping(params.cartItem, updates);
      }
      refreshCart();
      showSuccessToast('Shipping Updated', 'Your shipping method has been saved.');
      router.back();
    } catch (e: any) {
      showErrorToast('Failed', e.message || 'Could not save shipping method');
    } finally {
      setSavingShipping(false);
    }
  };

  // ── Handlers ───────────────────────────────────────────────────────────
  const requireLogin = () => {
    showErrorToast('Login Required', 'Please login to continue');
    setTimeout(() => router.push('/(auth)/Login' as any), 1500);
  };

  const handleAddToCart = async () => {
    const auth = await userAuthService.isAuthenticated();
    if (!auth) { requireLogin(); return; }
    if (courierMissing) {
      showErrorToast('Courier required', 'Please choose a courier partner before adding to cart.');
      return;
    }
    setIsAddingToCart(true);
    try {
      if (typeof Haptics !== 'undefined') await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const shipping = logisticsResult
        ? { transportType: logisticsResult.selectedTransport, courier: selectedCourier || undefined }
        : undefined;
      await addToGlobalCart(product.id, quantity, selectedVariant?.id, shipping);

      const variantInfo = selectedVariant
        ? ` (${selectedVariant.size} - ${selectedVariant.color})`
        : (product.singleUnitSize || product.singleUnitColor
            ? ` (${[product.singleUnitSize, product.singleUnitColor].filter(Boolean).join(' - ')})`
            : '');

      showSuccessToast('Added to Cart!', `${quantity} x ${product.name}${variantInfo} has been added to your cart.`);
      setQuantity(1);
    } catch (e: any) {
      console.error('Error adding to cart:', e);
      showErrorToast('Failed to Add', e.message || 'Unable to add item to cart. Please try again.');
    } finally {
      setIsAddingToCart(false);
    }
  };

  const handleBuyNow = async () => {
    const auth = await userAuthService.isAuthenticated();
    if (!auth) { requireLogin(); return; }
    if (courierMissing) {
      showErrorToast('Courier required', 'Please choose a courier partner before checking out.');
      return;
    }
    setIsBuying(true);
    try {
      if (typeof Haptics !== 'undefined') await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      const shipping = logisticsResult
        ? { transportType: logisticsResult.selectedTransport, courier: selectedCourier || undefined }
        : undefined;
      await addToGlobalCart(product.id, quantity, selectedVariant?.id, shipping);
      router.push('/(any)/checkout' as any);
    } catch (e: any) {
      showErrorToast('Checkout Failed', (e as any)?.message || 'Unable to proceed to checkout. Please try again.');
    } finally {
      setIsBuying(false);
    }
  };

  const handleToggleWishlist = async () => {
    try {
      if (isTogglingWishlist) return;
      const auth = await userAuthService.isAuthenticated();
      if (!auth) { requireLogin(); return; }
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

  const handleDecrement = useCallback(() => {
    setQuantity((q: number) => Math.max(1, q - 1));
  }, []);

  const handleIncrement = useCallback(() => {
    setQuantity((q: number) => Math.min(currentStock, q + 1));
  }, [currentStock]);

  const copyCouponCode = async (code: string) => {
    try {
      await Clipboard.setStringAsync(code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
      showSuccessToast('Copied', `Coupon ${code} copied`);
    } catch { /* clipboard unavailable */ }
  };

  // ── Rail promo (priority: category coupon → product/category offer → store offer) ──
  const railPromo = useMemo(() => {
    type RailPromo = { kind: 'coupon' | 'offer'; image?: string | null; badge: string; title: string; desc?: string | null; code?: string; endsLabel?: string | null; savingLabel?: string | null };
    let rail: RailPromo | null = null;
    if (categoryCoupon) {
      const badge = categoryCoupon.discountType === 'PERCENTAGE'
        ? `${categoryCoupon.discountValue}% OFF`
        : `${fmtCurrency(categoryCoupon.discountValue, 'INR')} OFF`;
      rail = {
        kind: 'coupon',
        image: categoryCoupon.popupImage,
        badge,
        title: categoryCoupon.popupTitle || 'Special Coupon',
        desc: categoryCoupon.popupMessage || categoryCoupon.description || null,
        code: categoryCoupon.code,
      };
    }
    if (!rail && activeOffer) {
      rail = {
        kind: 'offer',
        image: null,
        badge: activeOffer.badge,
        title: activeOffer.title,
        desc: activeOffer.description ?? null,
        endsLabel: offerEnds,
        savingLabel: hasOfferSaving ? `Save ${fmt(currentPrice - (offeredPrice || 0))}/unit` : null,
      };
    }
    if (!rail && promoOffers.length > 0) {
      const matched = promoOffers.find((o) =>
        (o.scope === 'PRODUCT' && o.productIds?.includes(product.id)) ||
        (o.scope === 'CATEGORY' && o.categoryNames?.includes(product.category))
      );
      const hash = product.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
      const chosen = matched || promoOffers[hash % promoOffers.length];
      if (chosen) {
        rail = {
          kind: 'offer',
          image: chosen.bannerImage,
          badge: chosen.badge,
          title: chosen.title,
          desc: chosen.description ?? null,
          endsLabel: chosen.endsAt ? offerEndsLabel(chosen.endsAt) : null,
          savingLabel: null,
        };
      }
    }
    return rail;
  }, [categoryCoupon, activeOffer, promoOffers, product.id, product.category, offerEnds, hasOfferSaving, currentPrice, offeredPrice]);

  // ── Specs for the Specifications tab (mirrors web) ─────────────────────
  const specItems = useMemo(() => {
    const fs: Record<string, any> = (product.fabricSpecifications && typeof product.fabricSpecifications === 'object')
      ? (product.fabricSpecifications as Record<string, any>) : {};
    const FS_LABELS: Record<string, string> = {
      weightValue: 'Fabric Weight', gsm: 'GSM', length: 'Length', breadth: 'Breadth',
      weave: 'Type of Weave', composition: 'Composition',
    };
    const FS_UNITS: Record<string, string> = { weightValue: 'g', length: 'cm', breadth: 'cm', gsm: 'GSM' };
    const items: { label: string; value: string }[] = [];
    if (product.baseSku) items.push({ label: 'Product Code', value: product.baseSku });
    if (product.category) items.push({ label: 'Category', value: product.category });
    if (!product.hasVariants && product.singleUnitSize) items.push({ label: 'Size', value: product.singleUnitSize });
    if (!product.hasVariants && product.singleUnitColor) items.push({ label: 'Color', value: product.singleUnitColor });
    if (product.material) items.push({ label: 'Material', value: product.material });
    if (product.fabricType) items.push({ label: 'Fabric', value: product.fabricType });
    if (product.dimensions) items.push({ label: 'Dimensions', value: product.dimensions });
    if (product.weight) items.push({ label: 'Weight', value: `${product.weight}${product.weightUnit && !/[a-z]/i.test(String(product.weight)) ? ` ${product.weightUnit}` : ''}` });
    Object.entries(fs)
      .filter(([k]) => !['careInstructions', 'weightUnit', 'basis', 'type'].includes(k))
      .filter(([, v]) => v != null && String(v).trim() !== '')
      .forEach(([k, v]) => {
        const label = FS_LABELS[k] ?? k.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());
        const unit = FS_UNITS[k];
        const raw = Array.isArray(v) ? v.join(', ') : String(v);
        const value = unit && /^[\d.,\s]+$/.test(raw.trim()) ? `${raw} ${unit}` : raw;
        items.push({ label, value });
      });
    if (product.hasVariants) items.push({ label: 'Variants', value: String(visibleVariants.length) });
    items.push({ label: 'Availability', value: currentStock > 0 ? `In stock (${currentStock})` : 'Out of stock' });
    return items;
  }, [product, visibleVariants.length, currentStock]);

  const careList: string[] = Array.isArray((product.fabricSpecifications as any)?.careInstructions)
    ? (product.fabricSpecifications as any).careInstructions
    : [];

  const tabs: { id: string; label: string }[] = [];
  if (product.description || (product.tags && product.tags.length)) tabs.push({ id: 'description', label: 'Description' });
  if (specItems.length > 0) tabs.push({ id: 'specs', label: 'Specifications' });
  if (careList.length > 0) tabs.push({ id: 'care', label: 'Care Instructions' });
  if (product.dispatchTimeline) tabs.push({ id: 'shipping', label: 'Shipping' });

  // ── "Why choose this?" — derived from real data (mirrors web rail) ──────
  const whyChoose: { icon: any; color: string; bg: string; iconBg: string; title: string; desc: string }[] = [];
  if (product.dispatchTimeline) whyChoose.push({ icon: Truck, color: '#16a34a', bg: '#f0fdf4', iconBg: '#dcfce7', title: 'Fast Dispatch', desc: 'Fast delivery' });
  if (logisticsResult && logisticsResult.totalShippingCost === 0) whyChoose.push({ icon: ShipIcon, color: '#2563eb', bg: '#eff6ff', iconBg: '#dbeafe', title: 'Free Shipping', desc: 'No shipping charge on this item' });
  if (product.hasVariants && visibleVariants.length > 0) whyChoose.push({ icon: Box, color: '#7c3aed', bg: '#f5f3ff', iconBg: '#ede9fe', title: 'Multiple Options', desc: `${visibleVariants.length} variant${visibleVariants.length === 1 ? '' : 's'} to choose from` });
  if (currentStock > 0) whyChoose.push({ icon: Check, color: '#059669', bg: '#ecfdf3', iconBg: '#d1fae5', title: 'In Stock', desc: `${currentStock} unit${currentStock === 1 ? '' : 's'} available now` });
  if (hasManufacturerInfo(product.manufacturerInfo)) {
    const m = product.manufacturerInfo!;
    const detail = (m.experience && m.experience.trim())
      ? `${m.experience} of experience`
      : (m.role && m.role.trim() ? m.role : `Crafted by ${manufacturerDisplayName(m)}`);
    whyChoose.push({ icon: Award, color: '#E01A1B', bg: '#FCE8E8', iconBg: '#ffe4e4', title: 'Trusted Manufacturer', desc: detail });
  }

  const makerName = hasManufacturerInfo(product.manufacturerInfo)
    ? manufacturerDisplayName(product.manufacturerInfo)
    : '';

  return (
    <View className="flex-1 bg-gray-50">
      <PromotionalPopup category={product.category} />

      <ScrollView
        ref={scrollRef}
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >

      {/* ── Hero Image ─────────────────────────────────────────────────────── */}
      <View className="bg-white">
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

          {/* Discount ribbon (mobile extra) */}
          {product.discount != null && product.discount > 0 ? (
            <View className="absolute top-4 left-0 bg-[#111827] px-3.5 py-1.5 rounded-r-xl z-10" style={s.discountRibbon}>
              <Text className="text-white font-extrabold text-xs tracking-wide">{product.discount}% OFF</Text>
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

      {/* ── Cart-edit mode banner ──────────────────────────────────────────── */}
      {isEditingCartShipping ? (
        <View className="bg-white border border-[#E01A1B] px-5 py-3 flex-row items-center" style={{ gap: 8 }}>
          <Truck size={16} color={Palette.primary} />
          <Text className="text-[12px] font-semibold text-[#E01A1B] flex-1">
            Choosing shipping for this item in your cart
          </Text>
        </View>
      ) : null}

      {/* ── Product Header ──────────────────────────────────────────────────── */}
      <View className="bg-white mt-2 px-5 pt-5 pb-4">
        {product.category ? (
          <View className="flex-row items-center mb-2">
            <Text className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">
              {product.category}{product.subCategory ? ` › ${product.subCategory}` : ''}
            </Text>
          </View>
        ) : null}

        {/* Product name + Wishlist */}
        <View className="flex-row items-start justify-between mb-3">
          <Text className="text-[22px] font-extrabold text-gray-900 leading-[28px] flex-1 mr-3" style={s.serif}>
            {product.name}
          </Text>
          <Pressable
            onPress={handleToggleWishlist}
            disabled={isTogglingWishlist}
            accessibilityRole="button"
            accessibilityLabel={isWishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'}
            accessibilityHint="Double tap to toggle wishlist"
            style={s.wishlistButton}
            className="items-center justify-center"
          >
            {isTogglingWishlist ? (
              <ActivityIndicator size="small" color={Palette.primary} />
            ) : (
              <Heart
                size={20}
                color={isWishlisted ? '#ef4444' : '#9ca3af'}
                fill={isWishlisted ? '#ef4444' : 'transparent'}
                strokeWidth={2}
              />
            )}
          </Pressable>
        </View>

        {/* Star rating row + "See all reviews" */}
        <View className="flex-row items-center mb-4 flex-wrap" style={{ gap: 8 }}>
          <View className="flex-row gap-0.5 mr-1">{renderStars(product.rating || 0)}</View>
          <Text className="text-[13px] font-bold text-gray-800">{(product.rating ?? 0).toFixed(1)}</Text>
          <Text className="text-[13px] text-gray-400 ml-1">({product.reviews ?? 0})</Text>
          {product.reviews != null && product.reviews > 0 ? (
            <Pressable onPress={goReviews} accessibilityRole="link" accessibilityLabel="See all reviews">
              <Text className="text-[13px] font-semibold text-[#E01A1B] ml-1">See all reviews</Text>
            </Pressable>
          ) : null}
        </View>

        {/* Price block — offer-first, mirrors web purchase-panel price */}
        <View className="bg-[#fdfdfd] rounded-2xl px-4 py-4" style={s.priceCard}>
          {activeOffer ? (
            <View className="flex-row items-center flex-wrap mb-2" style={{ gap: 6 }}>
              <View style={s.offerBadge}>
                <Tag size={12} color={Palette.primary} />
                <Text className="text-[11px] font-bold text-[#E01A1B] tracking-wide">{activeOffer.badge}</Text>
              </View>
              <Text className="text-[12px] font-medium text-gray-700 flex-1">{activeOffer.title}</Text>
              {offerEnds ? <Text className="text-[11px] font-semibold text-[#E01A1B]">· {offerEnds}</Text> : null}
            </View>
          ) : null}
          <View className="flex-row items-baseline flex-wrap gap-2.5">
            <Text className="text-[30px] font-black text-gray-900">{fmt(offeredPrice || 0)}</Text>
            {hasOfferSaving ? (
              <>
                <Text className="text-base text-gray-400 line-through">{fmt(currentPrice)}</Text>
                <View className="bg-emerald-50 px-2.5 py-1 rounded-full" style={s.savePill}>
                  <Text className="text-[12px] font-bold text-emerald-700">Save {fmt(currentPrice - offeredPrice)}</Text>
                </View>
              </>
            ) : savings > 0 ? (
              <>
                <Text className="text-base text-gray-400 line-through">{fmt(originalPrice!)}</Text>
                <View className="bg-gray-100 px-2.5 py-1 rounded-full">
                  <Text className="text-[12px] font-bold text-gray-800">Save {fmt(savings)}</Text>
                </View>
              </>
            ) : null}
          </View>
          <Text className="text-[11px] text-gray-400 mt-1.5">Inclusive of all taxes</Text>
        </View>
      </View>

      {/* ── Variants ────────────────────────────────────────────────────────── */}
      {product.hasVariants && visibleVariants.length > 0 ? (
        <View className="bg-white mt-2 px-5 py-5">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-[15px] font-bold text-gray-900" style={s.serif}>Select Variant</Text>
            {selectedVariant ? (
              <View className="bg-white border border-[#E01A1B] rounded-full px-3 py-1 flex-row items-center gap-1.5">
                {selectedVariant.colorHex ? (
                  <View className="w-2.5 h-2.5 rounded-full" style={[variantStyles.selectedChipDot, { backgroundColor: selectedVariant.colorHex }]} />
                ) : null}
                <Text className="text-[11px] font-semibold text-[#E01A1B]">
                  {selectedVariant.size}{selectedVariant.color ? ` · ${selectedVariant.color}` : ''}
                </Text>
              </View>
            ) : (
              <Text className="text-[12px] text-gray-400">Choose an option</Text>
            )}
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={variantStyles.scrollContent}>
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
                price={fmt(getRegionalPrice(product as any))}
                stock={product.inventory?.baseStock ?? (product.hasVariants ? 0 : product.totalStock)}
                onPress={handleSelectBaseVariant}
                accessibilityLabel="Select Base Variant"
                accessibilityHint="Selects the base product option"
              />

              {visibleVariants.map((variant: any) => {
                const variantPrice = getRegionalPrice(variant as any);
                const variantOriginal = getRegionalOriginalPrice(variant as any) ?? variant.originalPrice;
                const hasDiscount = variantOriginal != null && variantOriginal > variantPrice;
                return (
                  <VariantCard
                    key={variant.id}
                    isSelected={selectedVariant?.id === variant.id}
                    imageUri={variant.images?.length > 0 ? variant.images[0] : undefined}
                    label={variant.size || 'Standard'}
                    colorName={variant.color || 'Default'}
                    colorHex={variant.colorHex}
                    price={fmt(variantPrice)}
                    originalPrice={hasDiscount ? fmt(variantOriginal!) : undefined}
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

      {/* ── Product Attributes (non-variant size/color) ────────────────────── */}
      {!product.hasVariants && (product.singleUnitSize || product.singleUnitColor) ? (
        <View className="bg-white mt-2 px-5 py-5">
          <Text className="text-[15px] font-bold text-gray-900 mb-3" style={s.serif}>Product Details</Text>
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
                    <View className="w-3.5 h-3.5 rounded-full" style={[s.colorDot, { backgroundColor: product.singleUnitColorHex }]} />
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
          <View className="w-2 h-2 rounded-full mr-2" style={isActuallyInStock ? s.stockDotIn : s.stockDotOut} />
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

        {/* Dispatch timeline — red-tinted like web */}
        {product.dispatchTimeline ? (
          <View className="bg-white rounded-2xl p-3.5 flex-row items-center gap-3" style={s.dispatchCard}>
            <View className="w-9 h-9 rounded-xl bg-[#E01A1B]/10 items-center justify-center">
              <Truck size={18} color={Palette.primary} />
            </View>
            <View className="flex-1">
              <Text className="text-[13px] font-semibold text-gray-900">
                Dispatch: {product.dispatchTimeline.processingDays} days processing + {product.dispatchTimeline.shippingDays} days shipping
              </Text>
              <Text className="text-[12px] font-semibold text-[#E01A1B] mt-0.5">
                (Total: {product.dispatchTimeline.totalDays} days)
              </Text>
            </View>
          </View>
        ) : null}

        {/* Smart Logistics Section */}
        {logisticsResult && product.logisticsConfig && (
          <View className="bg-white border border-gray-200 rounded-2xl p-4 mt-3" style={{ gap: 12 }}>
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center" style={{ gap: 6 }}>
                <Truck size={16} color={Palette.primary} />
                <Text className="text-[13px] font-bold text-gray-900" style={s.serif}>Shipping & Logistics</Text>
              </View>
              {logisticsResult.recommendedTransport === logisticsResult.selectedTransport && (
                <View className="bg-green-100 px-2 py-0.5 rounded-full">
                  <Text className="text-[9px] font-bold text-green-700">Recommended</Text>
                </View>
              )}
            </View>

            {/* Total Weight */}
            <View className="flex-row items-center justify-between">
              <Text className="text-[12px] text-gray-600">Total Weight</Text>
              <Text className="text-[12px] font-semibold text-gray-900">
                {formatWeight(logisticsResult.totalWeightKg)} ({quantity} x {formatWeight(logisticsResult.unitWeightKg)}/unit)
              </Text>
            </View>

            {/* Transport Toggle — brand red, region-aware labels */}
            {(product.logisticsConfig as LogisticsConfig).transportTypes.length > 1 ? (
              <View className="flex-row" style={{ gap: 8 }}>
                {((product.logisticsConfig as LogisticsConfig).transportTypes).map((type) => {
                  const isSelected = logisticsResult.selectedTransport === type;
                  const isRecommended = logisticsResult.recommendedTransport === type;
                  const Icon = type === 'AIR' ? Plane : isSurfaceRegion(getRegion()) ? Truck : ShipIcon;
                  return (
                    <Pressable
                      key={type}
                      accessible
                      accessibilityRole="button"
                      accessibilityLabel={`Select ${transportModeLabel(type, getRegion())} shipping`}
                      accessibilityState={{ selected: isSelected }}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setTransportOverride(type);
                        setSelectedCourier(null);
                      }}
                      className={`flex-1 flex-row items-center justify-center py-2.5 rounded-xl border-2 ${isSelected ? 'border-[#E01A1B] bg-white' : 'border-gray-200 bg-white'}`}
                      style={{ gap: 6 }}
                    >
                      <Icon size={14} color={isSelected ? Palette.primary : '#6b7280'} />
                      <Text className={`text-[12px] font-semibold ${isSelected ? 'text-[#E01A1B]' : 'text-gray-600'}`}>
                        {transportModeLabel(type, getRegion())}
                      </Text>
                      {isRecommended && !isSelected ? (
                        <View className="bg-green-100 px-1.5 py-0.5 rounded">
                          <Text className="text-[9px] font-bold text-green-600">Best</Text>
                        </View>
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
            ) : (
              /* Single transport display */
              <View className="flex-row items-center gap-2 py-2 px-3 rounded-lg bg-white border border-[#E01A1B]">
                {(() => {
                  const mode = logisticsResult.selectedTransport;
                  const Icon = mode === 'AIR' ? Plane : isSurfaceRegion(getRegion()) ? Truck : ShipIcon;
                  return (
                    <>
                      <Icon size={14} color={Palette.primary} />
                      <Text className="text-[12px] font-semibold text-[#E01A1B]">{transportModeLabel(mode, getRegion())}</Text>
                    </>
                  );
                })()}
              </View>
            )}

            {/* Courier partner — required before checkout */}
            {courierOptions.length > 0 ? (
              <View style={{ gap: 8 }}>
                <View className="flex-row items-center justify-between">
                  <Text className="text-[11px] font-semibold text-gray-700 uppercase tracking-wide">
                    {getRegion() === 'IN' ? 'Domestic courier' : 'International courier'}
                  </Text>
                  {!selectedCourier ? (
                    <Text className="text-[10px] font-semibold text-[#E01A1B]">Required</Text>
                  ) : null}
                </View>
                <View className="flex-row flex-wrap" style={{ gap: 10 }}>
                  {courierOptions.map((c) => {
                    const isSelected = selectedCourier === c.id;
                    return (
                      <Pressable
                        key={c.id}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setSelectedCourier(c.id);
                        }}
                        accessibilityRole="button"
                        accessibilityLabel={`Select ${c.name} courier`}
                        accessibilityState={{ selected: isSelected }}
                        style={[s.courierBtn, isSelected && s.courierBtnActive]}
                      >
                        <CourierBadge courier={c} size={36} />
                        {isSelected ? (
                          <View style={s.courierCheck}>
                            <Check size={9} color={Palette.primary} strokeWidth={3.5} />
                          </View>
                        ) : null}
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ) : null}

            {/* Delivery & Cost */}
            <View className="flex-row" style={{ gap: 8 }}>
              <View className="flex-1 bg-gray-50 rounded-xl p-3 items-center">
                <Text className="text-[10px] text-gray-500 mb-0.5">Delivery Time</Text>
                <Text className="text-[13px] font-bold text-gray-900">{logisticsResult.deliveryDays} days</Text>
              </View>
              <View className="flex-1 bg-gray-50 rounded-xl p-3 items-center">
                <Text className="text-[10px] text-gray-500 mb-0.5">Shipping Cost</Text>
                <Text className="text-[13px] font-bold text-gray-900">
                  {logisticsResult.totalShippingCost === 0 ? 'FREE' : fmtShip(logisticsResult.totalShippingCost)}
                </Text>
              </View>
            </View>

            {/* Dimensions */}
            {(product.logisticsConfig as LogisticsConfig).dimensions ? (
              <View className="flex-row items-center gap-1.5">
                <Box size={12} color="#9ca3af" />
                <Text className="text-[11px] text-gray-500">
                  Dimensions: {formatDimensions((product.logisticsConfig as LogisticsConfig).dimensions)}
                </Text>
              </View>
            ) : null}

            {/* Max weight warning */}
            {logisticsResult.exceedsMaxWeight ? (
              <View className="flex-row items-start bg-red-50 border border-red-200 rounded-xl p-3" style={{ gap: 6 }}>
                <AlertTriangle size={14} color="#dc2626" />
                <Text className="flex-1 text-[11px] text-red-700">
                  Total weight ({formatWeight(logisticsResult.totalWeightKg)}) exceeds the maximum limit of {formatWeight(logisticsResult.maxWeightKg)}. Please reduce quantity or contact support.
                </Text>
              </View>
            ) : null}

            {/* Notes */}
            {(product.logisticsConfig as LogisticsConfig).notes ? (
              <View className="flex-row items-start" style={{ gap: 4 }}>
                <Info size={12} color="#9ca3af" />
                <Text className="flex-1 text-[11px] text-gray-500">{(product.logisticsConfig as LogisticsConfig).notes}</Text>
              </View>
            ) : null}
          </View>
        )}

        {/* Action buttons — only when in stock */}
        {currentStock > 0 ? (
          <View className="mt-4">
            {/* Quantity selector */}
            <View className="flex-row items-center justify-center mb-4" style={{ gap: 10 }}>
              <Text className="text-sm font-semibold text-gray-700">Quantity:</Text>
              <View className="flex-row items-center bg-gray-100 rounded-xl" style={s.qtyContainer}>
                <Pressable onPress={handleDecrement} disabled={quantity <= 1} accessibilityRole="button" accessibilityLabel="Decrease quantity" style={s.qtyButton} className="items-center justify-center">
                  <Text className="text-lg font-bold" style={quantity <= 1 ? s.qtyTextDisabled : s.qtyTextEnabled}>{'\u2212'}</Text>
                </Pressable>
                <View className="min-w-[36px] items-center">
                  <Text className="text-[15px] font-extrabold text-gray-900">{quantity}</Text>
                </View>
                <Pressable onPress={handleIncrement} disabled={quantity >= currentStock} accessibilityRole="button" accessibilityLabel="Increase quantity" style={s.qtyButton} className="items-center justify-center">
                  <Text className="text-lg font-bold" style={quantity >= currentStock ? s.qtyTextDisabled : s.qtyTextEnabled}>{'+'}</Text>
                </Pressable>
              </View>
              <Text className="text-sm font-medium text-gray-500">{product.uom || 'pcs'}</Text>
            </View>

            {/* Add to Cart (outline) + Buy Now (filled) */}
            <View className="flex-row" style={{ gap: 10 }}>
              <Pressable
                onPress={handleAddToCart}
                disabled={isAddingToCart || nothingBuyable || courierMissing}
                accessibilityRole="button"
                accessibilityLabel={`Add ${quantity} to cart for ${fmt(offeredPrice * quantity)}`}
                style={[s.addToCartOutline, (nothingBuyable || courierMissing) && { opacity: 0.5 }]}
                className="flex-1 h-12 rounded-full flex-row items-center justify-center gap-2 border-2 border-[#E01A1B]"
              >
                {isAddingToCart ? (
                  <ActivityIndicator size="small" color={Palette.primary} />
                ) : (
                  <>
                    <ShoppingCart size={16} color={Palette.primary} />
                    <Text className="text-[13px] font-bold text-[#E01A1B] uppercase tracking-wide">
                      {nothingBuyable ? 'Not available' : 'Add to Cart'}
                    </Text>
                  </>
                )}
              </Pressable>
              <Pressable
                onPress={handleBuyNow}
                disabled={isBuying || nothingBuyable || courierMissing}
                accessibilityRole="button"
                accessibilityLabel={`Buy ${quantity} of ${product.name} now`}
                style={[s.buyNowButton, (nothingBuyable || courierMissing) && { opacity: 0.5 }]}
                className="flex-1 h-12 rounded-full flex-row items-center justify-center gap-2 bg-[#E01A1B]"
              >
                {isBuying ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <ShoppingCart size={16} color="#ffffff" />
                    <Text className="text-[13px] font-bold text-white uppercase tracking-wide">Buy Now</Text>
                  </>
                )}
              </Pressable>
            </View>
            {nothingBuyable ? (
              <Text className="text-[12px] text-amber-700 mt-2 text-center">
                This product isn&apos;t available in your region right now.
              </Text>
            ) : courierMissing ? (
              <Text className="text-[12px] text-amber-700 mt-2 text-center">
                Select a courier partner to continue.
              </Text>
            ) : null}
          </View>
        ) : null}
      </View>

      {/* ── Order Summary — live, mirrors web rail ──────────────────────────── */}
      {currentStock > 0 ? (
        <View className="bg-white mt-2 px-5 py-5">
          <View className="flex-row items-center gap-2 mb-4">
            <ShoppingCart size={16} color={Palette.primary} />
            <Text className="text-[17px] font-semibold text-gray-900" style={s.serif}>Order Summary</Text>
          </View>
          <View style={{ gap: 10 }}>
            <View className="flex-row items-center justify-between">
              <Text className="text-[13px] text-gray-600">Unit price</Text>
              <Text className="text-[13px] font-semibold text-gray-900">{fmt(offeredPrice || 0)}</Text>
            </View>
            <View className="flex-row items-center justify-between">
              <Text className="text-[13px] text-gray-600">Quantity</Text>
              <Text className="text-[13px] font-semibold text-gray-900">{quantity} {product.uom || 'pcs'}</Text>
            </View>
            <View className="flex-row items-center justify-between">
              <Text className="text-[13px] text-gray-600">Subtotal</Text>
              <Text className="text-[13px] font-semibold text-gray-900">{fmt((offeredPrice || 0) * quantity)}</Text>
            </View>
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-1.5">
                <Text className="text-[13px] text-gray-600">Shipping</Text>
                {logisticsResult ? (
                  <View className="flex-row items-center gap-1">
                    {logisticsResult.selectedTransport === 'AIR' ? <Plane size={11} color="#9ca3af" /> : isSurfaceRegion(getRegion()) ? <Truck size={11} color="#9ca3af" /> : <ShipIcon size={11} color="#9ca3af" />}
                    <Text className="text-[10px] text-gray-400">
                      {logisticsResult.selectedTransport === 'AIR' ? 'Air' : isSurfaceRegion(getRegion()) ? 'Road' : 'Sea'}
                    </Text>
                  </View>
                ) : null}
              </View>
              <Text className="text-[13px] font-semibold text-gray-900">
                {logisticsResult ? (logisticsResult.totalShippingCost === 0 ? 'FREE' : fmtShip(logisticsResult.totalShippingCost)) : '—'}
              </Text>
            </View>
            {logisticsResult ? (
              <View className="flex-row items-center justify-between">
                <Text className="text-[13px] text-gray-600">Delivery</Text>
                <Text className="text-[13px] font-semibold text-gray-900">{logisticsResult.deliveryDays} days</Text>
              </View>
            ) : null}
            <View style={s.divider} />
            <View className="flex-row items-center justify-between">
              <Text className="text-base font-bold text-gray-900">Total</Text>
              <Text className="text-lg font-extrabold text-[#E01A1B]">
                {fmt((offeredPrice || 0) * quantity + (logisticsResult ? (getCurrency() === 'USD' ? convertINRtoUSD(logisticsResult.totalShippingCost) : logisticsResult.totalShippingCost) : 0))}
              </Text>
            </View>
          </View>
        </View>
      ) : null}

      {/* ── Offer ribbon — live automatic offer ─────────────────────────────── */}
      {activeOffer ? (
        <View className="mt-2 mx-5 overflow-hidden rounded-2xl">
          <View style={s.ribbon}>
            <View style={s.ribbonIconWrap}>
              <Tag size={20} color={Palette.primary} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <View className="flex-row items-center flex-wrap gap-2">
                <View className="rounded-full border border-[#E01A1B] px-2 py-0.5">
                  <Text className="text-[10px] font-bold text-[#E01A1B] uppercase tracking-wide">{activeOffer.badge}</Text>
                </View>
                <Text className="text-sm font-bold text-[#E01A1B] flexShrink-1">{activeOffer.title}</Text>
              </View>
              {activeOffer.description ? (
                <Text className="text-[12px] text-gray-600 mt-0.5">{activeOffer.description}</Text>
              ) : null}
            </View>
            {offerEnds ? (
              <View className="rounded-full bg-[#E01A1B]/10 px-2.5 py-1">
                <Text className="text-[11px] font-semibold text-[#E01A1B]">{offerEnds}</Text>
              </View>
            ) : null}
          </View>
        </View>
      ) : null}

      {/* ── Tabbed product information ──────────────────────────────────────── */}
      {tabs.length > 0 ? (
        <View className="bg-white mt-2">
          {/* Tab bar */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabBar}>
            {tabs.map((t) => {
              const isActive = t.id === activeTab;
              return (
                <Pressable key={t.id} onPress={() => setActiveTab(t.id)} accessibilityRole="button" accessibilityState={{ selected: isActive }} style={s.tab}>
                  <Text style={[s.tabText, isActive && s.tabTextActive]}>{t.label}</Text>
                  {isActive ? <View style={s.tabUnderline} /> : null}
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Tab content */}
          <View className="px-5 py-5">
            {activeTab === 'description' && (
              <View>
                {product.description ? (
                  <>
                    <Text style={[s.descriptionText, !showAllDetails && s.descriptionClamped]}>
                      {product.description}
                    </Text>
                    {product.description.length > 260 ? (
                      <Pressable onPress={() => setShowAllDetails((v) => !v)} accessibilityRole="button" style={{ alignSelf: 'flex-start', marginTop: 6 }}>
                        <Text className="text-[13px] font-semibold text-[#E01A1B]">{showAllDetails ? 'Read less' : 'Read more'}</Text>
                      </Pressable>
                    ) : null}
                  </>
                ) : null}
                {product.tags && product.tags.length > 0 ? (
                  <View className="flex-row flex-wrap gap-2 mt-4">
                    {product.tags.map((tag, i) => (
                      <View key={i} className="flex-row items-center gap-1 rounded-full bg-[#E01A1B]/[0.06] px-3 py-1">
                        <Check size={12} color={Palette.primary} strokeWidth={3} />
                        <Text className="text-xs font-semibold text-[#E01A1B]">{tag}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>
            )}

            {activeTab === 'specs' && (
              <View style={{ gap: 4 }}>
                {specItems.map((item, i) => (
                  <View key={i} className="flex-row items-center py-2.5" style={i > 0 ? s.specRowBorder : undefined}>
                    <Text className="text-[13px] text-gray-500 whitespace-nowrap">{item.label}</Text>
                    <View style={s.specDots} />
                    <Text className="text-[13px] font-semibold text-gray-900 text-right">{item.value}</Text>
                  </View>
                ))}
              </View>
            )}

            {activeTab === 'care' && (
              <View className="flex-row flex-wrap" style={{ gap: 10 }}>
                {careList.map((instruction, index) => (
                  <View key={index} className="flex-row items-center gap-2 bg-white px-2.5 py-2 rounded-full" style={s.carePill}>
                    <View style={s.careStepBadge}>
                      <Text className="text-[#E01A1B] text-[10px] font-bold">{index + 1}</Text>
                    </View>
                    <Text className="text-[13px] font-semibold text-gray-700">{instruction}</Text>
                  </View>
                ))}
              </View>
            )}

            {activeTab === 'shipping' && product.dispatchTimeline && (
              <View style={{ gap: 12 }}>
                <View className="flex-row items-center gap-3 rounded-xl bg-white p-3.5" style={s.shipBox}>
                  <View className="w-9 h-9 rounded-full bg-[#E01A1B]/10 items-center justify-center">
                    <Truck size={16} color={Palette.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text className="text-[13px] font-semibold text-gray-900">Dispatch in {product.dispatchTimeline.totalDays} days</Text>
                    <Text className="text-[12px] text-gray-500">
                      {product.dispatchTimeline.processingDays} days processing + {product.dispatchTimeline.shippingDays} days shipping
                    </Text>
                  </View>
                </View>
                {logisticsResult ? (
                  <View className="flex-row" style={{ gap: 12 }}>
                    <View className="flex-1 bg-gray-50 rounded-xl p-3 items-center">
                      <Text className="text-[11px] text-gray-500 mb-0.5">Delivery Time</Text>
                      <Text className="text-sm font-bold text-gray-900">{logisticsResult.deliveryDays} days</Text>
                    </View>
                    <View className="flex-1 bg-gray-50 rounded-xl p-3 items-center">
                      <Text className="text-[11px] text-gray-500 mb-0.5">Shipping</Text>
                      <Text className="text-sm font-bold text-gray-900">
                        {logisticsResult.totalShippingCost === 0 ? 'FREE' : fmtShip(logisticsResult.totalShippingCost)}
                      </Text>
                    </View>
                  </View>
                ) : null}
                <Text className="text-[12px] text-gray-500">
                  Shipping method and final delivery estimate are confirmed in the purchase panel above.
                </Text>
              </View>
            )}
          </View>
        </View>
      ) : null}

      {/* ── Offers rail card — coupon / offer (mirrors web priority) ────────── */}
      {railPromo ? (
        railPromo.image ? (
          /* Full-bleed image promo */
          <View className="mt-2 mx-5 overflow-hidden rounded-2xl" style={s.promoCard}>
            <Image source={{ uri: railPromo.image }} style={StyleSheet.absoluteFill} contentFit="cover" />
            <View style={s.promoOverlay} />
            <View style={s.promoBadge}>
              <Text style={s.promoBadgeText}>{railPromo.badge}</Text>
            </View>
            <View style={s.promoKindChip}>
              <Tag size={10} color="#ffffff" />
              <Text style={s.promoKindText}>{railPromo.kind === 'coupon' ? 'Coupon' : 'Offer'}</Text>
            </View>
            <View style={s.promoBody}>
              <Text style={s.promoTitle}>{railPromo.title}</Text>
              {railPromo.desc ? <Text style={s.promoDesc} numberOfLines={2}>{railPromo.desc}</Text> : null}
              {railPromo.code ? (
                <View className="flex-row items-center mt-2" style={{ gap: 8 }}>
                  <View style={s.promoCodeBox}>
                    <Text style={s.promoCode} numberOfLines={1}>{railPromo.code}</Text>
                  </View>
                  <Pressable onPress={() => copyCouponCode(railPromo.code!)} style={s.promoCopyBtn} accessibilityRole="button">
                    <Text style={s.promoCopyText}>Copy</Text>
                  </Pressable>
                </View>
              ) : null}
              {(railPromo.savingLabel || railPromo.endsLabel) ? (
                <View className="flex-row items-center justify-between mt-2" style={{ gap: 8 }}>
                  {railPromo.savingLabel ? <Text style={s.promoSaving}>{railPromo.savingLabel}</Text> : <View />}
                  {railPromo.endsLabel ? <Text style={s.promoEnds}>{railPromo.endsLabel}</Text> : null}
                </View>
              ) : null}
            </View>
          </View>
        ) : (
          /* Clean branded card */
          <View className="bg-white mt-2 mx-5 overflow-hidden rounded-2xl" style={s.railCard}>
            <View className="flex-row items-center gap-2 px-5 py-3" style={s.railHeader}>
              <View style={s.railHeaderIcon}>
                <Tag size={14} color={Palette.primary} />
              </View>
              <Text className="text-[15px] font-semibold text-gray-900" style={s.serif}>
                {railPromo.kind === 'coupon' ? 'Coupon' : 'Offer'}
              </Text>
            </View>
            <View className="px-5 pb-5 pt-3">
              <View className="flex-row items-center flex-wrap" style={{ gap: 8 }}>
                <View style={s.railBadge}>
                  <Text style={s.railBadgeText}>{railPromo.badge}</Text>
                </View>
                <Text className="text-sm font-bold text-gray-900 flexShrink-1">{railPromo.title}</Text>
              </View>
              {railPromo.desc ? <Text className="text-[12px] text-gray-600 mt-1 leading-snug">{railPromo.desc}</Text> : null}
              {railPromo.code ? (
                <View className="flex-row items-center mt-3" style={{ gap: 8 }}>
                  <View style={s.railCodeBox}>
                    <Text style={s.railCode} numberOfLines={1}>{railPromo.code}</Text>
                  </View>
                  <Pressable onPress={() => copyCouponCode(railPromo.code!)} style={s.railCopyBtn} accessibilityRole="button">
                    {copiedCode ? <Check size={13} color={Palette.primary} strokeWidth={3} /> : <Copy size={13} color={Palette.primary} />}
                    <Text style={s.railCopyText}>{copiedCode ? 'Copied' : 'Copy'}</Text>
                  </Pressable>
                </View>
              ) : null}
              {(railPromo.savingLabel || railPromo.endsLabel) ? (
                <View className="flex-row items-center justify-between mt-2" style={{ gap: 8 }}>
                  {railPromo.savingLabel ? <Text className="text-[12px] font-bold text-emerald-700">{railPromo.savingLabel}</Text> : <View />}
                  {railPromo.endsLabel ? <Text className="text-[11px] font-semibold text-[#E01A1B]">{railPromo.endsLabel}</Text> : null}
                </View>
              ) : null}
            </View>
          </View>
        )
      ) : null}

      {/* ── Meet the Maker — manufacturer info ──────────────────────────────── */}
      {hasManufacturerInfo(product.manufacturerInfo) ? (
        <View className="bg-white mt-2 mx-5 rounded-2xl" style={s.railCard}>
          <View className="px-5 pt-5 pb-4">
            <Text className="text-[17px] font-semibold text-gray-900" style={s.serif}>Meet the Maker</Text>
            <Text className="text-sm text-gray-500 mb-4">The hands behind this product</Text>

            <Pressable onPress={() => setShowMakerModal(true)} accessibilityRole="button" accessibilityLabel="Open manufacturer profile">
              <View className="flex-row items-center" style={{ gap: 12 }}>
                <View style={s.makerAvatarWrap}>
                  {product.manufacturerInfo!.photo ? (
                    <Image source={{ uri: product.manufacturerInfo!.photo }} style={s.makerAvatar} contentFit="cover" transition={200} />
                  ) : (
                    <View style={[s.makerAvatar, { backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' }]}>
                      <User size={28} color="#d1d5db" />
                    </View>
                  )}
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  {makerName ? <Text className="text-[15px] font-semibold text-gray-900" style={s.serif}>{makerName}</Text> : null}
                  <View className="flex-row flex-wrap mt-1.5" style={{ gap: 6 }}>
                    {product.manufacturerInfo!.role && product.manufacturerInfo!.role.trim() ? (
                      <View className="flex-row items-center gap-1 px-2.5 py-1 rounded-full bg-[#E01A1B]/[0.06]">
                        <Award size={11} color={Palette.primary} />
                        <Text className="text-[11px] font-semibold text-[#E01A1B]">{product.manufacturerInfo!.role}</Text>
                      </View>
                    ) : null}
                    {product.manufacturerInfo!.experience && product.manufacturerInfo!.experience.trim() ? (
                      <View className="flex-row items-center gap-1 px-2.5 py-1 rounded-full bg-gray-100">
                        <Clock size={11} color="#374151" />
                        <Text className="text-[11px] font-semibold text-gray-700">{product.manufacturerInfo!.experience}</Text>
                      </View>
                    ) : null}
                  </View>
                </View>
                <ChevronDown size={16} color="#9ca3af" style={{ transform: [{ rotate: '-90deg' }] }} />
              </View>
              {product.manufacturerInfo!.description && product.manufacturerInfo!.description.trim() ? (
                <Text className="text-[13px] text-gray-600 leading-relaxed mt-3" numberOfLines={3}>
                  {product.manufacturerInfo!.description}
                </Text>
              ) : null}
            </Pressable>
          </View>
        </View>
      ) : null}

      {/* ── Why choose this? — derived from real data ──────────────────────── */}
      {whyChoose.length > 0 ? (
        <View className="bg-white mt-2 px-5 py-5">
          <Text className="text-[15px] font-bold text-gray-900 mb-4" style={s.serif}>Why choose this?</Text>
          {whyChoose.map((item, i) => {
            const Icon = item.icon;
            return (
              <View key={i} className="flex-row items-center rounded-2xl p-3.5 mb-2" style={{ backgroundColor: item.bg }}>
                <View className="w-10 h-10 rounded-xl items-center justify-center mr-3" style={{ backgroundColor: item.iconBg }}>
                  <Icon size={20} color={item.color} />
                </View>
                <View className="flex-1">
                  <Text className="text-[13px] font-bold text-gray-900">{item.title}</Text>
                  <Text className="text-[11px] text-gray-500 mt-0.5">{item.desc}</Text>
                </View>
              </View>
            );
          })}
        </View>
      ) : null}

      {/* ── Customer Reviews ──────────────────────────────────────────────── */}
      <View onLayout={onReviewsLayout}>
        <ProductReviews
          productId={product.id}
          rating={product.rating || 0}
          reviewCount={product.reviews || 0}
        />
      </View>

      {/* ── You may also like — same-category products ─────────────────────── */}
      {relatedProducts.length > 0 ? (
        <View className="mt-6 px-5">
          <View className="flex-row items-end justify-between mb-4">
            <View>
              <View className="flex-row items-center gap-2 mb-1">
                <View style={s.eyebrowLine} />
                <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#E01A1B]">More to explore</Text>
              </View>
              <Text className="text-xl font-semibold text-gray-900" style={s.serif}>You may also like</Text>
            </View>
            <Pressable onPress={() => router.push(`(any)/products?category=${encodeURIComponent(product.category || '')}` as any)} accessibilityRole="link">
              <Text className="text-sm font-semibold text-[#E01A1B]">View all</Text>
            </Pressable>
          </View>
          <View className="flex-row flex-wrap" style={{ marginHorizontal: -4 }}>
            {relatedProducts.map((p) => (
              <View key={p.id} style={{ width: '50%', paddingHorizontal: 4, marginBottom: 8 }}>
                <ProductCard product={p} />
              </View>
            ))}
          </View>
        </View>
      ) : null}

      </ScrollView>

      {/* ── Sticky Action Bar ─────────────────────────────────────────────── */}
      {isEditingCartShipping ? (
        /* Cart-edit mode: Confirm shipping button */
        <View
          className="bg-white border-t border-gray-100 px-4 py-3"
          style={{ paddingBottom: Math.max(insets.bottom, 16) }}
        >
          <Pressable
            onPress={handleConfirmShipping}
            disabled={savingShipping || !selectedCourier}
            accessibilityRole="button"
            accessibilityLabel="Confirm shipping method for this cart item"
            style={[s.addToCartShadow, { opacity: !selectedCourier ? 0.5 : 1 }]}
            className="border-2 border-[#E01A1B] h-12 rounded-xl flex-row items-center justify-center gap-2"
          >
            {savingShipping ? (
              <ActivityIndicator size="small" color={Palette.primary} />
            ) : (
              <Truck size={18} color={Palette.primary} />
            )}
            <Text className="text-[14px] font-bold text-[#E01A1B]">
              {savingShipping ? 'Saving…' : 'Confirm Shipping Method'}
            </Text>
          </Pressable>
        </View>
      ) : isActuallyInStock ? (
        /* Normal mode: Quantity selector + Add to Cart + Buy Now */
        <View
          className="bg-white border-t border-gray-100 px-4 py-3"
          style={{ paddingBottom: Math.max(insets.bottom, 16) }}
        >
          <View className="flex-row items-center gap-3">
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
                <Text className="text-lg font-bold" style={quantity <= 1 ? s.qtyTextDisabled : s.qtyTextEnabled}>{'\u2212'}</Text>
              </Pressable>
              <View className="min-w-[32px] items-center">
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
                <Text className="text-lg font-bold" style={quantity >= currentStock ? s.qtyTextDisabled : s.qtyTextEnabled}>{'+'}</Text>
              </Pressable>
            </View>

            {/* Add to Cart */}
            <Pressable
              onPress={handleAddToCart}
              disabled={isAddingToCart || nothingBuyable || courierMissing}
              accessibilityRole="button"
              accessibilityLabel={`Add ${quantity} to cart for ${fmt(offeredPrice * quantity)}`}
              accessibilityHint="Double tap to add items to your cart"
              style={[s.addToCartShadow, { opacity: nothingBuyable || courierMissing ? 0.5 : 1 }]}
              className="flex-1 bg-[#E01A1B] h-12 rounded-xl flex-row items-center justify-center gap-2"
            >
              {isAddingToCart ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <ShoppingCart size={18} color="#ffffff" />
              )}
              <Text className="text-[14px] font-bold text-white">
                {isAddingToCart ? 'Adding…' : `Add to Cart · ${fmt(offeredPrice * quantity)}`}
              </Text>
            </Pressable>
          </View>
          <Pressable
            onPress={handleBuyNow}
            disabled={isBuying || nothingBuyable || courierMissing}
            accessibilityRole="button"
            accessibilityLabel={`Buy ${quantity} of ${product.name} now`}
            style={[s.buyNowBar, { opacity: nothingBuyable || courierMissing ? 0.5 : 1 }]}
            className="mt-2 h-12 rounded-xl flex-row items-center justify-center gap-2 bg-[#E01A1B]"
          >
            {isBuying ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <ShoppingCart size={18} color="#ffffff" />
                <Text className="text-[14px] font-bold text-white">Buy Now</Text>
              </>
            )}
          </Pressable>
          {courierMissing ? (
            <Text className="text-[12px] text-amber-700 mt-2 text-center">Select a courier partner to continue.</Text>
          ) : nothingBuyable ? (
            <Text className="text-[12px] text-amber-700 mt-2 text-center">This product isn&apos;t available in your region right now.</Text>
          ) : null}
        </View>
      ) : null}

      {/* ── Manufacturer "Meet the Maker" modal ─────────────────────────────── */}
      <Modal visible={showMakerModal} transparent animationType="fade" onRequestClose={() => setShowMakerModal(false)}>
        <View style={s.makerOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowMakerModal(false)} />
          <View style={s.makerModal} onStartShouldSetResponder={() => true}>
            {/* Brand header band with overlapping avatar */}
            <View style={s.makerBand}>
              <Pressable onPress={() => setShowMakerModal(false)} style={s.makerModalClose} accessibilityLabel="Close">
                <X size={18} color={Palette.primary} />
              </Pressable>
              <View style={s.makerBandAvatar}>
                {product.manufacturerInfo!.photo ? (
                  <Image source={{ uri: product.manufacturerInfo!.photo }} style={s.makerBandAvatarImg} contentFit="cover" transition={200} />
                ) : (
                  <View style={[s.makerBandAvatarImg, { backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' }]}>
                    <User size={28} color="#d1d5db" />
                  </View>
                )}
              </View>
            </View>

            <View style={s.makerModalBody}>
              <Text className="text-[11px] uppercase tracking-[0.16em] text-[#E01A1B] font-semibold text-center mt-2">
                The hands behind this product
              </Text>
              {makerName ? <Text className="text-xl font-semibold text-gray-900 text-center mt-1" style={s.serif}>{makerName}</Text> : null}

              {(product.manufacturerInfo!.role?.trim() || product.manufacturerInfo!.experience?.trim()) ? (
                <View className="flex-row flex-wrap justify-center mt-3" style={{ gap: 8 }}>
                  {product.manufacturerInfo!.role && product.manufacturerInfo!.role.trim() ? (
                    <View className="flex-row items-center gap-1.5 px-3 py-1 rounded-full bg-[#E01A1B]/[0.06]">
                      <Award size={12} color={Palette.primary} />
                      <Text className="text-xs font-semibold text-[#E01A1B]">{product.manufacturerInfo!.role}</Text>
                    </View>
                  ) : null}
                  {product.manufacturerInfo!.experience && product.manufacturerInfo!.experience.trim() ? (
                    <View className="flex-row items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100">
                      <Clock size={12} color="#374151" />
                      <Text className="text-xs font-semibold text-gray-700">{product.manufacturerInfo!.experience}</Text>
                    </View>
                  ) : null}
                </View>
              ) : null}

              {product.manufacturerInfo!.description && product.manufacturerInfo!.description.trim() ? (
                <>
                  <View className="flex-row items-center gap-3 my-4">
                    <View style={s.makerDivider} />
                    <Text className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">About</Text>
                    <View style={s.makerDivider} />
                  </View>
                  <Text className="text-sm text-gray-600 leading-relaxed">{product.manufacturerInfo!.description}</Text>
                </>
              ) : null}
            </View>
          </View>
        </View>
      </Modal>
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
              <Check size={13} color={Palette.primary} strokeWidth={3} />
            </View>
          ) : null}

          {/* Discount tag */}
          {discountPercent != null && discountPercent > 0 ? (
            <View className="absolute top-2 left-2 rounded-md px-1.5 py-0.5" style={variantStyles.discountBadge}>
              <Text style={variantStyles.discountText}>{`-${discountPercent}%`}</Text>
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
                <View className="w-3 h-3 rounded-full" style={[variantStyles.colorSwatch, { backgroundColor: colorHex }]} />
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
            <View className="rounded-full px-1.5 py-0.5" style={inStock ? variantStyles.stockBadgeIn : variantStyles.stockBadgeOut}>
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

/* ── Hoisted styles ─────────────────────────────────────────────────────── */
const variantStyles = StyleSheet.create({
  scrollContent: { paddingRight: 16 },
  selectedChipDot: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  card: { width: 150, height: 210 },
  cardSelected: { borderWidth: 2, borderColor: Palette.primary, backgroundColor: '#ffffff' },
  cardDefault: { borderWidth: 1.5, borderColor: '#f3f4f6', backgroundColor: '#ffffff' },
  cardOutOfStock: { opacity: 0.5 },
  imageContainer: { height: 100, backgroundColor: '#f9fafb' },
  image: { width: '100%', height: '100%' },
  checkBadge: { width: 22, height: 22, backgroundColor: '#ffffff', borderWidth: 1.5, borderColor: Palette.primary },
  discountBadge: { backgroundColor: '#dcfce7' },
  discountText: { fontSize: 9, fontWeight: '700', color: '#16a34a' },
  colorRow: { height: 16 },
  colorSwatch: { borderWidth: 1, borderColor: '#e5e7eb' },
  stockBadgeIn: { backgroundColor: '#f0fdf4' },
  stockBadgeOut: { backgroundColor: '#fef2f2' },
  stockTextIn: { fontSize: 9, fontWeight: '600', color: '#16a34a' },
  stockTextOut: { fontSize: 9, fontWeight: '600', color: '#ef4444' },
});

const s = StyleSheet.create({
  serif: { fontFamily: (Fonts as any).serif },
  eyebrowLine: { width: 20, height: 2, backgroundColor: Palette.primary },

  // Hero
  discountRibbon: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  paginationDot: { height: 6, borderRadius: 3 },
  paginationDotActive: { width: 20, backgroundColor: Palette.primary },
  paginationDotInactive: { width: 6, backgroundColor: '#d1d5db' },
  wishlistButton: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#f3f4f6',
    alignItems: 'center', justifyContent: 'center',
  },
  thumbnailStrip: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  thumbnail: { borderWidth: 2.5 },
  thumbnailActive: { borderColor: Palette.primary },
  thumbnailInactive: { borderColor: '#e5e7eb' },
  thumbnailImage: { width: '100%', height: '100%' },

  // Product header / price
  priceCard: { borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)' },
  offerBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#ffffff', borderWidth: 1, borderColor: Palette.primary, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4,
  },
  savePill: { borderWidth: 1, borderColor: '#a7f3d0' },
  colorDot: { borderWidth: 1, borderColor: '#e5e7eb' },

  // Dispatch / logistics
  dispatchCard: { borderWidth: 1, borderColor: '#E01A1B' },
  courierBtn: { padding: 5, borderRadius: 12, borderWidth: 2, borderColor: '#e5e7eb', backgroundColor: '#ffffff', position: 'relative' },
  courierBtnActive: { borderColor: Palette.primary },
  courierCheck: {
    position: 'absolute', top: -6, right: -6,
    width: 16, height: 16, borderRadius: 8, backgroundColor: '#ffffff',
    alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: Palette.primary,
  },

  // Order summary
  divider: { height: 1, backgroundColor: '#e5e7eb', marginVertical: 2 },

  // Offer ribbon
  ribbon: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16,
    backgroundColor: '#ffffff', borderWidth: 1.5, borderColor: Palette.primary,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 3,
  },
  ribbonIconWrap: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: '#FCE8E8',
    alignItems: 'center', justifyContent: 'center',
  },

  // Tabs
  tabBar: { paddingHorizontal: 16 },
  tab: { position: 'relative', paddingHorizontal: 14, paddingVertical: 14 },
  tabText: { fontSize: 13, fontWeight: '600', color: '#6b7280' },
  tabTextActive: { color: Palette.primary },
  tabUnderline: { position: 'absolute', left: 12, right: 12, bottom: 0, height: 2.5, borderRadius: 2, backgroundColor: Palette.primary },

  // Description / specs
  descriptionText: { fontSize: 13, color: '#4b5563', lineHeight: 21 },
  descriptionClamped: { overflow: 'hidden' },
  specRowBorder: { borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  specDots: { flex: 1, borderBottomWidth: 1, borderStyle: 'dotted', borderColor: 'rgba(209,213,219,0.8)', marginHorizontal: 10, marginBottom: 4 },
  carePill: { borderWidth: 1, borderColor: '#e5e7eb' },
  careStepBadge: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#ffffff', borderWidth: 1.5, borderColor: Palette.primary, alignItems: 'center', justifyContent: 'center' },
  shipBox: { borderWidth: 1, borderColor: '#E01A1B' },

  // Promo (offers rail) — image variant
  promoCard: { minHeight: 210, justifyContent: 'flex-end', shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.25, shadowRadius: 24, elevation: 8 },
  promoOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  promoBadge: { position: 'absolute', top: 16, left: 16, backgroundColor: '#ffffff', borderWidth: 1, borderColor: Palette.primary, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  promoBadgeText: { color: '#E01A1B', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  promoKindChip: { position: 'absolute', top: 16, right: 16, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  promoKindText: { color: '#ffffff', fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  promoBody: { padding: 16 },
  promoTitle: { color: '#ffffff', fontSize: 16, fontWeight: '700', lineHeight: 20 },
  promoDesc: { color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 2 },
  promoCodeBox: { flex: 1, borderWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.6)', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 8, paddingVertical: 6, paddingHorizontal: 12, alignItems: 'center' },
  promoCode: { color: '#ffffff', fontSize: 14, fontWeight: '700', letterSpacing: 2 },
  promoCopyBtn: { backgroundColor: '#ffffff', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  promoCopyText: { color: Palette.primary, fontSize: 12, fontWeight: '700' },
  promoSaving: { color: '#ffffff', backgroundColor: 'rgba(16,185,129,0.9)', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, fontSize: 11, fontWeight: '700' },
  promoEnds: { color: 'rgba(255,255,255,0.9)', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, fontSize: 11, fontWeight: '600' },

  // Promo (offers rail) — branded card variant
  railCard: { borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)' },
  railHeader: { backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#ffe1e1' },
  railHeaderIcon: { width: 28, height: 28, borderRadius: 8, backgroundColor: '#FCE8E8', alignItems: 'center', justifyContent: 'center' },
  railBadge: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: Palette.primary, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  railBadgeText: { color: '#E01A1B', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  railCodeBox: { flex: 1, borderWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(224,26,27,0.5)', backgroundColor: '#ffffff', borderRadius: 8, paddingVertical: 6, paddingHorizontal: 12, alignItems: 'center' },
  railCode: { color: Palette.primary, fontSize: 14, fontWeight: '700', letterSpacing: 2 },
  railCopyBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#ffffff', borderWidth: 1.5, borderColor: Palette.primary, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  railCopyText: { color: '#E01A1B', fontSize: 12, fontWeight: '700' },

  // Manufacturer
  makerAvatarWrap: { width: 80, height: 80, borderRadius: 40, padding: 3, borderWidth: 2, borderColor: 'rgba(224,26,27,0.15)', alignItems: 'center', justifyContent: 'center' },
  makerAvatar: { width: '100%', height: '100%', borderRadius: 40 },
  makerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  makerModal: { width: '100%', maxWidth: 440, backgroundColor: '#ffffff', borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.3, shadowRadius: 40, elevation: 24 },
  makerBand: {
    height: 96, backgroundColor: '#FCE8E8',
    borderBottomWidth: 1, borderBottomColor: '#ffe1e1',
    alignItems: 'center', justifyContent: 'center',
  },
  makerModalClose: { position: 'absolute', top: 12, right: 12, zIndex: 5, padding: 6 },
  makerBandAvatar: {
    position: 'absolute', bottom: -32, width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#ffffff', padding: 4,
  },
  makerBandAvatarImg: { width: '100%', height: '100%', borderRadius: 40 },
  makerModalBody: { paddingTop: 44, paddingBottom: 24, paddingHorizontal: 20 },
  makerDivider: { height: 1, flex: 1, backgroundColor: '#f3f4f6' },

  // Purchase panel
  stockDotIn: { backgroundColor: '#22c55e' },
  stockDotOut: { backgroundColor: '#9ca3af' },

  // Quantity + action bar
  qtyContainer: { height: 48 },
  qtyButton: { width: 44, height: 48 },
  qtyTextEnabled: { color: '#111827' },
  qtyTextDisabled: { color: '#9ca3af' },
  addToCartOutline: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  buyNowButton: {
    backgroundColor: Palette.primary,
    shadowColor: Palette.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 14, elevation: 6,
  },
  addToCartShadow: { shadowColor: Palette.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 5 },
  buyNowBar: { backgroundColor: Palette.primary },
});
