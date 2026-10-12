'use client';

import { CheckCircle2, XCircle } from 'lucide-react';
import { approvalService, type ApprovalModule } from '@/services/approvalService';
import { hasPermission } from '@/lib/auth';
import { showSuccessToast, showErrorToast } from '@/lib/toast-utils';

/**
 * Inline Approve / Reject buttons for a maker-checker item. Renders nothing
 * unless the row is PENDING and the current admin holds the approve permission.
 */
export default function ApprovalActions({ module, id, label, approvalStatus, permission, onDone }: {
  module: ApprovalModule;
  id: string;
  label?: string;
  approvalStatus?: string;
  permission: string;
  onDone?: () => void;
}) {
  if (approvalStatus !== 'PENDING') return null;
  if (!hasPermission(permission)) return null;

  const approve = async () => {
    if (!window.confirm(`Approve ${label || 'this item'}? It will go live.`)) return;
    try {
      await approvalService.approve(module, id);
      showSuccessToast('Approved', `${label || 'Item'} is now live.`);
      onDone?.();
    } catch (e: any) {
      showErrorToast('Failed', e?.response?.data?.message || 'Could not approve.');
    }
  };

  const reject = async () => {
    const reason = window.prompt(`Reject ${label || 'this item'}? Enter a reason:`);
    if (reason === null) return;
    if (!reason.trim()) { showErrorToast('Required', 'A rejection reason is required.'); return; }
    try {
      await approvalService.reject(module, id, reason.trim());
      showSuccessToast('Rejected', `${label || 'Item'} was rejected.`);
      onDone?.();
    } catch (e: any) {
      showErrorToast('Failed', e?.response?.data?.message || 'Could not reject.');
    }
  };

  return (
    <>
      <button onClick={approve} className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-green-700 bg-green-50 hover:bg-green-100 rounded transition-colors" title="Approve">
        <CheckCircle2 className="w-3.5 h-3.5" /> Approve
      </button>
      <button onClick={reject} className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 rounded transition-colors" title="Reject">
        <XCircle className="w-3.5 h-3.5" /> Reject
      </button>
    </>
  );
}
