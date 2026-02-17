'use client'

import { AlertCircle, RefreshCw, LogIn } from 'lucide-react'

interface AuthErrorProps {
  error: string
  onRetry?: () => void
  onGoToLogin?: () => void
  autoRedirect?: boolean
  redirectSeconds?: number
}

export default function AuthError({ 
  error, 
  onRetry, 
  onGoToLogin,
  autoRedirect = false,
  redirectSeconds = 3
}: AuthErrorProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
        <div className="flex justify-center mb-4">
          <AlertCircle className="h-16 w-16 text-red-500" />
        </div>
        
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">
          Authentication Error
        </h2>
        
        <p className="text-gray-600 mb-6">
          {error}
        </p>
        
        <div className="flex gap-3 justify-center">
          {onRetry && (
            <button
              onClick={onRetry}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              Retry
            </button>
          )}
          
          {onGoToLogin && (
            <button
              onClick={onGoToLogin}
              className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
            >
              <LogIn className="h-4 w-4" />
              Go to Login
            </button>
          )}
        </div>
        
        {autoRedirect && (
          <p className="text-sm text-gray-500 mt-4">
            Redirecting to login page in {redirectSeconds} seconds...
          </p>
        )}
      </div>
    </div>
  )
}
