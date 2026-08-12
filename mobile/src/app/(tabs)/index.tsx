import React, { useState, useCallback } from 'react';
import { ScrollView, RefreshControl, View } from 'react-native';
import HeroSection from '@/components/WebSite/Home/HeroSection';
import CategoryStrip from '@/components/WebSite/Home/CategoryStrip';
import NoticeBoard from '@/components/WebSite/Home/NoticeBoard';
import BrandPromo from '@/components/WebSite/Home/BrandPromo';
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
    <View className="flex-1" style={{ backgroundColor: '#eceef1' }}>
      <Header />
      <ScrollView
        className="flex-1"
        style={{ backgroundColor: '#eceef1' }}
        contentContainerStyle={{ paddingBottom: 0 }}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#374151" />
        }
      >
        {/* Roughly the web's running order, with two phone-specific changes:
            CategoriesSection moves up (a category grid earns its place high on a
            phone), and NoticeBoard sits AFTER it rather than directly under the
            hero — back to back, the two horizontally-scrolling strips read as one
            component. */}
        <CategoryStrip key={`strip-${refreshNonce}`} />
        <HeroSection key={`hero-${refreshNonce}`} />
        <CategoriesSection key={`cats-${refreshNonce}`} />
        <NoticeBoard key={`notice-${refreshNonce}`} />
        <FeaturedProductsSection key={`feat-${refreshNonce}`} />
        <BrandPromo />
        <TopSellingSection key={`top-${refreshNonce}`} />
        <BestSellerSection key={`best-${refreshNonce}`} />
        <ValueSection />
        <Footer />
      </ScrollView>
    </View>
  );
}
