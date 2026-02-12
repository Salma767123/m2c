'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/UI/Button'
import { 
  Eye, 
  EyeOff, 
  AlertCircle, 
  User
} from 'lucide-react'
import { showSuccessToast, showErrorToast } from '@/lib/toast-utils'

interface RegisterFormData {
  firstName: string
  lastName: string
  email: string
  phone: string
  password: string
  confirmPassword: string
  agreeToTerms: boolean
}

interface RegisterFormProps {
  onGoogleAuth: () => void
}

export default function RegisterForm({ onGoogleAuth }: RegisterFormProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [emailError, setEmailError] = useState("")
  const [passwordError, setPasswordError] = useState("")
  const [confirmPasswordError, setConfirmPasswordError] = useState("")
  const [phoneError, setPhoneError] = useState("")
  const [passwordStrength, setPasswordStrength] = useState("")
  const firstNameInputRef = useRef<HTMLInputElement>(null)

  const [registerData, setRegisterData] = useState<RegisterFormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    agreeToTerms: false
  })

  // Autofocus first name field on mount
  useEffect(() => {
    if (firstNameInputRef.current) {
      firstNameInputRef.current.focus()
    }
  }, [])

  const handleRegisterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setRegisterData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
    
    if (name === 'email') {
      validateEmail(value)
    } else if (name === 'password') {
      validatePassword(value)
    } else if (name === 'confirmPassword') {
      validateConfirmPassword(value)
    } else if (name === 'phone') {
      validatePhone(value)
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

  // Phone validation
  const validatePhone = (value: string) => {
    if (!value) {
      setPhoneError("")
      return true
    }
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/
    if (!phoneRegex.test(value.replace(/[\s\-\(\)]/g, ''))) {
      setPhoneError("Invalid phone number")
      return false
    }
    setPhoneError("")
    return true
  }

  // Password validation and strength indicator
  const validatePassword = (value: string) => {
    if (!value) {
      setPasswordError("")
      setPasswordStrength("")
      return true
    }

    if (value.length < 8) {
      setPasswordError("Password must be at least 8 characters")
      setPasswordStrength("weak")
      return false
    }

    setPasswordError("")

    // Calculate password strength
    let strength = "weak"
    if (value.length >= 12 && /[A-Z]/.test(value) && /[0-9]/.test(value) && /[!@#$%^&*]/.test(value)) {
      strength = "strong"
    } else if (value.length >= 10 && /[A-Z]/.test(value) && /[0-9]/.test(value)) {
      strength = "medium"
    } else if (value.length >= 8) {
      strength = "weak"
    }

    setPasswordStrength(strength)
    return true
  }

  // Confirm password validation
  const validateConfirmPassword = (value: string) => {
    if (!value) {
      setConfirmPasswordError("")
      return true
    }
    if (value !== registerData.password) {
      setConfirmPasswordError("Passwords do not match")
      return false
    }
    setConfirmPasswordError("")
    return true
  }

  const getPasswordStrengthColor = (strength: string) => {
    switch (strength) {
      case "strong":
        return "bg-green-500"
      case "medium":
        return "bg-yellow-500"
      case "weak":
        return "bg-red-500"
      default:
        return "bg-gray-300"
    }
  }

  const getPasswordStrengthLabel = (strength: string) => {
    switch (strength) {
      case "strong":
        return "Strong"
      case "medium":
        return "Medium"
      case "weak":
        return "Weak"
      default:
        return ""
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!registerData.firstName || !registerData.lastName || !registerData.email || 
        !registerData.phone || !registerData.password || !registerData.confirmPassword) {
      showErrorToast('Validation Error', 'Please fill in all fields.')
      return
    }

    if (!registerData.agreeToTerms) {
      showErrorToast('Terms Required', 'Please agree to the terms and conditions.')
      return
    }

    if (!validateEmail(registerData.email) || !validatePhone(registerData.phone) || 
        !validatePassword(registerData.password) || !validateConfirmPassword(registerData.confirmPassword)) {
      showErrorToast('Validation Error', 'Please fix the errors and try again.')
      return
    }

    setIsLoading(true)

    try {
      // Import the user auth service
      const { userAuthService } = await import('@/services/userAuthService')
      
      // Combine first and last name
      const fullName = `${registerData.firstName} ${registerData.lastName}`.trim()
      
      // Call the backend register API
      const response = await userAuthService.register({
        email: registerData.email,
        password: registerData.password,
        name: fullName,
        phoneNumber: registerData.phone
      })
      
      if (response.success) {
        showSuccessToast(
          'Registration Successful', 
          'Please check your email to verify your account before signing in.'
        )
        
        // Redirect to login page after a short delay
        setTimeout(() => {
          window.location.href = '/login'
        }, 2000)
      } else {
        showErrorToast('Registration Failed', response.message || 'Something went wrong. Please try again.')
      }
    } catch (error: any) {
      console.error('Registration error:', error)
      const errorMessage = error.response?.data?.error || error.response?.data?.message || 'Something went wrong. Please try again.'
      showErrorToast('Registration Failed', errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleRegister} className="space-y-4 sm:space-y-6">
      {/* Name Fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <div>
          <label htmlFor="firstName" className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1 sm:mb-2">
            First Name
          </label>
          <input
            ref={firstNameInputRef}
            id="firstName"
            type="text"
            name="firstName"
            value={registerData.firstName}
            onChange={handleRegisterChange}
            className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500 transition-all duration-200 bg-white text-gray-900 placeholder-gray-500"
            placeholder="First name"
            required
          />
        </div>
        <div>
          <label htmlFor="lastName" className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1 sm:mb-2">
            Last Name
          </label>
          <input
            id="lastName"
            type="text"
            name="lastName"
            value={registerData.lastName}
            onChange={handleRegisterChange}
            className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500 transition-all duration-200 bg-white text-gray-900 placeholder-gray-500"
            placeholder="Last name"
            required
          />
        </div>
      </div>

      {/* Email and Phone Fields */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
        {/* Email Field */}
        <div>
          <label htmlFor="registerEmail" className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1 sm:mb-2">
            Email Address
          </label>
          <input
            id="registerEmail"
            type="email"
            name="email"
            value={registerData.email}
            onChange={handleRegisterChange}
            onBlur={() => validateEmail(registerData.email)}
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

        {/* Phone Field */}
        <div>
          <label htmlFor="phone" className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1 sm:mb-2">
            Phone Number
          </label>
          <input
            id="phone"
            type="tel"
            name="phone"
            value={registerData.phone}
            onChange={handleRegisterChange}
            onBlur={() => validatePhone(registerData.phone)}
            className={`w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border rounded-lg focus:ring-2 focus:border-blue-500 transition-all duration-200 bg-white text-gray-900 placeholder-gray-500 ${
              phoneError ? "border-red-500 focus:ring-red-200" : "border-gray-300 focus:ring-blue-200"
            }`}
            placeholder="Enter your phone number"
            required
          />
          {phoneError && (
            <div className="flex items-center mt-1 sm:mt-2 text-red-600 text-xs sm:text-sm">
              <AlertCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-1.5 shrink-0" />
              <span className="wrap-break-word">{phoneError}</span>
            </div>
          )}
        </div>
      </div>

      {/* Password Fields */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
        {/* Password Field */}
        <div>
          <label htmlFor="registerPassword" className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1 sm:mb-2">
            Create Password
          </label>
          <div className="relative">
            <input
              id="registerPassword"
              type={showPassword ? "text" : "password"}
              name="password"
              value={registerData.password}
              onChange={handleRegisterChange}
              onBlur={() => validatePassword(registerData.password)}
              className={`w-full px-3 sm:px-4 py-2 sm:py-3 pr-10 sm:pr-12 text-sm sm:text-base border rounded-lg focus:ring-2 focus:border-blue-500 transition-all duration-200 bg-white text-gray-900 placeholder-gray-500 ${
                passwordError ? "border-red-500 focus:ring-red-200" : "border-gray-300 focus:ring-blue-200"
              }`}
              placeholder="Create a password"
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
          {/* Password Strength Indicator */}
          {registerData.password && !passwordError && (
            <div className="mt-2 sm:mt-3">
              <div className="flex items-center justify-between mb-1 sm:mb-2">
                <span className="text-xs font-medium text-gray-600">Password Strength</span>
                <span className={`text-xs font-semibold ${
                  passwordStrength === "strong" ? "text-green-600" :
                  passwordStrength === "medium" ? "text-yellow-600" : "text-red-600"
                }`}>
                  {getPasswordStrengthLabel(passwordStrength)}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5 sm:h-2">
                <div
                  className={`h-1.5 sm:h-2 rounded-full transition-all duration-300 ${getPasswordStrengthColor(passwordStrength)}`}
                  style={{
                    width: passwordStrength === "weak" ? "33%" : 
                           passwordStrength === "medium" ? "66%" : "100%"
                  }}
                ></div>
              </div>
            </div>
          )}
        </div>

        {/* Confirm Password Field */}
        <div>
          <label htmlFor="confirmPassword" className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1 sm:mb-2">
            Confirm Password
          </label>
          <div className="relative">
            <input
              id="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              name="confirmPassword"
              value={registerData.confirmPassword}
              onChange={handleRegisterChange}
              onBlur={() => validateConfirmPassword(registerData.confirmPassword)}
              className={`w-full px-3 sm:px-4 py-2 sm:py-3 pr-10 sm:pr-12 text-sm sm:text-base border rounded-lg focus:ring-2 focus:border-blue-500 transition-all duration-200 bg-white text-gray-900 placeholder-gray-500 ${
                confirmPasswordError ? "border-red-500 focus:ring-red-200" : "border-gray-300 focus:ring-blue-200"
              }`}
              placeholder="Confirm your password"
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute inset-y-0 right-0 pr-3 sm:pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
            >
              {showConfirmPassword ? <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Eye className="w-4 h-4 sm:w-5 sm:h-5" />}
            </button>
          </div>
          {confirmPasswordError && (
            <div className="flex items-center mt-1 sm:mt-2 text-red-600 text-xs sm:text-sm">
              <AlertCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-1.5 shrink-0" />
              <span className="wrap-break-word">{confirmPasswordError}</span>
            </div>
          )}
        </div>
      </div>

      {/* Terms Agreement */}
      <div className="flex items-start space-x-2 sm:space-x-3">
        <input
          type="checkbox"
          name="agreeToTerms"
          checked={registerData.agreeToTerms}
          onChange={handleRegisterChange}
          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mt-0.5 shrink-0"
          required
        />
        <label className="text-xs sm:text-sm text-gray-700 leading-relaxed">
          I agree to the{' '}
          <button type="button" className="text-blue-600 hover:text-blue-800 font-medium underline">
            Terms of Service
          </button>{' '}
          and{' '}
          <button type="button" className="text-blue-600 hover:text-blue-800 font-medium underline">
            Privacy Policy
          </button>
        </label>
      </div>

      {/* Sign Up Button */}
      <div className="flex justify-center pt-2 sm:pt-4">
        <Button 
          type="submit"
          disabled={isLoading}
          className="w-full max-w-sm bg-gray-900 hover:bg-gray-700 text-white py-2.5 sm:py-3 text-sm sm:text-base font-semibold rounded-lg shadow-md transition-all duration-300 transform hover:scale-[1.02] hover:shadow-lg flex items-center justify-center"
        >
          <User className="w-4 h-4 mr-2" />
          {isLoading ? 'Creating Account...' : 'Create Account'}
        </Button>
      </div>

      {/* Divider */}
      <div className="relative py-3 sm:py-4">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300"></div>
        </div>
        <div className="relative flex justify-center text-xs sm:text-sm">
          <span className="px-3 sm:px-4 bg-white text-gray-500">Or sign up with</span>
        </div>
      </div>

      {/* Google Sign Up Button */}
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