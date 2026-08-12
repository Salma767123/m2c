'use client'

import { useState, useRef, useEffect } from 'react'
import CompanyLogo from '@/components/Shared/CompanyLogo'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/UI/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/UI/Card'
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle, Shield, ShieldCheck } from 'lucide-react'
import { showSuccessToast, showErrorToast } from '@/lib/toast-utils'
import Link from 'next/link'
import axios from '@/lib/axios'

interface ValidationErrors {
  password?: string
  confirmPassword?: string
}

export default function CheckerResetPassword() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordReset, setPasswordReset] = useState(false)
  const [errors, setErrors] = useState<ValidationErrors>({})
  const [formData, setFormData] = useState({ password: '', confirmPassword: '' })
  const passwordInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!token) {
      showErrorToast('Invalid Reset Link', 'The password reset link is invalid or missing.')
      router.push('/checker')
      return
    }
    passwordInputRef.current?.focus()
  }, [token, router])

  const validatePassword = (password: string): string | null => {
    if (password.length < 8) return 'Password must be at least 8 characters long'
    if (!/(?=.*[a-z])/.test(password)) return 'Password must contain at least one lowercase letter'
    if (!/(?=.*[A-Z])/.test(password)) return 'Password must contain at least one uppercase letter'
    if (!/(?=.*\d)/.test(password)) return 'Password must contain at least one number'
    if (!/(?=.*[@$!%*?&])/.test(password)) return 'Password must contain at least one special character (@$!%*?&)'
    return null
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errors[name as keyof ValidationErrors]) setErrors((prev) => ({ ...prev, [name]: undefined }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const newErrors: ValidationErrors = {}
    const passwordError = validatePassword(formData.password)
    if (passwordError) newErrors.password = passwordError
    if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match'
    if (Object.keys(newErrors).length > 0) return setErrors(newErrors)

    setIsLoading(true)
    setErrors({})
    try {
      const response = await axios.post('/auth/reset-password', { token, password: formData.password })
      if (response.data.success) {
        setPasswordReset(true)
        showSuccessToast('Password Reset Successful', 'Your password has been updated successfully')
      } else {
        throw new Error(response.data.error || 'Failed to reset password')
      }
    } catch (error: any) {
      showErrorToast('Reset Failed', error.response?.data?.error || error.message || 'Failed to reset password')
    } finally {
      setIsLoading(false)
    }
  }

  if (passwordReset) {
    return (
      <div className="min-h-screen flex bg-white font-sans">
        <div className="hidden lg:flex lg:flex-1 relative bg-gradient-to-br from-brand-600 to-brand-700">
          <div className="flex items-center justify-center w-full p-12">
            <div className="max-w-lg text-center text-white">
              <div className="mb-8">
                <div className="inline-flex items-center justify-center w-44 h-36 mb-6">
                  <CompanyLogo className="w-[190px] h-[150px] object-contain" skeletonClassName="h-[150px] aspect-square bg-white/10" fallbackWidth={190} fallbackHeight={150} />
                </div>
                <h1 className="text-4xl font-bold mb-3">QC Checker Portal</h1>
                <p className="text-xl text-white/90 font-medium">Password Reset Complete</p>
              </div>
              <div className="bg-white/20 backdrop-blur-md rounded-xl p-6">
                <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">All Set!</h3>
                <p className="text-white/80">Your password has been successfully updated. You can now log in with your new password.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center px-6 py-12 bg-gray-50">
          <div className="max-w-md w-full">
            <Card className="shadow-2xl border-0 bg-white">
              <CardHeader className="text-center pb-4">
                <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <CardTitle className="text-2xl font-bold text-gray-900">Password Reset Successful</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-center">
                  <p className="text-gray-600 mb-6">Your password has been successfully reset. You can now log in with your new password.</p>
                </div>
                <Link href="/checker">
                  <Button className="w-full bg-brand-500 hover:bg-brand-600 text-white py-3">
                    <Shield className="w-4 h-4 mr-2" /> Continue to Login
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
      <div className="hidden lg:flex lg:flex-1 relative bg-gradient-to-br from-brand-600 to-brand-700">
        <div className="flex items-center justify-center w-full p-12">
          <div className="max-w-lg text-center text-white">
            <div className="mb-8">
              <div className="inline-flex items-center justify-center w-44 h-36 mb-6">
                <CompanyLogo className="w-[190px] h-[150px] object-contain" skeletonClassName="h-[150px] aspect-square bg-white/10" fallbackWidth={190} fallbackHeight={150} />
              </div>
              <h1 className="text-4xl font-bold mb-3">QC Checker Portal</h1>
              <p className="text-xl text-white/90 font-medium">Create New Password</p>
            </div>
            <div className="bg-white/20 backdrop-blur-md rounded-xl p-6">
              <ShieldCheck className="w-12 h-12 text-white mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">Secure Password</h3>
              <p className="text-white/80 mb-4">Create a strong password to protect your QC checker account.</p>
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

      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-gray-50">
        <div className="max-w-md w-full">
          <Card className="shadow-2xl border-0 bg-white">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto w-16 h-16 bg-brand-50 rounded-full flex items-center justify-center mb-4">
                <Lock className="w-8 h-8 text-brand-500" />
              </div>
              <CardTitle className="text-2xl font-bold text-gray-900">Reset Your Password</CardTitle>
              <p className="text-gray-600 mt-2">Enter your new password below</p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700">New Password</label>
                  <div className="relative">
                    <input
                      ref={passwordInputRef}
                      type={showPassword ? 'text' : 'password'}
                      id="password"
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-3 pr-12 border rounded-lg focus:ring-2 focus:border-transparent transition-colors ${errors.password ? 'border-red-300 bg-red-50 focus:ring-red-200' : 'border-gray-300 focus:ring-brand-500/40 focus:border-brand-500'}`}
                      placeholder="Enter your new password"
                      disabled={isLoading}
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors">
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {errors.password && (
                    <div className="flex items-center space-x-2 text-red-600 text-sm">
                      <AlertCircle className="w-4 h-4" /> <span>{errors.password}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">Confirm New Password</label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      id="confirmPassword"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-3 pr-12 border rounded-lg focus:ring-2 focus:border-transparent transition-colors ${errors.confirmPassword ? 'border-red-300 bg-red-50 focus:ring-red-200' : 'border-gray-300 focus:ring-brand-500/40 focus:border-brand-500'}`}
                      placeholder="Confirm your new password"
                      disabled={isLoading}
                    />
                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors">
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <div className="flex items-center space-x-2 text-red-600 text-sm">
                      <AlertCircle className="w-4 h-4" /> <span>{errors.confirmPassword}</span>
                    </div>
                  )}
                </div>

                <Button type="submit" className="w-full bg-brand-500 hover:bg-brand-600 text-white py-3" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Resetting Password...
                    </>
                  ) : (
                    <>
                      <Shield className="w-4 h-4 mr-2" /> Reset Password
                    </>
                  )}
                </Button>

                <div className="text-center">
                  <Link href="/checker" className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 transition-colors">
                    Back to Checker Login
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
