import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { FileText, CheckCircle, XCircle, Clock, Eye, Search } from 'lucide-react-native';

type ReportStatus = 'passed' | 'failed' | 'pending';

type InspectionReport = {
  id: string;
  vendor: string;
  po: string;
  status: ReportStatus;
  createdAt: string;
  cartons?: number;
  inspector?: string;
  client?: string;
  factory?: string;
  serviceLocation?: string;
};

const REPORTS: InspectionReport[] = [
  {
    id: 'RPT-001',
    vendor: 'Alpha Textiles Ltd',
    po: 'PO-2024-091',
    status: 'passed',
    createdAt: '2024-02-25',
    cartons: 50,
    inspector: 'John Smith',
    client: 'Fashion Forward Inc.',
    factory: 'Alpha Textiles Main Unit',
    serviceLocation: 'Bangalore, IN',
  },
  {
    id: 'RPT-002',
    vendor: 'Bright Garments',
    po: 'PO-2024-089',
    status: 'failed',
    createdAt: '2024-02-24',
    cartons: 75,
    inspector: 'John Smith',
    client: 'Style Co.',
    factory: 'Bright Garments Factory',
    serviceLocation: 'Tiruppur, IN',
  },
  {
    id: 'RPT-003',
    vendor: 'Quality Fashions',
    po: 'PO-2024-087',
    status: 'passed',
    createdAt: '2024-02-24',
    cartons: 100,
    inspector: 'John Smith',
    client: 'Premium Brands Ltd.',
    factory: 'Quality Fashions Manufacturing',
    serviceLocation: 'Mumbai, IN',
  },
  {
    id: 'RPT-004',
    vendor: 'Modern Apparel Co',
    po: 'PO-2024-085',
    status: 'pending',
    createdAt: '2024-02-23',
    cartons: 60,
    inspector: 'John Smith',
    client: 'Urban Wear Inc.',
    factory: 'Modern Apparel Factory',
    serviceLocation: 'Chennai, IN',
  },
  {
    id: 'RPT-005',
    vendor: 'Thread Masters',
    po: 'PO-2024-084',
    status: 'passed',
    createdAt: '2024-02-22',
    cartons: 45,
    inspector: 'John Smith',
    client: 'Textile World',
    factory: 'Thread Masters Unit',
    serviceLocation: 'Coimbatore, IN',
  },
];

