import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import About from '@/components/WebSite/About/About';
import Footer from '@/components/WebSite/Footer/Footer';

export default function AboutScreen() {
  const router = useRouter();

  return (
    <View className="flex-1 bg-white">
      {/* Header */}
      <View className="bg-white px-4 py-4 border-b border-gray-200">
        <View className="flex-row items-center">
          <Pressable
            onPress={() => router.back()}
            accessibilityLabel="Go back"
            accessibilityRole="button"
            hitSlop={10}
            style={({ pressed }) => ({
              opacity: pressed ? 0.6 : 1,
              padding: 4,
              marginRight: 8,
            })}
          >
            <ArrowLeft size={24} color="#111827" />
          </Pressable>
          <Text className="text-xl font-bold text-gray-800">About Us</Text>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
      >
        <About />
        <Footer />
      </ScrollView>
    </View>
  );
}
