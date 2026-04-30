'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import axios from '@/lib/axios';
import reinspectionService, { AuditLogEntry, InspectionChainItem, AdminReviewPayload } from '@/services/reinspectionService';
import InspectionAuditTimeline from '@/components/AdminDashboard/ReInspection/InspectionAuditTimeline';
import AdminReviewModal from '@/components/AdminDashboard/ReInspection/AdminReviewModal';
import { Badge } from '@/components/UI/Badge';
import { Button } from '@/components/UI/Button';
import { showSuccessToast, showErrorToast } from '@/lib/toast-utils';
import {
  IconArrowLeft,
  IconLoader2,
  IconBuilding,
  IconUser,
  IconCalendar,
  IconMapPin,
  IconFileText,
  IconPhoto,
  IconClock,
  IconCheck,
  IconX,
  IconRefresh,
} from '@tabler/icons-react';

interface InspectionDetail {
  id: string;
  vendorId: string;
  checkerId: string;
  poNumber: string;
  clientName: string;
  scheduledDate: string;
  scheduledTime: string;
  priority: string;
  estimatedDuration: string;
  status: string;
  startedAt: string | null;
  completedAt: string | null;
  submittedAt: string | null;
  result: string | null;
  score: number | null;
  notes: string | null;
  cycleNumber: number;
  parentInspectionId: string | null;
  rejectionReason: string | null;
  rejectionRemarks: string | null;
  rejectionNotes: string | null;
  locationDetails: string | null;
  itemsToInspect: Record<string, unknown>;
  createdAt: string;
  vendor: { id: string; companyName: string; email: string; ownerName: string; businessPhone?: string; businessCity?: string; businessState?: string; businessAddress?: string; vendorCode?: string };
  checker: { id: string; name: string; email: string };
}

