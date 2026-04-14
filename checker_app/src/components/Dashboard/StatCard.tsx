import React from 'react';
import { View, Text } from 'react-native';
// Removed LucideIcon import

interface StatCardProps {
  label: string;
  value: string | number;
  icon: any;
  trend: string;
  color: 'blue' | 'amber' | 'emerald' | 'red';
}

export default function StatCard({ label, value, icon: Icon, trend, color }: StatCardProps) {
  const colorClasses = {
    blue: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      iconBg: 'bg-blue-500',
      iconText: '#ffffff',
      valueText: 'text-blue-900',
      trendText: 'text-blue-700',
    },
    amber: {
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      iconBg: 'bg-amber-500',
      iconText: '#ffffff',
      valueText: 'text-amber-900',
      trendText: 'text-amber-700',
    },
    emerald: {
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      iconBg: 'bg-emerald-500',
      iconText: '#ffffff',
      valueText: 'text-emerald-900',
      trendText: 'text-emerald-700',
    },
    red: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      iconBg: 'bg-red-500',
      iconText: '#ffffff',
      valueText: 'text-red-900',
      trendText: 'text-red-700',
    },
  };

  const colors = colorClasses[color];

  return (
    <View className={`w-[48%] mb-4 ${colors.bg} ${colors.border} border rounded-2xl p-4 shadow-sm`}>
      <View className="flex-row items-start justify-between mb-3">
        <View className="flex-1 mr-2">
          <Text className="text-gray-600 text-xs font-medium mb-1">{label}</Text>
          <Text className={`text-2xl font-bold ${colors.valueText} mb-0.5`} numberOfLines={1}>{value}</Text>
        </View>
        <View className={`${colors.iconBg} p-2 rounded-xl`}>
          <Icon color={colors.iconText} size={20} />
        </View>
      </View>
      <Text className={`${colors.trendText} text-[10px] font-medium`} numberOfLines={1}>{trend}</Text>
    </View>
  );
}
