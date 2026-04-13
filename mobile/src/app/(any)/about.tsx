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
      <About />
      <Footer/>
    </ScrollView>
  );
}
