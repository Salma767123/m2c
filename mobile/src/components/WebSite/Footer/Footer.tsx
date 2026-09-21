import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, Image, Linking, StyleSheet, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Facebook, Instagram, Mail, Phone, Youtube } from 'lucide-react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { companyInfoService, type PublicCompanyInfo } from '@/services/companyInfoService';
import { categoryService, type Category } from '@/services/categoryService';
import { CARD_GUTTER } from '@/components/WebSite/ProductCard/metrics';
import { Fonts } from '@/constants/theme';

const STATIC_LOGO = require('../../../../assets/images/logo4.png');

/**
 * The site footer.
 *
 * Ported from frontend/src/components/WebSite/Footer/, where it is Footer +
 * MainFooterContent + BottomBar. Mobile had diverged in the two ways that
 * matter most:
 *
 *  1. It was DARK — a #270109 slab. The web used to be charcoal and moved off
 *     it deliberately: "The charcoal version worked as a slab but fought the
 *     rest of the page: every band above it is white or bone, so the last
 *     screen went from a bright shop to a black wall. Linen keeps the page one
 *     temperature the whole way down and lets brand red stay the only strong
 *     colour in it."
 *
 *  2. It had NO NAVIGATION. The web's footer carries three columns — Shop,
 *     Help and Account, eighteen links — and mobile had a logo, a paragraph,
 *     three social icons and a copyright. Every one of those destinations
 *     already exists as a route in this app; none of them was reachable from
 *     the foot of the page.
 *
 * ── Contrast ────────────────────────────────────────────────────────────────
 * The web records its measured ratios on this ground, and the same values are
 * used here: navigation #3f3a35 ≈ 9.4:1, body #6b625b ≈ 5.9:1, red headings
 * #c41617 ≈ 5.2:1.
 */
const INK = '#3f3a35'; // navigation
const BODY = '#6b625b'; // body copy
const DEEP = '#c41617'; // headings
const FAINT = '#8a807a';
const RULE = '#e6dbcc';

type NavLink = { label: string; href: string };
type NavColumn = { heading: string; links: NavLink[] };

