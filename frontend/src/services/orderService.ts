import axios from '@/lib/axios';

export interface OrderItem {
    id: string;
    productId: string;
    productName: string;
    productImage: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    /** GST rate charged on this line, frozen at checkout (per-product). */
    gstPercentage?: number | null;
    /** Unit price before the automatic offer (set only when an offer applied),
     *  so the order view can show how much the offer saved. */
    originalUnitPrice?: number;
    // Vendor-derived price (what the vendor is actually paid). Backend attaches
    // these for all vendor-panel responses; admin/customer price is never shown.
    vendorUnitPrice?: number;
    vendorTotalPrice?: number;
    vendorId: string;
    vendorName: string;
    sku: string;
    variantId?: string;
    size?: string;
    color?: string;
    colorHex?: string;
    shipmentId?: string;
    /** Shipping mode the customer chose for this line ('AIR' | 'SHIP'). */
    transportType?: 'AIR' | 'SHIP' | null;
    /** Courier partner id the customer chose (see lib/couriers). */
    courier?: string | null;
    /** Full logistics snapshot frozen at order time (see backend OrderItem.logistics). */
    logistics?: {
        transportType?: 'AIR' | 'SHIP' | null;
        courier?: string | null;
        totalWeightKg?: number | null;
        shippingCostInr?: number | null;
        deliveryDays?: number | null;
        dimensions?: { length: number; width: number; height: number; unit: 'CM' | 'IN' } | null;
        cbmPerUnit?: number | null;
        cbmTotal?: number | null;
    } | null;
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
        /** Overall order status (may differ from this vendor's shipment.status). */
        status?: string;
        customerName?: string;
        customerEmail?: string;
        customerPhone?: string;
        totalAmount: number;
        subtotal?: number;
        shippingCost?: number;
        tax?: number;
        discount?: number;
        /** Currency the buyer was actually charged in — 'INR' on .in, 'USD' on .com. */
        currency?: 'INR' | 'USD';
        /** INR-per-USD rate snapshotted at purchase. Null on INR/pre-snapshot orders. */
        exchangeRate?: number | null;
        paymentStatus?: string;
        paymentMethod?: string;
        paymentId?: string;
        createdAt: string;
        orderDate?: string;
        shippingAddress?: any;
        invoiceNo?: string;
        trackingReference?: string;
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
    /** GST split (display) — total stays `tax`. Intrastate: cgst+sgst; interstate: igst. */
    cgstAmount?: number;
    sgstAmount?: number;
    igstAmount?: number;
    taxType?: 'INTRASTATE' | 'INTERSTATE' | null;
    discount: number;
    /** Currency the buyer was actually charged in — 'INR' on .in, 'USD' on .com. */
    currency?: 'INR' | 'USD';
    /** INR-per-USD rate snapshotted at purchase. Null on INR/pre-snapshot orders. */
    exchangeRate?: number | null;
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
    /** Courier partner id chosen at ship-to-customer (resolve via lib/couriers). */
    courier?: string | null;
    /** Cancel/return/refund state. */
    cancelReason?: string | null;
    returnRequest?: { reason?: string; status?: 'Requested' | 'Approved' | 'Rejected'; requestedAt?: string; decidedAt?: string; note?: string } | null;
    refundStatus?: 'INITIATED' | 'PROCESSED' | 'FAILED' | 'MANUAL' | 'NONE' | null;
    refundId?: string | null;
    refundAmount?: number | null;
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
    /** Vendor warehouse/factory origin (city/state) — "processing" place. */
    vendorLocation?: { city?: string | null; state?: string | null } | null;
    /** Admin hub the order routed through (city/state) — "shipped" place. */
    hubLocation?: { city?: string | null; state?: string | null } | null;
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
    // Razorpay signature payload — when present, the server verifies the
    // HMAC signature inline during order creation (lets the client skip
    // the separate /payments/razorpay/verify round trip).
    razorpayOrderId?: string;
    razorpaySignature?: string;
    shippingCost?: number;
    tax?: number;
    discount?: number;
    freeShipping?: boolean;
    /** Coupon code, if one was applied. The server re-validates it and derives the
     *  discount itself — the client's discount figure is advisory only. */
    couponCode?: string;
    currency?: string;
}

class OrderService {
    // Create new order
    async createOrder(params: CreateOrderParams): Promise<{ success: boolean; data: Order; message?: string }> {
        try {
            const response = await axios.post('/orders', params);
            return response.data;
        } catch (error: any) {
            // Prefer the backend's actual error (e.g. transaction timeout, stock issue)
            // over the axios "Request failed with status code 500" message.
            const apiError = error?.response?.data;
            const message = apiError?.detail || apiError?.error || error.message || 'Failed to create order';
            throw new Error(message);
        }
    }

    // Pre-payment fulfilment check — runs the same courier/stock/shipping
    // validation the server enforces on createOrder, BEFORE the payment gateway
    // opens, so the customer is never charged for a cart that can't be placed.
    // Throws with the server's user-facing message when the cart is not placeable.
    async validateCheckout(currency: string): Promise<{ success: boolean }> {
        try {
            const response = await axios.post('/orders/validate-checkout', { currency });
            return response.data;
        } catch (error: any) {
            const apiError = error?.response?.data;
            const message = apiError?.error || error.message || 'Your cart could not be validated.';
            throw new Error(message);
        }
    }

