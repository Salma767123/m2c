/**
 * Someone else's wishlist, opened by its public share token.
 *
 * Ports frontend/src/app/wishlist/shared/[token]/page.tsx, which mobile had no
 * counterpart for: the app could MINT a share token from the wishlist screen
 * but could not OPEN one, so a link sent phone-to-phone could only be read on
 * the web. Reachable in-app at `mobile://wishlist/shared/<token>` and by
 * router.push from anywhere holding a token.
 *
 * The share link itself still points at the web origin on purpose — see
 * services/wishlistService.getShareToken — because a recipient without the app
 * installed needs a link that just opens.
 *
 * Read-only by design, exactly as the web page is: no remove, no add-to-cart,
 * no wishlist heart. The single action per item is "View Product", which is
 * what the web offers; the owner's list is not the viewer's to edit.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, router } from 'expo-router';
import { ArrowLeft, Heart, ShoppingCart, Star } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { wishlistService, WishlistItem } from '@/services/wishlistService';
import {
  formatPrice,
  getRegionalPrice,
  getRegionalOriginalPrice,
} from '@/lib/currency';
import { Fonts, Palette } from '@/constants/theme';

/* The warm ground the wishlist screens share. The web's shared page is still on
   the older `bg-gray-50`, but a wishlist someone sent you should not look like a
   different product from your own wishlist one tap away. */
const GROUND = '#f9f5f2';

