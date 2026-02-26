"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Dashboard from "@/components/Checker/CheckerDashboard/CheckerDashboard"
import { qcCheckerService } from "@/services/qcCheckerService"

export default function DashboardPage() {
  const [checkerID, setCheckerID] = useState("")
  const router = useRouter()

  useEffect(() => {
    // Check if logged in
    const token = qcCheckerService.getCheckerToken()
    if (!token) {
      router.push('/checker')
      return
    }

    const storedCheckerID = localStorage.getItem('checkerID')
    if (storedCheckerID) {
      setCheckerID(storedCheckerID)
    } else {
      // Try to get from checker data
      const checkerData = qcCheckerService.getCheckerData()
      if (checkerData?.checkerId) {
        setCheckerID(checkerData.checkerId)
      } else {
        router.push('/checker')
      }
    }
  }, [router])

  if (!checkerID) {
    return (
      <div className="p-8 flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <Dashboard
        checkerID={checkerID}
        onSelectVendor={(vendor) => {
          console.log("Selected vendor:", vendor)
        }}
      />

    </>
  )
}
