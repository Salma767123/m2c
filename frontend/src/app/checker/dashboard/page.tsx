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
      <div className="p-8 font-sans animate-pulse">
        <div className="mb-8 flex items-center justify-between">
          <div className="space-y-3">
            <div className="h-9 bg-slate-200 rounded w-56" />
            <div className="h-5 bg-slate-100 rounded w-40" />
          </div>
          <div className="h-4 bg-slate-100 rounded w-48" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-slate-200 p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div className="space-y-3 flex-1">
                  <div className="h-4 bg-slate-200 rounded w-28" />
                  <div className="h-8 bg-slate-200 rounded w-16" />
                </div>
                <div className="w-12 h-12 bg-slate-200 rounded-xl" />
              </div>
              <div className="h-4 bg-slate-100 rounded w-36" />
            </div>
          ))}
        </div>
        <div className="bg-white rounded-2xl border border-slate-200/60 p-6">
          <div className="h-6 bg-slate-200 rounded w-44 mb-6" />
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="border border-slate-100 rounded-xl p-4 space-y-3">
                <div className="h-4 bg-slate-200 rounded w-48" />
                <div className="h-9 bg-slate-100 rounded-lg w-full" />
              </div>
            ))}
          </div>
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
