'use client';

import { useState } from 'react';
import { AuditLogEntry } from '@/services/reinspectionService';
import { Badge } from '@/components/UI/Badge';
import {
  IconCheck,
  IconX,
  IconRefresh,
  IconClock,
  IconEye,
  IconChevronDown,
  IconChevronUp,
  IconPhoto,
  IconMapPin,
} from '@tabler/icons-react';

interface InspectionAuditTimelineProps {
  logs: AuditLogEntry[];
  loading?: boolean;
}

const ACTION_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  SUBMITTED: { label: 'Submitted for Review', color: 'bg-blue-500', icon: <IconClock size={14} /> },
  ADMIN_APPROVED: { label: 'Admin Approved', color: 'bg-green-500', icon: <IconCheck size={14} /> },
  ADMIN_FINAL_REJECTED: { label: 'Final Rejected', color: 'bg-red-500', icon: <IconX size={14} /> },
  REINSPECTION_RAISED: { label: 'Re-Inspection Raised', color: 'bg-amber-500', icon: <IconRefresh size={14} /> },
  REINSPECTION_SCHEDULED: { label: 'Re-Inspection Scheduled', color: 'bg-indigo-500', icon: <IconClock size={14} /> },
  REINSPECTION_STARTED: { label: 'Re-Inspection Started', color: 'bg-blue-500', icon: <IconEye size={14} /> },
  REINSPECTION_COMPLETED: { label: 'Re-Inspection Completed', color: 'bg-purple-500', icon: <IconCheck size={14} /> },
  QC_APPROVED: { label: 'QC Approved', color: 'bg-green-500', icon: <IconCheck size={14} /> },
  QC_REJECTED: { label: 'QC Rejected', color: 'bg-red-500', icon: <IconX size={14} /> },
  QC_REINSPECTION: { label: 'QC Marked for Reinspection', color: 'bg-amber-500', icon: <IconRefresh size={14} /> },
};

function getActionConfig(action: string) {
  return ACTION_CONFIG[action] || { label: action, color: 'bg-gray-400', icon: <IconClock size={14} /> };
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function InspectionAuditTimeline({ logs, loading }: InspectionAuditTimelineProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex gap-3">
            <div className="w-3 h-3 rounded-full bg-gray-200 mt-1.5" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-1/3" />
              <div className="h-3 bg-gray-100 rounded w-2/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!logs || logs.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <IconClock size={24} className="mx-auto mb-2 opacity-50" />
        <p className="text-sm">No audit trail available</p>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {logs.map((log, index) => {
        const config = getActionConfig(log.action);
        const isExpanded = expandedIds.has(log.id);
        const isLast = index === logs.length - 1;

        return (
          <div key={log.id} className="flex gap-3 relative">
            {/* Timeline line */}
            {!isLast && (
              <div className="absolute left-[5px] top-6 bottom-0 w-0.5 bg-gray-200" />
            )}

            {/* Timeline dot */}
            <div className={`w-3 h-3 rounded-full ${config.color} mt-1.5 flex-shrink-0 ring-2 ring-white z-10`} />

            {/* Content */}
            <div className="flex-1 pb-6">
              <div
                className="cursor-pointer hover:bg-gray-50 rounded-lg p-2 -ml-2 transition-colors"
                onClick={() => toggleExpand(log.id)}
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-white p-0.5 rounded" style={{ backgroundColor: config.color.replace('bg-', '').includes('-') ? undefined : undefined }}>
                    {config.icon}
                  </span>
                  <span className="font-medium text-sm text-gray-900">{config.label}</span>
                  {log.cycleNumber > 1 && (
                    <Badge className="bg-indigo-100 text-indigo-800 text-xs">
                      Cycle #{log.cycleNumber}
                    </Badge>
                  )}
                  <span className="text-xs text-gray-500 ml-auto flex items-center gap-1">
                    {isExpanded ? <IconChevronUp size={12} /> : <IconChevronDown size={12} />}
                  </span>
                </div>

                <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                  <span>{log.performedByName || log.performedByType}</span>
                  <span>&middot;</span>
                  <span>{formatDate(log.createdAt)}</span>
                </div>

                {/* Brief summary (always visible) */}
                {log.rejectionReason && !isExpanded && (
                  <p className="text-xs text-gray-600 mt-1 truncate">
                    Reason: {log.rejectionReason}
                  </p>
                )}
              </div>

              {/* Expanded details */}
              {isExpanded && (
                <div className="mt-2 ml-2 space-y-2 text-sm border-l-2 border-gray-100 pl-3">
                  {log.fromStatus && log.toStatus && (
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">{log.fromStatus}</Badge>
                      <span className="text-gray-400">&rarr;</span>
                      <Badge variant="outline" className="text-xs">{log.toStatus}</Badge>
                    </div>
                  )}

                  {log.rejectionReason && (
                    <div>
                      <span className="font-medium text-gray-700">Reason:</span>
                      <p className="text-gray-600 mt-0.5">{log.rejectionReason}</p>
                    </div>
                  )}

                  {log.remarks && (
                    <div>
                      <span className="font-medium text-gray-700">Remarks:</span>
                      <p className="text-gray-600 mt-0.5">{log.remarks}</p>
                    </div>
                  )}

                  {log.notes && (
                    <div>
                      <span className="font-medium text-gray-700">Notes:</span>
                      <p className="text-gray-600 mt-0.5">{log.notes}</p>
                    </div>
                  )}

                  {log.locationDetails && (
                    <div className="flex items-center gap-1 text-gray-600">
                      <IconMapPin size={14} />
                      <span>{log.locationDetails}</span>
                    </div>
                  )}

                  {log.attachments && log.attachments.length > 0 && (
                    <div>
                      <span className="font-medium text-gray-700 flex items-center gap-1">
                        <IconPhoto size={14} />
                        Attachments ({log.attachments.length})
                      </span>
                      <div className="flex gap-2 mt-1 flex-wrap">
                        {log.attachments.map((url, i) => (
                          <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                            <img
                              src={url}
                              alt={`Attachment ${i + 1}`}
                              className="w-16 h-16 object-cover rounded border hover:ring-2 ring-blue-300 transition-all"
                            />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
