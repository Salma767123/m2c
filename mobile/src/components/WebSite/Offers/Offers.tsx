import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Tag, Percent, Clock, ArrowRight } from 'lucide-react-native';
import ScreenHeader from '@/components/WebSite/Shared/ScreenHeader';
import { offerService } from '@/services/offerService';
import { offerEndsLabel, type PublicOffer } from '@/lib/offers';
import { Fonts, Palette, Radius, Shadow } from '@/constants/theme';
import { Skeleton } from '@/components/ui/Skeleton';

/**
 * Live offers landing screen — the mobile counterpart of the web's
 * /offers page (frontend/src/components/WebSite/Offers/OffersGrid.tsx).
 *
 * Offers apply automatically at checkout; this screen is discovery only, so
 * every card is a shortcut into the catalogue rather than an action.
 */

/** Where an offer's card should navigate. Mirrors `offerLink` on the web. */
function offerTarget(o: PublicOffer) {
  if (o.scope === 'PRODUCT' && o.productIds?.length === 1) {
    return { pathname: '/(any)/products/[id]', params: { id: o.productIds[0] } } as const;
  }
  if (o.scope === 'CATEGORY' && o.categoryNames?.length === 1) {
    return { pathname: '/(any)/products', params: { category: o.categoryNames[0] } } as const;
  }
  return { pathname: '/(any)/products', params: {} } as const;
}

function OfferCardSkeleton() {
  return (
    <View style={s.card}>
      <Skeleton width="100%" height={132} borderRadius={0} />
      <View style={s.cardBody}>
        <Skeleton width="70%" height={15} />
        <Skeleton width="90%" height={11} style={{ marginTop: 8 }} />
        <Skeleton width="40%" height={11} style={{ marginTop: 14 }} />
      </View>
    </View>
  );
}

