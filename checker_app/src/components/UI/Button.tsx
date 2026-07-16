/**
 * Button — primary / secondary / ghost / danger.
 * Always ≥44px tall (comfortable touch target), rounded, with an
 * optional leading lucide icon.
 *
 * ALL layout + colors come from `className` (NativeWind). Inline styles via a
 * Pressable style-function do NOT render on this build (NativeWind drops them
 * when a className is present) — that dropped the background AND the layout.
 */
import React from 'react';
import { ActivityIndicator, Pressable, ViewStyle } from 'react-native';
import { colors } from '@/constants/design';
import { AppText } from './AppText';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'md' | 'lg';

export interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  icon?: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
}

const VARIANT_CLASS: Record<Variant, string> = {
  primary: 'bg-brand-500',
  secondary: 'bg-white border border-slate-200',
  ghost: '',
  danger: 'bg-danger-500',
};

const FG: Record<Variant, string> = {
  primary: '#ffffff',
  secondary: colors.text,
  ghost: colors.textSecondary,
  danger: '#ffffff',
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon: Icon,
  disabled,
  loading,
  fullWidth,
  style,
}: ButtonProps) {
  const fg = FG[variant];
  const isDisabled = disabled || loading;
  const sizeClass = size === 'lg' ? 'min-h-[52px] px-6' : 'min-h-[44px] px-5';

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      android_ripple={{ color: 'rgba(255,255,255,0.18)' }}
      className={`flex-row items-center justify-center gap-2 rounded-[12px] ${sizeClass} ${VARIANT_CLASS[variant]} ${fullWidth ? 'w-full self-stretch' : 'self-start'} ${isDisabled ? 'opacity-60' : ''}`}
      style={style}
    >
      {loading ? (
        <ActivityIndicator size="small" color={fg} />
      ) : Icon ? (
        <Icon size={size === 'lg' ? 20 : 18} color={fg} strokeWidth={2.25} />
      ) : null}
      <AppText
        variant={size === 'lg' ? 'titleLg' : 'titleMd'}
        color={fg}
        numberOfLines={1}
        style={{ flexShrink: 1 }}
      >
        {label}
      </AppText>
    </Pressable>
  );
}

export default Button;
