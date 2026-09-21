import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Smartphone } from 'lucide-react-native';
import { Reveal } from '@/components/WebSite/Shared/Reveal';
import { CARD_GUTTER } from '@/components/WebSite/ProductCard/metrics';
import { Fonts } from '@/constants/theme';

/**
 * "Shop M2C from your pocket" — the app section.
 *
 * Ported from frontend/src/components/WebSite/DownloadApp/DownloadApp.tsx, which
 * mobile had omitted on the grounds that a download-the-app banner inside the
 * app is odd. It is included now because the home page is meant to match the
 * site section for section; three parts of the web's version are deliberately
 * left out, and each for a reason:
 *
 *  • The phone mockup. The web's is a 927×1448 frame with a live render of this
 *    app inside it. Showing a picture of this app, inside this app, is the one
 *    place the parity argument stops making sense.
 *
 *  • The QR card. The web's code builds it with `buildPlaceholderQr()` — a
 *    decorative pattern, not an encoded URL. On a web page nobody reaches for
 *    their phone to scan it. In a native app they might, and it would fail.
 *
 *  • Links on the badges. The web's are `href="#"` with `preventDefault()`, and
 *    app.json carries no iOS bundleIdentifier, so no App Store listing exists to
 *    point at. The badges are therefore rendered exactly as the web treats
 *    them — as artwork, not controls. They get real links the day the app is
 *    actually published.
 *
 * Everything that carries meaning — the eyebrow, the two-line headline, the
 * seam, the paragraph, the badges and the footnote — is the site's, verbatim.
 */
const BRAND = '#e01a1b';
const INK = '#1a1416';
const MUTED = '#6f625f';

export default function DownloadApp() {
  return (
    <View style={s.section}>
      <Reveal distance={16} duration={620}>
        <View style={s.eyebrowRow}>
          <View style={s.eyebrowRule} />
          <Text style={s.eyebrow}>Mobile App</Text>
        </View>

        {/* Broken after the brand and coloured from there: "the first line is
            who, the second is the promise, and the red carries the eye down
            into the paragraph." */}
        <Text style={s.headline}>
          Shop M2C{'\n'}
          <Text style={s.headlineAccent}>from your pocket.</Text>
        </Text>

        <View style={s.seam} />

        <Text style={s.body}>
          Make your online shopping experience easier and faster. Browse, wishlist
          and order your favourite home textiles on the go — get the M2C MarkDowns
          app now.
        </Text>

        <View style={s.badges}>
          <StoreBadge sub="Download on the" label="App Store" mark="apple" />
          <StoreBadge sub="GET IT ON" label="Google Play" mark="play" />
        </View>

        <View style={s.footnote}>
          <View style={s.footnoteChip}>
            <Smartphone size={14} color={BRAND} strokeWidth={2.2} />
          </View>
          <Text style={s.footnoteText}>Free to download · iOS and Android</Text>
        </View>
      </Reveal>
    </View>
  );
}

/**
 * A store badge. Not pressable — see the note at the top of the file; the web's
 * are inert too, and there is no listing to open yet.
 */
function StoreBadge({
  sub,
  label,
  mark,
}: {
  sub: string;
  label: string;
  mark: 'apple' | 'play';
}) {
  return (
    <View style={s.badge} accessible accessibilityRole="image" accessibilityLabel={`${sub} ${label}`}>
      {mark === 'apple' ? <AppleMark /> : <PlayMark />}
      <View>
        <Text style={s.badgeSub}>{sub}</Text>
        <Text style={s.badgeLabel}>{label}</Text>
      </View>
    </View>
  );
}

function AppleMark() {
  return (
    <Svg width={26} height={26} viewBox="0 0 384 512">
      <Path
        fill="#ffffff"
        d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"
      />
    </Svg>
  );
}

/** The mark in its own four colours, as on Google's own black badge. */
function PlayMark() {
  return (
    <Svg width={23} height={23} viewBox="0 0 512 512">
      <Path fill="#00D2FF" d="M47 0C34 6.8 25.3 19.2 25.3 35.3v441.3c0 16.1 8.7 28.5 21.7 35.3l256.6-256L47 0z" />
      <Path fill="#00E175" d="M325.3 234.3 104.6 13l280.8 161.2-60.1 60.1z" />
      <Path fill="#FFC800" d="M472.2 225.6l-58.9-34.1-65.7 64.5 65.7 64.5 60.1-34.1c18-14.3 18-46.5-1.2-60.8z" />
      <Path fill="#F5333F" d="M104.6 499l220.7-221.3 60.1 60.1L104.6 499z" />
    </Svg>
  );
}

const s = StyleSheet.create({
  /* `bg-[#fdf8f5] py-14` — a full-bleed warm band, like the rest of the page's
     sections rather than a floating card. */
  section: {
    backgroundColor: '#fdf8f5',
    paddingVertical: 40,
    paddingHorizontal: CARD_GUTTER,
  },

  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  eyebrowRule: { height: 1, width: 24, backgroundColor: BRAND },
  eyebrow: {
    fontFamily: Fonts.sansSemibold,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1.98, // 0.18em
    color: BRAND,
  },

  /* font-playfair text-[30px] font-semibold leading-[1.1] tracking-tight */
  headline: {
    fontFamily: Fonts.heading,
    fontSize: 30,
    fontWeight: '600',
    lineHeight: 33,
    letterSpacing: -0.75,
    color: INK,
    marginBottom: 16,
  },
  headlineAccent: { color: BRAND },

  /* The 3px × 44 seam under the headline. */
  seam: { width: 44, height: 3, borderRadius: 999, backgroundColor: BRAND, marginBottom: 20 },

  body: {
    fontFamily: Fonts.sans,
    fontSize: 15,
    lineHeight: 24, // leading-relaxed
    color: MUTED,
    marginBottom: 28,
  },

  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  /* `rounded-2xl bg-[#1a1416] px-5 py-2.5` with the web's deep shadow. */
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    backgroundColor: INK,
    paddingHorizontal: 18,
    paddingVertical: 10,
    shadowColor: INK,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.55,
    shadowRadius: 14,
    elevation: 4,
  },
  badgeSub: {
    fontFamily: Fonts.sansMedium,
    fontSize: 10,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.8)',
  },
  badgeLabel: {
    fontFamily: Fonts.sansSemibold,
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.4,
    color: '#ffffff',
    marginTop: -1,
  },

  footnote: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 24 },
  footnoteChip: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(224,26,27,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footnoteText: {
    fontFamily: Fonts.sans,
    fontSize: 13,
    letterSpacing: 0.26,
    color: MUTED,
  },
});
