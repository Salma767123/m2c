import axios from '@/lib/axios';

export interface Coupon {
    id: string;
    code: string;
    description?: string;
    discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
    discountValue: number;
    minPurchaseAmount?: number;
    maxDiscountAmount?: number;
    startDate: string;
    expiryDate: string;
    isActive: boolean;
    usageLimit?: number;
    usedCount?: number;
    perUserLimit?: number;
    freeShipping?: boolean;
    freeShippingOrderNumbers?: number[];
    showAsPopup?: boolean;
    popupImage?: string;
    popupTitle?: string;
    popupMessage?: string;
    applicableCategories?: string[];
}

export interface PopupCoupon {
    id: string;
    code: string;
    popupImage: string | null;
    popupTitle: string | null;
    popupMessage: string | null;
    discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
    discountValue: number;
    description?: string;
}

export interface FreeShippingOffer {
    id: string;
    minOrderValue: number;
    orderNumbers: number[];
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface ApplyCouponResponse {
    success: boolean;
    message: string;
    data?: {
        code: string;
        discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
        discountValue: number;
        discountAmount: number;
        minPurchaseAmount?: number;
        freeShipping?: boolean;
        freeShippingOrderNumbers?: number[];
    };
}

class CouponService {
    async applyCoupon(code: string, cartTotal: number, currency?: string): Promise<ApplyCouponResponse> {
        try {
            const response = await axios.post('/coupons/apply', { code, cartTotal, currency });
            return response.data;
        } catch (error: unknown) {
            // Return the error message from the backend if available
            if (error && typeof error === 'object' && 'response' in error) {
                const axiosError = error as { response?: { data?: unknown } };
                if (axiosError.response && axiosError.response.data) {
                    return axiosError.response.data as ApplyCouponResponse;
                }
            }
            const errorMessage = error instanceof Error ? error.message : 'Failed to apply coupon';
            throw new Error(errorMessage);
        }
    }

    async getPopupCoupon(category: string): Promise<PopupCoupon | null> {
        try {
            const response = await axios.get('/coupons/popup', { params: { category }, timeout: 5000 });
            return response.data?.success ? response.data.data : null;
        } catch {
            return null;
        }
    }

    async applyFreeShippingOffer(userId: string, cartTotal: number): Promise<ApplyCouponResponse> {
        try {
            const response = await axios.post('/coupons/apply-free-shipping', { userId, cartTotal });
            return response.data;
        } catch (error: unknown) {
            // Return the error message from the backend if available
            if (error && typeof error === 'object' && 'response' in error) {
                const axiosError = error as { response?: { data?: unknown } };
                if (axiosError.response && axiosError.response.data) {
                    return axiosError.response.data as ApplyCouponResponse;
                }
            }
            const errorMessage = error instanceof Error ? error.message : 'Failed to apply free shipping offer';
            throw new Error(errorMessage);
        }
    }

    // Admin methods
    async getCoupons(): Promise<{ success: boolean; data: { coupons: Coupon[], pagination: unknown } }> {
        try {
            const response = await axios.get('/coupons');
            return response.data;
        } catch (error: unknown) {
            const errorMessage = error && typeof error === 'object' && 'response' in error 
                ? (error as { response?: { data?: { error?: string } } }).response?.data?.error || 'Failed to fetch coupons'
                : 'Failed to fetch coupons';
            throw new Error(errorMessage);
        }
    }

    async createCoupon(couponData: Partial<Coupon>): Promise<{ success: boolean; data: Coupon }> {
        try {
            const response = await axios.post('/coupons', couponData);
            return response.data;
        } catch (error: unknown) {
            const errorMessage = error && typeof error === 'object' && 'response' in error 
                ? (error as { response?: { data?: { error?: string } } }).response?.data?.error || 'Failed to create coupon'
                : 'Failed to create coupon';
            throw new Error(errorMessage);
        }
    }

    async updateCoupon(id: string, couponData: Partial<Coupon>): Promise<{ success: boolean; data: Coupon }> {
        try {
            const response = await axios.put(`/coupons/${id}`, couponData);
            return response.data;
        } catch (error: unknown) {
            const errorMessage = error && typeof error === 'object' && 'response' in error 
                ? (error as { response?: { data?: { error?: string } } }).response?.data?.error || 'Failed to update coupon'
                : 'Failed to update coupon';
            throw new Error(errorMessage);
        }
    }

    async deleteCoupon(id: string): Promise<{ success: boolean }> {
        try {
            const response = await axios.delete(`/coupons/${id}`);
            return response.data;
        } catch (error: unknown) {
            const errorMessage = error && typeof error === 'object' && 'response' in error 
                ? (error as { response?: { data?: { error?: string } } }).response?.data?.error || 'Failed to delete coupon'
                : 'Failed to delete coupon';
            throw new Error(errorMessage);
        }
    }

    // Free shipping offer methods
    async getFreeShippingOffers(): Promise<{ success: boolean; data: { offers: FreeShippingOffer[], pagination: unknown } }> {
        try {
            const response = await axios.get('/coupons/free-shipping');
            return response.data;
        } catch (error: unknown) {
            const errorMessage = error && typeof error === 'object' && 'response' in error 
                ? (error as { response?: { data?: { error?: string } } }).response?.data?.error || 'Failed to fetch free shipping offers'
                : 'Failed to fetch free shipping offers';
            throw new Error(errorMessage);
        }
    }

    async createFreeShippingOffer(offerData: Partial<FreeShippingOffer>): Promise<{ success: boolean; data: FreeShippingOffer }> {
        try {
            const response = await axios.post('/coupons/free-shipping', offerData);
            return response.data;
        } catch (error: unknown) {
            const errorMessage = error && typeof error === 'object' && 'response' in error 
                ? (error as { response?: { data?: { error?: string } } }).response?.data?.error || 'Failed to create free shipping offer'
                : 'Failed to create free shipping offer';
            throw new Error(errorMessage);
        }
    }

    async updateFreeShippingOffer(id: string, offerData: Partial<FreeShippingOffer>): Promise<{ success: boolean; data: FreeShippingOffer }> {
        try {
            const response = await axios.put(`/coupons/free-shipping/${id}`, offerData);
            return response.data;
        } catch (error: unknown) {
            const errorMessage = error && typeof error === 'object' && 'response' in error 
                ? (error as { response?: { data?: { error?: string } } }).response?.data?.error || 'Failed to update free shipping offer'
                : 'Failed to update free shipping offer';
            throw new Error(errorMessage);
        }
    }

    async deleteFreeShippingOffer(id: string): Promise<{ success: boolean }> {
        try {
            const response = await axios.delete(`/coupons/free-shipping/${id}`);
            return response.data;
        } catch (error: unknown) {
            const errorMessage = error && typeof error === 'object' && 'response' in error 
                ? (error as { response?: { data?: { error?: string } } }).response?.data?.error || 'Failed to delete free shipping offer'
                : 'Failed to delete free shipping offer';
            throw new Error(errorMessage);
        }
    }
}

export const couponService = new CouponService();
export default couponService;
