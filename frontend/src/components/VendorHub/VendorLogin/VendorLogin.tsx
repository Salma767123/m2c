'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/UI/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/UI/Card'
import { 
  Eye, 
  EyeOff, 
  Lock, 
  AlertCircle, 
  Package, 
  TrendingUp, 
  Zap, 
  Users 
} from 'lucide-react'
import { showSuccessToast, showErrorToast } from '@/lib/toast-utils'
import { useVendorAuth } from '@/hooks/useVendorAuth'
import { companyInfoService } from '@/services/companyInfoService'
import { dispatchAuthChange } from '@/lib/authEvents'

interface LoginFormData {
  email: string
  password: string
  rememberMe: boolean
}

export default function VendorLogin() {
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [emailError, setEmailError] = useState("")
  const [companyLogo, setCompanyLogo] = useState<string | null>(null)

  const emailInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const { login } = useVendorAuth()

  const [loginData, setLoginData] = useState<LoginFormData>({
    email: '',
    password: '',
    rememberMe: false
  })

  useEffect(() => {
    companyInfoService.getPublicCompanyInfo().then(info => {
      if (info.companyLogo) setCompanyLogo(info.companyLogo)
    }).catch(() => {})
  }, [])

  // Autofocus email field on mount
  useEffect(() => {
    if (emailInputRef.current) {
      emailInputRef.current.focus()
    }
  }, [])

  const handleLoginChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setLoginData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
    
    // Real-time validation
    if (name === 'email') {
      validateEmail(value)
    }
  }

  // Email validation
  const validateEmail = (value: string) => {
    if (!value) {
      setEmailError("")
      return true
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(value)) {
      setEmailError("Invalid email address")
      return false
    }
    setEmailError("")
    return true
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!loginData.email || !loginData.password) {
      showErrorToast('Validation Error', 'Please fill in all fields.')
      return
    }

    if (!validateEmail(loginData.email)) {
      showErrorToast('Invalid Email', 'Please enter a valid email address.')
      return
    }

    setIsLoading(true)

    try {
      const result = await login(loginData.email, loginData.password)
      
      console.log('Vendor login successful:', result)

      // Store authentication data
      if (loginData.rememberMe) {
        localStorage.setItem('vendorToken', result.token)
        localStorage.setItem('vendorUser', JSON.stringify(result.vendor))
        console.log('Stored in localStorage')
      } else {
        sessionStorage.setItem('vendorToken', result.token)
        sessionStorage.setItem('vendorUser', JSON.stringify(result.vendor))
        console.log('Stored in sessionStorage')
      }
      dispatchAuthChange()

      // Show success toast
      showSuccessToast('Login Successful', `Welcome back, ${result.vendor.companyName}!`)

      // Register FCM push token (fire-and-forget)
      import('@/services/webNotificationService').then(m => m.registerWebPushToken()).catch(() => {})

      // Small delay to show the toast before redirect
      setTimeout(() => {
        // Redirect based on vendor status
        if (result.vendor.status === 'APPROVED') {
          router.push('/vendor/dashboard')
        } else if (result.vendor.status === 'PENDING') {
          router.push('/vendor/status?status=pending')
        } else if (result.vendor.status === 'REJECTED') {
          router.push('/vendor/status?status=rejected')
        } else if (result.vendor.status === 'SUSPENDED') {
          router.push('/vendor/status?status=suspended')
        }
      }, 1000)
    } catch (error: any) {
      console.error('Login error:', error)
      const errorMessage = error?.message || (error instanceof Error ? error.message : 'Invalid credentials. Please try again.')
      showErrorToast('Login Failed', errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex bg-white font-sans">
      {/* Left Side - Professional Branding */}
      <div className="hidden lg:flex lg:flex-1 relative bg-[#000000]">
        <div className="flex items-center justify-center w-full p-12">
          <div className="max-w-lg text-center text-white">
            {/* Logo Section */}
            <div className="mb-8">
              <div className="inline-flex items-center justify-center w-44 h-36 mb-6">
                {companyLogo ? (
                  <img src={companyLogo} alt="Company Logo" className="object-contain" style={{ width: 190, height: 150 }} />
                ) : (
                  <Image src="/assets/logo/m2c-logo.png" alt="Company Logo" width={190} height={150} className="object-contain" />
                )}
              </div>
              <h1 className="text-4xl font-bold mb-3">
                Vendor Portal
              </h1>
              <p className="text-xl text-gray-100 font-medium">
                Manage your business and grow your sales
              </p>
            </div>

            {/* Key Features */}
            <div className="space-y-6 mb-8">
              <div className="flex items-center space-x-4 bg-white/20 backdrop-blur-md rounded-xl p-4 transition-all duration-300 hover:bg-white/25 hover:shadow-lg hover:scale-[1.02] cursor-default">
                <div className="shrink-0 w-12 h-12 bg-white/30 rounded-lg flex items-center justify-center">
                  <Package className="w-6 h-6 text-white" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-lg text-white">Inventory Management</h3>
                  <p className="text-white/80 text-sm">Track and manage your products efficiently</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4 bg-white/20 backdrop-blur-md rounded-xl p-4 transition-all duration-300 hover:bg-white/25 hover:shadow-lg hover:scale-[1.02] cursor-default">
                <div className="shrink-0 w-12 h-12 bg-white/30 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-lg text-white">Sales Analytics</h3>
                  <p className="text-white/80 text-sm">Real-time insights into your performance</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4 bg-white/20 backdrop-blur-md rounded-xl p-4 transition-all duration-300 hover:bg-white/25 hover:shadow-lg hover:scale-[1.02] cursor-default">
                <div className="shrink-0 w-12 h-12 bg-white/30 rounded-lg flex items-center justify-center">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-lg text-white">Fast Processing</h3>
                  <p className="text-white/80 text-sm">Quick order fulfillment and payments</p>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="bg-white/20 backdrop-blur-md rounded-lg p-6 h-28 flex flex-col items-center justify-center transition-all duration-300 hover:bg-white/25 hover:shadow-lg hover:scale-[1.02] cursor-default">
                <div className="text-3xl font-bold text-white mb-2">500+</div>
                <div className="text-sm text-white/80 font-medium">Active Vendors</div>
              </div>
              <div className="bg-white/20 backdrop-blur-md rounded-lg p-6 h-28 flex flex-col items-center justify-center transition-all duration-300 hover:bg-white/25 hover:shadow-lg hover:scale-[1.02] cursor-default">
                <div className="text-3xl font-bold text-white mb-2">24/7</div>
                <div className="text-sm text-white/80 font-medium">Support</div>
              </div>
              <div className="bg-white/20 backdrop-blur-md rounded-lg p-6 h-28 flex flex-col items-center justify-center transition-all duration-300 hover:bg-white/25 hover:shadow-lg hover:scale-[1.02] cursor-default">
                <div className="text-3xl font-bold text-white mb-2">100%</div>
                <div className="text-sm text-white/80 font-medium">Secure</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-gray-50">
        <div className="max-w-md w-full">
          {/* Login Form Card */}
          <Card className="shadow-2xl border-0 bg-white">
            <CardHeader className="text-center pb-6 pt-8">
              <CardTitle className="text-3xl font-bold text-gray-900 mb-2">
                Welcome Back
              </CardTitle>
              <p className="text-gray-600">
                Sign in to your vendor dashboard
              </p>
            </CardHeader>
            <CardContent className="px-8 pb-8">
              <form onSubmit={handleLogin} className="space-y-6">
                {/* Email Field */}
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-semibold text-gray-700 mb-2"
                  >
                    Email Address
                  </label>
                  <input
                    ref={emailInputRef}
                    id="email"
                    type="email"
                    name="email"
                    value={loginData.email}
                    onChange={handleLoginChange}
                    onBlur={() => validateEmail(loginData.email)}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:border-[#455a64] transition-all duration-200 bg-white text-gray-900 placeholder-gray-500 ${
                      emailError
                        ? "border-red-500 focus:ring-red-200"
                        : "border-gray-300 focus:ring-[#455a64]"
                    }`}
                    placeholder="Enter your email"
                    autoFocus
                    required
                  />
                  {emailError && (
                    <div className="flex items-center mt-2 text-red-600 text-sm">
                      <AlertCircle className="w-4 h-4 mr-1.5" />
                      {emailError}
                    </div>
                  )}
                </div>

                {/* Password Field */}
                <div>
                  <label
                    htmlFor="password"
                    className="block text-sm font-semibold text-gray-700 mb-2"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={loginData.password}
                      onChange={handleLoginChange}
                      className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:border-[#455a64] focus:ring-[#455a64] transition-all duration-200 bg-white text-gray-900 placeholder-gray-500"
                      placeholder="Enter your password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                    >
                      {showPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Remember & Forgot */}
                <div className="flex items-center justify-between">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      name="rememberMe"
                      checked={loginData.rememberMe}
                      onChange={handleLoginChange}
                      className="w-4 h-4 text-gray-700 border-gray-300 rounded focus:ring-[#455a64]"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      Remember me
                    </span>
                  </label>
                  <Link 
                    href="/vendor/forgot-password"
                    className="text-sm text-gray-700 hover:text-gray-900 font-medium transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>

                {/* Sign In Button - Primary */}
                <Button 
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gray-900 hover:bg-gray-700 text-white py-3 text-sm font-semibold rounded-lg shadow-md transition-all duration-300 transform hover:scale-[1.02] hover:shadow-lg"
                >
                  <Lock className="w-4 h-4 mr-2" />
                  {isLoading ? 'Signing in...' : 'Sign In to Dashboard'}
                </Button>
              </form>

              {/* Divider */}
                <div className="relative py-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-white text-gray-500">
                      Or continue with
                    </span>
                  </div>
                </div>

              {/* Registration Section */}
              <div className="text-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  New to Our Platform?
                </h3>
                <p className="text-sm text-gray-600">
                  Join our growing community of vendors and expand your business
                </p>
              </div>

              {/* Register Button */}
              <Button
                type="button"
                variant="outline"
                className="w-full border-2 border-gray-500 text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-400 py-3 text-sm font-semibold rounded-lg transition-all duration-300 transform hover:scale-[1.02] hover:shadow-md"
                onClick={() => window.location.href = '/vendor/register'}
              >
                Get Started - Register Now
              </Button>            
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}