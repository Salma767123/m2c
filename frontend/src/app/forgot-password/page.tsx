import { Suspense } from 'react'
import Forgot from '@/components/WebSite/Forgot/Forgot'

export default function ForgotPasswordPage() {
  return (
    <Suspense>
      <Forgot />
    </Suspense>
  )
}

export const metadata = {
  title: 'Forgot Password | Your App Name',
  description: 'Reset your password by entering your email address.',
}