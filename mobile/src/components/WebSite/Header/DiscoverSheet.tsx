/**
 * M2C DISCOVER — the phone sheet.
 *
 * Port of frontend/src/components/WebSite/Header/Discover/DiscoverNav.tsx.
 * That component renders two different things: a floating "living category
 * canvas" for desktop, and a full-height bottom sheet for phones
 * (`md:hidden … absolute inset-x-0 bottom-0 max-h-[90vh] rounded-t-3xl`).
 * Only the sheet is ported here — it is the treatment the web itself shows at
 * this width, so matching it is matching the site rather than shrinking the
 * desktop canvas into something the web never displays.
 *
 * Mobile had no Discover entry point at all, so six curated entry routes
 * (Trending, New Arrivals, Best Sellers, Offers, Coupons, Collections) existed
 * on the web and nowhere in the app.
 *
 * Counts on the Offers and Coupons tiles come from the same two services the
 * web uses, and a failed request simply drops the count rather than the tile.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import {
  ArrowRight,
  ArrowUpRight,
  Clock,
  Crown,
  Flame,
  Layers,
  Sparkles,
  Tag,
  Ticket,
  X,
} from 'lucide-react-native';
import { categoryService, Category } from '@/services/categoryService';
import { offerService } from '@/services/offerService';
import { couponService } from '@/services/couponService';
import { Fonts } from '@/constants/theme';

/** Categories shown as panels; the rest live behind "View all". Web: MAX_PANELS. */
const MAX_PANELS = 6;

type ModeKey = 'trending' | 'new' | 'best' | 'offers' | 'coupons' | 'collections';

/**
 * A distinct colour per discovery mode. The web writes these as Tailwind
 * gradient pairs; these are the same two stops per mode, resolved to hex so
 * expo-linear-gradient can take them.
 */
const MODE_THEME: Record<ModeKey, { grad: [string, string]; pillBg: string; pillFg: string }> = {
  trending:    { grad: ['#fb923c', '#f43f5e'], pillBg: '#fff7ed', pillFg: '#ea580c' },
  new:         { grad: ['#38bdf8', '#6366f1'], pillBg: '#f0f9ff', pillFg: '#0284c7' },
  best:        { grad: ['#fbbf24', '#f97316'], pillBg: '#fffbeb', pillFg: '#d97706' },
  offers:      { grad: ['#f43f5e', '#db2777'], pillBg: '#fff1f2', pillFg: '#e11d48' },
  coupons:     { grad: ['#34d399', '#14b8a6'], pillBg: '#ecfdf5', pillFg: '#059669' },
  collections: { grad: ['#8b5cf6', '#9333ea'], pillBg: '#f5f3ff', pillFg: '#7c3aed' },
};

type Mode = {
  key: ModeKey;
  label: string;
  desc: string;
  href: string;
  icon: typeof Flame;
  count?: number;
  countLabel?: string;
};

