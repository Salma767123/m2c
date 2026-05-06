import { useState } from 'react';
import { View, Text, TouchableOpacity, Image, ScrollView } from 'react-native';
import {
  Check,
  X,
  RefreshCcw,
  Clock,
  Eye,
  ChevronDown,
  ChevronUp,
  MapPin,
} from 'lucide-react-native';
import { AuditLogEntry } from '@/services/qcCheckerService';

interface AuditTimelineProps {
  logs: AuditLogEntry[];
  loading?: boolean;
}

const ACTION_CONFIG: Record<string, { label: string; color: string }> = {
  SUBMITTED: { label: 'Submitted for Review', color: '#3B82F6' },
  ADMIN_APPROVED: { label: 'Admin Approved', color: '#22C55E' },
  ADMIN_FINAL_REJECTED: { label: 'Final Rejected', color: '#EF4444' },
  REINSPECTION_RAISED: { label: 'Re-Inspection Raised', color: '#F59E0B' },
  REINSPECTION_SCHEDULED: { label: 'Re-Inspection Scheduled', color: '#6366F1' },
  REINSPECTION_STARTED: { label: 'Re-Inspection Started', color: '#3B82F6' },
  REINSPECTION_COMPLETED: { label: 'Re-Inspection Completed', color: '#A855F7' },
  QC_APPROVED: { label: 'QC Approved', color: '#22C55E' },
  QC_REJECTED: { label: 'QC Rejected', color: '#EF4444' },
  QC_REINSPECTION: { label: 'Marked for Reinspection', color: '#F59E0B' },
};

function getConfig(action: string) {
  return ACTION_CONFIG[action] || { label: action, color: '#9CA3AF' };
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function AuditTimeline({ logs, loading }: AuditTimelineProps) {
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
      <View className="py-6 items-center">
        <Text className="text-gray-400 text-sm">Loading audit trail...</Text>
      </View>
    );
  }

  if (!logs || logs.length === 0) {
    return (
      <View className="py-6 items-center">
        <Clock size={20} color="#9CA3AF" />
        <Text className="text-gray-400 text-sm mt-2">No audit trail available</Text>
      </View>
    );
  }

  return (
    <View>
      {logs.map((log, index) => {
        const config = getConfig(log.action);
        const isExpanded = expandedIds.has(log.id);
        const isLast = index === logs.length - 1;

        return (
          <View key={log.id} className="flex-row">
            {/* Timeline line + dot */}
            <View className="items-center mr-3">
              <View
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: config.color }}
              />
              {!isLast && (
                <View className="w-0.5 flex-1 bg-gray-200" />
              )}
            </View>

            {/* Content */}
            <View className="flex-1 pb-5">
              <TouchableOpacity
                onPress={() => toggleExpand(log.id)}
                activeOpacity={0.7}
              >
                <View className="flex-row items-center flex-wrap gap-1">
                  <Text className="font-semibold text-xs text-gray-900">{config.label}</Text>
                  {log.cycleNumber > 1 && (
                    <View className="bg-indigo-100 px-1.5 py-0.5 rounded">
                      <Text className="text-indigo-700 text-[10px] font-semibold">#{log.cycleNumber}</Text>
                    </View>
                  )}
                  {isExpanded ? (
                    <ChevronUp size={12} color="#9CA3AF" />
                  ) : (
                    <ChevronDown size={12} color="#9CA3AF" />
                  )}
                </View>

                <Text className="text-[10px] text-gray-500 mt-0.5">
                  {log.performedByName || log.performedByType} &middot; {formatDate(log.createdAt)}
                </Text>

                {/* Brief rejection reason when collapsed */}
                {log.rejectionReason && !isExpanded && (
                  <Text className="text-[11px] text-gray-600 mt-1" numberOfLines={1}>
                    Reason: {log.rejectionReason}
                  </Text>
                )}
              </TouchableOpacity>

              {/* Expanded details */}
              {isExpanded && (
                <View className="mt-2 pl-3 border-l-2 border-gray-100 gap-2">
                  {log.fromStatus && log.toStatus && (
                    <View className="flex-row items-center gap-2">
                      <View className="bg-gray-100 px-2 py-0.5 rounded">
                        <Text className="text-[10px] text-gray-600">{log.fromStatus}</Text>
                      </View>
                      <Text className="text-gray-400 text-xs">&rarr;</Text>
                      <View className="bg-gray-100 px-2 py-0.5 rounded">
                        <Text className="text-[10px] text-gray-600">{log.toStatus}</Text>
                      </View>
                    </View>
                  )}

                  {log.rejectionReason && (
                    <View>
                      <Text className="font-medium text-xs text-gray-700">Reason:</Text>
                      <Text className="text-xs text-gray-600 mt-0.5">{log.rejectionReason}</Text>
                    </View>
                  )}

                  {log.remarks && (
                    <View>
                      <Text className="font-medium text-xs text-gray-700">Remarks:</Text>
                      <Text className="text-xs text-gray-600 mt-0.5">{log.remarks}</Text>
                    </View>
                  )}

                  {log.notes && (
                    <View>
                      <Text className="font-medium text-xs text-gray-700">Notes:</Text>
                      <Text className="text-xs text-gray-600 mt-0.5">{log.notes}</Text>
                    </View>
                  )}

                  {log.locationDetails && (
                    <View className="flex-row items-center gap-1">
                      <MapPin size={12} color="#6B7280" />
                      <Text className="text-xs text-gray-600">{log.locationDetails}</Text>
                    </View>
                  )}

                  {log.attachments && log.attachments.length > 0 && (
                    <View>
                      <Text className="font-medium text-xs text-gray-700 mb-1">
                        Attachments ({log.attachments.length})
                      </Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        <View className="flex-row gap-2">
                          {log.attachments.map((url, i) => (
                            <Image
                              key={i}
                              source={{ uri: url }}
                              className="w-14 h-14 rounded border border-gray-200"
                              resizeMode="cover"
                            />
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
