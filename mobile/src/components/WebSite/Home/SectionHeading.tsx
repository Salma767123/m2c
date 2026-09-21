import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ArrowRight } from 'lucide-react-native';
import { Palette, Radius } from '@/constants/theme';
import { Sans, Heading } from '@/lib/fonts';

/**
 * Section heading for the home rails.
 *
 * Every value here is measured from the web at phone width (the base Tailwind
 * classes, before any `sm:`/`lg:` prefix takes over) rather than chosen to look
 * about right — see frontend/src/components/WebSite/Featured/Products.tsx,
 * Featured/TopSelling.tsx and Category/Category.tsx.
 *
 * ── Why three tones and not one ─────────────────────────────────────────────
 * Mobile rendered all four rails through one identical heading. The web does
 * not, deliberately: Products.tsx says the Featured masthead is "deliberately
 * quieter than Top Selling / Best Sellers below it" and that making all three
 * identical "was one of the main things making all three product sections look
 * like one section printed three times". Flattening them here reintroduced
 * exactly the problem the web had already fixed.
 *
 *   quiet  Featured, Best Sellers — centred, 24px title, hairline eyebrow
 *   loud   Top Selling — left-aligned masthead, 33.6px title, heavier eyebrow
 *   plain  Categories, Value — centred, quiet type, brand-red eyebrow
 *
 * ── Colours ─────────────────────────────────────────────────────────────────
 * The eyebrow is #c41617, not the brand #e01a1b, and the body is #5f5550, not
 * a grey. Both are contrast fixes the web made on purpose and documented:
 * brand red measures 4.15:1 on the linen ground and #c41617 measures 5.2:1 at
 * the same hue; text-gray-500 measured 4.10:1 and #5f5550 is 6.1:1. Mobile was
 * using #e01a1b and #6b7280, throwing both fixes away.
 *
 * ── Weights ─────────────────────────────────────────────────────────────────
 * Titles are 600 against Poppins_600SemiBold. They were 800 against the same
 * 600 file, which on Android synthesises a fake bold from the real one — see
 * the note in src/lib/fonts.ts. The family and the weight now always agree.
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

type Tone = 'quiet' | 'loud' | 'plain' | 'page';

/** Which web masthead each rail is modelled on. */
const TONE: Record<SectionKey, Tone> = {
  featured: 'quiet',
  bestSeller: 'quiet',
  topSelling: 'loud',
  categories: 'plain',
  // The Categories PAGE sets its intro left and a step smaller than the
  // home rail's — `text-start` and `text-xl` against `text-center`/`text-2xl`.
  browseCollections: 'page',
  promise: 'plain',
};

/* Measured from the web at phone width. `tracking-tight` is -0.025em and
   `leading-relaxed` is 1.625, both resolved against the font size below. */
const TONES = {
  quiet: {
    align: 'center' as const,
    ruleWidth: 24, // w-6
    eyebrowGap: 8, // gap-2
    eyebrowSize: 11,
    eyebrowFamily: Sans.semibold,
    eyebrowWeight: '600' as const,
    eyebrowTracking: 1.98, // 0.18em
    eyebrowColor: '#c41617',
    titleSize: 24, // text-2xl
    titleLineHeight: undefined as number | undefined,
    titleTracking: -0.6,
    titleColor: '#1a1a1a',
    descSize: 14, // text-sm
    descLineHeight: 22.75,
    descColor: '#5f5550',
  },
  loud: {
    align: 'left' as const,
    ruleWidth: 28, // w-7
    eyebrowGap: 10, // gap-2.5
    eyebrowSize: 11.5,
    eyebrowFamily: Sans.bold,
    eyebrowWeight: '700' as const,
    eyebrowTracking: 2.3, // 0.2em
    eyebrowColor: '#c41617',
    titleSize: 33.6, // 2.1rem
    titleLineHeight: 35.6, // leading-[1.06]
    titleTracking: -0.84,
    titleColor: '#1a1416',
    descSize: 15,
    descLineHeight: 24.4,
    descColor: '#4a413d',
  },
  /* The categories page masthead. Same family as `plain` but left-aligned and
     one step down, matching Categories/Categories.tsx. Its description is
     Tailwind's gray-600 rather than the warm #5f5550 the home rails use. */
  page: {
    align: 'left' as const,
    ruleWidth: 24,
    eyebrowGap: 8,
    eyebrowSize: 11,
    eyebrowFamily: Sans.semibold,
    eyebrowWeight: '600' as const,
    eyebrowTracking: 1.98,
    eyebrowColor: '#e01a1b',
    titleSize: 20, // text-xl
    titleLineHeight: undefined as number | undefined,
    titleTracking: -0.5,
    titleColor: '#1a1a1a',
    descSize: 14,
    descLineHeight: 22.75,
    descColor: '#4b5563', // gray-600
  },
  plain: {
    align: 'center' as const,
    ruleWidth: 24,
    eyebrowGap: 8,
    eyebrowSize: 11,
    eyebrowFamily: Sans.semibold,
    eyebrowWeight: '600' as const,
    eyebrowTracking: 1.98,
    // Category/Category.tsx uses the brand red here, not the deepened one —
    // that section sits on white rather than the linen ground.
    eyebrowColor: '#e01a1b',
    titleSize: 24,
    titleLineHeight: undefined as number | undefined,
    titleTracking: -0.6,
    titleColor: '#1a1a1a',
    descSize: 14,
    descLineHeight: 22.75,
    descColor: '#5f5550',
  },
} satisfies Record<Tone, unknown>;

