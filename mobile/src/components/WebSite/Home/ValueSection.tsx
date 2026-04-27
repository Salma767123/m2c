import React from 'react';
import { View, Text, ScrollView, Dimensions } from 'react-native';
import { Leaf, Award, Wind, Sun, Home } from 'lucide-react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.72;
const GAP = 14;

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
    <View className="bg-white py-12 border-t border-gray-100">
      {/* Header — matches web: title + subtitle, no teal eyebrow */}
      <View className="px-6 mb-8">
        <Text className="text-gray-900 text-2xl font-bold mb-3">
          Why Choose M2C MarkDowns
        </Text>
        <Text className="text-gray-600 text-sm leading-5">
          {"We're committed to quality, sustainability, and your comfort. Every product is crafted with care and attention to detail."}
        </Text>
      </View>

      {/* Horizontal carousel — same mobile pattern, but using web's grayscale */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={CARD_WIDTH + GAP}
        snapToAlignment="start"
        contentContainerStyle={{ paddingHorizontal: 24 }}
      >
        {features.map((feature) => (
          <View
            key={feature.title}
            style={{ width: CARD_WIDTH, marginRight: GAP }}
            className="bg-gray-50 p-6 rounded-3xl border border-gray-100"
          >
            <View
              className="bg-white rounded-2xl items-center justify-center mb-5"
              style={{
                width: 60,
                height: 60,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.06,
                shadowRadius: 6,
                elevation: 2,
              }}
            >
              <feature.icon size={26} color="#3d3d3d" strokeWidth={2.25} />
            </View>
            <Text className="text-gray-900 text-base font-semibold mb-2">
              {feature.title}
            </Text>
            <Text className="text-gray-600 text-sm leading-5">
              {feature.description}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
