import React, { useState, useEffect, useCallback, memo } from 'react';
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Star, User, ChevronDown, ChevronUp } from 'lucide-react-native';
import { reviewService, type Review } from '@/services/reviewService';

interface ProductReviewsProps {
  productId: string;
  rating?: number;
  reviewCount?: number;
}

export default function ProductReviews({ productId, rating = 0, reviewCount = 0 }: ProductReviewsProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    const res = await reviewService.getProductReviews(productId);
    if (res.success && res.data) {
      setReviews(res.data);
    }
    setLoading(false);
  }, [productId]);

  useEffect(() => {
    if (expanded && reviews.length === 0) fetchReviews();
  }, [expanded, reviews.length, fetchReviews]);

  if (reviewCount === 0 && reviews.length === 0) return null;

  return (
    <View style={s.container}>
      {/* Header — always visible */}
      <Pressable
        onPress={() => setExpanded((v) => !v)}
        accessibilityRole="button"
        accessibilityLabel={expanded ? 'Hide reviews' : 'Show reviews'}
        accessibilityState={{ expanded }}
        style={s.header}
      >
        <View style={s.headerLeft}>
          <Text style={s.title}>Customer Reviews</Text>
          <View style={s.ratingRow}>
            <View style={s.starsRow}>
              {[1, 2, 3, 4, 5].map((i) => (
                <Star
                  key={i}
                  size={14}
                  color={i <= Math.round(rating) ? '#f59e0b' : '#e5e7eb'}
                  fill={i <= Math.round(rating) ? '#f59e0b' : 'transparent'}
                  strokeWidth={1.5}
                />
              ))}
            </View>
            <Text style={s.ratingText}>{rating.toFixed(1)}</Text>
            <Text style={s.countText}>({reviewCount})</Text>
          </View>
        </View>
        {expanded ? (
          <ChevronUp size={18} color="#6b7280" />
        ) : (
          <ChevronDown size={18} color="#6b7280" />
        )}
      </Pressable>

      {/* Expanded review list */}
      {expanded ? (
        <View style={s.reviewList}>
          {loading ? (
            <View style={s.loadingWrap}>
              <ActivityIndicator size="small" color="#6b7280" />
              <Text style={s.loadingText}>Loading reviews...</Text>
            </View>
          ) : reviews.length === 0 ? (
            <Text style={s.emptyText}>No reviews yet</Text>
          ) : (
            reviews.slice(0, 10).map((review) => (
              <ReviewCard key={review.id} review={review} />
            ))
          )}
        </View>
      ) : null}
    </View>
  );
}

const ReviewCard = memo(function ReviewCard({ review }: { review: Review }) {
  const date = new Date(review.createdAt);
  const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <View style={s.card}>
      <View style={s.cardHeader}>
        <View style={s.avatar}>
          <User size={14} color="#9ca3af" />
        </View>
        <View style={s.cardInfo}>
          <Text style={s.userName}>{review.user?.name || 'Customer'}</Text>
          <Text style={s.dateText}>{dateStr}</Text>
        </View>
        <View style={s.cardStars}>
          {[1, 2, 3, 4, 5].map((i) => (
            <Star
              key={i}
              size={12}
              color={i <= review.rating ? '#f59e0b' : '#e5e7eb'}
              fill={i <= review.rating ? '#f59e0b' : 'transparent'}
              strokeWidth={1.5}
            />
          ))}
        </View>
      </View>
      {review.comment ? (
        <Text style={s.commentText}>{review.comment}</Text>
      ) : null}
    </View>
  );
});

const s = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: { flex: 1 },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 2,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  countText: {
    fontSize: 13,
    color: '#6b7280',
  },

  // Review list
  reviewList: {
    marginTop: 16,
    gap: 12,
  },
  loadingWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  loadingText: {
    fontSize: 13,
    color: '#6b7280',
  },
  emptyText: {
    fontSize: 13,
    color: '#9ca3af',
    textAlign: 'center',
    paddingVertical: 16,
  },

  // Card
  card: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  dateText: {
    fontSize: 11,
    color: '#9ca3af',
  },
  cardStars: {
    flexDirection: 'row',
    gap: 1,
  },
  commentText: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 19,
    marginTop: 10,
  },
});
