"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import LoginPage from "@/components/Checker/CheckerLogin/CheckerLogin"
import { qcCheckerService } from "@/services/qcCheckerService"

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isChecking, setIsChecking] = useState(true)
  const router = useRouter()

  // Check if already logged in
  useEffect(() => {
    const token = qcCheckerService.getCheckerToken()
    if (token) {
      setIsLoggedIn(true)
      router.push('/checker/dashboard')
    }
    setIsChecking(false)
  }, [router])

  const handleLogin = (id: string) => {
    setIsLoggedIn(true)
    // Redirect to dashboard
    router.push('/checker/dashboard')
  }

  const handleLogout = () => {
    setIsLoggedIn(false)
    qcCheckerService.clearCheckerAuth()
    // Stay on login page
  }

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  return <LoginPage onLogin={handleLogin} />
}