export default function SharedWishlistScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const insets = useSafeAreaInsets();

  const [items, setItems] = useState<WishlistItem[]>([]);
  const [ownerName, setOwnerName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      setError('Wishlist not found');
      setIsLoading(false);
      return;
    }

    let alive = true;
    (async () => {
      try {
        setIsLoading(true);
        const data = await wishlistService.getSharedWishlist(token);
        if (!alive) return;
        setItems(data.items ?? []);
        setOwnerName(data.ownerName ?? '');
      } catch (err: any) {
        if (alive) setError(err?.message || 'Wishlist not found');
      } finally {
        if (alive) setIsLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [token]);

  const browseProducts = useCallback(() => router.push('/products'), []);

  const title = ownerName ? `${ownerName}'s Wishlist` : 'Shared Wishlist';

  return (
    <View style={{ flex: 1, backgroundColor: GROUND }}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* Stands in for the web's Header + Breadcrumb ("Wishlist › X's Wishlist"),
          neither of which mobile has as screen chrome. */}
      <View style={[s.header, { paddingTop: insets.top + 12 }]}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={10}
          style={s.back}
        >
          <ArrowLeft size={22} color={Palette.ink} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={s.eyebrow}>Shared with you</Text>
          <Text style={s.title} numberOfLines={1}>
            {title}
          </Text>
        </View>
      </View>

      {isLoading ? (
        <View style={s.centered}>
          <ActivityIndicator size="large" color={Palette.ink} />
          <Text style={s.centeredNote}>Loading wishlist...</Text>
        </View>
      ) : error ? (
        <View style={s.centered}>
          <Heart size={56} color="#d1d5db" strokeWidth={1.5} />
          <Text style={s.centeredTitle}>Wishlist Not Found</Text>
          <Text style={s.centeredNote}>
            This wishlist link may have expired or doesn&apos;t exist.
          </Text>
          <Pressable
            onPress={browseProducts}
            accessibilityRole="button"
            accessibilityLabel="Browse Products"
            style={s.solidBtn}
          >
            <Text style={s.solidBtnText}>Browse Products</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={s.masthead}>
            <View style={{ flex: 1 }}>
              <Text style={s.mastheadTitle}>{title}</Text>
              <Text style={s.mastheadCount}>
                {items.length} item{items.length !== 1 ? 's' : ''} saved
              </Text>
            </View>
            <Pressable
              onPress={browseProducts}
              accessibilityRole="button"
              accessibilityLabel="Browse Products"
              style={s.solidBtnSmall}
            >
              <Text style={s.solidBtnText}>Browse</Text>
            </Pressable>
          </View>

          {items.length === 0 ? (
            <View style={s.centered}>
              <Heart size={56} color="#d1d5db" strokeWidth={1.5} />
              <Text style={s.centeredTitle}>This wishlist is empty</Text>
            </View>
          ) : (
            <View style={{ gap: 14 }}>
              {items.map((item) => {
                if (!item.product) return null;
                const product = item.product;
                const price = getRegionalPrice(product);
                const original = getRegionalOriginalPrice(product);
                const rating = product.rating ?? 0;

                return (
                  <Pressable
                    key={item.id}
                    onPress={() => router.push(`/products/${product.id}`)}
                    accessibilityRole="button"
                    accessibilityLabel={product.name}
                    android_ripple={{ color: 'rgba(0,0,0,0.05)' }}
                    style={s.card}
                  >
                    <View style={s.imageWrap}>
                      <Image
                        source={{ uri: product.image }}
                        style={s.image}
                        contentFit="cover"
                        transition={180}
                      />
                      {product.discount && product.discount > 0 ? (
                        <View style={s.discountBadge}>
                          <Text style={s.discountText}>{product.discount}% OFF</Text>
                        </View>
                      ) : null}
                      {!product.inStock ? (
                        <View style={s.oosOverlay}>
                          <View style={s.oosPill}>
                            <Text style={s.oosText}>Out of Stock</Text>
                          </View>
                        </View>
                      ) : null}
                    </View>

                    <View style={s.body}>
                      <Text style={s.name} numberOfLines={2}>
                        {product.name}
                      </Text>
                      <Text style={s.category}>{product.category}</Text>

                      {rating > 0 ? (
                        <View style={s.stars}>
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              size={12}
                              color={i < Math.floor(rating) ? '#facc15' : '#d1d5db'}
                              fill={i < Math.floor(rating) ? '#facc15' : 'none'}
                            />
                          ))}
                          {product.reviews !== undefined ? (
                            <Text style={s.reviews}>({product.reviews})</Text>
                          ) : null}
                        </View>
                      ) : null}

                      <View style={s.priceRow}>
                        <Text style={s.price}>{formatPrice(price)}</Text>
                        {original && original > price ? (
                          <Text style={s.original}>{formatPrice(original)}</Text>
                        ) : null}
                      </View>

                      <View style={s.viewBtn}>
                        <ShoppingCart size={15} color="#ffffff" />
                        <Text style={s.viewBtnText}>View Product</Text>
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  header: {
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  back: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  eyebrow: {
    fontFamily: Fonts.sansSemibold,
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 2,
    color: '#b9a99b',
    marginBottom: 3,
  },
  title: {
    fontFamily: Fonts.heading,
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: -0.5,
    color: '#1a1a1a',
  },

  centered: { alignItems: 'center', justifyContent: 'center', paddingVertical: 64, gap: 10 },
  centeredTitle: {
    fontFamily: Fonts.heading,
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
    marginTop: 6,
  },
  centeredNote: {
    fontFamily: Fonts.sans,
    fontSize: 13.5,
    color: '#6b7280',
    textAlign: 'center',
    paddingHorizontal: 32,
  },

  masthead: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 18 },
  mastheadTitle: {
    fontFamily: Fonts.heading,
    fontSize: 22,
    fontWeight: '600',
    letterSpacing: -0.5,
    color: '#1a1a1a',
    marginBottom: 2,
  },
  mastheadCount: { fontFamily: Fonts.sans, fontSize: 13, color: '#6b7280' },

  /* `bg-gray-800 text-white rounded-lg` */
  solidBtn: {
    marginTop: 12,
    backgroundColor: '#1f2937',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  solidBtnSmall: {
    backgroundColor: '#1f2937',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
  },
  solidBtnText: {
    fontFamily: Fonts.sansSemibold,
    fontSize: 13.5,
    fontWeight: '600',
    color: '#ffffff',
  },

  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#f0e7de',
    // Android renders elevation only; shadowColor/Opacity/Radius are ignored there.
    elevation: 1,
    shadowColor: '#000000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  /* `relative h-64` */
  imageWrap: { height: 256, backgroundColor: '#f3f4f6' },
  image: { width: '100%', height: '100%' },
  discountBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#ef4444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  discountText: {
    fontFamily: Fonts.sansBold,
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
  },
  oosOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  oosPill: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 4,
  },
  oosText: {
    fontFamily: Fonts.sansMedium,
    fontSize: 13,
    fontWeight: '500',
    color: '#1f2937',
  },

  body: { padding: 16, gap: 6 },
  name: {
    fontFamily: Fonts.sansMedium,
    fontSize: 15,
    fontWeight: '500',
    color: '#111827',
    lineHeight: 21,
  },
  category: { fontFamily: Fonts.sans, fontSize: 11.5, color: '#6b7280' },
  stars: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  reviews: { fontFamily: Fonts.sans, fontSize: 11.5, color: '#6b7280', marginLeft: 4 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  price: {
    fontFamily: Fonts.sansBold,
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },
  original: {
    fontFamily: Fonts.sans,
    fontSize: 13,
    color: '#9ca3af',
    textDecorationLine: 'line-through',
  },

  viewBtn: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#1f2937',
    borderRadius: 10,
    paddingVertical: 11,
  },
  viewBtnText: {
    fontFamily: Fonts.sansSemibold,
    fontSize: 13.5,
    fontWeight: '600',
    color: '#ffffff',
  },
});
