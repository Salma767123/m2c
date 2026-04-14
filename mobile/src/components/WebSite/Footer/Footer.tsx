import React from 'react';
import { View, Text, Pressable, Linking, Image } from 'react-native';
import { Mail, Phone, MapPin, Facebook, Twitter, Instagram, Linkedin, ChevronRight, MessageCircle } from 'lucide-react-native';
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
    { label: 'Privacy Policy', href: '/(any)/privacy' },
    { label: 'Terms of Service', href: '/(any)/terms' },
    { label: 'Return Policy', href: '/(any)/returns' },
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

        {/* Links Grid */}
        <View className="mb-4">
          <View className="flex-row">
            {/* Quick Links - Left Side (50%) */}
            <View className="w-1/2 pr-2">
              <Text className="text-lg font-bold text-white mb-4">Quick Links</Text>
              <View className="space-y-2">
                {quickLinks.map((link) => (
                  <Pressable
                    key={link.label}
                    onPress={() => handleLinkPress(link.href)}
                    accessibilityLabel={`Go to ${link.label}`}
                    accessibilityRole="button"
                    style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
                    className="flex-row items-center py-2"
                  >
                    <ChevronRight size={14} color="#9ca3af" />
                    <Text className="text-gray-300 text-sm ml-2">{link.label}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Legal Links - Right Side (50%) */}
            <View className="w-1/2 pl-2">
              <Text className="text-lg font-bold text-white mb-4">Legal</Text>
              <View className="space-y-2">
                {legalLinks.map((link) => (
                  <Pressable
                    key={link.label}
                    onPress={() => handleLinkPress(link.href)}
                    accessibilityLabel={`Go to ${link.label}`}
                    accessibilityRole="button"
                    style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
                    className="flex-row items-center py-2"
                  >
                    <ChevronRight size={14} color="#9ca3af" />
                    <Text className="text-gray-300 text-sm ml-2" numberOfLines={2}>
                      {link.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>
        </View>

        {/* Contact Info */}
        <View className="mb-8 bg-gray-800 rounded-2xl p-5">
          <Text className="text-lg font-bold text-white mb-4">Get In Touch</Text>
          <View className="space-y-4 gap-2">
            <Pressable
              onPress={handleEmailPress}
              accessibilityLabel="Send email"
              accessibilityRole="button"
              style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
              className="flex-row items-center bg-gray-700 rounded-xl p-3"
            >
              <View className="bg-blue-500 rounded-full p-2">
                <Mail size={16} color="#ffffff" />
              </View>
              <Text className="text-gray-200 text-sm ml-3 flex-1">
                info@m2cmarkdowns.com
              </Text>
            </Pressable>

            <Pressable
              onPress={handlePhonePress}
              accessibilityLabel="Call us"
              accessibilityRole="button"
              style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
              className="flex-row items-center bg-gray-700 rounded-xl p-3"
            >
              <View className="bg-green-500 rounded-full p-2">
                <Phone size={16} color="#ffffff" />
              </View>
              <Text className="text-gray-200 text-sm ml-3 flex-1">
                +1 (234) 567-8900
              </Text>
            </Pressable>

            <View className="flex-row items-start bg-gray-700 rounded-xl p-3">
              <View className="bg-red-500 rounded-full p-2">
                <MapPin size={16} color="#ffffff" />
              </View>
              <Text className="text-gray-200 text-sm ml-3 flex-1 leading-5">
                123 Textile Street, Fashion District{'\n'}New York, NY 10001
              </Text>
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
              <Pressable
                key={index}
                onPress={() => handleLinkPress(social.url)}
                accessibilityLabel="Open social media"
                accessibilityRole="button"
                className="p-4 rounded-full shadow-lg"
                style={({ pressed }) => ({
                  backgroundColor: social.color + '20',
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <social.icon size={22} color={social.color} />
              </Pressable>
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