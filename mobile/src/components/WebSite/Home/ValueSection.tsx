import React from 'react';
import { View, Text } from 'react-native';
import { Leaf, Award, Wind, Sun, Home } from 'lucide-react-native';

type Feature = {
  icon: React.ComponentType<{ color?: string; size?: number; strokeWidth?: number }>;
  title: string;
  description: string;
};

const features: Feature[] = [
  {
    icon: Leaf,
    title: '100% Cotton',
    description: 'Pure, natural fibers for ultimate comfort and breathability.',
  },
  {
    icon: Award,
    title: 'OEKO-TEX Certified',
    description: 'Tested for harmful substances. Safe for you and your family.',
  },
  {
    icon: Wind,
    title: 'Breathable Fabric',
    description: 'Temperature-regulating weave keeps you cool all night.',
  },
  {
    icon: Sun,
    title: 'Fade-Resistant',
    description: 'Colors stay vibrant wash after wash, year after year.',
  },
  {
    icon: Home,
    title: 'Designed for USA Homes',
    description: 'Perfect fit for standard American mattress sizes.',
  },
];

export default function ValueSection() {
  return (
    <View className="bg-white px-4 py-8 border-t border-gray-100">
      {/* Header */}
      <View className="items-center mb-6">
        <Text className="text-2xl font-bold text-gray-900 text-center mb-2">
          Why Choose M2C MarkDowns
        </Text>
        <Text className="text-sm text-gray-600 text-center leading-relaxed" style={{ maxWidth: 320 }}>
          We're committed to quality, sustainability, and your comfort. Every product is crafted with care.
        </Text>
      </View>

      {/* Features - 2-column grid on mobile */}
      <View className="flex-row flex-wrap justify-between">
        {features.map((feature) => (
          <View
            key={feature.title}
            className="w-[48%] mb-5 items-center"
          >
            <View
              className="bg-gray-50 rounded-2xl items-center justify-center mb-3"
              style={{
                width: 56,
                height: 56,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.08,
                shadowRadius: 4,
                elevation: 2,
              }}
            >
              <feature.icon size={26} color="#3d3d3d" strokeWidth={2} />
            </View>
            <Text
              className="text-sm font-semibold text-gray-900 mb-1 text-center"
              numberOfLines={2}
            >
              {feature.title}
            </Text>
            <Text
              className="text-xs text-gray-600 text-center leading-relaxed"
              numberOfLines={3}
            >
              {feature.description}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
