import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Calendar, Clock, MapPin, Package, Eye, Play } from 'lucide-react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Priority = 'high' | 'medium' | 'low';

type ScheduledInspection = {
  id: string;
  vendor: string;
  po: string;
  scheduledDate: string;
  scheduledTime: string;
  priority: Priority;
  location: string;
  itemsCount: number;
  estimatedDuration: string;
};

const scheduledInspections: ScheduledInspection[] = [
  {
    id: 'SCH-001',
    vendor: 'Alpha Textiles Ltd',
    po: 'PO-2024-001',
    scheduledDate: '2024-03-01',
    scheduledTime: '10:00 AM',
    priority: 'high',
    location: 'Bangalore, IN',
    itemsCount: 4,
    estimatedDuration: '3 hours',
  },
  {
    id: 'SCH-002',
    vendor: 'Bright Garments',
    po: 'PO-2024-002',
    scheduledDate: '2024-03-02',
    scheduledTime: '02:30 PM',
    priority: 'medium',
    location: 'Tiruppur, IN',
    itemsCount: 3,
    estimatedDuration: '2 hours',
  },
  {
    id: 'SCH-003',
    vendor: 'Quality Fashions',
    po: 'PO-2024-003',
    scheduledDate: '2024-03-03',
    scheduledTime: '11:15 AM',
    priority: 'low',
    location: 'Mumbai, IN',
    itemsCount: 2,
    estimatedDuration: '1.5 hours',
  },
];

export function ScheduledInspections() {
  const handleViewDetail = async (inspectionId: string) => {
    try {
      const inspection = scheduledInspections.find(i => i.id === inspectionId);
      if (!inspection) {
        return;
      }

      // Save inspection details to AsyncStorage
      await AsyncStorage.setItem('selectedInspection', JSON.stringify(inspection));
      
      // Navigate to vendor detail view with inspection ID
      router.push(`/(tabs)/vendors/view?id=${inspectionId}` as any);
    } catch (error) {
      console.error('Error viewing inspection detail:', error);
    }
  };

  const handleStartInspection = async (inspectionId: string) => {
    try {
      const inspection = scheduledInspections.find(i => i.id === inspectionId);
      if (!inspection) {
        return;
      }

      // Save current inspection data
      await AsyncStorage.setItem('currentInspection', JSON.stringify({
        ...inspection,
        startedAt: new Date().toISOString(),
        status: 'in_progress'
      }));

      // Navigate to quality inspection form
      router.push(`/(tabs)/vendors/add?vendorId=${inspectionId}&vendorName=${encodeURIComponent(inspection.vendor)}` as any);
    } catch (error) {
      console.error('Error starting inspection:', error);
    }
  };

  const renderPriorityBadge = (priority: Priority) => {
    if (priority === 'high') {
      return (
        <View className="bg-red-100 px-2.5 py-1 rounded-full">
          <Text className="text-[10px] font-bold text-red-700">High</Text>
        </View>
      );
    }
    if (priority === 'medium') {
      return (
        <View className="bg-amber-100 px-2.5 py-1 rounded-full">
          <Text className="text-[10px] font-bold text-amber-700">Medium</Text>
        </View>
      );
    }
    return (
      <View className="bg-emerald-100 px-2.5 py-1 rounded-full">
        <Text className="text-[10px] font-bold text-emerald-700">Low</Text>
      </View>
    );
  };

  return (
    <View className="mb-6">
      <View className="flex-row items-center justify-between mb-4">
        <Text className="text-lg font-bold text-gray-900">
          Scheduled Inspections
        </Text>
        <View className="bg-blue-100 px-3 py-1 rounded-full">
          <Text className="text-xs font-bold text-blue-700">{scheduledInspections.length} Upcoming</Text>
        </View>
      </View>
      
      {scheduledInspections.map((inspection) => (
        <View
          key={inspection.id}
          className="mb-4 rounded-2xl bg-white p-4 shadow-sm border border-gray-100"
        >
          {/* Header with vendor and priority */}
          <View className="flex-row justify-between items-start mb-3">
            <View className="flex-1 mr-3">
              <Text className="text-base font-bold text-gray-900 mb-1">
                {inspection.vendor}
              </Text>
              <View className="flex-row items-center gap-1">
                <MapPin size={12} color="#6b7280" />
                <Text className="text-xs text-gray-600">{inspection.location}</Text>
              </View>
            </View>
            {renderPriorityBadge(inspection.priority)}
          </View>

          {/* PO Number */}
          <View className="bg-gray-50 rounded-lg px-3 py-2 mb-3">
            <Text className="text-xs text-gray-600">Purchase Order</Text>
            <Text className="text-sm font-bold text-gray-900">{inspection.po}</Text>
          </View>

          {/* Details Grid */}
          <View className="flex-row flex-wrap mb-3">
            <View className="w-1/2 mb-2">
              <View className="flex-row items-center gap-1.5">
                <Calendar size={14} color="#6b7280" />
                <View>
                  <Text className="text-[10px] text-gray-500">Date</Text>
                  <Text className="text-xs font-semibold text-gray-900">{inspection.scheduledDate}</Text>
                </View>
              </View>
            </View>
            <View className="w-1/2 mb-2">
              <View className="flex-row items-center gap-1.5">
                <Clock size={14} color="#6b7280" />
                <View>
                  <Text className="text-[10px] text-gray-500">Time</Text>
                  <Text className="text-xs font-semibold text-gray-900">{inspection.scheduledTime}</Text>
                </View>
              </View>
            </View>
            <View className="w-1/2">
              <View className="flex-row items-center gap-1.5">
                <Package size={14} color="#6b7280" />
                <View>
                  <Text className="text-[10px] text-gray-500">Items</Text>
                  <Text className="text-xs font-semibold text-gray-900">{inspection.itemsCount} items</Text>
                </View>
              </View>
            </View>
            <View className="w-1/2">
              <View className="flex-row items-center gap-1.5">
                <Clock size={14} color="#6b7280" />
                <View>
                  <Text className="text-[10px] text-gray-500">Duration</Text>
                  <Text className="text-xs font-semibold text-gray-900">{inspection.estimatedDuration}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          <View className="flex-row gap-2 mt-2">
            <TouchableOpacity
              onPress={() => handleViewDetail(inspection.id)}
              className="flex-1 flex-row items-center justify-center gap-2 bg-gray-100 rounded-xl py-3 border border-gray-200"
            >
              <Eye size={16} color="#374151" />
              <Text className="text-sm font-bold text-gray-700">View Detail</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleStartInspection(inspection.id)}
              className="flex-1 flex-row items-center justify-center gap-2 bg-gray-900 rounded-xl py-3 shadow-sm"
            >
              <Play size={16} color="#ffffff" />
              <Text className="text-sm font-bold text-white">Start</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </View>
  );
}