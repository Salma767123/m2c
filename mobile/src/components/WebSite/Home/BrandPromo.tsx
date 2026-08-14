import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Truck, ShieldCheck, BadgeCheck, ArrowRight } from 'lucide-react-native';
import { router } from 'expo-router';
import { Palette, Radius, Shadow } from '@/constants/theme';

/**
 * Brand-promotion band shown between the home product rails — the mobile
 * counterpart of frontend/src/components/WebSite/BrandPromo/BrandPromo.tsx.
 *
 * Brand messaging only, no product data, so the copy is static on both clients.
 *
 * The web version layers four gradients, two blurred glow blobs, a dot texture
 * and a hover shine over the panel. RN has no backdrop blur or multi-layer
 * background shorthand, so this keeps the one thing that carries the look — the
 * brand gradient — plus two soft translucent orbs, and drops the effects that
 * would cost overdraw on a phone for detail nobody would see at this size.
 */

const HIGHLIGHTS = [
  { icon: BadgeCheck, title: 'Factory Direct', desc: 'Straight from the makers' },
  { icon: ShieldCheck, title: 'Quality Checked', desc: 'Inspected before dispatch' },
  { icon: Truck, title: 'Fast Shipping', desc: 'Delivered across the country' },
];

export default function BrandPromo() {
  return (
    <View style={s.wrap}>
      <LinearGradient
        colors={['#E01A1B', Palette.primary, '#ff6a3d']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.panel}
      >
        {/* Ambient orbs — the flat stand-ins for the web's blurred glows. */}
        <View style={[s.orb, s.orbTop]} />
        <View style={[s.orb, s.orbBottom]} />

        {/* Eyebrow */}
        <View style={s.eyebrowRow}>
          <View style={s.eyebrowRule} />
          <Text style={s.eyebrow}>Manufacturer to Customer</Text>
        </View>

        <Text style={s.title}>Premium textiles, straight from the makers.</Text>
        <Text style={s.body}>
          We cut out the middlemen so you get honest factory pricing on
          quality-checked home textiles — woven, inspected, and shipped by the
          people who make them.
        </Text>

        {/* Highlights */}
        <View style={s.highlights}>
          {HIGHLIGHTS.map((h) => {
            const Icon = h.icon;
            return (
              <View key={h.title} style={s.highlight}>
                <View style={s.highlightIcon}>
                  <Icon size={15} color="#ffffff" />
                </View>
                <View style={s.flex}>
                  <Text style={s.highlightTitle}>{h.title}</Text>
                  <Text style={s.highlightDesc}>{h.desc}</Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* CTAs — stacked, not side by side. The web has room for a row; inside
            this panel there is only ~320dp on a 360dp phone, which is less than
            "Shop the Collection" + arrow + "Sell on M2C" needs. Side by side the
            label wrapped and dragged the arrow off its centre line. */}
        <View style={s.ctaCol}>
          <Pressable
            onPress={() => router.push('/(any)/products')}
            accessibilityRole="button"
            accessibilityLabel="Shop the collection"
            style={({ pressed }) => [s.ctaPrimary, pressed && s.pressed]}
          >
            {/* Both label and arrow are pinned to brand red against the white
                pill — matching the web's `bg-white text-[#E01A1B]`. Neither may
                inherit from the panel, or it vanishes into its own background. */}
            {/* <Text style={s.ctaPrimaryText} numberOfLines={1}>
              Shop the Collection
            </Text> */}
            <ArrowRight size={16} color={Palette.primary} strokeWidth={2.5} />
          </Pressable>

          {/* The web pairs this with a "Sell on M2C" link to the vendor portal.
              There is no vendor surface in this app, so it points at the vendor
              enquiry form instead of a dead route. */}
          <Pressable
            onPress={() => router.push('/(any)/contact')}
            accessibilityRole="button"
            accessibilityLabel="Sell on M2C"
            style={({ pressed }) => [s.ctaGhost, pressed && s.pressed]}
          >
            <Text style={s.ctaGhostText} numberOfLines={1}>
              Sell on M2C
            </Text>
          </Pressable>
        </View>
      </LinearGradient>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { marginTop: 10, marginHorizontal: 12 },
  flex: { flex: 1 },
  panel: {
    borderRadius: Radius.xl,
    padding: 20,
    overflow: 'hidden',
    ...Shadow.cardHover,
  },

  orb: { position: 'absolute', borderRadius: Radius.full },
  orbTop: {
    width: 200,
    height: 200,
    right: -70,
    top: -90,
    backgroundColor: 'rgba(255,255,255,0.13)',
  },
  orbBottom: {
    width: 230,
    height: 230,
    left: -90,
    bottom: -120,
    backgroundColor: 'rgba(255,138,76,0.22)',
  },

  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  eyebrowRule: { height: 1, width: 22, backgroundColor: 'rgba(255,255,255,0.6)' },
  eyebrow: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.88)',
    textTransform: 'uppercase',
    letterSpacing: 1.8,
  },

  title: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: -0.4,
    marginBottom: 8,
  },
  body: {
    fontSize: 12.5,
    lineHeight: 19,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 16,
  },

  highlights: { gap: 8, marginBottom: 18 },
  highlight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  highlightIcon: {
    width: 30,
    height: 30,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  highlightTitle: { fontSize: 12.5, fontWeight: '700', color: '#ffffff' },
  highlightDesc: { fontSize: 11, color: 'rgba(255,255,255,0.82)', marginTop: 1 },

  ctaCol: { gap: 10 },
  ctaPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Palette.surface,
    borderRadius: Radius.full,
    paddingHorizontal: 18,
    height: 46,
  },
  ctaPrimaryText: {
    fontSize: 14,
    fontWeight: '800',
    color: Palette.primary,
    // Explicit lineHeight + no extra font padding, so the label's optical centre
    // matches the 16px arrow instead of sitting a pixel or two low on Android.
    lineHeight: 18,
    includeFontPadding: false,
  },
  ctaGhost: {
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.55)',
    paddingHorizontal: 18,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaGhostText: {
    fontSize: 14,
    fontWeight: '700',
    color: Palette.onBrand,
    lineHeight: 18,
    includeFontPadding: false,
  },
  pressed: { opacity: 0.88 },
});