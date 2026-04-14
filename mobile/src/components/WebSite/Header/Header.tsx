import React, { useState } from 'react';
import { View, Text, Pressable, TextInput } from 'react-native';
import { Search, User, ShoppingCart } from 'lucide-react-native';
import { useRouter } from 'expo-router';

const pressableOpacity = ({ pressed }: { pressed: boolean }) => ({
  opacity: pressed ? 0.7 : 1,
});

export function Header() {
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();

  const handleSearch = () => {
    const q = searchQuery.trim();
    if (q.length > 0) {
      router.push(`/(any)/products?search=${encodeURIComponent(q)}` as any);
    }
  };

  return (
    <View className="bg-gray-900">
      {/* First Section - Brand, Profile, Cart */}
      <View className="px-4 py-3 flex-row items-center justify-between">
        {/* Brand Text (tap to go home) */}
        <Pressable
          onPress={() => router.push('/(tabs)' as any)}
          accessibilityLabel="Go to home"
          accessibilityRole="button"
          className="flex-1"
          style={pressableOpacity}
        >
          <Text className="text-base font-bold text-white">M2C MarkDowns</Text>
          <Text className="text-xs text-gray-400">Private Limited</Text>
        </Pressable>

        {/* Profile Icon */}
        <Pressable
          onPress={() => router.push('/(tabs)/profile' as any)}
          accessibilityLabel="View profile"
          accessibilityRole="button"
          style={pressableOpacity}
          className="p-2"
          hitSlop={8}
        >
          <User size={24} color="#ffffff" />
        </Pressable>

        {/* Cart Icon */}
        <Pressable
          onPress={() => router.push('/(tabs)/cart' as any)}
          accessibilityLabel="View cart"
          accessibilityRole="button"
          style={pressableOpacity}
          className="p-2 ml-1"
          hitSlop={8}
        >
          <ShoppingCart size={24} color="#ffffff" />
        </Pressable>
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
            style={{ fontSize: 16 }}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
            accessibilityLabel="Search products"
          />
          <Pressable
            onPress={handleSearch}
            accessibilityLabel="Submit search"
            accessibilityRole="button"
            style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
            className="bg-amber-400 px-4 py-3"
          >
            <Search size={24} color="#000000" />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

export default Header;
