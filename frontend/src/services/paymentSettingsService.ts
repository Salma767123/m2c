import axiosInstance from '@/lib/axios';

export interface RazorpaySettings {
  enabled: boolean;
  keyId: string;
  keySecret: string;
  webhookSecret: string;
}

export interface PayUSettings {
  enabled: boolean;
  merchantKey: string;
  merchantSalt: string;
}

export interface PaymentSettings {
  id: string;
  razorpayEnabled: boolean;
  razorpayKeyId: string;
  razorpayKeySecret: string;
  razorpayWebhookSecret: string;
  payuEnabled: boolean;
  payuMerchantKey: string;
  payuMerchantSalt: string;
  updatedAt: string;
}

class PaymentSettingsService {
  // Get payment settings
  async getPaymentSettings(): Promise<{ success: boolean; data: PaymentSettings }> {
    try {
      const response = await axiosInstance.get('/payment-settings');
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to fetch payment settings');
    }
  }

  // Update Razorpay settings
  async updateRazorpaySettings(settings: RazorpaySettings): Promise<{ success: boolean; message: string; data: Partial<PaymentSettings> }> {
    try {
      const response = await axiosInstance.put('/payment-settings/razorpay', settings);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to update Razorpay settings');
    }
  }

  // Update PayU settings
  async updatePayUSettings(settings: PayUSettings): Promise<{ success: boolean; message: string; data: Partial<PaymentSettings> }> {
    try {
      const response = await axiosInstance.put('/payment-settings/payu', settings);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to update PayU settings');
    }
  }
}

export const paymentSettingsService = new PaymentSettingsService();
export default paymentSettingsService;
