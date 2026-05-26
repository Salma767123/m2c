import React from 'react';
import { View, Text, Pressable, ScrollView, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
import Contact from '@/components/WebSite/Contact/Contact';
import Footer from '@/components/WebSite/Footer/Footer';

export default function ContactPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      {/* Header */}
      <View
        style={{
          backgroundColor: '#fff',
          paddingTop: insets.top + 8,
          paddingBottom: 12,
          paddingHorizontal: 8,
          borderBottomWidth: 1,
          borderBottomColor: '#e5e7eb',
        }}
      >
        <View className="flex-row items-center">
          <Pressable
            onPress={() => router.back()}
            accessibilityLabel="Go back"
            accessibilityRole="button"
            hitSlop={6}
            android_ripple={{ color: 'rgba(0,0,0,0.06)', borderless: true, radius: 22 }}
          >
            <View style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginRight: 4 }}>
              <ArrowLeft size={24} color="#111827" />
            </View>
          </Pressable>
          <Text className="text-xl font-bold text-gray-800">Contact Us</Text>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
      >
        <Contact />
        <Footer />
      </ScrollView>
    </View>
  );
}
