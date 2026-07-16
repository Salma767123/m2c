'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/UI/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/UI/Card'
import { 
  Mail, 
  ArrowLeft, 
  AlertCircle,
  CheckCircle,
  Send
} from 'lucide-react'
import { showSuccessToast, showErrorToast } from '@/lib/toast-utils'
import Link from 'next/link'
import axios from '@/lib/axios'
import Reveal from '@/components/WebSite/Shared/Reveal'

interface ForgotPasswordData {
  email: string
}

export default function Forgot() {
  const searchParams = useSearchParams()
  const prefillEmail = searchParams.get('email') || ''

  const [isLoading, setIsLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [emailError, setEmailError] = useState("")
  const [formData, setFormData] = useState<ForgotPasswordData>({
    email: prefillEmail
  })
  const emailInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (emailInputRef.current) {
      emailInputRef.current.focus()
    }
  }, [])

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    
    if (name === 'email' && emailError) {
      setEmailError("")
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.email.trim()) {
      setEmailError("Email is required")
      return
    }

    if (!validateEmail(formData.email)) {
      setEmailError("Please enter a valid email address")
      return
    }

    setIsLoading(true)
    setEmailError("")

    try {
      const response = await axios.post('/auth/forgot-password', { 
        email: formData.email,
        userType: 'user' // Specify this is a regular user request
      })

      if (response.data.success) {
        setEmailSent(true)
        showSuccessToast('Password reset email sent successfully!')
      } else {
        throw new Error(response.data.error || 'Failed to send reset email')
      }
    } catch (error: any) {
      console.error('Forgot password error:', error)
      const errorMessage = error.response?.data?.error || error.message || 'Failed to send reset email'
      showErrorToast(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendEmail = () => {
    setEmailSent(false)
    setFormData({ email: '' })
    setTimeout(() => {
      if (emailInputRef.current) {
        emailInputRef.current.focus()
      }
    }, 100)
  }

  if (emailSent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1a1a1a] via-[#a11315] to-[#e01a1b] flex items-center justify-center p-4">
        <Reveal className="w-full max-w-md">
          <Card className="w-full rounded-2xl ring-1 ring-black/5 shadow-[0_18px_40px_rgba(0,0,0,0.18)] bg-white">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <CardTitle className="font-playfair text-2xl font-semibold text-[#1a1a1a] tracking-tight">
                Check Your Email
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center">
                <p className="text-gray-600 mb-4">
                  We've sent a password reset link to:
                </p>
                <p className="font-semibold text-[#1a1a1a] bg-[#f7f7f5] p-3 rounded-xl">
                  {formData.email}
                </p>
              </div>

              <div className="bg-[#e01a1b]/5 border border-[#e01a1b]/15 rounded-xl p-4">
                <div className="flex items-start space-x-3">
                  <Mail className="w-5 h-5 text-[#e01a1b] mt-0.5" />
                  <div className="text-sm text-gray-700">
                    <p className="font-medium mb-1 text-[#1a1a1a]">Next steps:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Check your email inbox</li>
                      <li>Click the reset link in the email</li>
                      <li>Create your new password</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <Button
                  onClick={handleResendEmail}
                  variant="outline"
                  className="w-full rounded-full border-[#e01a1b] text-[#e01a1b] hover:bg-[#e01a1b] hover:text-white transition-all duration-300"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Send Another Email
                </Button>

                <Link href="/login">
                  <Button variant="ghost" className="w-full rounded-full text-gray-700 hover:text-[#e01a1b]">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Login
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </Reveal>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1a1a] via-[#a11315] to-[#e01a1b] flex items-center justify-center p-4">
      <Reveal className="w-full max-w-md">
      <Card className="w-full rounded-2xl ring-1 ring-black/5 shadow-[0_18px_40px_rgba(0,0,0,0.18)] bg-white">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto w-16 h-16 bg-[#e01a1b]/10 rounded-full flex items-center justify-center mb-4">
            <Mail className="w-8 h-8 text-[#e01a1b]" />
          </div>
          <CardTitle className="font-playfair text-2xl font-semibold text-[#1a1a1a] tracking-tight">
            Forgot Password?
          </CardTitle>
          <p className="text-gray-600 mt-2">
            Enter your email address and we'll send you a link to reset your password.
          </p>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email Address
              </label>
              <div className="relative">
                <input
                  ref={emailInputRef}
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 pl-11 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#e01a1b]/40 focus:border-[#e01a1b] transition-colors ${
                    emailError ? 'border-red-300 bg-red-50' : 'border-gray-200'
                  }`}
                  placeholder="Enter your email address"
                  disabled={isLoading}
                />
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              </div>
              {emailError && (
                <div className="flex items-center space-x-2 text-red-600 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  <span>{emailError}</span>
                </div>
              )}
            </div>

            <Button
              type="submit"
              className="btn-shine w-full bg-[#e01a1b] hover:bg-[#c41617] text-white rounded-full shadow-[0_6px_20px_rgba(224,26,27,0.3)] hover:shadow-[0_12px_30px_rgba(224,26,27,0.45)] transition-all duration-300 hover:-translate-y-0.5"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send Reset Link
                </>
              )}
            </Button>

            <div className="text-center">
              <Link
                href="/login"
                className="link-underline brand inline-flex items-center text-sm font-medium text-[#e01a1b] hover:text-[#c41617] transition-colors"
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back to Login
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
      </Reveal>
    </div>
  )
}