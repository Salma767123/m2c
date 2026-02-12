'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/UI/Card'
import { showSuccessToast } from '@/lib/toast-utils'
import LoginForm from './LoginForm'
import RegisterForm from './RegisterForm'
import LeftSideContent from './LeftSideContent'

export default function LoginRegister() {
  const [isLogin, setIsLogin] = useState(true)

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
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 py-8 sm:py-12 bg-gray-50">
        <div className="w-full max-w-md sm:max-w-lg lg:max-w-xl">
          {/* Form Toggle */}
          <div className="flex bg-gray-200 rounded-lg p-1 mb-4 sm:mb-6">
            <button
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2 px-3 sm:px-4 rounded-md text-xs sm:text-sm font-semibold transition-all duration-200 ${
                isLogin
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2 px-3 sm:px-4 rounded-md text-xs sm:text-sm font-semibold transition-all duration-200 ${
                !isLogin
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Create Account
            </button>
          </div>

          {/* Form Card */}
          <Card className="shadow-2xl border-0 bg-white">
            <CardHeader className="text-center pb-4 sm:pb-6 pt-6 sm:pt-8 px-4 sm:px-8">
              <CardTitle className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
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
        </div>
      </div>
    </div>
  )
}