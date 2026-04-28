import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  TextInput,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Image } from 'expo-image';
import { X, Star, Send, Package } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { reviewService } from '@/services/reviewService';
import { showSuccessToast, showErrorToast } from '@/lib/toast-utils';

interface OrderItem {
  productId: string;
  productName: string;
  productImage?: string;
}

interface ReviewModalProps {
  visible: boolean;
  orderId: string;
  orderDisplayId: string;
  items: OrderItem[];
  onClose: () => void;
  onReviewSubmitted?: () => void;
}

export default function ReviewModal({
  visible,
  orderId,
  orderDisplayId,
  items,
  onClose,
  onReviewSubmitted,
}: ReviewModalProps) {
  const insets = useSafeAreaInsets();
  const [selectedProduct, setSelectedProduct] = useState<OrderItem | null>(
    items.length === 1 ? items[0] : null,
  );
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const reset = useCallback(() => {
    setSelectedProduct(items.length === 1 ? items[0] : null);
    setRating(0);
    setComment('');
  }, [items]);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  const handleSubmit = useCallback(async () => {
    if (!selectedProduct) {
      showErrorToast('Select Product', 'Please select a product to review');
      return;
    }
    if (rating === 0) {
      showErrorToast('Rate Product', 'Please select a star rating');
      return;
    }

    setSubmitting(true);
    try {
      const res = await reviewService.submitReview({
        productId: selectedProduct.productId,
        orderId,
        rating,
        comment: comment.trim(),
      });

      if (res.success) {
        showSuccessToast('Review Submitted', 'Your review is pending admin approval.');
        reset();
        onReviewSubmitted?.();
        onClose();
      } else {
        showErrorToast('Failed', res.message || 'Could not submit review');
      }
    } catch (e: any) {
      showErrorToast('Error', e.message || 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }, [selectedProduct, orderId, rating, comment, reset, onReviewSubmitted, onClose]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={[s.root, { paddingTop: insets.top + 12 }]}>
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.headerTitle}>Write a Review</Text>
            <Text style={s.headerSub}>Order #{orderDisplayId}</Text>
          </View>
          <Pressable
            onPress={handleClose}
            accessibilityRole="button"
            accessibilityLabel="Close"
            style={s.closeBtn}
          >
            <X size={20} color="#6b7280" />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Product Selection */}
          {items.length > 1 ? (
            <View style={s.section}>
              <Text style={s.sectionTitle}>Select Product</Text>
              <View style={s.productList}>
                {items.map((item) => {
                  const isSelected = selectedProduct?.productId === item.productId;
                  return (
                    <Pressable
                      key={item.productId}
                      onPress={() => setSelectedProduct(item)}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: isSelected }}
                      style={[s.productItem, isSelected ? s.productItemSelected : null]}
                    >
                      <View style={s.productImage}>
                        {item.productImage ? (
                          <Image
                            source={{ uri: item.productImage }}
                            style={s.productImageInner}
                            contentFit="cover"
                            transition={150}
                          />
                        ) : (
                          <Package size={20} color="#d1d5db" />
                        )}
                      </View>
                      <Text style={s.productName} numberOfLines={2}>{item.productName}</Text>
                      {isSelected ? (
                        <View style={s.checkDot} />
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : selectedProduct ? (
            <View style={s.section}>
              <View style={[s.productItem, s.productItemSelected]}>
                <View style={s.productImage}>
                  {selectedProduct.productImage ? (
                    <Image
                      source={{ uri: selectedProduct.productImage }}
                      style={s.productImageInner}
                      contentFit="cover"
                      transition={150}
                    />
                  ) : (
                    <Package size={20} color="#d1d5db" />
                  )}
                </View>
                <Text style={s.productName} numberOfLines={2}>{selectedProduct.productName}</Text>
              </View>
            </View>
          ) : null}

          {/* Star Rating */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Your Rating</Text>
            <View style={s.starsRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Pressable
                  key={star}
                  onPress={() => setRating(star)}
                  accessibilityRole="button"
                  accessibilityLabel={`${star} star${star > 1 ? 's' : ''}`}
                  style={s.starBtn}
                >
                  <Star
                    size={36}
                    color={star <= rating ? '#f59e0b' : '#e5e7eb'}
                    fill={star <= rating ? '#f59e0b' : 'transparent'}
                    strokeWidth={1.5}
                  />
                </Pressable>
              ))}
            </View>
            {rating > 0 ? (
              <Text style={s.ratingLabel}>
                {['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][rating]}
              </Text>
            ) : null}
          </View>

          {/* Comment */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Your Review (optional)</Text>
            <TextInput
              value={comment}
              onChangeText={setComment}
              placeholder="Share your experience with this product..."
              placeholderTextColor="#9ca3af"
              multiline
              numberOfLines={4}
              maxLength={500}
              style={s.commentInput}
              textAlignVertical="top"
            />
            <Text style={s.charCount}>{comment.length}/500</Text>
          </View>
        </ScrollView>

        {/* Submit Button */}
        <View style={[s.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <Pressable
            onPress={handleSubmit}
            disabled={submitting || rating === 0 || !selectedProduct}
            accessibilityRole="button"
            accessibilityLabel="Submit review"
            style={[
              s.submitBtn,
              (submitting || rating === 0 || !selectedProduct) ? s.submitBtnDisabled : null,
            ]}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <Send size={18} color="#ffffff" />
                <Text style={s.submitText}>Submit Review</Text>
              </>
            )}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
  },
  headerSub: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },

  // Sections
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 10,
  },

  // Product selection
  productList: {
    gap: 8,
  },
  productItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    backgroundColor: '#ffffff',
    gap: 12,
  },
  productItemSelected: {
    borderColor: '#111827',
    backgroundColor: '#f9fafb',
  },
  productImage: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: '#f3f4f6',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  productImageInner: {
    width: '100%',
    height: '100%',
  },
  productName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  checkDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#111827',
  },

  // Stars
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  starBtn: {
    padding: 4,
  },
  ratingLabel: {
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
    color: '#f59e0b',
    marginTop: 4,
  },

  // Comment
  commentInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 14,
    padding: 14,
    fontSize: 14,
    color: '#111827',
    minHeight: 100,
    backgroundColor: '#f9fafb',
  },
  charCount: {
    textAlign: 'right',
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 4,
  },

  // Footer
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 14,
    backgroundColor: '#111827',
    gap: 8,
  },
  submitBtnDisabled: {
    backgroundColor: '#d1d5db',
  },
  submitText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
});
