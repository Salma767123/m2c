import React from 'react';
import { View, Text, TouchableOpacity, Linking, Image } from 'react-native';
import { Mail, Phone, MapPin, Facebook, Twitter, Instagram, Linkedin, ChevronRight } from 'lucide-react-native';
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

  const handleEmailPress = () => {
    Linking.openURL('mailto:info@m2cmarkdowns.com');
  };

  const handlePhonePress = () => {
    Linking.openURL('tel:+1234567890');
  };

  const quickLinks = [
    { label: 'Home', href: '/(tabs)' },
    { label: 'About Us', href: '/(any)/about' },
    { label: 'Contact us',href:'/(any)/contact'},
  ];

  const legalLinks = [
    { label: 'Privacy Policy', href: '/privacy' },
    { label: 'Terms of Service', href: '/terms' },
    { label: 'Return Policy', href: '/returns' },
  
  ];

  const socialLinks = [
    { icon: Facebook, url: 'https://facebook.com', color: '#1877F2' },
    { icon: Twitter, url: 'https://twitter.com', color: '#1DA1F2' },
    { icon: Instagram, url: 'https://instagram.com', color: '#E4405F' },
    { icon: Linkedin, url: 'https://linkedin.com', color: '#0A66C2' },
  ];

  return (
    <View className="bg-[#1a1a1a]">
      {/* Main Footer Content */}
      <View className="px-6 py-4">
        {/* Company Info */}
        <View className="mb-8 pb-8 border-b border-gray-800 items-center">
          <View className="bg-white rounded-lg p-2 mb-4 shadow-lg">
            <Image 
              source={require('../../../../assets/images/logo4.png')}
              className="w-32 h-28"
              resizeMode="contain"
            />
          </View>
          <Text className="text-2xl font-bold text-white mb-2">M2C MarkDowns</Text>
          <Text className="text-base text-gray-400">Private Limited</Text>
        </View>

        {/* Links Grid */}
        <View className="mb-4">
          <View className="flex-row">
            {/* Quick Links - Left Side (50%) */}
            <View className="w-1/2 pr-2">
              <Text className="text-lg font-bold text-white mb-4">Quick Links</Text>
              <View className="space-y-2">
                {quickLinks.map((link) => (
                  <TouchableOpacity
                    key={link.label}
                    onPress={() => handleLinkPress(link.href)}
                    className="flex-row items-center py-2"
                  >
                    <ChevronRight size={14} color="#9ca3af" />
                    <Text className="text-gray-300 text-sm ml-2">{link.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Legal Links - Right Side (50%) */}
            <View className="w-1/2 pl-2">
              <Text className="text-lg font-bold text-white mb-4">Legal</Text>
              <View className="space-y-2">
                {legalLinks.map((link) => (
                  <TouchableOpacity
                    key={link.label}
                    onPress={() => handleLinkPress(link.href)}
                    className="flex-row items-center py-2"
                  >
                    <ChevronRight size={14} color="#9ca3af" />
                    <Text className="text-gray-300 text-sm ml-2" numberOfLines={2}>
                      {link.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </View>

        {/* Contact Info */}
        <View className="mb-8 bg-gray-800 rounded-2xl p-5">
          <Text className="text-lg font-bold text-white mb-4">Get In Touch</Text>
          <View className="space-y-4 gap-2">
            <TouchableOpacity
              onPress={handleEmailPress}
              className="flex-row items-center bg-gray-700 rounded-xl p-3"
            >
              <View className="bg-blue-500 rounded-full p-2">
                <Mail size={16} color="#ffffff" />
              </View>
              <Text className="text-gray-200 text-sm ml-3 flex-1">
                info@m2cmarkdowns.com
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handlePhonePress}
              className="flex-row items-center bg-gray-700 rounded-xl p-3"
            >
              <View className="bg-green-500 rounded-full p-2">
                <Phone size={16} color="#ffffff" />
              </View>
              <Text className="text-gray-200 text-sm ml-3 flex-1">
                +1 (234) 567-8900
              </Text>
            </TouchableOpacity>

            <View className="flex-row items-start bg-gray-700 rounded-xl p-3">
              <View className="bg-red-500 rounded-full p-2">
                <MapPin size={16} color="#ffffff" />
              </View>
              <Text className="text-gray-200 text-sm ml-3 flex-1 leading-5">
                123 Textile Street, Fashion District{'\n'}New York, NY 10001
              </Text>
            </View>
          </View>
        </View>

        {/* Social Media */}
        <View className="mb-2">
          <Text className="text-lg font-bold text-white mb-4 text-center">Follow Us</Text>
          <View className="flex-row justify-center space-x-3">
            {socialLinks.map((social, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => handleLinkPress(social.url)}
                className="bg-gray-800 p-4 rounded-full shadow-lg"
                style={{ backgroundColor: social.color + '20' }}
              >
                <social.icon size={22} color={social.color} />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {/* Bottom Bar */}
      <View className="border-t border-gray-800 px-6 py-5 bg-black">
        <Text className="text-center text-gray-400 text-xs leading-5">
          © {currentYear} M2C MarkDowns Private Limited.{'\n'}All rights reserved.
        </Text>
      </View>
    </View>
  );
}