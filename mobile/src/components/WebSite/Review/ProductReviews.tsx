import React, { useState, useEffect, useMemo, memo } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  TextInput,
  Modal,
  ScrollView,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  Star, Search, ThumbsUp, Check, X,
  ChevronLeft, ChevronRight, PenLine,
} from 'lucide-react-native';
import { reviewService, type Review } from '@/services/reviewService';
import { userAuthService } from '@/services/userAuthService';
import { getCountryName, getCountryFlag } from '@/components/WebSite/CheckOut/CheckoutProcess/constants';
import { Palette } from '@/constants/theme';

interface ProductReviewsProps {
  productId: string;
  rating?: number;
  reviewCount?: number;
}

type SortMode = 'newest' | 'oldest' | 'highest' | 'lowest';

// Full port of the web Customer Reviews section (frontend ProductDetail.tsx):
// rating chart + star distribution, search, sort, star-filter chips, verified
// purchase, country flags, review images with a lightbox, "helpful" toggles and
// a load-more window — collapsed to a phone-friendly vertical stack.
export default function ProductReviews({ productId, rating = 0, reviewCount = 0 }: ProductReviewsProps) {
  const router = useRouter();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(false);
  const [sort, setSort] = useState<SortMode>('newest');
  const [starFilter, setStarFilter] = useState(0); // 0 = all
  const [search, setSearch] = useState('');
  const [shown, setShown] = useState(5);
  const [helpful, setHelpful] = useState<Set<string>>(new Set());
  const [lightbox, setLightbox] = useState<{ images: string[]; index: number } | null>(null);
  const [auth, setAuth] = useState(false);

  useEffect(() => {
    (async () => {
      try { setAuth(await userAuthService.isAuthenticated()); } catch { setAuth(false); }
    })();
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    reviewService.getProductReviews(productId)
      .then((res) => { if (!cancelled && res.success && res.data) setReviews(res.data); })
      .catch(() => { /* ignore */ })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [productId]);

  useEffect(() => { setShown(5); }, [sort, starFilter, search]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = reviews.filter((r) => {
      if (starFilter && Math.round(r.rating || 0) !== starFilter) return false;
      if (q && !`${r.comment || ''} ${r.user?.name || ''}`.toLowerCase().includes(q)) return false;
      return true;
    });
    return [...list].sort((a, b) => {
      if (sort === 'highest') return (b.rating || 0) - (a.rating || 0);
      if (sort === 'lowest') return (a.rating || 0) - (b.rating || 0);
      const d = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return sort === 'oldest' ? d : -d;
    });
  }, [reviews, sort, starFilter, search]);

  const total = reviews.length;
  const avg = total ? reviews.reduce((s, r) => s + (r.rating || 0), 0) / total : 0;
  const withText = reviews.filter((r) => r.comment && r.comment.trim()).length;
  const dist = [5, 4, 3, 2, 1].map((star) => ({ star, count: reviews.filter((r) => Math.round(r.rating || 0) === star).length }));

  const goReview = () => router.push(auth ? ('/(tabs)/orders' as any) : ('/(auth)/Login' as any));

  const ratingChart = (
    <View style={s.chartCard}>
      <View style={s.chartHeader}>
        <Text style={s.avgText}>{avg.toFixed(1)}</Text>
        <Text style={s.avgDenom}>/5</Text>
      </View>
      <View style={s.chartStars}>
        {[1, 2, 3, 4, 5].map((i) => (
          <Star key={i} size={16} color={i <= Math.round(avg) ? '#f59e0b' : '#e5e7eb'} fill={i <= Math.round(avg) ? '#f59e0b' : 'transparent'} strokeWidth={1.5} />
        ))}
      </View>
      <Text style={s.chartCount}>
        {total} rating{total === 1 ? '' : 's'}{withText > 0 ? ` • ${withText} review${withText === 1 ? '' : 's'}` : ''}
      </Text>
      <View style={s.distWrap}>
        {dist.map(({ star, count }) => {
          const active = starFilter === star;
          return (
            <Pressable
              key={star}
              onPress={() => setStarFilter(active ? 0 : star)}
              accessibilityRole="button"
              accessibilityLabel={`Filter ${star} star reviews`}
              style={s.distRow}
            >
              <Text style={[s.distStar, active && { color: Palette.primary, fontWeight: '700' }]}>{star}★</Text>
              <View style={s.distTrack}>
                <View style={[s.distFill, { width: `${total ? (count / total) * 100 : 0}%` }]} />
              </View>
              <Text style={s.distCount}>{count}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );

  const toolbar = (
    <View style={s.toolbar}>
      <View style={s.searchBox}>
        <Search size={16} color="#9ca3af" style={{ position: 'absolute', left: 12 }} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search reviews..."
          placeholderTextColor="#9ca3af"
          style={s.searchInput}
          accessibilityLabel="Search reviews"
        />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.sortRow}>
        {(['newest', 'oldest', 'highest', 'lowest'] as SortMode[]).map((m) => {
          const active = sort === m;
          return (
            <Pressable
              key={m}
              onPress={() => setSort(m)}
              style={[s.sortChip, active && s.sortChipActive]}
              accessibilityRole="button"
            >
              <Text style={[s.sortChipText, active && s.sortChipTextActive]}>
                {m === 'newest' ? 'Newest first' : m === 'oldest' ? 'Oldest first' : m === 'highest' ? 'Highest rated' : 'Lowest rated'}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <View style={s.starChips}>
        {[0, 5, 4, 3, 2, 1].map((sVal) => {
          const active = starFilter === sVal;
          return (
            <Pressable
              key={sVal}
              onPress={() => setStarFilter(sVal)}
              style={[s.starChip, active && s.starChipActive]}
              accessibilityRole="button"
            >
              {sVal === 0 ? (
                <Text style={[s.starChipText, active && s.starChipTextActive]}>All</Text>
              ) : (
                <View style={s.starChipInner}>
                  <Text style={[s.starChipText, active && s.starChipTextActive]}>{sVal}</Text>
                  <Star size={12} color={active ? Palette.primary : '#f59e0b'} fill={active ? Palette.primary : '#f59e0b'} strokeWidth={1.5} />
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );

  const writeCta = (
    <Pressable
      onPress={() => { if (typeof Haptics !== 'undefined') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); goReview(); }}
      style={s.writeCta}
      accessibilityRole="button"
    >
      <PenLine size={14} color="#ffffff" />
      <Text style={s.writeCtaText}>{auth ? 'Write a Review' : 'Sign in to Review'}</Text>
    </Pressable>
  );

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>Customer Reviews</Text>
        {writeCta}
      </View>

      {loading ? (
        <View style={s.skeletonList}>
          {Array.from({ length: 3 }).map((_, i) => (
            <View key={i} style={s.skeletonRow}>
              <View style={s.skeletonAvatar} />
              <View style={s.skeletonCol}>
                <View style={s.skeletonLineWide} />
                <View style={s.skeletonLineNarrow} />
                <View style={s.skeletonLineWide} />
                <View style={s.skeletonLineMid} />
              </View>
            </View>
          ))}
        </View>
      ) : reviews.length === 0 ? (
        <View style={s.empty}>
          <View style={s.emptyStars}>
            {[1, 2, 3, 4, 5].map((i) => <Star key={i} size={24} color="#e5e7eb" />)}
          </View>
          <Text style={s.emptyTitle}>No reviews yet</Text>
          <Text style={s.emptySub}>Be the first customer to review this product.</Text>
          {writeCta}
        </View>
      ) : (
        <View style={s.body}>
          {ratingChart}
          {toolbar}
          {filtered.length === 0 ? (
            <Text style={s.noMatch}>No reviews match your filters.</Text>
          ) : (
            <View style={s.list}>
              {filtered.slice(0, shown).map((review) => (
                <ReviewCard
                  key={review.id}
                  review={review}
                  helped={helpful.has(review.id)}
                  onHelpful={() =>
                    setHelpful((prev) => {
                      const n = new Set(prev);
                      if (n.has(review.id)) n.delete(review.id); else n.add(review.id);
                      return n;
                    })
                  }
                  onImage={(images, index) => setLightbox({ images, index })}
                />
              ))}
            </View>
          )}
          {filtered.length > shown && (
            <Pressable
              onPress={() => setShown((n) => n + 5)}
              style={s.loadMore}
              accessibilityRole="button"
            >
              <Text style={s.loadMoreText}>
                Load more reviews <Text style={s.loadMoreCount}>({filtered.length - shown})</Text>
              </Text>
            </Pressable>
          )}
        </View>
      )}

      {/* Review image lightbox */}
      <Modal visible={!!lightbox} transparent animationType="fade" onRequestClose={() => setLightbox(null)}>
        <View style={s.lightbox} onStartShouldSetResponder={() => true}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setLightbox(null)} />
          <Pressable onPress={() => setLightbox(null)} style={s.lightboxClose} accessibilityLabel="Close">
            <X size={24} color="#ffffff" />
          </Pressable>
          {lightbox && (
            <>
              {lightbox.images.length > 1 && (
                <Pressable
                  onPress={() => setLightbox((l) => l ? { ...l, index: (l.index - 1 + l.images.length) % l.images.length } : l)}
                  style={s.lightboxNavL}
                  accessibilityLabel="Previous image"
                >
                  <ChevronLeft size={28} color="#ffffff" />
                </Pressable>
              )}
              <View style={s.lightboxImageWrap} onStartShouldSetResponder={() => true}>
                <Image source={{ uri: lightbox.images[lightbox.index] }} style={s.lightboxImage} contentFit="contain" />
              </View>
              {lightbox.images.length > 1 && (
                <>
                  <Pressable
                    onPress={() => setLightbox((l) => l ? { ...l, index: (l.index + 1) % l.images.length } : l)}
                    style={s.lightboxNavR}
                    accessibilityLabel="Next image"
                  >
                    <ChevronRight size={28} color="#ffffff" />
                  </Pressable>
                  <Text style={s.lightboxCounter}>{lightbox.index + 1} / {lightbox.images.length}</Text>
                </>
              )}
            </>
          )}
        </View>
      </Modal>
    </View>
  );
}

const ReviewCard = memo(function ReviewCard({
  review,
  helped,
  onHelpful,
  onImage,
}: {
  review: Review;
  helped: boolean;
  onHelpful: () => void;
  onImage: (images: string[], index: number) => void;
}) {
  const dateStr = new Date(review.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const countryName = getCountryName(review.user?.country);
  const flag = countryName ? getCountryFlag(review.user?.country) : '';
  const imgs = (review.images || []).filter(Boolean);
  const initial = (review.user?.name || 'C')[0].toUpperCase();

  return (
    <View style={s.card}>
      <View style={s.cardRow}>
        {review.user?.image ? (
          <Image source={{ uri: review.user.image }} style={s.avatarImg} contentFit="cover" transition={200} />
        ) : (
          <View style={s.avatar}>
            <Text style={s.avatarInitial}>{initial}</Text>
          </View>
        )}
        <View style={s.cardMain}>
          <View style={s.nameRow}>
            <Text style={s.name} numberOfLines={1}>{review.user?.name || 'Customer'}</Text>
            <View style={s.verified}>
              <Check size={11} color="#059669" strokeWidth={3} />
              <Text style={s.verifiedText}>Verified Purchase</Text>
            </View>
          </View>
          <View style={s.metaRow}>
            <View style={s.metaStars}>
              {[1, 2, 3, 4, 5].map((i) => (
                <Star key={i} size={13} color={i <= review.rating ? '#f59e0b' : '#e5e7eb'} fill={i <= review.rating ? '#f59e0b' : 'transparent'} strokeWidth={1.5} />
              ))}
            </View>
            <Text style={s.metaDate}>{dateStr}</Text>
            {countryName ? <Text style={s.metaCountry}>{flag ? `${flag} ` : ''}{countryName}</Text> : null}
          </View>
          {review.comment ? <Text style={s.comment}>{review.comment}</Text> : null}
          {imgs.length > 0 ? (
            <View style={s.imgRow}>
              {imgs.map((src, idx) => (
                <Pressable key={idx} onPress={() => onImage(imgs, idx)} accessibilityRole="imagebutton" accessibilityLabel={`Review image ${idx + 1}`}>
                  <Image source={{ uri: src }} style={s.reviewImg} contentFit="cover" transition={150} />
                </Pressable>
              ))}
            </View>
          ) : null}
          <Pressable
            onPress={onHelpful}
            style={[s.helpfulBtn, helped && s.helpfulBtnActive]}
            accessibilityRole="button"
            accessibilityLabel={helped ? 'Marked helpful' : 'Mark as helpful'}
          >
            <ThumbsUp size={13} color={helped ? Palette.primary : '#6b7280'} fill={helped ? Palette.primary : 'transparent'} />
            <Text style={[s.helpfulText, helped && s.helpfulTextActive]}>{helped ? 'Marked helpful' : 'Helpful'}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
});

const s = StyleSheet.create({
  container: { backgroundColor: '#ffffff', marginTop: 8, paddingHorizontal: 20, paddingVertical: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 },
  title: { fontSize: 17, fontWeight: '700', color: '#111827', flexShrink: 1 },
  writeCta: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Palette.primary, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8,
  },
  writeCtaText: { color: '#ffffff', fontSize: 12, fontWeight: '700' },

  skeletonList: { gap: 16, paddingTop: 8 },
  skeletonRow: { flexDirection: 'row', gap: 12 },
  skeletonAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#e5e7eb' },
  skeletonCol: { flex: 1, gap: 8 },
  skeletonLineWide: { height: 12, borderRadius: 6, backgroundColor: '#e5e7eb' },
  skeletonLineMid: { height: 12, borderRadius: 6, backgroundColor: '#f3f4f6', width: '75%' },
  skeletonLineNarrow: { height: 10, borderRadius: 5, backgroundColor: '#f3f4f6', width: '45%' },

  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 28 },
  emptyStars: { flexDirection: 'row', gap: 2, marginBottom: 10 },
  emptyTitle: { fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 4 },
  emptySub: { fontSize: 12, color: '#9ca3af', marginBottom: 12 },
  noMatch: { textAlign: 'center', color: '#9ca3af', fontSize: 13, paddingVertical: 24 },

  body: { gap: 12 },
  chartCard: { backgroundColor: '#f9fafb', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#f3f4f6' },
  chartHeader: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  avgText: { fontSize: 40, fontWeight: '800', color: '#111827', lineHeight: 44 },
  avgDenom: { fontSize: 13, color: '#9ca3af' },
  chartStars: { flexDirection: 'row', gap: 3, marginTop: 6 },
  chartCount: { fontSize: 12, color: '#6b7280', marginTop: 4 },
  distWrap: { marginTop: 10, gap: 4 },
  distRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  distStar: { width: 28, fontSize: 11, color: '#6b7280', textAlign: 'left' },
  distTrack: { flex: 1, height: 8, borderRadius: 4, backgroundColor: '#e5e7eb', overflow: 'hidden' },
  distFill: { height: '100%', borderRadius: 4, backgroundColor: '#f59e0b' },
  distCount: { width: 24, fontSize: 11, color: '#9ca3af', textAlign: 'right' },

  toolbar: { gap: 10 },
  searchBox: { position: 'relative' },
  searchInput: {
    backgroundColor: '#f9fafb', borderRadius: 999, borderWidth: 1, borderColor: '#e5e7eb',
    paddingLeft: 36, paddingRight: 12, paddingVertical: 9, fontSize: 13, color: '#374151',
  },
  sortRow: { gap: 8 },
  sortChip: { borderRadius: 999, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#ffffff', paddingHorizontal: 13, paddingVertical: 7 },
  sortChipActive: { borderColor: Palette.primary, backgroundColor: '#ffffff' },
  sortChipText: { fontSize: 12, fontWeight: '600', color: '#6b7280' },
  sortChipTextActive: { color: Palette.primary },
  starChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  starChip: { borderRadius: 999, backgroundColor: '#f3f4f6', paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: 'transparent' },
  starChipActive: { backgroundColor: '#ffffff', borderColor: Palette.primary },
  starChipInner: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  starChipText: { fontSize: 12, fontWeight: '600', color: '#4b5563' },
  starChipTextActive: { color: Palette.primary },

  list: { gap: 4 },
  card: { borderBottomWidth: 1, borderBottomColor: '#f3f4f6', paddingVertical: 12 },
  cardRow: { flexDirection: 'row', gap: 12 },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' },
  avatarImg: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#f3f4f6' },
  avatarInitial: { fontSize: 14, fontWeight: '700', color: '#6b7280' },
  cardMain: { flex: 1, minWidth: 0 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  name: { fontSize: 13, fontWeight: '600', color: '#111827', flexShrink: 1 },
  verified: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  verifiedText: { fontSize: 10, fontWeight: '600', color: '#059669' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  metaStars: { flexDirection: 'row', gap: 1 },
  metaDate: { fontSize: 11, color: '#9ca3af' },
  metaCountry: { fontSize: 11, color: '#9ca3af', borderLeftWidth: 1, borderLeftColor: '#e5e7eb', paddingLeft: 8 },
  comment: { fontSize: 13, color: '#374151', lineHeight: 20, marginTop: 8 },
  imgRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  reviewImg: { width: 64, height: 64, borderRadius: 8, backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#e5e7eb' },
  helpfulBtn: {
    alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6,
    borderRadius: 999, borderWidth: 1, borderColor: '#e5e7eb', paddingHorizontal: 12, paddingVertical: 6, marginTop: 8,
  },
  helpfulBtnActive: { borderColor: Palette.primary },
  helpfulText: { fontSize: 11, fontWeight: '600', color: '#6b7280' },
  helpfulTextActive: { color: Palette.primary },

  loadMore: {
    alignSelf: 'center', borderRadius: 999, borderWidth: 1, borderColor: '#e5e7eb',
    paddingHorizontal: 20, paddingVertical: 9, marginTop: 8,
  },
  loadMoreText: { fontSize: 13, fontWeight: '600', color: '#374151' },
  loadMoreCount: { color: '#9ca3af' },

  lightbox: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', alignItems: 'center', justifyContent: 'center' },
  lightboxClose: { position: 'absolute', top: 48, right: 20, zIndex: 10 },
  lightboxNavL: { position: 'absolute', left: 12, zIndex: 10 },
  lightboxNavR: { position: 'absolute', right: 12, zIndex: 10 },
  lightboxImageWrap: { width: '100%', height: '70%' },
  lightboxImage: { width: '100%', height: '100%' },
  lightboxCounter: { position: 'absolute', bottom: 24, color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '600' },
});
