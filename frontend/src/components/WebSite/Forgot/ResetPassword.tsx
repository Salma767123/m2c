'use client'

import { useState, useRef, useEffect } from 'react'
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
  ArrowLeft
} from 'lucide-react'
import { showSuccessToast, showErrorToast } from '@/lib/toast-utils'
import Link from 'next/link'

interface ResetPasswordData {
  password: string
  confirmPassword: string
}

interface PasswordStrength {
  score: number
  feedback: string[]
  color: string
}

export default function ResetPassword() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordReset, setPasswordReset] = useState(false)
  const [errors, setErrors] = useState<{[key: string]: string}>({})
  const [formData, setFormData] = useState<ResetPasswordData>({
    password: '',
    confirmPassword: ''
  })
  
  const passwordInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!token) {
      showErrorToast('Invalid or missing reset token')
      router.push('/login')
      return
    }
    
    if (passwordInputRef.current) {
      passwordInputRef.current.focus()
    }
  }, [token, router])

  const calculatePasswordStrength = (password: string): PasswordStrength => {
    let score = 0
    const feedback: string[] = []

    if (password.length >= 8) {
      score += 1
    } else {
      feedback.push('At least 8 characters')
    }

    if (/[a-z]/.test(password)) {
      score += 1
    } else {
      feedback.push('One lowercase letter')
    }

    if (/[A-Z]/.test(password)) {
      score += 1
    } else {
      feedback.push('One uppercase letter')
    }

    if (/\d/.test(password)) {
      score += 1
    } else {
      feedback.push('One number')
    }

    if (/[^a-zA-Z0-9]/.test(password)) {
      score += 1
    } else {
      feedback.push('One special character')
    }

    let color = 'red'
    if (score >= 4) color = 'green'
    else if (score >= 3) color = 'yellow'
    else if (score >= 2) color = 'orange'

    return { score, feedback, color }
  }

  const passwordStrength = calculatePasswordStrength(formData.password)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    
    // Clear errors when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
  }

  const validateForm = (): boolean => {
    const newErrors: {[key: string]: string} = {}

    if (!formData.password) {
      newErrors.password = 'Password is required'
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters long'
    } else if (passwordStrength.score < 3) {
      newErrors.password = 'Password is too weak'
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password'
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setIsLoading(true)

    try {
      // TODO: Replace with actual API call
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          token,
          password: formData.password 
        }),
      })

      if (response.ok) {
        setPasswordReset(true)
        showSuccessToast('Password reset successfully!')
      } else {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to reset password')
      }
    } catch (error) {
      console.error('Reset password error:', error)
      showErrorToast(error instanceof Error ? error.message : 'Failed to reset password')
    } finally {
      setIsLoading(false)
    }
  }

  const handleLoginRedirect = () => {
    router.push('/login')
  }

  if (passwordReset) {
    return (
      <div className="min-h-screen bg-linear-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">
              Password Reset Successful!
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <p className="text-gray-600 mb-6">
                Your password has been successfully reset. You can now log in with your new password.
              </p>
            </div>
            
            <Button
              onClick={handleLoginRedirect}
              className="w-full"
            >
              Continue to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl bg-white">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <Shield className="w-8 h-8 text-gray-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            Reset Your Password
          </CardTitle>
          <p className="text-gray-600 mt-2">
            Enter your new password below.
          </p>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* New Password Field */}
            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                New Password
              </label>
              <div className="relative">
                <input
                  ref={passwordInputRef}
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 pl-11 pr-11 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                    errors.password ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                  placeholder="Enter your new password"
                  disabled={isLoading}
                />
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              
              {/* Password Strength Indicator */}
              {formData.password && (
                <div className="space-y-2">
                  <div className="flex space-x-1">
                    {[1, 2, 3, 4, 5].map((level) => (
                      <div
                        key={level}
                        className={`h-2 flex-1 rounded ${
                          level <= passwordStrength.score
                            ? passwordStrength.color === 'red'
                              ? 'bg-red-500'
                              : passwordStrength.color === 'orange'
                              ? 'bg-orange-500'
                              : passwordStrength.color === 'yellow'
                              ? 'bg-yellow-500'
                              : 'bg-green-500'
                            : 'bg-gray-200'
                        }`}
                      />
                    ))}
                  </div>
                  {passwordStrength.feedback.length > 0 && (
                    <div className="text-xs text-gray-600">
                      <span>Password needs: </span>
                      {passwordStrength.feedback.join(', ')}
                    </div>
                  )}
                </div>
              )}
              
              {errors.password && (
                <div className="flex items-center space-x-2 text-red-600 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  <span>{errors.password}</span>
                </div>
              )}
            </div>

            {/* Confirm Password Field */}
            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 pl-11 pr-11 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                    errors.confirmPassword ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                  placeholder="Confirm your new password"
                  disabled={isLoading}
                />
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
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
              className="w-full bg-black text-white"
              disabled={isLoading || passwordStrength.score < 3}
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
                href="/login"
                className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 transition-colors"
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back to Login
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}