'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Header from '@/components/WebSite/Header/Header';
import Footer from '@/components/WebSite/Footer/Footer';
import HeroSection from '@/components/WebSite/HeroSection/HeroSection';
import Category from '@/components/WebSite/Category/Category';
import FeaturedProducts from '@/components/WebSite/Featured/Products';
import TopSelling from '@/components/WebSite/Featured/TopSelling';
import BestSeller from '@/components/WebSite/Featured/BestSeller';
import ValueSection from '@/components/WebSite/Footer/ValueSection';
import SEOHead from '@/components/SEO/SEOHead';
import { isAuthenticated } from '@/lib/auth';
import VendorService from '@/services/vendorService';
import { subscribeToAuthChange } from '@/lib/authEvents';

export default function Home() {
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false)
  const [isVendorLoggedIn, setIsVendorLoggedIn] = useState(false)

  // Check authentication status — event-driven, no polling.
  useEffect(() => {
    const checkAuth = () => {
      setIsAdminLoggedIn(isAuthenticated())
      setIsVendorLoggedIn(VendorService.isLoggedIn())
    }
    checkAuth()
    return subscribeToAuthChange(checkAuth)
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      <SEOHead 
        pageName="home" 
        defaultTitle="M2C Marketplace - Your B2B Partner"
        defaultDescription="Discover quality products and reliable suppliers on M2C Marketplace"
      />
      <Header />
      <HeroSection />
      <Category />
      <FeaturedProducts />
      <TopSelling />
      <BestSeller />
      <ValueSection />
      <Footer />
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 justify-center gap-4 py-8 m-8">
        {/* Admin Dashboard - Only show if admin is logged in, otherwise go to login */}
        <Link 
          href={isAdminLoggedIn ? "/admin/dashboard" : "/admin/login"} 
          className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors text-center"
        >
          {isAdminLoggedIn ? "Dashboard" : "Admin Login"}
        </Link>
        
        {/* Vendor Dashboard - Only show if vendor is logged in, otherwise go to login */}
        <Link 
          href={isVendorLoggedIn ? "/vendor/dashboard" : "/vendor"} 
          className="px-6 py-3 bg-gray-600 text-white rounded-lg font-semibold hover:bg-gray-700 transition-colors text-center"
        >
          {isVendorLoggedIn ? "Vendor Dashboard" : "Vendor Login"}
        </Link>
        
        {/* Vendor Registration */}
        <Link 
          href="/vendor" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="px-6 py-3 bg-teal-600 text-white rounded-lg font-semibold hover:bg-teal-700 transition-colors text-center"
        >
          Vendor Registration
        </Link>
        
        {/* Checker Login */}
        <Link 
          href="/checker" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="px-6 py-3 bg-teal-600 text-white rounded-lg font-semibold hover:bg-teal-700 transition-colors text-center"
        >
          Checker Login
        </Link>
      </div>
    </div>
  );
}