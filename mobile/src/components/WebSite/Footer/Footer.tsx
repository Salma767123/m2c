import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, Linking, Image } from 'react-native';
import { Instagram, Facebook, Youtube } from 'lucide-react-native';
import { companyInfoService } from '@/services/companyInfoService';

const STATIC_LOGO = require('../../../../assets/images/logo4.png');

export default function Footer() {
  const currentYear = new Date().getFullYear();
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

  // Matches web: uniform dark-gray circles with white icons (no brand colors).
  const socialLinks = [
    { label: 'Instagram', icon: Instagram, url: 'https://instagram.com' },
    { label: 'Facebook', icon: Facebook, url: 'https://facebook.com' },
    { label: 'YouTube', icon: Youtube, url: 'https://youtube.com' },
  ];

  return (
    <View className="bg-black pt-12 pb-8 px-6">
      {/* Brand */}
      <View className="items-center mb-8">
        <View className="mb-4">
          <Image
            source={companyLogo ? { uri: companyLogo } : STATIC_LOGO}
            style={{ width: 260, height: 120 }}
            resizeMode="contain"
          />
        </View>
        <Text className="text-white text-lg font-semibold">M2C MarkDowns</Text>
        <Text className="text-gray-400 text-xs font-medium mt-1">
          Private Limited
        </Text>
      </View>

      {/* Company description — mirrors web copy */}
      <Text className="text-gray-300 text-sm leading-5 text-center mb-8">
        Premium home textiles manufacturer specializing in high-quality towels,
        kitchen aprons, table linens, and bath accessories. Crafted with finest
        cotton and sustainable materials.
      </Text>

      {/* Contact — mirrors web's Contact Info list */}
      <View className="items-center mb-8">
        <Text
          onPress={() => Linking.openURL('mailto:info@navnittextiles.com')}
          className="text-gray-300 text-sm mb-2"
        >
          info@navnittextiles.com
        </Text>
        <Text className="text-gray-300 text-sm mb-2">Jaipur Raj 302012</Text>
        <Text className="text-gray-300 text-sm text-center leading-5">
          307/A, Gumasta Marg, Pul, Jaipur Disawer, Rajasthan 302001
        </Text>
      </View>

      {/* Social icons — uniform gray circles, matches web */}
      <View className="flex-row justify-center gap-3 mb-8">
        {socialLinks.map((social) => (
          <Pressable
            key={social.label}
            onPress={() => openUrl(social.url)}
            accessibilityRole="button"
            accessibilityLabel={social.label}
            className="w-10 h-10 rounded-full items-center justify-center"
            style={({ pressed }) => ({
              backgroundColor: pressed ? '#525252' : '#3d3d3d',
            })}
          >
            <social.icon size={18} color="#ffffff" />
          </Pressable>
        ))}
      </View>

      {/* Copyright */}
      <View className="border-t border-gray-800 pt-6 items-center">
        <Text className="text-gray-500 text-xs text-center leading-5">
          © {currentYear} M2C MarkDowns Private Limited.
          {'\n'}All rights reserved.
        </Text>
      </View>
    </View>
  );
}
