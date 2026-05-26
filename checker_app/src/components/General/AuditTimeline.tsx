import { useState } from 'react';
import { View, Text, TouchableOpacity, Image, ScrollView } from 'react-native';
import {
  Check,
  X,
  RefreshCw,
  Clock,
  Eye,
  ChevronDown,
  ChevronUp,
  MapPin,
  Image as ImageIcon,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  FileText,
  UserCheck,
} from 'lucide-react-native';
import { AuditLogEntry } from '@/services/qcCheckerService';

interface AuditTimelineProps {
  logs: AuditLogEntry[];
  loading?: boolean;
}

// ── Action config with distinct icons and semantic colors ───────────────────
const ACTION_CONFIG: Record<
  string,
  { label: string; color: string; bgLight: string; icon: (props: any) => JSX.Element }
> = {
  SUBMITTED: {
    label: 'Submitted for Review',
    color: '#2563EB',
    bgLight: '#EFF6FF',
    icon: (p: any) => <FileText {...p} />,
  },
  ADMIN_APPROVED: {
    label: 'Admin Approved',
    color: '#059669',
    bgLight: '#ECFDF5',
    icon: (p: any) => <ShieldCheck {...p} />,
  },
  ADMIN_FINAL_REJECTED: {
    label: 'Final Rejected',
    color: '#DC2626',
    bgLight: '#FEF2F2',
    icon: (p: any) => <X {...p} />,
  },
  REINSPECTION_RAISED: {
    label: 'Re-Inspection Raised',
    color: '#D97706',
    bgLight: '#FFFBEB',
    icon: (p: any) => <AlertTriangle {...p} />,
  },
  REINSPECTION_SCHEDULED: {
    label: 'Re-Inspection Scheduled',
    color: '#4F46E5',
    bgLight: '#EEF2FF',
    icon: (p: any) => <Clock {...p} />,
  },
  REINSPECTION_STARTED: {
    label: 'Re-Inspection Started',
    color: '#2563EB',
    bgLight: '#EFF6FF',
    icon: (p: any) => <Eye {...p} />,
  },
  REINSPECTION_COMPLETED: {
    label: 'Re-Inspection Completed',
    color: '#7C3AED',
    bgLight: '#F5F3FF',
    icon: (p: any) => <Check {...p} />,
  },
  QC_APPROVED: {
    label: 'QC Approved',
    color: '#059669',
    bgLight: '#ECFDF5',
    icon: (p: any) => <Check {...p} />,
  },
  QC_REJECTED: {
    label: 'QC Rejected',
    color: '#DC2626',
    bgLight: '#FEF2F2',
    icon: (p: any) => <X {...p} />,
  },
  QC_REINSPECTION: {
    label: 'Marked for Reinspection',
    color: '#D97706',
    bgLight: '#FFFBEB',
    icon: (p: any) => <RefreshCw {...p} />,
  },
};