export default function Offers() {
  const insets = useSafeAreaInsets();
  const [offers, setOffers] = useState<PublicOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const data = await offerService.getActiveOffers();
    setOffers(data);
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  return (
    <View style={s.root}>
      {/* Was a dark #111827 bar with a Roboto title — the last screen still
          wearing its own masthead after the rest of the app moved onto the
          shared one. Reached from "All offers" on the home board, so it landed
          on a near-black header straight off a warm page. */}
      <ScreenHeader
        onBack={() => (router.canGoBack() ? router.back() : router.push('/(tabs)'))}
        title="Offers"
        subtitle="Live deals and coupons"
      />

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Palette.primary}
            colors={[Palette.primary]}
          />
        }
      >
        {/* Intro */}
        <View style={s.intro}>
          <View style={s.introPill}>
            <Percent size={13} color={Palette.primary} />
            <Text style={s.introPillText}>Live Offers</Text>
          </View>
          <Text style={s.introTitle}>Today&apos;s Best Deals</Text>
          <Text style={s.introSub}>
            Automatic savings — no code needed. Prices already reflect the offer
            at checkout.
          </Text>
        </View>

        <View style={s.list}>
          {loading ? (
            <>
              <OfferCardSkeleton />
              <OfferCardSkeleton />
              <OfferCardSkeleton />
            </>
          ) : offers.length === 0 ? (
            <View style={s.empty}>
              <Tag size={44} color={Palette.outlineVariant} />
              <Text style={s.emptyTitle}>No live offers right now</Text>
              <Text style={s.emptySub}>
                Check back soon — new campaigns go live regularly.
              </Text>
              <Pressable
                onPress={() => router.push('/(any)/products')}
                style={s.emptyCta}
                accessibilityRole="button"
              >
                <Text style={s.emptyCtaText}>Browse all products</Text>
                <ArrowRight size={15} color="#ffffff" />
              </Pressable>
            </View>
          ) : (
            offers.map((o) => {
              const ends = offerEndsLabel(o.endsAt);
              return (
                <Pressable
                  key={o.id}
                  onPress={() => router.push(offerTarget(o) as any)}
                  style={({ pressed }) => [s.card, pressed && s.cardPressed]}
                  accessibilityRole="button"
                  accessibilityLabel={`${o.title}. ${o.badge}. Shop now`}
                >
                  {/* Banner */}
                  <View style={s.banner}>
                    {o.bannerImage ? (
                      <Image
                        source={{ uri: o.bannerImage }}
                        style={s.bannerImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={s.bannerFallback}>
                        <Text style={s.bannerFallbackText}>{o.badge}</Text>
                      </View>
                    )}
                    <View style={s.badgePill}>
                      <Text style={s.badgePillText}>{o.badge}</Text>
                    </View>
                  </View>

                  {/* Body */}
                  <View style={s.cardBody}>
                    <Text style={s.cardTitle} numberOfLines={2}>
                      {o.title}
                    </Text>
                    {o.description ? (
                      <Text style={s.cardDesc} numberOfLines={2}>
                        {o.description}
                      </Text>
                    ) : null}

                    <View style={s.cardFooter}>
                      {ends ? (
                        <View style={s.endsRow}>
                          <Clock size={13} color={Palette.primary} />
                          <Text style={s.endsText}>{ends}</Text>
                        </View>
                      ) : (
                        <View />
                      )}
                      <View style={s.shopRow}>
                        <Text style={s.shopText}>Shop now</Text>
                        <ArrowRight size={15} color={Palette.primary} />
                      </View>
                    </View>
                  </View>
                </Pressable>
              );
            })
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Palette.background },
  intro: { paddingHorizontal: 20, paddingTop: 22, paddingBottom: 16, alignItems: 'center' },
  introPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Palette.primaryContainer,
    borderRadius: Radius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 10,
  },
  introPillText: {
    fontFamily: Fonts.sansBold,
    color: Palette.primary,
    fontSize: 12,
    // Outfit is static: the weight must name the loaded file (Outfit_700Bold).
    fontWeight: '700',
  },
  introTitle: {
    fontFamily: Fonts.heading,
    fontSize: 24,
    // Poppins_600SemiBold is the loaded file; 800 faked a bolder one.
    fontWeight: '600',
    color: '#1a1a1a',
    letterSpacing: -0.4,
  },
  introSub: {
    fontFamily: Fonts.sans,
    fontSize: 13,
    color: '#5f5550',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 19,
  },

  list: { paddingHorizontal: 16, gap: 14 },

  card: {
    backgroundColor: Palette.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Palette.outline,
    overflow: 'hidden',
    ...Shadow.cardRest,
  },
  cardPressed: { opacity: 0.9, transform: [{ scale: 0.995 }] },

  banner: { height: 132, backgroundColor: Palette.primary },
  bannerImage: { width: '100%', height: '100%' },
  bannerFallback: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  bannerFallbackText: {
    color: '#ffffff',
    fontFamily: Fonts.sansBold,
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: -0.6,
  },
  badgePill: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgePillText: {
    fontFamily: Fonts.sansBold,
    color: Palette.primary,
    fontSize: 11,
    fontWeight: '700',
  },

  cardBody: { padding: 14 },
  cardTitle: {
    fontFamily: Fonts.sansBold,
    fontSize: 15,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  cardDesc: {
    fontFamily: Fonts.sans,
    fontSize: 12.5,
    color: '#5f5550',
    marginTop: 4,
    lineHeight: 18,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
  },
  endsRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  endsText: {
    fontFamily: Fonts.sansBold,
    fontSize: 11.5,
    fontWeight: '700',
    color: Palette.primary,
  },
  shopRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  shopText: {
    fontFamily: Fonts.sansBold,
    fontSize: 13,
    fontWeight: '700',
    color: Palette.primary,
  },

  empty: { alignItems: 'center', paddingVertical: 64, paddingHorizontal: 32 },
  emptyTitle: {
    fontFamily: Fonts.heading,
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginTop: 14,
  },
  emptySub: {
    fontFamily: Fonts.sans,
    fontSize: 13,
    color: Palette.textMuted,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 19,
  },
  emptyCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: Palette.primary,
    borderRadius: Radius.md,
    paddingHorizontal: 20,
    height: 44,
    marginTop: 20,
  },
  emptyCtaText: {
    fontFamily: Fonts.sansBold,
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});
