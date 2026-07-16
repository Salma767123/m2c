/**
 * Badge / StatusBadge — pill labels.
 * StatusBadge maps a QC status string to the shared status palette
 * (statusStyle) so approved/pending/rejected colours stay consistent.
 */
import React from 'react';
import { View, ViewStyle } from 'react-native';
import { radius, space, statusStyle, colors } from '@/constants/design';
import { AppText } from './AppText';

export interface BadgeProps {
  label: string;
  fg?: string;
  bg?: string;
  border?: string;
  style?: ViewStyle;
}

export function Badge({ label, fg = colors.textSecondary, bg = colors.surfaceMuted, border, style }: BadgeProps) {
  return (
    <View
      style={[
        {
          paddingHorizontal: space.sm + 2,
          paddingVertical: 3,
          borderRadius: radius.full,
          backgroundColor: bg,
          borderWidth: border ? 1 : 0,
          borderColor: border,
          alignSelf: 'flex-start',
        },
        style,
      ]}
    >
      <AppText variant="labelSm" color={fg} style={{ letterSpacing: 0.3 }} numberOfLines={1}>
        {label}
      </AppText>
    </View>
  );
}

export function StatusBadge({ status, label, style }: { status?: string | null; label?: string; style?: ViewStyle }) {
  const s = statusStyle(status);
  return <Badge label={label ?? status ?? '—'} fg={s.fg} bg={s.bg} border={s.border} style={style} />;
}

export default Badge;
