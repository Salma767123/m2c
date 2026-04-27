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
  paymentStatus: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
  paymentMethod: string;
  paymentId?: string;
  status: 'ORDER_CREATED' | 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
  items: OrderItem[];
  createdAt: string;
  updatedAt: string;
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
  shippingCost?: number;
  tax?: number;
  discount?: number;
  couponCode?: string;
}

class OrderService {
  async createOrder(params: CreateOrderParams): Promise<OrderResponse> {
    try {
      const response = await axios.post('/orders', params);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to create order');
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
