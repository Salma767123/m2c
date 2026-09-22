import axios from '@/lib/axios';

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  productImage: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  vendorId: string;
  vendorName: string;
  sku: string;
  /**
   * Variant identity. Without these an order line cannot say WHICH size or
   * colour was bought — the app already renders them on product and cart
   * screens, and stopped carrying them at the order boundary.
   */
  variantId?: string;
  size?: string;
  color?: string;
  colorHex?: string;
  /**
   * Whether this line may be returned. The admin can mark a line ineligible,
   * and the web hides Return when no line on the order is eligible; mobile's
   * type did not carry the field, so it could not make that check.
   */
  returnable?: boolean;
  /** Shipping mode chosen for this line. */
  transportType?: 'AIR' | 'SHIP' | null;
  /** Courier partner id (resolve via lib/couriers). */
  courier?: string | null;
}

export interface Order {
  id: string;
  orderId: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: {
    fullName: string;
    phone: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  subtotal: number;
  shippingCost: number;
  tax: number;
  discount: number;
  totalAmount: number;
  /**
   * Currency the order was actually charged in, fixed at purchase time. Every
   * amount above must be rendered in THIS currency, not the current app region —
   * a USD order opened from the .in region is still a USD order.
   */
  currency?: string | null;
  paymentStatus: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
  paymentMethod: string;
  paymentId?: string;
  status: 'ORDER_CREATED' | 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
  items: OrderItem[];
  createdAt: string;
  updatedAt: string;

  /* ── Post-purchase state ───────────────────────────────────────────────────
     Everything below was missing from the mobile copy, which is why the app
     could show an order but nothing about what happened to it afterwards. */

  /** Invoice number, once raised. */
  invoiceNo?: string;
  /** When the order was placed. Distinct from `updatedAt`, which moves on every
   *  status change — the app was showing the latter as the order date. */
  orderDate?: string;
  /** INR-per-USD rate snapshotted at purchase. Null on INR/pre-snapshot orders.
   *  Needed to re-render a USD order at the rate it was actually charged at. */
  exchangeRate?: number | null;

  /** Carrier tracking number. */
  trackingReference?: string;
  /** Courier partner id (resolve via lib/couriers). */
  courier?: string | null;
  estimatedDelivery?: string;
  actualDelivery?: string;
  /** Ordered status transitions — the source for an order timeline. */
  statusHistory?: OrderStatusEvent[];

  /** Cancellation / return / refund state. */
  cancelReason?: string | null;
  returnRequest?: {
    reason?: string;
    status?: 'Requested' | 'Approved' | 'Rejected';
    requestedAt?: string;
    decidedAt?: string;
    note?: string;
  } | null;
  refundStatus?: 'INITIATED' | 'PROCESSED' | 'FAILED' | 'MANUAL' | 'NONE' | null;
  refundAmount?: number | null;
}

/** One entry in an order's status timeline. */
export interface OrderStatusEvent {
  status?: string;
  timestamp?: string;
  note?: string;
  updatedBy?: string;
}

export interface CreateOrderData {
  shippingAddress: {
    fullName: string;
    phone: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  paymentMethod: string;
  paymentId?: string;
  shippingCost?: number;
  tax?: number;
  discount?: number;
}

export interface OrderResponse {
  success: boolean;
  message?: string;
  data?: Order;
  error?: string;
}

export interface OrdersResponse {
  success: boolean;
  data?: Order[];
  error?: string;
}

export interface CreateOrderParams {
  shippingAddress: {
    street: string;
    addressLine2?: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    phone: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  paymentMethod: string;
  paymentId?: string;
  // Razorpay signature payload — when present, the server verifies the
  // HMAC signature inline during order creation (lets the client skip
  // the separate /payments/razorpay/verify round trip).
  /**
   * Set when a free-shipping offer applied to this order.
   *
   * The web sends this (frontend CreateOrderParams) and mobile did not, so an
   * order that qualified for free shipping was created without saying so —
   * the cart showed the customer a zeroed shipping line the order itself never
   * recorded.
   */
  freeShipping?: boolean;
  razorpayOrderId?: string;
  razorpaySignature?: string;
  shippingCost?: number;
  tax?: number;
  discount?: number;
  couponCode?: string;
  bagTypeId?: string;
  currency?: string;
}

class OrderService {
  async createOrder(params: CreateOrderParams): Promise<OrderResponse> {
    try {
      const response = await axios.post('/orders', params);
      return response.data;
    } catch (error: any) {
      const apiError = error?.response?.data;
      throw new Error(apiError?.detail || apiError?.error || 'Failed to create order');
    }
  }

  async getUserOrders(): Promise<OrdersResponse> {
    try {
      const response = await axios.get('/orders');
      return response.data;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch orders');
    }
  }

  async getOrderById(orderId: string): Promise<OrderResponse> {
    try {
      const response = await axios.get(`/orders/${orderId}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch order details');
    }
  }

  /**
   * Customer: cancel an order before it is dispatched.
   *
   * Same endpoint and payload as the web (frontend orderService.cancelOrder).
   * The app carried `cancelReason`, `refundStatus` and `refundAmount` on the
   * Order type but had no way to reach this route, so a customer could place
   * an order from the phone and then had to use the website to cancel it.
   */
  async cancelOrder(
    orderId: string,
    reason?: string,
  ): Promise<{ success: boolean; data: Order; message?: string }> {
    try {
      const response = await axios.post(`/orders/${orderId}/cancel`, { reason });
      return response.data;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to cancel order');
    }
  }

  /** Customer: request a return on a delivered order (an admin approves it). */
  async requestReturn(
    orderId: string,
    reason: string,
  ): Promise<{ success: boolean; data: Order; message?: string }> {
    try {
      const response = await axios.post(`/orders/${orderId}/return`, { reason });
      return response.data;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to submit return request');
    }
  }

  // Helper methods
  getStatusColor(status: string): string {
    const normalizedStatus = status.toLowerCase();
    switch (normalizedStatus) {
      case 'delivered':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'shipped':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'processing':
      case 'confirmed':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'order_created':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  }

  formatStatus(status: string): string {
    return status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase());
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }
}

export const orderService = new OrderService();
export default orderService;
