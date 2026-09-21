/**
 * "Sell More. Keep More." — the vendor-recruitment band.
 *
 * Port of frontend/src/components/WebSite/VendorPartnerCTA/VendorPartnerCTA.tsx,
 * which the web renders at the foot of its product listing (Products.tsx). The
 * app had no equivalent on its listing screen; the only "Sell on M2C" prompt in
 * the whole app was a link inside the home page's BrandPromo, so the web showed
 * this to a browsing customer and mobile never did.
 *
 * The palette here is not the M2C brand red — it is the artwork's own navy and
 * gold (#0c1e38 / #f8b341 / #bd8023), kept as-is so the band reads as the same
 * advertisement on both clients.
 *
 * Only the phone layout is ported: the web's band splits into a two-column grid
 * from `md:` up with an illustration on the right, and stacks below that. A
 * phone only ever sees the stacked form.
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { ArrowRight, Store } from 'lucide-react-native';
import { Fonts } from '@/constants/theme';

/** Titles only — the web keeps the sub-lines for the /vendor page itself. */
const PERKS = ['Grow Your Business', 'Zero Selling Fee', 'Transparent Earnings', '24x7 Support'];

const NAVY = '#0c1e38';
const GOLD = '#f8b341';
const BRONZE = '#bd8023';

export default function VendorPartnerCTA() {
  return (
    <View style={s.section}>
      {/* The web sends this to /vendor. There is no vendor surface in this app,
          so it lands on the enquiry form — the same substitution BrandPromo
          already makes for its "Sell on M2C" link, rather than a dead route. */}
      <Pressable
        onPress={() => router.push('/(any)/contact' as any)}
        accessibilityRole="button"
        accessibilityLabel="Join as a seller on M2C"
        style={({ pressed }) => [s.band, pressed && s.pressed]}
      >
        <LinearGradient
          colors={['#faf4ec', '#f7efe4', '#f2e6d5']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={s.fill}
        >
          <View style={s.eyebrowPill}>
            <Text style={s.eyebrowText}>Zero Charges to Sell</Text>
          </View>

          {/* Two weights of one line, exactly as the artwork sets it. */}
          <Text style={s.headline}>
            Sell More. <Text style={s.headlineAccent}>Keep More.</Text>
          </Text>

          <Text style={s.sub}>Your Success, Our Platform.</Text>

          {/* Perks, separated by the web's small bronze dot rather than commas. */}
          <View style={s.perks}>
            {PERKS.map((perk, i) => (
              <View key={perk} style={s.perkItem}>
                {i > 0 ? <View style={s.perkDot} /> : null}
                <Text style={s.perkText}>{perk}</Text>
              </View>
            ))}
          </View>

          <View style={s.cta}>
            <Store size={14} color={GOLD} strokeWidth={2} />
            <Text style={s.ctaText}>Join as a Seller</Text>
            <ArrowRight size={14} color={GOLD} strokeWidth={2} />
          </View>
        </LinearGradient>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  section: { paddingVertical: 24, paddingHorizontal: 16 }, // py-6 / px-4
  band: {
    borderRadius: 24, // rounded-3xl
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e8dac4',
    shadowColor: '#0c1e38',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.45,
    shadowRadius: 25,
    elevation: 6,
  },
  pressed: { opacity: 0.92 },
  fill: { paddingHorizontal: 20, paddingVertical: 24, gap: 12 }, // px-5 py-6, gap-3

  eyebrowPill: {
    alignSelf: 'flex-start',
    backgroundColor: NAVY,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  eyebrowText: {
    fontFamily: Fonts.sansSemibold,
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 2, // 0.2em
    color: GOLD,
  },

  headline: {
    fontFamily: Fonts.sansBold,
    fontSize: 26,
    lineHeight: 28.6, // leading-[1.1]
    fontWeight: '700',
    letterSpacing: -0.65, // tracking-tight
    color: NAVY,
  },
  headlineAccent: { color: BRONZE },

  sub: {
    fontFamily: Fonts.sansMedium,
    fontSize: 14,
    fontWeight: '500',
    // #0c1e38 at 70%, resolved — RN has no colour-with-opacity shorthand.
    color: 'rgba(12,30,56,0.7)',
  },

  perks: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 8, rowGap: 6 },
  perkItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  perkDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: 'rgba(189,128,35,0.6)' },
  perkText: {
    fontFamily: Fonts.sansSemibold,
    fontSize: 11.5,
    fontWeight: '600',
    color: 'rgba(12,30,56,0.75)',
  },

  cta: {
    alignSelf: 'flex-start',
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: NAVY,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(248,179,65,0.6)',
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  ctaText: {
    fontFamily: Fonts.sansBold,
    fontSize: 10.5,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.84, // 0.08em
    color: '#ffffff',
  },
});
