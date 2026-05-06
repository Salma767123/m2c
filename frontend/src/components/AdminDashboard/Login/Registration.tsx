'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/UI/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/UI/Card'
import { 
  Eye, 
  EyeOff, 
  Users, 
  AlertCircle, 
  TrendingUp, 
  BarChart3, 
  Shield, 
  Settings 
} from 'lucide-react'
import { showSuccessToast, showErrorToast } from '@/lib/toast-utils'
import { companyInfoService } from '@/services/companyInfoService'

interface RegistrationFormData {
  firstName: string
  lastName: string
  email: string
  phone: string
  password: string
  confirmPassword: string
  company: string
  position: string
  acceptTerms: boolean
}

export default function AdminRegistration() {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [companyLogo, setCompanyLogo] = useState<string | null>(() => companyInfoService.getCachedCompanyInfo().companyLogo)
  const [emailError, setEmailError] = useState("")
  const [passwordError, setPasswordError] = useState("")
  const [passwordStrength, setPasswordStrength] = useState("")

  useEffect(() => {
    companyInfoService.getPublicCompanyInfo().then(info => {
      if (info.companyLogo) setCompanyLogo(info.companyLogo)
    }).catch(() => {})
  }, [])

  const [registrationData, setRegistrationData] = useState<RegistrationFormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    company: '',
    position: '',
    acceptTerms: false
  })

  const handleRegistrationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setRegistrationData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
    
    // Real-time validation for registration
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

  const handleRegistration = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (!registrationData.firstName || !registrationData.lastName || !registrationData.email || 
        !registrationData.password || !registrationData.confirmPassword) {
      showErrorToast('Validation Error', 'Please fill in all required fields.')
      return
    }

    if (!validateEmail(registrationData.email)) {
      showErrorToast('Invalid Email', 'Please enter a valid email address.')
      return
    }

    if (!validatePassword(registrationData.password)) {
      showErrorToast('Weak Password', 'Password must be at least 8 characters long.')
      return
    }

    if (registrationData.password !== registrationData.confirmPassword) {
      showErrorToast('Password Mismatch', 'Passwords do not match.')
      return
    }

    if (!registrationData.acceptTerms) {
      showErrorToast('Terms Required', 'Please accept the terms and conditions.')
      return
    }

    setIsLoading(true)

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      showSuccessToast('Registration Successful', 'Your account has been created successfully!')
      
      // Reset form
      setRegistrationData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: '',
        company: '',
        position: '',
        acceptTerms: false
      })

      // Redirect to login page
      window.location.href = '/admin/login'
    } catch (error) {
      showErrorToast('Registration Failed', 'Unable to create account. Please try again.')
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
              <div className="inline-flex items-center justify-center w-44 h-36 bg-white rounded-2xl mb-6 shadow-xl">
                {companyLogo ? (
                  <img src={companyLogo} alt="Company Logo" className="object-contain" style={{ width: 190, height: 150 }} />
                ) : (
                  <Image src="/assets/logo/m2c-logo.png" alt="Company Logo" width={190} height={150} className="object-contain" />
                )}
              </div>
              <h1 className="text-4xl font-bold mb-3">
                Join Our Team
              </h1>
              <p className="text-xl text-gray-100 font-medium">
                Become an administrator and help shape the future
              </p>
            </div>

            {/* Key Features */}
            <div className="space-y-6 mb-8">
              <div className="flex items-center space-x-4 bg-white/20 backdrop-blur-md rounded-xl p-4 transition-all duration-300 hover:bg-white/25 hover:shadow-lg hover:scale-[1.02] cursor-default">
                <div className="shrink-0 w-12 h-12 bg-white/30 rounded-lg flex items-center justify-center">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-lg text-white">Quick Registration</h3>
                  <p className="text-white/80 text-sm">Simple 5-minute setup process</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4 bg-white/20 backdrop-blur-md rounded-xl p-4 transition-all duration-300 hover:bg-white/25 hover:shadow-lg hover:scale-[1.02] cursor-default">
                <div className="shrink-0 w-12 h-12 bg-white/30 rounded-lg flex items-center justify-center">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-lg text-white">Secure Access</h3>
                  <p className="text-white/80 text-sm">Protected admin privileges</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4 bg-white/20 backdrop-blur-md rounded-xl p-4 transition-all duration-300 hover:bg-white/25 hover:shadow-lg hover:scale-[1.02] cursor-default">
                <div className="shrink-0 w-12 h-12 bg-white/30 rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-white" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-lg text-white">Full Dashboard Access</h3>
                  <p className="text-white/80 text-sm">Complete platform management tools</p>
                </div>
              </div>
            </div>
            <div className="pt-8 border-t border-white/20">
              <h3 className="text-lg font-semibold text-white mb-4">Why Choose Us?</h3>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
                  <TrendingUp className="w-6 h-6 text-white mx-auto mb-2" />
                  <div className="text-white font-semibold">Growth</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
                  <Settings className="w-6 h-6 text-white mx-auto mb-2" />
                  <div className="text-white font-semibold">Control</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
                  <BarChart3 className="w-6 h-6 text-white mx-auto mb-2" />
                  <div className="text-white font-semibold">Analytics</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Registration Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-gray-50">
        <div className="max-w-2xl w-full">
          {/* Registration Form Card */}
          <Card className="shadow-2xl border-0 bg-white">
            <CardHeader className="text-center pb-6 pt-8">
              <CardTitle className="text-3xl font-bold text-gray-900 mb-2">
                Create Account
              </CardTitle>
              <p className="text-gray-600">
                Join our platform as an administrator
              </p>
            </CardHeader>
            <CardContent className="px-8 pb-8">
              <form onSubmit={handleRegistration} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      First Name *
                    </label>
                    <input
                      type="text"
                      name="firstName"
                      value={registrationData.firstName}
                      onChange={handleRegistrationChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:border-[#455a64] transition-all duration-200 bg-white text-gray-900 placeholder-gray-500"
                      placeholder="John"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Last Name *
                    </label>
                    <input
                      type="text"
                      name="lastName"
                      value={registrationData.lastName}
                      onChange={handleRegistrationChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:border-[#455a64] transition-all duration-200 bg-white text-gray-900 placeholder-gray-500"
                      placeholder="Doe"
                      required
                    />
                  </div>
                </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={registrationData.email}
                    onChange={handleRegistrationChange}
                    onBlur={() => validateEmail(registrationData.email)}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:border-[#455a64] transition-all duration-200 bg-white text-gray-900 placeholder-gray-500 ${
                      emailError
                        ? "border-red-500 focus:ring-red-200"
                        : "border-gray-300 focus:ring-[#455a64]"
                    }`}
                    placeholder="admin@example.com"
                    required
                  />
                  {emailError && (
                    <div className="flex items-center mt-2 text-red-600 text-sm">
                      <AlertCircle className="w-4 h-4 mr-1.5" />
                      {emailError}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={registrationData.phone}
                    onChange={handleRegistrationChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:border-[#455a64] transition-all duration-200 bg-white text-gray-900 placeholder-gray-500"
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
              </div>  

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Company
                    </label>
                    <input
                      type="text"
                      name="company"
                      value={registrationData.company}
                      onChange={handleRegistrationChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:border-[#455a64] transition-all duration-200 bg-white text-gray-900 placeholder-gray-500"
                      placeholder="Company Name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Position
                    </label>
                    <input
                      type="text"
                      name="position"
                      value={registrationData.position}
                      onChange={handleRegistrationChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:border-[#455a64] transition-all duration-200 bg-white text-gray-900 placeholder-gray-500"
                      placeholder="Job Title"
                    />
                  </div>
                </div>

               <div className="grid grid-cols-2 gap-4">     
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Password *
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={registrationData.password}
                      onChange={handleRegistrationChange}
                      onBlur={() => validatePassword(registrationData.password)}
                      className={`w-full px-4 py-3 pr-12 border rounded-lg focus:ring-2 focus:border-[#455a64] transition-all duration-200 bg-white text-gray-900 placeholder-gray-500 ${
                        passwordError
                          ? "border-red-500 focus:ring-red-200"
                          : "border-gray-300 focus:ring-[#455a64]"
                      }`}
                      placeholder="Minimum 8 characters"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>

                  {/* Password Error Message */}
                  {passwordError && (
                    <div className="flex items-center mt-2 text-red-600 text-sm">
                      <AlertCircle className="w-4 h-4 mr-1.5" />
                      {passwordError}
                    </div>
                  )}

                  {/* Password Strength Indicator */}
                  {registrationData.password && !passwordError && (
                    <div className="mt-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-gray-600">
                          Password Strength
                        </span>
                        <span
                          className={`text-xs font-semibold ${
                            passwordStrength === "strong"
                              ? "text-green-600"
                              : passwordStrength === "medium"
                              ? "text-yellow-600"
                              : "text-red-600"
                          }`}
                        >
                          {getPasswordStrengthLabel(passwordStrength)}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-300 ${getPasswordStrengthColor(
                            passwordStrength
                          )}`}
                          style={{
                            width:
                              passwordStrength === "weak"
                                ? "33%"
                                : passwordStrength === "medium"
                                ? "66%"
                                : "100%",
                          }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Confirm Password *
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      name="confirmPassword"
                      value={registrationData.confirmPassword}
                      onChange={handleRegistrationChange}
                      className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:border-[#455a64] transition-all duration-200 bg-white text-gray-900 placeholder-gray-500"
                      placeholder="Confirm your password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
               </div>

                <div className="flex items-start">
                  <input
                    type="checkbox"
                    name="acceptTerms"
                    checked={registrationData.acceptTerms}
                    onChange={handleRegistrationChange}
                    className="w-4 h-4 text-gray-700 border-gray-300 rounded focus:ring-[#455a64] mt-1"
                    required
                  />
                  <label className="ml-2 text-sm text-gray-600">
                    I agree to the{' '}
                    <button type="button" className="text-gray-700 hover:text-gray-900 font-medium transition-colors">
                      Terms of Service
                    </button>{' '}
                    and{' '}
                    <button type="button" className="text-gray-700 hover:text-gray-900 font-medium transition-colors">
                      Privacy Policy
                    </button>
                  </label>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gray-900 hover:bg-gray-700 text-white py-3 text-sm font-semibold rounded-lg shadow-md transition-all duration-300 transform hover:scale-[1.02] hover:shadow-lg"
                >
                  <Users className="w-4 h-4 mr-2" />
                  {isLoading ? 'Creating Account...' : 'Create Admin Account'}
                </Button>

                {/* Divider */}
                <div className="relative py-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-white text-gray-500">
                      Already have an account?
                    </span>
                  </div>
                </div>

                {/* Login Link - Secondary */}
                <Link href="/admin/login" className="block">
                  <Button
                    variant="outline"
                    className="w-full border border-gray-900 text-gray-900 bg-white hover:bg-gray-200 hover:border-gray-700 py-3 text-sm font-semibold rounded-lg transition-all duration-300 transform hover:scale-[1.02] hover:shadow-md"
                  >
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Sign In Instead
                  </Button>
                </Link>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}