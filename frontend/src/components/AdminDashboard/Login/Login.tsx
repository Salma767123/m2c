'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/UI/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/UI/Card'
import axiosInstance from '@/lib/axios'
import {
  Eye,
  EyeOff,
  Lock,
  AlertCircle,
  BarChart3,
  Shield,
  Settings,
  Users
} from 'lucide-react'
import { showSuccessToast, showErrorToast } from '@/lib/toast-utils'

interface LoginFormData {
  email: string
  password: string
  rememberMe: boolean
}

interface LoginResponse {
  message: string
  user: {
    id: string
    email: string
    name: string
    role: string
    image?: string
    isVerified: boolean
    phoneNumber?: string
    address?: string
    city?: string
    state?: string
    zipCode?: string
    country?: string
    dateOfBirth?: string
    currency?: string
    companyName?: string
    gstNumber?: string
    onboardingCompleted?: boolean
  }
  token: string
}

export default function AdminLogin() {
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [emailError, setEmailError] = useState("")
  const [googleAccountEmail, setGoogleAccountEmail] = useState<string | null>(null)
  const [accessDeniedError, setAccessDeniedError] = useState(false)

  const emailInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const searchParams = useSearchParams()

  const [loginData, setLoginData] = useState<LoginFormData>({
    email: '',
    password: '',
    rememberMe: false
  })

  // Redirect if already logged in as admin
  useEffect(() => {
    const adminToken = localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken')
    if (adminToken) {
      router.replace('/admin/dashboard')
    }
  }, [router])

  // Check for error from Google OAuth redirect
  useEffect(() => {
    const error = searchParams.get('error')
    if (error === 'access_denied') {
      setAccessDeniedError(true)
      showErrorToast('Access Denied', 'This Google account is not authorized for admin access.')
    }
  }, [searchParams])

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
      if (googleAccountEmail) setGoogleAccountEmail(null)
      if (accessDeniedError) setAccessDeniedError(false)
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
      // Call super admin login endpoint
      const response = await axiosInstance.post('/auth/admin/login', {
        email: loginData.email,
        password: loginData.password,
      }, {
        withCredentials: true, // Include cookies for httpOnly token
      })

      const data = response.data

      const loginResponse: LoginResponse = data.data

      console.log('Super Admin login response:', loginResponse)

      // Verify this is an admin user (should always be true from super admin endpoint)
      if (loginResponse.user.role !== 'admin') {
        console.log('User role:', loginResponse.user.role, 'Expected: admin')
        showErrorToast('Access Denied', 'Only super administrators can access this dashboard.')
        return
      }

      console.log('Super Admin login successful, storing auth data...')

      // Store authentication data — always localStorage for admin
      // (httpOnly cookie also set by backend for 7-day persistence)
      localStorage.setItem('adminToken', loginResponse.token)
      localStorage.setItem('adminUser', JSON.stringify(loginResponse.user))
      console.log('Stored in localStorage (permanent for admin sessions)')


      // Show success toast
      showSuccessToast('Login Successful', `Welcome back, ${loginResponse.user.name}!`)

      // Small delay to show the toast before redirect
      setTimeout(() => {
        router.push('/admin/dashboard')
      }, 1000)
    } catch (error: any) {
      console.error('Super Admin login error:', error)

      // Handle Google account trying credential login
      const errorCode = error.data?.code || error.response?.data?.code
      if (errorCode === 'GOOGLE_ACCOUNT') {
        setGoogleAccountEmail(loginData.email)
        showErrorToast('Google Account', 'This admin account uses Google sign-in. Please use the Google button below.')
        return
      }

      const errorMessage = error.data?.error || error?.message || error.response?.data?.error || 'Invalid admin credentials. Please try again.'
      showErrorToast('Login Failed', errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    try {
      showSuccessToast('Google Sign-In', 'Redirecting to Google authentication...')
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
      window.location.href = `${backendUrl}/auth/google?source=admin`
    } catch (error) {
      showErrorToast('Google Sign-In Failed', 'Unable to connect to Google authentication.')
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
              <div className="inline-flex items-center justify-center w-44 h-36 bg-white rounded-2xl mb-6 shadow-xl">
                <Image
                  src="/assets/logo/logo2.png"
                  alt="Company Logo"
                  width={190}
                  height={150}
                  className="object-contain"
                />
              </div>
              <h1 className="text-4xl font-bold mb-3">
                Administrative Hub
              </h1>
              <p className="text-xl text-gray-100 font-medium">
                Multi-tier access for Super Admin, Admin & Employee roles
              </p>
            </div>

            {/* Key Features */}
            <div className="space-y-6 mb-8">
              <div className="flex items-center space-x-4 bg-white/20 backdrop-blur-md rounded-xl p-4 transition-all duration-300 hover:bg-white/25 hover:shadow-lg hover:scale-[1.02] cursor-default">
                <div className="shrink-0 w-12 h-12 bg-white/30 rounded-lg flex items-center justify-center">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-lg text-white">Super Admin Control</h3>
                  <p className="text-white/80 text-sm">Full system access & user role management</p>
                </div>
              </div>

              <div className="flex items-center space-x-4 bg-white/20 backdrop-blur-md rounded-xl p-4 transition-all duration-300 hover:bg-white/25 hover:shadow-lg hover:scale-[1.02] cursor-default">
                <div className="shrink-0 w-12 h-12 bg-white/30 rounded-lg flex items-center justify-center">
                  <Settings className="w-6 h-6 text-white" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-lg text-white">Admin Operations</h3>
                  <p className="text-white/80 text-sm">Department management & oversight</p>
                </div>
              </div>

              <div className="flex items-center space-x-4 bg-white/20 backdrop-blur-md rounded-xl p-4 transition-all duration-300 hover:bg-white/25 hover:shadow-lg hover:scale-[1.02] cursor-default">
                <div className="shrink-0 w-12 h-12 bg-white/30 rounded-lg flex items-center justify-center">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-lg text-white">Employee Access</h3>
                  <p className="text-white/80 text-sm">Task management & daily operations</p>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="bg-white/20 backdrop-blur-md rounded-lg p-6 h-28 flex flex-col items-center justify-center transition-all duration-300 hover:bg-white/25 hover:shadow-lg hover:scale-[1.02] cursor-default">
                <div className="text-3xl font-bold text-white mb-2">3</div>
                <div className="text-sm text-white/80 font-medium">Access Levels</div>
              </div>
              <div className="bg-white/20 backdrop-blur-md rounded-lg p-6 h-28 flex flex-col items-center justify-center transition-all duration-300 hover:bg-white/25 hover:shadow-lg hover:scale-[1.02] cursor-default">
                <div className="text-3xl font-bold text-white mb-2">15+</div>
                <div className="text-sm text-white/80 font-medium">Departments</div>
              </div>
              <div className="bg-white/20 backdrop-blur-md rounded-lg p-6 h-28 flex flex-col items-center justify-center transition-all duration-300 hover:bg-white/25 hover:shadow-lg hover:scale-[1.02] cursor-default">
                <div className="text-3xl font-bold text-white mb-2">500+</div>
                <div className="text-sm text-white/80 font-medium">Active Users</div>
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
                Sign in to your admin dashboard
              </p>
            </CardHeader>
            <CardContent className="px-8 pb-8">
              <form onSubmit={handleLogin} className="space-y-6">
                {/* Access Denied Notice */}
                {accessDeniedError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-red-800">Access Denied</p>
                        <p className="text-sm text-red-700 mt-1">
                          This Google account is not authorized for admin access. Only admin accounts can sign in here.
                        </p>
                      </div>
                      <button type="button" onClick={() => setAccessDeniedError(false)} className="text-red-400 hover:text-red-600">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}

                {/* Google Account Notice */}
                {googleAccountEmail && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-blue-800">Google Account Detected</p>
                        <p className="text-sm text-blue-700 mt-1">
                          <span className="font-medium">{googleAccountEmail}</span> uses Google sign-in. Please continue with Google below.
                        </p>
                        <button
                          type="button"
                          onClick={handleGoogleSignIn}
                          className="mt-2 flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                          </svg>
                          Continue with Google
                        </button>
                      </div>
                      <button type="button" onClick={() => setGoogleAccountEmail(null)} className="text-blue-400 hover:text-blue-600">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}

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
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:border-[#455a64] transition-all duration-200 bg-white text-gray-900 placeholder-gray-500 ${emailError
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
                  <button
                    type="button"
                    className="text-sm text-gray-700 hover:text-gray-900 font-medium transition-colors"
                  >
                    Forgot password?
                  </button>
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

                {/* Google Sign In Button */}
                <Button
                  type="button"
                  variant="outline"
                  className="w-full border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-400 py-3 text-sm font-semibold rounded-lg transition-all duration-300 transform hover:scale-[1.02] hover:shadow-md"
                  onClick={handleGoogleSignIn}
                >
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Continue with Google
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}