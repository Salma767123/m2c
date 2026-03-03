import axios from '@/lib/axios';

export interface PublicPaymentSettings {
  razorpayEnabled: boolean;
  razorpayKeyId: string | null;
  payuEnabled: boolean;
  payuMerchantKey: string | null;
}

class PaymentSettingsService {
  // Get public payment settings (no authentication required)
  async getPublicPaymentSettings(): Promise<{ success: boolean; data: PublicPaymentSettings }> {
    try {
      const response = await axios.get('/payment-settings/public');
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to fetch payment settings');
    }
  }
}

export const paymentSettingsService = new PaymentSettingsService();
export default paymentSettingsService;