export default function ReportsScreen() {
  const [checkerIdLoaded, setCheckerIdLoaded] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<ReportStatus | 'all'>('all');

  useEffect(() => {
    const checkAuth = async () => {
      const stored = await AsyncStorage.getItem('checkerID');
      if (!stored) {
        router.replace('/(auth)/Login');
        return;
      }
      setCheckerIdLoaded(true);
    };

    checkAuth();
  }, []);

  const filteredReports = useMemo(() => {
    let filtered = REPORTS;
    
    // Filter by search query
    const query = search.trim().toLowerCase();
    if (query) {
      filtered = filtered.filter((r) => {
        return (
          r.id.toLowerCase().includes(query) ||
          r.vendor.toLowerCase().includes(query) ||
          r.po.toLowerCase().includes(query) ||
          r.client?.toLowerCase().includes(query)
        );
      });
    }
    
    // Filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(r => r.status === filterStatus);
    }
    
    return filtered;
  }, [search, filterStatus]);

  const handleViewReport = (reportId: string) => {
    router.push(`/(tabs)/report/view?id=${reportId}`);
  };

  const renderStatusBadge = (status: ReportStatus) => {
    if (status === 'passed') {
      return (
        <View className="flex-row items-center gap-1 bg-emerald-100 px-2.5 py-1 rounded-full border border-emerald-200">
          <CheckCircle size={10} color="#059669" />
          <Text className="text-[10px] font-bold text-emerald-700">PASSED</Text>
        </View>
      );
    }
    if (status === 'failed') {
      return (
        <View className="flex-row items-center gap-1 bg-red-100 px-2.5 py-1 rounded-full border border-red-200">
          <XCircle size={10} color="#dc2626" />
          <Text className="text-[10px] font-bold text-red-700">FAILED</Text>
        </View>
      );
    }
    return (
      <View className="flex-row items-center gap-1 bg-amber-100 px-2.5 py-1 rounded-full border border-amber-200">
        <Clock size={10} color="#d97706" />
        <Text className="text-[10px] font-bold text-amber-700">PENDING</Text>
      </View>
    );
  };

  const getStatusCount = (status: ReportStatus) => {
    return REPORTS.filter(r => r.status === status).length;
  };

  if (!checkerIdLoaded) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-gray-50" contentContainerStyle={{ paddingBottom: 24 }}>
      {/* Header */}
      <View className="bg-white px-4 py-4 border-b border-gray-200">
        <Text className="text-2xl font-bold text-gray-900 mb-1">Inspection Reports</Text>
        <Text className="text-sm text-gray-600">
          View and download quality control reports
        </Text>
      </View>

      <View className="px-4 py-4">
        {/* Search */}
        <View className="flex-row items-center bg-white border border-gray-300 rounded-xl px-4 py-3 mb-4">
          <Search size={20} color="#9ca3af" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search by report ID, vendor, or PO"
            className="flex-1 ml-3 text-sm text-black"
            placeholderTextColor="#9ca3af"
          />
        </View>

        {/* Status Filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
          <View className="flex-row gap-2">
            {[
              { key: 'all', label: 'All Reports', count: REPORTS.length },
              { key: 'passed', label: 'Passed', count: getStatusCount('passed') },
              { key: 'failed', label: 'Failed', count: getStatusCount('failed') },
              { key: 'pending', label: 'Pending', count: getStatusCount('pending') }
            ].map((filter) => (
              <TouchableOpacity
                key={filter.key}
                onPress={() => setFilterStatus(filter.key as ReportStatus | 'all')}
                className={`px-4 py-2 rounded-xl border ${
                  filterStatus === filter.key
                    ? 'bg-gray-900 border-gray-900'
                    : 'bg-white border-gray-300'
                }`}
              >
                <Text className={`text-xs font-bold ${
                  filterStatus === filter.key ? 'text-white' : 'text-gray-700'
                }`}>
                  {filter.label} ({filter.count})
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Reports Header */}
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-base font-bold text-gray-900">
            Reports List
          </Text>
          <View className="bg-gray-200 px-3 py-1 rounded-full">
            <Text className="text-xs font-bold text-gray-700">{filteredReports.length} Reports</Text>
          </View>
        </View>
      </View>

      {/* Reports List */}
      <View className="px-4">
        {filteredReports.map((report) => (
          <View
            key={report.id}
            className="mb-3 rounded-2xl bg-white p-4 shadow-sm border border-gray-100"
          >
            <View className="flex-row justify-between items-start mb-3">
              <View className="flex-1 mr-3">
                <Text className="text-base font-bold text-gray-900 mb-1">
                  {report.vendor}
                </Text>
                <View className="flex-row items-center gap-2">
                  <View className="bg-gray-100 border border-gray-200 px-2 py-1 rounded">
                    <Text className="text-xs font-bold text-9ray-600">{report.po}</Text>
                  </View>
                  <Text className="text-xs text-gray-500">ID: {report.id}</Text>
                </View>
              </View>
              {renderStatusBadge(report.status)}
            </View>

            <View className="flex-row items-center justify-between mb-3 pb-3 border-b border-gray-100">
              <View className="flex-row items-center gap-4">
                <View>
                  <Text className="text-[10px] text-gray-500">Date</Text>
                  <Text className="text-xs font-semibold text-gray-900">{report.createdAt}</Text>
                </View>
                <View>
                  <Text className="text-[10px] text-gray-500">Cartons</Text>
                  <Text className="text-xs font-semibold text-gray-900">{report.cartons}</Text>
                </View>
                {report.client && (
                  <View>
                    <Text className="text-[10px] text-gray-500">Client</Text>
                    <Text className="text-xs font-semibold text-gray-900" numberOfLines={1}>
                      {report.client}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Action Button */}
            <TouchableOpacity
              onPress={() => handleViewReport(report.id)}
              className="flex-row items-center justify-center gap-2 bg-gray-900 rounded-xl py-2.5 border border-gray-200"
            >
              <Eye size={14} color="#ffffff" />
              <Text className="text-xs font-bold text-white">View Report</Text>
            </TouchableOpacity>
          </View>
        ))}

        {filteredReports.length === 0 && (
          <View className="mt-10 items-center bg-white rounded-2xl p-8 border border-gray-200">
            <FileText size={48} color="#d1d5db" />
            <Text className="text-sm text-gray-500 mt-3">
              No reports match your search criteria.
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}