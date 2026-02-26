import axios from "@/lib/axios";

export interface Settlement {
    id: string;
    settlementNumber: string;
    vendorId: string;
    vendorName: string;
    orderId: string;
    billingNumber: string;
    period: string;
    amount: number;
    dueDate: string;
    status: "Pending" | "Processing" | "Paid" | "Failed";
    paymentDate?: string;
    transactionId?: string;
    createdAt?: string;
}

export const settlementService = {
    // Admin methods
    getAllSettlements: async () => {
        try {
            const response = await axios.get('/settlements/admin');
            return response.data;
        } catch (error: any) {
            throw error.response?.data || { success: false, error: 'Failed to fetch settlements' };
        }
    },

    getSettlementById: async (id: string) => {
        try {
            const response = await axios.get(`/settlements/admin/${id}`);
            return response.data;
        } catch (error: any) {
            throw error.response?.data || { success: false, error: 'Failed to fetch settlement details' };
        }
    },

    updateSettlementStatus: async (id: string, status: string, transactionId?: string) => {
        try {
            const response = await axios.put(`/settlements/admin/${id}/status`, { status, transactionId });
            return response.data;
        } catch (error: any) {
            throw error.response?.data || { success: false, error: 'Failed to update settlement status' };
        }
    },

    // Vendor methods
    getVendorSettlements: async () => {
        try {
            const response = await axios.get('/settlements/vendor');
            return response.data;
        } catch (error: any) {
            throw error.response?.data || { success: false, error: 'Failed to fetch vendor settlements' };
        }
    }
};
