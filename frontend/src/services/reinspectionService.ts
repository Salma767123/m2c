import axios from '@/lib/axios';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface AuditLogEntry {
  id: string;
  entityType: 'FACTORY_INSPECTION' | 'PRODUCT_INSPECTION';
  entityId: string;
  action: string;
  fromStatus: string | null;
  toStatus: string | null;
  performedById: string;
  performedByType: 'ADMIN' | 'QC_CHECKER';
  performedByName: string | null;
  rejectionReason: string | null;
  remarks: string | null;
  notes: string | null;
  locationDetails: string | null;
  attachments: string[];
  inspectionData: Record<string, unknown> | null;
  cycleNumber: number;
  parentLogId: string | null;
  createdAt: string;
}

export interface FactoryInspectionReview {
  id: string;
  clientName: string;
  scheduledDate: string;
  priority: string;
  status: string;
  result: string | null;
  score: number | null;
  notes: string | null;
  cycleNumber: number;
  parentInspectionId: string | null;
  submittedAt: string | null;
  completedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  vendor: { id: string; companyName: string; businessCity?: string; businessState?: string };
  checker: { id: string; name: string; email: string };
}

export interface ProductInspectionReview {
  id: string;
  name: string;
  baseSku: string;
  approvalStatus: string;
  rejectionReason: string | null;
  rejectionRemarks: string | null;
  inspectionCycleNumber: number;
  updatedAt: string;
  createdAt: string;
  vendor: { id: string; companyName: string };
  assignedQc: { id: string; name: string; email: string } | null;
}

export interface ReviewDashboardStats {
  factory: {
    pendingReview: number;
    submitted: number;
    underReview: number;
    rejected: number;
    reinspection: number;
  };
  product: {
    pendingReview: number;
    rejected: number;
    underReview: number;
    reinspection: number;
  };
  totalPendingReview: number;
}

export interface AdminReviewPayload {
  decision: 'APPROVE' | 'FINAL_REJECT' | 'RAISE_REINSPECTION';
  reason?: string;
  remarks?: string;
  notes?: string;
  newCheckerId?: string;
  scheduledDate?: string;
  scheduledTime?: string;
}

export interface InspectionChainItem {
  id: string;
  status: string;
  result: string | null;
  cycleNumber: number;
  parentInspectionId: string | null;
  scheduledDate: string;
  submittedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  checker: { id: string; name: string };
}

// ─── Service ────────────────────────────────────────────────────────────────

class ReinspectionService {
  // Get inspections pending admin review
  async getInspectionsForReview(params?: {
    page?: number;
    limit?: number;
    type?: 'factory' | 'product' | 'all';
    status?: string;
    search?: string;
  }) {
    const response = await axios.get('/reinspections', { params });
    return response.data as {
      success: boolean;
      factory: FactoryInspectionReview[];
      product: ProductInspectionReview[];
      pagination: {
        page: number;
        limit: number;
        factoryTotal?: number;
        productTotal?: number;
      };
    };
  }

  // Get dashboard stats
  async getStats() {
    const response = await axios.get('/reinspections/stats');
    return response.data as { success: boolean; stats: ReviewDashboardStats };
  }

  // Get audit trail for an entity
  async getAuditTrail(entityType: 'FACTORY_INSPECTION' | 'PRODUCT_INSPECTION', entityId: string) {
    const response = await axios.get(`/reinspections/${entityType}/${entityId}/audit-trail`);
    return response.data as {
      success: boolean;
      logs: AuditLogEntry[];
      inspectionChain: InspectionChainItem[];
    };
  }

  // Admin review a factory inspection
  async reviewFactoryInspection(inspectionId: string, payload: AdminReviewPayload) {
    const response = await axios.post(`/reinspections/factory/${inspectionId}/review`, payload);
    return response.data;
  }

  // Admin review a product inspection
  async reviewProductInspection(productId: string, payload: AdminReviewPayload) {
    const response = await axios.post(`/reinspections/product/${productId}/review`, payload);
    return response.data;
  }
}

export const reinspectionService = new ReinspectionService();
export default reinspectionService;
