import React from 'react';
import { View, Text, Dimensions, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Leaf, Award, Wind, Sun, Home } from 'lucide-react-native';
import SectionHeading from './SectionHeading';

const { width: SCREEN_W } = Dimensions.get('window');
const H_PAD = 24;
const GAP = 14;
const TILE_W = (SCREEN_W - H_PAD * 2 - GAP) / 2;

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
    <View style={s.wrap}>
      {/* Header — eyebrow + title + description, centred like the web section. */}
      <View style={s.header}>
        <SectionHeading section="promise" center />
      </View>

      {/* 2-column grid of black cards — same panel treatment as the notice
          board carousel, so the promise section stays on-brand. */}
      <View style={s.grid}>
        {features.map((feature, i) => {
          const fullWidth = i === features.length - 1 && features.length % 2 === 1;
          return (
            <View
              key={feature.title}
              style={[s.tile, fullWidth && { width: TILE_W * 2 + GAP }]}
            >
              <LinearGradient
                colors={['#1f2937', '#000000']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={s.tileInner}
              >
                <View style={s.iconWrap}>
                  <feature.icon size={26} color="#ffffff" strokeWidth={2.25} />
                </View>
                <Text style={s.title}>{feature.title}</Text>
                <Text style={s.description}>{feature.description}</Text>
              </LinearGradient>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    backgroundColor: '#ffffff',
    paddingTop: 24,
    paddingBottom: 36,
    marginTop: 10,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  header: { paddingHorizontal: H_PAD, marginBottom: 20 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: GAP,
    paddingHorizontal: H_PAD,
  },
  tile: { width: TILE_W },
  tileInner: {
    borderRadius: 18,
    padding: 18,
    minHeight: 172,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 6,
  },
  description: {
    fontSize: 12.5,
    lineHeight: 18,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.82)',
  },
});
