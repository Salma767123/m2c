'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { userAuthService } from '@/services/userAuthService'
import { showSuccessToast, showErrorToast } from '@/lib/toast-utils'
import { CheckCircle, XCircle, Loader2, ArrowRight, LifeBuoy } from 'lucide-react'
import CompanyLogo from '@/components/Shared/CompanyLogo'

/** Shared page shell — warm brand ground + centered card, matching the storefront. */
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#faf7f3] px-4 font-sans">
      {/* soft brand wash */}
      <span aria-hidden className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-[#e01a1b]/5 blur-3xl" />
      <span aria-hidden className="pointer-events-none absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-[#C7A66A]/10 blur-3xl" />
      <div className="relative w-full max-w-md rounded-[28px] bg-white p-8 text-center shadow-[0_30px_80px_-34px_rgba(26,20,22,0.45)] ring-1 ring-[#efe6df] sm:p-10">
        <Link href="/" className="mb-7 inline-flex">
          <CompanyLogo variant="primary" className="mx-auto h-11 w-auto object-contain" />
        </Link>
        {children}
      </div>
    </div>
  )
}

const primaryBtn =
  'flex w-full items-center justify-center gap-2 rounded-full bg-[#e01a1b] py-3 text-sm font-semibold text-white shadow-[0_14px_30px_-16px_rgba(224,26,27,0.8)] transition-colors hover:bg-[#c41617]'
const secondaryBtn =
  'flex w-full items-center justify-center gap-2 rounded-full border border-[#e9ded2] py-3 text-sm font-semibold text-[#1a1a1a] transition-colors hover:bg-[#faf5f2]'

function VerifyEmailContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const verifyEmail = async () => {
      const token = searchParams.get('token')
      if (!token) {
        setStatus('error')
        setMessage('Invalid verification link. No token provided.')
        showErrorToast('Verification Failed', 'Invalid verification link.')
        return
      }
      try {
        const response = await userAuthService.verifyEmail(token)
        if (response.success) {
          setStatus('success')
          setMessage(response.message || 'Your email has been verified successfully!')
          showSuccessToast('Email Verified', 'You can now sign in to your account.')
        } else {
          setStatus('error')
          setMessage(response.message || 'Email verification failed.')
          showErrorToast('Verification Failed', response.message || 'Unable to verify email.')
        }
      } catch (error: any) {
        console.error('Email verification error:', error)
        const errorMessage = error.response?.data?.error || error.response?.data?.message || 'Email verification failed. The link may have expired.'
        setStatus('error')
        setMessage(errorMessage)
        showErrorToast('Verification Failed', errorMessage)
      }
    }
    verifyEmail()
  }, [searchParams])

  return (
    <Shell>
      {status === 'loading' && (
        <>
          <span className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#fdf1ef]">
            <Loader2 className="h-8 w-8 animate-spin text-[#e01a1b]" />
          </span>
          <h1 className="font-playfair text-2xl font-semibold text-[#1a1a1a]">Verifying your email…</h1>
          <p className="mt-2 text-[15px] text-[#7a6d62]">Hold on while we confirm your email address.</p>
        </>
      )}

      {status === 'success' && (
        <>
          <span className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#eaf7ef] ring-8 ring-[#eaf7ef]/50">
            <CheckCircle className="h-9 w-9 text-[#157f4a]" strokeWidth={2.2} />
          </span>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#157f4a]">You&apos;re all set</p>
          <h1 className="mt-2 font-playfair text-3xl font-semibold text-[#1a1a1a]">Email Verified!</h1>
          <p className="mt-2.5 text-[15px] leading-relaxed text-[#7a6d62]">{message}</p>
          <div className="mt-7 space-y-3">
            <button onClick={() => router.push('/login')} className={primaryBtn}>
              Sign in to your account <ArrowRight className="h-4 w-4" />
            </button>
            <button onClick={() => router.push('/')} className={secondaryBtn}>Go to Home</button>
          </div>
        </>
      )}

      {status === 'error' && (
        <>
          <span className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#fdecea] ring-8 ring-[#fdecea]/50">
            <XCircle className="h-9 w-9 text-[#e01a1b]" strokeWidth={2.2} />
          </span>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#c41617]">Something went wrong</p>
          <h1 className="mt-2 font-playfair text-3xl font-semibold text-[#1a1a1a]">Verification Failed</h1>
          <p className="mt-2.5 text-[15px] leading-relaxed text-[#7a6d62]">{message}</p>
          <div className="mt-7 space-y-3">
            <button onClick={() => router.push('/login')} className={primaryBtn}>
              Go to Sign In <ArrowRight className="h-4 w-4" />
            </button>
            <button onClick={() => router.push('/')} className={secondaryBtn}>Go to Home</button>
          </div>
          <p className="mt-5 inline-flex items-center justify-center gap-1.5 text-[13px] text-[#8a807a]">
            <LifeBuoy className="h-3.5 w-3.5" />
            The link may have expired — try registering again or{' '}
            <Link href="/contact" className="font-semibold text-[#e01a1b] hover:underline">contact support</Link>.
          </p>
        </>
      )}
    </Shell>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <Shell>
          <span className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#fdf1ef]">
            <Loader2 className="h-8 w-8 animate-spin text-[#e01a1b]" />
          </span>
          <h1 className="font-playfair text-2xl font-semibold text-[#1a1a1a]">Loading…</h1>
          <p className="mt-2 text-[15px] text-[#7a6d62]">Please wait.</p>
        </Shell>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  )
}
