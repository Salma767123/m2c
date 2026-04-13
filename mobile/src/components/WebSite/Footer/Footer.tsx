import React from 'react';
import { View, Text, TouchableOpacity, Linking, Image } from 'react-native';
import {
  Mail,
  Phone,
  MapPin,
  Facebook,
  Twitter,
  Instagram,
  Linkedin,
  MessageCircle,
  ChevronRight,
} from 'lucide-react-native';
import { router } from 'expo-router';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  const handleLinkPress = (url: string) => {
    if (url.startsWith('http')) {
      Linking.openURL(url);
    } else {
      router.push(url as any);
    }
  };

  const handleEmailPress = () => Linking.openURL('mailto:info@m2cmarkdowns.com');
  const handlePhonePress = () => Linking.openURL('tel:+1234567890');
  const handleWhatsApp   = () => Linking.openURL('https://wa.me/1234567890');

  const quickLinks = [
    { label: 'Home',       href: '/(tabs)' },
    { label: 'About Us',   href: '/(any)/about' },
    { label: 'Contact Us', href: '/(any)/contact' },
    { label: 'My Wishlist', href: '/(any)/wishlist' },
  ];

  const legalLinks = [
    { label: 'Privacy Policy',   href: '/privacy' },
    { label: 'Terms of Service', href: '/terms' },
    { label: 'Return Policy',    href: '/returns' },
  ];

  const socialLinks = [
    { label: 'Facebook',  icon: Facebook,       url: 'https://facebook.com'  },
    { label: 'Twitter',   icon: Twitter,        url: 'https://twitter.com'   },
    { label: 'Instagram', icon: Instagram,      url: 'https://instagram.com' },
    { label: 'LinkedIn',  icon: Linkedin,       url: 'https://linkedin.com'  },
    { label: 'WhatsApp',  icon: MessageCircle,  url: '',                     onPress: handleWhatsApp },
  ];

  return (
    <View className="bg-[#1a1a1a]">

      {/* ── Main Content ──────────────────────────────────────────────────────── */}
      <View className="px-5 pt-6 pb-4">

        {/* ── 1. Company Info: image LEFT | text RIGHT ──────────────────────── */}
        <View className="flex-row items-center mb-6 pb-6 border-b border-gray-800">
          {/* Logo */}
          <View className="bg-white rounded-2xl p-3 shadow-md" style={{ shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 6, elevation: 4 }}>
            <Image
              source={require('../../../../assets/images/logo4.png')}
              className="w-32 h-20"
              resizeMode="cover"
            />
          </View>

          {/* Company text — right-aligned */}
          <View className="flex-1 items-end pl-4">
            <Text className="text-xl font-bold text-white text-right tracking-tight leading-tight">
              M2C MarkDowns
            </Text>
            <View className="w-10 h-px bg-gray-600 mt-2 mb-2" />
            <Text className="text-xs font-semibold text-gray-400 text-right uppercase tracking-widest">
              Private Limited
            </Text>
          </View>
        </View>

        {/* ── Links Grid ───────────────────────────────────────────────────── */}
        <View className="flex-row mb-6">
          {/* Quick Links — 50% */}
          <View className="w-1/2 pr-4">
            <Text className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
              Quick Links
            </Text>
            {quickLinks.map(link => (
              <TouchableOpacity
                key={link.label}
                onPress={() => handleLinkPress(link.href)}
                className="flex-row items-center py-2"
              >
                <ChevronRight size={12} color="#6b7280" />
                <Text className="text-gray-300 text-sm ml-1.5">{link.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Legal Links — 50% */}
          <View className="w-1/2 pl-4 border-l border-gray-800">
            <Text className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
              Legal
            </Text>
            {legalLinks.map(link => (
              <TouchableOpacity
                key={link.label}
                onPress={() => handleLinkPress(link.href)}
                className="flex-row items-center py-2"
              >
                <ChevronRight size={12} color="#6b7280" />
                <Text className="text-gray-300 text-sm ml-1.5" numberOfLines={2}>
                  {link.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── 2. Contact Info — simple, no colour ──────────────────────────── */}
        <View className="mb-6 pb-6 border-b border-gray-800">
          <Text className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
            Contact
          </Text>

          {/* Email */}
          <TouchableOpacity
            onPress={handleEmailPress}
            className="flex-row items-center py-2.5"
          >
            <View className="w-7 h-7 rounded-full border border-gray-700 items-center justify-center mr-3">
              <Mail size={13} color="#9ca3af" />
            </View>
            <Text className="text-gray-300 text-sm flex-1">
              info@m2cmarkdowns.com
            </Text>
          </TouchableOpacity>

          {/* Divider */}
          <View className="border-b border-gray-800 mx-10" />

          {/* Phone */}
          <TouchableOpacity
            onPress={handlePhonePress}
            className="flex-row items-center py-2.5"
          >
            <View className="w-7 h-7 rounded-full border border-gray-700 items-center justify-center mr-3">
              <Phone size={13} color="#9ca3af" />
            </View>
            <Text className="text-gray-300 text-sm flex-1">
              +1 (234) 567-8900
            </Text>
          </TouchableOpacity>

          {/* Divider */}
          <View className="border-b border-gray-800 mx-10" />

          {/* Address */}
          <View className="flex-row items-start py-2.5">
            <View className="w-7 h-7 rounded-full border border-gray-700 items-center justify-center mr-3 mt-0.5">
              <MapPin size={13} color="#9ca3af" />
            </View>
            <Text className="text-gray-300 text-sm flex-1 leading-5">
              123 Textile Street, Fashion District{'\n'}New York, NY 10001
            </Text>
          </View>
        </View>

        {/* ── 3. Social Media — label LEFT | icons RIGHT ────────────────────── */}
        <View className="flex-row items-center justify-between mb-2">
          {/* Left label */}
          <Text className="text-xs font-bold text-gray-400 uppercase tracking-widest">
            Follow Us
          </Text>

          {/* Right icons */}
          <View className="flex-row items-center gap-2">
            {socialLinks.map((social, index) => (
              <TouchableOpacity
                key={index}
                onPress={social.onPress ? social.onPress : () => handleLinkPress(social.url)}
                className="w-9 h-9 rounded-full border border-gray-700 items-center justify-center"
                accessibilityLabel={social.label}
              >
                <social.icon size={17} color="#9ca3af" />
              </TouchableOpacity>
            ))}
          </View>
        </View>

      </View>

      {/* ── Bottom Bar ──────────────────────────────────────────────────────── */}
      <View className="border-t border-gray-800 px-6 py-4 bg-black">
        <Text className="text-center text-gray-500 text-xs leading-5">
          © {currentYear} M2C MarkDowns Private Limited.{'\n'}All rights reserved.
        </Text>
      </View>

    </View>
  );
}