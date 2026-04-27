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
    shipmentId?: string;
}

export interface AdminReviewData {
    rating?: number | null;
    reviewComments?: string | null;
    qualityCheckNotes?: string | null;
    approved: boolean;
    rejectionReason?: string | null;
    returnToVendor?: boolean;
    reviewedAt?: string | null;
}

export interface VendorShipment {
    id: string;
    shipmentId: string;
    orderId: string;
    vendorId: string;
    vendorName: string;
    status: string;
    vendorCarrier?: string;
    vendorTrackingId?: string;
    vendorShippedAt?: string;
    assignedHubId?: string;
    hub?: {
        id: string;
        name: string;
        address?: string;
        city: string;
        state: string;
        zipCode?: string;
        phone?: string;
        email?: string;
    };
    items: OrderItem[];
    order?: {
        id: string;
        orderId: string;
        customerName?: string;
        customerEmail?: string;
        customerPhone?: string;
        totalAmount: number;
        subtotal?: number;
        shippingCost?: number;
        tax?: number;
        discount?: number;
        paymentStatus?: string;
        paymentMethod?: string;
        paymentId?: string;
        createdAt: string;
        orderDate?: string;
        shippingAddress?: any;
        invoiceNo?: string;
        bagTypeName?: string;
        bagTypePrice?: number;
    };
    statusHistory?: any[];
    adminReview?: AdminReviewData | null;
    createdAt: string;
    updatedAt: string;
}

export interface Order {
    id: string;
    orderId: string;
    invoiceNo?: string;
    status: string;
    totalAmount: number;
    subtotal: number;
    shippingCost: number;
    tax: number;
    discount: number;
    bagTypeId?: string;
    bagTypeName?: string;
    bagTypePrice?: number;
    items: OrderItem[];
    shipments?: VendorShipment[];
    createdAt: string;
    orderDate?: string;
    shippingAddress: any;
    paymentMethod?: string;
    paymentId?: string;
    paymentStatus?: string;
    customerEmail: string;
    customerName?: string;
    customerPhone?: string;
    trackingReference?: string;
    // DEPRECATED: These now live on VendorShipment
    vendorCarrier?: string;
    vendorTrackingId?: string;
    vendorShippedAt?: string;
    assignedHubId?: string;
    hub?: any;
    estimatedDelivery?: string;
    actualDelivery?: string;
    statusHistory?: any[];
    adminReview?: AdminReviewData | null;
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
    bagTypeId?: string;
}

class OrderService {
    // Create new order
    async createOrder(params: CreateOrderParams): Promise<{ success: boolean; data: Order; message?: string }> {
        try {
            const response = await axios.post('/orders', params);
            return response.data;
        } catch (error: any) {
            throw new Error(error.response?.data?.error || error.response?.data?.message || 'Failed to create order');
        }
    }

    // Get user orders
    async getUserOrders(): Promise<{ success: boolean; data: Order[] }> {
        try {
            const response = await axios.get('/orders');
            return response.data;
        } catch (error: any) {
            throw new Error(error.response?.data?.error || error.response?.data?.message || 'Failed to fetch orders');
        }
    }

    // Get single order
    async getOrderById(id: string): Promise<{ success: boolean; data: Order }> {
        try {
            const response = await axios.get(`/orders/${id}`);
            return response.data;
        } catch (error: any) {
            throw new Error(error.response?.data?.error || error.response?.data?.message || 'Failed to fetch order');
        }
    }

    // ============================================
    // VENDOR ACTIONS (operate on VendorShipments)
    // ============================================
    async getVendorOrders(): Promise<{ success: boolean; data: VendorShipment[] }> {
        try {
            const response = await axios.get('/orders/vendor');
            return response.data;
        } catch (error: any) {
            throw new Error(error.response?.data?.error || error.response?.data?.message || 'Failed to fetch vendor orders');
        }
    }

    async getVendorOrderById(id: string): Promise<{ success: boolean; data: VendorShipment }> {
        try {
            const response = await axios.get(`/orders/vendor/${id}`);
            return response.data;
        } catch (error: any) {
            throw new Error(error.response?.data?.error || error.response?.data?.message || 'Failed to fetch vendor order');
        }
    }

