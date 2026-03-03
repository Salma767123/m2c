import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import About from '@/components/WebSite/About/About';
import Footer from '@/components/WebSite/Footer/Footer';
import { ScrollView } from 'react-native';

export default function AboutScreen() {
  const router = useRouter();

  return (
    <ScrollView className="flex-1 bg-white">
      {/* Header */}
      <View className="bg-white px-4 py-6 border-b border-gray-200">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center flex-1">
            <TouchableOpacity onPress={() => router.back()} className="mr-3">
              <ArrowLeft size={24} color="#111827" />
            </TouchableOpacity>
            <Text className="text-xl font-bold text-gray-800">About Us</Text>
          </View>
        </View>
      </View>
      <About />
      <Footer/>
    </ScrollView>
  );
}
