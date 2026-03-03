import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ScheduledInspections } from './ScheduledInspections';
import { RecentInspections } from './RecentInspections';

type Priority = 'high' | 'medium' | 'low';

const stats = [
  { label: 'Total Inspections', value: '127' },
  { label: 'Pending Reports', value: '8' },
  { label: 'Passed', value: '118' },
  { label: 'Failed', value: '9' },
];

type CheckerDashboardProps = {
  checkerId: string | null;
};

export function CheckerDashboard({ checkerId }: CheckerDashboardProps) {
  const renderPriorityBadge = (priority: Priority) => {
    if (priority === 'high') {
      return (
        <View className="bg-red-500 px-2.5 py-1 rounded-full">
          <Text className="text-[10px] font-bold text-white">HIGH</Text>
        </View>
      );
    }
    if (priority === 'medium') {
      return (
        <View className="bg-amber-500 px-2.5 py-1 rounded-full">
          <Text className="text-[10px] font-bold text-white">MEDIUM</Text>
        </View>
      );
    }
    return (
      <View className="bg-emerald-500 px-2.5 py-1 rounded-full">
        <Text className="text-[10px] font-bold text-white">LOW</Text>
      </View>
    );
  };

  return (
    <ScrollView className="flex-1 bg-gray-50" contentContainerStyle={{ padding: 16, paddingBottom: 24 }}>
      {/* Header */}
      <View className="mb-6">
        <Text className="text-2xl font-bold text-gray-900 mb-1">Dashboard</Text>
        {checkerId && (
          <Text className="text-sm text-gray-600">
            Welcome back, <Text className="font-semibold text-gray-900">{checkerId}</Text>
          </Text>
        )}
      </View>

      {/* 2x2 stats grid */}
      <View className="flex-row flex-wrap -mx-1.5 mb-6">
        {stats.map((stat, index) => (
          <View key={stat.label} className="w-1/2 px-1.5 mb-3">
            <View className={`rounded-2xl p-4 border ${
              index === 0 ? 'bg-blue-50 border-blue-300' :
              index === 1 ? 'bg-indigo-50 border-indigo-300' :
              index === 2 ? 'bg-green-50 border-green-300' :
              'bg-purple-50 border-purple-300'
            }`}>
              <Text className="text-xs text-black mb-1">{stat.label}</Text>
              <Text className="text-3xl font-bold text-black">{stat.value}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Scheduled Inspections */}
      <ScheduledInspections />

      {/* Recent Inspections */}
      <RecentInspections />
    </ScrollView>
  );
}

