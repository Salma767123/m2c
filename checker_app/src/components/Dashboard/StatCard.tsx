import React from 'react';
import { View, Pressable } from 'react-native';
import { AppText } from '@/components/UI/AppText';
import {
  brand, amber, success, danger, colors, radius, space, elevation,
} from '@/constants/design';

type Tone = 'brand' | 'amber' | 'success' | 'danger';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: any;
  trend: string;
  color: Tone;
  onPress?: () => void;
}

// White card; only the icon chip is tinted (matches web StatCard).
const TONES: Record<Tone, { iconBg: string; icon: string }> = {
  brand:   { iconBg: brand[50],   icon: brand[500] },
  amber:   { iconBg: amber[50],   icon: amber[500] },
  success: { iconBg: success[50], icon: success[600] },
  danger:  { iconBg: danger[50],  icon: danger[500] },
};

// Border via className (NativeWind) — inline borderWidth doesn't render on
// this build. Thin slate line + soft shadow = clean, not a heavy outline.
const BOX = 'w-full bg-white rounded-2xl border border-slate-200 p-4';

export default function StatCard({ label, value, icon: Icon, trend, color, onPress }: StatCardProps) {
  const t = TONES[color];

  const inner = (
    <>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: space.md }}>
        <View style={{ flex: 1, marginRight: space.sm }}>
          <AppText variant="labelMd" color={colors.textMuted} style={{ marginBottom: 4 }} numberOfLines={1}>
            {label}
          </AppText>
          <AppText variant="headlineLg" color={colors.text} numberOfLines={1}>{value}</AppText>
        </View>
        <View style={{ backgroundColor: t.iconBg, padding: 10, borderRadius: radius.md }}>
          <Icon color={t.icon} size={22} strokeWidth={2.25} />
        </View>
      </View>
      <AppText variant="labelSm" color={colors.textMuted} numberOfLines={1}>{trend}</AppText>
    </>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value}`}
        className={BOX}
        style={({ pressed }) => [elevation.card, { opacity: pressed ? 0.9 : 1 }]}
      >
        {inner}
      </Pressable>
    );
  }

  return <View className={BOX} style={elevation.card}>{inner}</View>;
}
