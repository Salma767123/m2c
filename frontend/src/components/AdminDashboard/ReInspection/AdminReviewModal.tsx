'use client';

import { useState } from 'react';
import { AdminReviewPayload } from '@/services/reinspectionService';
import { Button } from '@/components/UI/Button';
import { Badge } from '@/components/UI/Badge';
import {
  IconCheck,
  IconX,
  IconRefresh,
  IconLoader2,
} from '@tabler/icons-react';

interface AdminReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: AdminReviewPayload) => Promise<void>;
  entityType: 'factory' | 'product';
  entityName: string;
  cycleNumber: number;
  checkers?: { id: string; name: string }[];
}

export default function AdminReviewModal({
  isOpen,
  onClose,
  onSubmit,
  entityType,
  entityName,
  cycleNumber,
  checkers,
}: AdminReviewModalProps) {
  const [decision, setDecision] = useState<'APPROVE' | 'FINAL_REJECT' | 'RAISE_REINSPECTION' | ''>('');
  const [reason, setReason] = useState('');
  const [remarks, setRemarks] = useState('');
  const [notes, setNotes] = useState('');
  const [newCheckerId, setNewCheckerId] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!decision) {
      setError('Please select a decision');
      return;
    }

    if (decision === 'FINAL_REJECT' && (!reason || reason.trim().length < 5)) {
      setError('A detailed rejection reason is required (minimum 5 characters)');
      return;
    }

    if (decision === 'RAISE_REINSPECTION' && !reason && !remarks) {
      setError('At least a reason or remarks is required for re-inspection');
      return;
    }

    setLoading(true);
    try {
      const payload: AdminReviewPayload = { decision };
      if (reason) payload.reason = reason;
      if (remarks) payload.remarks = remarks;
      if (notes) payload.notes = notes;
      if (newCheckerId) payload.newCheckerId = newCheckerId;
      if (scheduledDate) payload.scheduledDate = scheduledDate;
      if (scheduledTime) payload.scheduledTime = scheduledTime;

      await onSubmit(payload);
      handleClose();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to submit review';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setDecision('');
    setReason('');
    setRemarks('');
    setNotes('');
    setNewCheckerId('');
    setScheduledDate('');
    setScheduledTime('');
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Review Inspection</h2>
            <div className="text-sm text-gray-500 mt-1">
              {entityType === 'factory' ? 'Factory' : 'Product'} Inspection: <strong>{entityName}</strong>
              {cycleNumber > 1 && (
                <Badge className="ml-2 bg-indigo-100 text-indigo-800">Cycle #{cycleNumber}</Badge>
              )}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Decision Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Decision *</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setDecision('APPROVE')}
                  className={`p-3 rounded-lg border text-center transition-all ${
                    decision === 'APPROVE'
                      ? 'border-green-500 bg-green-50 ring-2 ring-green-200'
                      : 'border-gray-200 hover:border-green-300'
                  }`}
                >
                  <IconCheck size={20} className="mx-auto text-green-600 mb-1" />
                  <span className="text-xs font-medium text-green-700">Approve</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDecision('FINAL_REJECT')}
                  className={`p-3 rounded-lg border text-center transition-all ${
                    decision === 'FINAL_REJECT'
                      ? 'border-red-500 bg-red-50 ring-2 ring-red-200'
                      : 'border-gray-200 hover:border-red-300'
                  }`}
                >
                  <IconX size={20} className="mx-auto text-red-600 mb-1" />
                  <span className="text-xs font-medium text-red-700">Final Reject</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDecision('RAISE_REINSPECTION')}
                  className={`p-3 rounded-lg border text-center transition-all ${
                    decision === 'RAISE_REINSPECTION'
                      ? 'border-amber-500 bg-amber-50 ring-2 ring-amber-200'
                      : 'border-gray-200 hover:border-amber-300'
                  }`}
                >
                  <IconRefresh size={20} className="mx-auto text-amber-600 mb-1" />
                  <span className="text-xs font-medium text-amber-700">Re-Inspect</span>
                </button>
              </div>
            </div>

            {/* Reason (required for FINAL_REJECT, optional for RAISE_REINSPECTION) */}
            {(decision === 'FINAL_REJECT' || decision === 'RAISE_REINSPECTION') && (
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Reason {decision === 'FINAL_REJECT' ? '*' : ''}
                </label>
                <textarea
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none"
                  placeholder={decision === 'FINAL_REJECT' ? 'Detailed rejection reason (required)...' : 'Reason for re-inspection...'}
                />
              </div>
            )}

            {/* Remarks */}
            {decision && decision !== 'APPROVE' && (
              <div>
                <label className="text-sm font-medium text-gray-700">Remarks / Observations</label>
                <textarea
                  value={remarks}
                  onChange={e => setRemarks(e.target.value)}
                  rows={2}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none"
                  placeholder="Additional observations..."
                />
              </div>
            )}

            {/* Notes */}
            {decision && decision !== 'APPROVE' && (
              <div>
                <label className="text-sm font-medium text-gray-700">Supporting Notes</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={2}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none"
                  placeholder="Internal notes..."
                />
              </div>
            )}

            {/* Re-inspection specific fields */}
            {decision === 'RAISE_REINSPECTION' && (
              <>
                {/* Checker reassignment */}
                {checkers && checkers.length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Assign to QC Checker (optional - defaults to same checker)
                    </label>
                    <select
                      value={newCheckerId}
                      onChange={e => setNewCheckerId(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none"
                    >
                      <option value="">Same checker (default)</option>
                      {checkers.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Schedule date/time for factory inspections */}
                {entityType === 'factory' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Scheduled Date</label>
                      <input
                        type="date"
                        value={scheduledDate}
                        onChange={e => setScheduledDate(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Scheduled Time</label>
                      <input
                        type="time"
                        value={scheduledTime}
                        onChange={e => setScheduledTime(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none"
                      />
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Error */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!decision || loading}
                className={
                  decision === 'APPROVE'
                    ? 'bg-green-600 hover:bg-green-700'
                    : decision === 'FINAL_REJECT'
                    ? 'bg-red-600 hover:bg-red-700'
                    : decision === 'RAISE_REINSPECTION'
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : ''
                }
              >
                {loading && <IconLoader2 size={16} className="animate-spin mr-1" />}
                {decision === 'APPROVE' && 'Approve Inspection'}
                {decision === 'FINAL_REJECT' && 'Final Reject'}
                {decision === 'RAISE_REINSPECTION' && 'Raise Re-Inspection'}
                {!decision && 'Select Decision'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
