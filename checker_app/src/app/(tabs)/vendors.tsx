import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import {
  Search,
  Factory,
  MapPin,
  CalendarDays,
  ArrowRight,
  Eye,
  CheckCircle,
  AlertCircle,
  RefreshCw,
} from 'lucide-react-native';
import qcCheckerService from '../../services/qcCheckerService';
import { router } from 'expo-router';

type InspectionStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | null;

interface Vendor {
  id: string;
  name: string;
  location: string;
  recentPO: string;
  status: string;
  inspectionStatus: InspectionStatus;
  contactPerson: {
    name?: string;
    designation: string;
    phone?: string;
    email?: string;
  };
  factory: {
    name: string;
    address?: string;
    manager: string;
    managerPhone: string;
    workingHours: string;
  };
  performance: {
    totalInspections: number;
    passRate: number;
    averageScore: number;
    onTimeDelivery: number;
  };
}

const getStatusStyle = (status: string) => {
  const map: Record<string, { bg: string; text: string; border: string }> = {
    APPROVED: {
      bg: 'bg-emerald-100',
      text: 'text-emerald-800',
      border: 'border-emerald-200',
    },
    PENDING: {
      bg: 'bg-amber-100',
      text: 'text-amber-800',
      border: 'border-amber-200',
    },
    UNDER_REVIEW: {
      bg: 'bg-blue-100',
      text: 'text-blue-800',
      border: 'border-blue-200',
    },
    REJECTED: {
      bg: 'bg-red-100',
      text: 'text-red-800',
      border: 'border-red-200',
    },
    SUSPENDED: {
      bg: 'bg-slate-100',
      text: 'text-slate-800',
      border: 'border-slate-200',
    },
  };
  return map[status] || map.PENDING;
};

const formatStatus = (status: string) =>
  status.replace(/_/g, ' ').toLowerCase();