export default function Footer() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [info, setInfo] = useState<PublicCompanyInfo | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    let alive = true;
    companyInfoService.getCachedCompanyInfo().then((i) => alive && setInfo(i)).catch(() => {});
    companyInfoService.getPublicCompanyInfo().then((i) => alive && setInfo(i)).catch(() => {});
    categoryService
      .getAllCategories({ status: 'ACTIVE', showRootOnly: 'true', sortBy: 'sortOrder', sortOrder: 'asc' })
      .then((res) => {
        if (alive && res.success && res.data) setCategories(res.data.slice(0, 4));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const companyName = info?.companyName || 'M2C MarkDowns Private Limited';

  /* The web's three columns, with its own reasoning for the order: "Categories
     lead, because that is what someone scrolling to the foot of a shop is
     usually looking for." Routes are the app's equivalents of the web paths. */
  const columns: NavColumn[] = [
    {
      heading: 'Shop',
      links: [
        { label: 'All Products', href: '/(any)/products' },
        { label: 'All Categories', href: '/(tabs)/categories' },
        ...categories.map((c) => ({ label: c.name, href: `/(tabs)/categories/${c.slug}` })),
      ],
    },
    {
      heading: 'Help',
      links: [
        { label: 'Track Order', href: '/(tabs)/orders' },
        { label: 'Returns & FAQ', href: '/(any)/returns' },
        { label: 'Contact Us', href: '/(any)/contact' },
        { label: 'About M2C', href: '/(any)/about' },
        { label: 'Offers', href: '/(any)/offers' },
      ],
    },
    {
      // Signed out these still work: profile and wishlist bounce to login,
      // which is the normal behaviour for an account link.
      heading: 'Account',
      links: [
        { label: 'My Account', href: '/(tabs)/profile' },
        { label: 'My Orders', href: '/(tabs)/orders' },
        { label: 'Wishlist', href: '/(tabs)/wishlist' },
        { label: 'Cart', href: '/(tabs)/cart' },
      ],
    },
  ];

  /* Two columns on a phone, three once there is room — the web's
     `grid-cols-2 sm:grid-cols-3`. 640 is its `sm` breakpoint. */
  const cols = width >= 640 ? 3 : 2;
  const colGap = 24;
  const colWidth = (width - CARD_GUTTER * 2 - colGap * (cols - 1)) / cols;

  const social = [
    { label: 'Instagram', Icon: Instagram, url: 'https://instagram.com' },
    { label: 'Facebook', Icon: Facebook, url: 'https://facebook.com' },
    { label: 'YouTube', Icon: Youtube, url: 'https://youtube.com' },
  ];

  return (
    <LinearGradient
      /* `linear-gradient(172deg, #fdfbf8, #f8f2ea 48%, #f1eae0)`.
         The web lays two brand-red radial washes over this at 0.055 and 0.045
         opacity; at that strength they are imperceptible on a phone, and RN has
         no radial gradient, so the linen alone carries the ground. */
      colors={['#fdfbf8', '#f8f2ea', '#f1eae0']}
      locations={[0, 0.48, 1]}
      start={{ x: 0.06, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={[s.footer, { paddingBottom: insets.bottom + 24 }]}
    >
      {/* One brand-red hairline closing the section above and opening the
          footer — `from-transparent via-[#e01a1b] to-transparent opacity-60`. */}
      <LinearGradient
        colors={['rgba(224,26,27,0)', 'rgba(224,26,27,0.6)', 'rgba(224,26,27,0)']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={s.hairline}
      />

      <View style={s.body}>
        {/* ── Brand ─────────────────────────────────────────────────────── */}
        <Image
          source={info?.companyLogo ? { uri: info.companyLogo } : STATIC_LOGO}
          style={s.logo}
          resizeMode="contain"
          accessible
          accessibilityRole="image"
          accessibilityLabel={companyName}
        />

        <Text style={s.description}>
          Direct from manufacturer to customer — quality-checked home textiles,
          woven and inspected by the people who make them.
        </Text>

        {/* Follow us */}
        <Text style={s.followLabel}>Follow us</Text>
        <View style={s.socialRow}>
          {social.map(({ label, Icon, url }) => (
            <Pressable
              key={label}
              onPress={() => Linking.openURL(url).catch(() => {})}
              accessibilityRole="link"
              accessibilityLabel={label}
              android_ripple={{ color: 'rgba(224,26,27,0.12)', borderless: true, radius: 22 }}
              style={s.socialBtn}
            >
              <Icon size={18} color={BODY} strokeWidth={1.9} />
            </Pressable>
          ))}
        </View>

        {/* ── Navigation ────────────────────────────────────────────────── */}
        <View style={[s.nav, { gap: colGap }]}>
          {columns.map((col) => (
            <View key={col.heading} style={{ width: colWidth }}>
              <Text style={s.colHeading}>{col.heading}</Text>
              <View style={s.colLinks}>
                {col.links.map((l, i) => (
                  <Pressable
                    key={`${l.href}-${i}`}
                    onPress={() => router.push(l.href as any)}
                    accessibilityRole="link"
                    accessibilityLabel={l.label}
                    android_ripple={{ color: 'rgba(0,0,0,0.05)' }}
                    style={s.navLink}
                  >
                    <Text style={s.navLinkText} numberOfLines={1}>
                      {l.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ))}
        </View>

        {/* ── Let's Connect ─────────────────────────────────────────────── */}
        {info?.companyEmail || info?.companyPhone ? (
          <View style={s.connect}>
            <Text style={s.colHeading}>{"Let's Connect"}</Text>
            <View style={s.connectRows}>
              {info?.companyEmail ? (
                <ConnectRow
                  Icon={Mail}
                  label={info.companyEmail}
                  onPress={() => Linking.openURL(`mailto:${info.companyEmail}`).catch(() => {})}
                />
              ) : null}
              {info?.companyPhone ? (
                <ConnectRow
                  Icon={Phone}
                  label={info.companyPhone}
                  onPress={() => Linking.openURL(`tel:${info.companyPhone}`).catch(() => {})}
                />
              ) : null}
            </View>
          </View>
        ) : null}
      </View>

      {/* ── Bottom bar ──────────────────────────────────────────────────── */}
      <View style={s.bottomBar}>
        <View style={s.legalRow}>
          <Pressable onPress={() => router.push('/(any)/terms' as any)} accessibilityRole="link">
            <Text style={s.legalLink}>Terms</Text>
          </Pressable>
          <View style={s.legalSep} />
          <Pressable onPress={() => router.push('/(any)/privacy' as any)} accessibilityRole="link">
            <Text style={s.legalLink}>Privacy</Text>
          </Pressable>
          <View style={s.legalSep} />
          <Pressable onPress={() => router.push('/(any)/returns' as any)} accessibilityRole="link">
            <Text style={s.legalLink}>Returns</Text>
          </Pressable>
        </View>

        <Text style={s.copyright}>
          {'©'} {new Date().getFullYear()} {companyName}. All Rights Reserved
        </Text>
      </View>
    </LinearGradient>
  );
}

function ConnectRow({
  Icon,
  label,
  onPress,
}: {
  Icon: typeof Mail;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="link"
      accessibilityLabel={label}
      android_ripple={{ color: 'rgba(0,0,0,0.05)' }}
      style={s.connectRow}
    >
      <Icon size={16} color="#a8968c" strokeWidth={2} />
      <Text style={s.connectText} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  footer: { width: '100%' },
  hairline: { height: 1, width: '100%' },

  body: { paddingHorizontal: CARD_GUTTER, paddingTop: 32 },

  logo: { width: 176, height: 109, marginBottom: 16 },
  description: {
    fontFamily: Fonts.sans,
    fontSize: 14.5,
    lineHeight: 24, // leading-[1.65]
    color: BODY,
    maxWidth: 304, // max-w-[19rem]
    marginBottom: 24,
  },

  followLabel: {
    fontFamily: Fonts.sansBold,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 2.2, // 0.2em
    color: FAINT,
    marginBottom: 12,
  },
  socialRow: { flexDirection: 'row', gap: 10, marginBottom: 36 },
  socialBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: RULE,
    backgroundColor: 'rgba(255,255,255,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  nav: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 36 },
  /* `text-[11px] font-bold uppercase tracking-[0.24em] text-[#c41617]` */
  colHeading: {
    fontFamily: Fonts.sansBold,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 2.64, // 0.24em
    color: DEEP,
  },
  colLinks: { marginTop: 14 },
  /* A 36pt row rather than the web's py-[7px]: this is a tap target, not a
     hover target. */
  navLink: { paddingVertical: 8, minHeight: 36, justifyContent: 'center' },
  navLinkText: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    color: INK,
  },

  connect: { marginTop: 36 },
  connectRows: { marginTop: 14, gap: 4 },
  connectRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 36 },
  connectText: { fontFamily: Fonts.sans, fontSize: 14, color: INK, flex: 1 },

  bottomBar: {
    marginTop: 36,
    marginHorizontal: CARD_GUTTER,
    borderTopWidth: 1,
    borderTopColor: RULE,
    paddingTop: 20,
    alignItems: 'center',
    gap: 12,
  },
  legalRow: { flexDirection: 'row', alignItems: 'center', gap: 16, flexWrap: 'wrap', justifyContent: 'center' },
  legalLink: {
    fontFamily: Fonts.sansMedium,
    fontSize: 13,
    fontWeight: '500',
    color: INK,
  },
  legalSep: { width: 1, height: 12, backgroundColor: '#ded3c6' },
  copyright: {
    fontFamily: Fonts.sans,
    fontSize: 13,
    color: '#7d736c',
    textAlign: 'center',
  },
});
