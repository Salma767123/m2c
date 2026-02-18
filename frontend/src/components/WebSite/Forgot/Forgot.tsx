'use client'

import { useState, useRef, useEffect } from 'react'
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

interface ForgotPasswordData {
  email: string
}

export default function Forgot() {
  const [isLoading, setIsLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [emailError, setEmailError] = useState("")
  const [formData, setFormData] = useState<ForgotPasswordData>({
    email: ''
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
      <div className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">
              Check Your Email
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <p className="text-gray-600 mb-4">
                We've sent a password reset link to:
              </p>
              <p className="font-semibold text-gray-900 bg-gray-50 p-3 rounded-lg">
                {formData.email}
              </p>
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
              <Button
                onClick={handleResendEmail}
                variant="outline"
                className="w-full"
              >
                <Send className="w-4 h-4 mr-2" />
                Send Another Email
              </Button>
              
              <Link href="/login">
                <Button variant="ghost" className="w-full">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Login
                </Button>
              </Link>
            </div>
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
            <Mail className="w-8 h-8 text-gray-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
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
                  className={`w-full px-4 py-3 pl-11 border rounded-lg  focus:border-transparent transition-colors ${
                    emailError ? 'border-red-300 bg-red-50' : 'border-gray-300'
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
              className="w-full bg-black text-white"
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
                className="inline-flex items-center text-sm text-white bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded-lg transition-colors"
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