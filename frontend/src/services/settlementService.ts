import axios from "@/lib/axios";

export interface SettlementCustomerReview {
    id: string;
    productName: string;
    rating: number;
    comment: string;
    images: string[];
    createdAt: string;
}

export interface SettlementReviewContext {
    settlement: {
        id: string;
        settlementNumber: string;
        vendorId: string;
        vendorName: string;
        orderId: string;
        orderDisplayId: string;
        customerName: string;
        status: string;
    };
    shipmentId: string | null;
    vendorAcceptedAt: string | null;
    acceptanceMins: number | null;
    existingReview: {
        rating: number | null;
        reviewComments: string | null;
        qualityCheckNotes: string | null;
        approved: boolean | null;
        reviewedAt: string | null;
    } | null;
    customerReviews: SettlementCustomerReview[];
}

export interface Settlement {
    id: string;
    settlementNumber: string;
    vendorId: string;
    vendorName: string;
    orderId: string;
    billingNumber: string;
    period: string;
    /** Vendor's goods value before their GST. Null on rows created before the split existed. */
    baseAmount?: number | null;
    /** Vendor's GST on baseAmount. 0 for unregistered vendors (no GSTIN). */
    taxAmount?: number | null;
    /** Rate applied — null when the settlement spans mixed HSN rates. */
    gstPercentage?: number | null;
    /** GROSS payable to the vendor = baseAmount + taxAmount. */
    amount: number;
    dueDate: string | null;
    status: "Pending" | "Processing" | "Paid" | "Failed" | "Cancelled";
    paymentDate?: string;
    transactionId?: string;
    createdAt?: string;
    order?: {
        status: string;
        orderId: string;
    };
    vendor?: {
        companyName?: string | null;
        /** Vendor's GST registration number. Null for unregistered vendors. */
        gstNumber?: string | null;
        businessAddress?: string | null;
        addressLine2?: string | null;
        addressLine3?: string | null;
        landmark?: string | null;
        businessCity?: string | null;
        businessState?: string | null;
        businessZipCode?: string | null;
        businessCountry?: string | null;
        bankDetails?: { id: string; bankName: string } | null;
    };
    /**
     * Per-product payout breakdown for this settlement, all in INR at the vendor's own
     * price. Empty when the frozen snapshot predates this feature — see
     * `lineItemsAvailable`.
     */
    lineItems?: SettlementLineItem[];
    /** True when every line has a frozen payout snapshot; false for legacy settlements. */
    lineItemsAvailable?: boolean;
}

export interface SettlementLineItem {
    id: string;
    productName: string;
    productImage?: string | null;
    sku: string;
    size?: string | null;
    color?: string | null;
    quantity: number;
    /** Vendor's own unit price (INR). */
    unitPrice: number | null;
    /** unitPrice x quantity, before GST (INR). */
    taxableValue: number | null;
    /** GST rate applied to this line. */
    gstRate: number | null;
    /** GST on taxableValue (INR). */
    gstAmount: number | null;
    /** taxableValue + gstAmount (INR). */
    lineTotal: number | null;
}

export const settlementService = {
    // Admin methods
    getAllSettlements: async () => {
        try {
            const response = await axios.get('/settlements/admin');
            return response.data;
        } catch (error: any) {
            throw error.data || { success: false, error: 'Failed to fetch settlements' };
        }
    },

    getSettlementById: async (id: string) => {
        try {
            const response = await axios.get(`/settlements/admin/${id}`);
            return response.data;
        } catch (error: any) {
            throw error.data || { success: false, error: 'Failed to fetch settlement details' };
        }
    },

    // Context for the vendor-delivery review shown when a settlement is settled:
    // the vendor's shipment id + accept time, any existing review, and the
    // customer's product reviews for this order.
    getReviewContext: async (id: string): Promise<{ success: boolean; data: SettlementReviewContext }> => {
        try {
            const response = await axios.get(`/settlements/admin/${id}/review-context`);
            return response.data;
        } catch (error: any) {
            throw error.data || { success: false, error: 'Failed to load review context' };
        }
    },

    updateSettlementDueDate: async (id: string, dueDate: string) => {
        try {
            const response = await axios.put(`/settlements/admin/${id}/due-date`, { dueDate });
            return response.data;
        } catch (error: any) {
            throw error.data || { success: false, error: 'Failed to update due date' };
        }
    },

    updateSettlementStatus: async (id: string, status: string, transactionId?: string) => {
        try {
            const response = await axios.put(`/settlements/admin/${id}/status`, { status, transactionId });
            return response.data;
        } catch (error: any) {
            throw error.data || { success: false, error: 'Failed to update settlement status' };
        }
    },

    // Vendor methods
    getVendorSettlements: async () => {
        try {
            const response = await axios.get('/settlements/vendor');
            return response.data;
        } catch (error: any) {
            throw error.data || { success: false, error: 'Failed to fetch vendor settlements' };
        }
    }
};
