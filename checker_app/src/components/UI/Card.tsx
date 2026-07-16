/**
 * Card / SectionCard — surface primitives.
 *
 * Card:        plain white rounded surface with a soft border + card
 *              elevation. The default container for grouped content.
 * SectionCard: Card with a standard header row — a brand-red lucide icon
 *              in a tinted tile, a title, and an optional subtitle / right
 *              slot. This is the "every section gets a cute icon" pattern.
 */
import React from 'react';
import { View, ViewProps, ViewStyle } from 'react-native';
import { colors, radius, space, elevation, brand } from '@/constants/design';
import { AppText } from './AppText';

export interface CardProps extends ViewProps {
  padded?: boolean;
  style?: ViewStyle | ViewStyle[];
}

export function Card({ padded = true, style, children, ...rest }: CardProps) {
  return (
    <View
      {...rest}
      // Border via className — inline borderWidth doesn't render on this build.
      className="bg-white border border-slate-200 rounded-2xl overflow-hidden"
      style={[
        { padding: padded ? space.lg : 0 },
        elevation.card,
        style as any,
      ]}
    >
      {children}
    </View>
  );
}

export interface SectionCardProps {
  icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  iconColor?: string;
  bodyPadded?: boolean;
  style?: ViewStyle | ViewStyle[];
  children?: React.ReactNode;
}

export function SectionCard({
  icon: Icon,
  title,
  subtitle,
  right,
  iconColor = brand[500],
  bodyPadded = true,
  style,
  children,
}: SectionCardProps) {
  return (
    <View
      // Border via className (inline borderWidth doesn't render on this build);
      // rounded + clip so the red header follows the card's corners.
      className="bg-white border border-slate-200 rounded-2xl overflow-hidden"
      style={[elevation.card, style as any]}
    >
      {/* Primary-red header strip — white icon circle + white text */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: space.md,
          paddingHorizontal: space.lg,
          paddingVertical: space.md,
          backgroundColor: brand[500],
        }}
      >
        <View
          style={{
            width: 38,
            height: 38,
            borderRadius: radius.full,
            backgroundColor: colors.white,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon size={18} color={iconColor} strokeWidth={2.25} />
        </View>
        <View style={{ flex: 1 }}>
          <AppText variant="titleMd" color={colors.white}>{title}</AppText>
          {subtitle ? (
            <AppText variant="bodySm" color="rgba(255,255,255,0.85)" style={{ marginTop: 1 }}>
              {subtitle}
            </AppText>
          ) : null}
        </View>
        {right}
      </View>

      {children ? (
        <View style={{ padding: bodyPadded ? space.lg : 0 }}>{children}</View>
      ) : null}
    </View>
  );
}

export default Card;
