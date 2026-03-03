import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput } from 'react-native';
import { Search, User, ShoppingCart, Menu } from 'lucide-react-native';
import { useRouter } from 'expo-router';

export function Header() {
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();

  const handleSearch = () => {
    if (searchQuery.trim()) {
      router.push(`/(tabs)/search?q=${encodeURIComponent(searchQuery)}` as any);
    }
  };

  return (
    <View className="bg-gray-900">
      {/* First Section - Menu, Text, Profile, Cart */}
      <View className="px-4 py-3 flex-row items-center justify-between">
        {/* Menu Icon */}
        <TouchableOpacity
          onPress={() => {}}
          className="p-2"
          activeOpacity={0.7}
        >
          <Menu size={24} color="#ffffff" />
        </TouchableOpacity>

        {/* Text Section */}
        <View className="flex-1 mx-3">
          <Text className="text-base font-bold text-white">
            M2C MarkDowns
          </Text>
          <Text className="text-xs text-gray-400">
            Private Limited
          </Text>
        </View>

        {/* Profile Icon */}
        <TouchableOpacity
          onPress={() => router.push('/(tabs)/profile' as any)}
          className="p-2"
          activeOpacity={0.7}
        >
          <User size={24} color="#ffffff" />
        </TouchableOpacity>

        {/* Cart Icon */}
        <TouchableOpacity
          onPress={() => router.push('/(tabs)/cart' as any)}
          className="p-2 ml-2"
          activeOpacity={0.7}
        >
          <ShoppingCart size={24} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {/* Second Section - Search Bar */}
      <View className="px-4 pb-3">
        <View className="flex-row items-center bg-white rounded-xl overflow-hidden">
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search products..."
            placeholderTextColor="#9ca3af"
            className="flex-1 px-4 py-3 text-gray-900"
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          <TouchableOpacity
            onPress={handleSearch}
            className="bg-amber-400 px-4 py-3"
            activeOpacity={0.8}
          >
            <Search size={24} color="#000000" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

export default Header;
