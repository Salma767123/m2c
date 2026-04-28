import axios from '@/lib/axios';

export interface ReviewData {
  productId: string;
  orderId: string;
  rating: number;
  comment: string;
  images?: string[];
}

export interface Review {
  id: string;
  userId: string;
  productId: string;
  orderId: string;
  rating: number;
  comment: string | null;
  images: string[];
  isApproved: boolean;
  createdAt: string;
  user?: {
    name: string;
    image: string | null;
  };
}

class ReviewService {
  async submitReview(data: ReviewData): Promise<{ success: boolean; data?: Review; message?: string }> {
    try {
      const response = await axios.post('/reviews', data);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        message: error?.message || 'Failed to submit review',
      };
    }
  }

  async getProductReviews(productId: string): Promise<{ success: boolean; data?: Review[] }> {
    try {
      const response = await axios.get(`/reviews/product/${productId}`);
      return response.data;
    } catch {
      return { success: false, data: [] };
    }
  }

  async checkReviewStatus(
    productId: string,
    orderId: string,
  ): Promise<{ success: boolean; hasReviewed: boolean }> {
    try {
      const response = await axios.get('/reviews/check-status', {
        params: { productId, orderId },
      });
      return response.data;
    } catch {
      return { success: false, hasReviewed: false };
    }
  }
}

export const reviewService = new ReviewService();
export default reviewService;
