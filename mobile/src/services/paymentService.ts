import axios from '@/lib/axios';

export interface RazorpayOrderResponse {
  success: boolean;
  data: {
    orderId: string;
    amount: number;
    currency: string;
    keyId: string;
  };
}

export interface RazorpayVerificationResponse {
  success: boolean;
  message: string;
  data: {
    orderId: string;
    paymentId: string;
  };
}

class PaymentService {
  // Create Razorpay order
  async createRazorpayOrder(
    amount: number,
    currency: string = 'INR'
  ): Promise<RazorpayOrderResponse> {
    try {
      const response = await axios.post('/payments/razorpay/create-order', {
        amount,
        currency,
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to create payment order');
    }
  }

  // Verify Razorpay payment
  async verifyRazorpayPayment(
    razorpay_order_id: string,
    razorpay_payment_id: string,
    razorpay_signature: string
  ): Promise<RazorpayVerificationResponse> {
    try {
      const response = await axios.post('/payments/razorpay/verify', {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Payment verification failed');
    }
  }

  // Create PayU hash
  async createPayUHash(params: {
    txnid: string;
    amount: number;
    productinfo: string;
    firstname: string;
    email: string;
  }): Promise<{ success: boolean; data: { hash: string; merchantKey: string } }> {
    try {
      const response = await axios.post('/payments/payu/create-hash', params);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to create payment hash');
    }
  }
}

export const paymentService = new PaymentService();
export default paymentService;
