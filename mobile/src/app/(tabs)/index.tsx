import React, { useState } from 'react';
import { ScrollView, RefreshControl } from 'react-native';
import HeroSection from '@/components/WebSite/Home/HeroSection';
import CategoriesSection from '@/components/WebSite/Home/CategoriesSection';
import FeaturedProductsSection from '@/components/WebSite/Home/FeaturedProductsSection';
import BestSellerSection from '@/components/WebSite/Home/BestSellerSection';
import TopSellingSection from '@/components/WebSite/Home/TopSellingSection';
import Header from '@/components/WebSite/Header/Header';
import Footer from '@/components/WebSite/Footer/Footer';

export default function HomeScreen() {
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <Header />
      <HeroSection />
      <CategoriesSection />
      <FeaturedProductsSection />
      <BestSellerSection />
      <TopSellingSection />
      <Footer />
    </ScrollView>
  );
}