export default function FactoryInspectionReviewPage() {
  const params = useParams();
  const router = useRouter();
  const inspectionId = params.id as string;

  const [inspection, setInspection] = useState<InspectionDetail | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [inspectionChain, setInspectionChain] = useState<InspectionChainItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [checkers, setCheckers] = useState<{ id: string; name: string }[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [inspectionRes, auditRes] = await Promise.all([
        axios.get(`/inspections/${inspectionId}`),
        reinspectionService.getAuditTrail('FACTORY_INSPECTION', inspectionId),
      ]);

      setInspection(inspectionRes.data.inspection);
      setAuditLogs(auditRes.logs);
      setInspectionChain(auditRes.inspectionChain || []);

      // Fetch available checkers for reassignment
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
      console.error('Error fetching inspection details:', error);
      showErrorToast('Error', 'Failed to load inspection details');
    } finally {
      setLoading(false);
    }
  }, [inspectionId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleReview = async (payload: AdminReviewPayload) => {
    try {
      await reinspectionService.reviewFactoryInspection(inspectionId, payload);
      showSuccessToast(
        'Review Submitted',
        payload.decision === 'APPROVE'
          ? 'Inspection approved'
          : payload.decision === 'FINAL_REJECT'
          ? 'Inspection finally rejected'
          : 'Re-inspection raised successfully'
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

  if (!inspection) {
    return (
      <div className="text-center py-24 text-gray-500">
        <p>Inspection not found</p>
        <Button variant="outline" className="mt-4" onClick={() => router.back()}>
          <IconArrowLeft size={16} className="mr-1" /> Go Back
        </Button>
      </div>
    );
  }

  const canReview = ['SUBMITTED', 'UNDER_ADMIN_REVIEW', 'REJECTED'].includes(inspection.status);
  const formData = inspection.itemsToInspect as Record<string, unknown> || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push('/admin/dashboard/reinspection-review')}>
          <IconArrowLeft size={16} />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">Factory Inspection Review</h1>
          <p className="text-sm text-gray-500">{inspection.vendor.companyName}</p>
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
            {inspection.status === 'SUBMITTED' && <Badge className="bg-blue-100 text-blue-800">Submitted</Badge>}
            {inspection.status === 'UNDER_ADMIN_REVIEW' && <Badge className="bg-yellow-100 text-yellow-800">Under Review</Badge>}
            {inspection.status === 'REJECTED' && <Badge className="bg-red-100 text-red-800">Rejected</Badge>}
            {inspection.status === 'COMPLETED' && <Badge className="bg-green-100 text-green-800">Completed</Badge>}
            {inspection.status === 'REINSPECTION' && <Badge className="bg-amber-100 text-amber-800">Re-Inspection</Badge>}
            {!['SUBMITTED', 'UNDER_ADMIN_REVIEW', 'REJECTED', 'COMPLETED', 'REINSPECTION'].includes(inspection.status) && (
              <Badge className="bg-gray-100 text-gray-800">{inspection.status}</Badge>
            )}
            {inspection.result && (
              <Badge className={inspection.result === 'PASSED' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                {inspection.result}
              </Badge>
            )}
          </div>
          {inspection.cycleNumber > 1 && (
            <Badge className="mt-2 bg-indigo-100 text-indigo-800">
              Re-Inspection Cycle #{inspection.cycleNumber}
            </Badge>
          )}
        </div>

        <div className="bg-white rounded-xl border p-4">
          <div className="text-xs text-gray-500 mb-2 flex items-center gap-1">
            <IconUser size={12} /> QC Checker
          </div>
          <div className="font-medium text-sm">{inspection.checker.name}</div>
          <div className="text-xs text-gray-500">{inspection.checker.email}</div>
        </div>

        <div className="bg-white rounded-xl border p-4">
          <div className="text-xs text-gray-500 mb-2 flex items-center gap-1">
            <IconCalendar size={12} /> Timeline
          </div>
          <div className="space-y-1 text-xs">
            <div>Scheduled: {inspection.scheduledDate} {inspection.scheduledTime}</div>
            {inspection.submittedAt && <div>Submitted: {new Date(inspection.submittedAt).toLocaleString()}</div>}
            {inspection.completedAt && <div>Completed: {new Date(inspection.completedAt).toLocaleString()}</div>}
          </div>
        </div>
      </div>

      {/* Vendor Info */}
      <div className="bg-white rounded-xl border p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <IconBuilding size={16} /> Vendor Information
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Company</span>
            <div className="font-medium">{inspection.vendor.companyName}</div>
          </div>
          <div>
            <span className="text-gray-500">Owner</span>
            <div className="font-medium">{inspection.vendor.ownerName}</div>
          </div>
          <div>
            <span className="text-gray-500">Email</span>
            <div className="font-medium">{inspection.vendor.email}</div>
          </div>
          <div>
            <span className="text-gray-500">Location</span>
            <div className="font-medium">{inspection.vendor.businessCity}, {inspection.vendor.businessState}</div>
          </div>
        </div>
      </div>

      {/* Rejection Details (if applicable) */}
      {(inspection.rejectionReason || inspection.rejectionRemarks || inspection.rejectionNotes) && (
        <div className="bg-red-50 rounded-xl border border-red-200 p-5">
          <h2 className="text-sm font-semibold text-red-900 mb-3 flex items-center gap-2">
            <IconX size={16} /> Rejection Details
          </h2>
          <div className="space-y-2 text-sm">
            {inspection.rejectionReason && (
              <div>
                <span className="font-medium text-red-800">Reason:</span>
                <p className="text-red-700 mt-0.5">{inspection.rejectionReason}</p>
              </div>
            )}
            {inspection.rejectionRemarks && (
              <div>
                <span className="font-medium text-red-800">Remarks:</span>
                <p className="text-red-700 mt-0.5">{inspection.rejectionRemarks}</p>
              </div>
            )}
            {inspection.rejectionNotes && (
              <div>
                <span className="font-medium text-red-800">Notes:</span>
                <p className="text-red-700 mt-0.5">{inspection.rejectionNotes}</p>
              </div>
            )}
            {inspection.locationDetails && (
              <div className="flex items-center gap-1 text-red-700">
                <IconMapPin size={14} />
                <span>{inspection.locationDetails}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Inspection Form Data Summary */}
      <div className="bg-white rounded-xl border p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <IconFileText size={16} /> Inspection Data
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          {formData.factoryName && (
            <div><span className="text-gray-500">Factory Name:</span> <span className="font-medium">{String(formData.factoryName)}</span></div>
          )}
          {formData.contactPersonName && (
            <div><span className="text-gray-500">Contact Person:</span> <span className="font-medium">{String(formData.contactPersonName)}</span></div>
          )}
          {formData.businessRegistrationNumber && (
            <div><span className="text-gray-500">Registration #:</span> <span className="font-medium">{String(formData.businessRegistrationNumber)}</span></div>
          )}
          {formData.monthlyProductionCapacity && (
            <div><span className="text-gray-500">Monthly Capacity:</span> <span className="font-medium">{String(formData.monthlyProductionCapacity)}</span></div>
          )}
          {formData.inspectionDate && (
            <div><span className="text-gray-500">Inspection Date:</span> <span className="font-medium">{String(formData.inspectionDate)}</span></div>
          )}
          {formData.inspectionStatus && (
            <div><span className="text-gray-500">Inspector Decision:</span> <span className="font-medium">{String(formData.inspectionStatus)}</span></div>
          )}
          {formData.inspectorRemarks && (
            <div className="md:col-span-2">
              <span className="text-gray-500">Inspector Remarks:</span>
              <p className="font-medium mt-0.5">{String(formData.inspectorRemarks)}</p>
            </div>
          )}
        </div>

        {/* Factory Photos */}
        {formData.factoryPhotos && Array.isArray(formData.factoryPhotos) && formData.factoryPhotos.length > 0 && (
          <div className="mt-4">
            <h3 className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">
              <IconPhoto size={14} /> Factory Photos ({formData.factoryPhotos.length})
            </h3>
            <div className="flex gap-2 flex-wrap">
              {(formData.factoryPhotos as Array<string | { name?: string; data?: string }>).map((photo, i) => {
                const url = typeof photo === 'string' ? photo : photo?.data || '';
                const name = typeof photo === 'string' ? `Factory photo ${i + 1}` : photo?.name || `Factory photo ${i + 1}`;
                if (!url) return null;
                return (
                <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                  <img
                    src={url}
                    alt={name}
                    className="w-20 h-20 object-cover rounded-lg border hover:ring-2 ring-blue-300 transition-all"
                  />
                </a>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Inspection Chain (for re-inspections) */}
      {inspectionChain.length > 1 && (
        <div className="bg-white rounded-xl border p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <IconRefresh size={16} /> Inspection Chain ({inspectionChain.length} cycles)
          </h2>
          <div className="space-y-2">
            {inspectionChain.map(item => (
              <div
                key={item.id}
                className={`flex items-center gap-3 p-3 rounded-lg border ${
                  item.id === inspectionId ? 'border-blue-300 bg-blue-50' : 'border-gray-200'
                }`}
              >
                <Badge className={item.id === inspectionId ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-700'}>
                  Cycle #{item.cycleNumber}
                </Badge>
                <span className="text-sm text-gray-700">{item.checker.name}</span>
                <Badge className={
                  item.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                  item.status === 'SUBMITTED' ? 'bg-blue-100 text-blue-800' :
                  'bg-gray-100 text-gray-800'
                }>
                  {item.status}
                </Badge>
                {item.result && (
                  <Badge className={item.result === 'PASSED' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                    {item.result}
                  </Badge>
                )}
                <span className="text-xs text-gray-500 ml-auto">
                  {new Date(item.createdAt).toLocaleDateString()}
                </span>
                {item.id !== inspectionId && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push(`/admin/dashboard/reinspection-review/factory/${item.id}`)}
                  >
                    View
                  </Button>
                )}
              </div>
            ))}
          </div>
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
        entityType="factory"
        entityName={inspection.vendor.companyName}
        cycleNumber={inspection.cycleNumber}
        checkers={checkers}
      />
    </div>
  );
}
