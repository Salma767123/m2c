'use client'

import { useState, useRef, useEffect } from 'react'
import CompanyLogo from '@/components/Shared/CompanyLogo'
import { Button } from '@/components/UI/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/UI/Card'
import { Mail, ArrowLeft, AlertCircle, CheckCircle, Send, ShieldCheck } from 'lucide-react'
import { showSuccessToast, showErrorToast } from '@/lib/toast-utils'
import Link from 'next/link'
import axios from '@/lib/axios'

export default function CheckerForgotPassword() {
  const [isLoading, setIsLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [emailError, setEmailError] = useState('')
  const [email, setEmail] = useState('')
  const emailInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    emailInputRef.current?.focus()
  }, [])

  const validateEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return setEmailError('Email is required')
    if (!validateEmail(email)) return setEmailError('Please enter a valid email address')

    setIsLoading(true)
    setEmailError('')
    try {
      const response = await axios.post('/auth/forgot-password', {
        email,
        userType: 'checker', // QC checker request
      })
      if (response.data.success) {
        setEmailSent(true)
        showSuccessToast('Password Reset Email Sent', 'Check your email for reset instructions')
      } else {
        throw new Error(response.data.error || 'Failed to send reset email')
      }
    } catch (error: any) {
      showErrorToast('Reset Failed', error.response?.data?.error || error.message || 'Failed to send reset email')
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendEmail = () => {
    setEmailSent(false)
    setEmail('')
    setTimeout(() => emailInputRef.current?.focus(), 100)
  }

  if (emailSent) {
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
                <p className="text-xl text-white/90 font-medium">Password Reset Assistance</p>
              </div>
              <div className="bg-white/20 backdrop-blur-md rounded-xl p-6">
                <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">Email Sent Successfully</h3>
                <p className="text-white/80">Check your inbox for password reset instructions</p>
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
                <CardTitle className="text-2xl font-bold text-gray-900">Check Your Email</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-center">
                  <p className="text-gray-600 mb-4">We&apos;ve sent a password reset link to:</p>
                  <p className="font-semibold text-gray-900 bg-gray-50 p-3 rounded-lg">{email}</p>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <Mail className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div className="text-sm text-blue-800">
                      <p className="font-medium mb-1">Next steps:</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li>Check your email inbox</li>
                        <li>Click the reset link in the email</li>
                        <li>Create your new password</li>
                      </ul>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <Button onClick={handleResendEmail} variant="outline" className="w-full">
                    <Send className="w-4 h-4 mr-2" /> Send Another Email
                  </Button>
                  <Link href="/checker">
                    <Button variant="ghost" className="w-full">
                      <ArrowLeft className="w-4 h-4 mr-2" /> Back to Checker Login
                    </Button>
                  </Link>
                </div>
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
              <p className="text-xl text-white/90 font-medium">Reset Your Password</p>
            </div>
            <div className="bg-white/20 backdrop-blur-md rounded-xl p-6">
              <ShieldCheck className="w-12 h-12 text-white mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">Need Help?</h3>
              <p className="text-white/80 mb-4">Enter your QC checker account email address and we&apos;ll send you a secure link to reset your password.</p>
              <div className="text-sm text-white/70">
                <p>• Check your spam folder if you don&apos;t see the email</p>
                <p>• The reset link expires in 1 hour</p>
                <p>• Contact support if you need assistance</p>
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
                <Mail className="w-8 h-8 text-brand-500" />
              </div>
              <CardTitle className="text-2xl font-bold text-gray-900">Forgot Password?</CardTitle>
              <p className="text-gray-600 mt-2">Enter your QC checker account email address and we&apos;ll send you a link to reset your password.</p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email Address</label>
                  <div className="relative">
                    <input
                      ref={emailInputRef}
                      type="email"
                      id="email"
                      name="email"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); if (emailError) setEmailError('') }}
                      className={`w-full px-4 py-3 pl-11 border rounded-lg focus:ring-2 focus:border-transparent transition-colors ${emailError ? 'border-red-300 bg-red-50 focus:ring-red-200' : 'border-gray-300 focus:ring-brand-500/40 focus:border-brand-500'}`}
                      placeholder="Enter your checker email address"
                      disabled={isLoading}
                    />
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  </div>
                  {emailError && (
                    <div className="flex items-center space-x-2 text-red-600 text-sm">
                      <AlertCircle className="w-4 h-4" /> <span>{emailError}</span>
                    </div>
                  )}
                </div>

                <Button type="submit" className="w-full bg-brand-500 hover:bg-brand-600 text-white py-3" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Sending Reset Link...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" /> Send Reset Link
                    </>
                  )}
                </Button>

                <div className="text-center">
                  <Link href="/checker" className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 transition-colors">
                    <ArrowLeft className="w-4 h-4 mr-1" /> Back to Checker Login
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
