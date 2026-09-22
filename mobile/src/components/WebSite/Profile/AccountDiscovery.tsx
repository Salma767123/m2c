/**
 * Two account discovery rails under Profile Information — port of
 * frontend/src/components/WebSite/Profile/AccountDiscovery.tsx.
 *
 *  1. "Awaiting your review" — delivered orders the customer has not reviewed
 *     yet, each with a one-tap Write-review button that opens the shared
 *     ReviewModal.
 *  2. "Recently viewed" — this shopper's own history, so they can get back to
 *     something they were looking at.
 *
 * Each rail hides itself when it has nothing to show, so the profile stays
 * clean for a new account.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Eye, Package, PenLine } from 'lucide-react-native';
import { router } from 'expo-router';
import { getRecentlyViewed } from '@/lib/browsingHistory';
import { publicProductService, type PublicProduct } from '@/services/publicProductService';
import { orderService } from '@/services/orderService';
import { reviewService } from '@/services/reviewService';
import ReviewModal from '@/components/WebSite/Review/ReviewModal';
import { formatPrice, getRegionalPrice } from '@/lib/currency';
import { Fonts } from '@/constants/theme';

type ReviewPending = {
  orderId: string;
  orderDisplayId: string;
  productName: string;
  productImage?: string;
  items: any[];
};

const isDelivered = (status?: string) =>
  ['delivered', 'completed', 'received'].includes(String(status || '').toLowerCase());

export default function AccountDiscovery() {
  const [recent, setRecent] = useState<PublicProduct[]>([]);
  const [pending, setPending] = useState<ReviewPending[]>([]);
  const [reviewModal, setReviewModal] = useState<{
    visible: boolean;
    orderId: string;
    orderDisplayId: string;
    items: any[];
  }>({ visible: false, orderId: '', orderDisplayId: '', items: [] });

  // Recently viewed — resolve the stored ids to live products.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const ids = (await getRecentlyViewed()).slice(0, 10);
      if (!ids.length) return;
      const list = await Promise.all(
        ids.map((id) =>
          publicProductService
            .getProduct(id)
            .then((r) => (r.success ? r.data : null))
            .catch(() => null),
        ),
      );
      if (!cancelled) setRecent(list.filter(Boolean) as PublicProduct[]);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Awaiting review — delivered orders whose first item has no review yet.
  const loadPending = useCallback(async () => {
    try {
      const res = await orderService.getUserOrders();
      if (!res?.success || !Array.isArray(res.data)) return;
      const delivered = res.data.filter((o) => isDelivered(o.status) && o.items?.[0]?.productId);
      const out: ReviewPending[] = [];
      for (const o of delivered) {
        const first = o.items[0];
        try {
          const r = await reviewService.checkReviewStatus(first.productId, o.id);
          if (!r?.hasReviewed) {
            out.push({
              orderId: o.id,
              orderDisplayId: o.orderId,
              productName: first.productName || 'Your purchase',
              productImage: first.productImage,
              items: o.items,
            });
          }
        } catch {
          /* a failed check just means we do not nudge for that order */
        }
      }
      setPending(out.slice(0, 6));
    } catch {
      /* fail open — the rail simply does not appear */
    }
  }, []);

  useEffect(() => {
    loadPending();
  }, [loadPending]);

  if (pending.length === 0 && recent.length === 0) return null;

  return (
    <View style={{ gap: 22 }}>
      {pending.length > 0 ? (
        <View>
          <View style={s.head}>
            <PenLine size={15} color="#e01a1b" />
            <Text style={s.title}>Awaiting your review</Text>
          </View>
          <Text style={s.blurb}>
            You bought these — share what you think and help other shoppers.
          </Text>

          <View style={{ gap: 8, marginTop: 12 }}>
            {pending.map((p) => (
              <View key={p.orderId} style={s.row}>
                <View style={s.thumb}>
                  {p.productImage ? (
                    <Image
                      source={{ uri: p.productImage }}
                      style={StyleSheet.absoluteFill}
                      contentFit="cover"
                    />
                  ) : (
                    <Package size={18} color="#c9bcae" />
                  )}
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={s.rowTitle} numberOfLines={1}>
                    {p.productName}
                  </Text>
                  <Text style={s.rowMeta}>Delivered · not reviewed yet</Text>
                </View>
                <Pressable
                  onPress={() =>
                    setReviewModal({
                      visible: true,
                      orderId: p.orderId,
                      orderDisplayId: p.orderDisplayId,
                      items: p.items,
                    })
                  }
                  accessibilityRole="button"
                  accessibilityLabel={`Write a review for ${p.productName}`}
                  android_ripple={{ color: 'rgba(224,26,27,0.08)' }}
                  style={s.reviewBtn}
                >
                  <PenLine size={13} color="#e01a1b" />
                  <Text style={s.reviewBtnText}>Review</Text>
                </Pressable>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {recent.length > 0 ? (
        <View>
          <View style={s.head}>
            <Eye size={15} color="#e01a1b" />
            <Text style={s.title}>Recently viewed</Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 10, paddingTop: 12, paddingRight: 4 }}
          >
            {recent.map((p) => (
              <Pressable
                key={p.id}
                onPress={() => router.push({ pathname: '/(any)/products/[id]', params: { id: p.id } })}
                accessibilityRole="button"
                accessibilityLabel={p.name}
                style={s.tile}
              >
                <View style={s.tileImage}>
                  {p.images?.[0]?.url ? (
                    <Image
                      source={{ uri: p.images.find((i) => i.isPrimary)?.url || p.images[0].url }}
                      style={StyleSheet.absoluteFill}
                      contentFit="cover"
                    />
                  ) : (
                    <Package size={20} color="#c9bcae" />
                  )}
                </View>
                <Text style={s.tileName} numberOfLines={2}>
                  {p.name}
                </Text>
                <Text style={s.tilePrice}>{formatPrice(getRegionalPrice(p))}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : null}

      <ReviewModal
        visible={reviewModal.visible}
        orderId={reviewModal.orderId}
        orderDisplayId={reviewModal.orderDisplayId}
        items={reviewModal.items}
        onClose={() => setReviewModal((m) => ({ ...m, visible: false }))}
        onReviewSubmitted={() => {
          setReviewModal((m) => ({ ...m, visible: false }));
          loadPending();
        }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  title: {
    fontFamily: Fonts.sansBold,
    fontSize: 14,
    // Outfit is static: the weight must name the loaded file (Outfit_700Bold).
    fontWeight: '700',
    color: '#1a1a1a',
  },
  blurb: { fontFamily: Fonts.sans, fontSize: 12.5, lineHeight: 18, color: '#5f5550', marginTop: 4 },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#efe4d8',
    borderRadius: 14,
    padding: 10,
  },
  thumb: {
    width: 44,
    height: 44,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#f6efe8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: {
    fontFamily: Fonts.sansSemibold,
    fontSize: 13,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  rowMeta: { fontFamily: Fonts.sans, fontSize: 11.5, color: '#8b8079', marginTop: 1 },
  reviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: 'rgba(224,26,27,0.25)',
    backgroundColor: '#fff8f8',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    overflow: 'hidden',
  },
  reviewBtnText: {
    fontFamily: Fonts.sansSemibold,
    fontSize: 12,
    fontWeight: '600',
    color: '#e01a1b',
  },

  tile: { width: 116 },
  tileImage: {
    width: 116,
    height: 116,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f6efe8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileName: {
    fontFamily: Fonts.sansMedium,
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
    color: '#1a1a1a',
    marginTop: 6,
  },
  tilePrice: {
    fontFamily: Fonts.sansBold,
    fontSize: 13,
    fontWeight: '700',
    color: '#1a1a1a',
    marginTop: 2,
  },
});
