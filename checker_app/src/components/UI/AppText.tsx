/**
 * AppText — typography primitive.
 * Renders text in the Outfit family at one of the design-system scale
 * steps. Use `variant` for the scale; `color`/`style` still override.
 */
import React from 'react';
import { Text, TextProps } from 'react-native';
import { type as typeScale } from '@/constants/design';

type Variant = keyof typeof typeScale;

export interface AppTextProps extends TextProps {
  variant?: Variant;
  color?: string;
}

export function AppText({
  variant = 'bodyMd',
  color,
  style,
  ...rest
}: AppTextProps) {
  return (
    <Text
      {...rest}
      style={[typeScale[variant], color ? { color } : null, style]}
    />
  );
}

export default AppText;
