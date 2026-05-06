'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/UI/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/UI/Card'
import { 
  Lock, 
  Eye, 
  EyeOff, 
  AlertCircle,
  CheckCircle,
  Shield,
  Package
} from 'lucide-react'
import { showSuccessToast, showErrorToast } from '@/lib/toast-utils'
import Link from 'next/link'
import axios from '@/lib/axios'
import { companyInfoService } from '@/services/companyInfoService'

interface ResetPasswordData {
  password: string
  confirmPassword: string
}

interface ValidationErrors {
  password?: string
  confirmPassword?: string
}

export default function VendorResetPassword() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [companyLogo, setCompanyLogo] = useState<string | null>(() => companyInfoService.getCachedCompanyInfo().companyLogo)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordReset, setPasswordReset] = useState(false)
  const [errors, setErrors] = useState<ValidationErrors>({})
  const [formData, setFormData] = useState<ResetPasswordData>({
    password: '',
    confirmPassword: ''
  })
  const passwordInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    companyInfoService.getPublicCompanyInfo().then(info => {
      if (info.companyLogo) setCompanyLogo(info.companyLogo)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!token) {
      showErrorToast('Invalid Reset Link', 'The password reset link is invalid or missing.')
      router.push('/vendor')
      return
    }

    if (passwordInputRef.current) {
      passwordInputRef.current.focus()
    }
  }, [token, router])

  const validatePassword = (password: string): string | null => {
    if (password.length < 8) {
      return 'Password must be at least 8 characters long'
    }
    if (!/(?=.*[a-z])/.test(password)) {
      return 'Password must contain at least one lowercase letter'
    }
    if (!/(?=.*[A-Z])/.test(password)) {
      return 'Password must contain at least one uppercase letter'
    }
    if (!/(?=.*\d)/.test(password)) {
      return 'Password must contain at least one number'
    }
    if (!/(?=.*[@$!%*?&])/.test(password)) {
      return 'Password must contain at least one special character (@$!%*?&)'
    }
    return null
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    
    // Clear errors when user starts typing
    if (errors[name as keyof ValidationErrors]) {
      setErrors(prev => ({
        ...prev,
        [name]: undefined
      }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const newErrors: ValidationErrors = {}

    // Validate password
    const passwordError = validatePassword(formData.password)
    if (passwordError) {
      newErrors.password = passwordError
    }

    // Validate confirm password
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setIsLoading(true)
    setErrors({})

    try {
      const response = await axios.post('/auth/reset-password', { 
        token, 
        password: formData.password 
      })

      if (response.data.success) {
        setPasswordReset(true)
        showSuccessToast('Password Reset Successful', 'Your password has been updated successfully')
      } else {
        throw new Error(response.data.error || 'Failed to reset password')
      }
    } catch (error: any) {
      console.error('Reset password error:', error)
      const errorMessage = error.response?.data?.error || error.message || 'Failed to reset password'
      showErrorToast('Reset Failed', errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  if (passwordReset) {
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
                  Vendor Portal
                </h1>
                <p className="text-xl text-gray-100 font-medium">
                  Password Reset Complete
                </p>
              </div>

              {/* Success Message */}
              <div className="bg-white/20 backdrop-blur-md rounded-xl p-6">
                <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">All Set!</h3>
                <p className="text-white/80">Your password has been successfully updated. You can now log in with your new password.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Success Message */}
        <div className="flex-1 flex items-center justify-center px-6 py-12 bg-gray-50">
          <div className="max-w-md w-full">
            <Card className="shadow-2xl border-0 bg-white">
              <CardHeader className="text-center pb-4">
                <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <CardTitle className="text-2xl font-bold text-gray-900">
                  Password Reset Successful
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-center">
                  <p className="text-gray-600 mb-6">
                    Your password has been successfully reset. You can now log in with your new password.
                  </p>
                </div>

                <Link href="/vendor">
                  <Button className="w-full bg-gray-900 hover:bg-gray-700 text-white py-3">
                    <Shield className="w-4 h-4 mr-2" />
                    Continue to Login
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
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
                Vendor Portal
              </h1>
              <p className="text-xl text-gray-100 font-medium">
                Create New Password
              </p>
            </div>

            {/* Security Information */}
            <div className="bg-white/20 backdrop-blur-md rounded-xl p-6">
              <Package className="w-12 h-12 text-white mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">Secure Password</h3>
              <p className="text-white/80 mb-4">
                Create a strong password to protect your vendor account and business data.
              </p>
              <div className="text-sm text-white/70 text-left">
                <p>• At least 8 characters long</p>
                <p>• Include uppercase and lowercase letters</p>
                <p>• Include at least one number</p>
                <p>• Include at least one special character</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Reset Password Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-gray-50">
        <div className="max-w-md w-full">
          <Card className="shadow-2xl border-0 bg-white">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Lock className="w-8 h-8 text-gray-600" />
              </div>
              <CardTitle className="text-2xl font-bold text-gray-900">
                Reset Your Password
              </CardTitle>
              <p className="text-gray-600 mt-2">
                Enter your new password below
              </p>
            </CardHeader>
            
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* New Password */}
                <div className="space-y-2">
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      ref={passwordInputRef}
                      type={showPassword ? "text" : "password"}
                      id="password"
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-3 pr-12 border rounded-lg focus:ring-2 focus:border-transparent transition-colors ${
                        errors.password 
                          ? 'border-red-300 bg-red-50 focus:ring-red-200' 
                          : 'border-gray-300 focus:ring-gray-900'
                      }`}
                      placeholder="Enter your new password"
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                  {errors.password && (
                    <div className="flex items-center space-x-2 text-red-600 text-sm">
                      <AlertCircle className="w-4 h-4" />
                      <span>{errors.password}</span>
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <div className="space-y-2">
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      id="confirmPassword"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-3 pr-12 border rounded-lg focus:ring-2 focus:border-transparent transition-colors ${
                        errors.confirmPassword 
                          ? 'border-red-300 bg-red-50 focus:ring-red-200' 
                          : 'border-gray-300 focus:ring-gray-900'
                      }`}
                      placeholder="Confirm your new password"
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <div className="flex items-center space-x-2 text-red-600 text-sm">
                      <AlertCircle className="w-4 h-4" />
                      <span>{errors.confirmPassword}</span>
                    </div>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full bg-gray-900 hover:bg-gray-700 text-white py-3"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Resetting Password...
                    </>
                  ) : (
                    <>
                      <Shield className="w-4 h-4 mr-2" />
                      Reset Password
                    </>
                  )}
                </Button>

                <div className="text-center">
                  <Link 
                    href="/vendor"
                    className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    Back to Vendor Login
                  </Link>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}