export default function DiscoverSheet({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [offerCount, setOfferCount] = useState<number | null>(null);
  const [couponCount, setCouponCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  // Load only while open, and only once per opening — the sheet is mounted by
  // a <Modal>, so its children would otherwise build on every parent render.
  useEffect(() => {
    if (!visible) return;
    let cancelled = false;

    setLoading(true);
    categoryService
      .getAllCategories({ status: 'ACTIVE', showRootOnly: 'true', sortBy: 'sortOrder', sortOrder: 'asc' })
      .then((res) => {
        if (cancelled) return;
        setCategories(res.success && res.data ? res.data : []);
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false));

    // Counts are decoration on the tiles: if either call fails the tile still
    // renders, just without its pill.
    offerService
      .getActiveOffers()
      .then((list) => !cancelled && setOfferCount(Array.isArray(list) ? list.length : null))
      .catch(() => {});

    couponService
      .getCoupons()
      .then((res) => {
        if (cancelled) return;
        const n = res?.data?.coupons?.length;
        setCouponCount(typeof n === 'number' ? n : null);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [visible]);

  const go = useCallback(
    (href: string) => {
      onClose();
      router.push(href as any);
    },
    [onClose],
  );

  // The web's six modes, same labels, same descriptions, same destinations.
  const modes: Mode[] = useMemo(
    () => [
      { key: 'trending',    label: 'Trending',     desc: 'Recently popular',   href: '/(any)/products?collection=top-selling', icon: Flame },
      { key: 'new',         label: 'New Arrivals', desc: 'Freshly added',      href: '/(any)/products', icon: Clock },
      { key: 'best',        label: 'Best Sellers', desc: 'Most purchased',     href: '/(any)/products?collection=best-seller', icon: Crown },
      { key: 'offers',      label: 'Offers',       desc: 'Limited-time deals', href: '/(any)/offers', icon: Tag, count: offerCount ?? undefined, countLabel: 'active' },
      { key: 'coupons',     label: 'Coupons',      desc: 'Available savings',  href: '/(any)/offers', icon: Ticket, count: couponCount ?? undefined, countLabel: 'available' },
      { key: 'collections', label: 'Collections',  desc: 'Curated edits',      href: '/(tabs)/categories', icon: Layers },
    ],
    [offerCount, couponCount],
  );

  const panels = useMemo(() => categories.slice(0, MAX_PANELS), [categories]);

  const activeSubs = useCallback(
    (cat: Category) =>
      ((cat as any).subcategories || []).filter(
        (s: any) => !s.status || s.status === 'ACTIVE',
      ),
    [],
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={s.backdrop}>
        {/* Tap-away. A sibling of the sheet rather than its parent, so a tap
            inside the sheet never bubbles out to close it. */}
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close Discover" />

        <View style={s.sheet}>
          <View style={s.head}>
            <View style={s.headTitle}>
              <Sparkles size={14} color="#e01a1b" strokeWidth={2.5} />
              <Text style={s.headText}>Discover</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel="Close">
              <X size={20} color="#9ca3af" strokeWidth={2} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
            {/* ── Modes: two across, as on the web ── */}
            <View style={s.modeGrid}>
              {modes.map((m) => {
                const t = MODE_THEME[m.key];
                const Icon = m.icon;
                const hasCount = typeof m.count === 'number' && m.count > 0;
                return (
                  <Pressable
                    key={m.key}
                    onPress={() => go(m.href)}
                    accessibilityRole="button"
                    accessibilityLabel={`${m.label} — ${m.desc}`}
                    style={[s.mode]}
                  >
                    {hasCount ? (
                      <View style={[s.countPill, { backgroundColor: t.pillBg }]}>
                        <Text style={[s.countText, { color: t.pillFg }]}>
                          {m.count} {m.countLabel}
                        </Text>
                      </View>
                    ) : null}

                    <LinearGradient
                      colors={t.grad}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={s.modeIcon}
                    >
                      <Icon size={16} color="#ffffff" strokeWidth={2.25} />
                    </LinearGradient>

                    <View>
                      <Text style={s.modeLabel}>{m.label}</Text>
                      <Text style={s.modeDesc}>{m.desc}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>

            {/* ── Categories ──
                Photo banners, as the web has them: the image is the card, the
                name reversed out over a scrim, and the subcategory chips on a
                white panel beneath.

                I had rewritten these as compact rows with the picture reduced
                to a thumbnail. That fits more categories per screen, but it is
                not what the web does and it gives the photographs — which are
                the point of a discovery surface — almost nothing to say. */}
            <Text style={s.sectionLabel}>Categories</Text>

            {loading ? (
              <View style={s.loading}>
                <ActivityIndicator size="small" color="#e01a1b" />
              </View>
            ) : (
              <View style={{ gap: 12 }}>
                {panels.map((cat) => {
                  const subs = activeSubs(cat);
                  const count = cat.productCount ?? 0;
                  return (
                    <View key={cat.id} style={s.catCard}>
                      <Pressable
                        onPress={() => go(`/(tabs)/categories/${cat.slug}`)}
                        accessibilityRole="button"
                        accessibilityLabel={`Browse ${cat.name}${count ? `, ${count} products` : ''}`}
                        android_ripple={{ color: 'rgba(255,255,255,0.12)' }}
                        style={s.catBanner}
                      >
                        {cat.image ? (
                          <Image
                            source={{ uri: cat.image }}
                            style={StyleSheet.absoluteFill}
                            contentFit="cover"
                            transition={200}
                          />
                        ) : (
                          <LinearGradient
                            colors={['#e6cfcf', '#f1ded9']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={StyleSheet.absoluteFill}
                          />
                        )}

                        {/* `from-black/70 to-transparent`, bottom-up. */}
                        <LinearGradient
                          colors={['rgba(0,0,0,0.7)', 'rgba(0,0,0,0)']}
                          start={{ x: 0.5, y: 1 }}
                          end={{ x: 0.5, y: 0 }}
                          style={StyleSheet.absoluteFill}
                          pointerEvents="none"
                        />

                        <View style={s.catRow}>
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <Text style={s.catName} numberOfLines={1}>
                              {cat.name}
                            </Text>
                            {count > 0 ? (
                              <Text style={s.catCount}>{count} products</Text>
                            ) : null}
                          </View>
                          <ArrowUpRight size={20} color="#ffffff" strokeWidth={2} />
                        </View>
                      </Pressable>

                      {subs.length > 0 ? (
                        <View style={s.subWrap}>
                          {subs.map((sub: any) => (
                            <Pressable
                              key={sub.id}
                              onPress={() => go(`/(tabs)/categories/${cat.slug}?subcategory=${sub.slug}`)}
                              accessibilityRole="button"
                              accessibilityLabel={sub.name}
                              android_ripple={{ color: 'rgba(224,26,27,0.08)' }}
                              style={s.subChip}
                            >
                              <Text style={s.subText}>{sub.name}</Text>
                            </Pressable>
                          ))}
                        </View>
                      ) : null}
                    </View>
                  );
                })}

                <Pressable
                  onPress={() => go('/(tabs)/categories')}
                  accessibilityRole="button"
                  accessibilityLabel="View all categories"
                  android_ripple={{ color: 'rgba(224,26,27,0.08)' }}
                  style={s.viewAll}
                >
                  <Text style={s.viewAllText}>View all categories</Text>
                  <ArrowRight size={15} color="#e01a1b" strokeWidth={2.4} />
                </Pressable>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: {
    maxHeight: '90%', // max-h-[90vh]
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24, // rounded-t-3xl
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },

  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  headTitle: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headText: {
    fontFamily: Fonts.sansSemibold,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 2.42, // 0.22em
    color: '#111111',
  },

  body: { padding: 16, paddingBottom: 28 },

  modeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  mode: {
    // Two across with a 10px gutter.
    width: '48%',
    flexGrow: 1,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  pressed: { opacity: 0.85 },
  modeIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeLabel: {
    fontFamily: Fonts.sansBold,
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  modeDesc: {
    fontFamily: Fonts.sans,
    fontSize: 11,
    lineHeight: 14,
    color: '#9ca3af',
  },
  countPill: {
    position: 'absolute',
    right: 8,
    top: 8,
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 2,
    zIndex: 2,
  },
  countText: {
    fontFamily: Fonts.sansBold,
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
  },

  sectionLabel: {
    fontFamily: Fonts.sansSemibold,
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 2.2,
    color: '#9ca3af',
    marginTop: 20,
    marginBottom: 8,
    paddingHorizontal: 4,
  },

  loading: { paddingVertical: 32, alignItems: 'center' },

  catCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#efe4d8',
    backgroundColor: '#ffffff',
    overflow: 'hidden',
  },
  /* `h-24` — the image IS the card. */
  catBanner: { height: 96, justifyContent: 'flex-end' },
  catRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, padding: 12 },
  catName: {
    fontFamily: Fonts.sansSemibold,
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
    // The scrim carries most of it; the shadow covers a pale photograph.
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  catCount: { fontFamily: Fonts.sans, fontSize: 11, color: 'rgba(255,255,255,0.75)' },

  subWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  subChip: {
    borderRadius: 999,
    backgroundColor: '#faf7f3',
    borderWidth: 1,
    borderColor: '#efe4d8',
    paddingHorizontal: 11,
    paddingVertical: 4,
    overflow: 'hidden',
  },
  subText: { fontFamily: Fonts.sans, fontSize: 12.5, color: '#5f5550' },

  viewAll: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(224,26,27,0.25)',
    backgroundColor: '#fff8f8',
    paddingVertical: 12,
    overflow: 'hidden',
  },
  viewAllText: {
    fontFamily: Fonts.sansSemibold,
    fontSize: 13,
    fontWeight: '600',
    color: '#e01a1b',
  },
});
