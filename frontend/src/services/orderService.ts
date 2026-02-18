import axios from '@/lib/axios';

export interface OrderItem {
    id: string;
    productId: string;
    productName: string;
    productImage: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    // Add other fields as needed
}

export interface Order {
    id: string;
    orderId: string;
    status: string;
    totalAmount: number;
    subtotal: number;
    shippingCost: number;
    tax: number;
    discount: number;
    items: OrderItem[];
    createdAt: string;
    shippingAddress: any; // Define precise type if possible
    paymentMethod: string;
    paymentStatus: string;
    customerEmail: string;
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
}

class OrderService {
    // Create new order
    async createOrder(params: CreateOrderParams): Promise<{ success: boolean; data: Order; message?: string }> {
        try {
            const response = await axios.post('/orders', params);
            return response.data;
        } catch (error: any) {
            throw new Error(error.response?.data?.error || 'Failed to create order');
        }
    }

    // Get user orders
    async getUserOrders(): Promise<{ success: boolean; data: Order[] }> {
        try {
            const response = await axios.get('/orders');
            return response.data;
        } catch (error: any) {
            throw new Error(error.response?.data?.error || 'Failed to fetch orders');
        }
    }

    // Get single order
    async getOrderById(id: string): Promise<{ success: boolean; data: Order }> {
        try {
            const response = await axios.get(`/orders/${id}`);
            return response.data;
        } catch (error: any) {
            throw new Error(error.response?.data?.error || 'Failed to fetch order');
        }
    }
}

export const orderService = new OrderService();
export default orderService;
