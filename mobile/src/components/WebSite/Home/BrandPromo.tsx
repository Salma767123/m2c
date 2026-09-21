import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowRight,
  Factory,
  Headphones,
  ShieldCheck,
  TrendingUp,
  Truck,
  Wallet,
} from 'lucide-react-native';
import { router } from 'expo-router';
import { Reveal } from '@/components/WebSite/Shared/Reveal';
import { Fonts } from '@/constants/theme';

/**
 * The two brand panels between Featured and Top Selling.
 *
 * Ported from frontend/src/components/WebSite/BrandPromo/BrandPromo.tsx. Mobile
 * had rendered ONE panel — a red-to-orange gradient block with its own eyebrow
 * and a bare arrow for a button — where the web has TWO photographic panels
 * addressing two different audiences:
 *
 *   makers   cream ground, buyer-facing: "Premium textiles, straight from the
 *            makers." → Shop the collection
 *   sellers  navy ground, vendor-facing: "Sell more. Keep more." → Join as a
 *            seller, in gold rather than red because it is a different action
 *            on a different ground, not the same button recoloured
 *
 * Losing the second panel removed the home page's only vendor-recruitment
 * surface, which is why "Sell on M2C" had been bolted onto the first one as a
 * ghost link.
 *
 * Layout is the web's phone layout: the photograph is absolute on the LEFT at
 * 42% width with a veil over it, and the copy column sits against the right at
 * 62%. The web's note for that is worth keeping — stacking the photo above the
 * copy "cost each panel the photograph's height on top of its own, and the two
 * together spent most of a screen. Beside the copy instead, the photograph
 * costs no height at all: the panel is as tall as its words and no taller."
 */
type Feature = { Icon: typeof Factory; label: string; note: string };

const MAKER_FEATURES: Feature[] = [
  { Icon: Factory, label: 'From the makers', note: 'No middlemen' },
  { Icon: ShieldCheck, label: 'Quality checked', note: 'Trusted & inspected' },
  { Icon: Truck, label: 'Fast delivery', note: 'Across the country' },
];

const SELLER_FEATURES: Feature[] = [
  { Icon: Wallet, label: 'Zero selling fee', note: '100% free to list' },
  { Icon: TrendingUp, label: 'Reach more buyers', note: 'Thousands, daily' },
  { Icon: Headphones, label: '24×7 support', note: "We're here anytime" },
];

/* Kept as RGB triples, not hex, for the same reason the web keeps them that
   way: the veil over each photograph has to fade to THIS colour at zero alpha.
   `'transparent'` in React Native is transparent BLACK — rgba(0,0,0,0) — so a
   gradient from 'transparent' to cream interpolates through a muddy olive at
   half alpha, which paints a dirty vertical band down the edge of the photo
   and dulls everything behind it. Fading rgba(g,0) → rgba(g,1) moves only the
   alpha and leaves the hue alone. */
const CREAM_RGB = '245, 233, 214';
const NAVY_RGB = '19, 33, 51';
const GOLD = '#e0a83d';
const NAVY = '#132133';

export default function BrandPromo() {
  return (
    <View style={s.wrap}>
      <Reveal distance={18} duration={620}>
        <Panel
          groundRgb={CREAM_RGB}
          image={require('../../../../assets/images/promo/makers.webp')}
          imageAlt="A ribboned stack of folded cotton textiles beside a plant and cushions"
          eyebrow="Made with care, delivered to you"
          eyebrowColor="#c41617"
          headingParts={['Premium textiles, straight from ', 'the makers.']}
          headingColor="#2a1c17"
          headingAccent="#a8121c"
          features={MAKER_FEATURES}
          labelColor="#2a1c17"
          noteColor="#6b5b50"
          iconColor="#a8121c"
          cta="Shop the collection"
          ctaBg="#e01a1b"
          ctaFg="#ffffff"
          onPress={() => router.push('/(any)/products' as any)}
          accessibilityLabel="Shop all products"
        />
      </Reveal>

      <Reveal distance={18} duration={620} delay={110}>
        <Panel
          groundRgb={NAVY_RGB}
          image={require('../../../../assets/images/promo/sellers.webp')}
          imageAlt="Four M2C vendors standing among folded textiles and packed cartons"
          eyebrow="Your success, our platform"
          eyebrowColor={GOLD}
          headingParts={['Sell more. ', 'Keep more.']}
          headingColor="#ffffff"
          headingAccent={GOLD}
          features={SELLER_FEATURES}
          labelColor="#ffffff"
          noteColor="#c3cddb"
          iconColor={GOLD}
          cta="Join as a seller"
          ctaBg={GOLD}
          ctaFg={NAVY}
          // The web opens a vendor application modal. There is no vendor
          // surface in this app, so this lands on the enquiry form — the same
          // substitution VendorPartnerCTA makes.
          onPress={() => router.push('/(any)/contact' as any)}
          accessibilityLabel="Join us as a vendor"
        />
      </Reveal>
    </View>
  );
}

