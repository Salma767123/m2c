import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, Modal, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { X, Tag, Copy, Check, ArrowRight } from 'lucide-react-native';
import { couponService, type PopupCoupon } from '@/services/couponService';
import { formatPrice } from '@/lib/currency';
import { Palette } from '@/constants/theme';

// Port of frontend PromotionalPopup — a category coupon modal shown once per
// category per session, 1.5s after the product page loads. AsyncStorage stands
// in for the web's sessionStorage.

interface PromotionalPopupProps {
  category: string;
}

export default function PromotionalPopup({ category }: PromotionalPopupProps) {
  const [coupon, setCoupon] = useState<PopupCoupon | null>(null);
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!category) return;
    const sessionKey = `popup_shown_${category}`;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;

    (async () => {
      try {
        const shown = await AsyncStorage.getItem(sessionKey);
        if (shown) return;
        const data = await couponService.getPopupCoupon(category);
        if (data && !cancelled) {
          setCoupon(data);
          timer = setTimeout(() => setVisible(true), 1500);
        }
      } catch { /* ignore */ }
    })();

    return () => { cancelled = true; if (timer) clearTimeout(timer); };
  }, [category]);

  const handleClose = async () => {
    setVisible(false);
    if (category) {
      try { await AsyncStorage.setItem(`popup_shown_${category}`, 'true'); } catch { /* ignore */ }
    }
  };

  const handleCopy = async () => {
    if (!coupon) return;
    try {
      await Clipboard.setStringAsync(coupon.code);
      if (typeof Haptics !== 'undefined') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  };

  if (!visible || !coupon) return null;

  // discountValue is stored in INR (the admin enters ₹ in coupon management), so a
  // flat ₹500 coupon must advertise itself as "₹500 OFF" on both storefronts.
  const discountText =
    coupon.discountType === 'PERCENTAGE'
      ? `${coupon.discountValue}% OFF`
      : `${formatPrice(coupon.discountValue, 'INR')} OFF`;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={handleClose}>
      <View style={s.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
        <View style={s.card} onStartShouldSetResponder={() => true}>
          <Pressable onPress={handleClose} style={s.close} accessibilityLabel="Close popup">
            <X size={16} color="#374151" />
          </Pressable>

          {coupon.popupImage ? (
            <View style={s.imageWrap}>
              <Image source={{ uri: coupon.popupImage }} style={s.image} contentFit="cover" />
            </View>
          ) : null}

          <View style={s.body}>
            <View style={s.badgeRow}>
              <View style={s.badge}>
                <Tag size={12} color={Palette.primary} />
                <Text style={s.badgeText}>{discountText}</Text>
              </View>
            </View>

            <Text style={s.title}>{coupon.popupTitle || `${discountText} on ${category}!`}</Text>
            <Text style={s.message}>
              {coupon.popupMessage || coupon.description || `Use code below to get ${discountText.toLowerCase()} on your purchase.`}
            </Text>

            <Pressable onPress={handleCopy} style={s.codeBox} accessibilityRole="button" accessibilityLabel="Copy coupon code">
              <Text style={s.code} numberOfLines={1}>{coupon.code}</Text>
              {copied ? (
                <View style={s.copyState}>
                  <Check size={15} color="#16a34a" />
                  <Text style={s.copiedText}>Copied!</Text>
                </View>
              ) : (
                <View style={s.copyState}>
                  <Copy size={15} color="#4b5563" />
                  <Text style={s.copyText}>Copy</Text>
                </View>
              )}
            </Pressable>

            <Pressable onPress={handleClose} style={s.shopBtn} accessibilityRole="button">
              <Text style={s.shopBtnText}>Shop Now</Text>
              <ArrowRight size={16} color="#ffffff" />
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  card: {
    width: '100%', maxWidth: 440, backgroundColor: '#ffffff', borderRadius: 16, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.2, shadowRadius: 32, elevation: 16,
  },
  close: {
    position: 'absolute', top: 12, right: 12, zIndex: 10,
    width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 4, elevation: 3,
  },
  imageWrap: { width: '100%', aspectRatio: 16 / 9, backgroundColor: '#f3f4f6' },
  image: { width: '100%', height: '100%' },
  body: { padding: 20 },
  badgeRow: { flexDirection: 'row', marginBottom: 8 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#E01A1B', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  badgeText: { fontSize: 12, fontWeight: '700', color: Palette.primary },
  title: { fontSize: 18, fontWeight: '600', color: '#1a1a1a', marginBottom: 4, lineHeight: 24 },
  message: { fontSize: 13, color: '#4b5563', lineHeight: 20, marginBottom: 16 },
  codeBox: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 2, borderStyle: 'dashed', borderColor: '#d1d5db', backgroundColor: '#f9fafb',
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 16,
  },
  code: { fontSize: 17, fontWeight: '700', letterSpacing: 2, color: '#111827', flexShrink: 1 },
  copyState: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  copyText: { fontSize: 13, fontWeight: '500', color: '#4b5563' },
  copiedText: { fontSize: 13, fontWeight: '500', color: '#16a34a' },
  shopBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Palette.primary, borderRadius: 999, paddingVertical: 14,
    shadowColor: Palette.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 14, elevation: 6,
  },
  shopBtnText: { color: '#ffffff', fontWeight: '700', fontSize: 15 },
});
