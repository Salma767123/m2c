/**
 * Pick a free gift — port of the GiftChooserModal inside
 * frontend/src/components/WebSite/Cart/Cart.tsx.
 *
 * Shown when a "buy A get B free" offer's free set has more than one option, or
 * when the single option has variants to choose between. The customer picks the
 * product, then the variant if there is one; only then can the gift be claimed.
 */
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { Check, Gift, Package, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { PendingGift } from '@/services/cartService';
import { Fonts } from '@/constants/theme';

const GIFT_GREEN = '#157f4a';

export default function GiftChooserModal({
  gift,
  initialProductId,
  busy,
  onClose,
  onChoose,
}: {
  /** null closes the sheet. */
  gift: PendingGift | null;
  initialProductId?: string;
  busy: boolean;
  onClose: () => void;
  onChoose: (productId: string, variantId?: string) => void;
}) {
  const insets = useSafeAreaInsets();
  const [productId, setProductId] = useState('');
  const [variantId, setVariantId] = useState('');

  useEffect(() => {
    if (!gift) return;
    // Prefer the product already chosen (the "Change gift" path), else the first.
    const first =
      (initialProductId && gift.options.some((o) => o.productId === initialProductId)
        ? initialProductId
        : gift.options[0]?.productId) || '';
    setProductId(first);
    setVariantId('');
  }, [gift, initialProductId]);

  if (!gift) return null;

  const selected = gift.options.find((o) => o.productId === productId);
  const needsVariant = (selected?.variants?.length || 0) > 0;
  const canAdd = !!productId && (!needsVariant || !!variantId);

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={s.backdrop}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => !busy && onClose()}
          accessibilityLabel="Close"
        />

        <View style={[s.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View style={s.head}>
            <View style={s.headIcon}>
              <Gift size={18} color="#ffffff" />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={s.title}>Choose your free gift</Text>
              <Text style={s.subtitle} numberOfLines={1}>
                {gift.offerTitle}
                {gift.getQty > 1 ? ` · ×${gift.getQty}` : ''}
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              disabled={busy}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <X size={20} color="#9ca3af" />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ padding: 20, gap: 14 }}>
            <View style={{ gap: 8 }}>
              {gift.options.map((o) => {
                const active = productId === o.productId;
                return (
                  <Pressable
                    key={o.productId}
                    onPress={() => {
                      setProductId(o.productId);
                      setVariantId('');
                    }}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={o.name}
                    style={[s.option, active && s.optionActive]}
                  >
                    <View style={s.thumb}>
                      {o.image ? (
                        <Image
                          source={{ uri: o.image }}
                          style={StyleSheet.absoluteFill}
                          contentFit="cover"
                        />
                      ) : (
                        <Package size={18} color="#c9bcae" />
                      )}
                    </View>
                    <Text style={[s.optionName, active && s.optionNameActive]} numberOfLines={2}>
                      {o.name}
                    </Text>
                    {active ? <Check size={16} color={GIFT_GREEN} strokeWidth={3} /> : null}
                  </Pressable>
                );
              })}
            </View>

            {needsVariant ? (
              <View>
                <Text style={s.variantLabel}>Choose a variant</Text>
                <View style={s.variantWrap}>
                  {selected!.variants.map((v) => {
                    const active = variantId === v.id;
                    const out = v.stock <= 0;
                    const label = [v.size, v.color].filter(Boolean).join(' · ') || 'Standard';
                    return (
                      <Pressable
                        key={v.id}
                        onPress={() => !out && setVariantId(v.id)}
                        disabled={out}
                        accessibilityRole="radio"
                        accessibilityState={{ selected: active, disabled: out }}
                        accessibilityLabel={`${label}${out ? ', out of stock' : ''}`}
                        style={[s.variant, active && s.variantActive, out && s.variantOut]}
                      >
                        {v.colorHex ? (
                          <View style={[s.swatch, { backgroundColor: v.colorHex }]} />
                        ) : null}
                        <Text style={[s.variantText, active && s.variantTextActive]}>{label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ) : null}
          </ScrollView>

          <View style={s.foot}>
            <Pressable
              onPress={onClose}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel="Cancel"
              style={[s.footBtn, s.footGhost]}
            >
              <Text style={s.footGhostText}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={() => onChoose(productId, variantId || undefined)}
              disabled={!canAdd || busy}
              accessibilityRole="button"
              accessibilityLabel="Add free gift"
              accessibilityState={{ disabled: !canAdd || busy, busy }}
              style={[s.footBtn, s.footPrimary, (!canAdd || busy) && { opacity: 0.6 }]}
            >
              {busy ? <ActivityIndicator size="small" color="#ffffff" /> : null}
              <Text style={s.footPrimaryText}>{busy ? 'Adding…' : 'Add free gift'}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'flex-end' },
  sheet: {
    maxHeight: '88%',
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },

  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f3ece5',
  },
  headIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: GIFT_GREEN,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: Fonts.heading,
    fontSize: 17,
    // Poppins_600SemiBold is the loaded file.
    fontWeight: '600',
    letterSpacing: -0.35,
    color: '#1a1a1a',
  },
  subtitle: { fontFamily: Fonts.sans, fontSize: 12, color: '#7a5a52', marginTop: 1 },

  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#efe4d8',
    borderRadius: 14,
    padding: 10,
  },
  optionActive: { borderColor: GIFT_GREEN, backgroundColor: '#f2fbf6' },
  thumb: {
    width: 48,
    height: 48,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#f6efe8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionName: {
    flex: 1,
    minWidth: 0,
    fontFamily: Fonts.sansMedium,
    fontSize: 13.5,
    fontWeight: '500',
    lineHeight: 18,
    color: '#1a1a1a',
  },
  optionNameActive: { fontFamily: Fonts.sansSemibold, fontWeight: '600' },

  variantLabel: {
    fontFamily: Fonts.sansSemibold,
    fontSize: 13,
    fontWeight: '600',
    color: '#3d352f',
    marginBottom: 8,
  },
  variantWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  variant: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#e6dcd0',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  variantActive: { borderColor: GIFT_GREEN, backgroundColor: '#f2fbf6' },
  variantOut: { opacity: 0.4 },
  swatch: { width: 12, height: 12, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(0,0,0,0.1)' },
  variantText: { fontFamily: Fonts.sans, fontSize: 12.5, color: '#5f5550' },
  variantTextActive: { fontFamily: Fonts.sansSemibold, fontWeight: '600', color: '#0f5f38' },

  foot: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#f3ece5',
  },
  footBtn: {
    flex: 1,
    minHeight: 48,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  footGhost: { borderWidth: 1, borderColor: '#e6dcd0', backgroundColor: '#ffffff' },
  footGhostText: {
    fontFamily: Fonts.sansSemibold,
    fontSize: 14,
    fontWeight: '600',
    color: '#5f5550',
  },
  footPrimary: { backgroundColor: GIFT_GREEN },
  footPrimaryText: {
    fontFamily: Fonts.sansBold,
    fontSize: 14,
    // Outfit is static: the weight must name the loaded file (Outfit_700Bold).
    fontWeight: '700',
    color: '#ffffff',
  },
});
