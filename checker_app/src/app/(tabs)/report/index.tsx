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

import { qcCheckerService } from '../../../services/qcCheckerService';

type ReportStatus = 'PASSED' | 'FAILED' | 'PENDING' | 'COMPLETED' | 'CONDITIONALLY_PASSED' | string;

export default function ReportsScreen() {
  const [checkerIdLoaded, setCheckerIdLoaded] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<ReportStatus | 'all'>('all');
  const [inspections, setInspections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const stored = await AsyncStorage.getItem('checkerID');
        if (!stored) {
          router.replace('/(auth)/Login');
          return;
        }
        setCheckerIdLoaded(true);

        const response = await qcCheckerService.getInspections();
        if (response && response.success) {
          setInspections(response.inspections || []);
        }
      } catch (error) {
        console.error("Failed to load generic reports:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const filteredReports = useMemo(() => {
    let filtered = inspections;
    
    // Filter by search query
    const query = search.trim().toLowerCase();
    if (query) {
      filtered = filtered.filter((r) => {
        return (
          r.id?.toLowerCase().includes(query) ||
          r.vendor?.name?.toLowerCase().includes(query) ||
          r.vendorName?.toLowerCase().includes(query) ||
          r.poNumber?.toLowerCase().includes(query) ||
          r.clientName?.toLowerCase().includes(query)
        );
      });
    }
    
    // Filter by status
    if (filterStatus !== 'all') {
      if (filterStatus === 'PASSED') {
         filtered = filtered.filter(r => r.status === 'COMPLETED' || r.status === 'PASSED' || r.result === 'PASSED' || r.result === 'QC_APPROVED');
      } else if (filterStatus === 'FAILED') {
         filtered = filtered.filter(r => r.status === 'REJECTED' || r.result === 'FAILED');
      } else {
         filtered = filtered.filter(r => r.status === filterStatus);
      }
    }
    
    return filtered;
  }, [search, filterStatus, inspections]);

  const handleViewReport = (reportId: string) => {
    router.push(`/(tabs)/report/view?id=${reportId}`);
  };

  const renderStatusBadge = (status: string, result?: string) => {
    const checkValue = result || status;
    if (checkValue === 'PASSED' || checkValue === 'COMPLETED' || checkValue === 'QC_APPROVED' || checkValue === 'passed') {
      return (
        <View className="flex-row items-center gap-1 bg-emerald-100 px-2.5 py-1 rounded-full border border-emerald-200">
          <CheckCircle size={10} color="#059669" />
          <Text className="text-[10px] font-bold text-emerald-700">PASSED</Text>
        </View>
      );
    }
    if (checkValue === 'FAILED' || checkValue === 'REJECTED' || checkValue === 'failed') {
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
        <Text className="text-[10px] font-bold text-amber-700">{(checkValue || 'PENDING').toUpperCase()}</Text>
      </View>
    );
  };

  const getStatusCount = (targetStatus: ReportStatus) => {
    if (targetStatus === 'PASSED') {
       return inspections.filter(r => r.status === 'COMPLETED' || r.status === 'PASSED' || r.result === 'PASSED').length;
    }
    if (targetStatus === 'FAILED') {
       return inspections.filter(r => r.status === 'REJECTED' || r.result === 'FAILED').length;
    }
    return inspections.filter(r => r.status === targetStatus).length;
  };

  if (!checkerIdLoaded || loading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text className="mt-4 text-gray-500 font-medium tracking-wide">Fetching Reports...</Text>
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
              { key: 'all', label: 'All Reports', count: inspections.length },
              { key: 'PASSED', label: 'Passed', count: getStatusCount('PASSED') },
              { key: 'FAILED', label: 'Failed', count: getStatusCount('FAILED') },
              { key: 'SCHEDULED', label: 'Scheduled', count: getStatusCount('SCHEDULED') },
              { key: 'IN_PROGRESS', label: 'In Progress', count: getStatusCount('IN_PROGRESS') }
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
                <Text className="text-base font-bold text-gray-900 mb-1" numberOfLines={1}>
                  {report.vendor?.name || report.vendor?.companyName || report.vendorName || "Unknown Vendor"}
                </Text>
                <View className="flex-row items-center gap-2">
                  <View className="bg-gray-100 border border-gray-200 px-2 py-1 rounded">
                    <Text className="text-[10px] font-bold text-gray-700 font-mono">{report.poNumber || "PO-NA"}</Text>
                  </View>
                  <Text className="text-[10px] text-gray-500 font-mono">ID: {report.id?.substring(0,8)}</Text>
                </View>
              </View>
              {renderStatusBadge(report.status, report.result)}
            </View>

            <View className="flex-row items-center justify-between mb-3 pb-3 border-b border-gray-100">
              <View className="flex-row items-center gap-4">
                <View>
                  <Text className="text-[10px] text-gray-500">Date</Text>
                  <Text className="text-xs font-semibold text-gray-900">{new Date(report.createdAt).toLocaleDateString()}</Text>
                </View>
                <View>
                  <Text className="text-[10px] text-gray-500">Scheduled</Text>
                  <Text className="text-xs font-semibold text-gray-900">{report.scheduledDate || "N/A"}</Text>
                </View>
                {report.clientName && (
                  <View>
                    <Text className="text-[10px] text-gray-500">Client</Text>
                    <Text className="text-xs font-semibold text-gray-900" numberOfLines={1}>
                      {report.clientName}
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
              <Text className="text-xs font-bold text-white">View Report Data</Text>
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