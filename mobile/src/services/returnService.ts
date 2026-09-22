/**
 * Returns & replacements — the customer half of
 * frontend/src/services/returnService.ts.
 *
 * Only the four customer endpoints are ported. Everything under /returns/admin
 * (decisions, damaged stock, return-to-vendor) belongs to the dashboard, which
 * has no mobile client.
 *
 * This is an INR-region feature: the web gates the whole section behind
 * `getRegion() === 'IN'`, and the mobile screen does the same.
 */
import axios from '@/lib/axios';

/** Reason catalog — mirrors the backend's returnController REASONS. */
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
export type RefundMethod = 'ORIGINAL' | 'WALLET';
export type ReplacementMethod = 'CREDIT' | 'ITEM';

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
  replacementMethod?: ReplacementMethod | null;
  refundAmount?: number | null;
  refundId?: string | null;
  refundStatus?: string | null;
  paymentReference?: string | null;
  paymentMethodLabel?: string | null;
  replacementValue?: number | null;
  status: string;
  statusHistory?: ReturnStatusEntry[];
  adminNote?: string | null;
  rejectionReason?: string | null;
  decidedByName?: string | null;
  decidedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateReturnPayload {
  orderId: string;
  orderItemId?: string;
  reason: string;
  reasonNote?: string;
  /** base64 data URIs */
  evidenceImages?: string[];
  resolution: ReturnResolution;
  refundMethod?: RefundMethod;
  replacementMethod?: ReplacementMethod;
  confirmed?: boolean;
}

/**
 * Status tints. The web stores Tailwind class names, which mean nothing to a
 * StyleSheet — the same eleven states, resolved to hex.
 */
export const RETURN_STATUS_STYLES: Record<
  string,
  { bg: string; text: string; dot: string }
> = {
  'Pending Review': { bg: '#fffbeb', text: '#b45309', dot: '#f59e0b' },
  'Under Review': { bg: '#eff6ff', text: '#1d4ed8', dot: '#3b82f6' },
  Approved: { bg: '#ecfdf5', text: '#047857', dot: '#10b981' },
  Rejected: { bg: '#fef2f2', text: '#dc2626', dot: '#ef4444' },
  'Refund Processing': { bg: '#eef2ff', text: '#4338ca', dot: '#6366f1' },
  'Refund Completed': { bg: '#ecfdf5', text: '#047857', dot: '#059669' },
  'Replacement Approved': { bg: '#ecfdf5', text: '#047857', dot: '#10b981' },
  'Replacement Pending': { bg: '#eef2ff', text: '#4338ca', dot: '#6366f1' },
  'Replacement Completed': { bg: '#ecfdf5', text: '#047857', dot: '#059669' },
  Cancelled: { bg: '#f1f5f9', text: '#475569', dot: '#94a3b8' },
};

export const returnStatusStyle = (status: string) =>
  RETURN_STATUS_STYLES[status] || { bg: '#f1f5f9', text: '#475569', dot: '#94a3b8' };

// Surface the backend's own message rather than a generic axios one.
function extractError(error: any, fallback: string): Error {
  return new Error(
    error?.response?.data?.error ||
      error?.response?.data?.message ||
      error?.message ||
      fallback,
  );
}

class ReturnService {
  async createReturn(
    payload: CreateReturnPayload,
  ): Promise<{ success: boolean; message: string; data: ReturnRequest }> {
    try {
      const res = await axios.post('/returns', payload);
      return res.data;
    } catch (error: any) {
      throw extractError(error, 'Could not submit that return request');
    }
  }

  async getMyReturns(): Promise<{ success: boolean; data: ReturnRequest[] }> {
    try {
      const res = await axios.get('/returns/mine');
      return res.data;
    } catch (error: any) {
      throw extractError(error, 'Failed to load your returns');
    }
  }

  async getMyReturn(id: string): Promise<{ success: boolean; data: ReturnRequest }> {
    try {
      const res = await axios.get(`/returns/mine/${id}`);
      return res.data;
    } catch (error: any) {
      throw extractError(error, 'Failed to load that return');
    }
  }

  async cancelMyReturn(
    id: string,
  ): Promise<{ success: boolean; message: string; data: ReturnRequest }> {
    try {
      const res = await axios.post(`/returns/mine/${id}/cancel`);
      return res.data;
    } catch (error: any) {
      throw extractError(error, 'Could not cancel that return');
    }
  }
}

export const returnService = new ReturnService();
export default returnService;
