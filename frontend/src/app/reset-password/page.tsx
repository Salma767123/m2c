import ResetPassword from '@/components/WebSite/Forgot/ResetPassword'
import { Suspense } from 'react'

function ResetPasswordContent() {
  return <ResetPassword />
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  )
}

export const metadata = {
  title: 'Reset Password | Your App Name',
  description: 'Create a new password for your account.',
}