function Panel({
  groundRgb,
  image,
  imageAlt,
  eyebrow,
  eyebrowColor,
  headingParts,
  headingColor,
  headingAccent,
  features,
  labelColor,
  noteColor,
  iconColor,
  cta,
  ctaBg,
  ctaFg,
  onPress,
  accessibilityLabel,
}: {
  groundRgb: string;
  image: any;
  imageAlt: string;
  eyebrow: string;
  eyebrowColor: string;
  /** [plain, accented] — the web colours the second half of each heading. */
  headingParts: [string, string];
  headingColor: string;
  headingAccent: string;
  features: Feature[];
  labelColor: string;
  noteColor: string;
  iconColor: string;
  cta: string;
  ctaBg: string;
  ctaFg: string;
  onPress: () => void;
  accessibilityLabel: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      android_ripple={{ color: 'rgba(0,0,0,0.05)' }}
      style={[s.panel, { backgroundColor: `rgb(${groundRgb})` }]}
    >
      {/* The photograph: absolute on the left, clipped by the panel's own
          radius so it reads as part of the panel, not a picture on it. */}
      <View style={s.art}>
        <Image source={image} style={StyleSheet.absoluteFill} contentFit="cover" accessibilityLabel={imageAlt} />
        {/* The veil — the ground colour fading in over the photo's right edge,
            so the copy never sits on raw image. */}
        <LinearGradient
          colors={[`rgba(${groundRgb}, 0)`, `rgba(${groundRgb}, 0.85)`, `rgba(${groundRgb}, 1)`]}
          locations={[0, 0.72, 1]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
      </View>

      {/* The ground is painted here as well as on the panel. The copy column
          is the one place where contrast must be guaranteed — white on navy,
          ink on cream — and relying on the parent's background showing
          through leaves that at the mercy of anything drawn between. */}
      <View style={[s.copy, { backgroundColor: `rgb(${groundRgb})` }]}>
        <Text style={[s.eyebrow, { color: eyebrowColor }]}>{eyebrow}</Text>

        <Text style={[s.heading, { color: headingColor }]}>
          {headingParts[0]}
          <Text style={{ color: headingAccent }}>{headingParts[1]}</Text>
        </Text>

        {/* Three facts, not a paragraph — "they read faster as a list". */}
        <View style={s.features}>
          {features.map(({ Icon, label, note }) => (
            <View key={label} style={s.featureRow}>
              <Icon size={14} color={iconColor} strokeWidth={1.9} />
              <Text style={[s.featureLabel, { color: labelColor }]}>
                {label}
                <Text style={[s.featureNote, { color: noteColor }]}> · {note}</Text>
              </Text>
            </View>
          ))}
        </View>

        <View style={[s.cta, { backgroundColor: ctaBg }]}>
          <Text style={[s.ctaText, { color: ctaFg }]}>{cta}</Text>
          <ArrowRight size={14} color={ctaFg} strokeWidth={2.25} />
        </View>
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  wrap: { paddingHorizontal: 12, paddingTop: 10, gap: 12 },

  panel: {
    borderRadius: 24, // rounded-3xl
    overflow: 'hidden',
  },

  /* The web uses w-[42%] art under a w-[62%] copy column — they overlap by 4%
     and it relies on the veil to hide the seam. That works on a desktop card;
     on a 360dp phone the copy column is only ~176dp of usable text, which wrapped
     every single feature line ("· No / middlemen").

     Art narrowed to 34% and copy widened to 66% so the two exactly meet and no
     text is ever set over photograph. That buys the copy ~20dp, which is the
     difference between those lines wrapping and not. */
  art: { position: 'absolute', top: 0, bottom: 0, left: 0, width: '34%' },

  copy: {
    width: '66%',
    marginLeft: 'auto',
    paddingHorizontal: 14,
    paddingVertical: 16,
  },

  eyebrow: {
    fontFamily: Fonts.sansBold,
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.26, // 0.14em
  },
  /* font-playfair text-[17px] font-semibold leading-[1.15] tracking-tight */
  heading: {
    fontFamily: Fonts.heading,
    fontSize: 17,
    fontWeight: '600',
    lineHeight: 19.55,
    letterSpacing: -0.425,
    marginTop: 6,
  },

  features: { marginTop: 12, gap: 6 },
  featureRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  featureLabel: {
    flex: 1,
    fontFamily: Fonts.sansSemibold,
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 15,
  },
  featureNote: { fontFamily: Fonts.sans, fontWeight: '400' },

  cta: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginTop: 14,
  },
  ctaText: {
    fontFamily: Fonts.sansSemibold,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.22,
  },
});
