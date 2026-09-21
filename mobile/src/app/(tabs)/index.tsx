import React, { useState, useCallback } from 'react';
import { RefreshControl, View } from 'react-native';
import { RevealScrollView } from '@/components/WebSite/Shared/Reveal';
import HeroSection from '@/components/WebSite/Home/HeroSection';
import PromoStrip from '@/components/WebSite/Home/PromoStrip';
import CategoryStrip from '@/components/WebSite/Home/CategoryStrip';
import NoticeBoard from '@/components/WebSite/Home/NoticeBoard';
import BrandPromo from '@/components/WebSite/Home/BrandPromo';
import CategoriesSection from '@/components/WebSite/Home/CategoriesSection';
import FeaturedProductsSection from '@/components/WebSite/Home/FeaturedProductsSection';
import BestSellerSection from '@/components/WebSite/Home/BestSellerSection';
import TopSellingSection from '@/components/WebSite/Home/TopSellingSection';
import DownloadApp from '@/components/WebSite/Home/DownloadApp';
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
      <RevealScrollView
        className="flex-1"
        style={{ backgroundColor: '#eceef1' }}
        contentContainerStyle={{ paddingBottom: 0 }}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#374151" />
        }
      >
        {/* The web's running order, one for one (frontend/src/app/page.tsx):
            Hero → PromoStrip → NoticeBoard → Featured → BrandPromo → TopSelling
            → BestSeller → Categories → DownloadApp → ValueSection → Footer.

            One deliberate difference remains: CategoryStrip leads, standing in
            for the category ribbon the web keeps inside its header — a phone
            header has no room for it. */}
        <CategoryStrip key={`strip-${refreshNonce}`} />
        <HeroSection key={`hero-${refreshNonce}`} />
        <PromoStrip key={`promo-${refreshNonce}`} />
        <NoticeBoard key={`notice-${refreshNonce}`} />
        <FeaturedProductsSection key={`feat-${refreshNonce}`} />
        <BrandPromo />
        <TopSellingSection key={`top-${refreshNonce}`} />
        <BestSellerSection key={`best-${refreshNonce}`} />
        <CategoriesSection key={`cats-${refreshNonce}`} />
        <DownloadApp />
        <ValueSection />
        <Footer />
      </RevealScrollView>
    </View>
  );
}
