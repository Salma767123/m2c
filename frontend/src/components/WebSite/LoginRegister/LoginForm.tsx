'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/UI/Button'
import { 
  Eye, 
  EyeOff, 
  Lock, 
  AlertCircle
} from 'lucide-react'
import { showSuccessToast, showErrorToast } from '@/lib/toast-utils'

interface LoginFormData {
  email: string
  password: string
  rememberMe: boolean
}

interface LoginFormProps {
  onGoogleAuth: () => void
}

export default function LoginForm({ onGoogleAuth }: LoginFormProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [emailError, setEmailError] = useState("")
  const [passwordError, setPasswordError] = useState("")
  const emailInputRef = useRef<HTMLInputElement>(null)

  const [loginData, setLoginData] = useState<LoginFormData>({
    email: '',
    password: '',
    rememberMe: false
  })

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
    
    if (name === 'email') {
      validateEmail(value)
    } else if (name === 'password') {
      validatePassword(value)
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

  // Password validation
  const validatePassword = (value: string) => {
    if (!value) {
      setPasswordError("")
      return true
    }

    if (value.length < 8) {
      setPasswordError("Password must be at least 8 characters")
      return false
    }

    setPasswordError("")
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
      // Import the user auth service
      const { userAuthService } = await import('@/services/userAuthService')
      
      // Call the backend login API
      const response = await userAuthService.login({
        email: loginData.email,
        password: loginData.password
      })
      
      if (response.success) {
        // Check if user is admin
        const isAdmin = response.data.user.role === 'admin'
        
        if (isAdmin) {
          // Store admin auth data in admin storage keys
          if (loginData.rememberMe) {
            localStorage.setItem('adminToken', response.data.token)
            localStorage.setItem('adminUser', JSON.stringify(response.data.user))
          } else {
            sessionStorage.setItem('adminToken', response.data.token)
            sessionStorage.setItem('adminUser', JSON.stringify(response.data.user))
          }
          
          showSuccessToast('Login Successful', `Welcome back, ${response.data.user.name}!`)
          
          // Redirect to admin dashboard
          setTimeout(() => {
            window.location.href = '/admin/dashboard'
          }, 1000)
        } else {
          // Store regular user auth data
          userAuthService.storeAuthData(response.data.token, response.data.user, loginData.rememberMe)
          
          showSuccessToast('Login Successful', `Welcome back, ${response.data.user.name}!`)
          
          // Redirect to home page
          setTimeout(() => {
            window.location.href = '/'
          }, 1000)
        }
      } else {
        showErrorToast('Login Failed', response.message || 'Invalid credentials. Please try again.')
      }
    } catch (error: any) {
      console.error('Login error:', error)
      const errorMessage = error.response?.data?.error || error.response?.data?.message || 'Invalid credentials. Please try again.'
      showErrorToast('Login Failed', errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleLogin} className="space-y-4 sm:space-y-6">
      {/* Email Field */}
      <div>
        <label htmlFor="email" className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1 sm:mb-2">
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
          className={`w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border rounded-lg focus:ring-2 focus:border-blue-500 transition-all duration-200 bg-white text-gray-900 placeholder-gray-500 ${
            emailError ? "border-red-500 focus:ring-red-200" : "border-gray-300 focus:ring-blue-200"
          }`}
          placeholder="Enter your email address"
          required
        />
        {emailError && (
          <div className="flex items-center mt-1 sm:mt-2 text-red-600 text-xs sm:text-sm">
            <AlertCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-1.5 shrink-0" />
            <span className="wrap-break-word">{emailError}</span>
          </div>
        )}
      </div>

      {/* Password Field */}
      <div>
        <label htmlFor="password" className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1 sm:mb-2">
          Password
        </label>
        <div className="relative">
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            name="password"
            value={loginData.password}
            onChange={handleLoginChange}
            className={`w-full px-3 sm:px-4 py-2 sm:py-3 pr-10 sm:pr-12 text-sm sm:text-base border rounded-lg focus:ring-2 focus:border-blue-500 transition-all duration-200 bg-white text-gray-900 placeholder-gray-500 ${
              passwordError ? "border-red-500 focus:ring-red-200" : "border-gray-300 focus:ring-blue-200"
            }`}
            placeholder="Enter your password"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 right-0 pr-3 sm:pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
          >
            {showPassword ? <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Eye className="w-4 h-4 sm:w-5 sm:h-5" />}
          </button>
        </div>
        {passwordError && (
          <div className="flex items-center mt-1 sm:mt-2 text-red-600 text-xs sm:text-sm">
            <AlertCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-1.5 shrink-0" />
            <span className="wrap-break-word">{passwordError}</span>
          </div>
        )}
      </div>

      {/* Remember & Forgot */}
      <div className="flex items-center justify-between">
        <label className="flex items-center cursor-pointer">
          <input
            type="checkbox"
            name="rememberMe"
            checked={loginData.rememberMe}
            onChange={handleLoginChange}
            className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <span className="ml-1.5 sm:ml-2 text-xs sm:text-sm text-gray-700">Remember me</span>
        </label>
        <a href="/forgot-password" className="text-xs sm:text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors">
          Forgot password?
        </a>
      </div>

      {/* Sign In Button */}
      <div className="flex justify-center pt-2 sm:pt-4">
        <Button 
          type="submit"
          disabled={isLoading}
          className="w-full max-w-sm bg-gray-900 hover:bg-gray-700 text-white py-2.5 sm:py-3 text-sm sm:text-base font-semibold rounded-lg shadow-md transition-all duration-300 transform hover:scale-[1.02] hover:shadow-lg flex items-center justify-center"
        >
          <Lock className="w-4 h-4 mr-2" />
          {isLoading ? 'Signing in...' : 'Sign In'}
        </Button>
      </div>

      {/* Divider */}
      <div className="relative py-3 sm:py-4">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300"></div>
        </div>
        <div className="relative flex justify-center text-xs sm:text-sm">
          <span className="px-3 sm:px-4 bg-white text-gray-500">Or continue with</span>
        </div>
      </div>

      {/* Google Sign In Button */}
      <div className="flex justify-center">
        <Button
          type="button"
          variant="outline"
          onClick={onGoogleAuth}
          className="w-full max-w-sm border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-400 py-2.5 sm:py-3 text-sm sm:text-base font-semibold rounded-lg transition-all duration-300 transform hover:scale-[1.02] hover:shadow-md flex items-center justify-center"
        >
          <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2 shrink-0" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          <span className="truncate">Continue with Google</span>
        </Button>
      </div>
    </form>
  )
}