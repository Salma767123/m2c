import axios from '@/lib/axios';

export interface AdminOrderReview {
    id: string;
    orderId?: string;
    shipmentId?: string;
    vendorId?: string;
    reviewComments?: string;
    qualityCheckNotes?: string;
    rating?: number;
    approved: boolean;
    reviewedBy?: string;
    reviewedAt?: string;
    rejectionReason?: string;
    returnToVendor: boolean;
    createdAt: string;
    updatedAt: string;
    shipment?: {
        id: string;
        shipmentId: string;
        vendorName: string;
        status: string;
    } | null;
    order?: {
        id: string;
        orderId: string;
        customerName: string;
        customerEmail: string;
        customerPhone: string;
        totalAmount: number;
        status: string;
        orderDate: string;
        items: Array<{
            id: string;
            productId: string;
            productName: string;
            productImage?: string;
            variantId?: string;
            size?: string;
            color?: string;
            sku: string;
            quantity: number;
            unitPrice: number;
            totalPrice: number;
            vendorId: string;
            vendorName: string;
        }>;
    };
}

export interface AdminOrderReviewsResponse {
    success: boolean;
    data: AdminOrderReview[];
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
    };
    ratingDistribution?: Record<number, number>;
}

interface ReviewPayload {
    reviewComments?: string;
    qualityCheckNotes?: string;
    rating?: number;
    approved: boolean;
    rejectionReason?: string;
    returnToVendor?: boolean;
}

class AdminReviewService {
    // Get all admin reviews (quality check reviews)
    async getAllAdminReviews(params?: {
        search?: string;
        status?: string;
        page?: number;
        limit?: number;
        vendorId?: string;
    }): Promise<AdminOrderReviewsResponse> {
        try {
            const response = await axios.get('/orders/admin-reviews', { params });
            return response.data;
        } catch (error: any) {
            throw new Error(error.message || 'Failed to fetch admin reviews');
        }
    }

    // Get admin review for a specific shipment (primary path)
    async getAdminReviewByShipment(shipmentId: string): Promise<{ success: boolean; data: AdminOrderReview }> {
        try {
            const response = await axios.get(`/orders/admin-reviews/shipment/${shipmentId}`);
            return response.data;
        } catch (error: any) {
            throw new Error(error.message || 'Failed to fetch admin review');
        }
    }

    // Create or update admin review for a shipment (primary path)
    async createOrUpdateShipmentReview(
        shipmentId: string,
        reviewData: ReviewPayload
    ): Promise<{ success: boolean; data: AdminOrderReview; message: string }> {
        try {
            const response = await axios.post(`/orders/admin-reviews/shipment/${shipmentId}`, reviewData);
            return response.data;
        } catch (error: any) {
            throw new Error(error.message || 'Failed to save admin review');
        }
    }

    // Get admin review for a specific order (backward compat)
    async getAdminReviewByOrder(orderId: string): Promise<{ success: boolean; data: AdminOrderReview }> {
        try {
            const response = await axios.get(`/orders/admin-reviews/order/${orderId}`);
            return response.data;
        } catch (error: any) {
            throw new Error(error.message || 'Failed to fetch admin review');
        }
    }

    // Create or update admin review for an order (backward compat)
    async createOrUpdateAdminReview(orderId: string, reviewData: ReviewPayload): Promise<{ success: boolean; data: AdminOrderReview; message: string }> {
        try {
            const response = await axios.post(`/orders/admin-reviews/order/${orderId}`, reviewData);
            return response.data;
        } catch (error: any) {
            throw new Error(error.message || 'Failed to save admin review');
        }
    }

    // Delete an admin review
    async deleteAdminReview(id: string): Promise<{ success: boolean; message: string }> {
        try {
            const response = await axios.delete(`/orders/admin-reviews/${id}`);
            return response.data;
        } catch (error: any) {
            throw new Error(error.message || 'Failed to delete admin review');
        }
    }
}

export const adminReviewService = new AdminReviewService();
export default adminReviewService;
