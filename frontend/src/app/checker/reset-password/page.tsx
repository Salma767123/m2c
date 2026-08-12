import CheckerResetPassword from '@/components/Checker/CheckerResetPassword/CheckerResetPassword'
import { Suspense } from 'react'

export default function CheckerResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-800 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      }
    >
      <CheckerResetPassword />
    </Suspense>
  )
}

export const metadata = {
  title: 'Reset Password | QC Checker Portal',
  description: 'Create a new password for your QC checker account.',
}
