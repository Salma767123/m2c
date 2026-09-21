/**
 * The app's one empty-state panel.
 *
 * Every screen that can come up with nothing to show was drawing its own: a
 * grey outline circle here, a bare icon there, three different title sizes, and
 * CTAs that ranged from a full-width rectangle to a text link. The cart's
 * version was the one that looked finished — a solid brand disc, a heavy title,
 * a muted line under it and a pill CTA — so that is what this is, and every
 * screen now calls it instead of hand-rolling another.
 *
 * Keeping it in one place also keeps the brand font on it. Most of the
 * hand-rolled copies had no `fontFamily` at all and were rendering in Roboto.
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Fonts, Palette } from '@/constants/theme';

/* lucide-react-native declares LucideIcon internally but does not export it
   as a type, so the icon prop is typed structurally instead. */
type IconComponent = React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;

const BRAND = '#E01A1B';

export default function EmptyState({
  icon: Icon,
  title,
  subtitle,
  ctaLabel,
  onPress,
  ctaIcon: CtaIcon,
  secondaryLabel,
  onSecondaryPress,
  fill = true,
}: {
  icon: IconComponent;
  title: string;
  subtitle?: string;
  ctaLabel?: string;
  onPress?: () => void;
  /** Optional glyph inside the CTA pill, left of the label. */
  ctaIcon?: IconComponent;
  /** Quiet second action — "Clear Filters" next to "Start Shopping", say. */
  secondaryLabel?: string;
  onSecondaryPress?: () => void;
  /**
   * Centre in the remaining height (the page-level default). Pass false to let
   * it sit inline inside a scrolling list.
   */
  fill?: boolean;
}) {
  return (
    <View style={[s.wrap, fill && { flex: 1 }]}>
      <View style={s.disc}>
        <Icon size={40} color="#ffffff" />
      </View>

      <Text style={s.title}>{title}</Text>
      {subtitle ? <Text style={s.subtitle}>{subtitle}</Text> : null}

      {ctaLabel && onPress ? (
        <Pressable
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel={ctaLabel}
          /* A style FUNCTION here would drop the fill and strand white text on a
             white ground — the failure this app has hit repeatedly. */
          style={s.cta}
        >
          {CtaIcon ? <CtaIcon size={16} color="#ffffff" /> : null}
          <Text style={s.ctaText}>{ctaLabel}</Text>
        </Pressable>
      ) : null}

      {secondaryLabel && onSecondaryPress ? (
        <Pressable
          onPress={onSecondaryPress}
          accessibilityRole="button"
          accessibilityLabel={secondaryLabel}
          hitSlop={8}
          style={s.secondary}
        >
          <Text style={s.secondaryText}>{secondaryLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', padding: 32 },

  disc: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: BRAND,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },

  title: {
    fontFamily: Fonts.sansBold,
    fontSize: 20,
    // Outfit is a static family: the weight must match the file that is loaded
    // (Outfit_700Bold), or Android synthesises a fake bold on top of it.
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },

  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: BRAND,
    paddingHorizontal: 28,
    height: 50,
    borderRadius: 999,
    shadowColor: BRAND,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    // Android paints elevation only — the shadow* props above are iOS.
    elevation: 4,
  },
  ctaText: {
    fontFamily: Fonts.sansBold,
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },

  secondary: { marginTop: 14, paddingVertical: 6, paddingHorizontal: 12 },
  secondaryText: {
    fontFamily: Fonts.sansSemibold,
    fontSize: 13.5,
    fontWeight: '600',
    color: Palette.textMuted,
  },
});