    async updateVendorOrderStatus(
        id: string,
        status: string,
        shipment?: { carrier: string; trackingId: string }
    ): Promise<{ success: boolean; data: VendorShipment }> {
        try {
            const body: Record<string, unknown> = { status };
            if (shipment) {
                body.carrier = shipment.carrier;
                body.trackingId = shipment.trackingId;
            }
            const response = await axios.put(`/orders/vendor/${id}/status`, body);
            return response.data;
        } catch (error: any) {
            throw new Error(error.response?.data?.error || error.response?.data?.message || 'Failed to update vendor order status');
        }
    }

    async getVendorReviews(params?: { page?: number; limit?: number }): Promise<{
        success: boolean;
        data: {
            overall: {
                rating: number | null;
                ratingCount: number;
                totalReviews: number;
                distribution: Record<'1' | '2' | '3' | '4' | '5', number>;
            };
            reviews: Array<{
                id: string;
                rating: number | null;
                reviewComments: string | null;
                qualityCheckNotes: string | null;
                approved: boolean;
                rejectionReason: string | null;
                returnToVendor: boolean;
                reviewedAt: string | null;
                createdAt: string;
                shipment?: { id: string; shipmentId: string; status: string } | null;
                order: {
                    id: string;
                    orderId: string;
                    status: string;
                    totalAmount: number;
                    items: Array<{ productName: string; sku: string; quantity: number }>;
                };
            }>;
        };
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }> {
        try {
            const query = new URLSearchParams();
            if (params?.page) query.set('page', String(params.page));
            if (params?.limit) query.set('limit', String(params.limit));
            const qs = query.toString();
            const response = await axios.get(`/orders/vendor/reviews${qs ? `?${qs}` : ''}`);
            return response.data;
        } catch (error: any) {
            throw new Error(error.response?.data?.error || error.response?.data?.message || 'Failed to fetch vendor reviews');
        }
    }

    async reshipVendorOrder(id: string): Promise<{ success: boolean; data: VendorShipment; message?: string }> {
        try {
            const response = await axios.post(`/orders/vendor/${id}/reship`, {});
            return response.data;
        } catch (error: any) {
            throw new Error(error.response?.data?.error || error.response?.data?.message || 'Failed to create reship');
        }
    }

    // ============================================
    // ADMIN ACTIONS — Orders (hub-to-customer)
    // ============================================
    async getAdminOrders(): Promise<{ success: boolean; data: Order[] }> {
        try {
            const response = await axios.get('/orders/admin');
            return response.data;
        } catch (error: any) {
            throw new Error(error.response?.data?.error || error.response?.data?.message || 'Failed to fetch admin orders');
        }
    }

    async getAdminOrderById(id: string): Promise<{ success: boolean; data: Order }> {
        try {
            const response = await axios.get(`/orders/admin/${id}`);
            return response.data;
        } catch (error: any) {
            throw new Error(error.response?.data?.error || error.response?.data?.message || 'Failed to fetch admin order');
        }
    }

    async updateAdminOrderStatus(id: string, status: string, assignedHubId?: string): Promise<{ success: boolean; data: Order }> {
        try {
            const response = await axios.put(`/orders/admin/${id}/status`, { status, assignedHubId });
            return response.data;
        } catch (error: any) {
            throw new Error(error.response?.data?.error || error.response?.data?.message || 'Failed to update admin order status');
        }
    }

    // ============================================
    // ADMIN ACTIONS — Shipments (vendor-to-hub)
    // ============================================
    async getAdminShipments(): Promise<{ success: boolean; data: VendorShipment[] }> {
        try {
            const response = await axios.get('/orders/admin/shipments');
            return response.data;
        } catch (error: any) {
            throw new Error(error.response?.data?.error || error.response?.data?.message || 'Failed to fetch admin shipments');
        }
    }

    async getAdminShipmentById(id: string): Promise<{ success: boolean; data: VendorShipment }> {
        try {
            const response = await axios.get(`/orders/admin/shipments/${id}`);
            return response.data;
        } catch (error: any) {
            throw new Error(error.response?.data?.error || error.response?.data?.message || 'Failed to fetch admin shipment');
        }
    }

    async updateAdminShipmentStatus(id: string, status: string, assignedHubId?: string): Promise<{ success: boolean; data: VendorShipment }> {
        try {
            const response = await axios.put(`/orders/admin/shipments/${id}/status`, { status, assignedHubId });
            return response.data;
        } catch (error: any) {
            throw new Error(error.response?.data?.error || error.response?.data?.message || 'Failed to update admin shipment status');
        }
    }
}

export const orderService = new OrderService();
export default orderService;
