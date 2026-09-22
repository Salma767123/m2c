import React, { useState, useCallback, useEffect, useRef, memo } from 'react';
import {
  View,
  Text,
  Pressable,
  TextInput,
  StyleSheet,
  Keyboard,
  ActivityIndicator,
  ScrollView,
  StatusBar,
  type LayoutChangeEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import {
  Search,
  ShoppingCart,
  Menu,
  Sparkles,
  Heart,
  X,
  Clock,
  TrendingUp,
  ArrowUpRight,
  Trash2,
  Bell,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { publicProductService, type PublicProduct } from '@/services/publicProductService';
import Sidebar from '../Sidebar/Sidebar';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import { getRegionalPrice, formatPrice as fmtCurrency } from '@/lib/currency';
import { Palette, Radius, Shadow, Fonts } from '@/constants/theme';
import DiscoverSheet from './DiscoverSheet';
import NotificationSheet from './NotificationSheet';
import { appNotificationService } from '@/services/appNotificationService';

/* The header's mark, and the only one it draws.

   It used to prefer `companyLogo` from company info and fall back to this. The
   configured logo is the wide wordmark: at header height its lettering came
   out around 7pt — legible as a shape, not as words — so the header takes the
   emblem directly rather than whichever file the admin last uploaded.

   The header alone uses m2c.png — the wide wordmark. Every other surface
   (drawer, footer, auth, splash) stays on logo4.png, whose boxes are cut for
   its taller 0.62 ratio, and the drawer still shows the live logo because its
   180×64 plate is the size that file was drawn for. */
const STATIC_LOGO = require('../../../../assets/m2c.png');

/* ── Hoisted constants (allocated once) ───────────────────────────────────── */
const RECENT_SEARCHES_KEY = 'recent_searches';
const MAX_RECENT = 8;
const fmt = (n: number) => fmtCurrency(n);
/** Curve on the header's bottom corners. Shared by the shell and its clip layer,
 *  which must match exactly or the shadow detaches from the visible edge. */
const HEADER_RADIUS = Radius.xl;

/**
 * The bar is white, like the web's (`<header className="... bg-white">`).
 *
 * It used to be solid brand red, which meant everything on it — glyphs,
 * wordmark, search field, badge digits — was painted white or a translucent
 * white wash from the `onBrand*` set. On white those are invisible, so the
 * repaint had to carry all of them across rather than swap one fill: red ink
 * on a white bar, exactly the way the web draws it.
 */
const WHITE_BAR = '#ffffff';
const BAR_INK = '#e01a1b';
/** Placeholder and the clear glyph inside the search field. */
const FIELD_MUTED = '#a89a8d';

// ─── Main Header ─────────────────────────────────────────────────────────────
export function Header() {
  const insets = useSafeAreaInsets();

  const { itemCount } = useCart();
  const { wishlistCount } = useWishlist();
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [discoverVisible, setDiscoverVisible] = useState(false);
  const [notifVisible, setNotifVisible] = useState(false);
  const [unreadNotifs, setUnreadNotifs] = useState(0);

  // Suggestions state
  const [suggestions, setSuggestions] = useState<PublicProduct[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  const inputRef = useRef<TextInput>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const showOverlay = isFocused || searchQuery.length > 0;

  // ── Load recent searches on mount ───────────────────────────────────────
  useEffect(() => {
    AsyncStorage.getItem(RECENT_SEARCHES_KEY).then((raw) => {
      if (raw) {
        try { setRecentSearches(JSON.parse(raw)); } catch { /* ignore */ }
      }
    });
  }, []);

  /*
   * Unread count for the bell badge. Fetched once on mount and refreshed when
   * the sheet closes — the web polls, but a phone header polling in the
   * background is battery spent on a number nobody is looking at.
   */
  useEffect(() => {
    let alive = true;
    appNotificationService.getUnreadCount().then((c) => {
      if (alive) setUnreadNotifs(c);
    });
    return () => {
      alive = false;
    };
  }, [notifVisible]);

  const saveRecent = useCallback(async (query: string) => {
    const updated = [query, ...recentSearches.filter((r) => r !== query)].slice(0, MAX_RECENT);
    setRecentSearches(updated);
    await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
  }, [recentSearches]);

  const clearRecents = useCallback(async () => {
    setRecentSearches([]);
    await AsyncStorage.removeItem(RECENT_SEARCHES_KEY);
  }, []);

  // ── Debounced live search ───────────────────────────────────────────────
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (abortRef.current) abortRef.current.abort();

    const q = searchQuery.trim();
    if (q.length < 2) {
      setSuggestions([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    debounceRef.current = setTimeout(async () => {
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const res = await publicProductService.getProducts({
          search: q,
          limit: 6,
          page: 1,
        });
        if (!controller.signal.aborted && res.success && res.data?.items) {
          setSuggestions(res.data.items);
        }
      } catch {
        // aborted or network — ignore
      } finally {
        if (!controller.signal.aborted) setIsSearching(false);
      }
    }, 350);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery]);

  // ── Handlers ────────────────────────────────────────────────────────────
  const handleSearch = useCallback((query?: string) => {
    const q = (query ?? searchQuery).trim();
    if (q.length === 0) return;
    Keyboard.dismiss();
    setIsFocused(false);
    saveRecent(q);
    router.push(`/(any)/products?search=${encodeURIComponent(q)}` as any);
    // Reset after navigation so the overlay is clean on return
    setTimeout(() => { setSearchQuery(''); setSuggestions([]); }, 300);
  }, [searchQuery, router, saveRecent]);

  const handleProductTap = useCallback((product: PublicProduct) => {
    Keyboard.dismiss();
    setIsFocused(false);
    saveRecent(product.name);
    router.push(`/(any)/products/${product.id}` as any);
    setTimeout(() => { setSearchQuery(''); setSuggestions([]); }, 300);
  }, [router, saveRecent]);

  const handleRecentTap = useCallback((query: string) => {
    setSearchQuery(query);
    handleSearch(query);
  }, [handleSearch]);

  const handleClear = useCallback(() => {
    setSearchQuery('');
    setSuggestions([]);
    inputRef.current?.focus();
  }, []);

  const handleClose = useCallback(() => {
    setSearchQuery('');
    setSuggestions([]);
    setIsFocused(false);
    Keyboard.dismiss();
  }, []);

  // Measure header height dynamically so overlay sits exactly below it
  const [headerHeight, setHeaderHeight] = useState(130);
  const onHeaderLayout = useCallback((e: LayoutChangeEvent) => {
    setHeaderHeight(e.nativeEvent.layout.height);
  }, []);

  return (
    <>
      {/* Two views, not one: the shell carries the shadow and the inner view does
          the clipping. `overflow: 'hidden'` is required to make the accent strip
          follow the curved bottom edge, but on iOS it also clips the shadow off
          the same view — so they have to be separated. */}
      <View style={s.headerShell} onLayout={onHeaderLayout}>
        <View style={[s.headerBg, { paddingTop: insets.top }]}>
          <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
          {/* ── Top bar: Brand, Icons, Menu ─────────────────────────────────── */}
          <View style={s.topBar}>
            <View style={s.topBarLeft}>
              <Pressable
                onPress={() => router.push('/(tabs)' as any)}
                accessibilityLabel="Go to home"
                accessibilityRole="button"
                hitSlop={8}
                /* The button needs a width of its own.

                   Without it a Pressable is sized BY its child, and the mark
                   below asks for `width: '100%'` — a percentage of this
                   Pressable. Each waits on the other, React Native resolves
                   the percentage to 0, and the logo does not draw at all. */
                style={s.brandPress}
              >
                <Image
                  source={STATIC_LOGO}
                  style={s.brandLogo}
                  contentFit="contain"
                  contentPosition="left center"
                />
              </Pressable>
            </View>

            <View style={s.topBarRight}>
              {/* DISCOVER — the web's single discovery entry point, which mobile
                  did not have at all. The sparkle is the web's own trigger mark. */}
              <Pressable
                onPress={() => setDiscoverVisible(true)}
                accessibilityLabel="Discover — browse the marketplace"
                accessibilityRole="button"
                style={s.iconBtn}
              >
                <Sparkles size={22} color={BAR_INK} />
              </Pressable>

              <Pressable
                onPress={() => router.push('/(tabs)/cart' as any)}
                accessibilityLabel="View cart"
                accessibilityRole="button"
                style={s.iconBtn}
              >
                <ShoppingCart size={22} color={BAR_INK} />
                {itemCount > 0 ? (
                  <View style={[s.badge, s.badgeAmber]}>
                    <Text style={s.badgeTextDark}>{itemCount > 99 ? '99+' : itemCount}</Text>
                  </View>
                ) : null}
              </Pressable>
              <Pressable
                onPress={() => router.push('/(tabs)/wishlist' as any)}
                accessibilityLabel="View wishlist"
                accessibilityRole="button"
                style={s.iconBtn}
              >
                <Heart size={22} color={BAR_INK} />
                {wishlistCount > 0 ? (
                  <View style={[s.badge, s.badgeBrand]}>
                    <Text style={s.badgeText}>{wishlistCount > 99 ? '99+' : wishlistCount}</Text>
                  </View>
                ) : null}
              </Pressable>
              {/* Notifications — the web's NotificationDropdown. Mobile had a
                  push-token service but nothing that read the feed, so there
                  was no bell at all. */}
              <Pressable
                onPress={() => setNotifVisible(true)}
                accessibilityLabel={
                  unreadNotifs > 0
                    ? `Notifications, ${unreadNotifs} unread`
                    : 'Notifications'
                }
                accessibilityRole="button"
                style={s.iconBtn}
              >
                <Bell size={22} color={BAR_INK} />
                {unreadNotifs > 0 ? (
                  <View style={[s.badge, s.badgeBrand]}>
                    <Text style={s.badgeText}>{unreadNotifs > 99 ? '99+' : unreadNotifs}</Text>
                  </View>
                ) : null}
              </Pressable>

              {/* The menu, last in the row.

                  It was first, in the top-left — the desktop convention, and
                  the one place on a 6" screen a thumb cannot reach without
                  shifting grip. The actions it sits beside are all on this
                  side already, so the whole bar is now reachable from where
                  the hand already is, and the logo gets the corner it should
                  have had. */}
              <Pressable
                onPress={async () => {
                  if (typeof Haptics !== 'undefined') await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  setSidebarVisible(true);
                }}
                accessibilityLabel="Open menu"
                accessibilityRole="button"
                style={s.iconBtn}
              >
                <Menu size={24} color={BAR_INK} />
              </Pressable>
            </View>
          </View>

          {/* ── Search bar ──────────────────────────────────────────────────── */}
          <View style={s.searchWrap}>
            <View style={s.searchBar}>
              <Search size={18} color={BAR_INK} style={s.searchIcon} />
              <TextInput
                ref={inputRef}
                value={searchQuery}
                onChangeText={setSearchQuery}
                onFocus={() => setIsFocused(true)}
                placeholder="Search products..."
                placeholderTextColor={FIELD_MUTED}
                style={s.searchInput}
                onSubmitEditing={() => handleSearch()}
                returnKeyType="search"
                accessibilityLabel="Search products"
                autoCorrect={false}
              />
              {searchQuery.length > 0 ? (
                <Pressable
                  onPress={handleClear}
                  style={s.clearBtn}
                  accessibilityLabel="Clear search"
                  accessibilityHint="Clears the search text"
                  accessibilityRole="button"
                >
                  <X size={16} color={FIELD_MUTED} />
                </Pressable>
              ) : null}
              {showOverlay ? (
                <Pressable
                  onPress={handleClose}
                  style={s.cancelBtn}
                  accessibilityLabel="Cancel search"
                  accessibilityHint="Closes the search overlay"
                  accessibilityRole="button"
                >
                  <Text style={s.cancelText}>Cancel</Text>
                </Pressable>
              ) : null}
            </View>
          </View>

          {/* Deeper-red hairline, clipped to the curve by the parent. */}
          <View style={s.accentBar} />
        </View>
      </View>

      {/* ── Search overlay ──────────────────────────────────────────────── */}
      {showOverlay ? (
        <View style={[s.overlay, { marginTop: headerHeight }]}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={s.overlayContent}
          >
            {/* Loading */}
            {isSearching ? (
              <View style={s.loadingRow}>
                <ActivityIndicator size="small" color={Palette.textMuted} />
                <Text style={s.loadingText}>Searching...</Text>
              </View>
            ) : null}

            {/* Live suggestions */}
            {!isSearching && suggestions.length > 0 ? (
              <View>
                <View style={s.sectionHeader}>
                  <TrendingUp size={14} color={Palette.textMuted} />
                  <Text style={s.sectionTitle}>Suggestions</Text>
                </View>
                {suggestions.map((product) => (
                  <SuggestionRow
                    key={product.id}
                    product={product}
                    fmt={fmt}
                    onPress={handleProductTap}
                    onSearchPress={handleSearch}
                  />
                ))}
                {/* View all results */}
                <Pressable
                  onPress={() => handleSearch()}
                  style={s.viewAllBtn}
                  accessibilityRole="button"
                  accessibilityLabel={`View all results for ${searchQuery}`}
                >
                  <Search size={14} color={Palette.primary} />
                  <Text style={s.viewAllText}>
                    View all results for &ldquo;{searchQuery.trim()}&rdquo;
                  </Text>
                  <ArrowUpRight size={14} color={Palette.textSubtle} />
                </Pressable>
              </View>
            ) : null}

            {/* No results */}
            {!isSearching && searchQuery.trim().length >= 2 && suggestions.length === 0 ? (
              <View style={s.noResultsWrap}>
                <Search size={24} color={Palette.outlineVariant} />
                <Text style={s.noResultsText}>
                  No products found for &ldquo;{searchQuery.trim()}&rdquo;
                </Text>
                <Pressable
                  onPress={() => handleSearch()}
                  style={s.noResultsBtn}
                  accessibilityRole="button"
                >
                  <Text style={s.noResultsBtnText}>Search anyway</Text>
                </Pressable>
              </View>
            ) : null}

            {/* Recent searches (shown when query is empty/short) */}
            {searchQuery.trim().length < 2 && recentSearches.length > 0 ? (
              <View>
                <View style={s.sectionHeader}>
                  <Clock size={14} color={Palette.textMuted} />
                  <Text style={s.sectionTitle}>Recent Searches</Text>
                  <View style={s.sectionSpacer} />
                  <Pressable
                    onPress={clearRecents}
                    hitSlop={8}
                    accessibilityLabel="Clear recent searches"
                    accessibilityRole="button"
                  >
                    <Trash2 size={14} color={Palette.textSubtle} />
                  </Pressable>
                </View>
                {recentSearches.map((query) => (
                  <Pressable
                    key={query}
                    onPress={() => handleRecentTap(query)}
                    style={s.recentRow}
                    accessibilityRole="button"
                  >
                    <Clock size={14} color={Palette.outlineVariant} />
                    <Text style={s.recentText} numberOfLines={1}>{query}</Text>
                    <ArrowUpRight size={14} color={Palette.outlineVariant} />
                  </Pressable>
                ))}
              </View>
            ) : null}

            {/* Empty state — no query, no recents */}
            {searchQuery.trim().length < 2 && recentSearches.length === 0 ? (
              <View style={s.emptyWrap}>
                <Search size={28} color={Palette.outlineVariant} />
                <Text style={s.emptyTitle}>Search products</Text>
                <Text style={s.emptyDesc}>Find products by name, category, or description</Text>
              </View>
            ) : null}
          </ScrollView>
        </View>
      ) : null}

      <Sidebar visible={sidebarVisible} onClose={() => setSidebarVisible(false)} />
      <DiscoverSheet visible={discoverVisible} onClose={() => setDiscoverVisible(false)} />

      <NotificationSheet
        visible={notifVisible}
        onClose={() => setNotifVisible(false)}
        onUnreadChange={setUnreadNotifs}
      />
    </>
  );
}

// ─── Suggestion row (memoized) ───────────────────────────────────────────────
const SuggestionRow = memo(function SuggestionRow({
  product,
  fmt,
  onPress,
  onSearchPress,
}: {
  product: PublicProduct;
  fmt: (n: number) => string;
  onPress: (p: PublicProduct) => void;
  onSearchPress: (q: string) => void;
}) {
  const price = getRegionalPrice(product as any);
  const imageUrl = product.images?.find((i) => i.isPrimary)?.url || product.images?.[0]?.url;

  return (
    <Pressable
      onPress={() => onPress(product)}
      style={s.suggRow}
      accessibilityRole="button"
      accessibilityLabel={`View ${product.name}`}
    >
      <View style={s.suggImage}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={s.suggImageInner} contentFit="cover" transition={150} />
        ) : (
          <View style={s.suggImagePlaceholder}>
            <Search size={14} color={Palette.outlineVariant} />
          </View>
        )}
      </View>
      <View style={s.suggInfo}>
        <Text style={s.suggName} numberOfLines={1}>{product.name}</Text>
        <View style={s.suggMeta}>
          <Text style={s.suggPrice}>{fmt(price)}</Text>
          {product.category ? (
            <Text style={s.suggCategory} numberOfLines={1}>{product.category}</Text>
          ) : null}
        </View>
      </View>
      <Pressable
        onPress={() => onSearchPress(product.name)}
        hitSlop={8}
        style={s.suggSearchBtn}
        accessibilityLabel={`Search for ${product.name}`}
      >
        <ArrowUpRight size={16} color={Palette.textSubtle} />
      </Pressable>
    </Pressable>
  );
});

export default Header;

// ─── Styles ──────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  /* Header — a white panel with a curved bottom edge, so it reads as an object
     sitting over the page rather than a band welded to the top of it. Only the
     BOTTOM corners are rounded: the top edge runs under the status bar, where a
     radius would leave two odd notches of wallpaper.

     Everything drawn on it is brand red on white. The `onBrand*` tokens that
     used to serve this panel are for SOLID brand chrome only and are all a step
     of white — see the note in constants/theme.ts. */
  headerShell: {
    backgroundColor: WHITE_BAR,
    borderBottomLeftRadius: HEADER_RADIUS,
    borderBottomRightRadius: HEADER_RADIUS,
    ...Shadow.dropdown,
  },
  headerBg: {
    backgroundColor: WHITE_BAR,
    borderBottomLeftRadius: HEADER_RADIUS,
    borderBottomRightRadius: HEADER_RADIUS,
    overflow: 'hidden',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  topBarLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: 0 },
  topBarRight: { flexDirection: 'row', alignItems: 'center', gap: 2, flexShrink: 0 },
iconBtn: { padding: 8, position: 'relative' },

  /* m2c.png is 1303 x 326 — a 4:1 lockup, so the box is a landscape strip.
     The square 64 x 64 box the round emblem used would have drawn this at
     64 x 16: `contain` fits the LONG side, and a wordmark scaled to a sixth of
     its height is a smear, not a logo.

     156 x 39 — the lockup's own 4:1, and 39 matches the height of the icon
     buttons beside it, so the bar reads as one line.

     That is more than a 360pt screen has to give: five buttons at 38 plus
     their gaps come to 198, the bar's padding is 32, and 130 is left. The cap
     is a `maxWidth` against `width: '100%'` for exactly that reason — the mark
     takes the full 156 wherever there is room and quietly narrows to whatever
     is left where there is not, rather than pushing a button off the edge. */
  brandPress: { flex: 1, minWidth: 0 },
  brandLogo: { width: '100%', maxWidth: 156, height: 39 },

  /* Brand hairline along the bottom edge. It was Brand[700] — a deeper step
     was needed to separate a red edge from a red bar. On white that deep red
     reads as a bruise, so it takes the brand red itself, the same accent the
     drawer's rule and the tab bar's rail use.

     It stays a plain rectangle: the parent's `overflow: 'hidden'` bends it to the
     curve. Giving it its own radii would not work — RN clamps a corner radius to
     half the box height, so a 3px strip can never echo a 24px curve. */
  accentBar: { height: 3, backgroundColor: BAR_INK },

  // Badges
  badge: {
    position: 'absolute', top: 4, right: 4,
    minWidth: 18, height: 18, borderRadius: Radius.full,
    alignItems: 'center', justifyContent: 'center',
    // Ring matches the bar so the badge reads as punched out of it.
    paddingHorizontal: 4, borderWidth: 1.5, borderColor: WHITE_BAR,
  },
  /* With the bar white, both badges are red with white digits and a white
     ring — `bg-[#e01a1b] text-white ring-2 ring-white`, exactly the web's.
     They were inverted (white fill, red digits) only because they had to
     survive a red bar; on white that reads as a hole, not a count. */
  badgeBrand: { backgroundColor: BAR_INK },
  badgeAmber: { backgroundColor: BAR_INK },
  badgeText: { fontFamily: Fonts.sansBold, color: '#ffffff', fontSize: 9, fontWeight: '800' },
  badgeTextDark: { fontFamily: Fonts.sansBold, color: '#ffffff', fontSize: 9, fontWeight: '800' },

  // Search bar
  // Extra bottom padding vs. the old square bar: the corner curve eats into the
  // usable width at the bottom edge, so the field needs clearance from it.
  searchWrap: { paddingHorizontal: 16, paddingBottom: 18 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    // A glass wash needed a coloured bar under it to read as an inset field;
    // over white it was invisible. Warm ground and warm line instead, the same
    // pair every form field on the site uses.
    backgroundColor: '#faf7f3',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: '#e6dcd0',
    height: 46,
  },
  searchIcon: { marginLeft: 14 },
  searchInput: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 0,
    color: '#1a1a1a',
    fontFamily: Fonts.sans,
    fontSize: 15,
    height: 46,
  },
  clearBtn: {
    width: 36, height: 36,
    alignItems: 'center', justifyContent: 'center',
  },
  cancelBtn: {
    paddingHorizontal: 14,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: { fontFamily: Fonts.sansSemibold, color: BAR_INK, fontSize: 13, fontWeight: '600' },

  // Overlay
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Palette.surface,
    zIndex: 50,
  },
  overlayContent: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 80 },

  // Section headers
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 2,
  },
  sectionTitle: { fontFamily: Fonts.sansBold, fontSize: 12, fontWeight: '700', color: Palette.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  sectionSpacer: { flex: 1 },

  // Loading
  loadingRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 20,
  },
  loadingText: { fontFamily: Fonts.sans, fontSize: 13, color: Palette.textMuted },

  // Suggestion rows
  suggRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 2,
    minHeight: 56,
    borderBottomWidth: 1,
    borderBottomColor: Palette.outlineSubtle,
  },
  suggImage: {
    width: 44, height: 44, borderRadius: Radius.md,
    backgroundColor: Palette.outlineSubtle, overflow: 'hidden',
  },
  suggImageInner: { width: '100%', height: '100%' },
  suggImagePlaceholder: {
    width: '100%', height: '100%',
    alignItems: 'center', justifyContent: 'center',
  },
  suggInfo: { flex: 1, marginLeft: 12 },
  suggName: { fontFamily: Fonts.sansSemibold, fontSize: 14, fontWeight: '600', color: Palette.ink },
  suggMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  suggPrice: { fontFamily: Fonts.sansBold, fontSize: 13, fontWeight: '700', color: Palette.ink },
  suggCategory: { fontFamily: Fonts.sans, fontSize: 11, color: Palette.textSubtle },
  suggSearchBtn: {
    width: 36, height: 36,
    alignItems: 'center', justifyContent: 'center',
    marginLeft: 4,
  },

  // View all results
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 2,
  },
  viewAllText: { fontFamily: Fonts.sansSemibold, flex: 1, fontSize: 13, fontWeight: '600', color: Palette.primary },

  // No results
  noResultsWrap: {
    alignItems: 'center', paddingVertical: 40, gap: 8,
  },
  noResultsText: { fontFamily: Fonts.sans, fontSize: 14, color: Palette.textMuted, textAlign: 'center' },
  noResultsBtn: {
    marginTop: 8,
    backgroundColor: Palette.primary,
    paddingHorizontal: 20, height: 40, borderRadius: Radius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  noResultsBtnText: { fontFamily: Fonts.sansBold, color: Palette.onPrimary, fontSize: 13, fontWeight: '700' },

  // Recent searches
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 2,
    minHeight: 48,
    borderBottomWidth: 1,
    borderBottomColor: Palette.outlineSubtle,
  },
  recentText: { fontFamily: Fonts.sans, flex: 1, fontSize: 14, color: Palette.text },

  // Empty state
  emptyWrap: { alignItems: 'center', paddingVertical: 48, gap: 8 },
  emptyTitle: { fontFamily: Fonts.sansBold, fontSize: 16, fontWeight: '700', color: Palette.text },
  emptyDesc: { fontFamily: Fonts.sans, fontSize: 13, color: Palette.textSubtle, textAlign: 'center' },
});
