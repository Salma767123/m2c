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
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
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

export interface ExperienceReviewData {
    orderId: string;
    rating: number;
    comment: string;
    images: string[];
}

export interface OrderReviewEligibility {
    products: { productId: string; reviewed: boolean }[];
    experienceReviewed: boolean;
}

export interface PublicExperienceReview {
    id: string;
    rating: number;
    comment: string | null;
    createdAt: string;
    user: { name: string; image: string | null; country: string | null } | null;
}

export interface PublicExperienceReviewsResponse {
    success: boolean;
    data: PublicExperienceReview[];
    summary: { average: number; count: number };
}

export interface AdminExperienceReview {
    id: string;
    userId: string;
    orderId: string;
    rating: number;
    comment: string | null;
    images: string[];
    isApproved: boolean;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    createdAt: string;
    updatedAt: string;
    user: {
        id: string;
        name: string;
        email: string;
        image: string | null;
    };
    order: {
        id: string;
        orderId: string;
    };
}

export interface AdminExperienceReviewsResponse {
    success: boolean;
    data: AdminExperienceReview[];
    pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
    stats: {
        total: number;
        pending: number;
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
            throw error.data || error;
        }
    }

    async checkReviewStatus(productId: string, orderId?: string) {
        try {
            const response = await axios.get(`/reviews/check-status`, {
                params: { productId, orderId }
            });
            return response.data;
        } catch (error: any) {
            return { success: false, hasReviewed: false };
        }
    }

    // Which products in an order can still be reviewed, and whether purchase
    // experience feedback has already been given for it.
    async getOrderReviewEligibility(orderId: string): Promise<{ success: boolean; data?: OrderReviewEligibility }> {
        try {
            const response = await axios.get(`/reviews/order-eligibility`, { params: { orderId } });
            return response.data;
        } catch (error: any) {
            return { success: false };
        }
    }

    // Approved purchase-experience feedback for the storefront testimonials strip.
    // Returns empty data on any error so the homepage section just hides itself.
    async getPublicExperienceReviews(limit = 12): Promise<PublicExperienceReviewsResponse> {
        try {
            const response = await axios.get('/reviews/experience/public', { params: { limit }, timeout: 5000 });
            return response.data;
        } catch {
            return { success: false, data: [], summary: { average: 0, count: 0 } };
        }
    }

    async submitExperienceReview(data: ExperienceReviewData) {
        try {
            const response = await axios.post('/reviews/experience', data);
            return response.data;
        } catch (error: any) {
            throw error.data || error;
        }
    }

    async getProductReviews(productId: string) {
        try {
            const response = await axios.get(`/reviews/product/${productId}`);
            return response.data;
        } catch (error: any) {
            throw error.data || error;
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
            throw error.data || error;
        }
    }

    async updateReviewStatus(reviewId: string, isApproved: boolean) {
        try {
            const response = await axios.patch(`/reviews/${reviewId}/status`, { isApproved });
            return response.data;
        } catch (error: any) {
            throw error.data || error;
        }
    }

    async deleteReview(reviewId: string) {
        try {
            const response = await axios.delete(`/reviews/${reviewId}`);
            return response.data;
        } catch (error: any) {
            throw error.data || error;
        }
    }

    // ---- Admin: purchase-experience feedback ----

    async getAdminExperienceReviews(params?: {
        search?: string;
        status?: string;
        page?: number;
        limit?: number;
    }): Promise<AdminExperienceReviewsResponse> {
        try {
            const response = await axios.get('/reviews/admin/experience/all', { params });
            return response.data;
        } catch (error: any) {
            throw error.data || error;
        }
    }

    async updateExperienceReviewStatus(reviewId: string, isApproved: boolean) {
        try {
            const response = await axios.patch(`/reviews/experience/${reviewId}/status`, { isApproved });
            return response.data;
        } catch (error: any) {
            throw error.data || error;
        }
    }

    async deleteExperienceReview(reviewId: string) {
        try {
            const response = await axios.delete(`/reviews/experience/${reviewId}`);
            return response.data;
        } catch (error: any) {
            throw error.data || error;
        }
    }
}

export default new ReviewService();
