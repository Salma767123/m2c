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
    variantId?: string;
    size?: string;
    color?: string;
}

export interface Order {
    id: string;
    orderId: string;
    invoiceNo?: string;        // ← invoice number from InvoiceSettings
    status: string;
    totalAmount: number;
    subtotal: number;
    shippingCost: number;
    tax: number;
    discount: number;
    items: OrderItem[];
    createdAt: string;
    orderDate?: string;
    shippingAddress: any; // Define precise type if possible
    paymentMethod?: string;
    paymentId?: string;
    paymentStatus?: string;
    customerEmail: string;
    customerName?: string;
    customerPhone?: string;
    trackingReference?: string;
    assignedHubId?: string;
    hub?: any;
    estimatedDelivery?: string;
    actualDelivery?: string;
    statusHistory?: any[];
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
    freeShipping?: boolean;
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

    // ============================================
    // VENDOR ACTIONS
    // ============================================
    async getVendorOrders(): Promise<{ success: boolean; data: Order[] }> {
        try {
            const response = await axios.get('/orders/vendor');
            return response.data;
        } catch (error: any) {
            throw new Error(error.response?.data?.error || 'Failed to fetch vendor orders');
        }
    }

    async getVendorOrderById(id: string): Promise<{ success: boolean; data: Order }> {
        try {
            const response = await axios.get(`/orders/vendor/${id}`);
            return response.data;
        } catch (error: any) {
            throw new Error(error.response?.data?.error || 'Failed to fetch vendor order');
        }
    }

    async updateVendorOrderStatus(id: string, status: string): Promise<{ success: boolean; data: Order }> {
        try {
            const response = await axios.put(`/orders/vendor/${id}/status`, { status });
            return response.data;
        } catch (error: any) {
            throw new Error(error.response?.data?.error || 'Failed to update vendor order status');
        }
    }

    // ============================================
    // ADMIN ACTIONS
    // ============================================
    async getAdminOrders(): Promise<{ success: boolean; data: Order[] }> {
        try {
            const response = await axios.get('/orders/admin');
            return response.data;
        } catch (error: any) {
            throw new Error(error.response?.data?.error || 'Failed to fetch admin orders');
        }
    }

    async getAdminOrderById(id: string): Promise<{ success: boolean; data: Order }> {
        try {
            const response = await axios.get(`/orders/admin/${id}`);
            return response.data;
        } catch (error: any) {
            throw new Error(error.response?.data?.error || 'Failed to fetch admin order');
        }
    }

    async updateAdminOrderStatus(id: string, status: string, assignedHubId?: string): Promise<{ success: boolean; data: Order }> {
        try {
            const response = await axios.put(`/orders/admin/${id}/status`, { status, assignedHubId });
            return response.data;
        } catch (error: any) {
            throw new Error(error.response?.data?.error || 'Failed to update admin order status');
        }
    }
}

export const orderService = new OrderService();
export default orderService;
