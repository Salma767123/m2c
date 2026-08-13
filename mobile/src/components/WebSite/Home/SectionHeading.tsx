import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { ArrowRight } from 'lucide-react-native';
import { Palette, Radius } from '@/constants/theme';

/**
 * Section heading for the home rails.
 *
 * The web renders three lines above every rail — a brand-red eyebrow with a
 * leading rule, a display title, and a one-line description
 * (frontend/src/components/WebSite/Featured/Products.tsx et al). Mobile was
 * showing only a short title ("Featured", "Top Selling"), so the positioning
 * copy the marketing team wrote never appeared on a phone at all.
 *
 * COPY is the shared source of truth for both the labels and the destinations,
 * so the two clients can't drift apart one string at a time.
 */
export type SectionKey =
  | 'featured'
  | 'topSelling'
  | 'bestSeller'
  | 'categories'
  | 'browseCollections'
  | 'promise';

export const COPY: Record<
  SectionKey,
  { eyebrow: string; title: string; description: string; cta?: string }
> = {
  featured: {
    eyebrow: 'Handpicked',
    title: 'Featured Products',
    description:
      'Handpicked selection of our finest traditional textiles, crafted by master artisans',
    cta: 'View All Products',
  },
  topSelling: {
    eyebrow: 'Trending Now',
    title: 'Top Selling Products',
    description: 'Most popular items loved by our customers, proven by sales and reviews',
    cta: 'View All Products',
  },
  bestSeller: {
    eyebrow: 'Customer Favourites',
    title: 'Best Seller Products',
    description:
      "Highest rated products that have earned our customers' trust and satisfaction",
    cta: 'View All Products',
  },
  categories: {
    eyebrow: 'Collections',
    title: 'Shop by Category',
    description:
      'Explore our carefully curated collection of traditional textiles, organized by category',
    cta: 'View All Categories',
  },
  /** Intro above the grid on the Categories screen (not the home rail). */
  browseCollections: {
    eyebrow: 'Categories',
    title: 'Browse Our Collections',
    description:
      "Find exactly what you're looking for in our carefully curated categories.",
  },
  promise: {
    eyebrow: 'Our Promise',
    title: 'Why Choose M2C MarkDowns',
    description:
      "We're committed to quality, sustainability, and your comfort. Every product is crafted with care and attention to detail.",
  },
};

export default function SectionHeading({
  section,
  onPressCta,
  /** Set on a dark-filled section so the type inverts. */
  inverse,
  /** Centres the block (used by the full-width Value section). */
  center,
}: {
  section: SectionKey;
  onPressCta?: () => void;
  inverse?: boolean;
  center?: boolean;
}) {
  const { eyebrow, title, description, cta } = COPY[section];

  // On an inverse (ink) panel the brand red drops below a comfortable contrast
  // ratio, so the eyebrow shifts to the lighter brand step — same rule the
  // header uses for text on a dark bar.
  const accent = inverse ? Palette.primaryOnDark : Palette.primary;

  return (
    <View style={[s.wrap, center && s.center]}>
      <View style={s.headRow}>
        <View style={[s.textCol, center && s.center]}>
          {/* Eyebrow: rule + label. Web draws a second trailing rule when the
              block is centred. */}
          <View style={s.eyebrowRow}>
            <View style={[s.rule, { backgroundColor: accent }]} />
            <Text style={[s.eyebrow, { color: accent }]}>{eyebrow}</Text>
            {center ? <View style={[s.rule, { backgroundColor: accent }]} /> : null}
          </View>

          <Text style={[s.title, inverse && s.titleInverse, center && s.textCenter]}>
            {title}
          </Text>
          <Text
            style={[s.description, inverse && s.descriptionInverse, center && s.textCenter]}
          >
            {description}
          </Text>
        </View>

        {onPressCta && cta ? (
          <Pressable
            onPress={onPressCta}
            accessibilityRole="button"
            accessibilityLabel={cta}
            hitSlop={6}
            style={({ pressed }) => [
              s.cta,
              inverse ? s.ctaInverse : s.ctaBrand,
              pressed && s.ctaPressed,
            ]}
          >
            <ArrowRight
              size={20}
              color={inverse ? Palette.ink : Palette.onPrimary}
              strokeWidth={2.5}
            />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { marginBottom: 14 },
  center: { alignItems: 'center' },
  textCenter: { textAlign: 'center' },
  headRow: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 2 },
  textCol: { flex: 1, paddingRight: 10 },

  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  rule: { height: 1, width: 22 },
  eyebrow: {
    fontSize: 10.5,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.6,
  },

  title: {
    fontSize: 21,
    fontWeight: '800',
    color: Palette.ink,
    letterSpacing: -0.4,
    marginBottom: 5,
  },
  titleInverse: { color: Palette.onInverse },

  description: {
    fontSize: 12.5,
    lineHeight: 18,
    color: Palette.textMuted,
  },
  descriptionInverse: { color: Palette.onInverseMuted },

  cta: {
    width: 56,
    height: 38,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  ctaBrand: { backgroundColor: Palette.primary },
  ctaInverse: { backgroundColor: Palette.onInverse },
  ctaPressed: { opacity: 0.85 },
});
