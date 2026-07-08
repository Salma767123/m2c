'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
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
import { qcCheckerService } from '@/services/qcCheckerService';
import axiosInstance from '@/lib/axios';
import { dispatchAuthChange, subscribeToAuthChange } from '@/lib/authEvents';
import { showErrorToast } from '@/lib/toast-utils';

// Quick-login credentials for one-click access from the home page (dev/demo shortcut).
const QUICK_LOGIN = {
  admin: { email: 'dinesh@mntfuture.com', password: '12341234' },
  vendor: { email: 'navanithtextileexports@gmail.com', password: 'EvQsLxODeQKH' },
  checker: { checkerId: 'QC-001', password: 'C8nzLHw!5Q' },
}

export default function Home() {
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false)
  const [isVendorLoggedIn, setIsVendorLoggedIn] = useState(false)
  const [loggingIn, setLoggingIn] = useState<'admin' | 'vendor' | 'checker' | null>(null)
  const router = useRouter()

  // Check authentication status — event-driven, no polling.
  useEffect(() => {
    const checkAuth = () => {
      setIsAdminLoggedIn(isAuthenticated())
      setIsVendorLoggedIn(VendorService.isLoggedIn())
    }
    checkAuth()
    return subscribeToAuthChange(checkAuth)
  }, [])

  const handleAdminQuickLogin = async () => {
    if (isAdminLoggedIn) {
      router.push('/admin/dashboard')
      return
    }
    setLoggingIn('admin')
    try {
      const response = await axiosInstance.post('/auth/admin/login', QUICK_LOGIN.admin, {
        withCredentials: true,
      })
      const { token, user } = response.data.data
      localStorage.setItem('adminToken', token)
      localStorage.setItem('adminUser', JSON.stringify(user))
      dispatchAuthChange()
      router.push('/admin/dashboard')
    } catch (error: any) {
      showErrorToast('Quick Login Failed', error?.message || 'Could not log in as admin.')
      router.push('/admin/login')
    } finally {
      setLoggingIn(null)
    }
  }

  const handleVendorQuickLogin = async () => {
    if (isVendorLoggedIn) {
      router.push('/vendor/dashboard')
      return
    }
    setLoggingIn('vendor')
    try {
      // loginVendor stores vendorToken + vendorData and dispatches the auth event.
      await VendorService.loginVendor(QUICK_LOGIN.vendor.email, QUICK_LOGIN.vendor.password)
      router.push('/vendor/dashboard')
    } catch (error: any) {
      showErrorToast('Quick Login Failed', error?.message || 'Could not log in as vendor.')
      router.push('/vendor')
    } finally {
      setLoggingIn(null)
    }
  }

  const handleCheckerQuickLogin = async () => {
    if (qcCheckerService.getCheckerToken()) {
      router.push('/checker/dashboard')
      return
    }
    setLoggingIn('checker')
    try {
      const response = await qcCheckerService.login(QUICK_LOGIN.checker)
      qcCheckerService.storeCheckerAuth(response.data.token, response.data.checker)
      router.push('/checker/dashboard')
    } catch (error: any) {
      showErrorToast('Quick Login Failed', error?.message || 'Could not log in as checker.')
      router.push('/checker')
    } finally {
      setLoggingIn(null)
    }
  }

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
      <div className="grid grid-cols-1 md:grid-cols-3 justify-center gap-4 py-8 m-8">
        {/* Admin quick login - goes straight to dashboard */}
        <button
          onClick={handleAdminQuickLogin}
          disabled={loggingIn !== null}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors text-center disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loggingIn === 'admin' ? 'Logging in...' : isAdminLoggedIn ? 'Admin Dashboard' : 'Admin Login'}
        </button>

        {/* Vendor quick login - goes straight to dashboard */}
        <button
          onClick={handleVendorQuickLogin}
          disabled={loggingIn !== null}
          className="px-6 py-3 bg-gray-600 text-white rounded-lg font-semibold hover:bg-gray-700 transition-colors text-center disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loggingIn === 'vendor' ? 'Logging in...' : isVendorLoggedIn ? 'Vendor Dashboard' : 'Vendor Login'}
        </button>

        {/* Checker quick login - goes straight to dashboard */}
        <button
          onClick={handleCheckerQuickLogin}
          disabled={loggingIn !== null}
          className="px-6 py-3 bg-teal-600 text-white rounded-lg font-semibold hover:bg-teal-700 transition-colors text-center disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loggingIn === 'checker' ? 'Logging in...' : 'Checker Login'}
        </button>
      </div>
    </div>
  );
}