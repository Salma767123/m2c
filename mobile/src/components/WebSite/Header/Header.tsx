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
  User,
  ShoppingCart,
  Menu,
  Heart,
  X,
  Clock,
  TrendingUp,
  ArrowUpRight,
  Trash2,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { publicProductService, type PublicProduct } from '@/services/publicProductService';
import Sidebar from '../Sidebar/Sidebar';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';

/* ── Hoisted constants (allocated once) ───────────────────────────────────── */
const RECENT_SEARCHES_KEY = 'recent_searches';
const MAX_RECENT = 8;
const fmt = (n: number) => `$${n.toFixed(2)}`;

// ─── Main Header ─────────────────────────────────────────────────────────────
export function Header() {
  const insets = useSafeAreaInsets();
  const { itemCount } = useCart();
  const { wishlistCount } = useWishlist();
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(false);

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
      <View style={[s.headerBg, { paddingTop: insets.top }]} onLayout={onHeaderLayout}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        {/* ── Top bar: Menu, Brand, Icons ─────────────────────────────────── */}
        <View style={s.topBar}>
          <View style={s.topBarLeft}>
            <Pressable
              onPress={async () => {
                if (typeof Haptics !== 'undefined') await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setSidebarVisible(true);
              }}
              accessibilityLabel="Open menu"
              accessibilityRole="button"
              style={s.iconBtn}
            >
              <Menu size={24} color="#ffffff" />
            </Pressable>
            <Pressable
              onPress={() => router.push('/(tabs)' as any)}
              accessibilityLabel="Go to home"
              accessibilityRole="button"
            >
              <Text style={s.brandName}>M2C MarkDowns</Text>
              <Text style={s.brandSub}>Private Limited</Text>
            </Pressable>
          </View>

          <View style={s.topBarRight}>
            <Pressable
              onPress={() => router.push('/(tabs)/wishlist' as any)}
              accessibilityLabel="View wishlist"
              accessibilityRole="button"
              style={s.iconBtn}
            >
              <Heart size={22} color="#ffffff" />
              {wishlistCount > 0 ? (
                <View style={[s.badge, s.badgeRed]}>
                  <Text style={s.badgeText}>{wishlistCount > 99 ? '99+' : wishlistCount}</Text>
                </View>
              ) : null}
            </Pressable>
            <Pressable
              onPress={() => router.push('/(tabs)/profile' as any)}
              accessibilityLabel="View profile"
              accessibilityRole="button"
              style={s.iconBtn}
            >
              <User size={22} color="#ffffff" />
            </Pressable>
            <Pressable
              onPress={() => router.push('/(tabs)/cart' as any)}
              accessibilityLabel="View cart"
              accessibilityRole="button"
              style={s.iconBtn}
            >
              <ShoppingCart size={22} color="#ffffff" />
              {itemCount > 0 ? (
                <View style={[s.badge, s.badgeAmber]}>
                  <Text style={s.badgeTextDark}>{itemCount > 99 ? '99+' : itemCount}</Text>
                </View>
              ) : null}
            </Pressable>
          </View>
        </View>

        {/* ── Search bar ──────────────────────────────────────────────────── */}
        <View style={s.searchWrap}>
          <View style={s.searchBar}>
            <Search size={18} color="#9ca3af" style={s.searchIcon} />
            <TextInput
              ref={inputRef}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onFocus={() => setIsFocused(true)}
              placeholder="Search products..."
              placeholderTextColor="#6b7280"
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
                <X size={16} color="#9ca3af" />
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
                <ActivityIndicator size="small" color="#6b7280" />
                <Text style={s.loadingText}>Searching...</Text>
              </View>
            ) : null}

            {/* Live suggestions */}
            {!isSearching && suggestions.length > 0 ? (
              <View>
                <View style={s.sectionHeader}>
                  <TrendingUp size={14} color="#6b7280" />
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
                  <Search size={14} color="#111827" />
                  <Text style={s.viewAllText}>
                    View all results for "{searchQuery.trim()}"
                  </Text>
                  <ArrowUpRight size={14} color="#9ca3af" />
                </Pressable>
              </View>
            ) : null}

            {/* No results */}
            {!isSearching && searchQuery.trim().length >= 2 && suggestions.length === 0 ? (
              <View style={s.noResultsWrap}>
                <Search size={24} color="#d1d5db" />
                <Text style={s.noResultsText}>No products found for "{searchQuery.trim()}"</Text>
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
                  <Clock size={14} color="#6b7280" />
                  <Text style={s.sectionTitle}>Recent Searches</Text>
                  <View style={s.sectionSpacer} />
                  <Pressable
                    onPress={clearRecents}
                    hitSlop={8}
                    accessibilityLabel="Clear recent searches"
                    accessibilityRole="button"
                  >
                    <Trash2 size={14} color="#9ca3af" />
                  </Pressable>
                </View>
                {recentSearches.map((query) => (
                  <Pressable
                    key={query}
                    onPress={() => handleRecentTap(query)}
                    style={s.recentRow}
                    accessibilityRole="button"
                  >
                    <Clock size={14} color="#d1d5db" />
                    <Text style={s.recentText} numberOfLines={1}>{query}</Text>
                    <ArrowUpRight size={14} color="#d1d5db" />
                  </Pressable>
                ))}
              </View>
            ) : null}

            {/* Empty state — no query, no recents */}
            {searchQuery.trim().length < 2 && recentSearches.length === 0 ? (
              <View style={s.emptyWrap}>
                <Search size={28} color="#d1d5db" />
                <Text style={s.emptyTitle}>Search products</Text>
                <Text style={s.emptyDesc}>Find products by name, category, or description</Text>
              </View>
            ) : null}
          </ScrollView>
        </View>
      ) : null}

      <Sidebar visible={sidebarVisible} onClose={() => setSidebarVisible(false)} />
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
  const price = product.adminFixedPrice ?? product.basePrice;
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
            <Search size={14} color="#d1d5db" />
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
        <ArrowUpRight size={16} color="#9ca3af" />
      </Pressable>
    </Pressable>
  );
});

