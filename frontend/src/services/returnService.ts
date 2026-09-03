import axios from '@/lib/axios';

// ── Reason catalog (mirrors backend returnController REASONS) ────────────────
export const RETURN_REASONS: { code: string; label: string; requiresEvidence: boolean }[] = [
    { code: 'damaged', label: 'Damaged or defective', requiresEvidence: true },
    { code: 'wrong_item', label: 'Wrong item received', requiresEvidence: true },
    { code: 'not_as_described', label: 'Not as described', requiresEvidence: true },
    { code: 'size_fit', label: 'Size or fit issue', requiresEvidence: false },
    { code: 'quality', label: 'Quality not satisfactory', requiresEvidence: true },
    { code: 'other', label: 'Other', requiresEvidence: false },
];

export const reasonLabel = (code?: string) =>
    RETURN_REASONS.find((r) => r.code === code)?.label || code || '';

export type ReturnResolution = 'REFUND' | 'REPLACEMENT';
export type RefundMethod = 'ORIGINAL' | 'UPI';

export interface ReturnStatusEntry {
    status: string;
    note?: string;
    at: string;
    by?: string;
}

export interface ReturnRequest {
    id: string;
    returnId: string;
    orderId: string;
    orderCode: string;
    orderItemId?: string;
    customerId: string;
    customerName?: string;
    customerEmail?: string;
    customerPhone?: string;
    productId?: string;
    productName: string;
    productImage?: string;
    size?: string;
    color?: string;
    quantity: number;
    currency: string;
    itemAmount: number;
    reason: string;
    reasonNote?: string;
    evidenceImages: string[];
    resolution: ReturnResolution;
    refundMethod?: RefundMethod | null;
    upiId?: string | null;
    refundAmount?: number | null;
    refundId?: string | null;
    refundStatus?: string | null;
    paymentReference?: string | null;
    paymentMethodLabel?: string | null;
    replacementValue?: number | null;
    replacementEntitlementId?: string | null;
    status: string;
    statusHistory?: ReturnStatusEntry[];
    adminNote?: string | null;
    rejectionReason?: string | null;
    decidedByName?: string | null;
    decidedAt?: string | null;
    createdAt: string;
    updatedAt: string;
    // Admin-list / detail extras
    customerReturnCount?: number;
    customerHistory?: Array<Pick<ReturnRequest, 'id' | 'returnId' | 'productName' | 'resolution' | 'status' | 'createdAt'>>;
    order?: any;
}

export interface CreateReturnPayload {
    orderId: string;
    orderItemId?: string;
    reason: string;
    reasonNote?: string;
    evidenceImages?: string[]; // base64 data URIs
    resolution: ReturnResolution;
    refundMethod?: RefundMethod;
    upiId?: string;
    confirmed?: boolean;
}

class ReturnService {
    // ── Customer ──
    async createReturn(payload: CreateReturnPayload): Promise<{ success: boolean; message: string; data: ReturnRequest }> {
        const res = await axios.post('/returns', payload);
        return res.data;
    }
    async getMyReturns(): Promise<{ success: boolean; data: ReturnRequest[] }> {
        const res = await axios.get('/returns/mine');
        return res.data;
    }
    async getMyReturn(id: string): Promise<{ success: boolean; data: ReturnRequest }> {
        const res = await axios.get(`/returns/mine/${id}`);
        return res.data;
    }
    async cancelMyReturn(id: string): Promise<{ success: boolean; message: string; data: ReturnRequest }> {
        const res = await axios.post(`/returns/mine/${id}/cancel`);
        return res.data;
    }

    // ── Admin ──
    async getAllReturns(params?: { status?: string; resolution?: string; search?: string; page?: number; limit?: number }) {
        const res = await axios.get('/returns/admin', { params });
        return res.data as { success: boolean; data: ReturnRequest[]; pagination: { total: number; page: number; limit: number; totalPages: number } };
    }
    async getReturnAdmin(id: string): Promise<{ success: boolean; data: ReturnRequest }> {
        const res = await axios.get(`/returns/admin/${id}`);
        return res.data;
    }
    async decideReturn(id: string, action: 'approve' | 'reject' | 'under_review', body?: { rejectionReason?: string; adminNote?: string }) {
        const res = await axios.post(`/returns/admin/${id}/decision`, { action, ...body });
        return res.data as { success: boolean; message: string; data: ReturnRequest };
    }
    async advanceStatus(id: string, status: string, note?: string) {
        const res = await axios.post(`/returns/admin/${id}/status`, { status, note });
        return res.data as { success: boolean; message: string; data: ReturnRequest };
    }
}

// ── Shared status styling helpers ───────────────────────────────────────────
export const RETURN_STATUS_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
    'Pending Review': { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
    'Under Review': { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
    'Approved': { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
    'Rejected': { bg: 'bg-red-50', text: 'text-red-600', dot: 'bg-red-500' },
    'Refund Processing': { bg: 'bg-indigo-50', text: 'text-indigo-700', dot: 'bg-indigo-500' },
    'Refund Completed': { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-600' },
    'Replacement Approved': { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
    'Replacement Pending': { bg: 'bg-indigo-50', text: 'text-indigo-700', dot: 'bg-indigo-500' },
    'Replacement Completed': { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-600' },
    'Cancelled': { bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400' },
};

export const returnStatusStyle = (status: string) =>
    RETURN_STATUS_STYLES[status] || { bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400' };

export const returnService = new ReturnService();
export default returnService;
