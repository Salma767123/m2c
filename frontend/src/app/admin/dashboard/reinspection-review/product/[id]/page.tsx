'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import axios from '@/lib/axios';
import reinspectionService, { AuditLogEntry, AdminReviewPayload } from '@/services/reinspectionService';
import InspectionAuditTimeline from '@/components/AdminDashboard/ReInspection/InspectionAuditTimeline';
import AdminReviewModal from '@/components/AdminDashboard/ReInspection/AdminReviewModal';
import { Badge } from '@/components/UI/Badge';
import { Button } from '@/components/UI/Button';
import { showSuccessToast, showErrorToast } from '@/lib/toast-utils';
import {
  IconArrowLeft,
  IconLoader2,
  IconPackage,
  IconUser,
  IconCalendar,
  IconFileText,
  IconPhoto,
  IconClock,
  IconX,
  IconHistory,
} from '@tabler/icons-react';

interface ProductDetail {
  id: string;
  name: string;
  baseSku: string;
  basePrice: number;
  category: string;
  subCategory?: string;
  approvalStatus: string;
  rejectionReason: string | null;
  rejectionRemarks: string | null;
  rejectionNotes: string | null;
  inspectionCycleNumber: number;
  previousInspectionData: Array<{
    cycleNumber: number;
    data: Record<string, unknown>;
    rejectionReason?: string;
    reviewedAt?: string;
    reviewedBy?: string;
  }>;
  qcInspectionData: Record<string, unknown> | null;
  vendor: { id: string; companyName: string; email?: string };
  assignedQc: { id: string; name: string; email: string } | null;
  createdAt: string;
  updatedAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-gray-100 text-gray-800',
  QC_APPROVED: 'bg-green-100 text-green-800',
  UNDER_ADMIN_REVIEW: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  REINSPECTION: 'bg-amber-100 text-amber-800',
};