export default Header;

// ─── Styles ──────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  // Header
  headerBg: { backgroundColor: '#111827' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  topBarLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  topBarRight: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  iconBtn: { padding: 8, position: 'relative' },
  brandName: { fontSize: 15, fontWeight: '700', color: '#ffffff', letterSpacing: -0.3 },
  brandSub: { fontSize: 10, color: '#6b7280', fontWeight: '500', marginTop: -2 },

  // Badges
  badge: {
    position: 'absolute', top: 4, right: 4,
    minWidth: 18, height: 18, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 4, borderWidth: 1.5, borderColor: '#111827',
  },
  badgeRed: { backgroundColor: '#ef4444' },
  badgeAmber: { backgroundColor: '#f59e0b' },
  badgeText: { color: '#ffffff', fontSize: 9, fontWeight: '800' },
  badgeTextDark: { color: '#111827', fontSize: 9, fontWeight: '800' },

  // Search bar
  searchWrap: { paddingHorizontal: 16, paddingBottom: 14 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    height: 46,
  },
  searchIcon: { marginLeft: 14 },
  searchInput: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 0,
    color: '#ffffff',
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
  cancelText: { color: '#fcd34d', fontSize: 13, fontWeight: '600' },

  // Overlay
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#ffffff',
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
  sectionTitle: { fontSize: 12, fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5 },
  sectionSpacer: { flex: 1 },

  // Loading
  loadingRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 20,
  },
  loadingText: { fontSize: 13, color: '#6b7280' },

  // Suggestion rows
  suggRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 2,
    minHeight: 56,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  suggImage: {
    width: 44, height: 44, borderRadius: 10,
    backgroundColor: '#f3f4f6', overflow: 'hidden',
  },
  suggImageInner: { width: '100%', height: '100%' },
  suggImagePlaceholder: {
    width: '100%', height: '100%',
    alignItems: 'center', justifyContent: 'center',
  },
  suggInfo: { flex: 1, marginLeft: 12 },
  suggName: { fontSize: 14, fontWeight: '600', color: '#111827' },
  suggMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  suggPrice: { fontSize: 13, fontWeight: '700', color: '#111827' },
  suggCategory: { fontSize: 11, color: '#9ca3af' },
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
  viewAllText: { flex: 1, fontSize: 13, fontWeight: '600', color: '#111827' },

  // No results
  noResultsWrap: {
    alignItems: 'center', paddingVertical: 40, gap: 8,
  },
  noResultsText: { fontSize: 14, color: '#6b7280', textAlign: 'center' },
  noResultsBtn: {
    marginTop: 8,
    backgroundColor: '#111827',
    paddingHorizontal: 20, height: 40, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  noResultsBtnText: { color: '#ffffff', fontSize: 13, fontWeight: '700' },

  // Recent searches
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 2,
    minHeight: 48,
    borderBottomWidth: 1,
    borderBottomColor: '#f9fafb',
  },
  recentText: { flex: 1, fontSize: 14, color: '#374151' },

  // Empty state
  emptyWrap: { alignItems: 'center', paddingVertical: 48, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#374151' },
  emptyDesc: { fontSize: 13, color: '#9ca3af', textAlign: 'center' },
});
