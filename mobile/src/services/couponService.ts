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

/** Category coupon surfaced as a popup / the top-priority promo in the offers rail. */
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

class CouponService {
  async applyCoupon(code: string, cartTotal: number, currency?: string): Promise<ApplyCouponResponse> {
    try {
      const response = await axios.post('/coupons/apply', { code, cartTotal, currency });
      return response.data;
    } catch (error: any) {
      // Return the error message from the backend if available
      if (error.response && error.response.data) {
        return error.response.data;
      }
      throw new Error(error.message || 'Failed to apply coupon');
    }
  }

  /**
   * Check whether the signed-in user qualifies for a free-shipping offer at this
   * cart total (e.g. "free shipping on your Nth order"). Ported from the web
   * service — the endpoint is user-scoped, so it's only meaningful once signed in.
   */
  async applyFreeShippingOffer(userId: string, cartTotal: number): Promise<ApplyCouponResponse> {
    try {
      const response = await axios.post('/coupons/apply-free-shipping', { userId, cartTotal });
      return response.data;
    } catch (error: any) {
      if (error?.response?.data) return error.response.data;
      throw new Error(error?.message || 'Failed to apply free shipping offer');
    }
  }

  /**
   * Promotional coupon blurbs for the home notice board.
   *
   * Ported from the web service, including its shape tolerance: older backends
   * return a plain `string[]`, newer ones `{message,image,link}`. Never throws —
   * the board simply drops this source when it fails.
   */
  async getPromotionalCoupons(
    limit = 10,
  ): Promise<{ message: string; image: string | null; link: string }[]> {
    try {
      const response = await axios.get('/coupons/promotional', { params: { limit }, timeout: 5000 });
      const arr =
        response.data?.success && Array.isArray(response.data.data) ? response.data.data : [];
      return arr
        .map((c: any) =>
          typeof c === 'string'
            ? { message: c, image: null, link: '/products' }
            : { message: c?.message, image: c?.image ?? null, link: c?.link || '/products' },
        )
        .filter((c: { message?: string }) => c.message && c.message.trim());
    } catch {
      return [];
    }
  }

  /**
   * The highest-priority coupon for a category that's marked "show as popup".
   * Mirrors the web service — used by the promotional popup and the product
   * detail offers rail. Never throws.
   */
  async getPopupCoupon(category: string): Promise<PopupCoupon | null> {
    try {
      const response = await axios.get('/coupons/popup', { params: { category }, timeout: 5000 });
      return response.data?.success ? response.data.data : null;
    } catch {
      return null;
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