export default function VendorsTab() {
  const [searchTerm, setSearchTerm] = useState('');
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchVendors = useCallback(async () => {
    try {
      setError(null);
      const [vendorsRes, inspectionsRes] = await Promise.all([
        qcCheckerService.getAssignedVendors(),
        qcCheckerService.getInspections(),
      ]);

      if (vendorsRes.success) {
        const inspections = inspectionsRes.success
          ? inspectionsRes.inspections
          : [];

        const formatted: Vendor[] = (vendorsRes.data || []).map((v: any) => {
          const vendorInspection = inspections.find(
            (i: any) => i.vendorId === v.id,
          );
          return {
            id: v.id,
            name: v.companyName,
            location: `${v.factoryCity || 'Unknown City'}, ${v.factoryState || 'Unknown State'}`,
            recentPO: v.submittedAt
              ? new Date(v.submittedAt).toLocaleDateString()
              : 'N/A',
            status: v.status,
            inspectionStatus: vendorInspection?.status || null,
            contactPerson: {
              name: v.ownerName,
              designation: 'Owner',
              phone: v.businessPhone,
              email: v.businessEmail,
            },
            factory: {
              name: v.companyName,
              address: v.factoryAddress,
              manager: 'N/A',
              managerPhone: 'N/A',
              workingHours: 'N/A',
            },
            performance: {
              totalInspections: 0,
              passRate: 0,
              averageScore: 0,
              onTimeDelivery: 0,
            },
          };
        });
        setVendors(formatted);
      } else {
        setError('Failed to load vendors');
      }
    } catch (err: any) {
      console.error('Failed to fetch assigned vendors:', err);
      setError(err?.message || 'Failed to load vendors');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchVendors();
  }, [fetchVendors]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchVendors();
  }, [fetchVendors]);

  const filteredVendors = vendors.filter(
    (v) =>
      v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.location.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const handleViewDetails = (vendor: Vendor) => {
    router.push({
      pathname: '/vendors/[id]' as any,
      params: { id: vendor.id, name: vendor.name },
    });
  };

  const handleStartInspection = (vendor: Vendor) => {
    router.push({
      pathname: '/vendors/[id]/inspection' as any,
      params: { id: vendor.id, name: vendor.name },
    });
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <ActivityIndicator size="large" color="#2563eb" />
        <Text className="mt-4 text-slate-600">Loading vendors...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 px-8">
        <View className="w-20 h-20 rounded-full bg-red-50 items-center justify-center mb-5">
          <AlertCircle size={36} color="#dc2626" strokeWidth={1.75} />
        </View>
        <Text className="text-xl font-bold text-slate-900 mb-2 text-center">
          Something went wrong
        </Text>
        <Text className="text-base text-slate-600 text-center mb-6">
          {error}
        </Text>
        <TouchableOpacity
          onPress={fetchVendors}
          accessibilityLabel="Retry loading vendors"
          accessibilityRole="button"
          activeOpacity={0.85}
          className="flex-row items-center bg-blue-600 rounded-xl px-6 py-3"
        >
          <RefreshCw size={18} color="#ffffff" strokeWidth={2.25} />
          <Text className="text-white font-bold text-base ml-2">Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#2563eb"
          colors={['#2563eb']}
        />
      }
    >
      <View className="mb-6">
        <Text className="text-3xl font-extrabold text-slate-900 mb-1">
          Vendor Management
        </Text>
        <Text className="text-slate-600 text-sm">
          Select a vendor to start quality inspection
        </Text>
      </View>

      <View className="mb-6 flex-row items-center bg-white border border-slate-300 rounded-xl px-4 py-3 shadow-sm">
        <Search size={20} color="#94a3b8" />
        <TextInput
          placeholder="Search vendors by name or location..."
          value={searchTerm}
          onChangeText={setSearchTerm}
          className="flex-1 ml-3 text-base text-slate-900"
          placeholderTextColor="#94a3b8"
          accessibilityLabel="Search vendors"
        />
      </View>

      <View style={{ rowGap: 16 }}>
        {filteredVendors.map((vendor) => {
          const statusStyle = getStatusStyle(vendor.status);
          const isCompleted = vendor.inspectionStatus === 'COMPLETED';
          const isInProgress = vendor.inspectionStatus === 'IN_PROGRESS';

          return (
            <View
              key={vendor.id}
              className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5"
            >
              <View className="flex-row items-start justify-between mb-4">
                <View className="flex-row items-center flex-1 mr-2">
                  <View className="p-2.5 bg-blue-100 rounded-xl mr-3">
                    <Factory size={22} color="#2563eb" />
                  </View>
                  <View className="flex-1">
                    <Text
                      className="font-bold text-slate-900 text-base leading-tight"
                      numberOfLines={2}
                    >
                      {vendor.name}
                    </Text>
                  </View>
                </View>
                <View
                  className={`px-2.5 py-1 rounded-full border ${statusStyle.bg} ${statusStyle.border}`}
                >
                  <Text
                    className={`text-[10px] font-bold capitalize ${statusStyle.text}`}
                  >
                    {formatStatus(vendor.status)}
                  </Text>
                </View>
              </View>

              <View style={{ rowGap: 10 }} className="mb-5">
                <View className="flex-row items-center">
                  <MapPin size={14} color="#64748b" />
                  <Text
                    className="text-sm text-slate-600 ml-2 flex-1"
                    numberOfLines={1}
                  >
                    {vendor.location}
                  </Text>
                </View>
                <View className="flex-row items-center">
                  <CalendarDays size={14} color="#64748b" />
                  <View className="ml-2 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                    <Text className="text-xs font-mono text-slate-600">
                      Joined: {vendor.recentPO}
                    </Text>
                  </View>
                </View>
              </View>

              <View className="flex-row" style={{ columnGap: 8 }}>
                <TouchableOpacity
                  onPress={() => handleViewDetails(vendor)}
                  accessibilityLabel={`View details for ${vendor.name}`}
                  accessibilityRole="button"
                  activeOpacity={0.8}
                  className="flex-1 flex-row items-center justify-center py-2.5 rounded-lg bg-slate-100"
                >
                  <Eye size={16} color="#475569" />
                  <Text className="ml-2 font-semibold text-slate-700 text-sm">
                    Details
                  </Text>
                </TouchableOpacity>

                {isCompleted ? (
                  <View className="flex-1 flex-row items-center justify-center py-2.5 rounded-lg bg-emerald-100 border border-emerald-200">
                    <CheckCircle size={16} color="#065f46" />
                    <Text className="ml-2 font-bold text-emerald-800 text-sm">
                      Completed
                    </Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    onPress={() => handleStartInspection(vendor)}
                    accessibilityLabel={
                      isInProgress
                        ? `Continue inspection for ${vendor.name}`
                        : `Start inspection for ${vendor.name}`
                    }
                    accessibilityRole="button"
                    activeOpacity={0.85}
                    className="flex-1 flex-row items-center justify-center py-2.5 bg-blue-600 rounded-lg"
                  >
                    <Text className="mr-2 font-semibold text-white text-sm">
                      {isInProgress ? 'Continue' : 'Start'}
                    </Text>
                    <ArrowRight size={16} color="#ffffff" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })}

        {filteredVendors.length === 0 && (
          <View className="py-16 items-center justify-center">
            <View className="bg-slate-100 p-6 rounded-2xl mb-4">
              <Factory size={48} color="#94a3b8" />
            </View>
            <Text className="text-lg font-bold text-slate-900 mb-1">
              No vendors found
            </Text>
            <Text className="text-slate-600 text-sm">
              {searchTerm
                ? 'Try adjusting your search criteria'
                : 'No vendors assigned yet'}
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
