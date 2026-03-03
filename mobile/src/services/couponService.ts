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
  };
}

class CouponService {
  async applyCoupon(code: string, cartTotal: number): Promise<ApplyCouponResponse> {
    try {
      const response = await axios.post('/coupons/apply', { code, cartTotal });
      return response.data;
    } catch (error: any) {
      // Return the error message from the backend if available
      if (error.response && error.response.data) {
        return error.response.data;
      }
      throw new Error(error.message || 'Failed to apply coupon');
    }
  }

  // Admin methods
  async getCoupons(): Promise<{ success: boolean; data: { coupons: Coupon[]; pagination: any } }> {
    try {
      const response = await axios.get('/coupons');
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to fetch coupons');
    }
  }

  async createCoupon(couponData: Partial<Coupon>): Promise<{ success: boolean; data: Coupon }> {
    try {
      const response = await axios.post('/coupons', couponData);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to create coupon');
    }
  }

  async updateCoupon(
    id: string,
    couponData: Partial<Coupon>
  ): Promise<{ success: boolean; data: Coupon }> {
    try {
      const response = await axios.put(`/coupons/${id}`, couponData);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to update coupon');
    }
  }

  async deleteCoupon(id: string): Promise<{ success: boolean }> {
    try {
      const response = await axios.delete(`/coupons/${id}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to delete coupon');
    }
  }
}

export const couponService = new CouponService();
export default couponService;
