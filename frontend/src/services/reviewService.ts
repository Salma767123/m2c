import axios from '@/lib/axios';

export interface ReviewData {
    productId: string;
    orderId: string;
    rating: number;
    comment: string;
    images: string[];
}

export interface AdminReview {
    id: string;
    userId: string;
    productId: string;
    orderId: string;
    rating: number;
    comment: string | null;
    images: string[];
    isApproved: boolean;
    createdAt: string;
    updatedAt: string;
    user: {
        id: string;
        name: string;
        email: string;
        image: string | null;
    };
    product: {
        id: string;
        name: string;
        images: { url: string; isPrimary: boolean }[];
    };
    order: {
        id: string;
        orderId: string;
    };
}

export interface AdminReviewsResponse {
    success: boolean;
    data: AdminReview[];
    pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
    stats: {
        total: number;
        approved: number;
        rejected: number;
        averageRating: number;
    };
}

class ReviewService {
    async submitReview(data: ReviewData) {
        try {
            const response = await axios.post('/reviews', data);
            return response.data;
        } catch (error: any) {
            throw error.response?.data || error;
        }
    }

    async checkReviewStatus(productId: string, orderId: string) {
        try {
            const response = await axios.get(`/reviews/check-status`, {
                params: { productId, orderId }
            });
            return response.data;
        } catch (error: any) {
            return { success: false, hasReviewed: false };
        }
    }

    async getProductReviews(productId: string) {
        try {
            const response = await axios.get(`/reviews/product/${productId}`);
            return response.data;
        } catch (error: any) {
            throw error.response?.data || error;
        }
    }

    // ==========================================
    // ADMIN METHODS
    // ==========================================

    async getAdminReviews(params?: {
        search?: string;
        status?: string;
        page?: number;
        limit?: number;
    }): Promise<AdminReviewsResponse> {
        try {
            const response = await axios.get('/reviews/admin/all', { params });
            return response.data;
        } catch (error: any) {
            throw error.response?.data || error;
        }
    }

    async updateReviewStatus(reviewId: string, isApproved: boolean) {
        try {
            const response = await axios.patch(`/reviews/${reviewId}/status`, { isApproved });
            return response.data;
        } catch (error: any) {
            throw error.response?.data || error;
        }
    }

    async deleteReview(reviewId: string) {
        try {
            const response = await axios.delete(`/reviews/${reviewId}`);
            return response.data;
        } catch (error: any) {
            throw error.response?.data || error;
        }
    }
}

export default new ReviewService();
