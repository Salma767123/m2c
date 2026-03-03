import React from 'react';
import { Text, View, TouchableOpacity } from 'react-native';
import { Calendar, Eye, CheckCircle, XCircle, AlertCircle } from 'lucide-react-native';
import { router } from 'expo-router';

type Status = 'passed' | 'failed' | 'pending';

type RecentInspection = {
  id: string;
  vendor: string;
  po: string;
  status: Status;
  date: string;
};

const recentInspections: RecentInspection[] = [
  {
    id: 'RPT-001',
    vendor: 'Alpha Textiles Ltd',
    po: 'PO-2024-091',
    status: 'passed',
    date: '2024-02-25',
  },
  {
    id: 'RPT-002',
    vendor: 'Bright Garments',
    po: 'PO-2024-089',
    status: 'failed',
    date: '2024-02-24',
  },
  {
    id: 'RPT-003',
    vendor: 'Quality Fashions',
    po: 'PO-2024-087',
    status: 'passed',
    date: '2024-02-24',
  },
  {
    id: 'RPT-004',
    vendor: 'Modern Apparel Co',
    po: 'PO-2024-085',
    status: 'pending',
    date: '2024-02-23',
  },
];

export function RecentInspections() {
  const handleViewRecentDetail = (inspectionId: string) => {
    // Navigate to the report view page with the inspection ID as query parameter
    router.push(`/(tabs)/report/view?id=${inspectionId}`);
  };

  const renderStatusBadge = (status: Status) => {
    if (status === 'passed') {
      return (
        <View className="flex-row items-center gap-1 bg-emerald-100 px-3 py-1.5 rounded-full">
          <CheckCircle size={12} color="#059669" />
          <Text className="text-xs font-bold text-emerald-700">Passed</Text>
        </View>
      );
    }
    if (status === 'failed') {
      return (
        <View className="flex-row items-center gap-1 bg-red-100 px-3 py-1.5 rounded-full">
          <XCircle size={12} color="#dc2626" />
          <Text className="text-xs font-bold text-red-700">Failed</Text>
        </View>
      );
    }
    return (
      <View className="flex-row items-center gap-1 bg-amber-100 px-3 py-1.5 rounded-full">
        <AlertCircle size={12} color="#d97706" />
        <Text className="text-xs font-bold text-amber-700">Pending</Text>
      </View>
    );
  };

  return (
    <View>
      <View className="flex-row items-center justify-between mb-4">
        <Text className="text-lg font-bold text-gray-900">
          Recent Inspections
        </Text>
        <View className="bg-gray-200 px-3 py-1 rounded-full">
          <Text className="text-xs font-bold text-gray-700">{recentInspections.length} Total</Text>
        </View>
      </View>
      
      {recentInspections.map((inspection) => (
        <TouchableOpacity
          key={inspection.id}
          onPress={() => handleViewRecentDetail(inspection.id)}
          activeOpacity={0.7}
          className="mb-3 rounded-2xl bg-white p-4 shadow-sm border border-gray-100"
        >
          <View className="flex-row justify-between items-start mb-3">
            <View className="flex-1 mr-3">
              <Text className="text-base font-bold text-gray-900 mb-1">
                {inspection.vendor}
              </Text>
              <View className="flex-row items-center gap-1">
                <Text className="text-xs text-gray-500">PO:</Text>
                <Text className="text-xs font-semibold text-gray-700">{inspection.po}</Text>
              </View>
            </View>
            {renderStatusBadge(inspection.status)}
          </View>
          
          <View className="flex-row items-center justify-between pt-2 border-t border-gray-100">
            <View className="flex-row items-center gap-1.5">
              <Calendar size={12} color="#9ca3af" />
              <Text className="text-xs text-gray-600">Completed: {inspection.date}</Text>
            </View>
            <View className="flex-row items-center gap-1 bg-gray-900 p-2 rounded-md">
              <Eye size={14} color="#ffffff" />
              <Text className="text-xs font-semibold text-white">View Report</Text>
            </View>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
}