export default function SectionHeading({
  section,
  /** Set on a dark-filled section so the type inverts. */
  inverse,
  /** Force centring. Otherwise the tone decides, matching the web. */
  center,
}: {
  section: SectionKey;
  inverse?: boolean;
  center?: boolean;
}) {
  const { eyebrow, title, description } = COPY[section];
  const t = TONES[TONE[section]];
  const centered = center ?? t.align === 'center';

  // On an inverse (ink) panel the measured web colours are tuned for a light
  // ground and go muddy, so the inverse ramp takes over wholesale.
  const eyebrowColor = inverse ? Palette.primaryOnDark : t.eyebrowColor;
  const titleColor = inverse ? Palette.onInverse : t.titleColor;
  const descColor = inverse ? Palette.onInverseMuted : t.descColor;

  return (
    <View style={[s.wrap, centered && s.center]}>
      <View style={[s.eyebrowRow, { gap: t.eyebrowGap }, centered && s.center]}>
        <View style={{ height: 1, width: t.ruleWidth, backgroundColor: eyebrowColor }} />
        <Text
          style={{
            fontFamily: t.eyebrowFamily,
            fontSize: t.eyebrowSize,
            fontWeight: t.eyebrowWeight,
            letterSpacing: t.eyebrowTracking,
            textTransform: 'uppercase',
            color: eyebrowColor,
          }}
        >
          {eyebrow}
        </Text>
      </View>

      <Text
        style={[
          {
            fontFamily: Heading.semibold,
            fontSize: t.titleSize,
            fontWeight: '600',
            lineHeight: t.titleLineHeight,
            letterSpacing: t.titleTracking,
            color: titleColor,
            marginTop: 12, // mt-3
          },
          centered && s.textCenter,
        ]}
      >
        {title}
      </Text>

      <Text
        style={[
          {
            fontFamily: Sans.regular,
            fontSize: t.descSize,
            lineHeight: t.descLineHeight,
            color: descColor,
            marginTop: 8, // mt-2
          },
          centered && s.textCenter,
        ]}
      >
        {description}
      </Text>
    </View>
  );
}

/**
 * The red "View All" pill.
 *
 * Rendered BELOW the rail, not in the heading. The web hides its masthead link
 * on a phone (`hidden … lg:inline-flex`) and puts a solid pill under the grid
 * instead (`mt-6 flex justify-center … lg:hidden`), with the reasoning spelled
 * out at the call site: "The quiet text link above is a desktop hover
 * affordance; on touch this needs to be a real target." Mobile had it as a
 * 56×38 arrow-only button in the heading — the desktop position, at a size the
 * web explicitly rejected for touch.
 *
 * Geometry is CTA_PILL from frontend/src/components/WebSite/Shared/ctaPill.ts:
 * h-11 (44px, the thumb floor), rounded-full, px-5, 14px/600, gap-2.
 */
export function SectionCta({
  section,
  onPress,
  inverse,
}: {
  section: SectionKey;
  onPress: () => void;
  inverse?: boolean;
}) {
  const label = COPY[section].cta;
  if (!label) return null;

  return (
    <View style={s.ctaRow}>
      {/* TouchableOpacity with a plain array style, not a Pressable taking a
          style FUNCTION.

          This is a white label on a red fill. When the function style does not
          apply, the fill is lost and the label becomes white text on the
          section's white card — invisible. That is what hid "View All Products"
          under Featured and Best Sellers, and "View All Categories" under Shop
          by Category: the button was there and tappable, just unreadable.
          `activeOpacity` gives the press feedback the `pressed` branch did. */}
      <TouchableOpacity
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={label}
        hitSlop={6}
        activeOpacity={0.85}
        style={[s.cta, { backgroundColor: inverse ? Palette.onInverse : '#e01a1b' }]}
      >
        <Text
          style={[
            s.ctaLabel,
            { color: inverse ? Palette.ink : Palette.onPrimary },
          ]}
        >
          {label}
        </Text>
        <ArrowRight
          size={16}
          color={inverse ? Palette.ink : Palette.onPrimary}
          strokeWidth={2.5}
        />
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { marginBottom: 12 }, // mb-3
  center: { alignItems: 'center' },
  textCenter: { textAlign: 'center' },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center' },

  ctaRow: { marginTop: 24, alignItems: 'center' }, // mt-6
  cta: {
    height: 44, // h-11
    borderRadius: Radius.full,
    paddingHorizontal: 20, // px-5
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8, // gap-2
    shadowColor: '#e01a1b',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 13,
    elevation: 4,
  },
  ctaLabel: {
    fontFamily: Sans.semibold,
    fontSize: 14,
    fontWeight: '600',
  },
});
