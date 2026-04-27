import React, { useState, useCallback } from 'react';
import { ScrollView, RefreshControl, View } from 'react-native';
import HeroSection from '@/components/WebSite/Home/HeroSection';
import CategoriesSection from '@/components/WebSite/Home/CategoriesSection';
import FeaturedProductsSection from '@/components/WebSite/Home/FeaturedProductsSection';
import BestSellerSection from '@/components/WebSite/Home/BestSellerSection';
import TopSellingSection from '@/components/WebSite/Home/TopSellingSection';
import ValueSection from '@/components/WebSite/Home/ValueSection';
import Header from '@/components/WebSite/Header/Header';
import Footer from '@/components/WebSite/Footer/Footer';

export default function HomeScreen() {
  const [refreshing, setRefreshing] = useState(false);
  // Nonce forces child sections to refetch on pull-to-refresh
  const [refreshNonce, setRefreshNonce] = useState(0);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setRefreshNonce((n) => n + 1);
    // Keep spinner visible briefly so user sees refresh feedback
    setTimeout(() => setRefreshing(false), 800);
  }, []);

  return (
    <View className="flex-1 bg-gray-50">
      <Header />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 0 }}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#374151" />
        }
      >
        <HeroSection key={`hero-${refreshNonce}`} />
        <CategoriesSection key={`cats-${refreshNonce}`} />
        <FeaturedProductsSection key={`feat-${refreshNonce}`} />
        <TopSellingSection key={`top-${refreshNonce}`} />
        <BestSellerSection key={`best-${refreshNonce}`} />
        <ValueSection />
        <Footer />
      </ScrollView>
    </View>
  );
}