    // Get user orders
    async getUserOrders(): Promise<{ success: boolean; data: Order[] }> {
        try {
            const response = await axios.get('/orders');
            return response.data;
        } catch (error: any) {
            throw new Error(error.message || 'Failed to fetch orders');
        }
    }

    // Get single order
    async getOrderById(id: string): Promise<{ success: boolean; data: Order }> {
        try {
            const response = await axios.get(`/orders/${id}`);
            return response.data;
        } catch (error: any) {
            throw new Error(error.message || 'Failed to fetch order');
        }
    }

    // Customer: cancel own pre-dispatch order (auto-refund for prepaid).
    async cancelOrder(id: string, reason?: string): Promise<{ success: boolean; data: Order; message?: string }> {
        try {
            const response = await axios.post(`/orders/${id}/cancel`, { reason });
            return response.data;
        } catch (error: any) {
            throw new Error(error.message || 'Failed to cancel order');
        }
    }

    // Customer: request a return on a delivered order (admin approves).
    async requestReturn(id: string, reason: string): Promise<{ success: boolean; data: Order; message?: string }> {
        try {
            const response = await axios.post(`/orders/${id}/return`, { reason });
            return response.data;
        } catch (error: any) {
            throw new Error(error.message || 'Failed to submit return request');
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
            throw new Error(error.message || 'Failed to fetch vendor orders');
        }
    }

    async getVendorOrderById(id: string): Promise<{ success: boolean; data: VendorShipment }> {
        try {
            const response = await axios.get(`/orders/vendor/${id}`);
            return response.data;
        } catch (error: any) {
            throw new Error(error.message || 'Failed to fetch vendor order');
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
            throw new Error(error.message || 'Failed to update vendor order status');
        }
    }

    async getVendorReviews(params?: { page?: number; limit?: number; rating?: number }): Promise<{
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
            if (params?.rating) query.set('rating', String(params.rating));
            const qs = query.toString();
            const response = await axios.get(`/orders/vendor/reviews${qs ? `?${qs}` : ''}`);
            return response.data;
        } catch (error: any) {
            throw new Error(error.message || 'Failed to fetch vendor reviews');
        }
    }

    async reshipVendorOrder(id: string): Promise<{ success: boolean; data: VendorShipment; message?: string }> {
        try {
            const response = await axios.post(`/orders/vendor/${id}/reship`, {});
            return response.data;
        } catch (error: any) {
            throw new Error(error.message || 'Failed to create reship');
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
            throw new Error(error.message || 'Failed to fetch admin orders');
        }
    }

    async getAdminOrderById(id: string): Promise<{ success: boolean; data: Order }> {
        try {
            const response = await axios.get(`/orders/admin/${id}`);
            return response.data;
        } catch (error: any) {
            throw new Error(error.message || 'Failed to fetch admin order');
        }
    }

    async updateAdminOrderStatus(
        id: string,
        status: string,
        assignedHubId?: string,
        extra?: { courier?: string; trackingReference?: string; cancelReason?: string },
    ): Promise<{ success: boolean; data: Order }> {
        try {
            const response = await axios.put(`/orders/admin/${id}/status`, { status, assignedHubId, ...(extra || {}) });
            return response.data;
        } catch (error: any) {
            throw new Error(error.message || 'Failed to update admin order status');
        }
    }

    // Admin: cancel the whole order (any pre-shipment stage). Cancels settlements
    // and auto-refunds the customer if paid. Works from both the vendor-to-hub and
    // hub-to-customer pages (accepts either page's update_status permission).
    async cancelAdminOrder(
        id: string,
        cancelReason: string,
    ): Promise<{ success: boolean; data: Order }> {
        try {
            const response = await axios.put(`/orders/admin/${id}/cancel`, { cancelReason });
            return response.data;
        } catch (error: any) {
            throw new Error(error.message || 'Failed to cancel order');
        }
    }

    // Admin: approve/reject a customer return request (approve → RETURNED + refund).
    async decideReturn(id: string, decision: 'approve' | 'reject', note?: string): Promise<{ success: boolean; data: Order; message?: string }> {
        try {
            const response = await axios.post(`/orders/admin/${id}/return-decision`, { decision, note });
            return response.data;
        } catch (error: any) {
            throw new Error(error.message || 'Failed to process return decision');
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
            throw new Error(error.message || 'Failed to fetch admin shipments');
        }
    }

    async getAdminShipmentById(id: string): Promise<{ success: boolean; data: VendorShipment }> {
        try {
            const response = await axios.get(`/orders/admin/shipments/${id}`);
            return response.data;
        } catch (error: any) {
            throw new Error(error.message || 'Failed to fetch admin shipment');
        }
    }

    async updateAdminShipmentStatus(id: string, status: string, assignedHubId?: string): Promise<{ success: boolean; data: VendorShipment }> {
        try {
            const response = await axios.put(`/orders/admin/shipments/${id}/status`, { status, assignedHubId });
            return response.data;
        } catch (error: any) {
            throw new Error(error.message || 'Failed to update admin shipment status');
        }
    }
}

export const orderService = new OrderService();
export default orderService;
