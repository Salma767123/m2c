import React from 'react';
import { View, TouchableOpacity, ScrollView } from 'react-native';
import { Stack, router } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import Contact from '@/components/WebSite/Contact/Contact';
import Header from '@/components/WebSite/Header/Header'
import Footer from '@/components/WebSite/Footer/Footer'

export default function ContactPage() {
  return (
    
      <ScrollView className="flex-1">
        <Header />
        <Contact />
        <Footer />
      </ScrollView>

  );
}
