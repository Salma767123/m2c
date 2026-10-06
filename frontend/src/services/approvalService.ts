import axios from '@/lib/axios';

export type ApprovalModule = 'coupon' | 'offer' | 'settlement' | 'credit_points';

export interface ApprovalItem {
  module: ApprovalModule;
  moduleLabel: string;
  id: string;
  title: string;
  subtitle?: string;
  submittedByName?: string | null;
  createdAt: string;
}

class ApprovalService {
  async listPending(module?: ApprovalModule) {
    const res = await axios.get('/approvals/pending', { params: module ? { module } : undefined });
    return res.data as { success: boolean; data: ApprovalItem[]; count: number; modules: ApprovalModule[] };
  }
  async count() {
    const res = await axios.get('/approvals/count');
    return res.data as { success: boolean; count: number };
  }
  async approve(module: ApprovalModule, id: string) {
    const res = await axios.post(`/approvals/${module}/${id}/approve`, {});
    return res.data as { success: boolean; message: string };
  }
  async reject(module: ApprovalModule, id: string, reason: string) {
    const res = await axios.post(`/approvals/${module}/${id}/reject`, { reason });
    return res.data as { success: boolean; message: string };
  }
}

export const approvalService = new ApprovalService();
export default approvalService;

export const MODULE_STYLE: Record<ApprovalModule, string> = {
  coupon: 'bg-purple-50 text-purple-700',
  offer: 'bg-pink-50 text-pink-700',
  settlement: 'bg-emerald-50 text-emerald-700',
  credit_points: 'bg-amber-50 text-amber-700',
};
