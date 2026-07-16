'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/UI/Card'
import { showSuccessToast } from '@/lib/toast-utils'
import LoginForm from './LoginForm'
import RegisterForm from './RegisterForm'
import LeftSideContent from './LeftSideContent'
import Reveal from '@/components/WebSite/Shared/Reveal'

export default function LoginRegister() {
  const [isLogin, setIsLogin] = useState(true)
  const router = useRouter()

  // Redirect if already logged in
  useEffect(() => {
    const adminToken = localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken')
    const userToken = localStorage.getItem('userToken') || sessionStorage.getItem('userToken')

    if (adminToken) {
      router.replace('/admin/dashboard')
      return
    }
    if (userToken) {
      router.replace('/')
      return
    }
  }, [router])

  const handleGoogleAuth = async () => {
    try {
      showSuccessToast('Google Sign-In', 'Redirecting to Google authentication...')
      
      // Import the user auth service
      const { userAuthService } = await import('@/services/userAuthService')
      
      // Redirect to Google OAuth
      userAuthService.initiateGoogleLogin()
    } catch (error) {
      console.error('Google auth error:', error)
    }
  }

  return (
    <div className="min-h-screen flex bg-white font-sans">
      {/* Left Side - Professional Customer Experience */}
      <LeftSideContent isLogin={isLogin} />

      {/* Right Side - Login/Register Form */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 py-8 sm:py-12 bg-[#f7f7f5]">
        <Reveal className="w-full max-w-md sm:max-w-lg lg:max-w-xl">
          {/* Form Toggle */}
          <div className="flex bg-gray-100 ring-1 ring-black/5 rounded-full p-1 mb-4 sm:mb-6">
            <button
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2 px-3 sm:px-4 rounded-full text-xs sm:text-sm font-semibold transition-all duration-300 ${
                isLogin
                  ? 'bg-[#e01a1b] text-white shadow-[0_6px_20px_rgba(224,26,27,0.3)]'
                  : 'text-gray-600 hover:text-[#e01a1b]'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2 px-3 sm:px-4 rounded-full text-xs sm:text-sm font-semibold transition-all duration-300 ${
                !isLogin
                  ? 'bg-[#e01a1b] text-white shadow-[0_6px_20px_rgba(224,26,27,0.3)]'
                  : 'text-gray-600 hover:text-[#e01a1b]'
              }`}
            >
              Create Account
            </button>
          </div>

          {/* Form Card */}
          <Card className="rounded-2xl ring-1 ring-black/5 shadow-[0_18px_40px_rgba(0,0,0,0.08)] border-0 bg-white">
            <CardHeader className="text-center pb-4 sm:pb-6 pt-6 sm:pt-8 px-4 sm:px-8">
              <span className="inline-flex items-center justify-center gap-2 text-[11px] sm:text-xs font-semibold uppercase tracking-[0.18em] text-[#e01a1b] mb-3">
                <span className="h-px w-6 bg-[#e01a1b]" />
                Your Account
                <span className="h-px w-6 bg-[#e01a1b]" />
              </span>
              <CardTitle className="font-playfair text-2xl sm:text-3xl font-semibold text-[#1a1a1a] tracking-tight mb-2">
                {isLogin ? 'Welcome Back' : 'Join Our Community'}
              </CardTitle>
              <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                {isLogin
                  ? 'Sign in to your account to continue shopping and track your orders'
                  : 'Create your account to start shopping and enjoy exclusive member benefits'
                }
              </p>
            </CardHeader>
            <CardContent className="px-4 sm:px-8 pb-6 sm:pb-8">
              {isLogin ? (
                <LoginForm onGoogleAuth={handleGoogleAuth} />
              ) : (
                <RegisterForm onGoogleAuth={handleGoogleAuth} />
              )}
            </CardContent>
          </Card>

          {/* Bottom switch link — saves users from scrolling back up to the toggle */}
          <div className="mt-4 sm:mt-6 text-center text-sm text-gray-600">
            {isLogin ? (
              <>
                Don&apos;t have an account?{' '}
                <button
                  type="button"
                  onClick={() => setIsLogin(false)}
                  className="link-underline brand font-semibold text-[#e01a1b] hover:text-[#c41617] transition-colors"
                >
                  Create one
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => setIsLogin(true)}
                  className="link-underline brand font-semibold text-[#e01a1b] hover:text-[#c41617] transition-colors"
                >
                  Sign in
                </button>
              </>
            )}
          </div>
        </Reveal>
      </div>
    </div>
  )
}