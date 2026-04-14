import { Suspense } from 'react'
import Login from '@/components/AdminDashboard/Login/Login'

export default function LoginPage() {
  return (
    <Suspense>
      <Login />
    </Suspense>
  )
}
