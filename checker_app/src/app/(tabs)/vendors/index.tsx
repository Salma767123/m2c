import React, { useEffect, useState } from 'react';
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
import { Search, Plus, MapPin, Package, TrendingUp } from 'lucide-react-native';

type MobileVendor = {
  id: string;
  name: string;
  location: string;
  category: string;
  openPos: number;
  status: 'active' | 'pending' | 'review';
  recentPO?: string;
  performance?: {
    totalInspections: number;
    passRate: number;
    averageScore: number;
    onTimeDelivery: number;
  };
};

const MOCK_VENDORS: MobileVendor[] = [
  {
    id: 'VEN-001',
    name: 'Alpha Textiles Ltd',
    location: 'Bangalore, IN',
    category: 'Cotton Textiles',
    openPos: 4,
    status: 'active',
    recentPO: 'PO-2024-001',
    performance: {
      totalInspections: 45,
      passRate: 92,
      averageScore: 8.5,
      onTimeDelivery: 88
    }
  },
  {
    id: 'VEN-002',
    name: 'Bright Garments',
    location: 'Tiruppur, IN',
    category: 'Garments',
    openPos: 3,
    status: 'active',
    recentPO: 'PO-2024-002',
    performance: {
      totalInspections: 32,
      passRate: 87,
      averageScore: 8.2,
      onTimeDelivery: 85
    }
  },
  {
    id: 'VEN-003',
    name: 'Quality Fashions',
    location: 'Mumbai, IN',
    category: 'Fashion',
    openPos: 2,
    status: 'active',
    recentPO: 'PO-2024-003',
    performance: {
      totalInspections: 28,
      passRate: 95,
      averageScore: 9.1,
      onTimeDelivery: 92
    }
  }
];

export default function VendorsScreen() {
  const [checkerIdLoaded, setCheckerIdLoaded] = useState(false);
  const [search, setSearch] = useState('');
  const [vendors, setVendors] = useState<MobileVendor[]>(MOCK_VENDORS);

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

  const filteredVendors = vendors.filter(vendor =>
    vendor.name.toLowerCase().includes(search.toLowerCase()) ||
    vendor.location.toLowerCase().includes(search.toLowerCase()) ||
    vendor.category.toLowerCase().includes(search.toLowerCase())
  );

  const handleViewVendor = (vendorId: string) => {
    router.push(`/(tabs)/vendors/view?id=${vendorId}`);
  };

  const handleAddInspection = (vendorId: string) => {
    router.push(`/(tabs)/vendors/add?vendorId=${vendorId}`);
  };

  const getStatusColor = (status: string) => {
    const colors = {
      active: "bg-emerald-100 text-white border-emerald-200",
      pending: "bg-amber-100 text-amber-800 border-amber-200",
      review: "bg-blue-100 text-blue-800 border-blue-200"
    };
    return colors[status as keyof typeof colors] || colors.active;
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
        <Text className="text-2xl font-bold text-gray-900 mb-1">Vendors</Text>
        <Text className="text-sm text-gray-600">
          Manage vendor relationships and inspections
        </Text>
      </View>

      <View className="px-4 py-4">
        {/* Search */}
        <View className="flex-row items-center bg-white border border-gray-300 rounded-xl px-4 py-3 mb-4">
          <Search size={20} color="#9ca3af" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search vendors..."
            className="flex-1 ml-3 text-sm text-black"
            placeholderTextColor="#9ca3af"
          />
        </View>

        {/* Vendors List */}
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-lg font-bold text-gray-900">
            Vendors List
          </Text>
          <View className="bg-gray-200 px-3 py-1 rounded-full">
            <Text className="text-xs font-bold text-gray-700">{filteredVendors.length} Found</Text>
          </View>
        </View>
      </View>

      {/* Vendors Cards */}
      <View className="px-4">
        {filteredVendors.map((vendor) => (
          <View
            key={vendor.id}
            className="mb-3 rounded-2xl bg-white p-4 shadow-sm border border-gray-100"
          >
            <View className="flex-row justify-between items-start mb-3">
              <View className="flex-1 mr-3">
                <Text className="text-base font-bold text-gray-900 mb-1">
                  {vendor.name}
                </Text>
                <View className="flex-row items-center gap-1 mb-1">
                  <MapPin size={12} color="#6b7280" />
                  <Text className="text-xs text-gray-600">{vendor.location}</Text>
                </View>
                <Text className="text-xs text-gray-500">{vendor.category}</Text>
              </View>
              <View className={`px-3 py-1 rounded-full border ${getStatusColor(vendor.status)}`}>
                <Text className="text-xs ">{vendor.status}</Text>
              </View>
            </View>
            {/* Action Buttons */}
            <View className="flex-row gap-2">
              <TouchableOpacity
                onPress={() => handleViewVendor(vendor.id)}
                className="flex-1 flex-row items-center justify-center gap-2 bg-gray-100 rounded-xl py-2.5 border border-gray-200"
              >
                <Text className="text-xs font-bold text-gray-700">View Details</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleAddInspection(vendor.id)}
                className="flex-1 flex-row items-center justify-center gap-2 bg-gray-900 rounded-xl py-2.5"
              >
                <Plus size={14} color="#ffffff" />
                <Text className="text-xs font-bold text-white">New Inspection</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {filteredVendors.length === 0 && (
          <View className="mt-10 items-center bg-white rounded-2xl p-8 border border-gray-200">
            <Search size={48} color="#d1d5db" />
            <Text className="text-sm text-gray-500 mt-3">
              No vendors match your search.
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}