function getConfig(action: string) {
  return (
    ACTION_CONFIG[action] || {
      label: action.replace(/_/g, ' '),
      color: '#64748B',
      bgLight: '#F8FAFC',
      icon: (p: any) => <Clock {...p} />,
    }
  );
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Prettify raw status keys: QC_APPROVED → QC Approved
function humanizeStatus(status: string) {
  return status
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// ── Component ──────────────────────────────────────────────────────────────────
export default function AuditTimeline({ logs, loading }: AuditTimelineProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // ── Loading skeleton ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={{ gap: 16 }}>
        {[1, 2, 3].map((i) => (
          <View key={i} className="flex-row" style={{ gap: 12 }}>
            <View className="w-10 h-10 rounded-xl bg-slate-100" />
            <View className="flex-1" style={{ gap: 6 }}>
              <View className="h-4 bg-slate-100 rounded-lg w-3/4" />
              <View className="h-3 bg-slate-50 rounded-lg w-1/2" />
            </View>
          </View>
        ))}
      </View>
    );
  }

  // ── Empty state ─────────────────────────────────────────────────────────────
  if (!logs || logs.length === 0) {
    return (
      <View className="items-center py-10" style={{ gap: 8 }}>
        <View
          className="w-14 h-14 rounded-2xl items-center justify-center"
          style={{ backgroundColor: '#F1F5F9' }}
        >
          <Clock size={24} color="#94A3B8" />
        </View>
        <Text className="text-sm font-semibold text-slate-500">No audit trail available</Text>
        <Text className="text-xs text-slate-400 text-center px-8">
          Activity will appear here once inspection actions are recorded.
        </Text>
      </View>
    );
  }

  // ── Main timeline ───────────────────────────────────────────────────────────
  return (
    <View>
      {logs.map((log, index) => {
        const config = getConfig(log.action);
        const isExpanded = expandedIds.has(log.id);
        const isLast = index === logs.length - 1;
        const Icon = config.icon;

        return (
          <View key={log.id} className="flex-row">
            {/* ── Left rail: icon + connector line ──────────────────────── */}
            <View className="items-center" style={{ width: 44 }}>
              {/* Icon circle */}
              <View
                className="w-9 h-9 rounded-xl items-center justify-center"
                style={{ backgroundColor: config.bgLight }}
              >
                <Icon size={16} color={config.color} />
              </View>

              {/* Connector line */}
              {!isLast && (
                <View
                  className="flex-1"
                  style={{
                    width: 2,
                    backgroundColor: '#E2E8F0',
                    borderRadius: 1,
                    marginTop: 4,
                    marginBottom: 4,
                  }}
                />
              )}
            </View>

            {/* ── Right content ──────────────────────────────────────────── */}
            <View className="flex-1" style={{ paddingBottom: isLast ? 0 : 20, paddingLeft: 10 }}>
              <TouchableOpacity
                onPress={() => toggleExpand(log.id)}
                activeOpacity={0.7}
                className="rounded-xl"
                style={{
                  backgroundColor: isExpanded ? config.bgLight : 'transparent',
                  padding: isExpanded ? 12 : 4,
                }}
              >
                {/* ── Header row ─────────────────────────────────────────── */}
                <View className="flex-row items-center justify-between">
                  <View className="flex-1 flex-row items-center flex-wrap" style={{ gap: 6 }}>
                    <Text className="font-bold text-sm text-slate-900">{config.label}</Text>
                    {log.cycleNumber > 1 && (
                      <View
                        className="rounded-md px-2 py-0.5"
                        style={{ backgroundColor: '#EEF2FF' }}
                      >
                        <Text className="text-indigo-700 text-[10px] font-bold">
                          Cycle #{log.cycleNumber}
                        </Text>
                      </View>
                    )}
                  </View>
                  {isExpanded ? (
                    <ChevronUp size={16} color="#94A3B8" />
                  ) : (
                    <ChevronDown size={16} color="#94A3B8" />
                  )}
                </View>

                {/* ── Performer + timestamp ───────────────────────────────── */}
                <View className="flex-row items-center mt-1.5" style={{ gap: 6 }}>
                  <View className="flex-row items-center" style={{ gap: 4 }}>
                    <UserCheck size={11} color="#94A3B8" />
                    <Text className="text-xs text-slate-500 font-medium">
                      {log.performedByName || log.performedByType}
                    </Text>
                  </View>
                  <Text className="text-slate-300">·</Text>
                  <Text className="text-xs text-slate-400">
                    {formatDate(log.createdAt)}, {formatTime(log.createdAt)}
                  </Text>
                </View>

                {/* ── Collapsed preview: show rejection reason as teaser ─── */}
                {log.rejectionReason && !isExpanded && (
                  <View className="flex-row items-start mt-2" style={{ gap: 6 }}>
                    <View
                      className="mt-0.5"
                      style={{
                        width: 3,
                        height: '100%',
                        minHeight: 16,
                        backgroundColor: '#FCA5A5',
                        borderRadius: 2,
                      }}
                    />
                    <Text className="text-xs text-slate-600 flex-1" numberOfLines={2}>
                      {log.rejectionReason}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* ── Expanded details panel ────────────────────────────────── */}
              {isExpanded && (
                <View
                  className="rounded-xl mt-2"
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderWidth: 1,
                    borderColor: '#E2E8F0',
                    padding: 14,
                    gap: 12,
                  }}
                >
                  {/* Status transition */}
                  {log.fromStatus && log.toStatus && (
                    <View>
                      <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                        Status Change
                      </Text>
                      <View className="flex-row items-center" style={{ gap: 8 }}>
                        <View
                          className="rounded-lg px-2.5 py-1"
                          style={{ backgroundColor: '#FEF2F2' }}
                        >
                          <Text className="text-xs font-semibold text-red-700">
                            {humanizeStatus(log.fromStatus)}
                          </Text>
                        </View>
                        <ArrowRight size={14} color="#94A3B8" />
                        <View
                          className="rounded-lg px-2.5 py-1"
                          style={{ backgroundColor: '#ECFDF5' }}
                        >
                          <Text className="text-xs font-semibold text-emerald-700">
                            {humanizeStatus(log.toStatus)}
                          </Text>
                        </View>
                      </View>
                    </View>
                  )}

                  {/* Rejection reason */}
                  {log.rejectionReason && (
                    <View>
                      <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                        Rejection Reason
                      </Text>
                      <View
                        className="rounded-lg p-3"
                        style={{ backgroundColor: '#FEF2F2' }}
                      >
                        <Text className="text-sm text-red-800" style={{ lineHeight: 20 }}>
                          {log.rejectionReason}
                        </Text>
                      </View>
                    </View>
                  )}

                  {/* Remarks */}
                  {log.remarks && (
                    <View>
                      <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                        Remarks
                      </Text>
                      <Text className="text-sm text-slate-700" style={{ lineHeight: 20 }}>
                        {log.remarks}
                      </Text>
                    </View>
                  )}

                  {/* Notes */}
                  {log.notes && (
                    <View>
                      <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                        Notes
                      </Text>
                      <Text className="text-sm text-slate-700" style={{ lineHeight: 20 }}>
                        {log.notes}
                      </Text>
                    </View>
                  )}

                  {/* Location */}
                  {log.locationDetails && (
                    <View className="flex-row items-center" style={{ gap: 6 }}>
                      <View
                        className="w-7 h-7 rounded-lg items-center justify-center"
                        style={{ backgroundColor: '#EFF6FF' }}
                      >
                        <MapPin size={13} color="#2563EB" />
                      </View>
                      <Text className="text-xs text-slate-600 flex-1 font-medium">
                        {log.locationDetails}
                      </Text>
                    </View>
                  )}

                  {/* Attachments */}
                  {log.attachments && log.attachments.length > 0 && (
                    <View>
                      <View className="flex-row items-center mb-2" style={{ gap: 4 }}>
                        <ImageIcon size={13} color="#64748B" />
                        <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Attachments ({log.attachments.length})
                        </Text>
                      </View>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        <View className="flex-row" style={{ gap: 8 }}>
                          {log.attachments.map((url, i) => (
                            <View
                              key={i}
                              className="rounded-xl overflow-hidden"
                              style={{
                                borderWidth: 1,
                                borderColor: '#E2E8F0',
                              }}
                            >
                              <Image
                                source={{ uri: url }}
                                className="w-16 h-16"
                                resizeMode="cover"
                              />
                            </View>
                          ))}
                        </View>
                      </ScrollView>
                    </View>
                  )}
                </View>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}
