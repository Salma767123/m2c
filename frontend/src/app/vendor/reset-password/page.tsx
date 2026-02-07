import VendorResetPassword from "@/components/VendorHub/VendorResetPassword/VendorResetPassword";
import { Suspense } from 'react';

function VendorResetPasswordContent() {
  return <VendorResetPassword />
}

export default function VendorResetPasswordPage(){
  return(
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <VendorResetPasswordContent />
    </Suspense>
  )
}

export const metadata = {
  title: 'Reset Password | Vendor Portal',
  description: 'Create a new password for your vendor account.',
}