export default function ProductInspectionReviewPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params.id as string;

  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [checkers, setCheckers] = useState<{ id: string; name: string }[]>([]);
  const [activeHistoryTab, setActiveHistoryTab] = useState<number | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [productRes, auditRes] = await Promise.all([
        axios.get(`/products/admin/${productId}`),
        reinspectionService.getAuditTrail('PRODUCT_INSPECTION', productId),
      ]);

      setProduct(productRes.data.data || productRes.data.product || productRes.data);
      setAuditLogs(auditRes.logs);

      // Fetch checkers for reassignment
      try {
        const checkersRes = await axios.get('/qc-checkers', { params: { limit: 50, status: 'ACTIVE' } });
        setCheckers(
          (checkersRes.data.checkers || []).map((c: { id: string; name: string }) => ({
            id: c.id,
            name: c.name,
          }))
        );
      } catch {
        // Non-critical
      }
    } catch (error) {
      console.error('Error fetching product details:', error);
      showErrorToast('Error', 'Failed to load product details');
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleReview = async (payload: AdminReviewPayload) => {
    try {
      await reinspectionService.reviewProductInspection(productId, payload);
      showSuccessToast(
        'Review Submitted',
        payload.decision === 'APPROVE'
          ? 'Product inspection approved'
          : payload.decision === 'FINAL_REJECT'
          ? 'Product finally rejected'
          : 'Product re-inspection raised'
      );
      fetchData();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Review failed';
      showErrorToast('Review Failed', message);
      throw error;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <IconLoader2 size={32} className="animate-spin text-gray-400" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="text-center py-24 text-gray-500">
        <p>Product not found</p>
        <Button variant="outline" className="mt-4" onClick={() => router.back()}>
          <IconArrowLeft size={16} className="mr-1" /> Go Back
        </Button>
      </div>
    );
  }

  const canReview = product.approvalStatus === 'REJECTED';
  const qcData = product.qcInspectionData || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push('/admin/dashboard/reinspection-review')}>
          <IconArrowLeft size={16} />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">Product Inspection Review</h1>
          <p className="text-sm text-gray-500">{product.name} (SKU: {product.baseSku})</p>
        </div>
        {canReview && (
          <Button onClick={() => setShowReviewModal(true)} className="bg-blue-600 hover:bg-blue-700">
            Take Action
          </Button>
        )}
      </div>

      {/* Status & Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border p-4">
          <div className="text-xs text-gray-500 mb-2">Status</div>
          <div className="flex items-center gap-2">
            <Badge className={STATUS_COLORS[product.approvalStatus] || 'bg-gray-100 text-gray-800'}>
              {product.approvalStatus}
            </Badge>
            {product.inspectionCycleNumber > 1 && (
              <Badge className="bg-indigo-100 text-indigo-800">
                Cycle #{product.inspectionCycleNumber}
              </Badge>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border p-4">
          <div className="text-xs text-gray-500 mb-2 flex items-center gap-1">
            <IconUser size={12} /> QC Checker
          </div>
          {product.assignedQc ? (
            <>
              <div className="font-medium text-sm">{product.assignedQc.name}</div>
              <div className="text-xs text-gray-500">{product.assignedQc.email}</div>
            </>
          ) : (
            <div className="text-sm text-gray-400">Not assigned</div>
          )}
        </div>

        <div className="bg-white rounded-xl border p-4">
          <div className="text-xs text-gray-500 mb-2 flex items-center gap-1">
            <IconPackage size={12} /> Product Info
          </div>
          <div className="text-sm">
            <div>Vendor: <span className="font-medium">{product.vendor?.companyName || '—'}</span></div>
            <div>Category: <span className="font-medium">{product.category}</span></div>
            <div>Price: <span className="font-medium">&#8377;{product.basePrice}</span></div>
          </div>
        </div>
      </div>

      {/* Rejection Details */}
      {(product.rejectionReason || product.rejectionRemarks || product.rejectionNotes) && (
        <div className="bg-red-50 rounded-xl border border-red-200 p-5">
          <h2 className="text-sm font-semibold text-red-900 mb-3 flex items-center gap-2">
            <IconX size={16} /> Rejection Details
          </h2>
          <div className="space-y-2 text-sm">
            {product.rejectionReason && (
              <div>
                <span className="font-medium text-red-800">Reason:</span>
                <p className="text-red-700 mt-0.5">{product.rejectionReason}</p>
              </div>
            )}
            {product.rejectionRemarks && (
              <div>
                <span className="font-medium text-red-800">Remarks:</span>
                <p className="text-red-700 mt-0.5">{product.rejectionRemarks}</p>
              </div>
            )}
            {product.rejectionNotes && (
              <div>
                <span className="font-medium text-red-800">Notes:</span>
                <p className="text-red-700 mt-0.5">{product.rejectionNotes}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Current Inspection Data */}
      {product.qcInspectionData && (
        <div className="bg-white rounded-xl border p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <IconFileText size={16} /> Current Inspection Data
          </h2>
          <QCInspectionDataView data={qcData} />
        </div>
      )}

      {/* Previous Inspection Data (History) */}
      {product.previousInspectionData && product.previousInspectionData.length > 0 && (
        <div className="bg-white rounded-xl border p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <IconHistory size={16} /> Previous Inspection Data ({product.previousInspectionData.length} cycles)
          </h2>
          <div className="flex gap-2 mb-4 flex-wrap">
            {product.previousInspectionData.map((prev, idx) => (
              <button
                key={idx}
                onClick={() => setActiveHistoryTab(activeHistoryTab === idx ? null : idx)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  activeHistoryTab === idx
                    ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                Cycle #{prev.cycleNumber}
                {prev.rejectionReason && <IconX size={10} className="inline ml-1 text-red-500" />}
              </button>
            ))}
          </div>
          {activeHistoryTab !== null && product.previousInspectionData[activeHistoryTab] && (
            <div className="border rounded-lg p-4 bg-gray-50">
              <div className="flex items-center gap-2 mb-3 text-sm text-gray-600">
                <IconCalendar size={14} />
                Reviewed: {product.previousInspectionData[activeHistoryTab].reviewedAt
                  ? new Date(product.previousInspectionData[activeHistoryTab].reviewedAt!).toLocaleString()
                  : 'N/A'}
                {product.previousInspectionData[activeHistoryTab].reviewedBy && (
                  <span> by {product.previousInspectionData[activeHistoryTab].reviewedBy}</span>
                )}
              </div>
              {product.previousInspectionData[activeHistoryTab].rejectionReason && (
                <div className="mb-3 p-2 bg-red-50 rounded text-sm text-red-700">
                  Rejection: {product.previousInspectionData[activeHistoryTab].rejectionReason}
                </div>
              )}
              <QCInspectionDataView data={product.previousInspectionData[activeHistoryTab].data} />
            </div>
          )}
        </div>
      )}

      {/* Audit Trail */}
      <div className="bg-white rounded-xl border p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <IconClock size={16} /> Audit Trail
        </h2>
        <InspectionAuditTimeline logs={auditLogs} />
      </div>

      {/* Review Modal */}
      <AdminReviewModal
        isOpen={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        onSubmit={handleReview}
        entityType="product"
        entityName={product.name}
        cycleNumber={product.inspectionCycleNumber}
        checkers={checkers}
      />
    </div>
  );
}

// Reusable component to display QC inspection data
function QCInspectionDataView({ data }: { data: Record<string, unknown> }) {
  if (!data || Object.keys(data).length === 0) {
    return <p className="text-sm text-gray-400">No inspection data available</p>;
  }

  // Extract key fields from the 8-step product inspection form
  const sections = [
    { key: 'clientName', label: 'Client' },
    { key: 'vendorName', label: 'Vendor' },
    { key: 'factoryName', label: 'Factory' },
    { key: 'serviceLocation', label: 'Service Location' },
    { key: 'inspectionDate', label: 'Inspection Date' },
    { key: 'inspectionType', label: 'Inspection Type' },
    { key: 'shipperCartonRemark', label: 'Shipper Carton Remark' },
    { key: 'innerCartonRemark', label: 'Inner Carton Remark' },
    { key: 'retailPackagingRemark', label: 'Retail Packaging Remark' },
    { key: 'productTypeRemark', label: 'Product Type Remark' },
    { key: 'aqlWorkmanshipRemark', label: 'AQL Workmanship Remark' },
    { key: 'onSiteTestsRemark', label: 'On-site Tests Remark' },
    { key: 'finalDecision', label: 'Final Decision' },
    { key: 'finalRemarks', label: 'Final Remarks' },
  ];

  const displayFields = sections.filter(s => data[s.key] !== undefined && data[s.key] !== null && data[s.key] !== '');

  // Find photo arrays
  const photoKeys = Object.keys(data).filter(
    k => Array.isArray(data[k]) && (data[k] as unknown[]).length > 0 &&
    typeof (data[k] as unknown[])[0] === 'string' &&
    ((data[k] as string[])[0].startsWith('http') || (data[k] as string[])[0].startsWith('data:'))
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
        {displayFields.map(({ key, label }) => (
          <div key={key}>
            <span className="text-gray-500 text-xs">{label}</span>
            <div className="font-medium">{String(data[key])}</div>
          </div>
        ))}
      </div>

      {photoKeys.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">
            <IconPhoto size={14} /> Photos
          </h4>
          {photoKeys.map(key => (
            <div key={key} className="mb-3">
              <span className="text-xs text-gray-500 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
              <div className="flex gap-2 flex-wrap mt-1">
                {(data[key] as string[]).filter(url => url.startsWith('http')).map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                    <img
                      src={url}
                      alt={`${key} ${i + 1}`}
                      className="w-16 h-16 object-cover rounded border hover:ring-2 ring-blue-300 transition-all"
                    />
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
