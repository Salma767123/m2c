import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { FileText, CheckCircle, XCircle, AlertTriangle, Eye, Factory } from 'lucide-react-native';

import qcCheckerService from '../../../services/qcCheckerService';

export default function ReportsScreen() {
  const [inspections, setInspections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        setLoading(true);
        const res = await qcCheckerService.getInspections();
        if (res.success) {
          // Only show COMPLETED inspections as submitted reports
          const completed = (res.inspections || []).filter(
            (insp: any) => insp.status === 'COMPLETED'
          );
          setInspections(completed);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load reports');
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, []);

  const getResultBadge = (result: string) => {
    switch (result) {
      case 'PASSED':
        return (
          <View className="flex-row items-center gap-1 bg-emerald-100 px-2.5 py-1 rounded-full border border-emerald-200">
            <CheckCircle size={10} color="#059669" />
            <Text className="text-[10px] font-bold text-emerald-700">Passed</Text>
          </View>
        );
      case 'FAILED':
        return (
          <View className="flex-row items-center gap-1 bg-red-100 px-2.5 py-1 rounded-full border border-red-200">
            <XCircle size={10} color="#dc2626" />
            <Text className="text-[10px] font-bold text-red-700">Failed</Text>
          </View>
        );
      default:
        return (
          <View className="bg-gray-100 px-2.5 py-1 rounded-full border border-gray-200">
            <Text className="text-[10px] font-bold text-gray-700">{result || '—'}</Text>
          </View>
        );
    }
  };

  // Build display data from the real inspection + its formData (itemsToInspect)
  const buildRow = (insp: any) => {
    const fd = insp.itemsToInspect && !Array.isArray(insp.itemsToInspect) ? insp.itemsToInspect : {};
    return {
      id: insp.id,
      vendor: insp.vendor?.companyName || fd.vendorName || '—',
      poNumber: insp.poNumber || '—',
      factoryName: fd.factoryName || '—',
      inspectionDate: insp.completedAt
        ? new Date(insp.completedAt).toLocaleDateString('en-IN')
        : insp.scheduledDate || '—',
      result: insp.result || '—',
      inspectorName: fd.inspectorName || insp.checker?.name || '—',
      clientName: insp.clientName || '—',
    };
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color="#2563eb" />
        <Text className="mt-4 text-gray-500 text-sm">Loading your reports...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 px-6">
        <AlertTriangle size={40} color="#f59e0b" />
        <Text className="mt-4 text-gray-600 text-sm text-center">{error}</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-gray-50" contentContainerStyle={{ paddingBottom: 100 }}>
      {/* Header */}
      <View className="px-5 pt-5 pb-4 flex-row items-center justify-between">
        <View>
          <Text className="text-3xl font-extrabold text-gray-900 mb-1">Inspection Reports</Text>
          <Text className="text-gray-500 text-sm">Your completed factory quality control reports</Text>
        </View>
        <View className="bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-xl">
          <Text className="text-xs font-bold text-blue-700">
            {inspections.length} Report{inspections.length !== 1 ? 's' : ''}
          </Text>
        </View>
      </View>

      {/* Card */}
      <View className="mx-4 bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {/* Card Header */}
        <View className="px-5 py-4 border-b border-gray-100 bg-gray-50 flex-row items-center">
          <View className="p-2 bg-blue-100 rounded-lg mr-3">
            <FileText size={18} color="#2563eb" />
          </View>
          <View>
            <Text className="text-lg font-bold text-gray-900">Completed Inspections</Text>
            <Text className="text-xs text-gray-500">Factory inspection reports you have submitted</Text>
          </View>
        </View>

        {/* Content */}
        <View className="p-4">
          {inspections.length === 0 ? (
            <View className="items-center justify-center py-12">
              <View className="p-4 bg-gray-100 rounded-2xl mb-3">
                <Factory size={40} color="#9ca3af" />
              </View>
              <Text className="text-base font-bold text-gray-700 mb-1">No reports yet</Text>
              <Text className="text-sm text-gray-500 text-center">
                Completed factory inspections will appear here.
              </Text>
            </View>
          ) : (
            <View className="gap-y-3">
              {inspections.map((insp) => {
                const row = buildRow(insp);
                return (
                  <View key={insp.id} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                    {/* Vendor & Result */}
                    <View className="flex-row items-start justify-between mb-3">
                      <View className="flex-1 mr-3">
                        <Text className="text-base font-bold text-gray-900 mb-0.5" numberOfLines={1}>
                          {row.vendor}
                        </Text>
                        <Text className="text-xs text-gray-500">{row.factoryName}</Text>
                      </View>
                      {getResultBadge(row.result)}
                    </View>

                    {/* Details */}
                    <View className="flex-row flex-wrap mb-3 pb-3 border-b border-gray-200">
                      <View className="w-1/3 mb-2">
                        <Text className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">PO Number</Text>
                        {row.poNumber !== '—' ? (
                          <View className="bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded self-start mt-0.5">
                            <Text className="text-[10px] font-bold text-blue-600 font-mono">{row.poNumber}</Text>
                          </View>
                        ) : (
                          <Text className="text-xs text-gray-400 mt-0.5">—</Text>
                        )}
                      </View>
                      <View className="w-1/3 mb-2">
                        <Text className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Client</Text>
                        <Text className="text-xs text-gray-700 font-medium mt-0.5" numberOfLines={1}>{row.clientName}</Text>
                      </View>
                      <View className="w-1/3 mb-2">
                        <Text className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Completed</Text>
                        <Text className="text-xs text-gray-700 font-medium mt-0.5">{row.inspectionDate}</Text>
                      </View>
                    </View>

                    {/* Action */}
                    <TouchableOpacity
                      onPress={() => router.push(`/(tabs)/report/view?id=${insp.id}`)}
                      className="flex-row items-center justify-center gap-1.5 bg-blue-50 border border-blue-200 rounded-xl py-2.5"
                    >
                      <Eye size={14} color="#1d4ed8" />
                      <Text className="text-xs font-bold text-blue-700">View Report</Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
}
