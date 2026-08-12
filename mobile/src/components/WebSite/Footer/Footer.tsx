import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, Linking, Image, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Instagram, Facebook, Youtube } from 'lucide-react-native';
import { companyInfoService } from '@/services/companyInfoService';

const STATIC_LOGO = require('../../../../assets/images/logo4.png');

// Solid brand-maroon theme for the footer (no gradient/texture) — swap this
// single value if the exact shade needs tuning later.
const FOOTER_BG = '#270109';

export default function Footer() {
  const currentYear = new Date().getFullYear();
  const insets = useSafeAreaInsets();
  const [companyLogo, setCompanyLogo] = useState<string | null>(null);

  // Load dynamic company logo (cached first, then fresh from API)
  useEffect(() => {
    companyInfoService.getCachedCompanyInfo().then((info) => {
      if (info.companyLogo) setCompanyLogo(info.companyLogo);
    });
    companyInfoService.getPublicCompanyInfo().then((info) => {
      if (info.companyLogo) setCompanyLogo(info.companyLogo);
    }).catch(() => {});
  }, []);

  const openUrl = (url: string) => {
    if (url) Linking.openURL(url);
  };

  // Matches web: uniform circles with white icons (no per-brand colors).
  const socialLinks = [
    { label: 'Instagram', icon: Instagram, url: 'https://instagram.com' },
    { label: 'Facebook', icon: Facebook, url: 'https://facebook.com' },
    { label: 'YouTube', icon: Youtube, url: 'https://youtube.com' },
  ];

  return (
    <View style={[s.wrap, { paddingBottom: insets.bottom + 24 }]}>
      {/* Brand */}
      <View style={s.brandBlock}>
        {/* White plate behind the mark — logo4.png is black line art on a
            transparent background and is invisible on a dark footer without it.
            Matches Login, AuthKit and the splash screen. */}
        <View style={s.logoPlate}>
          <Image
            source={companyLogo ? { uri: companyLogo } : STATIC_LOGO}
            style={s.logo}
            resizeMode="contain"
          />
        </View>
        <Text style={s.brandName}>M2C MarkDowns</Text>
        <Text style={s.brandSub}>Private Limited</Text>
      </View>

      {/* Company description — mirrors web copy */}
      <Text style={s.description}>
        Premium home textiles manufacturer specializing in high-quality towels,
        kitchen aprons, table linens, and bath accessories. Crafted with finest
        cotton and sustainable materials.
      </Text>

      {/* Contact — mirrors web's Contact Info list */}
      <View style={s.contactBlock}>
        <Text onPress={() => Linking.openURL('mailto:info@navnittextiles.com')} style={s.contactLine}>
          info@navnittextiles.com
        </Text>
        <Text style={s.contactLine}>Jaipur Raj 302012</Text>
        <Text style={[s.contactLine, s.contactAddress]}>
          307/A, Gumasta Marg, Pul, Jaipur Disawer, Rajasthan 302001
        </Text>
      </View>

      {/* Social icons — uniform circles, evenly spaced */}
      <View style={s.socialRow}>
        {socialLinks.map((social) => (
          <Pressable
            key={social.label}
            onPress={() => openUrl(social.url)}
            accessibilityRole="button"
            accessibilityLabel={social.label}
            android_ripple={{ color: 'rgba(255,255,255,0.15)', borderless: true, radius: 22 }}
            style={({ pressed }) => [s.socialBtn, pressed && s.socialBtnPressed]}
          >
            <social.icon size={18} color="#ffffff" />
          </Pressable>
        ))}
      </View>

      {/* Copyright */}
      <View style={s.copyrightBlock}>
        <Text style={s.copyrightText}>
          © {currentYear} M2C MarkDowns Private Limited.{'\n'}All rights reserved.
        </Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    backgroundColor: FOOTER_BG,
    paddingTop: 48,
    paddingHorizontal: 24,
  },

  brandBlock: { alignItems: 'center', marginBottom: 32 },
  logoPlate: {
    marginBottom: 16,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: { width: 220, height: 104 },
  brandName: { color: '#ffffff', fontSize: 18, fontWeight: '600', textAlign: 'center' },
  brandSub: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
    textAlign: 'center',
  },

  description: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 32,
  },

  contactBlock: { alignItems: 'center', marginBottom: 32 },
  contactLine: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 8,
  },
  contactAddress: { marginBottom: 0 },

  socialRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    marginBottom: 32,
  },
  socialBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  socialBtnPressed: { opacity: 0.75 },

  copyrightBlock: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.15)',
    paddingTop: 24,
    alignItems: 'center',
  },
  copyrightText: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
});